// src/utils/firestoreService.js
// Central Firestore service for all database operations

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, auth, functions, storage } from '../firebase';
import { TESDA_CATALOG, parseLevel } from '../data/tesdaCatalog';
import { COLOR_PALETTE } from './courseColors';

// ==================== APP SETTINGS (global admin config) ====================
// A single global document `config/appSettings` holds org-wide configuration.
// It is public-read (branding + the self-registration gate must be readable on
// pre-auth pages) and admin-write (enforced by firestore.rules). Everything is
// non-sensitive. Consumers should read through mergeAppSettings so a missing
// doc or field falls back to a safe default.

export const DEFAULT_APP_SETTINGS = {
  branding: {
    siteName: 'HYTech',
    welcomeMessage: '',
    logoUrl: '',
  },
  access: {
    allowSelfRegistration: true,
    requireEnrollmentApproval: true,
    allowMultipleEnrollments: true,
    sessionTimeoutMinutes: 0, // 0 = disabled
    minPasswordLength: 8,
    forcePasswordChangeDefault: true,
  },
  // Per-notification-type toggles. A missing/true key means the notification is
  // enabled; only an explicit `false` suppresses it.
  notifications: {},
};

const APP_SETTINGS_REF = () => doc(db, 'config', 'appSettings');

/**
 * Merge a raw settings doc over the defaults (one level deep per group) so
 * callers always receive a fully-populated object.
 */
export const mergeAppSettings = (raw = {}) => ({
  branding: { ...DEFAULT_APP_SETTINGS.branding, ...(raw?.branding || {}) },
  access: { ...DEFAULT_APP_SETTINGS.access, ...(raw?.access || {}) },
  notifications: { ...DEFAULT_APP_SETTINGS.notifications, ...(raw?.notifications || {}) },
});

/** One-shot read of the global app settings, merged with defaults. */
export const getAppSettings = async () => {
  try {
    const snap = await getDoc(APP_SETTINGS_REF());
    return mergeAppSettings(snap.exists() ? snap.data() : {});
  } catch (error) {
    console.warn('Could not read app settings:', error?.code || error?.message);
    return mergeAppSettings({});
  }
};

/** Live subscription to the global app settings. Returns an unsubscribe fn. */
export const subscribeToAppSettings = (callback) => {
  try {
    return onSnapshot(
      APP_SETTINGS_REF(),
      (snap) => callback(mergeAppSettings(snap.exists() ? snap.data() : {})),
      (error) => {
        console.warn('App settings listener error:', error?.code);
        callback(mergeAppSettings({}));
      }
    );
  } catch (error) {
    console.warn('Failed to subscribe to app settings:', error?.message);
    callback(mergeAppSettings({}));
    return () => {};
  }
};

/**
 * Admin-only write of the global app settings. `patch` is a partial grouped
 * object, e.g. { branding: { siteName } } — setDoc(merge) merges nested maps.
 */
export const saveAppSettings = async (patch = {}) => {
  await setDoc(
    APP_SETTINGS_REF(),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
};

// Lightweight module-level cache so non-React service code (e.g. the
// notification gate) can consult settings without a read per call. Warmed
// lazily by a single onSnapshot; defaults to enabled until warm.
let _appSettingsCache = null;
let _appSettingsUnsub = null;
const ensureAppSettingsCache = () => {
  if (_appSettingsUnsub || !db) return;
  try {
    _appSettingsUnsub = onSnapshot(
      APP_SETTINGS_REF(),
      (snap) => {
        _appSettingsCache = mergeAppSettings(snap.exists() ? snap.data() : {});
      },
      () => {}
    );
  } catch {
    _appSettingsUnsub = null;
  }
};

/**
 * Whether a notification of `type` is currently enabled. Defaults to true when
 * the cache is cold or the key is unset — only an explicit `false` suppresses.
 */
export const isNotificationTypeEnabled = (type) => {
  ensureAppSettingsCache();
  const map = _appSettingsCache?.notifications || {};
  return map[type] !== false;
};

// ==================== USER OPERATIONS ====================

/**
 * Create or update user profile on signup/registration
 * Called after Firebase Auth user creation
 */

// Next sequential trainee/user ID number, mirroring the admin "Add User" flow
// (max existing numeric idNumber + 1, else a base seed). Used so self-registered
// trainees get an ID number too — not just admin-created accounts.
export const generateNextIdNumber = async () => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = cryptoApi.getRandomValues(new Uint32Array(2));
    const combined = (BigInt(values[0]) << 32n) | BigInt(values[1]);
    return String(1000000000n + (combined % 9000000000n));
  }
  return String(Date.now()).slice(-10).padStart(10, '0');
};

export const generateUniqueClassCode = async () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const bytes = new Uint8Array(10);
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error('Secure class-code generation is unavailable in this browser.');
    }
    globalThis.crypto.getRandomValues(bytes);
    const code = `CLASS-${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')}`;
    const existing = await getDocs(
      query(collection(db, 'classes'), where('classCode', '==', code), limit(1))
    );
    if (existing.empty) return code;
  }
  throw new Error('Unable to generate a unique class code. Please try again.');
};

export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Update existing
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new
      await setDoc(userRef, {
        ...userData,
        status: 'Active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    
    // Initialize lmsExperience for new users
    await initializeLmsExperience(userId);
    
    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

export const adminUpdateUserAccount = async (userId, account) => {
  const updateAccount = httpsCallable(functions, 'adminUpdateUserAccount');
  const result = await updateAccount({ userId, ...account });
  return result.data || { updated: true };
};

/**
 * Persist every record required by a self-registered account in one commit.
 * This prevents Firebase Auth from being paired with only part of the user's
 * Firestore profile (for example, a public name without DOB/contact details).
 */
export const createRegisteredUserProfile = async (
  userId,
  publicProfile = {},
  privateProfile = {}
) => {
  const timestamp = serverTimestamp();
  const userRef = doc(db, 'users', userId);
  const privateRef = doc(db, 'users', userId, 'private', 'profile');
  const lmsRef = doc(db, 'users', userId, 'lmsExperience', 'profile');
  const batch = writeBatch(db);

  batch.set(
    userRef,
    {
      uid: userId,
      email: String(publicProfile.email || '').trim().toLowerCase(),
      displayName: String(publicProfile.displayName || '').trim(),
      name: String(publicProfile.name || '').trim(),
      idNumber: String(publicProfile.idNumber || '').trim(),
      firstName: String(publicProfile.firstName || '').trim(),
      middleName: String(publicProfile.middleName || '').trim(),
      lastName: String(publicProfile.lastName || '').trim(),
      nameExtension: String(publicProfile.nameExtension || '').trim(),
      profileComplete: true,
      profile: {
        firstName: String(publicProfile.firstName || '').trim(),
        middleName: String(publicProfile.middleName || '').trim(),
        lastName: String(publicProfile.lastName || '').trim(),
        nameExtension: String(publicProfile.nameExtension || '').trim(),
      },
      role: 'student',
      status: 'Active',
      createdBy: 'self-registration',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true }
  );

  batch.set(
    privateRef,
    {
      phone: String(privateProfile.phone || '').trim(),
      birthDate: String(privateProfile.birthDate || '').trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true }
  );

  batch.set(
    lmsRef,
    {
      userId,
      headline: '',
      about: '',
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      achievements: {
        coursesCompleted: 0,
        totalHoursLearned: 0,
        certificatesEarned: 0,
        streak: 0,
      },
      visibility: 'private',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true }
  );

  await batch.commit();
  return true;
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return {
      id: userSnap.id,
      ...userSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user profile (safe fields only)
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Prevent updates to protected fields
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
    delete safeUpdates.email;
    delete safeUpdates.createdAt;
    delete safeUpdates.status;
    
    await updateDoc(userRef, {
      ...safeUpdates,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// ==================== PRIVATE PROFILE (PII) ====================
// Phone / address / birthDate are kept out of the org-wide-readable `users`
// doc. They live in users/{uid}/private/profile, readable only by the owner
// and admins (see firestore.rules).

export const getUserPrivateProfile = async (userId) => {
  try {
    const ref = doc(db, 'users', userId, 'private', 'profile');
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    // A student reading someone else's private doc will be denied — that's fine.
    console.warn('Could not read private profile:', error?.code || error?.message);
    return null;
  }
};

export const saveUserPrivateProfile = async (userId, fields = {}) => {
  try {
    const ref = doc(db, 'users', userId, 'private', 'profile');
    await setDoc(ref, { ...fields, updatedAt: serverTimestamp() }, { merge: true });

    // Best-effort: strip any legacy sensitive fields that used to live on the
    // world-readable users doc (lazy migration as users re-save their profile).
    try {
      await updateDoc(doc(db, 'users', userId), {
        phone: deleteField(),
        address: deleteField(),
        birthDate: deleteField(),
        'profile.phoneNumber': deleteField(),
        'profile.dateOfBirth': deleteField(),
      });
    } catch (cleanupErr) {
      console.debug('Legacy PII cleanup skipped:', cleanupErr?.code);
    }
    return true;
  } catch (error) {
    console.error('Error saving private profile:', error);
    throw error;
  }
};

// ==================== LMS EXPERIENCE ====================

/**
 * Initialize empty lmsExperience profile for new user
 */
export const initializeLmsExperience = async (userId) => {
  try {
    const lmsRef = doc(db, 'users', userId, 'lmsExperience', 'profile');
    const lmsSnap = await getDoc(lmsRef);
    
    if (!lmsSnap.exists()) {
      const lmsData = {
        userId,
        headline: '',
        about: '',
        skills: [],
        experience: [],
        education: [],
        certifications: [],
        achievements: {
          coursesCompleted: 0,
          totalHoursLearned: 0,
          certificatesEarned: 0,
          streak: 0,
        },
        visibility: 'private',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(lmsRef, lmsData);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing LMS experience:', error);
    // Don't throw - this is non-critical
  }
};

/**
 * Get user's LMS experience profile
 */
export const getLmsExperience = async (userId) => {
  try {
    const lmsRef = doc(db, 'users', userId, 'lmsExperience', 'profile');
    const lmsSnap = await getDoc(lmsRef);
    
    if (!lmsSnap.exists()) {
      return null;
    }
    
    return {
      id: lmsSnap.id,
      ...lmsSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching LMS experience:', error);
    throw error;
  }
};

/**
 * Update user's LMS experience profile
 */
export const updateLmsExperience = async (userId, updates) => {
  try {
    const lmsRef = doc(db, 'users', userId, 'lmsExperience', 'profile');
    
    await updateDoc(lmsRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error updating LMS experience:', error);
    throw error;
  }
};

// ==================== SECTORS OPERATIONS ====================

/**
 * Get all sectors
 */
export const getSectors = async (filters = {}) => {
  try {
    let q = collection(db, 'sectors');
    const constraints = [];
    
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching sectors:', error);
    throw error;
  }
};

/**
 * Get sector by ID
 */
export const getSectorById = async (sectorId) => {
  try {
    const sectorRef = doc(db, 'sectors', sectorId);
    const snapshot = await getDoc(sectorRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    console.error('Error fetching sector:', error);
    throw error;
  }
};

/**
 * Create a new sector (Admin only)
 */
export const createSector = async (sectorData) => {
  try {
    const sectorsRef = collection(db, 'sectors');
    
    const docRef = await addDoc(sectorsRef, {
      name: sectorData.name,
      description: sectorData.description,
      status: sectorData.status || 'Active',
      icon: sectorData.icon || 'Monitor',
      color: sectorData.color || 'from-gray-600 to-gray-800',
      bgImage: sectorData.bgImage || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return {
      id: docRef.id,
      ...sectorData,
    };
  } catch (error) {
    console.error('Error creating sector:', error);
    throw error;
  }
};

/**
 * Update a sector (Admin only)
 */
export const updateSector = async (sectorId, updates) => {
  try {
    const sectorRef = doc(db, 'sectors', sectorId);
    
    await updateDoc(sectorRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error updating sector:', error);
    throw error;
  }
};

/**
 * Delete a sector (Admin only)
 */
export const deleteSector = async (sectorId) => {
  try {
    const deleteSecurely = httpsCallable(functions, 'deleteSectorSecure');
    await deleteSecurely({ sectorId });
    return true;
  } catch (error) {
    console.error('Error deleting sector:', error);
    throw error;
  }
};

// A course counts toward a sector being "active" only when it is switched ON
// for trainers (available: true). Basing this on the `status` field was
// near-useless: the TESDA catalog import stamps every program status:'Active'
// (they're gated by available:false), so almost every sector stayed Active.
const isSectorActiveCourse = (course) => course?.available === true;

/**
 * Recompute a single sector's status from its course templates.
 * A sector is Active iff it has at least one AVAILABLE (switched-on) program;
 * otherwise Inactive. Used after an explicit course change so the sector recovers
 * to Active when a program is enabled and drops to Inactive when none remain.
 */
export const syncSectorStatus = async (sectorId) => {
  if (!sectorId) return null;
  try {
    const templates = await getCoursesTemplates({ sectorId });
    const desired = templates.some(isSectorActiveCourse) ? 'Active' : 'Inactive';
    const sectorRef = doc(db, 'sectors', sectorId);
    const snap = await getDoc(sectorRef);
    if (snap.exists() && String(snap.data().status || '') !== desired) {
      await updateDoc(sectorRef, { status: desired, updatedAt: serverTimestamp() });
    }
    return desired;
  } catch (error) {
    console.error('Error syncing sector status:', error);
    return null;
  }
};

/**
 * Reconcile every sector: any sector with zero AVAILABLE programs is marked
 * Inactive (auto-downgrade only — sectors that still have an available program
 * keep whatever status they have). Returns the sectors with their effective
 * status applied so callers can render without a second read.
 */
export const reconcileSectorStatuses = async () => {
  try {
    const [sectors, templates] = await Promise.all([
      getSectors({}),
      getCoursesTemplates({}),
    ]);
    const activeCounts = new Map();
    const totalCounts = new Map();
    templates.forEach((course) => {
      if (!course.sectorId) return;
      totalCounts.set(course.sectorId, (totalCounts.get(course.sectorId) || 0) + 1);
      if (isSectorActiveCourse(course)) {
        activeCounts.set(course.sectorId, (activeCounts.get(course.sectorId) || 0) + 1);
      }
    });
    const statusChanges = sectors.filter((sector) => {
      const desired = (activeCounts.get(sector.id) || 0) > 0 ? 'Active' : 'Inactive';
      return String(sector.status || '') !== desired;
    });
    // Persisting requires admin write access (see firestore.rules). Non-admins
    // (e.g. a trainer opening the create-class flow) still get the derived list
    // below for correct filtering, even though the write is skipped/denied.
    if (statusChanges.length) {
      try {
        const batch = writeBatch(db);
        statusChanges.forEach((sector) => {
          const status = (activeCounts.get(sector.id) || 0) > 0 ? 'Active' : 'Inactive';
          batch.update(doc(db, 'sectors', sector.id), { status, updatedAt: serverTimestamp() });
        });
        await batch.commit();
      } catch (writeErr) {
        console.warn('Could not persist sector status reconciliation:', writeErr?.message);
      }
    }
    return sectors.map((sector) => {
      const activeCourseCount = activeCounts.get(sector.id) || 0;
      return {
        ...sector,
        status: activeCourseCount > 0 ? 'Active' : 'Inactive',
        activeCourseCount,
        totalCourseCount: totalCounts.get(sector.id) || 0,
      };
    });
  } catch (error) {
    console.error('Error reconciling sector statuses:', error);
    return null;
  }
};

// ==================== COURSES OPERATIONS ====================

/**
 * Get all courses with filters
 */
export const getCourses = async (filters = {}) => {
  try {
    const classesCollection = collection(db, 'classes');
    const constraints = [];
    
    if (filters.sectorId) {
      constraints.push(where('sectorId', '==', filters.sectorId));
    }
    
    if (filters.trainerId) {
      constraints.push(where('trainerId', '==', filters.trainerId));
    }
    
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    
    // Note: Only add orderBy if there are no filters to avoid requiring composite indexes
    if (constraints.length === 0) {
      constraints.push(orderBy('createdAt', 'desc'));
    }
    
    const q = constraints.length > 0 ? query(classesCollection, ...constraints) : query(classesCollection);
    const snapshot = await getDocs(q);
    
    let courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort in-memory if we filtered (orderBy wasn't added)
    if (constraints.length > 0) {
      courses.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    }
    
    return courses;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
};

/**
 * All classes a trainer can teach: ones they LEAD (trainerId) plus ones they
 * co-train (coTrainerIds array-contains). Merged unique; status filtered
 * client-side to avoid composite indexes.
 */
export const getClassesForTrainer = async (trainerId, { status } = {}) => {
  try {
    if (!trainerId) return [];
    const classesCollection = collection(db, 'classes');
    const [ledSnap, coSnap] = await Promise.all([
      getDocs(query(classesCollection, where('trainerId', '==', trainerId))),
      getDocs(query(classesCollection, where('coTrainerIds', 'array-contains', trainerId))).catch(() => ({ docs: [] })),
    ]);
    const byId = new Map();
    [...ledSnap.docs, ...coSnap.docs].forEach((d) => {
      if (!byId.has(d.id)) byId.set(d.id, { id: d.id, ...d.data() });
    });
    let classes = Array.from(byId.values());
    if (status) classes = classes.filter((c) => String(c.status || '') === status);
    classes.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    return classes;
  } catch (error) {
    console.error('Error fetching trainer classes:', error);
    throw error;
  }
};

/**
 * Get course templates from 'courses' collection (for creating classes)
 */
export const getCoursesTemplates = async (filters = {}) => {
  try {
    const coursesCollection = collection(db, 'courses');
    const constraints = [];
    
    if (filters.sectorId) {
      constraints.push(where('sectorId', '==', filters.sectorId));
    }
    
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    
    // Note: Only add orderBy if there are no filters to avoid requiring composite indexes
    if (constraints.length === 0) {
      constraints.push(orderBy('createdAt', 'desc'));
    }
    
    const q = constraints.length > 0 ? query(coursesCollection, ...constraints) : query(coursesCollection);
    const snapshot = await getDocs(q);
    
    let courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Trainers only see programs an admin has switched on. Filter in-memory so
    // we don't need a composite index on (sectorId, available).
    if (filters.availableOnly) {
      courses = courses.filter((c) => c.available === true);
    }

    // Sort in-memory if we filtered (orderBy wasn't added)
    if (constraints.length > 0) {
      courses.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    }

    return courses;
  } catch (error) {
    console.error('Error fetching course templates:', error);
    throw error;
  }
};

/**
 * Get course by name (for URL-friendly access)
 */
export const getCourseByName = async (courseName) => {
  try {
    const classesRef = collection(db, 'classes');
    // New links use the immutable Firestore id, so renaming a class cannot
    // break bookmarks. Keep the name lookup as a legacy fallback.
    const directSnap = String(courseName || '').includes('/')
      ? null
      : await getDoc(doc(db, 'classes', courseName));
    let courseSnap = directSnap;

    if (!directSnap?.exists()) {
      const q = query(classesRef, where('name', '==', courseName));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length === 0) return null;
      courseSnap = snapshot.docs[0];
    }

    const courseId = courseSnap.id;
    
    // Fetch course materials if needed
    const materialsRef = collection(db, 'classes', courseId, 'materials');
    const materialsSnap = await getDocs(
      query(materialsRef, orderBy('week', 'asc'))
    );
    
    const materials = materialsSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      id: courseId,
      ...courseSnap.data(),
      materials,
    };
  } catch (error) {
    console.error('Error fetching course by name:', error);
    throw error;
  }
};

/**
 * Get course template by ID (from 'courses' collection)
 */
export const getCourseTemplateById = async (courseId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      return null;
    }
    
    return {
      id: courseSnap.id,
      ...courseSnap.data(),
    };
  } catch (error) {
    console.error('Error fetching course template:', error);
    throw error;
  }
};

/**
 * Get course by ID with materials
 */
export const getCourseById = async (courseId) => {
  try {
    const courseRef = doc(db, 'classes', courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      return null;
    }
    
    // Fetch course materials
    const materialsRef = collection(db, 'classes', courseId, 'materials');
    const materialsSnap = await getDocs(
      query(materialsRef, orderBy('week', 'asc'))
    );
    
    const materials = materialsSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      id: courseSnap.id,
      ...courseSnap.data(),
      materials,
    };
  } catch (error) {
    console.error('Error fetching class:', error);
    throw error;
  }
};

/**
 * Create a new course template (Admin only) - saves to 'courses' collection
 */
export const createCourseTemplate = async (courseData, { sectorId = null } = {}) => {
  try {
    const coursesRef = collection(db, 'courses');
    
    const newCourse = {
      ...courseData,
      sectorId: sectorId || null,
      status: courseData.status || 'Active',
      available: courseData.available ?? String(courseData.status || 'Active').toLowerCase() === 'active',
      hasContent: courseData.hasContent === true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(coursesRef, newCourse);

    // Log activity
    await logActivity('admin', 'create_course', 'courses', docRef.id, {
      courseName: courseData.name,
      sectorId: sectorId,
    });

    // Keep the sector's Active/Inactive status in sync with its courses.
    if (sectorId) await syncSectorStatus(sectorId);

    return docRef.id;
  } catch (error) {
    console.error('Error creating course template:', error);
    throw error;
  }
};

export const promoteClassToTemplate = async (classId) => {
  const promote = httpsCallable(functions, 'promoteClassToTemplate');
  const result = await promote({ classId });
  return result.data || { promoted: true };
};

export const cloneTemplateToClass = async (templateId, classId) => {
  const clone = httpsCallable(functions, 'cloneTemplateToClass');
  const result = await clone({ templateId, classId });
  return result.data || { cloned: true };
};

/**
 * Create a new class from a course template (trainer or admin) - saves to 'classes' collection
 */
export const createCourse = async (courseData, { sectorId = null, trainerId = null } = {}) => {
  let createdClassId = null;
  try {
    const classesRef = collection(db, 'classes');
    const normalizedName = String(courseData.name || '').trim().replace(/\s+/g, ' ');
    if (normalizedName.length < 3 || normalizedName.length > 100) {
      throw new Error('Class name must be between 3 and 100 characters.');
    }
    const nameKey = normalizedName.toLowerCase();
    const [duplicateSnapshot, legacyDuplicateSnapshot] = await Promise.all([
      getDocs(query(classesRef, where('nameKey', '==', nameKey))),
      getDocs(query(classesRef, where('name', '==', normalizedName))),
    ]);
    if (!duplicateSnapshot.empty || !legacyDuplicateSnapshot.empty) {
      throw new Error('A class with this name already exists. Choose a more specific class name.');
    }

    // `subjects` drives the class's modules but is not itself a class field —
    // keep it off the class doc.
    const {
      subjects: inlineSubjects,
      templateMode = 'legacy',
      templateHasContent = false,
      desiredStatus = '',
      ...classFields
    } = courseData;

    const newCourse = {
      ...classFields,
      name: normalizedName,
      nameKey,
      sectorId: sectorId || null,
      trainerId: trainerId || null,
      // Additional trainers who share edit rights (the lead is `trainerId`).
      coTrainerIds: [],
      creationMode: templateMode === 'template' ? 'template' : 'empty',
      status: templateMode === 'template' ? 'Provisioning' : (classFields.status || 'Active'),
      currentEnrollments: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(classesRef, newCourse);
    createdClassId = docRef.id;

    // Full templates are copied server-side so private assessment answer keys
    // are never exposed to the trainer's browser.
    if (templateMode === 'template') {
      if (!classFields.courseId || templateHasContent !== true) {
        await updateDoc(docRef, {
          templateCloneStatus: 'failed',
          updatedAt: serverTimestamp(),
        });
        throw new Error('The selected program does not have a full-content template.');
      }
      try {
        await cloneTemplateToClass(classFields.courseId, docRef.id);
        await updateDoc(docRef, {
          templateCloneStatus: 'complete',
          status: classFields.status || 'Active',
          updatedAt: serverTimestamp(),
        });
      } catch (cloneError) {
        await updateDoc(docRef, {
          templateCloneStatus: 'failed',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
        throw new Error(
          `The class could not be created from its template: ${
            cloneError?.message || 'Unknown cloning error'
          }`
        );
      }
    }

    // Seed the class's TOPICS from the program's subjects. Each subject becomes
    // a section (topic) in the Modules tab — this is what both the trainer's
    // Modules tab and the student course view actually render (the older
    // `modules` subcollection was never displayed, so seeded subjects appeared
    // to "vanish"). Seeded topics are published so the standard curriculum is
    // visible immediately; the trainer can unpublish/rename any of them.
    // A trainer-edited list is passed inline; otherwise read off the template.
    try {
      let subjects = Array.isArray(inlineSubjects) ? inlineSubjects : null;
      if (!subjects && classFields.courseId) {
        const template = await getCourseTemplateById(classFields.courseId).catch(() => null);
        subjects = Array.isArray(template?.subjects) ? template.subjects : null;
      }
      if (subjects && subjects.length) {
        const batch = writeBatch(db);
        // getClassTopics orders by createdAt asc, so stamp incrementally to keep
        // the subject order the trainer arranged in the template.
        const baseMs = Date.now();
        subjects.forEach((subject, index) => {
          const title = (typeof subject === 'string' ? subject : subject?.title || '').trim();
          if (!title) return;
          const topicRef = doc(collection(db, 'classes', docRef.id, 'topics'));
          batch.set(topicRef, {
            title,
            description: '',
            author: classFields.trainerName || '',
            authorId: trainerId || '',
            isPublished: true,
            order: index + 1,
            createdAt: Timestamp.fromDate(new Date(baseMs + index * 1000)),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (seedErr) {
      // A class with no seeded topics is still usable — the trainer can add
      // them manually. Don't fail class creation over this.
      console.warn('Could not seed class topics from subjects:', seedErr?.message);
    }

    // Log activity
    const actionBy = auth?.currentUser?.uid || trainerId || 'system';
    await logActivity(actionBy, 'create_class', 'classes', docRef.id, {
      className: courseData.name,
      sectorId: sectorId,
      assignedTrainerId: trainerId || '',
      creationMode: newCourse.creationMode,
      requestedStatus: desiredStatus || courseData.status || 'Active',
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    if (createdClassId && error && typeof error === 'object') {
      error.createdClassId = createdClassId;
    }
    throw error;
  }
};

// ---- Class engagement activity (open/close, assessment alt-tab) ----

/**
 * Record a student engagement event on a class. Best-effort: never throws so it
 * can't disrupt the student's session. `type` is one of:
 * 'class_open' | 'class_close' | 'assessment_blur' | 'assessment_focus'.
 */
export const logClassActivity = async (classId, { studentId, studentName = '', type, assessmentId = '', assessmentTitle = '' }) => {
  try {
    if (!classId || !studentId || !type) return;
    await addDoc(collection(db, 'classes', classId, 'activity'), {
      studentId,
      studentName,
      type,
      assessmentId,
      assessmentTitle,
      at: serverTimestamp(),
    });
  } catch (error) {
    // Engagement logging must never break the class/assessment experience.
    console.debug('Could not log class activity:', error?.code || error?.message);
  }
};

/**
 * Fetch recent engagement events for a class (trainer/admin Logs tab), newest first.
 */
export const getClassActivity = async (classId, max = 300) => {
  try {
    if (!classId) return [];
    const q = query(collection(db, 'classes', classId, 'activity'), orderBy('at', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching class activity:', error);
    return [];
  }
};

// ---- Co-trainers & ownership (lead trainer manages these; enforced by rules) ----

/**
 * Add a co-trainer to a class. Co-trainers get the same content/roster powers
 * as the lead (see classTrainer() in firestore.rules). Lead-only in practice
 * because only the lead can write the class doc.
 */
export const addCoTrainer = async (classId, trainerId) => {
  try {
    if (!classId || !trainerId) throw new Error('Missing class or trainer.');
    await updateDoc(doc(db, 'classes', classId), {
      coTrainerIds: arrayUnion(trainerId),
      updatedAt: serverTimestamp(),
    });
    logActivity(auth?.currentUser?.uid, 'cotrainer_added', 'classes', classId, { trainerId });
    createNotification({
      toUid: trainerId,
      type: 'cotrainer_added',
      text: 'You were added as a co-trainer to a class.',
      metadata: { classId },
    }).catch(() => {});
    return true;
  } catch (error) {
    console.error('Error adding co-trainer:', error);
    throw error;
  }
};

export const removeCoTrainer = async (classId, trainerId) => {
  try {
    if (!classId || !trainerId) throw new Error('Missing class or trainer.');
    await updateDoc(doc(db, 'classes', classId), {
      coTrainerIds: arrayRemove(trainerId),
      updatedAt: serverTimestamp(),
    });
    logActivity(auth?.currentUser?.uid, 'cotrainer_removed', 'classes', classId, { trainerId });
    return true;
  } catch (error) {
    console.error('Error removing co-trainer:', error);
    throw error;
  }
};

/**
 * Transfer lead ownership of a class to another trainer. The new lead becomes
 * `trainerId`; the previous lead is demoted to a co-trainer (and the new lead is
 * removed from coTrainerIds). Only the current lead (or admin) may do this.
 */
export const transferClassOwnership = async (classId, newLeadId) => {
  try {
    if (!classId || !newLeadId) throw new Error('Missing class or new lead.');
    const ref = doc(db, 'classes', classId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Class not found.');
    const data = snap.data() || {};
    const oldLead = data.trainerId || '';
    if (oldLead === newLeadId) return true; // already the lead
    const existingCo = Array.isArray(data.coTrainerIds) ? data.coTrainerIds : [];
    // New lead leaves the co-trainer list; old lead joins it (kept on the class).
    const nextCo = existingCo.filter((id) => id && id !== newLeadId);
    if (oldLead && !nextCo.includes(oldLead)) nextCo.push(oldLead);
    await updateDoc(ref, {
      trainerId: newLeadId,
      coTrainerIds: nextCo,
      updatedAt: serverTimestamp(),
    });
    logActivity(auth?.currentUser?.uid, 'class_ownership_transferred', 'classes', classId, {
      from: oldLead,
      to: newLeadId,
    });
    createNotification({
      toUid: newLeadId,
      type: 'class_ownership_transferred',
      text: 'You are now the lead trainer of a class.',
      metadata: { classId },
    }).catch(() => {});
    return true;
  } catch (error) {
    console.error('Error transferring class ownership:', error);
    throw error;
  }
};

/**
 * Update course template (Admin only) - updates 'courses' collection
 */
export const updateCourseTemplate = async (courseId, updates) => {
  try {
    const courseRef = doc(db, 'courses', courseId);

    // Resolve the sector before writing so a status change re-syncs the sector.
    let sectorId = updates.sectorId;
    if (sectorId === undefined) {
      const existing = await getDoc(courseRef).catch(() => null);
      sectorId = existing?.exists() ? existing.data().sectorId : null;
    }

    await setDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (sectorId) await syncSectorStatus(sectorId);

    return true;
  } catch (error) {
    console.error('Error updating course template:', error);
    throw error;
  }
};

/**
 * Update class (Trainor or Admin) - updates 'classes' collection
 */
export const updateCourse = async (courseId, updates) => {
  try {
    const courseRef = doc(db, 'classes', courseId);
    const nextUpdates = { ...updates };
    let previousName = '';
    let renamed = false;

    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'name')) {
      const currentClassSnapshot = await getDoc(courseRef);
      if (!currentClassSnapshot.exists()) {
        throw new Error('Class not found.');
      }
      previousName = String(currentClassSnapshot.data()?.name || '').trim();
      const normalizedName = String(nextUpdates.name || '').trim().replace(/\s+/g, ' ');
      if (normalizedName.length < 3 || normalizedName.length > 100) {
        throw new Error('Class name must be between 3 and 100 characters.');
      }

      const nameKey = normalizedName.toLowerCase();
      renamed = normalizedName !== previousName;
      if (renamed) {
        const classesRef = collection(db, 'classes');
        const [duplicateSnapshot, legacyDuplicateSnapshot] = await Promise.all([
          getDocs(query(classesRef, where('nameKey', '==', nameKey))),
          getDocs(query(classesRef, where('name', '==', normalizedName))),
        ]);
        const duplicate = [...duplicateSnapshot.docs, ...legacyDuplicateSnapshot.docs]
          .find((classDoc) => classDoc.id !== courseId);
        if (duplicate) {
          throw new Error('A class with this name already exists. Choose a more specific class name.');
        }
      }

      nextUpdates.name = normalizedName;
      nextUpdates.nameKey = nameKey;
    }

    // Enrollment cards keep display copies so student home screens do not need
    // permission to read every class document. Keep the shared name and
    // appearance synchronized for existing enrollments.
    const enrollmentCardUpdates = {};
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'name')) {
      enrollmentCardUpdates.className = nextUpdates.name;
    }
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'bgImage')) {
      enrollmentCardUpdates.bgImage = String(nextUpdates.bgImage || '');
    }
    if (Object.prototype.hasOwnProperty.call(nextUpdates, 'color')) {
      enrollmentCardUpdates.color = String(nextUpdates.color || '');
    }

    if (Object.keys(enrollmentCardUpdates).length > 0) {
      const enrollmentSnapshot = await getDocs(
        query(collection(db, 'enrollments'), where('classId', '==', courseId))
      );
      const enrollmentDocs = enrollmentSnapshot.docs;
      const firstBatch = writeBatch(db);
      firstBatch.set(courseRef, {
        ...nextUpdates,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      enrollmentDocs.slice(0, 499).forEach((enrollmentDoc) => {
        firstBatch.update(enrollmentDoc.ref, {
          ...enrollmentCardUpdates,
          updatedAt: serverTimestamp(),
        });
      });
      await firstBatch.commit();

      for (let index = 499; index < enrollmentDocs.length; index += 500) {
        const batch = writeBatch(db);
        enrollmentDocs.slice(index, index + 500).forEach((enrollmentDoc) => {
          batch.update(enrollmentDoc.ref, {
            ...enrollmentCardUpdates,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } else {
      await setDoc(courseRef, {
        ...nextUpdates,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    if (renamed) {
      logActivity(auth?.currentUser?.uid || 'system', 'rename_class', 'classes', courseId, {
        previousName,
        className: nextUpdates.name,
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
};

/**
 * Toggle whether a program (course template) is available to trainers.
 * Admin-only (enforced by rules). Trainers only see programs with available:true.
 */
export const setCourseAvailability = async (courseId, available) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
      available: !!available,
      updatedAt: serverTimestamp(),
    });
    // A sector is Active iff it has ≥1 available program, so re-sync its status.
    try {
      const snap = await getDoc(courseRef);
      const sectorId = snap.exists() ? snap.data().sectorId : null;
      if (sectorId) await syncSectorStatus(sectorId);
    } catch { /* best-effort */ }
    return true;
  } catch (error) {
    console.error('Error setting course availability:', error);
    throw error;
  }
};

/**
 * Seed the full TESDA taxonomy (sectors + programs w/ subjects) into Firestore.
 * Admin-only. Idempotent: existing sectors (by name) and programs (by
 * sector+name) are reused/skipped, so re-running never duplicates.
 *
 * Programs are seeded with `available: false` — an admin must switch each one
 * on before trainers can offer it.
 *
 * @returns {Promise<{sectorsCreated:number, programsCreated:number, programsSkipped:number}>}
 */
export const seedTesdaCatalog = async () => {
  const norm = (s) => String(s || '').trim().toLowerCase();

  // Existing data, so we can reconcile instead of blindly inserting.
  const [existingSectors, existingCourses] = await Promise.all([
    getSectors({}),
    getCoursesTemplates({}),
  ]);

  const sectorByName = new Map(existingSectors.map((s) => [norm(s.name), s]));
  // Key programs by "sectorId|programName" so the same program name under two
  // different sectors stays distinct (e.g. Food Processing appears twice).
  const courseKey = new Set(
    existingCourses.map((c) => `${c.sectorId || ''}|${norm(c.name)}`)
  );

  let sectorsCreated = 0;
  let programsCreated = 0;
  let programsSkipped = 0;

  for (const entry of TESDA_CATALOG) {
    // Resolve (or create) the sector.
    let sector = sectorByName.get(norm(entry.sector));
    if (!sector) {
      const created = await createSector({
        name: entry.sector,
        description: '',
        status: 'Active',
      });
      sector = { id: created.id, name: entry.sector };
      sectorByName.set(norm(entry.sector), sector);
      sectorsCreated += 1;
    }

    // Create each program (course template) under the sector.
    for (const program of entry.programs) {
      const key = `${sector.id}|${norm(program.name)}`;
      if (courseKey.has(key)) {
        programsSkipped += 1;
        continue;
      }
      await addDoc(collection(db, 'courses'), {
        name: program.name,
        description: '',
        level: parseLevel(program.name),
        sectorId: sector.id,
        subjects: program.subjects, // editable module templates
        available: false, // admin must enable before trainers can offer it
        status: 'Active',
        source: 'tesda-catalog',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      courseKey.add(key);
      programsCreated += 1;
    }
  }

  await logActivity('admin', 'seed_catalog', 'courses', 'tesda', {
    sectorsCreated,
    programsCreated,
    programsSkipped,
  });

  return { sectorsCreated, programsCreated, programsSkipped };
};

/**
 * Delete a course template (Admin)
 */
export const deleteCourse = async (courseId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    // Capture the sector before deleting so we can re-sync its status after.
    const existing = await getDoc(courseRef).catch(() => null);
    const sectorId = existing?.exists() ? existing.data().sectorId : null;

    const deleteSecurely = httpsCallable(functions, 'deleteCourseTemplateSecure');
    await deleteSecurely({ courseId });

    // Log activity
    await logActivity('admin', 'delete_course', 'courses', courseId, {
      courseId: courseId,
    });

    if (sectorId) await syncSectorStatus(sectorId);

    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

/**
 * Permanently delete a class (Trainor, from archived view)
 */
export const deleteClass = async (classId) => {
  try {
    const deleteSecurely = httpsCallable(functions, 'deleteClassSecure');
    await deleteSecurely({ classId });
    return true;
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
};

// ==================== ID CARD REQUESTS ====================
// Trainee raises an ID ticket -> class trainer approves/rejects -> admin
// (the "ID maker") sees the approved list and marks it completed.

const sortByField = (items, field) =>
  [...items].sort((a, b) => {
    const da = a[field]?.toDate?.() || new Date(a[field] || 0);
    const dbb = b[field]?.toDate?.() || new Date(b[field] || 0);
    return dbb - da;
  });

/**
 * Trainee creates an ID request (blocked if one is already pending/approved).
 */
export const createIdRequest = async (
  studentId,
  { studentName = '', studentEmail = '', classId = '', className = '', trainerId = '', type = 'New', notes = '' }
) => {
  try {
    if (!studentId) throw new Error('Missing student id');
    if (!trainerId) throw new Error('You must be in a class before requesting an ID.');

    // Prevent duplicate open requests.
    const existing = await getDocs(
      query(
        collection(db, 'idRequests'),
        where('studentId', '==', studentId),
        where('status', 'in', ['pending', 'approved'])
      )
    );
    if (!existing.empty) {
      throw new Error('You already have an ID request in progress.');
    }

    const docRef = await addDoc(collection(db, 'idRequests'), {
      studentId,
      studentName,
      studentEmail,
      classId,
      className,
      trainerId,
      type,
      notes,
      status: 'pending',
      requestedAt: serverTimestamp(),
    });

    logActivity(studentId, 'id_request', 'idRequests', docRef.id, { type });
    // ID requests are approved by the admin directly (not the trainer).
    notifyUsersByRole('admin', {
      type: 'id_request',
      text: `${studentName || 'A student'} requested an ID (${type}).`,
      fromUid: studentId,
    }).catch(() => {});

    return docRef.id;
  } catch (error) {
    console.error('Error creating ID request:', error);
    throw error;
  }
};

/**
 * Get ID requests by role-scoped filters (in-memory sort, no composite index).
 */
export const getIdRequests = async (filters = {}) => {
  try {
    const constraints = [];
    if (filters.studentId) constraints.push(where('studentId', '==', filters.studentId));
    if (filters.trainerId) constraints.push(where('trainerId', '==', filters.trainerId));
    if (filters.status) constraints.push(where('status', '==', filters.status));

    const q = constraints.length ? query(collection(db, 'idRequests'), ...constraints) : query(collection(db, 'idRequests'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return sortByField(items, 'requestedAt');
  } catch (error) {
    console.error('Error fetching ID requests:', error);
    throw error;
  }
};

/**
 * Trainor approves -> notify student + notify admins (the ID maker queue).
 */
export const approveIdRequest = async (requestId, reviewerUid = '') => {
  try {
    const ref = doc(db, 'idRequests', requestId);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    await updateDoc(ref, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerUid,
    });

    if (data.studentId) {
      createNotification({
        toUid: data.studentId,
        type: 'id_request_approved',
        text: 'Your ID request was approved and is being produced.',
        fromUid: reviewerUid,
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    console.error('Error approving ID request:', error);
    throw error;
  }
};

/**
 * Trainor rejects -> notify student.
 */
export const rejectIdRequest = async (requestId, reason = '', reviewerUid = '') => {
  try {
    const ref = doc(db, 'idRequests', requestId);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    await updateDoc(ref, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerUid,
    });

    if (data.studentId) {
      createNotification({
        toUid: data.studentId,
        type: 'id_request_rejected',
        text: `Your ID request was rejected${reason ? `: ${reason}` : '.'}`,
        fromUid: reviewerUid,
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    console.error('Error rejecting ID request:', error);
    throw error;
  }
};

/**
 * Admin marks an approved request as completed (ID produced).
 */
export const completeIdRequest = async (requestId, adminUid = '') => {
  try {
    const ref = doc(db, 'idRequests', requestId);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    await updateDoc(ref, {
      status: 'completed',
      completedAt: serverTimestamp(),
      completedBy: adminUid,
    });

    if (data.studentId) {
      createNotification({
        toUid: data.studentId,
        type: 'id_request_completed',
        text: 'Your ID is ready.',
        fromUid: adminUid,
      }).catch(() => {});
    }

    return true;
  } catch (error) {
    console.error('Error completing ID request:', error);
    throw error;
  }
};

// ==================== INCIDENT FORMS ====================
// Filed by students or trainers; visible to staff (trainer + admin).

export const subscribeToPersonalCalendarEvents = (userId, callback) => {
  if (!userId) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'users', userId, 'calendarEvents'),
    (snapshot) => {
      const events = snapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
        date: toDate(eventDoc.data().date),
      }));
      events.sort((a, b) => (a.date?.getTime?.() || 0) - (b.date?.getTime?.() || 0));
      callback(events);
    },
    (error) => {
      console.error('Error loading personal calendar events:', error);
      callback([]);
    }
  );
};

export const subscribeToClassPrefs = (userId, callback) => {
  if (!userId) {
    callback({});
    return () => {};
  }
  return onSnapshot(
    collection(db, 'users', userId, 'classPrefs'),
    (snapshot) => {
      const preferences = {};
      snapshot.docs.forEach((preferenceDoc) => {
        preferences[preferenceDoc.id] = {
          id: preferenceDoc.id,
          ...preferenceDoc.data(),
        };
      });
      callback(preferences);
    },
    (error) => {
      console.error('Error loading class preferences:', error);
      callback({});
    }
  );
};

export const setClassPref = async (userId, classId, preference = {}) => {
  if (!userId || !classId) {
    throw new Error('A user and class are required to personalize a class card.');
  }
  const nickname = String(preference.nickname || '').trim().replace(/\s+/g, ' ');
  const color = String(preference.color || '').trim();
  const allowedColors = new Set(COLOR_PALETTE.map((option) => option.bg));
  if (nickname.length > 100) {
    throw new Error('Class nickname must be 100 characters or fewer.');
  }
  if (color && !allowedColors.has(color)) {
    throw new Error('Choose a color from the available class palette.');
  }
  await setDoc(doc(db, 'users', userId, 'classPrefs', classId), {
    nickname,
    color,
    updatedAt: serverTimestamp(),
  });
  return true;
};

export const getJoinableClasses = async (filters = {}) => {
  const constraints = [];
  if (filters.sectorId) constraints.push(where('sectorId', '==', filters.sectorId));
  if (filters.status) constraints.push(where('status', '==', filters.status));
  const snapshot = await getDocs(
    query(collection(db, 'classDirectory'), ...constraints)
  );
  return snapshot.docs
    .map((classDoc) => ({ id: classDoc.id, ...classDoc.data() }))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
};

export const createPersonalCalendarEvent = async (userId, event = {}) => {
  if (!userId || !event.title || !event.date) {
    throw new Error('Calendar event title and date are required.');
  }
  const ref = await addDoc(collection(db, 'users', userId, 'calendarEvents'), {
    title: String(event.title).trim(),
    date: event.date instanceof Date ? Timestamp.fromDate(event.date) : Timestamp.fromDate(new Date(event.date)),
    endTime: String(event.endTime || ''),
    type: String(event.type || 'personal'),
    location: String(event.location || '').trim(),
    color: String(event.color || 'purple'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const createIncidentForm = async ({
  filedByName = '',
  filedByRole = '',
  involvedStudentId = '',
  involvedStudentName = '',
  classId = '',
  className = '',
  date = '',
  type = 'Other',
  severity = 'Low',
  description = '',
}) => {
  try {
    const filedBy = auth?.currentUser?.uid || '';
    if (!filedBy) throw new Error('You must be signed in to file an incident.');
    if (!description.trim()) throw new Error('Description is required.');

    const docRef = await addDoc(collection(db, 'incidentForms'), {
      filedBy,
      filedByName,
      filedByRole,
      involvedStudentId,
      involvedStudentName,
      classId,
      className,
      date: date || new Date().toISOString().slice(0, 10),
      type,
      severity,
      description: description.trim(),
      status: 'open',
      createdAt: serverTimestamp(),
    });

    logActivity(filedBy, 'incident_filed', 'incidentForms', docRef.id, { type, severity });
    notifyUsersByRole('admin', {
      type: 'incident_filed',
      text: `${filedByRole || 'Someone'} filed a ${type} incident.`,
      fromUid: filedBy,
    }).catch(() => {});

    return docRef.id;
  } catch (error) {
    console.error('Error filing incident form:', error);
    throw error;
  }
};

export const getIncidentForms = async (filters = {}) => {
  try {
    const constraints = [];
    if (filters.filedBy) constraints.push(where('filedBy', '==', filters.filedBy));
    if (filters.status) constraints.push(where('status', '==', filters.status));
    if (filters.classId) constraints.push(where('classId', '==', filters.classId));

    const q = constraints.length ? query(collection(db, 'incidentForms'), ...constraints) : query(collection(db, 'incidentForms'));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return sortByField(items, 'createdAt');
  } catch (error) {
    console.error('Error fetching incident forms:', error);
    throw error;
  }
};

export const updateIncidentStatus = async (incidentId, status, reviewerUid = '') => {
  try {
    await updateDoc(doc(db, 'incidentForms', incidentId), {
      status,
      reviewedBy: reviewerUid,
      reviewedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating incident status:', error);
    throw error;
  }
};

export const updateIncidentForm = async (incidentId, fields = {}) => {
  try {
    const allowed = ['type', 'severity', 'date', 'involvedStudentName', 'description'];
    const payload = {};
    allowed.forEach((key) => {
      if (fields[key] !== undefined) payload[key] = fields[key];
    });
    if (payload.description !== undefined) {
      payload.description = String(payload.description).trim();
      if (!payload.description) throw new Error('Description is required.');
    }
    if (Object.keys(payload).length === 0) return true;
    payload.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'incidentForms', incidentId), payload);
    return true;
  } catch (error) {
    console.error('Error updating incident form:', error);
    throw error;
  }
};

export const deleteIncidentForm = async (incidentId) => {
  try {
    await deleteDoc(doc(db, 'incidentForms', incidentId));
    return true;
  } catch (error) {
    console.error('Error deleting incident form:', error);
    throw error;
  }
};

export const deleteIncidentForms = async (incidentIds = []) => {
  try {
    const ids = incidentIds.filter(Boolean);
    if (ids.length === 0) return true;
    const batch = writeBatch(db);
    ids.forEach((id) => batch.delete(doc(db, 'incidentForms', id)));
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error deleting incident forms:', error);
    throw error;
  }
};

// ==================== ENROLLMENTS ====================

/**
 * Get active enrollment for a student
 */
export const queryActiveEnrollment = async (studentId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('status', 'in', ['active', 'ongoing'])
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('Error querying active enrollment:', error);
    throw error;
  }
};

/**
 * Get all enrollments for a student
 */
export const getStudentEnrollments = async (studentId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('studentId', '==', studentId));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time student enrollments (for sidebar)
 */
export const subscribeToStudentEnrollments = (studentId, callback) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('studentId', '==', studentId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const enrollments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(enrollments);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to student enrollments:', error);
    throw error;
  }
};

/**
 * Join a class by class code (Trainee view)
 */
export const joinClassByCode = async (studentId, classCode) => {
  try {
    if (!classCode.trim()) {
      throw new Error('Class code is required');
    }

    // Find class by code
    const classesRef = collection(db, 'classDirectory');
    const q = query(
      classesRef,
      where('classCode', '==', classCode.trim().toUpperCase()),
      where('status', '==', 'Active')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Invalid class code. Please check and try again.');
    }

    const classDoc = snapshot.docs[0];
    const classData = classDoc.data();
    const classId = classDoc.id;

    if (String(classData.status || '').toLowerCase() !== 'active') {
      throw new Error('This class is not currently open for enrollment.');
    }
    const enrollmentDeadline =
      classData.enrollmentDeadline || classData.expiresAt || classData.expiryDate || classData.endDate;
    if (enrollmentDeadline) {
      const deadline = toDate(enrollmentDeadline);
      if (deadline && Number.isFinite(deadline.getTime()) && Date.now() > deadline.getTime()) {
        throw new Error('This class code has expired.');
      }
    }
    const capacity = Number(classData.capacity || classData.maxStudents || 0);
    if (capacity > 0 && Number(classData.currentEnrollments || 0) >= capacity) {
      throw new Error('This class is full.');
    }

    // Admin-configurable enrollment policy (Settings → Access & Registration).
    const { access } = await getAppSettings();
    const requireApproval = access.requireEnrollmentApproval !== false;
    const allowMultiple = access.allowMultipleEnrollments !== false;

    // When multiple active enrollments are disallowed, block a second one.
    if (!allowMultiple) {
      const active = await queryActiveEnrollment(studentId);
      if (active) {
        throw new Error('You already have an active enrollment. Finish it before joining another class.');
      }
    }

    // Trainees may hold several enrollments at once, but not duplicate the same
    // class or re-join one they already have a request/seat in.
    const enrollmentsRef = collection(db, 'enrollments');
    const existingQ = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('classId', '==', classId)
    );
    const existingSnapshot = await getDocs(existingQ);

    if (!existingSnapshot.empty) {
      const existingEnrollment = existingSnapshot.docs[0].data();
      if (existingEnrollment.status === 'completed') {
        throw new Error('You have already completed this class and cannot re-enroll.');
      }
      if (existingEnrollment.status === 'pending') {
        throw new Error('Your request to join this class is already awaiting trainer approval.');
      }
      throw new Error('You are already enrolled in this class.');
    }

    // Enrollment starts PENDING when approval is required (the trainer approves
    // it), or ACTIVE immediately when approval is turned off.
    const initialStatus = requireApproval ? 'pending' : 'active';
    const enrollmentData = {
      studentId,
      classId,
      className: classData.name || 'Unnamed Class',
      status: initialStatus,
      requestedAt: new Date().toISOString(),
      progress: {
        attendanceRate: 0,
        tasksCompleted: 0,
        totalTasks: 0
      }
    };
    if (!requireApproval) {
      enrollmentData.joinedAt = new Date().toISOString();
    }

    // Add optional fields if they exist
    if (classData.trainerName) {
      enrollmentData.trainerName = classData.trainerName;
    }
    if (classData.trainerId) {
      enrollmentData.trainerId = classData.trainerId;
    }
    // Add courseId for course lookup
    if (classData.courseId) {
      enrollmentData.courseId = classData.courseId;
    }
    // Add level directly from class data for immediate display
    if (classData.level) {
      enrollmentData.level = classData.level;
    }
    if (classData.bgImage) {
      enrollmentData.bgImage = classData.bgImage;
    }
    if (classData.color) {
      enrollmentData.color = classData.color;
    }

    const docRef = doc(enrollmentsRef, `${classId}_${studentId}`);
    await setDoc(docRef, enrollmentData);

    if (!requireApproval) {
      // Auto-approved: grant class membership immediately and confirm to the
      // trainee (no trainer action needed).
      try {
        await ensureClassMembership({ id: docRef.id, classId, studentId, status: 'active' });
      } catch (memberErr) {
        console.warn('Could not create class membership on auto-approve:', memberErr?.message);
      }
      try {
        await createNotification({
          toUid: studentId,
          type: 'join_approved',
          text: `You've joined ${classData.name || 'the class'}. Your dashboard is now unlocked.`,
          metadata: { classId, enrollmentId: docRef.id, className: classData.name || '' },
        });
      } catch (notifyErr) {
        console.warn('Could not notify student of auto-approval:', notifyErr?.message);
      }
    } else if (classData.trainerId) {
      // Let the trainer know someone is waiting for approval.
      try {
        const studentProfile = await getUserProfile(studentId).catch(() => null);
        const studentName =
          studentProfile?.name ||
          studentProfile?.displayName ||
          studentProfile?.email ||
          'A student';
        await createNotification({
          toUid: classData.trainerId,
          type: 'join_request',
          text: `${studentName} requested to join ${classData.name || 'your class'}. Approve them in the class roster.`,
          fromUid: studentId,
          fromName: studentName,
          metadata: { classId, enrollmentId: docRef.id, className: classData.name || '' },
        });
      } catch (notifyErr) {
        console.warn('Could not notify trainer of join request:', notifyErr?.message);
      }
    }

    return {
      id: docRef.id,
      ...enrollmentData,
      classId
    };
  } catch (error) {
    console.error('Error joining class by code:', error);
    throw error;
  }
};

/**
 * Trainor approves a pending class-join request (pending -> active).
 */
export const ensureClassMembership = async (enrollment = {}) => {
  const studentId = enrollment.studentId || auth?.currentUser?.uid;
  if (
    !enrollment.id
    || !enrollment.classId
    || !studentId
    || !['active', 'ongoing', 'completed'].includes(String(enrollment.status || '').toLowerCase())
  ) {
    return false;
  }
  await setDoc(
    doc(db, 'classes', enrollment.classId, 'members', studentId),
    {
      studentId,
      enrollmentId: enrollment.id,
      status: String(enrollment.status).toLowerCase(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return true;
};

export const approveEnrollment = async (enrollmentId, { studentId, classId, className } = {}) => {
  try {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentSnapshot = await getDoc(enrollmentRef);
    const enrollmentData = enrollmentSnapshot.exists() ? enrollmentSnapshot.data() : {};
    const resolvedStudentId = studentId || enrollmentData.studentId;
    const resolvedClassId = classId || enrollmentData.classId;
    const batch = writeBatch(db);
    batch.update(enrollmentRef, {
      status: 'active',
      joinedAt: new Date().toISOString(),
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (resolvedStudentId && resolvedClassId) {
      batch.set(
        doc(db, 'classes', resolvedClassId, 'members', resolvedStudentId),
        {
          studentId: resolvedStudentId,
          enrollmentId,
          status: 'active',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();

    if (resolvedStudentId) {
      try {
        await createNotification({
          toUid: resolvedStudentId,
          type: 'join_approved',
          text: `You've been added to ${className || 'your class'}. Your dashboard is now unlocked.`,
          metadata: { enrollmentId },
        });
      } catch (notifyErr) {
        console.warn('Could not notify student of approval:', notifyErr?.message);
      }
    }
    return true;
  } catch (error) {
    console.error('Error approving enrollment:', error);
    throw error;
  }
};

/**
 * Get enrollments for a course (Trainor view)
 */
export const getCourseEnrollments = async (courseId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('classId', '==', courseId));
    
    const snapshot = await getDocs(q);
    
    // Filter by status in memory to avoid composite index requirement
    return snapshot.docs
      .filter((doc) => doc.data().status === 'active')
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  } catch (error) {
    console.error('Error fetching class enrollments:', error);
    throw error;
  }
};

/**
 * Get course enrollments with student avatar data
 */
export const getCourseEnrollmentsWithAvatars = async (courseId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('classId', '==', courseId));
    
    const snapshot = await getDocs(q);
    
    // Filter by status and fetch avatar data
    const enrollmentsWithAvatars = await Promise.all(
      snapshot.docs
        .filter((doc) => doc.data().status === 'active')
        .map(async (doc) => {
          const enrollmentData = doc.data();
          let studentAvatar = null;
          
          // Try to fetch student's avatar from users collection
          if (enrollmentData.studentId) {
            try {
              const userDocRef = doc(db, 'users', enrollmentData.studentId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                studentAvatar = userData.avatarBase64 || userData.avatarUrl || userData.avatarPreview || null;
              }
            } catch (error) {
              console.warn('Error fetching student avatar:', error);
            }
          }
          
          return {
            id: doc.id,
            ...enrollmentData,
            studentAvatar: studentAvatar,
          };
        })
    );
    
    return enrollmentsWithAvatars;
  } catch (error) {
    console.error('Error fetching course enrollments with avatars:', error);
    throw error;
  }
};

/**
 * Create enrollment (called by Cloud Function on approval)
 * Direct creation not allowed from client
 */
export const createEnrollment = async (enrollmentData) => {
  // This is handled via Cloud Function
  // Client cannot directly create enrollments
  console.warn('Use Cloud Function for enrollment creation');
};

/**
 * Update enrollment status (for trainer to mark complete/terminate)
 */
export const updateEnrollmentStatus = async (enrollmentId, newStatus, reason = '') => {
  try {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentSnapshot = await getDoc(enrollmentRef);
    const enrollment = enrollmentSnapshot.exists() ? enrollmentSnapshot.data() : {};
    const updates = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };
    
    if (newStatus === 'completed') {
      updates.completedAt = serverTimestamp();
      // Freeze the summary graduates see. Archived Classes must not read its
      // name/description/modules from a template that trainers can later edit.
      if (enrollment.classId) {
        const classSnapshot = await getDoc(doc(db, 'classes', enrollment.classId));
        const classData = classSnapshot.exists() ? classSnapshot.data() || {} : {};
        let templateData = {};
        if (classData.courseId || enrollment.courseId) {
          const templateSnapshot = await getDoc(
            doc(db, 'courses', classData.courseId || enrollment.courseId)
          ).catch(() => null);
          templateData = templateSnapshot?.exists() ? templateSnapshot.data() || {} : {};
        }
        updates.className = classData.name || enrollment.className || 'Completed Class';
        updates.courseName = templateData.name || enrollment.courseName || '';
        updates.trainerName = classData.trainerName || enrollment.trainerName || '';
        updates.description = classData.description || templateData.description || enrollment.description || '';
        updates.subjects = Array.isArray(classData.subjects)
          ? classData.subjects
          : (Array.isArray(templateData.subjects) ? templateData.subjects : []);
        updates.bgImage = classData.bgImage || enrollment.bgImage || templateData.bgImage || '';
        updates.color = classData.color || enrollment.color || '';
      }
    } else if (newStatus === 'terminated') {
      updates.terminatedAt = serverTimestamp();
      updates.terminationReason = reason;
    }
    
    const batch = writeBatch(db);
    batch.update(enrollmentRef, updates);
    if (enrollment.classId && enrollment.studentId) {
      const memberRef = doc(db, 'classes', enrollment.classId, 'members', enrollment.studentId);
      if (newStatus === 'terminated') {
        batch.delete(memberRef);
      } else {
        batch.set(
          memberRef,
          {
            studentId: enrollment.studentId,
            enrollmentId,
            status: newStatus,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    throw error;
  }
};

/**
 * Update enrollment progress
 */
export const updateEnrollmentProgress = async (enrollmentId, progressData) => {
  try {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    
    await updateDoc(enrollmentRef, {
      progress: {
        ...progressData,
      },
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error updating enrollment progress:', error);
    throw error;
  }
};

/**
 * Remove enrollment (trainer can kick students)
 */
export const removeEnrollment = async (enrollmentId) => {
  try {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentSnapshot = await getDoc(enrollmentRef);
    const enrollment = enrollmentSnapshot.exists() ? enrollmentSnapshot.data() : {};
    const batch = writeBatch(db);
    batch.delete(enrollmentRef);
    if (enrollment.classId && enrollment.studentId) {
      batch.delete(doc(db, 'classes', enrollment.classId, 'members', enrollment.studentId));
    }
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error removing enrollment:', error);
    throw error;
  }
};

// ==================== COURSE MATERIALS ====================

/**
 * Get course materials
 */
export const getCourseMaterials = async (courseId) => {
  try {
    const materialsRef = collection(db, 'courses', courseId, 'materials');
    const q = query(materialsRef, orderBy('week', 'asc'), orderBy('order', 'asc'));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching course materials:', error);
    throw error;
  }
};

/**
 * Upload course material (Trainor only)
 */
export const uploadCourseMaterial = async (
  courseId,
  trainerId,
  materialData
) => {
  try {
    const materialsRef = collection(db, 'courses', courseId, 'materials');
    
    const newMaterial = {
      ...materialData,
      courseId,
      trainerId,
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(materialsRef, newMaterial);
    
    return docRef.id;
  } catch (error) {
    console.error('Error uploading course material:', error);
    throw error;
  }
};

/**
 * Delete course material (Trainor only)
 */
export const deleteCourseMaterial = async (courseId, materialId) => {
  try {
    const materialRef = doc(db, 'courses', courseId, 'materials', materialId);
    await deleteDoc(materialRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting course material:', error);
    throw error;
  }
};

// ==================== ACTIVITY LOGGING ====================

/**
 * Log user activity/action
 */
export const logActivity = async (
  userId,
  action,
  entityType,
  entityId,
  metadata = {}
) => {
  try {
    const logsRef = collection(db, 'activityLogs');
    
    await addDoc(logsRef, {
      userId,
      action,
      entityType,
      entityId,
      metadata,
      timestamp: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    // Don't throw - logging should not break functionality
    console.warn('Error logging activity:', error);
  }
};

/**
 * Get recent activity logs across all users (Admin System Logs page)
 */
export const subscribeToActivityLogs = (callback, limitResults = 200) => {
  const logsRef = collection(db, 'activityLogs');
  const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitResults));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    },
    (error) => {
      console.error('Error subscribing to activity logs:', error);
      callback([]);
    }
  );
};

// ==================== NOTIFICATIONS ====================

/**
 * Create a notification for a specific user
 */
export const createNotification = async ({ toUid, type = 'general', text, fromUid = '', fromName = '', metadata = {} }) => {
  try {
    if (!toUid || !text) {
      throw new Error('Notification requires toUid and text');
    }

    // Admin can disable a notification event type platform-wide (Settings →
    // Notifications). Only an explicit `false` suppresses it; unknown/general
    // types are always allowed.
    if (!isNotificationTypeEnabled(type)) {
      return null;
    }

    // Rules require fromUid == request.auth.uid; default to the caller.
    const resolvedFromUid = fromUid || auth?.currentUser?.uid || '';

    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      toUid,
      type,
      text,
      fromUid: resolvedFromUid,
      fromName,
      metadata,
      unread: true,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Notify every user with a given role (e.g. all admins)
 */
export const notifyUsersByRole = async (role, notification) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', role));
    const snapshot = await getDocs(q);

    await Promise.all(
      snapshot.docs.map((userDoc) => createNotification({ ...notification, toUid: userDoc.id }))
    );
  } catch (error) {
    console.warn('Error notifying users by role:', error);
  }
};

/**
 * Subscribe to a user's notifications (most recent first)
 */
export const subscribeToNotifications = (uid, callback, limitResults = 50) => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(notificationsRef, where('toUid', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      // Sort in-memory to avoid a composite index requirement
      notifications.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      callback(notifications.slice(0, limitResults));
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
      callback([]);
    }
  );
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { unread: false });
  } catch (error) {
    console.warn('Error marking notification read:', error);
  }
};

/**
 * Mark all of a user's notifications as read
 */
export const markAllNotificationsRead = async (uid) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('toUid', '==', uid), where('unread', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.update(docSnap.ref, { unread: false }));
    await batch.commit();
  } catch (error) {
    console.warn('Error marking all notifications read:', error);
  }
};

/**
 * Delete a single notification (recipient dismisses it).
 */
export const deleteNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.warn('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all of a user's notifications (clear the inbox).
 */
export const clearAllNotifications = async (uid) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const snapshot = await getDocs(query(notificationsRef, where('toUid', '==', uid)));
    if (snapshot.empty) return 0;
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = writeBatch(db);
      snapshot.docs.slice(i, i + 450).forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    }
    return snapshot.docs.length;
  } catch (error) {
    console.warn('Error clearing notifications:', error);
    throw error;
  }
};

/**
 * Get all trainers (for student waiting room trainer picker)
 */
export const getTrainers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'trainer'));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((trainer) => String(trainer.status || 'Active').toLowerCase() === 'active');
  } catch (error) {
    console.error('Error fetching trainers:', error);
    throw error;
  }
};

/**
 * Get all student users (for admin roster management pickers).
 */
export const getStudents = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'student'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
};

/**
 * All enrollments for a class, any status (admin/trainer roster management).
 */
export const getClassEnrollments = async (classId) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    const q = query(enrollmentsRef, where('classId', '==', classId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error('Error fetching class enrollments:', error);
    throw error;
  }
};

/**
 * Admin adds a student directly to a class (active enrollment, no approval).
 * Rules permit admins to create enrollments in any state.
 */
export const adminAddStudentToClass = async (classId, student, classData = {}) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    // Guard against duplicates.
    const existingSnap = await getDocs(
      query(enrollmentsRef, where('studentId', '==', student.id), where('classId', '==', classId))
    );
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      if (existing.status === 'completed') {
        throw new Error('That student already completed this class.');
      }
      throw new Error('That student is already enrolled (or has a pending request) in this class.');
    }

    const enrollmentData = {
      studentId: student.id,
      classId,
      className: classData.name || 'Unnamed Class',
      studentName: student.name || student.displayName || student.email || 'Trainee',
      studentEmail: student.email || '',
      status: 'active',
      joinedAt: new Date().toISOString(),
      progress: { attendanceRate: 0, tasksCompleted: 0, totalTasks: 0 },
    };
    if (classData.trainerId) enrollmentData.trainerId = classData.trainerId;
    if (classData.trainerName) enrollmentData.trainerName = classData.trainerName;
    if (classData.courseId) enrollmentData.courseId = classData.courseId;
    if (classData.level) enrollmentData.level = classData.level;
    if (classData.bgImage) enrollmentData.bgImage = classData.bgImage;
    if (classData.color) enrollmentData.color = classData.color;

    const enrollmentRef = doc(enrollmentsRef, `${classId}_${student.id}`);
    const batch = writeBatch(db);
    batch.set(enrollmentRef, enrollmentData);
    batch.set(
      doc(db, 'classes', classId, 'members', student.id),
      {
        studentId: student.id,
        enrollmentId: enrollmentRef.id,
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await batch.commit();

    // Notify the student they were added.
    try {
      await createNotification({
        toUid: student.id,
        type: 'join_approved',
        text: `You've been added to ${classData.name || 'a class'}. Your dashboard is now unlocked.`,
        metadata: { classId, enrollmentId: enrollmentRef.id },
      });
    } catch (notifyErr) {
      console.warn('Could not notify added student:', notifyErr?.message);
    }

    return { id: enrollmentRef.id, ...enrollmentData };
  } catch (error) {
    console.error('Error adding student to class:', error);
    throw error;
  }
};

/**
 * Purge activity logs. Pass a list of ids to delete a subset, or omit to purge
 * everything currently loaded. Admin-only (enforced by security rules).
 */
/**
 * Fetch activity logs whose timestamp falls within [fromDate, toDate] (inclusive).
 * Ordered newest-first. Uses a single-field range so no composite index is required.
 */
export const getActivityLogsByDateRange = async (fromDate, toDate) => {
  try {
    const logsRef = collection(db, 'activityLogs');
    const q = query(
      logsRef,
      where('timestamp', '>=', Timestamp.fromDate(fromDate)),
      where('timestamp', '<=', Timestamp.fromDate(toDate)),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching activity logs by date range:', error);
    throw error;
  }
};

export const purgeActivityLogs = async (logIds = null) => {
  try {
    let ids = logIds;
    if (!ids) {
      const snapshot = await getDocs(collection(db, 'activityLogs'));
      ids = snapshot.docs.map((d) => d.id);
    }
    // Firestore batches cap at 500 writes.
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      ids.slice(i, i + 450).forEach((id) => batch.delete(doc(db, 'activityLogs', id)));
      await batch.commit();
    }
    return ids.length;
  } catch (error) {
    console.error('Error purging activity logs:', error);
    throw error;
  }
};

/**
 * Get user activity logs
 */
export const getUserActivityLogs = async (userId, limitResults = 50) => {
  try {
    const logsRef = collection(db, 'activityLogs');
    // Note: Don't add orderBy with WHERE clause to avoid requiring composite index
    // Will sort in-memory instead
    const q = query(
      logsRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    let logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort by timestamp in memory (most recent first)
    logs.sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(0);
      const timeB = b.timestamp?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
    
    // Apply limit
    return logs.slice(0, limitResults);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
};

// ==================== HELPERS ====================

/**
 * Batch update multiple documents
 */
export const batchUpdateDocs = async (updates) => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ ref, data }) => {
      batch.update(ref, { ...data, updatedAt: serverTimestamp() });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
};

/**
 * Convert Firestore timestamp to JavaScript Date
 */
export const toDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp instanceof Timestamp
    ? timestamp.toDate()
    : new Date(timestamp);
};

// ==================== CLASS ANNOUNCEMENTS ====================

/**
 * Create an announcement for a class
 */
export const createAnnouncement = async (classId, { title, message, author, authorId, authorAvatar, attachments = [] }) => {
  try {
    const announcementsRef = collection(db, 'classes', classId, 'announcements');
    
    // Firestore rejects `undefined` field values, so coerce any missing
    // fields to safe defaults (null/empty) before writing.
    const announcement = {
      title: title ?? '',
      message: message ?? '',
      author: author ?? 'Trainor',
      authorId: authorId ?? null,
      authorAvatar: authorAvatar ?? null,
      attachments: attachments ?? [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(announcementsRef, announcement);
    return { id: docRef.id, ...announcement };
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

/**
 * Update an announcement for a class
 */
export const updateAnnouncement = async (classId, announcementId, { title, message, attachments } = {}) => {
  try {
    const announcementRef = doc(db, 'classes', classId, 'announcements', announcementId);

    // Only overwrite the fields the caller actually provided. This prevents an
    // edit that changes just the text from wiping the announcement's existing
    // attachments (or resetting its title).
    const updates = { updatedAt: serverTimestamp() };
    if (title !== undefined) updates.title = title;
    if (message !== undefined) updates.message = message;
    if (attachments !== undefined) updates.attachments = attachments;

    await updateDoc(announcementRef, updates);

    return { id: announcementId, ...updates };
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

/**
 * Delete an announcement for a class
 */
export const deleteAnnouncement = async (classId, announcementId) => {
  try {
    const announcementRef = doc(db, 'classes', classId, 'announcements', announcementId);
    await deleteDoc(announcementRef);
    return true;
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

/**
 * Get all announcements for a class
 */
export const getAnnouncements = async (classId) => {
  try {
    const announcementsRef = collection(db, 'classes', classId, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((announcementDoc) => {
      const data = announcementDoc.data();
      return {
        id: announcementDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      };
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time announcements
 */
export const subscribeToAnnouncements = (classId, callback) => {
  try {
    // Safety check for null/undefined classId
    if (!classId) {
      console.warn('⚠️ subscribeToAnnouncements called with null/undefined classId');
      callback([]);
      return () => {}; // Return no-op unsubscribe
    }
    
    const announcementsRef = collection(db, 'classes', classId, 'announcements');
    const q = query(announcementsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcements = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        };
      });
      callback(announcements);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to announcements:', error);
    throw error;
  }
};

/**
 * Get activity feed for a class (recent posts, assessments, materials)
 */
export const getClassActivityFeed = async (classId, limitResults = 10) => {
  try {
    const activities = [];
    
    // Get recent announcements
    const announcementsRef = collection(db, 'classes', classId, 'announcements');
    const announcementsQuery = query(announcementsRef, orderBy('createdAt', 'desc'), limit(5));
    const announcementSnapshots = await getDocs(announcementsQuery);
    
    announcementSnapshots.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        type: 'announcement',
        title: data.title,
        message: data.message,
        author: data.author,
        authorId: data.authorId,
        attachments: data.attachments || [],
        timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
        preview: data.message?.trim()
          ? `${data.message.trim().substring(0, 50)}${data.message.trim().length > 50 ? '...' : ''}`
          : (data.title || 'Announcement'),
        hasAttachments: (data.attachments || []).length > 0
      });
    });
    
    // Get recent assessments
    const assessmentsRef = collection(db, 'classes', classId, 'assessments');
    const assessmentsQuery = query(assessmentsRef, orderBy('createdAt', 'desc'), limit(5));
    const assessmentSnapshots = await getDocs(assessmentsQuery);
    
    assessmentSnapshots.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        type: 'assessment',
        title: data.title,
        author: data.author,
        authorId: data.authorId,
        timestamp: data.createdAt?.toDate?.() || new Date(data.createdAt),
        preview: `${data.questions?.length || 0} questions`
      });
    });
    
    // Get recent materials
    const modulesRef = collection(db, 'classes', classId, 'modules');
    const modulesSnapshot = await getDocs(modulesRef);
    
    for (const moduleDoc of modulesSnapshot.docs) {
      const materialsRef = collection(db, 'classes', classId, 'modules', moduleDoc.id, 'materials');
      const materialsQuery = query(materialsRef, orderBy('uploadedAt', 'desc'), limit(3));
      const materialSnapshots = await getDocs(materialsQuery);
      
      materialSnapshots.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'material',
          title: data.title,
          author: data.author,
          authorId: data.authorId,
          timestamp: data.uploadedAt?.toDate?.() || new Date(data.uploadedAt),
          preview: `${data.fileType} • ${data.fileSize}`
        });
      });
    }
    
    // Sort all activities by timestamp descending and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, limitResults);
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
};

/**
 * Upload a file to Cloud Storage and return compact metadata for Firestore.
 */
export const compressAndStoreFile = async (file, classId) => {
  try {
    // Validate file exists
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Validate file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('File name is invalid');
    }

    if (!storage || !auth?.currentUser?.uid) {
      throw new Error('File storage is unavailable or the user is not signed in.');
    }
    if (!classId) {
      throw new Error('A class is required before uploading an LMS file.');
    }
    const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error(
        `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size: 25MB`
      );
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const randomPart =
      globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `lmsFiles/${classId}/${auth.currentUser.uid}/${randomPart}-${safeName}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: { originalName: file.name },
    });
    const url = await getDownloadURL(fileRef);
    return {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      url,
      storagePath: path,
    };

          // Base64 string + JSON overhead ≈ base64 length + 500 bytes
  } catch (error) {
    console.error('File upload error:', error.message);
    throw error;
  }
};

/**
 * Upload the site branding logo to the public `branding/` Storage path and
 * return its download URL. Admin-only (enforced by storage.rules).
 */
export const uploadBrandingLogo = async (file) => {
  if (!file) throw new Error('No logo file provided.');
  if (!storage || !auth?.currentUser?.uid) {
    throw new Error('Storage is unavailable or you are not signed in.');
  }
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('The logo must be an image file.');
  }
  const MAX_LOGO_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_LOGO_SIZE) {
    throw new Error(`Logo is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size: 5MB`);
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const randomPart =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fileRef = storageRef(storage, `branding/logo-${randomPart}-${safeName}`);
  await uploadBytes(fileRef, file, {
    contentType: file.type,
    customMetadata: { originalName: file.name },
  });
  return getDownloadURL(fileRef);
};

/**
 * Store file attachment in announcement
 */
export const storeAnnouncementAttachment = async (classId, announcementId, file) => {
  try {
    const compressedFile = await compressAndStoreFile(file, classId);
    const announcementRef = doc(db, 'classes', classId, 'announcements', announcementId);
    
    // Create clean attachment object - avoid nested complex types
    const attachmentData = {
      name: String(compressedFile.name),
      type: String(compressedFile.type),
      size: Number(compressedFile.size),
      url: String(compressedFile.url),
      storagePath: String(compressedFile.storagePath),
    };
    
    await updateDoc(announcementRef, {
      attachments: arrayUnion(attachmentData),
      updatedAt: serverTimestamp()
    });
    
    return compressedFile;
  } catch (error) {
    console.error('Error storing attachment:', error);
    throw error;
  }
}

/**
 * Add a comment to an announcement
 */
export const addCommentToAnnouncement = async (classId, announcementId, { author, authorId, message }) => {
  try {
    const commentsRef = collection(db, 'classes', classId, 'announcements', announcementId, 'comments');
    
    const comment = {
      author,
      authorId,
      message,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(commentsRef, comment);
    return { id: docRef.id, ...comment };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get all comments for an announcement
 */
export const getAnnouncementComments = async (classId, announcementId) => {
  try {
    const commentsRef = collection(db, 'classes', classId, 'announcements', announcementId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      };
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

/**
 * Delete a comment from an announcement
 */
export const deleteComment = async (classId, announcementId, commentId) => {
  try {
    const commentRef = doc(db, 'classes', classId, 'announcements', announcementId, 'comments', commentId);
    await deleteDoc(commentRef);
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const updateComment = async (classId, announcementId, commentId, message) => {
  const normalizedMessage = String(message || '').trim();
  if (!normalizedMessage) throw new Error('Comment cannot be empty.');
  const commentRef = doc(db, 'classes', classId, 'announcements', announcementId, 'comments', commentId);
  await updateDoc(commentRef, {
    message: normalizedMessage,
    updatedAt: serverTimestamp(),
  });
  return true;
};

/**
 * Download file from base64 compressed data
 */
export const downloadAttachment = (attachment) => {
  try {
    if (!attachment) {
      throw new Error('No attachment provided');
    }
    
    if (!attachment.base64) {
      const fileUrl = attachment.fileUrl || attachment.url;
      if (!fileUrl) throw new Error('Attachment URL is unavailable');
      const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (opened) opened.opener = null;
      return;
    }
    
    // Create blob from base64
    try {
      const binaryString = atob(attachment.base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: attachment.type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name || 'download';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (decodeErr) {
      throw new Error(`Failed to decode file: ${decodeErr.message}`);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time comments
 */
export const subscribeToComments = (classId, announcementId, callback) => {
  try {
    const commentsRef = collection(db, 'classes', classId, 'announcements', announcementId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const comments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          };
        });
        callback(comments);
      },
      (error) => {
        console.error('Error in comments subscription:', error);
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to comments:', error);
    throw error;
  }
};

/**
 * Create a module for a class
 */
export const createModule = async (classId, { title, description, order = 1 }) => {
  try {
    const modulesRef = collection(db, 'classes', classId, 'modules');
    
    const module = {
      title,
      description,
      order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(modulesRef, module);
    return { id: docRef.id, ...module };
  } catch (error) {
    console.error('Error creating module:', error);
    throw error;
  }
};

/**
 * Get all modules for a class
 */
export const getModules = async (classId) => {
  try {
    const modulesRef = collection(db, 'classes', classId, 'modules');
    const q = query(modulesRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching modules:', error);
    throw error;
  }
};

// ==================== CLASS MATERIALS ====================

/**
 * Upload material to a class module
 */
export const uploadMaterial = async (classId, { moduleId, title, fileUrl, fileType, fileSize, author, authorId, base64 = null }) => {
  try {
    const materialsRef = collection(db, 'classes', classId, 'modules', moduleId, 'materials');
    
    const material = {
      title,
      fileUrl,
      fileType,
      fileSize,
      author,
      authorId,
      base64: base64, // Store compressed file data if provided
      uploadedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(materialsRef, material);
    return { id: docRef.id, ...material };
  } catch (error) {
    console.error('Error uploading material:', error);
    throw error;
  }
};

/**
 * Get materials for a module
 */
export const getModuleMaterials = async (classId, moduleId) => {
  try {
    const materialsRef = collection(db, 'classes', classId, 'modules', moduleId, 'materials');
    const q = query(materialsRef, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching materials:', error);
    throw error;
  }
};

/**
 * Create a material (draft) for a class - visible to trainer only
 */
export const createMaterial = async (classId, { title, description, author, authorId, attachments = [], filesBase64 = [], link = '', topicId = null }) => {
  try {
    const materialsRef = collection(db, 'classes', classId, 'materials');

    const material = {
      title,
      description,
      author,
      authorId,
      attachments: Array.isArray(attachments) ? attachments : [],
      filesBase64: Array.isArray(filesBase64) ? filesBase64 : [],
      // Optional external link — a material can be just a link with no file.
      link: (link || '').trim(),
      topicId: topicId || null,
      isPublished: false, // Draft by default
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(materialsRef, material);
    return { id: docRef.id, ...material };
  } catch (error) {
    console.error('Error creating material:', error);
    throw error;
  }
};

/**
 * Get all materials for a class
 */
export const getClassMaterials = async (classId) => {
  try {
    const materialsRef = collection(db, 'classes', classId, 'materials');
    const q = query(materialsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching class materials:', error);
    throw error;
  }
};

/**
 * Real-time subscription to class materials
 */
export const subscribeToClassMaterials = (classId, callback) => {
  try {
    // Safety check for null/undefined classId
    if (!classId) {
      console.warn('⚠️ subscribeToClassMaterials called with null/undefined classId');
      callback([]);
      return () => {}; // Return no-op unsubscribe
    }
    
    const materialsRef = collection(db, 'classes', classId, 'materials');
    const q = query(materialsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materials = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      }));
      callback(materials);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to class materials:', error);
    throw error;
  }
};

/**
 * Publish a material (make visible to students)
 */
export const publishMaterial = async (classId, materialId) => {
  try {
    const materialRef = doc(db, 'classes', classId, 'materials', materialId);
    
    await updateDoc(materialRef, {
      isPublished: true,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { id: materialId, isPublished: true };
  } catch (error) {
    console.error('Error publishing material:', error);
    throw error;
  }
};

export const unpublishMaterial = async (classId, materialId) => {
  try {
    const materialRef = doc(db, 'classes', classId, 'materials', materialId);
    
    await updateDoc(materialRef, {
      isPublished: false,
      updatedAt: serverTimestamp(),
    });
    
    return { id: materialId, isPublished: false };
  } catch (error) {
    console.error('Error unpublishing material:', error);
    throw error;
  }
};

/**
 * Update a material
 */
export const updateMaterial = async (classId, materialId, { title, description, attachments = [], filesBase64 = [], link = '' }) => {
  try {
    const materialRef = doc(db, 'classes', classId, 'materials', materialId);

    await updateDoc(materialRef, {
      title,
      description,
      attachments: Array.isArray(attachments) ? attachments : [],
      filesBase64: Array.isArray(filesBase64) ? filesBase64 : [],
      link: (link || '').trim(),
      updatedAt: serverTimestamp(),
    });

    return { id: materialId, title, description, attachments, filesBase64, link: (link || '').trim() };
  } catch (error) {
    console.error('Error updating material:', error);
    throw error;
  }
};

/**
 * Delete a material
 */
export const deleteMaterial = async (classId, materialId) => {
  try {
    const materialRef = doc(db, 'classes', classId, 'materials', materialId);
    await deleteDoc(materialRef);
    
    return { id: materialId };
  } catch (error) {
    console.error('Error deleting material:', error);
    throw error;
  }
};

// ==================== CLASS TOPICS (Sections) ====================

/**
 * Create a topic/section for organizing materials
 */
export const createTopic = async (classId, { title, description, author, authorId }) => {
  try {
    const topicsRef = collection(db, 'classes', classId, 'topics');
    
    const topic = {
      title,
      description,
      author,
      authorId,
      isPublished: false, // Draft by default
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(topicsRef, topic);
    return { id: docRef.id, ...topic };
  } catch (error) {
    console.error('Error creating topic:', error);
    throw error;
  }
};

/**
 * Get all topics for a class
 */
export const getClassTopics = async (classId) => {
  try {
    const topicsRef = collection(db, 'classes', classId, 'topics');
    const q = query(topicsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching class topics:', error);
    throw error;
  }
};

/**
 * Real-time subscription to class topics
 */
export const subscribeToClassTopics = (classId, callback) => {
  try {
    // Safety check for null/undefined classId
    if (!classId) {
      console.warn('⚠️ subscribeToClassTopics called with null/undefined classId');
      callback([]);
      return () => {}; // Return no-op unsubscribe
    }
    
    const topicsRef = collection(db, 'classes', classId, 'topics');
    // Sort locally so legacy topics without an `order` field are not excluded
    // by Firestore's orderBy query.
    const q = query(topicsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      }));
      topics.sort((a, b) => {
        const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
        const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0);
      });
      callback(topics);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to class topics:', error);
    throw error;
  }
};

/**
 * Update a topic
 */
export const updateTopic = async (classId, topicId, { title, description }) => {
  try {
    const topicRef = doc(db, 'classes', classId, 'topics', topicId);

    await updateDoc(topicRef, {
      title,
      description,
      updatedAt: serverTimestamp(),
    });

    return { id: topicId, title, description };
  } catch (error) {
    console.error('Error updating topic:', error);
    throw error;
  }
};

/**
 * Persist a new topic order (drag-to-reorder). `orderedIds` is the full list of
 * topic ids in their new order; each topic's `order` field is set to its index.
 */
export const reorderTopics = async (classId, orderedIds = []) => {
  try {
    if (!classId || !Array.isArray(orderedIds) || orderedIds.length === 0) return true;
    const batch = writeBatch(db);
    orderedIds.forEach((topicId, index) => {
      batch.update(doc(db, 'classes', classId, 'topics', topicId), { order: index, updatedAt: serverTimestamp() });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error reordering topics:', error);
    throw error;
  }
};

// Map a module item kind to its Firestore subcollection.
const MODULE_ITEM_COLLECTIONS = {
  material: 'materials',
  assessment: 'assessments',
  assignment: 'assignments', // tasks (Submission) and quiz-assignments live here
};

/**
 * Move a material / assessment / task into a topic (or out to "unassigned" when
 * topicId is null). Drives the drag-and-drop organiser in the Modules tab.
 */
export const setModuleItemTopic = async (classId, kind, itemId, topicId) => {
  try {
    const sub = MODULE_ITEM_COLLECTIONS[kind];
    if (!classId || !sub || !itemId) throw new Error('Invalid module item.');
    await updateDoc(doc(db, 'classes', classId, sub, itemId), {
      topicId: topicId || null,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error moving module item:', error);
    throw error;
  }
};

/**
 * Publish a topic (make visible to students)
 */
export const publishTopic = async (classId, topicId) => {
  try {
    const topicRef = doc(db, 'classes', classId, 'topics', topicId);
    
    await updateDoc(topicRef, {
      isPublished: true,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return { id: topicId, isPublished: true };
  } catch (error) {
    console.error('Error publishing topic:', error);
    throw error;
  }
};

/**
 * Unpublish a topic
 */
export const unpublishTopic = async (classId, topicId) => {
  try {
    const topicRef = doc(db, 'classes', classId, 'topics', topicId);
    
    await updateDoc(topicRef, {
      isPublished: false,
      updatedAt: serverTimestamp(),
    });
    
    return { id: topicId, isPublished: false };
  } catch (error) {
    console.error('Error unpublishing topic:', error);
    throw error;
  }
};

/**
 * Delete a topic
 */
export const deleteTopic = async (classId, topicId) => {
  try {
    const topicRef = doc(db, 'classes', classId, 'topics', topicId);
    await deleteDoc(topicRef);
    
    return { id: topicId };
  } catch (error) {
    console.error('Error deleting topic:', error);
    throw error;
  }
};

// ==================== CLASS ASSESSMENTS/QUIZZES ====================

/**
 * Create an assessment/quiz for a class (Google Forms style)
 * Supports multiple question types: multiple-choice, checkbox, short-answer, paragraph
 */
export const createAssessment = async (classId, {
  title,
  description,
  author,
  authorId,
  createdByAvatar = null,
  timeLimit = 0,
  totalPoints = 100,
  shuffleQuestions = false,
  showScores = true,
  showCorrectAnswers = true,
  settings = {},
  questions = [],
  availableDate = null,
  dueDate = null,
  status = 'active',
  topicId = null,
  passingScore = 60,
}) => {
  try {
    // Validate required fields
    if (!title || !title.trim()) {
      throw new Error('Assessment title is required');
    }
    
    if (status !== 'draft' && (!questions || questions.length === 0)) {
      throw new Error('Assessment must have at least one question');
    }

    if (!author) {
      throw new Error('Author information is required');
    }

    const assessmentsRef = collection(db, 'classes', classId, 'assessments');
    const assessmentRef = doc(assessmentsRef);
    const answerKeyRef = doc(assessmentRef, 'private', 'answerKey');
    const publicQuestions = questions.map(({ correctAnswer: _correctAnswer, ...question }) => question);
    const answerKey = questions.reduce((result, question) => {
      if (question?.id) result[question.id] = question.correctAnswer ?? null;
      return result;
    }, {});
    
    const assessment = {
      title,
      description,
      author,
      authorId,
      createdByAvatar,
      timeLimit,
      totalPoints,
      shuffleQuestions,
      showScores,
      showCorrectAnswers,
      settings,
      questions: publicQuestions,
      passingScore: Math.min(100, Math.max(0, Number(passingScore) || 60)),
      topicId: topicId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status,
      availableDate,
      dueDate
    };

    const batch = writeBatch(db);
    batch.set(assessmentRef, assessment);
    batch.set(answerKeyRef, {
      answers: answerKey,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return { id: assessmentRef.id, ...assessment, questions };
  } catch (error) {
    console.error('❌ Error creating assessment:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    throw error;
  }
};

/**
 * Update an assessment
 */
export const updateAssessment = async (classId, assessmentId, updates) => {
  try {
    const assessmentRef = doc(db, 'classes', classId, 'assessments', assessmentId);
    const nextUpdates = { ...updates };
    const batch = writeBatch(db);

    if (Array.isArray(nextUpdates.questions)) {
      const answerKey = nextUpdates.questions.reduce((result, question) => {
        if (question?.id) result[question.id] = question.correctAnswer ?? null;
        return result;
      }, {});
      nextUpdates.questions = nextUpdates.questions.map(
        ({ correctAnswer: _correctAnswer, ...question }) => question
      );
      batch.set(
        doc(assessmentRef, 'private', 'answerKey'),
        { answers: answerKey, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }

    if (nextUpdates.passingScore !== undefined) {
      nextUpdates.passingScore = Math.min(
        100,
        Math.max(0, Number(nextUpdates.passingScore) || 60)
      );
    }

    batch.update(assessmentRef, {
      ...nextUpdates,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    
    return { id: assessmentId, ...updates };
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
};

/**
 * Delete an assessment
 */
export const deleteAssessment = async (classId, assessmentId) => {
  try {
    const deleteSecurely = httpsCallable(functions, 'deleteAssessmentSecure');
    await deleteSecurely({ classId, assessmentId });
    return true;
  } catch (error) {
    console.error('Error deleting assessment:', error);
    throw error;
  }
};

export const migrateAssessmentAnswerKeys = async () => {
  const migrate = httpsCallable(functions, 'migrateAssessmentAnswerKeys');
  const result = await migrate({});
  return result.data || { migrated: 0 };
};

export const migrateClassDirectory = async () => {
  const migrate = httpsCallable(functions, 'migrateClassDirectory');
  const result = await migrate({});
  return result.data || { synchronized: 0 };
};

/**
 * Create an assignment (Material/Assignment for a class)
 */
export const createAssignment = async (classId, {
  title,
  description,
  type = 'Assignment',
  author,
  authorId,
  createdByAvatar = null,
  availableDate = null,
  dueDate = null,
  points = 100,
  questions = [],
  status = 'active',
  allowedUploadTypes = [],
  topicId = null
}) => {
  try {
    const hasPublishableQuestion = Array.isArray(questions)
      && questions.some((q) => (q?.question || '').trim().length > 0);

    // Validate required fields
    if (!title || !title.trim()) {
      throw new Error('Assignment title is required');
    }

    // Submission-type assignments collect uploaded work, not questions.
    if (status !== 'draft' && type !== 'Submission' && !hasPublishableQuestion) {
      throw new Error('Assignment must have at least one non-empty question before publishing');
    }

    if (!author) {
      throw new Error('Author information is required');
    }

    const assignmentsRef = collection(db, 'classes', classId, 'assignments');
    
    const assignment = {
      title,
      description,
      type, // 'Assignment', 'Material', 'Quiz Assignment'
      author,
      authorId,
      createdByAvatar,
      availableDate,
      dueDate,
      points,
      questions,
      // For Submission tasks: which upload kinds the trainee may hand in.
      // Empty = no restriction (legacy behaviour: text + any file).
      allowedUploadTypes: Array.isArray(allowedUploadTypes) ? allowedUploadTypes : [],
      topicId: topicId || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status
    };

    const docRef = await addDoc(assignmentsRef, assignment);
    return { id: docRef.id, ...assignment };
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

/**
 * Get all assignments for a class
 */
export const getAssignments = async (classId) => {
  try {
    const assignmentsRef = collection(db, 'classes', classId, 'assignments');
    const q = query(assignmentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      dueDate: doc.data().dueDate ? (typeof doc.data().dueDate === 'string' ? new Date(doc.data().dueDate) : doc.data().dueDate?.toDate?.()) : null
    }));
  } catch (error) {
    console.error('Error getting assignments:', error);
    throw error;
  }
};

/**
 * Delete an assignment (task / quiz-assignment).
 */
export const deleteAssignment = async (classId, assignmentId) => {
  try {
    await deleteDoc(doc(db, 'classes', classId, 'assignments', assignmentId));
    return true;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};

/**
 * Update an assignment
 */
export const updateAssignment = async (classId, assignmentId, updates) => {
  try {
    const assignmentRef = doc(db, 'classes', classId, 'assignments', assignmentId);
    if (updates?.status === 'active') {
      const existingSnapshot = await getDoc(assignmentRef);
      if (!existingSnapshot.exists()) throw new Error('Assignment not found.');
      const existing = existingSnapshot.data() || {};
      const effectiveType = updates.type ?? existing.type;
      const effectiveQuestions = Array.isArray(updates.questions)
        ? updates.questions
        : (Array.isArray(existing.questions) ? existing.questions : []);
      const hasPublishableQuestion = effectiveQuestions.some(
        (question) => String(question?.question || '').trim().length > 0
      );
      if (effectiveType !== 'Submission' && !hasPublishableQuestion) {
        throw new Error('Assignment must have at least one non-empty question before publishing');
      }
    }

    await updateDoc(assignmentRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { id: assignmentId, ...updates };
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

// ==================== ASSIGNMENT SUBMISSIONS ====================
// Submission-type assignments let students upload deliverable work.
// Doc id = studentId → one submission per student, and lets security rules
// look it up deterministically.

/**
 * Trainee creates/updates their submission for a submission-type assignment.
 */
export const submitAssignment = async (
  classId,
  assignmentId,
  { studentId, studentName = '', text = '', link = '', files = [] }
) => {
  try {
    if (!classId || !assignmentId || !studentId) {
      throw new Error('Missing class, assignment, or student id');
    }
    const assignmentRef = doc(db, 'classes', classId, 'assignments', assignmentId);
    const assignmentSnapshot = await getDoc(assignmentRef);
    if (!assignmentSnapshot.exists()) throw new Error('This submission task no longer exists.');
    const assignment = assignmentSnapshot.data() || {};
    if (String(assignment.status || 'draft').toLowerCase() === 'draft') {
      throw new Error('This submission task is not published.');
    }
    if (assignment.acceptResponses === false) {
      throw new Error('This submission task is no longer accepting responses.');
    }
    const dueAt = assignment.dueDate ? toDate(assignment.dueDate) : null;
    if (
      dueAt
      && Number.isFinite(dueAt.getTime())
      && Date.now() > dueAt.getTime()
      && assignment.allowLateSubmissions !== true
    ) {
      throw new Error('The submission deadline has passed and late work is not allowed.');
    }

    const attachments = [];
    for (const file of files) {
      const uploaded = await compressAndStoreFile(file, classId);
      attachments.push({
        name: uploaded.name,
        type: uploaded.type,
        size: uploaded.size,
        url: uploaded.url,
        storagePath: uploaded.storagePath,
      });
    }

    const submissionRef = doc(
      db,
      'classes',
      classId,
      'assignments',
      assignmentId,
      'submissions',
      studentId
    );
    const existing = await getDoc(submissionRef);

    // Fields a student is allowed to write (never grade/feedback).
    const payload = {
      studentId,
      studentName,
      text,
      link: (link || '').trim(),
      attachments,
      filesBase64: [],
      status: 'submitted',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (existing.exists()) {
      await updateDoc(submissionRef, payload);
    } else {
      await setDoc(submissionRef, { ...payload, createdAt: serverTimestamp() });
    }

    return { id: studentId, ...payload };
  } catch (error) {
    console.error('Error submitting assignment:', error);
    throw error;
  }
};

/**
 * Get the signed-in student's own submission (or null).
 */
export const getMySubmission = async (classId, assignmentId, studentId) => {
  try {
    const submissionRef = doc(
      db,
      'classes',
      classId,
      'assignments',
      assignmentId,
      'submissions',
      studentId
    );
    const snap = await getDoc(submissionRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching submission:', error);
    return null;
  }
};

/**
 * Live subscription to the student's own submission (status/grade updates).
 */
export const subscribeToMySubmission = (classId, assignmentId, studentId, callback) => {
  const submissionRef = doc(
    db,
    'classes',
    classId,
    'assignments',
    assignmentId,
    'submissions',
    studentId
  );
  return onSnapshot(
    submissionRef,
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => {
      console.error('Error subscribing to submission:', error);
      callback(null);
    }
  );
};

/**
 * Trainor view: all submissions for one assignment.
 */
export const getAssignmentSubmissions = async (classId, assignmentId) => {
  try {
    const submissionsRef = collection(
      db,
      'classes',
      classId,
      'assignments',
      assignmentId,
      'submissions'
    );
    const snapshot = await getDocs(submissionsRef);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (error) {
    console.error('Error fetching assignment submissions:', error);
    return [];
  }
};

/**
 * Trainor grades a submission and notifies the student.
 */
export const gradeSubmission = async (
  classId,
  assignmentId,
  studentId,
  { grade, feedback = '', gradedBy = '', assignmentTitle = '' }
) => {
  try {
    const submissionRef = doc(
      db,
      'classes',
      classId,
      'assignments',
      assignmentId,
      'submissions',
      studentId
    );

    const numericGrade =
      grade === '' || grade === null || grade === undefined ? null : Number(grade);

    await updateDoc(submissionRef, {
      grade: numericGrade,
      feedback,
      gradedBy,
      gradedAt: serverTimestamp(),
      status: 'graded',
      updatedAt: serverTimestamp(),
    });

    // Notify the student their work was graded (trainer→student is allowed).
    createNotification({
      toUid: studentId,
      type: 'grade_posted',
      text: `Your submission${assignmentTitle ? ` for "${assignmentTitle}"` : ''} has been graded${
        numericGrade !== null ? `: ${numericGrade}` : ''
      }.`,
      fromUid: gradedBy,
    }).catch(() => {});

    return true;
  } catch (error) {
    console.error('Error grading submission:', error);
    throw error;
  }
};

/**
 * Get all assessments for a class
 */
export const getAssessments = async (classId) => {
  try {
    const assessmentsRef = collection(db, 'classes', classId, 'assessments');
    const q = query(assessmentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return Promise.all(snapshot.docs.map(async (assessmentDoc) => {
      const data = assessmentDoc.data();
      let questions = Array.isArray(data.questions) ? data.questions : [];
      try {
        const answerKeyRef = doc(
          db,
          'classes',
          classId,
          'assessments',
          assessmentDoc.id,
          'private',
          'answerKey'
        );
        const keySnapshot = await getDoc(answerKeyRef);
        const legacyAnswers = questions.reduce((answers, question) => {
          if (
            question?.id
            && Object.prototype.hasOwnProperty.call(question, 'correctAnswer')
          ) {
            answers[question.id] = question.correctAnswer;
          }
          return answers;
        }, {});
        const privateAnswers = keySnapshot.exists()
          ? keySnapshot.data()?.answers || {}
          : legacyAnswers;

        if (!keySnapshot.exists() && Object.keys(legacyAnswers).length > 0) {
          const batch = writeBatch(db);
          batch.set(answerKeyRef, {
            answers: legacyAnswers,
            migratedAt: serverTimestamp(),
          });
          batch.update(assessmentDoc.ref, {
            questions: questions.map(({ correctAnswer: _answer, ...question }) => question),
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
        }

        questions = questions.map((question) => ({
          ...question,
          correctAnswer: Object.prototype.hasOwnProperty.call(privateAnswers, question.id)
            ? privateAnswers[question.id]
            : question.correctAnswer,
        }));
      } catch {
        // Trainees cannot read the private answer key. Their public question
        // payload remains answer-free; trainers/admins receive it for editing.
        questions = questions.map(({ correctAnswer: _answer, ...question }) => question);
      }
      return {
        id: assessmentDoc.id,
        ...data,
        questions,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      };
    }));
  } catch (error) {
    console.error('Error fetching assessments:', error);
    throw error;
  }
};

/**
 * Get single assessment with all details
 */
export const getAssessmentById = async (classId, assessmentId) => {
  try {
    const assessmentRef = doc(db, 'classes', classId, 'assessments', assessmentId);
    const docSnapshot = await getDoc(assessmentRef);
    
    if (!docSnapshot.exists()) {
      throw new Error('Assessment not found');
    }
    
    const data = docSnapshot.data();
    let questions = Array.isArray(data.questions) ? data.questions : [];
    if (templateMode !== 'template') try {
      const keySnapshot = await getDoc(
        doc(assessmentRef, 'private', 'answerKey')
      );
      const answers = keySnapshot.exists() ? keySnapshot.data()?.answers || {} : {};
      questions = questions.map((question) => ({
        ...question,
        correctAnswer: answers[question.id],
      }));
    } catch {
      questions = questions.map(({ correctAnswer: _answer, ...question }) => question);
    }
    return {
      id: docSnapshot.id,
      ...data,
      questions,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    };
  } catch (error) {
    console.error('Error fetching assessment:', error);
    throw error;
  }
};

/**
 * Get assessments from attempts subcollections (workaround for missing parent documents)
 */
export const getAssessmentsFromAttempts = async (classId) => {
  try {
    const assessmentsRef = collection(db, 'classes', classId, 'assessments');
    
    // Get all subcollections (attempts)
    const snapshot = await getDocs(assessmentsRef);
    
    // If no documents, try to get from subcollections directly
    if (snapshot.docs.length === 0) {
      console.warn('⚠️ No assessment documents found, trying to get from attempts subcollections');
      
      // This is a workaround - get the class document first
      const classRef = doc(db, 'classes', classId);
      const classSnap = await getDoc(classRef);
      
      if (!classSnap.exists()) {
        console.error('Class not found');
        return [];
      }
      
      // Try to list subcollections (this requires enhanced admin SDK, not available in client SDK)
      // As a workaround, we'll check if there are any documents by looking at the attempts collection
      const attemptIds = new Set();
      
      // Get all assessment IDs by checking subcollections
      // Note: Firestore client SDK doesn't support listing subcollections directly
      // This needs to be handled differently
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
    }));
  } catch (error) {
    console.error('Error getting assessments from attempts:', error);
    return [];
  }
};

/**
 * Real-time subscription to assessments
 */
export const subscribeToAssessments = (classId, callback) => {
  try {
    // Safety check for null/undefined classId
    if (!classId) {
      console.warn('⚠️ subscribeToAssessments called with null/undefined classId');
      callback([]);
      return () => {}; // Return no-op unsubscribe
    }
    
    const assessmentsRef = collection(db, 'classes', classId, 'assessments');
    // Query without orderBy first to avoid issues with missing fields
    const q = query(assessmentsRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assessments = snapshot.docs.map((doc) => {
        try {
          const data = doc.data() || {};
          
          // Safe date parsing with proper null checks
          const parseDate = (dateValue) => {
            if (!dateValue) return new Date();
            if (dateValue instanceof Date) return dateValue;
            if (typeof dateValue === 'object' && dateValue.toDate) return dateValue.toDate();
            if (typeof dateValue === 'string') return new Date(dateValue);
            return new Date();
          };
          
          const formatted = {
            id: doc.id,
            ...data,
            title: data.title || 'Untitled Assessment',
            description: data.description || '',
            createdAt: parseDate(data.createdAt),
            updatedAt: parseDate(data.updatedAt),
            dueDate: data.dueDate ? parseDate(data.dueDate) : null,
            questions: Array.isArray(data.questions) ? data.questions : [],
            totalPoints: data.totalPoints || data.points || 0,
            duration: data.duration || 0,
            type: data.type || 'assessment',
            status: data.status || 'active'
          };
          return formatted;
        } catch (docError) {
          console.error('❌ Error processing assessment document:', docError);
          return null;
        }
      }).filter((assessment) => assessment !== null && assessment.status !== 'draft');
      
      callback(assessments);
    }, (error) => {
      console.error('🚨 Firestore error in subscribeToAssessments:', error?.code, error?.message);
      console.error('📍 ClassId:', classId);
      // If there's an error (like permission denied), return empty array
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error in subscribeToAssessments:', error);
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }
};

/**
 * Real-time subscription to assignments
 */
export const subscribeToAssignments = (classId, callback) => {
  try {
    // Safety check for null/undefined classId
    if (!classId) {
      console.warn('⚠️ subscribeToAssignments called with null/undefined classId');
      callback([]);
      return () => {}; // Return no-op unsubscribe
    }
    
    const assignmentsRef = collection(db, 'classes', classId, 'assignments');
    const q = query(assignmentsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assignments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          dueDate: data.dueDate ? (typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate?.toDate?.()) : null
        };
      }).filter((assignment) => assignment.status !== 'draft');
      callback(assignments);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to assignments:', error);
    throw error;
  }
};

/**
 * Real-time subscription to course enrollments
 */
export const subscribeToEnrollments = (classId, callback) => {
  try {
    const enrollmentsRef = collection(db, 'enrollments');
    // NOTE: do NOT orderBy('joinedAt') here. Pending join-requests only have
    // `requestedAt` (joinedAt is set on approval), and Firestore's orderBy
    // silently drops documents missing that field — which hid pending requests
    // from the trainer's roster so they could never be approved. Query by
    // classId only and sort in-memory instead.
    const q = query(enrollmentsRef, where('classId', '==', classId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const enrollments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          enrolledAt: data.joinedAt?.toDate?.() || (data.joinedAt ? new Date(data.joinedAt) : null),
        };
      });
      // Newest first, tolerating pending rows that only have requestedAt.
      enrollments.sort((a, b) => {
        const da = new Date(a.joinedAt || a.requestedAt || 0).getTime();
        const dbb = new Date(b.joinedAt || b.requestedAt || 0).getTime();
        return dbb - da;
      });
      callback(enrollments);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to enrollments:', error);
    throw error;
  }
};

/**
 * Submit a quiz attempt
 */
export const submitQuizAttempt = async (
  classId,
  assessmentId,
  studentId,
  { answers, timeTaken = 0 }
) => {
  try {
    if (!functions || !auth?.currentUser || auth.currentUser.uid !== studentId) {
      throw new Error('A signed-in trainee is required to submit an assessment.');
    }
    const gradeAssessment = httpsCallable(functions, 'submitAssessmentAttempt');
    const result = await gradeAssessment({
      classId,
      assessmentId,
      answers: answers || {},
      timeTaken: Math.max(0, Number(timeTaken) || 0),
    });
    return result.data;
  } catch (error) {
    console.error('Error submitting quiz attempt:', error);
    throw error;
  }
};

/**
 * Get a student's quiz attempts
 */
export const getStudentQuizAttempts = async (classId, assessmentId, studentId) => {
  try {
    const attemptsRef = collection(db, 'classes', classId, 'assessments', assessmentId, 'attempts');
    // Sort in memory: combining studentId equality with submittedAt ordering
    // otherwise requires a composite index and made successful submissions
    // appear to fail while refreshing their attempt history.
    const q = query(attemptsRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    
    const attempts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    attempts.sort((a, b) => {
      const aTime = toDate(a.submittedAt)?.getTime?.() || 0;
      const bTime = toDate(b.submittedAt)?.getTime?.() || 0;
      return bTime - aTime;
    });
    return attempts;
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    throw error;
  }
};

/**
 * Check if a student has already attempted an assessment
 */
export const hasStudentAttempted = async (classId, assessmentId, studentId) => {
  try {
    const attempts = await getStudentQuizAttempts(classId, assessmentId, studentId);
    return attempts && attempts.length > 0;
  } catch (error) {
    console.error('Error checking student attempts:', error);
    return false;
  }
};

/**
 * Get all attempts for an assessment (trainer view - to see responses)
 */
export const getAssessmentAttempts = async (classId, assessmentId) => {
  try {
    const attemptsRef = collection(db, 'classes', classId, 'assessments', assessmentId, 'attempts');
    const q = query(attemptsRef, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    // Fetch attempts and enrich with student names
    const attempts = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let studentName = null;
      
      
      // Try to fetch student profile
      if (data.studentId) {
        try {
          const profile = await getUserProfile(data.studentId);
          
          if (profile) {
            // Try multiple possible name field locations
            const firstName = profile.firstName || profile.profileForm?.firstName || '';
            const lastName = profile.lastName || profile.profileForm?.lastName || '';
            const displayName = profile.displayName || profile.profileForm?.displayName;
            
            if (displayName) {
              studentName = displayName;
            } else if (firstName || lastName) {
              studentName = `${firstName} ${lastName}`.trim();
            }
          }
        } catch (error) {
          console.error(`❌ Could not fetch profile for student ${data.studentId}:`, error);
        }
      }
      
      return {
        id: doc.id,
        ...data,
        studentName: studentName || null,
        submittedAt: data.submittedAt?.toDate?.() || new Date(data.submittedAt),
      };
    }));
    
    return attempts;
  } catch (error) {
    console.error('Error fetching assessment attempts:', error);
    throw error;
  }
};

// ==================== GRADEBOOK ====================

/**
 * Build a class gradebook: every enrolled student scored across all quizzes
 * (best attempt) and submission-type assignments (graded value). Computed
 * client-side from existing data — no new storage.
 *
 * Note: quiz scores are percentages and submission grades are raw points;
 * the "average" column is a simple mean and is a rough indicator, not a
 * weighted final grade.
 */
export const getClassGradebook = async (classId) => {
  try {
    const [enrollments, assessments, assignments] = await Promise.all([
      getCourseEnrollments(classId),
      getAssessments(classId),
      getAssignments(classId),
    ]);

    const submissionAssignments = assignments.filter((a) => a.type === 'Submission');

    // Best quiz score per student, per assessment.
    const assessmentScores = {};
    await Promise.all(
      assessments.map(async (a) => {
        const attempts = await getAssessmentAttempts(classId, a.id).catch(() => []);
        const byStudent = {};
        attempts.forEach((at) => {
          const sid = at.studentId;
          const score = Number(at.score) || 0;
          if (byStudent[sid] === undefined || score > byStudent[sid]) {
            byStudent[sid] = score;
          }
        });
        assessmentScores[a.id] = byStudent;
      })
    );

    // Graded value per student, per submission assignment.
    const submissionGrades = {};
    await Promise.all(
      submissionAssignments.map(async (a) => {
        const subs = await getAssignmentSubmissions(classId, a.id).catch(() => []);
        const byStudent = {};
        subs.forEach((s) => {
          byStudent[s.studentId] =
            s.grade === null || s.grade === undefined ? null : Number(s.grade);
        });
        submissionGrades[a.id] = byStudent;
      })
    );

    // Resolve student display names (small class sizes).
    const nameByStudent = {};
    await Promise.all(
      enrollments.map(async (e) => {
        if (e.studentName) {
          nameByStudent[e.studentId] = e.studentName;
          return;
        }
        const profile = await getUserProfile(e.studentId).catch(() => null);
        nameByStudent[e.studentId] =
          profile?.name || profile?.displayName || profile?.email || e.studentId;
      })
    );

    const columns = [
      ...assessments.map((a) => ({
        id: a.id,
        title: a.title || 'Quiz',
        kind: 'assessment',
        points: a.totalPoints || a.points || 100,
      })),
      ...submissionAssignments.map((a) => ({
        id: a.id,
        title: a.title || 'Assignment',
        kind: 'submission',
        points: a.points || 100,
      })),
    ];

    const rows = enrollments.map((e) => {
      const cells = columns.map((col) => {
        const raw =
          col.kind === 'assessment'
            ? assessmentScores[col.id]?.[e.studentId]
            : submissionGrades[col.id]?.[e.studentId];
        return { columnId: col.id, kind: col.kind, score: raw === undefined ? null : raw };
      });
      const graded = cells.filter((c) => c.score !== null && c.score !== undefined);
      const average = graded.length
        ? Math.round(graded.reduce((sum, c) => sum + c.score, 0) / graded.length)
        : null;
      return {
        studentId: e.studentId,
        studentName: nameByStudent[e.studentId] || e.studentId,
        cells,
        average,
      };
    });

    return { columns, rows };
  } catch (error) {
    console.error('Error building gradebook:', error);
    throw error;
  }
};

// ==================== STUDENT PROGRESS TRACKING ====================

/**
 * Update student progress for a class
 */
export const updateStudentProgress = async (studentId, classId, { modulesCompleted, progressPercentage }) => {
  try {
    const progressRef = doc(db, 'students', studentId, 'progress', classId);
    
    await setDoc(progressRef, {
      classId,
      modulesCompleted,
      progressPercentage,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating student progress:', error);
    throw error;
  }
};

/**
 * Get student progress for a class
 */
export const getStudentProgress = async (studentId, classId) => {
  try {
    const progressRef = doc(db, 'students', studentId, 'progress', classId);
    const snapshot = await getDoc(progressRef);
    
    if (!snapshot.exists()) {
      return { classId, modulesCompleted: 0, progressPercentage: 0 };
    }
    
    return { id: snapshot.id, ...snapshot.data() };
  } catch (error) {
    console.error('Error fetching student progress:', error);
    throw error;
  }
};

/**
 * Get quiz statistics for a student
 */
export const getQuizStatistics = async (studentId, classId, assessmentId) => {
  try {
    const attempts = await getStudentQuizAttempts(classId, assessmentId, studentId);
    
    if (attempts.length === 0) {
      return { attempts: 0, averageScore: 0, bestScore: 0, passed: false };
    }
    
    const scores = attempts.map((a) => a.score || 0);
    const averageScore = Math.round(scores.reduce((a, b) => a + b) / attempts.length);
    const bestScore = Math.max(...scores);
    const bestAttempt = attempts.reduce(
      (best, attempt) => Number(attempt.score || 0) > Number(best?.score || 0) ? attempt : best,
      attempts[0]
    );
    
    return {
      attempts: attempts.length,
      averageScore,
      bestScore,
      passed: Boolean(bestAttempt?.passed),
      passingScore: Number(bestAttempt?.passingScore || 60),
      attemptHistory: attempts,
    };
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    throw error;
  }
};

/**
 * One-time migration: Rename courseTemplateId to courseId in all class documents
 */
export const migrateClassesCoursTemplateIdToCourseId = async () => {
  try {
    const classesRef = collection(db, 'classes');
    const snapshot = await getDocs(classesRef);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const classDoc of snapshot.docs) {
      const data = classDoc.data();
      
      // If has courseTemplateId but not courseId, migrate it
      if (data.courseTemplateId && !data.courseId) {
        await updateDoc(doc(db, 'classes', classDoc.id), {
          courseId: data.courseTemplateId,
          courseTemplateId: deleteField()  // Delete the old field
        });
        
        migratedCount++;
      } else if (data.courseId && !data.courseTemplateId) {
        skippedCount++;
      } else if (data.courseTemplateId && data.courseId) {
        await updateDoc(doc(db, 'classes', classDoc.id), {
          courseTemplateId: deleteField()
        });
        migratedCount++;
      }
    }
    return { migratedCount, skippedCount };
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

export default {
  // User operations
  createUserProfile,
  adminUpdateUserAccount,
  getUserProfile,
  updateUserProfile,
  getUserPrivateProfile,
  saveUserPrivateProfile,
  initializeLmsExperience,
  getLmsExperience,
  updateLmsExperience,
  
  // Sectors
  getSectors,
  getSectorById,
  
  // Courses
  getCourses,
  getJoinableClasses,
  getCoursesTemplates,
  getCourseById,
  getCourseTemplateById,
  createCourseTemplate,
  promoteClassToTemplate,
  cloneTemplateToClass,
  createCourse,
  generateUniqueClassCode,
  updateCourseTemplate,
  updateCourse,
  deleteCourse,
  
  // Enrollments
  queryActiveEnrollment,
  getStudentEnrollments,
  subscribeToStudentEnrollments,
  getCourseEnrollments,
  getCourseEnrollmentsWithAvatars,
  createEnrollment,
  updateEnrollmentStatus,
  updateEnrollmentProgress,
  removeEnrollment,
  approveEnrollment,
  getStudents,
  getClassEnrollments,
  adminAddStudentToClass,
  ensureClassMembership,
  subscribeToPersonalCalendarEvents,
  createPersonalCalendarEvent,
  subscribeToClassPrefs,
  setClassPref,

  // Materials
  getCourseMaterials,
  getClassMaterials,
  subscribeToClassMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
  
  // Activity
  logActivity,
  getActivityLogsByDateRange,
  purgeActivityLogs,

  // Class Announcements
  createAnnouncement,
  getAnnouncements,
  subscribeToAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  storeAnnouncementAttachment,
  addCommentToAnnouncement,
  updateComment,
  getAnnouncementComments,
  deleteComment,
  subscribeToComments,
  downloadAttachment,
  
  // Class Activity Feed
  getClassActivityFeed,
  
  // File handling
  compressAndStoreFile,
  
  // Class Modules
  createModule,
  getModules,
  
  // Class Materials
  uploadMaterial,
  getModuleMaterials,
  createMaterial,
  getClassMaterials,
  publishMaterial,
  unpublishMaterial,
  updateMaterial,
  deleteMaterial,
  
  // Topics (Sections)
  createTopic,
  getClassTopics,
  subscribeToClassTopics,
  updateTopic,
  deleteTopic,
  publishTopic,
  unpublishTopic,
  
  // Assessments/Quizzes
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  migrateAssessmentAnswerKeys,
  migrateClassDirectory,
  submitQuizAttempt,
  getStudentQuizAttempts,
  
  // Progress Tracking
  updateStudentProgress,
  getStudentProgress,
  getQuizStatistics,
  getUserActivityLogs,
  
  // Helpers
  batchUpdateDocs,
  toDate,
  
  // Migrations
  migrateClassesCoursTemplateIdToCourseId,
};

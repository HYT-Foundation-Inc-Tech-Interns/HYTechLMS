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
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase';

// ==================== USER OPERATIONS ====================

/**
 * Create or update user profile on signup/registration
 * Called after Firebase Auth user creation
 */
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
    // Check if any classes exist in this sector
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('sectorId', '==', sectorId), limit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      throw new Error('Cannot delete sector with existing classes. Please delete classes first.');
    }
    
    const sectorRef = doc(db, 'sectors', sectorId);
    await deleteDoc(sectorRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting sector:', error);
    throw error;
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
    const q = query(classesRef, where('name', '==', courseName));
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length === 0) {
      return null;
    }
    
    const courseSnap = snapshot.docs[0];
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(coursesRef, newCourse);
    
    // Log activity
    await logActivity('admin', 'create_course', 'courses', docRef.id, {
      courseName: courseData.name,
      sectorId: sectorId,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating course template:', error);
    throw error;
  }
};

/**
 * Create a new class from course template (Trainer only) - saves to 'classes' collection
 */
export const createCourse = async (courseData, { sectorId = null, trainerId = null } = {}) => {
  try {
    const classesRef = collection(db, 'classes');
    
    const newCourse = {
      ...courseData,
      sectorId: sectorId || null,
      trainerId: trainerId || null,
      status: courseData.status || 'Active',
      currentEnrollments: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(classesRef, newCourse);
    
    // Log activity
    const actionBy = trainerId || 'admin';
    await logActivity(actionBy, 'create_class', 'classes', docRef.id, {
      className: courseData.name,
      sectorId: sectorId,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
};

/**
 * Update course template (Admin only) - updates 'courses' collection
 */
export const updateCourseTemplate = async (courseId, updates) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    
    await setDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating course template:', error);
    throw error;
  }
};

/**
 * Update class (Trainer or Admin) - updates 'classes' collection
 */
export const updateCourse = async (courseId, updates) => {
  try {
    const courseRef = doc(db, 'classes', courseId);
    
    await setDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
};

/**
 * Delete a course template (Admin)
 */
export const deleteCourse = async (courseId) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    await deleteDoc(courseRef);
    
    // Log activity
    await logActivity('admin', 'delete_course', 'courses', courseId, {
      courseId: courseId,
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

/**
 * Permanently delete a class (Trainer, from archived view)
 */
export const deleteClass = async (classId) => {
  try {
    await deleteDoc(doc(db, 'classes', classId));
    return true;
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
};

// ==================== COURSE APPLICATIONS ====================

/**
 * Student applies to a course
 * Checks: No active enrollment
 */
export const applyCourse = async (studentId, courseId) => {
  try {
    // First, check if student has active enrollment
    const activeEnrollment = await queryActiveEnrollment(studentId);
    if (activeEnrollment) {
      throw new Error(
        'You have an active enrollment. Complete or terminate it before applying to another course.'
      );
    }
    
    // Get course and trainer info
    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    
    if (!courseSnap.exists()) {
      throw new Error('Course not found');
    }
    
    const courseData = courseSnap.data();
    
    // Create application
    const applicationsRef = collection(db, 'courseApplications');
    const appDocRef = await addDoc(applicationsRef, {
      studentId,
      courseId,
      sectorId: courseData.sectorId,
      trainerId: courseData.trainerId,
      status: 'pending',
      appliedAt: serverTimestamp(),
    });
    
    // Log activity
    await logActivity(studentId, 'apply_course', 'courseApplications', appDocRef.id, {
      courseId,
      courseName: courseData.name,
    });
    
    return appDocRef.id;
  } catch (error) {
    console.error('Error applying to course:', error);
    throw error;
  }
};

/**
 * Get course applications (for trainer or student)
 */
export const getCourseApplications = async (filters = {}) => {
  try {
    const applicationsRef = collection(db, 'courseApplications');
    const constraints = [];
    
    if (filters.courseId) {
      constraints.push(where('courseId', '==', filters.courseId));
    }
    
    if (filters.studentId) {
      constraints.push(where('studentId', '==', filters.studentId));
    }
    
    if (filters.trainerId) {
      constraints.push(where('trainerId', '==', filters.trainerId));
    }
    
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    
    // Note: Only add orderBy if there are no filters to avoid requiring composite indexes
    if (constraints.length === 0) {
      constraints.push(orderBy('appliedAt', 'desc'));
    }
    
    const q = constraints.length > 0 ? query(applicationsRef, ...constraints) : query(applicationsRef);
    const snapshot = await getDocs(q);
    
    let applications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Sort in-memory if we filtered (orderBy wasn't added)
    if (constraints.length > 0 || filters.courseId || filters.studentId || filters.trainerId || filters.status) {
      applications.sort((a, b) => {
        const dateA = a.appliedAt?.toDate?.() || new Date(0);
        const dateB = b.appliedAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    }
    
    return applications;
  } catch (error) {
    console.error('Error fetching course applications:', error);
    throw error;
  }
};

/**
 * Trainer approves an application
 * This should trigger a Cloud Function to create enrollment atomically
 */
export const approveApplication = async (applicationId) => {
  try {
    const appRef = doc(db, 'courseApplications', applicationId);
    
    await updateDoc(appRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    });
    
    // Cloud Function will handle enrollment creation
    
    return true;
  } catch (error) {
    console.error('Error approving application:', error);
    throw error;
  }
};

/**
 * Trainer rejects an application
 */
export const rejectApplication = async (applicationId, reason = '') => {
  try {
    const appRef = doc(db, 'courseApplications', applicationId);
    
    await updateDoc(appRef, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting application:', error);
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
 * Join a class by class code (Student view)
 */
export const joinClassByCode = async (studentId, classCode) => {
  try {
    if (!classCode.trim()) {
      throw new Error('Class code is required');
    }

    // Find class by code
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('classCode', '==', classCode.trim().toUpperCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Invalid class code. Please check and try again.');
    }

    const classDoc = snapshot.docs[0];
    const classData = classDoc.data();
    const classId = classDoc.id;

    // Prevent joining when student is currently taking another class
    const enrollmentsRef = collection(db, 'enrollments');
    const activeEnrollmentQ = query(
      enrollmentsRef,
      where('studentId', '==', studentId),
      where('status', 'in', ['active', 'ongoing'])
    );
    const activeEnrollmentSnapshot = await getDocs(activeEnrollmentQ);

    if (!activeEnrollmentSnapshot.empty) {
      throw new Error('You are currently enrolled in an active class. Complete it first before joining a new class.');
    }

    // Check if student is already enrolled in this class
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
      throw new Error('You are already enrolled in this class.');
    }

    // Create enrollment
    const enrollmentData = {
      studentId,
      classId,
      className: classData.name || 'Unnamed Class',
      status: 'active',
      joinedAt: new Date().toISOString(),
      progress: {
        attendanceRate: 0,
        tasksCompleted: 0,
        totalTasks: 0
      }
    };

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

    const docRef = await addDoc(enrollmentsRef, enrollmentData);
    
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
 * Get enrollments for a course (Trainer view)
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
    const updates = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };
    
    if (newStatus === 'completed') {
      updates.completedAt = serverTimestamp();
    } else if (newStatus === 'terminated') {
      updates.terminatedAt = serverTimestamp();
      updates.terminationReason = reason;
    }
    
    await updateDoc(enrollmentRef, updates);
    
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
    await deleteDoc(enrollmentRef);
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
 * Upload course material (Trainer only)
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
 * Delete course material (Trainer only)
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

    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      toUid,
      type,
      text,
      fromUid,
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
    
    const announcement = {
      title,
      message,
      author,
      authorId,
      authorAvatar,
      attachments,
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
export const updateAnnouncement = async (classId, announcementId, { title, message, attachments = [] }) => {
  try {
    const announcementRef = doc(db, 'classes', classId, 'announcements', announcementId);
    
    await updateDoc(announcementRef, {
      title,
      message,
      attachments,
      updatedAt: serverTimestamp(),
    });
    
    return { id: announcementId, title, message, attachments };
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
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
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
        preview: data.message?.substring(0, 50) + '...' || 'Announcement',
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
 * Compress file to base64 for Firestore storage
 * Max 1MB per document, so we'll store references and metadata
 */
export const compressAndStoreFile = async (file) => {
  try {
    // Validate file exists
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Validate file name
    if (!file.name || file.name.trim() === '') {
      throw new Error('File name is invalid');
    }
    
    // CRITICAL: Firestore document size limit is 1MB per document
    // Base64 encoding increases size by ~33%, so we need to be conservative
    // Reserve space for other document fields, so limit attachment to ~300KB
    const MAX_FILE_SIZE = 300 * 1024; // 300KB (conservative)
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size: ${MAX_FILE_SIZE / 1024}KB`);
    }
    
    // Read file as Data URL
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async (e) => {
        try {
          // Get the base64 string (remove the data: prefix)
          let base64String = e.target.result;
          if (typeof base64String !== 'string') {
            throw new Error('File read result is not a string');
          }
          
          if (!base64String.includes(',')) {
            throw new Error('Invalid data URL format');
          }
          
          base64String = base64String.split(',')[1];
          
          // Validate base64 string was extracted
          if (!base64String || base64String.length === 0) {
            throw new Error('Failed to extract base64 content from file');
          }
          
          // Estimate final document size
          // Base64 string + JSON overhead ≈ base64 length + 500 bytes
          const estimatedDocSize = base64String.length + 1000; // bytes
          if (estimatedDocSize > 900 * 1024) { // 900KB safety margin
            throw new Error(`Document would be too large (est. ${(estimatedDocSize / 1024 / 1024).toFixed(2)}MB). Maximum: ~900KB`);
          }
          
          resolve({
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            base64: base64String
          });
        } catch (err) {
          reject(new Error(`Failed to process file: ${err.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name || 'unknown'}`));
      };
      
      reader.onabort = () => {
        reject(new Error('File reading was aborted'));
      };
      
      // Use readAsDataURL to handle any file type (including binary)
      try {
        reader.readAsDataURL(file);
      } catch (err) {
        reject(new Error(`Error initiating file read: ${err.message}`));
      }
    });
  } catch (error) {
    console.error('File compression error:', error.message);
    throw error;
  }
};

/**
 * Store file attachment in announcement
 */
export const storeAnnouncementAttachment = async (classId, announcementId, file) => {
  try {
    const compressedFile = await compressAndStoreFile(file);
    const announcementRef = doc(db, 'classes', classId, 'announcements', announcementId);
    
    // Create clean attachment object - avoid nested complex types
    const attachmentData = {
      name: String(compressedFile.name),
      type: String(compressedFile.type),
      size: Number(compressedFile.size),
      base64: String(compressedFile.base64)
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

/**
 * Download file from base64 compressed data
 */
export const downloadAttachment = (attachment) => {
  try {
    if (!attachment) {
      throw new Error('No attachment provided');
    }
    
    if (!attachment.base64) {
      // If no base64, it might be a URL - open in new tab
      window.open(attachment.fileUrl || attachment.url, '_blank');
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
export const createMaterial = async (classId, { title, description, author, authorId, attachments = [], filesBase64 = [], topicId = null }) => {
  try {
    const materialsRef = collection(db, 'classes', classId, 'materials');
    
    const material = {
      title,
      description,
      author,
      authorId,
      attachments: Array.isArray(attachments) ? attachments : [],
      filesBase64: Array.isArray(filesBase64) ? filesBase64 : [],
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
export const updateMaterial = async (classId, materialId, { title, description, attachments = [], filesBase64 = [] }) => {
  try {
    const materialRef = doc(db, 'classes', classId, 'materials', materialId);
    
    await updateDoc(materialRef, {
      title,
      description,
      attachments: Array.isArray(attachments) ? attachments : [],
      filesBase64: Array.isArray(filesBase64) ? filesBase64 : [],
      updatedAt: serverTimestamp(),
    });
    
    return { id: materialId, title, description, attachments, filesBase64 };
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
    const q = query(topicsRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
      }));
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
  questions = [],
  status = 'active'
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
      questions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status,
      dueDate: null
    };
    
    const docRef = await addDoc(assessmentsRef, assessment);
    
    return { id: docRef.id, ...assessment };
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
    
    await updateDoc(assessmentRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
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
    const assessmentRef = doc(db, 'classes', classId, 'assessments', assessmentId);
    await deleteDoc(assessmentRef);
    return true;
  } catch (error) {
    console.error('Error deleting assessment:', error);
    throw error;
  }
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
  dueDate = null,
  points = 100,
  questions = [],
  status = 'active'
}) => {
  try {
    const hasPublishableQuestion = Array.isArray(questions)
      && questions.some((q) => (q?.question || '').trim().length > 0);

    // Validate required fields
    if (!title || !title.trim()) {
      throw new Error('Assignment title is required');
    }

    if (status !== 'draft' && !hasPublishableQuestion) {
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
      dueDate,
      points,
      questions,
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
 * Update an assignment
 */
export const updateAssignment = async (classId, assignmentId, updates) => {
  try {
    const hasPublishableQuestion = Array.isArray(updates?.questions)
      && updates.questions.some((q) => (q?.question || '').trim().length > 0);

    if (updates?.status === 'active' && !hasPublishableQuestion) {
      throw new Error('Assignment must have at least one non-empty question before publishing');
    }

    const assignmentRef = doc(db, 'classes', classId, 'assignments', assignmentId);

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

/**
 * Get all assessments for a class
 */
export const getAssessments = async (classId) => {
  try {
    const assessmentsRef = collection(db, 'classes', classId, 'assessments');
    const q = query(assessmentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      };
    });
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
    return {
      id: docSnapshot.id,
      ...data,
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
    const q = query(
      enrollmentsRef,
      where('classId', '==', classId),
      orderBy('joinedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const enrollments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          enrolledAt: data.joinedAt?.toDate?.() || new Date(data.joinedAt)
        };
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
export const submitQuizAttempt = async (classId, assessmentId, studentId, { answers, score, earnedPoints, totalPoints, correctCount, totalQuestions, timeTaken = 0 }) => {
  try {
    const attemptsRef = collection(db, 'classes', classId, 'assessments', assessmentId, 'attempts');
    
    const attempt = {
      studentId,
      answers,
      score,
      earnedPoints: earnedPoints || Math.round((score / 100) * totalPoints),
      totalPoints,
      correctCount,
      totalQuestions,
      timeTaken,
      passed: score >= 60,
      submittedAt: serverTimestamp(),
      status: 'submitted',
    };
    
    const docRef = await addDoc(attemptsRef, attempt);
    return { id: docRef.id, ...attempt };
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
    const q = query(attemptsRef, where('studentId', '==', studentId), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
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
    
    return {
      attempts: attempts.length,
      averageScore,
      bestScore,
      passed: bestScore >= 70, // Assuming 70% is passing
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
  getUserProfile,
  updateUserProfile,
  initializeLmsExperience,
  getLmsExperience,
  updateLmsExperience,
  
  // Sectors
  getSectors,
  getSectorById,
  
  // Courses
  getCourses,
  getCoursesTemplates,
  getCourseById,
  getCourseTemplateById,
  createCourseTemplate,
  createCourse,
  updateCourseTemplate,
  updateCourse,
  deleteCourse,
  
  // Applications
  applyCourse,
  getCourseApplications,
  approveApplication,
  rejectApplication,
  
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
  
  // Materials
  getCourseMaterials,
  getClassMaterials,
  subscribeToClassMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
  
  // Activity
  logActivity,
  
  // Class Announcements
  createAnnouncement,
  getAnnouncements,
  subscribeToAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  storeAnnouncementAttachment,
  addCommentToAnnouncement,
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

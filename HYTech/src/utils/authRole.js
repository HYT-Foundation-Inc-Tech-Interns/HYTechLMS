import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

export const ROLE_HOME = {
  admin: '/admin',
  trainer: '/trainer',
  supervisor: '/supervisor',
  student: '/student',
};

export const normalizeRole = (value) => String(value || '').toLowerCase();

export const inferRoleFromEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === 'admin@hytech.com' || normalizedEmail === 'admin@hyt.com') {
    return 'admin';
  }
  if (normalizedEmail === 'trainer@hytech.com' || normalizedEmail === 'trainer@hyt.com') {
    return 'trainer';
  }
  if (normalizedEmail === 'supervisor@hytech.com' || normalizedEmail === 'supervisor@hyt.com') {
    return 'supervisor';
  }
  if (normalizedEmail === 'student@hytech.com' || normalizedEmail === 'student@hyt.com') {
    return 'student';
  }
  return 'student';
};

export const resolveUserRole = async (uid, database) => {
  try {
    const directUserDoc = await getDoc(doc(database, 'users', uid));
    if (directUserDoc.exists()) {
      return directUserDoc.data()?.role || null;
    }
  } catch (err) {
    // If permission denied (user doc doesn't exist yet), continue to fallback
    if (err?.code === 'permission-denied') {
      console.debug('User doc not accessible yet (will be created by AuthContext)');
    } else {
      console.error('Error fetching user document:', err);
    }
  }

  try {
    const usersByUidQuery = query(collection(database, 'users'), where('uid', '==', uid), limit(1));
    const userResults = await getDocs(usersByUidQuery);
    if (!userResults.empty) {
      return userResults.docs[0].data()?.role || null;
    }
  } catch (err) {
    console.debug('Could not query users by uid:', err?.message);
  }

  return null;
};

export const resolveEffectiveRole = async ({ uid, email, database }) => {
  try {
    const resolvedRole = await resolveUserRole(uid, database);
    return normalizeRole(resolvedRole) || inferRoleFromEmail(email);
  } catch {
    return inferRoleFromEmail(email);
  }
};

export const getHomePathForRole = (role) => ROLE_HOME[normalizeRole(role)] || '/student';

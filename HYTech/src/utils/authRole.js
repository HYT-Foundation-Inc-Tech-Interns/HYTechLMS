import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

export const ROLES = ['admin', 'trainer', 'student'];

export const ROLE_HOME = {
  admin: '/admin',
  trainer: '/trainer',
  student: '/student',
};

export const normalizeRole = (value) => {
  const role = String(value || '').toLowerCase();
  return ROLES.includes(role) ? role : '';
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

export const resolveEffectiveRole = async ({ uid, database }) => {
  try {
    const resolvedRole = await resolveUserRole(uid, database);
    return normalizeRole(resolvedRole) || 'student';
  } catch {
    return 'student';
  }
};

export const getHomePathForRole = (role) => ROLE_HOME[normalizeRole(role)] || '/student';

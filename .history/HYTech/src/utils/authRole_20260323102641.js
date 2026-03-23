import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

export const ROLE_HOME = {
  admin: '/admin',
  trainer: '/dashboard',
  student: '/student',
};

export const normalizeRole = (value) => String(value || '').toLowerCase();

export const inferRoleFromEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === 'admin@hytech.com') {
    return 'admin';
  }
  if (normalizedEmail === 'trainer@hytech.com') {
    return 'trainer';
  }
  return 'student';
};

export const resolveUserRole = async (uid, database) => {
  const directUserDoc = await getDoc(doc(database, 'users', uid));
  if (directUserDoc.exists()) {
    return directUserDoc.data()?.role || null;
  }

  const usersByUidQuery = query(collection(database, 'users'), where('uid', '==', uid), limit(1));
  const userResults = await getDocs(usersByUidQuery);
  if (!userResults.empty) {
    return userResults.docs[0].data()?.role || null;
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

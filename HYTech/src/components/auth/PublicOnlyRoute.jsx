import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const ROLE_HOME = {
  admin: '/admin',
  trainer: '/dashboard',
  student: '/student',
};

const normalizeRole = (value) => String(value || '').toLowerCase();

const resolveUserRole = async (uid) => {
  const directUserDoc = await getDoc(doc(db, 'users', uid));
  if (directUserDoc.exists()) {
    return directUserDoc.data()?.role || null;
  }

  const usersByUidQuery = query(collection(db, 'users'), where('uid', '==', uid), limit(1));
  const userResults = await getDocs(usersByUidQuery);
  if (!userResults.empty) {
    return userResults.docs[0].data()?.role || null;
  }

  return null;
};

const PublicOnlyRoute = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    if (!auth || !db) {
      setIsLoading(false);
      setRedirectPath(null);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRedirectPath(null);
        setIsLoading(false);
        return;
      }

      try {
        const role = normalizeRole(await resolveUserRole(user.uid));
        setRedirectPath(ROLE_HOME[role] || '/student');
      } catch {
        setRedirectPath('/student');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PublicOnlyRoute;

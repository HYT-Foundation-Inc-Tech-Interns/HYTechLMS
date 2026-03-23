import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const ROLE_HOME = {
  admin: '/admin',
  trainer: '/dashboard',
  student: '/student',
};

const normalizeRole = (value) => String(value || '').toLowerCase();

const inferRoleFromEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === 'admin@hytech.com') {
    return 'admin';
  }
  if (normalizedEmail === 'trainer@hytech.com') {
    return 'trainer';
  }
  return 'student';
};

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

const RoleProtectedRoute = ({ allowedRole, children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (!auth || !db) {
      setIsLoading(false);
      setIsAuthenticated(false);
      setUserRole('');
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthenticated(false);
        setUserRole('');
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      try {
        const resolvedRole = await resolveUserRole(user.uid);
        const role = normalizeRole(resolvedRole) || inferRoleFromEmail(user.email);
        setUserRole(role);
      } catch {
        setUserRole(inferRoleFromEmail(user.email));
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

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  const normalizedAllowedRole = normalizeRole(allowedRole);
  if (!normalizedAllowedRole || userRole !== normalizedAllowedRole) {
    const fallbackPath = ROLE_HOME[userRole] || '/signin';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default RoleProtectedRoute;

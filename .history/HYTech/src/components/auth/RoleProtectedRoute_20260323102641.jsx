import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { getHomePathForRole, normalizeRole, resolveEffectiveRole } from '../../utils/authRole';

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
        const role = await resolveEffectiveRole({
          uid: user.uid,
          email: user.email,
          database: db,
        });
        setUserRole(role);
      } catch {
        setUserRole('student');
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
    const fallbackPath = getHomePathForRole(userRole);
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default RoleProtectedRoute;

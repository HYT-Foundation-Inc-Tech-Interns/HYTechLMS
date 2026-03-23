import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { getHomePathForRole, resolveEffectiveRole } from '../../utils/authRole';

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
        const role = await resolveEffectiveRole({
          uid: user.uid,
          email: user.email,
          database: db,
        });
        setRedirectPath(getHomePathForRole(role));
      } catch {
        setRedirectPath(getHomePathForRole('student'));
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

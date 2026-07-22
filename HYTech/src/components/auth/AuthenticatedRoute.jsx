import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthenticatedRoute = ({ children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      setIsLoading(false);
      setIsAuthenticated(false);
      return () => {};
    }

    let unsubscribeUserStatus = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeUserStatus) {
        unsubscribeUserStatus();
        unsubscribeUserStatus = null;
      }

      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      unsubscribeUserStatus = onSnapshot(
        doc(db, 'users', user.uid),
        async (userSnap) => {
          const data = userSnap.exists() ? (userSnap.data() || {}) : {};
          const status = data.status || 'Active';
          if (status !== 'Active') {
            await signOut(auth);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }

          // Backstop for the email-verification gate: block unverified
          // self-registered sessions. Admin-created / staff accounts are exempt.
          const roleLower = String(data.role || '').toLowerCase();
          const isVerificationExempt =
            data.createdBy === 'admin' || roleLower === 'admin' || roleLower === 'trainer';
          if (!isVerificationExempt && !user.emailVerified) {
            await signOut(auth);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }

          setIsAuthenticated(true);
          setIsLoading(false);
        },
        () => {
          // If status read fails, keep authenticated flow rather than hard-blocking.
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeUserStatus) {
        unsubscribeUserStatus();
      }
      unsubscribeAuth();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-gray-300 border-t-[#0B005C] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/signin" replace state={{ from: location }} />;

  return children;
};

export default AuthenticatedRoute;

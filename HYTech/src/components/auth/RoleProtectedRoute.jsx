import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getHomePathForRole, normalizeRole, resolveEffectiveRole } from '../../utils/authRole';
import ForcePasswordChange from './ForcePasswordChange';

const RoleProtectedRoute = ({ allowedRole, children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      setIsLoading(false);
      setIsAuthenticated(false);
      setUserRole('');
      return () => {};
    }

    let unsubscribeUserStatus = null;
    let isMounted = true;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Immediately clean up listener when user signs out
      if (unsubscribeUserStatus) {
        unsubscribeUserStatus();
        unsubscribeUserStatus = null;
      }

      if (!user) {
        if (isMounted) {
          setIsAuthenticated(false);
          setUserRole('');
          setIsLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsAuthenticated(true);
        setIsLoading(true);
      }

      // Set up listener only for authenticated users
      try {
        unsubscribeUserStatus = onSnapshot(
          doc(db, 'users', user.uid),
          async (userSnap) => {
            if (!isMounted) return;

            const data = userSnap.exists() ? (userSnap.data() || {}) : {};
            const status = String(data.status || 'Active').toLowerCase();
            if (isMounted) setMustChangePassword(data.mustChangePassword === true);

            if (status !== 'active') {
              await signOut(auth);
              if (isMounted) {
                setIsAuthenticated(false);
                setUserRole('');
                setIsLoading(false);
              }
              return;
            }

            // Backstop for the email-verification gate: block unverified
            // self-registered sessions. Admin-created / staff accounts are exempt.
            const roleLower = String(data.role || '').toLowerCase();
            const isVerificationExempt =
              data.createdBy === 'admin' || roleLower === 'admin' || roleLower === 'trainer';
            if (!isVerificationExempt && !user.emailVerified) {
              await signOut(auth);
              if (isMounted) {
                setIsAuthenticated(false);
                setUserRole('');
                setIsLoading(false);
              }
              return;
            }

            try {
              const role = await resolveEffectiveRole({ uid: user.uid, email: user.email, database: db });
              if (isMounted) {
                setUserRole(role);
              }
            } catch {
              if (isMounted) {
                setUserRole('student');
              }
            } finally {
              if (isMounted) {
                setIsLoading(false);
              }
            }
          },
          // Error handler for snapshot listener
          (error) => {
            if (!isMounted) return;
            
            console.warn('User document access failed:', error?.code);
            
            // If user document doesn't exist or permission denied, continue with default role
            if (error?.code === 'permission-denied' || error?.code === 'not-found') {
              try {
                // Try async role resolution as fallback
                resolveEffectiveRole({ uid: user.uid, email: user.email, database: db })
                  .then((role) => {
                    if (isMounted) setUserRole(role);
                  })
                  .catch(() => {
                    if (isMounted) setUserRole('student');
                  })
                  .finally(() => {
                    if (isMounted) setIsLoading(false);
                  });
              } catch {
                if (isMounted) {
                  setUserRole('student');
                  setIsLoading(false);
                }
              }
            } else {
              // For other errors, set default role
              if (isMounted) {
                setUserRole('student');
                setIsLoading(false);
              }
            }
          }
        );
      } catch (err) {
        console.error('Error setting up user listener:', err);
        if (isMounted) {
          setUserRole('student');
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribeUserStatus) {
        unsubscribeUserStatus();
        unsubscribeUserStatus = null;
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
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

  // Force a password change before any dashboard is reachable.
  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return children;
};

export default RoleProtectedRoute;

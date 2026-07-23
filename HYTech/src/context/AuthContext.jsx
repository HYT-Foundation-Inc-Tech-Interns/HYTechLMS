import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!auth || !db) {
      setUser(null);
      setLoading(false);
      return () => {};
    }

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRef = doc(db, 'users', firebaseUser.uid);

      const applyProfile = (userData = {}) => {
        const structuredName = [
          userData.firstName,
          userData.middleName,
          userData.lastName,
          userData.nameExtension,
        ]
          .map((part) => String(part || '').trim())
          .filter(Boolean)
          .join(' ');
        const emailLocalPart = String(firebaseUser.email || '').split('@')[0].toLowerCase();
        const nonEmailPlaceholderName = [
          userData.name,
          userData.displayName,
          firebaseUser.displayName,
        ]
          .map((value) => String(value || '').trim())
          .find((value) => value && value.toLowerCase() !== emailLocalPart);
        const resolvedDisplayName =
          structuredName ||
          nonEmailPlaceholderName ||
          'Trainee';

        // Stored data is spread first so a stale displayName can never
        // overwrite the canonical name resolved above.
        setUser({
          ...userData,
          uid: firebaseUser.uid,
          email: firebaseUser.email || userData.email || '',
          displayName: resolvedDisplayName,
          role: userData.role || 'student',
          emailVerified: firebaseUser.emailVerified,
        });
      };

      // Signup owns profile creation. Listening here prevents AuthContext from
      // racing signup with an email-derived Firestore document and refreshes
      // all welcome/profile UI immediately after a profile update.
      unsubscribeProfile = onSnapshot(
        userRef,
        (snapshot) => {
          applyProfile(snapshot.exists() ? snapshot.data() : {});
          setError(null);
          setLoading(false);
        },
        (profileError) => {
          console.error('Error loading user profile:', profileError);
          applyProfile({});
          setError(profileError.message);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err.message);
    }
  };

  const value = {
    user,
    loading,
    error,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

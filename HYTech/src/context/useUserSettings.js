import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseInitError } from '../firebase';

export const useUserSettings = (role) => {
  const [uid, setUid] = useState(null);
  const [settingsData, setSettingsData] = useState(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setUid(null);
      setSettingsData(null);
      setIsSettingsLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setSettingsData(null);
        setIsSettingsLoading(false);
        return;
      }

      setUid(user.uid);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !uid) {
      setSettingsData(null);
      setIsSettingsLoading(false);
      return () => {};
    }

    setIsSettingsLoading(true);
    const settingsRef = doc(db, 'userSettings', uid);
    let isMounted = true;
    let unsubscribe = null;

    try {
      unsubscribe = onSnapshot(
        settingsRef,
        (snapshot) => {
          if (!isMounted) return;
          const roleSettings = snapshot.exists() ? snapshot.data()?.[role] || null : null;
          setSettingsData(roleSettings);
          setIsSettingsLoading(false);
        },
        (error) => {
          if (!isMounted) return;
          console.warn('Settings listener error:', error?.code);
          setSettingsData(null);
          setIsSettingsLoading(false);
        }
      );
    } catch (err) {
      console.warn('Failed to set up settings listener:', err);
      if (isMounted) {
        setSettingsData(null);
        setIsSettingsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  }, [uid, role]);

  const saveSettings = useCallback(
    async (payload) => {
      if (!auth || !db) {
        throw new Error(firebaseInitError || 'Firebase is not configured correctly.');
      }

      if (!uid) {
        throw new Error('No authenticated user found.');
      }

      const settingsRef = doc(db, 'userSettings', uid);
      await setDoc(
        settingsRef,
        {
          [role]: {
            ...(payload || {}),
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );

      setSettingsData((prev) => ({ ...(prev || {}), ...(payload || {}) }));
    },
    [uid, role]
  );

  return {
    uid,
    settingsData,
    isSettingsLoading,
    saveSettings,
  };
};

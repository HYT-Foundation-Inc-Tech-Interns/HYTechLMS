import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUid(null);
        setSettingsData(null);
        setIsSettingsLoading(false);
        return;
      }

      setUid(user.uid);
      setIsSettingsLoading(true);

      try {
        const settingsRef = doc(db, 'userSettings', user.uid);
        const snapshot = await getDoc(settingsRef);
        const roleSettings = snapshot.exists() ? snapshot.data()?.[role] || null : null;
        setSettingsData(roleSettings);
      } catch {
        setSettingsData(null);
      } finally {
        setIsSettingsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [role]);

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

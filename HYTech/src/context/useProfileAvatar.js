import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const normalizeRole = (role) => {
  if (role === 'dashboard') {
    return 'trainer';
  }
  return role || 'student';
};

const getKey = (role, uid) => `${normalizeRole(role)}-avatar-${uid || 'guest'}`;

const readAvatar = (role, uid) => {
  try {
    return localStorage.getItem(getKey(role, uid));
  } catch {
    return null;
  }
};

export const useProfileAvatar = (role) => {
  const normalizedRole = useMemo(() => normalizeRole(role), [role]);
  const [uid, setUid] = useState(() => auth?.currentUser?.uid || null);
  const [avatar, setAvatarState] = useState(() => readAvatar(normalizedRole, auth?.currentUser?.uid || null));

  useEffect(() => {
    if (!auth) {
      setUid(null);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setAvatarState(readAvatar(normalizedRole, uid));
  }, [normalizedRole, uid]);

  useEffect(() => {
    if (!db || !uid) {
      return () => {};
    }

    const settingsRef = doc(db, 'userSettings', uid);
    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        const roleSettings = snapshot.exists() ? snapshot.data()?.[normalizedRole] || null : null;
        const remoteAvatar = roleSettings?.avatarUrl || roleSettings?.avatarPreview || null;

        if (remoteAvatar) {
          localStorage.setItem(getKey(normalizedRole, uid), remoteAvatar);
          setAvatarState(remoteAvatar);
        }
      },
      () => {}
    );

    return () => unsubscribe();
  }, [normalizedRole, uid]);

  useEffect(() => {
    const syncAvatar = (event) => {
      if (event.detail?.role !== normalizedRole) {
        return;
      }
      if (event.detail?.uid !== uid) {
        return;
      }
      setAvatarState(readAvatar(normalizedRole, uid));
    };

    const syncStorage = (event) => {
      if (event.key && event.key !== getKey(normalizedRole, uid)) {
        return;
      }
      setAvatarState(readAvatar(normalizedRole, uid));
    };

    window.addEventListener('hyt:avatar-updated', syncAvatar);
    window.addEventListener('storage', syncStorage);

    return () => {
      window.removeEventListener('hyt:avatar-updated', syncAvatar);
      window.removeEventListener('storage', syncStorage);
    };
  }, [normalizedRole, uid]);

  const setAvatar = (imageData) => {
    const storageKey = getKey(normalizedRole, uid);

    if (imageData) {
      localStorage.setItem(storageKey, imageData);
    } else {
      localStorage.removeItem(storageKey);
    }

    setAvatarState(imageData || null);
    window.dispatchEvent(
      new CustomEvent('hyt:avatar-updated', { detail: { role: normalizedRole, uid } })
    );
  };

  return { avatar, setAvatar };
};

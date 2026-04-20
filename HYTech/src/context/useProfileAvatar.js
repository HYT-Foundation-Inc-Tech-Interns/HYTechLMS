import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [avatar, setAvatarState] = useState(null);

  // Always fetch avatar from Firestore on first load
  useEffect(() => {
    if (!db || !uid) {
      setAvatarState(null);
      return () => {};
    }
    const settingsRef = doc(db, 'userSettings', uid);
    let unsub = null;
    let isMounted = true;

    const fetchAvatar = async () => {
      try {
        // One-time fetch for initial load
        const snapshot = await import('firebase/firestore').then(m => m.getDoc(settingsRef));
        if (isMounted && snapshot.exists()) {
          const roleSettings = snapshot.data()?.[normalizedRole] || null;
          const remoteAvatar = roleSettings?.avatarUrl || roleSettings?.avatarPreview || roleSettings?.avatarBase64 || null;
          if (remoteAvatar) {
            localStorage.setItem(getKey(normalizedRole, uid), remoteAvatar);
            setAvatarState(remoteAvatar);
          }
        }
      } catch {
        // fallback to localStorage if fetch fails
        if (isMounted) {
          setAvatarState(readAvatar(normalizedRole, uid));
        }
      }
    };

    fetchAvatar();

    // Subscribe to changes for live updates
    try {
      unsub = onSnapshot(
        settingsRef,
        (snapshot) => {
          if (!isMounted) return;
          const roleSettings = snapshot.exists() ? snapshot.data()?.[normalizedRole] || null : null;
          const remoteAvatar = roleSettings?.avatarUrl || roleSettings?.avatarPreview || roleSettings?.avatarBase64 || null;
          if (remoteAvatar) {
            localStorage.setItem(getKey(normalizedRole, uid), remoteAvatar);
            setAvatarState(remoteAvatar);
          } else {
            setAvatarState(readAvatar(normalizedRole, uid));
          }
        },
        () => {
          if (isMounted) {
            setAvatarState(readAvatar(normalizedRole, uid));
          }
        }
      );
    } catch (err) {
      console.warn('Avatar listener setup failed:', err);
      if (isMounted) {
        setAvatarState(readAvatar(normalizedRole, uid));
      }
    }

    return () => {
      isMounted = false;
      if (unsub) {
        unsub();
        unsub = null;
      }
    };
  }, [normalizedRole, uid]);

  // Keep uid in sync with auth state
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

  const setAvatar = useCallback((imageData) => {
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
  }, [normalizedRole, uid]);

  return { avatar, setAvatar };
};

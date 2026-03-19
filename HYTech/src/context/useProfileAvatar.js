import { useEffect, useMemo, useState } from 'react';

const normalizeRole = (role) => {
  if (role === 'dashboard') {
    return 'trainer';
  }
  return role || 'student';
};

const getKey = (role) => `${normalizeRole(role)}-avatar`;

const readAvatar = (role) => {
  try {
    return localStorage.getItem(getKey(role));
  } catch {
    return null;
  }
};

export const useProfileAvatar = (role) => {
  const normalizedRole = useMemo(() => normalizeRole(role), [role]);
  const [avatar, setAvatarState] = useState(() => readAvatar(normalizedRole));

  useEffect(() => {
    setAvatarState(readAvatar(normalizedRole));
  }, [normalizedRole]);

  useEffect(() => {
    const syncAvatar = (event) => {
      if (event.detail?.role !== normalizedRole) {
        return;
      }
      setAvatarState(readAvatar(normalizedRole));
    };

    const syncStorage = (event) => {
      if (event.key && event.key !== getKey(normalizedRole)) {
        return;
      }
      setAvatarState(readAvatar(normalizedRole));
    };

    window.addEventListener('hyt:avatar-updated', syncAvatar);
    window.addEventListener('storage', syncStorage);

    return () => {
      window.removeEventListener('hyt:avatar-updated', syncAvatar);
      window.removeEventListener('storage', syncStorage);
    };
  }, [normalizedRole]);

  const setAvatar = (imageData) => {
    if (imageData) {
      localStorage.setItem(getKey(normalizedRole), imageData);
    } else {
      localStorage.removeItem(getKey(normalizedRole));
    }

    setAvatarState(imageData || null);
    window.dispatchEvent(
      new CustomEvent('hyt:avatar-updated', { detail: { role: normalizedRole } })
    );
  };

  return { avatar, setAvatar };
};

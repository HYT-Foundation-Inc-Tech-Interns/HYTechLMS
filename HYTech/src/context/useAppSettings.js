import { useEffect, useState } from 'react';
import {
  DEFAULT_APP_SETTINGS,
  mergeAppSettings,
  saveAppSettings,
  subscribeToAppSettings,
} from '../utils/firestoreService';

/**
 * Live global app settings (branding, access policy, notification toggles).
 * Works pre-auth too — `config/appSettings` is public-read — so it can drive
 * the branded landing/sign-in pages and the self-registration gate.
 *
 * Returns the merged settings (always fully populated with defaults), a loading
 * flag, and the admin-only `save` (rules reject non-admin writes).
 */
export const useAppSettings = () => {
  const [appSettings, setAppSettings] = useState(() => mergeAppSettings({}));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToAppSettings((merged) => {
      if (!isMounted) return;
      setAppSettings(merged);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return {
    appSettings,
    isLoading,
    defaults: DEFAULT_APP_SETTINGS,
    save: saveAppSettings,
  };
};

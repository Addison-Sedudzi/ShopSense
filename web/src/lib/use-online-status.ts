import { useEffect, useState } from 'react';

/**
 * navigator.onLine plus the online/offline window events is enough for this
 * project: a service worker would add real value for offline *page loads*
 * (the app shell itself working with no network at all), but that's a
 * meaningfully bigger piece of infrastructure -- cache versioning, an
 * install/update flow, testing across browsers' SW quirks -- for a benefit
 * this app doesn't need yet: the owner opens the app once with a connection,
 * then may lose it mid-shift. What has to survive that is the *data*
 * (queued sales), not the app shell, and IndexedDB already does that without
 * a service worker in the picture at all.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}

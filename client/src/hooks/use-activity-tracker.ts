import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/axios-instance';

/**
 * Hook to automatically track page visits and emit Telegram activity events.
 * It detects the page type from the pathname and sends a request to the backend.
 */
export function useActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // Map pathnames to human-readable names
    const getPageName = (path: string) => {
      if (path === '/') return 'Dashboard';
      if (path.includes('/tasks')) return 'Tasks Page';
      if (path.includes('/projects')) return 'Projects Page';
      if (path.includes('/team')) return 'Team Page';
      if (path.includes('/organization')) return 'Organization Settings';
      if (path.includes('/billing')) return 'Billing Page';
      if (path.includes('/settings')) return 'User Settings';
      
      // Clean up dynamic paths
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1) + ' Page';
      }
      return 'App';
    };

    const pageName = getPageName(pathname);

    // Debounce to prevent spam during rapid navigation (optional but good practice)
    const timeout = setTimeout(() => {
      api.post('/telegram/track-activity', {
        action: 'PAGE_OPENED',
        metadata: {
          message: `User opened ${pageName}`,
          page: pageName,
          path: pathname,
          device: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'Unknown'
        }
      }).catch(err => {
        // Silently fail to not interrupt user experience
        console.debug('Activity tracking failed:', err);
      });
    }, 1000);

    return () => clearTimeout(timeout);
  }, [pathname]);
}

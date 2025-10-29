import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';

interface RoleAccessCache {
  role: string;
  accessibleRoutes: string[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedAccess: RoleAccessCache | null = null;

export function useRoleAccess() {
  const [accessibleRoutes, setAccessibleRoutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRoleAccess = async () => {
      const user = getCurrentUser();
      
      // System Administrator always has full access
      if (user?.role === 'System Administrator') {
        setAccessibleRoutes(['*']); // Wildcard for all routes
        setLoading(false);
        return;
      }
      
      if (!user?.role) {
        setAccessibleRoutes([]);
        setLoading(false);
        return;
      }

      // Check cache first
      const now = Date.now();
      if (cachedAccess && 
          cachedAccess.role === user.role && 
          (now - cachedAccess.timestamp) < CACHE_DURATION) {
        setAccessibleRoutes(cachedAccess.accessibleRoutes);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/settings/role-access');
        
        if (!response.ok) {
          throw new Error('Failed to fetch role access');
        }

        const data = await response.json();
        const roleConfig = data.find((item: { role: string; accessibleRoutes: string[] }) => 
          item.role === user.role
        );

        const routes = roleConfig?.accessibleRoutes || [];
        
        // Cache the result
        cachedAccess = {
          role: user.role,
          accessibleRoutes: routes,
          timestamp: now,
        };
        
        setAccessibleRoutes(routes);
      } catch (error) {
        console.error('Error fetching role access:', error);
        // On error, allow access (fallback to permission-based)
        setAccessibleRoutes(['*']);
      } finally {
        setLoading(false);
      }
    };

    fetchRoleAccess();
  }, []);

  const hasRouteAccess = (route: string): boolean => {
    // System admin has access to everything
    if (accessibleRoutes.includes('*')) {
      return true;
    }

    // Check if the exact route or a parent route is accessible
    return accessibleRoutes.some(accessibleRoute => {
      return route === accessibleRoute || route.startsWith(accessibleRoute + '/');
    });
  };

  return { accessibleRoutes, hasRouteAccess, loading };
}

// Clear cache function (useful after logout)
export function clearRoleAccessCache() {
  cachedAccess = null;
}

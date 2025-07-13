// src/lib/rbac.tsx


'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
// Corrected import paths from alias to relative
import { MOCK_CURRENT_USER } from './mockData';
import { User } from '../types';

// --- 1. Define Permissions for each Role ---
// This configuration maps roles to a set of allowed actions (permissions).
// It's the single source of truth for what a user can do.
// Actions are strings like "feature:action", e.g., "customer:create".
const permissions: Record<string, string[]> = {
  Admin: [
    'customer:create',
    'customer:read',
    'customer:update',
    'customer:delete',
    'interaction:create',
  ],
  Sales: [
    'customer:create',
    'customer:read',
    'customer:update',
    'interaction:create',
  ],
  Viewer: [
    'customer:read',
  ],

};

// --- 2. Define the Context Shape ---
interface RBACContextType {
  user: User;
  roles: string[];
  userPermissions: Set<string>;
  can: (action: string) => boolean;
}

const RBACContext = createContext<RBACContextType | null>(null);

// --- 3. Create the RBAC Provider Component ---
// This component will wrap the authenticated parts of the app.
// It determines the current user's permissions and makes them available
// to all child components via the context.
export const RBACProvider = ({ children }: { children: ReactNode }) => {
  const user = MOCK_CURRENT_USER; // In a real app, this would come from an auth session.
  const userRoles = useMemo(() => {
    // Ensure userRoles is always an array, even if user.role is undefined
    return user.role ? [user.role] : [];
  }, [user.role]);

  // Calculate the user's total permissions by combining permissions from all their roles.
  const userPermissions = useMemo(() => {
    const combinedPermissions = new Set<string>();
    userRoles.forEach((role: string) => {
      permissions[role]?.forEach(permission => {
        combinedPermissions.add(permission);
      });
    });
    return combinedPermissions;
  }, [userRoles]);

  // The 'can' function is a simple utility to check if the user has a specific permission.
  const can = (action: string): boolean => {
    return userPermissions.has(action);
  };

  const value = { user, roles: userRoles, userPermissions, can };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
};

// --- 4. Create a Custom Hook for Easy Access ---
// This hook simplifies accessing the RBAC context in components.
export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};

// --- 5. Create a Declarative Permission-Checking Component ---
// The 'Can' component provides a clean, declarative way to hide/show UI elements
// based on the current user's permissions.
interface CanProps {
  perform: string;
  children: ReactNode;
}

export const Can = ({ perform, children }: CanProps) => {
  const { can } = useRBAC();

  if (can(perform)) {
    return <>{children}</>;
  }

  return null; // If the user does not have permission, render nothing.
};

// src/lib/auth.ts

export type Permission = string;
export type User = { id: string; email: string; role: string; permissions: Permission[] };

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}

export function hasPermission(p: Permission): boolean {
  const u = getCurrentUser();
  return !!u?.permissions?.includes(p);
}

// new: check ANY of multiple perms
export function hasAnyPermission(ps: Permission[]): boolean {
  return ps.some(hasPermission);
}

export function logout() {
  localStorage.removeItem('user');
}

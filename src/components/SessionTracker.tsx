'use client';

import { useSessionTracking } from '@/hooks/useSessionTracking';

export function SessionTracker() {
  useSessionTracking();
  return null;
}

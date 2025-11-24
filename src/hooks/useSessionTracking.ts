'use client';

import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_HEARTBEAT_INTERVAL = 60000; // 1 minute
const SESSION_ID_KEY = 'app_session_id';

export function useSessionTracking() {
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get or create session ID
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    sessionIdRef.current = sessionId;

    // Send initial heartbeat
    sendHeartbeat(sessionId);

    // Set up periodic heartbeat
    intervalRef.current = setInterval(() => {
      if (sessionIdRef.current) {
        sendHeartbeat(sessionIdRef.current);
      }
    }, SESSION_HEARTBEAT_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const sendHeartbeat = async (sessionId: string) => {
    try {
      await fetch('/api/sessions/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (error) {
      console.error('Failed to send session heartbeat:', error);
    }
  };

  return sessionIdRef.current;
}

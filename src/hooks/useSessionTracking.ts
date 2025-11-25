'use client';

import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_HEARTBEAT_INTERVAL = 60000; // 1 minute
const SESSION_ID_KEY = 'app_session_id';

export function useSessionTracking() {
  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [localIp, setLocalIp] = useState<string | null>(null);

  // Detect local IP using WebRTC
  useEffect(() => {
    const detectLocalIp = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: []
        });

        pc.createDataChannel('');
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) return;

          const candidateStr = ice.candidate.candidate;
          const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
          const match = candidateStr.match(ipRegex);

          if (match && match[0]) {
            const detectedIp = match[0];
            // Only set if it's a local IP (not public)
            if (detectedIp.startsWith('192.168.') || 
                detectedIp.startsWith('10.') || 
                detectedIp.startsWith('172.')) {
              setLocalIp(detectedIp);
              pc.close();
            }
          }
        };
      } catch (error) {
        console.log('Could not detect local IP:', error);
      }
    };

    detectLocalIp();
  }, []);

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
  }, [localIp]); // Re-send when local IP is detected

  const sendHeartbeat = async (sessionId: string) => {
    try {
      await fetch('/api/sessions/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          localIp: localIp || undefined 
        }),
      });
    } catch (error) {
      console.error('Failed to send session heartbeat:', error);
    }
  };

  return sessionIdRef.current;
}

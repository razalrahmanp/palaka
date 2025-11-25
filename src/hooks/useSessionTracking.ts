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
    console.log('🚀 Starting local IP detection...');
    
    const detectLocalIp = async () => {
      try {
        console.log('🌐 Attempting WebRTC detection...');
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // Add STUN server to help discovery
        });

        pc.createDataChannel('');
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('📞 WebRTC offer created, waiting for ICE candidates...');

        let detectionTimeout: NodeJS.Timeout;
        let candidatesReceived = 0;
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            // ICE gathering complete
            if (ice === null || !ice.candidate) {
              console.log('🏁 ICE candidate gathering finished');
              clearTimeout(detectionTimeout);
              pc.close();
            }
            return;
          }

          candidatesReceived++;
          const candidateStr = ice.candidate.candidate;
          console.log(`🔍 ICE candidate #${candidatesReceived}:`, candidateStr);
          
          const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/g;
          const matches = candidateStr.match(ipRegex);

          if (matches) {
            for (const detectedIp of matches) {
              console.log('📡 Detected IP:', detectedIp);
              
              // Prioritize 192.168.1.x network (device network)
              if (detectedIp.startsWith('192.168.1.')) {
                console.log('✅ Found device network IP:', detectedIp);
                setLocalIp(detectedIp);
                clearTimeout(detectionTimeout);
                pc.close();
                return;
              }
              
              // Accept any private IP as fallback
              if (detectedIp.startsWith('192.168.') || 
                  detectedIp.startsWith('10.') || 
                  detectedIp.startsWith('172.16.') ||
                  detectedIp.startsWith('172.17.') ||
                  detectedIp.startsWith('172.18.') ||
                  detectedIp.startsWith('172.19.') ||
                  detectedIp.startsWith('172.20.') ||
                  detectedIp.startsWith('172.21.') ||
                  detectedIp.startsWith('172.22.') ||
                  detectedIp.startsWith('172.23.') ||
                  detectedIp.startsWith('172.24.') ||
                  detectedIp.startsWith('172.25.') ||
                  detectedIp.startsWith('172.26.') ||
                  detectedIp.startsWith('172.27.') ||
                  detectedIp.startsWith('172.28.') ||
                  detectedIp.startsWith('172.29.') ||
                  detectedIp.startsWith('172.30.') ||
                  detectedIp.startsWith('172.31.')) {
                console.log('✅ Found private IP:', detectedIp);
                setLocalIp(detectedIp);
                // Don't close yet, might find 192.168.1.x
              }
            }
          }
        };

        pc.onicegatheringstatechange = () => {
          console.log('🔄 ICE gathering state:', pc.iceGatheringState);
          if (pc.iceGatheringState === 'complete') {
            console.log('✔️ ICE gathering complete');
            clearTimeout(detectionTimeout);
            pc.close();
          }
        };

        // Timeout after 5 seconds
        detectionTimeout = setTimeout(() => {
          console.log('⏱️ Local IP detection timeout - received', candidatesReceived, 'candidates');
          if (candidatesReceived === 0) {
            console.warn('⚠️ No ICE candidates received - WebRTC may be blocked');
          }
          pc.close();
        }, 5000);

      } catch (error) {
        console.error('❌ Could not detect local IP:', error);
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

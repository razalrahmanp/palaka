/**
 * Client-Side ESSL Connector
 * 
 * This connector runs in the browser and connects to ESSL devices directly
 * from the client's network. This works with Vercel deployment because the
 * browser (on local network) can reach the device, even though Vercel servers cannot.
 * 
 * Note: This requires the ESSL device to have CORS enabled or we need to use
 * a different approach (WebSocket/TCP proxy).
 */

interface AttendanceLog {
  userSN: string;
  deviceUserId: string;
  recordTime: Date;
  direction: number;
  verifyMode: number;
}

export class ClientESSLConnector {
  private deviceIp: string;
  private devicePort: number;
  private deviceId: string;

  constructor(deviceIp: string, devicePort: number, deviceId: string) {
    this.deviceIp = deviceIp;
    this.devicePort = devicePort;
    this.deviceId = deviceId;
  }

  /**
   * Attempt to sync attendance data from ESSL device
   * 
   * Since browsers cannot make raw TCP connections, we have two options:
   * 1. Use a WebSocket proxy on the server (complex)
   * 2. Use the existing server-side API with better error handling (current approach)
   * 
   * For now, this is a wrapper that provides better client-side error detection
   * and network diagnostics.
   */
  async sync(): Promise<{
    success: boolean;
    logs?: AttendanceLog[];
    error?: string;
    diagnostics?: {
      canReachDevice: boolean;
      isOnLocalNetwork: boolean;
      suggestedAction: string;
    };
  }> {
    try {
      // Step 1: Check if we're on the local network
      const localIp = await this.detectLocalIp();
      const isOnLocalNetwork = localIp?.startsWith('192.168.1.') || false;

      // Step 2: Try to ping the device (basic connectivity check)
      const canReachDevice = await this.checkDeviceConnectivity();

      // Step 3: If we can't reach the device, provide diagnostics
      if (!canReachDevice) {
        return {
          success: false,
          error: 'Cannot reach ESSL device',
          diagnostics: {
            canReachDevice: false,
            isOnLocalNetwork,
            suggestedAction: isOnLocalNetwork
              ? 'Device may be offline or on a different subnet. Check device power and network cable.'
              : 'You are not on the local network. Connect to DIR-615-C4A9 or Alrams WiFi.',
          },
        };
      }

      // Step 4: Call the server-side sync API
      // (Browser cannot make raw TCP connections, so we still use the server API)
      const response = await fetch('/api/essl/sync-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          logs: data.logs,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Sync failed',
          diagnostics: {
            canReachDevice,
            isOnLocalNetwork,
            suggestedAction: 'Server could not connect to device. This may be a Vercel deployment issue.',
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Detect local IP address using WebRTC
   */
  private async detectLocalIp(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            return;
          }

          const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
          const match = ice.candidate.candidate.match(ipRegex);
          
          if (match && match[0]) {
            const ip = match[0];
            // Only return private IPs
            if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
              pc.close();
              resolve(ip);
            }
          }
        };

        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .catch(() => resolve(null));

        // Timeout after 3 seconds
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 3000);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Check if device is reachable (ping-like check)
   * 
   * Since browsers can't send ICMP ping, we try to make an HTTP request
   * to the device's web interface (if it has one).
   */
  private async checkDeviceConnectivity(): Promise<boolean> {
    try {
      // Try to fetch from device's potential web interface
      // Most ESSL devices have a web interface on port 80
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(`http://${this.deviceIp}`, {
        method: 'HEAD',
        mode: 'no-cors', // Avoid CORS issues
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true; // If we get any response, device is reachable
    } catch {
      // Even if fetch fails, it might just be CORS or device doesn't have web interface
      // This is not a reliable check for TCP port 4370 connectivity
      return false;
    }
  }
}

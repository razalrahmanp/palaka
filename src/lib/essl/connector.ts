/**
 * ESSL/ZKTeco Biometric Device Connector
 * Handles connection and data sync with ESSL fingerprint devices
 */

import ZKLib from 'zklib-js';

interface DeviceConfig {
  ip: string;
  port: number;
  timeout?: number;
  attendanceParser?: string;
  connectionType?: string;
}

interface AttendanceLog {
  userSN: string;
  deviceUserId: string;
  recordTime: Date;
  direction: number; // 0=Check In, 1=Check Out
  verifyMode: number; // 1=Fingerprint, 15=Face, etc
}

interface DeviceUser {
  uid: string;
  userId: string;
  name: string;
  role: number;
  password: string;
  cardno: number;
}

interface DeviceInfo {
  serialNumber: string;
  firmwareVersion: string;
  platform: string;
  deviceName: string;
  userCount: number;
  logCount: number;
  logCapacity: number;
}

export class ESSLConnector {
  private device: ZKLib | null = null;
  private config: DeviceConfig;
  private isConnected: boolean = false;

  constructor(config: DeviceConfig) {
    this.config = {
      timeout: 10000, // 10 seconds timeout
      attendanceParser: 'v6.60',
      connectionType: 'tcp',
      ...config,
    };
  }

  /**
   * Connect to the ESSL device with retry logic
   */
  async connect(retries: number = 2): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Attempt ${attempt}/${retries}] Connecting to ESSL device at ${this.config.ip}:${this.config.port}...`);
        
        this.device = new ZKLib(
          this.config.ip,
          this.config.port,
          this.config.timeout,
          this.config.attendanceParser
        );

        // Try to create socket connection
        await this.device.createSocket();
        this.isConnected = true;
        
        console.log(`✅ Successfully connected to ESSL device at ${this.config.ip}:${this.config.port}`);
        return true;
      } catch (error) {
        lastError = error as Error;
        
        // Extract more detailed error information
        let errorMsg = 'Unknown error';
        let errorCode = '';
        
        if (error instanceof Error) {
          errorMsg = error.message;
          // Check for common Node.js error codes
          const nodeError = error as Error & { code?: string; errno?: number };
          if (nodeError.code) {
            errorCode = nodeError.code;
          }
          if (nodeError.errno) {
            errorCode = `${errorCode || ''}(errno: ${nodeError.errno})`;
          }
        }
        
        // Build detailed error message
        const fullError = errorCode ? `${errorMsg} [${errorCode}]` : errorMsg;
        console.error(`❌ [Attempt ${attempt}/${retries}] Failed to connect: ${fullError}`);
        console.error(`   Device: ${this.config.ip}:${this.config.port}`);
        console.error(`   Timeout: ${this.config.timeout}ms`);
        
        if (error instanceof Error && error.stack) {
          console.error(`   Stack trace:`, error.stack.split('\n').slice(0, 3).join('\n'));
        }
        
        // Clean up device instance on failure
        if (this.device) {
          try {
            await this.device.disconnect();
          } catch (disconnectError) {
            // Ignore disconnect errors but log them
            console.error(`   (Failed to cleanup connection: ${disconnectError instanceof Error ? disconnectError.message : 'unknown'})`);
          }
          this.device = null;
        }
        this.isConnected = false;

        // If not the last attempt, wait before retrying
        if (attempt < retries) {
          const waitTime = attempt * 2000; // Progressive backoff: 2s, 4s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries failed - provide comprehensive diagnostics
    const errorDetails = lastError?.message || 'Unknown error';
    const nodeError = lastError as Error & { code?: string };
    const errorCode = nodeError?.code || '';
    
    const isTimeout = errorDetails.includes('ETIMEDOUT') || errorCode === 'ETIMEDOUT';
    const isRefused = errorDetails.includes('ECONNREFUSED') || errorCode === 'ECONNREFUSED';
    const isHostUnreach = errorDetails.includes('EHOSTUNREACH') || errorCode === 'EHOSTUNREACH';
    const isNetUnreach = errorDetails.includes('ENETUNREACH') || errorCode === 'ENETUNREACH';

    let userFriendlyMessage = `Connection failed after ${retries} attempts to ${this.config.ip}:${this.config.port}\n\n`;
    
    if (isTimeout) {
      userFriendlyMessage += `⏱️ CONNECTION TIMEOUT\n` +
                            `The device is not responding. Please verify:\n` +
                            `  1. Device is powered ON and showing ready status\n` +
                            `  2. Device is connected to the network\n` +
                            `  3. IP address ${this.config.ip} is correct\n` +
                            `  4. Can you ping the device? Try: ping ${this.config.ip}\n` +
                            `  5. Firewall/antivirus is not blocking port ${this.config.port}`;
    } else if (isRefused) {
      userFriendlyMessage += `🚫 CONNECTION REFUSED\n` +
                            `The device actively refused the connection. Please check:\n` +
                            `  1. Port ${this.config.port} is correct (default is 4370)\n` +
                            `  2. Device communication settings in device menu\n` +
                            `  3. No other application is connected to the device\n` +
                            `  4. Device TCP/IP settings are properly configured`;
    } else if (isHostUnreach || isNetUnreach) {
      userFriendlyMessage += `🌐 NETWORK UNREACHABLE\n` +
                            `Cannot reach the device on the network. Please check:\n` +
                            `  1. Device and server are on the same network\n` +
                            `  2. Network cables are properly connected\n` +
                            `  3. Network switch/router is functioning\n` +
                            `  4. IP address ${this.config.ip} is in the correct subnet\n` +
                            `  5. Gateway/routing configuration`;
    } else {
      userFriendlyMessage += `❌ ERROR: ${errorDetails}\n` +
                            (errorCode ? `   Error Code: ${errorCode}\n` : '') +
                            `\nTroubleshooting steps:\n` +
                            `  1. Verify device IP: ${this.config.ip}\n` +
                            `  2. Verify device port: ${this.config.port}\n` +
                            `  3. Check device is powered on and connected\n` +
                            `  4. Try pinging the device\n` +
                            `  5. Check device TCP/IP communication settings\n` +
                            `  6. Restart the device if necessary`;
    }

    throw new Error(userFriendlyMessage);
  }

  /**
   * Disconnect from the device
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device && this.isConnected) {
        await this.device.disconnect();
        this.isConnected = false;
        console.log('Disconnected from ESSL device');
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    this.ensureConnected();
    
    try {
      const device = this.getDevice();
      const info = await device.getInfo();
      return {
        serialNumber: info.serialNumber || 'Unknown',
        firmwareVersion: info.fwVersion || 'Unknown',
        platform: info.platform || 'Unknown',
        deviceName: info.deviceName || 'ESSL Device',
        userCount: info.userCounts || 0,
        logCount: info.logCounts || 0,
        logCapacity: info.logCapacity || 0,
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      throw error;
    }
  }

  /**
   * Get all attendance logs from device
   */
  async getAttendanceLogs(): Promise<AttendanceLog[]> {
    this.ensureConnected();
    
    try {
      console.log('Fetching attendance logs from device...');
      const device = this.getDevice();
      const logs = await device.getAttendances();
      
      console.log(`Retrieved ${logs.data?.length || 0} attendance records`);
      
      return (logs.data || []).map((log) => ({
        userSN: log.userSn || log.deviceUserId,
        deviceUserId: log.deviceUserId,
        recordTime: new Date(log.recordTime),
        direction: log.direction || 0,
        verifyMode: log.verifyMode || 1,
      }));
    } catch (error) {
      console.error('Error fetching attendance logs:', error);
      throw error;
    }
  }

  /**
   * Get users enrolled in the device
   */
  async getUsers(): Promise<DeviceUser[]> {
    this.ensureConnected();
    
    try {
      console.log('Fetching enrolled users from device...');
      const device = this.getDevice();
      const users = await device.getUsers();
      
      console.log(`Retrieved ${users.data?.length || 0} users`);
      
      return users.data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Clear all attendance logs from device
   * WARNING: This will permanently delete all logs from the device
   */
  async clearAttendanceLogs(): Promise<boolean> {
    this.ensureConnected();
    
    try {
      console.log('Clearing attendance logs from device...');
      const device = this.getDevice();
      await device.clearAttendanceLog();
      console.log('Attendance logs cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing attendance logs:', error);
      throw error;
    }
  }

  /**
   * Get real-time logs (streaming mode)
   */
  async getRealTimeLogs(callback: (log: AttendanceLog) => void): Promise<void> {
    this.ensureConnected();
    
    try {
      console.log('Starting real-time log monitoring...');
      const device = this.getDevice();
      
      device.on('attendance', (data) => {
        const log: AttendanceLog = {
          userSN: data.userSn || data.deviceUserId,
          deviceUserId: data.deviceUserId,
          recordTime: new Date(data.recordTime),
          direction: data.direction || 0,
          verifyMode: data.verifyMode || 1,
        };
        callback(log);
      });

      // Start real-time mode
      await device.enableRealtime();
    } catch (error) {
      console.error('Error in real-time mode:', error);
      throw error;
    }
  }

  /**
   * Stop real-time log monitoring
   */
  async stopRealTimeLogs(): Promise<void> {
    this.ensureConnected();
    
    try {
      const device = this.getDevice();
      await device.disableRealtime();
      console.log('Real-time monitoring stopped');
    } catch (error) {
      console.error('Error stopping real-time mode:', error);
      throw error;
    }
  }

  /**
   * Test connection to device
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      const info = await this.getDeviceInfo();
      console.log('Device Info:', info);
      await this.disconnect();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Ensure device is connected before operations
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.device) {
      throw new Error('Device not connected. Call connect() first.');
    }
  }

  /**
   * Get device instance safely
   */
  private getDevice(): ZKLib {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device;
  }

  /**
   * Get connection status
   */
  isDeviceConnected(): boolean {
    return this.isConnected;
  }
}

/**
 * Create a connector instance with device config
 */
export function createESSLConnector(ip: string, port: number = 4370): ESSLConnector {
  return new ESSLConnector({ ip, port });
}

/**
 * Helper to map device punch type to readable status
 */
export function mapPunchType(direction: number): 'IN' | 'OUT' | 'BREAK' {
  switch (direction) {
    case 0:
      return 'IN';
    case 1:
      return 'OUT';
    case 2:
      return 'BREAK';
    default:
      // If device doesn't send proper direction, default to IN
      // The processing logic will handle alternating IN/OUT based on time sequence
      return 'IN';
  }
}

/**
 * Helper to map verification mode to readable method
 */
export function mapVerificationMethod(verifyMode: number): string {
  const methods: Record<number, string> = {
    0: 'password',
    1: 'fingerprint',
    2: 'card',
    3: 'password+fingerprint',
    4: 'password+card',
    5: 'fingerprint+card',
    15: 'face',
    25: 'palm',
  };
  return methods[verifyMode] || 'unknown';
}

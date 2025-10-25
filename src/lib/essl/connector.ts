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
      timeout: 15000, // Increased to 15 seconds for large datasets
      attendanceParser: 'v6.60',
      connectionType: 'tcp',
      ...config,
    };
  }

  /**
   * Connect to the ESSL device
   */
  async connect(): Promise<boolean> {
    try {
      console.log(`Connecting to ESSL device at ${this.config.ip}:${this.config.port}...`);
      
      this.device = new ZKLib(
        this.config.ip,
        this.config.port,
        this.config.timeout,
        this.config.attendanceParser
      );

      await this.device.createSocket();
      this.isConnected = true;
      
      console.log('Successfully connected to ESSL device');
      return true;
    } catch (error) {
      console.error('Failed to connect to ESSL device:', error);
      this.isConnected = false;
      throw new Error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

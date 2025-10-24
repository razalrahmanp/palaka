declare module 'zklib-js' {
  interface DeviceInfo {
    serialNumber?: string;
    fwVersion?: string;
    platform?: string;
    deviceName?: string;
    userCounts?: number;
    logCounts?: number;
    logCapacity?: number;
  }

  interface AttendanceRecord {
    userSn?: string;
    deviceUserId: string;
    recordTime: Date;
    direction?: number;
    verifyMode?: number;
  }

  interface UserRecord {
    uid: string;
    userId: string;
    name: string;
    role: number;
    password: string;
    cardno: number;
  }

  interface AttendanceResponse {
    data: AttendanceRecord[];
  }

  interface UsersResponse {
    data: UserRecord[];
  }

  class ZKLib {
    constructor(ip: string, port: number, timeout?: number, attendanceParser?: string);
    
    createSocket(): Promise<void>;
    disconnect(): Promise<void>;
    getInfo(): Promise<DeviceInfo>;
    getAttendances(): Promise<AttendanceResponse>;
    getUsers(): Promise<UsersResponse>;
    clearAttendanceLog(): Promise<void>;
    enableRealtime(): Promise<void>;
    disableRealtime(): Promise<void>;
    on(event: string, callback: (data: AttendanceRecord) => void): void;
  }

  export default ZKLib;
}

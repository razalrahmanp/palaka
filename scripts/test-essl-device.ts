/**
 * ESSL Device Test Script
 * Direct test script to verify connection to ESSL device
 * 
 * Usage: node --loader ts-node/esm scripts/test-essl-device.ts
 */

import { createESSLConnector } from '../src/lib/essl/connector';

const DEVICE_IP = '192.168.1.71';
const DEVICE_PORT = 4370;

async function testDevice() {
  console.log('='.repeat(60));
  console.log('ESSL Device Connection Test');
  console.log('='.repeat(60));
  console.log(`Device IP: ${DEVICE_IP}`);
  console.log(`Device Port: ${DEVICE_PORT}`);
  console.log('='.repeat(60));
  console.log('');

  const connector = createESSLConnector(DEVICE_IP, DEVICE_PORT);

  try {
    // Step 1: Test Connection
    console.log('Step 1: Testing connection...');
    await connector.connect();
    console.log('✅ Connection successful!\n');

    // Step 2: Get Device Info
    console.log('Step 2: Fetching device information...');
    const deviceInfo = await connector.getDeviceInfo();
    console.log('Device Information:');
    console.log('  - Serial Number:', deviceInfo.serialNumber);
    console.log('  - Firmware:', deviceInfo.firmwareVersion);
    console.log('  - Platform:', deviceInfo.platform);
    console.log('  - Device Name:', deviceInfo.deviceName);
    console.log('  - Enrolled Users:', deviceInfo.userCount);
    console.log('  - Attendance Logs:', deviceInfo.logCount);
    console.log('  - Log Capacity:', deviceInfo.logCapacity);
    console.log('✅ Device info retrieved!\n');

    // Step 3: Get Users
    console.log('Step 3: Fetching enrolled users...');
    const users = await connector.getUsers();
    console.log(`Found ${users.length} enrolled users:`);
    users.slice(0, 5).forEach((user) => {
      console.log(`  - User ID: ${user.userId}, Name: ${user.name || 'N/A'}`);
    });
    if (users.length > 5) {
      console.log(`  ... and ${users.length - 5} more users`);
    }
    console.log('✅ Users retrieved!\n');

    // Step 4: Get Attendance Logs
    console.log('Step 4: Fetching attendance logs...');
    const logs = await connector.getAttendanceLogs();
    console.log(`Found ${logs.length} attendance records`);
    if (logs.length > 0) {
      console.log('Recent 5 logs:');
      logs.slice(0, 5).forEach((log) => {
        const direction = log.direction === 0 ? 'IN' : 'OUT';
        console.log(`  - User: ${log.deviceUserId}, Time: ${log.recordTime.toLocaleString()}, Type: ${direction}`);
      });
      if (logs.length > 5) {
        console.log(`  ... and ${logs.length - 5} more records`);
      }
    } else {
      console.log('  No attendance logs found on device');
    }
    console.log('✅ Attendance logs retrieved!\n');

    // Step 5: Disconnect
    console.log('Step 5: Disconnecting...');
    await connector.disconnect();
    console.log('✅ Disconnected successfully!\n');

    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Register this device in the app using the API:');
    console.log('   POST /api/essl/devices');
    console.log('2. Sync attendance using:');
    console.log('   POST /api/essl/sync-attendance');
    console.log('3. Make sure employees have essl_device_id set in the database');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('\nTroubleshooting:');
    console.log('1. Verify device IP address is correct');
    console.log('2. Check if device is powered on and connected to network');
    console.log('3. Ensure port 4370 is accessible (check firewall)');
    console.log('4. Try pinging the device: ping ' + DEVICE_IP);
    console.log('5. Check if TCP/IP is enabled on the device menu');
    
    process.exit(1);
  }
}

// Run test
testDevice().catch(console.error);

/**
 * Register ESSL Device Script
 * Registers the ESSL device in the database
 */

const DEVICE_IP = '192.168.1.71';
const DEVICE_PORT = 4370;
const API_URL = 'http://localhost:3000/api/essl/devices';

async function registerDevice() {
  console.log('='.repeat(60));
  console.log('Registering ESSL Device');
  console.log('='.repeat(60));
  
  const deviceData = {
    device_name: 'Main Office Biometric Scanner',
    ip_address: DEVICE_IP,
    port: DEVICE_PORT,
    location: 'Front Entrance',
    device_type: 'fingerprint',
  };

  try {
    console.log('\nDevice Details:');
    console.log(JSON.stringify(deviceData, null, 2));
    console.log('\nRegistering device...');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deviceData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('\n✅ Device registered successfully!');
      console.log('\nDevice Information:');
      console.log('  - Device ID:', result.device.id);
      console.log('  - Serial Number:', result.device.device_serial);
      console.log('  - Enrolled Users:', result.device.enrolled_users);
      console.log('  - Firmware:', result.device.firmware_version);
      console.log('\n' + '='.repeat(60));
      console.log('SAVE THIS DEVICE ID FOR SYNCING:');
      console.log(result.device.id);
      console.log('='.repeat(60));
      
      return result.device.id;
    } else {
      console.error('\n❌ Registration failed:', result.error || result);
      return null;
    }
  } catch (error) {
    console.error('\n❌ Error registering device:', error);
    console.log('\nMake sure:');
    console.log('1. Development server is running (npm run dev)');
    console.log('2. Server is accessible at http://localhost:3000');
    return null;
  }
}

// Run registration
registerDevice().catch(console.error);

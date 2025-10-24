/**
 * Sync Attendance from ESSL Device
 * Pulls all attendance logs from device and syncs to database
 */

const API_URL = 'http://localhost:3000/api/essl/sync-attendance';

async function syncAttendance(deviceId: string, clearAfterSync = false) {
  console.log('='.repeat(60));
  console.log('Syncing Attendance from ESSL Device');
  console.log('='.repeat(60));
  console.log(`Device ID: ${deviceId}`);
  console.log(`Clear device logs after sync: ${clearAfterSync}`);
  console.log('='.repeat(60));
  console.log('\nStarting sync...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        clearAfterSync,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Attendance sync completed successfully!\n');
      console.log('Sync Statistics:');
      console.log('  - Total fetched from device:', result.stats.totalFetched);
      console.log('  - Successfully synced:', result.stats.synced);
      console.log('  - Skipped (duplicates/no employee):', result.stats.skipped);
      console.log('  - Errors:', result.stats.errors);
      console.log('  - Duration:', result.stats.duration);

      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️ Some errors occurred:');
        result.errors.slice(0, 5).forEach((err: string, i: number) => {
          console.log(`  ${i + 1}. ${err}`);
        });
        if (result.errors.length > 5) {
          console.log(`  ... and ${result.errors.length - 5} more errors`);
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('Next Steps:');
      console.log('1. Check attendance_punch_logs table for raw data');
      console.log('2. Process logs into attendance_records');
      console.log('3. Verify employee essl_device_id mappings');
      console.log('='.repeat(60));
    } else {
      console.error('\n❌ Sync failed:', result.error || result);
    }
  } catch (error) {
    console.error('\n❌ Error syncing attendance:', error);
    console.log('\nMake sure:');
    console.log('1. Development server is running (npm run dev)');
    console.log('2. Device is registered in database');
    console.log('3. Employees have essl_device_id set');
  }
}

// Get device ID from command line argument
const deviceId = process.argv[2];

if (!deviceId) {
  console.error('❌ Error: Device ID is required');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/sync-essl-attendance.ts <DEVICE_ID>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/sync-essl-attendance.ts 550e8400-e29b-41d4-a716-446655440000');
  process.exit(1);
}

// Run sync
syncAttendance(deviceId, false).catch(console.error);

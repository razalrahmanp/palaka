/**
 * ESSL Attendance Sync API
 * Pulls attendance logs from ESSL device and syncs to database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createESSLConnector, mapPunchType, mapVerificationMethod } from '@/lib/essl/connector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    let body = {};
    const contentType = request.headers.get('content-type');
    
    // Only parse JSON if content-type is application/json and body is not empty
    if (contentType?.includes('application/json')) {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    }
    
    const { deviceId, clearAfterSync = false } = body as { deviceId?: string; clearAfterSync?: boolean };

    // If no deviceId provided, sync all active devices
    if (!deviceId) {
      console.log('No deviceId provided, syncing all active devices...');
      
      const { data: devices, error: devicesError } = await supabase
        .from('essl_devices')
        .select('*')
        .eq('status', 'active');

      if (devicesError) {
        throw devicesError;
      }

      if (!devices || devices.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No active devices found to sync',
          totalRecords: 0
        });
      }

      // Sync all devices
      let totalRecords = 0;
      const results = [];

      for (const device of devices) {
        try {
          console.log(`\n📱 Syncing device: ${device.device_name} (${device.ip_address}:${device.port || 4370})`);
          const deviceResult = await syncSingleDevice(device.id, clearAfterSync);
          const resultData = await deviceResult.json();
          totalRecords += resultData.stats?.synced || 0;
          results.push({
            deviceId: device.id,
            deviceName: device.device_name,
            ipAddress: device.ip_address,
            success: true,
            records: resultData.stats?.synced || 0,
            message: resultData.message
          });
          console.log(`✅ Successfully synced ${device.device_name}: ${resultData.stats?.synced || 0} records`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Failed to sync device ${device.device_name}:`, errorMsg);
          results.push({
            deviceId: device.id,
            deviceName: device.device_name,
            ipAddress: device.ip_address,
            success: false,
            records: 0,
            error: errorMsg
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Sync completed: ${results.filter(r => r.success).length}/${devices.length} devices successful`,
        totalRecords,
        devicesAttempted: devices.length,
        devicesSuccessful: results.filter(r => r.success).length,
        devicesFailed: results.filter(r => !r.success).length,
        results
      });
    }

    // Sync single device
    const result = await syncSingleDevice(deviceId, clearAfterSync);
    return result;

  } catch (error) {
    console.error('❌ Attendance sync error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync attendance',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

async function syncSingleDevice(deviceId: string, clearAfterSync: boolean = false) {
  try {
    console.log(`Starting attendance sync for device: ${deviceId}`);

    // Get device details from database
    const { data: device, error: deviceError } = await supabase
      .from('essl_devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found in database' },
        { status: 404 }
      );
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('device_sync_logs')
      .insert({
        device_id: deviceId,
        sync_type: 'attendance',
        sync_status: 'started',
        records_synced: 0,
      })
      .select()
      .single();

    const startTime = Date.now();

    try {
      // Connect to device
      const connector = createESSLConnector(device.ip_address, device.port || 4370);
      await connector.connect();

      // Fetch attendance logs
      const logs = await connector.getAttendanceLogs();
      console.log(`Fetched ${logs.length} attendance records from device`);

      let syncedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];
      const missingUserIds = new Set<string>();

      // Fetch all employee mappings in one query
      const { data: employeeMappings } = await supabase
        .from('employees')
        .select('id, essl_device_id')
        .not('essl_device_id', 'is', null);

      // Create a map for quick lookup
      const deviceUserToEmployeeMap = new Map(
        employeeMappings?.map(emp => [emp.essl_device_id, emp.id]) || []
      );

      // Prepare batch insert data
      const punchLogsToInsert = [];
      
      for (const log of logs) {
        const employeeId = deviceUserToEmployeeMap.get(log.deviceUserId);

        if (!employeeId) {
          if (!missingUserIds.has(log.deviceUserId)) {
            missingUserIds.add(log.deviceUserId);
          }
          skippedCount++;
          continue;
        }

        // Device sends IST time, store it as-is without any conversion
        const deviceTime = log.recordTime;
        
        // Format as ISO string but preserve the IST timezone
        // Don't use .toISOString() as it converts to UTC
        const year = deviceTime.getFullYear();
        const month = String(deviceTime.getMonth() + 1).padStart(2, '0');
        const day = String(deviceTime.getDate()).padStart(2, '0');
        const hours = String(deviceTime.getHours()).padStart(2, '0');
        const minutes = String(deviceTime.getMinutes()).padStart(2, '0');
        const seconds = String(deviceTime.getSeconds()).padStart(2, '0');
        
        // Store as IST timestamp (no timezone conversion)
        const istTimestamp = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;

        punchLogsToInsert.push({
          employee_id: employeeId,
          device_id: deviceId,
          punch_time: istTimestamp, // Store IST time without UTC conversion
          punch_type: mapPunchType(log.direction),
          verification_method: mapVerificationMethod(log.verifyMode),
          verification_quality: 90,
          device_user_id: log.deviceUserId,
          raw_data: {
            userSN: log.userSN,
            direction: log.direction,
            verifyMode: log.verifyMode,
          },
          processed: false,
        });
      }

      // Batch insert in chunks of 500 to avoid payload limits
      const BATCH_SIZE = 500;
      console.log(`Inserting ${punchLogsToInsert.length} punch logs in batches of ${BATCH_SIZE}...`);
      console.log(`Duplication will be automatically handled by unique constraint: (employee_id, device_id, punch_time)`);
      
      for (let i = 0; i < punchLogsToInsert.length; i += BATCH_SIZE) {
        const batch = punchLogsToInsert.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        
        try {
          // Use upsert with column names for the unique constraint
          // This will skip duplicates automatically (ignoreDuplicates: true)
          const { error: batchError } = await supabase
            .from('attendance_punch_logs')
            .upsert(batch, { 
              onConflict: 'employee_id,device_id,punch_time',
              ignoreDuplicates: true // Skip duplicates, don't throw error
            });

          if (batchError) {
            console.error(`Batch ${batchNum} error:`, batchError.message);
            errors.push(`Batch ${batchNum}: ${batchError.message}`);
            skippedCount += batch.length;
          } else {
            // Count successful inserts (batch.length = all records processed)
            // With ignoreDuplicates, duplicates are silently skipped
            syncedCount += batch.length;
            console.log(`Batch ${batchNum}: Processed ${batch.length} records (duplicates auto-skipped)`);
          }
        } catch (error) {
          console.error(`Batch ${batchNum} exception:`, error);
          errors.push(`Batch ${batchNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          skippedCount += batch.length;
        }
      }

      // Optionally clear device logs after successful sync
      if (clearAfterSync && syncedCount > 0) {
        await connector.clearAttendanceLogs();
        console.log('Device logs cleared after sync');
      }

      // Update last connected time
      await supabase
        .from('essl_devices')
        .update({ last_connected: new Date().toISOString() })
        .eq('id', deviceId);

      await connector.disconnect();

      const duration = Math.round((Date.now() - startTime) / 1000);

      // Log summary of missing user IDs
      if (missingUserIds.size > 0) {
        console.log(`ℹ️ Attendance Sync Complete: ${syncedCount} synced, ${skippedCount} skipped (unmapped device users: ${Array.from(missingUserIds).sort().join(', ')})`);
      } else {
        console.log(`✅ Attendance Sync Complete: ${syncedCount} records synced successfully`);
      }

      // Update sync log
      await supabase
        .from('device_sync_logs')
        .update({
          sync_status: 'completed',
          records_synced: syncedCount,
          sync_duration: duration,
        })
        .eq('id', syncLog?.id);

      return NextResponse.json({
        success: true,
        message: 'Attendance sync completed',
        stats: {
          totalFetched: logs.length,
          synced: syncedCount,
          skipped: skippedCount,
          unmappedUserIds: Array.from(missingUserIds),
          errors: errors.length,
          duration: `${duration}s`,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (syncError) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const errorMessage = syncError instanceof Error ? syncError.message : 'Sync failed';
      
      console.error(`❌ Sync failed for device ${device.device_name}:`, errorMessage);

      // Update sync log with error
      if (syncLog?.id) {
        await supabase
          .from('device_sync_logs')
          .update({
            sync_status: 'failed',
            sync_duration: duration,
            error_message: errorMessage,
          })
          .eq('id', syncLog.id);
      }

      // Return error details instead of throwing
      return NextResponse.json({
        success: false,
        error: errorMessage,
        deviceInfo: {
          id: device.id,
          name: device.device_name,
          ip: device.ip_address,
          port: device.port || 4370
        },
        stats: {
          duration: `${duration}s`
        }
      }, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Device sync error:', errorMessage);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

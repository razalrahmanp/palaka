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
    const { deviceId, clearAfterSync = false } = await request.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

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

      // Process each log
      for (const log of logs) {
        try {
          // Find employee by device user ID (essl_device_id)
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('essl_device_id', log.deviceUserId)
            .single();

          if (!employee) {
            console.warn(`Employee not found for device user ID: ${log.deviceUserId}`);
            skippedCount++;
            continue;
          }

          // Insert punch log (raw log entry)
          const { error: punchError } = await supabase
            .from('attendance_punch_logs')
            .insert({
              employee_id: employee.id,
              device_id: deviceId,
              punch_time: log.recordTime.toISOString(),
              punch_type: mapPunchType(log.direction),
              verification_method: mapVerificationMethod(log.verifyMode),
              verification_quality: 90, // Default quality
              device_user_id: log.deviceUserId,
              raw_data: {
                userSN: log.userSN,
                direction: log.direction,
                verifyMode: log.verifyMode,
              },
              processed: false,
            })
            .select()
            .single();

          if (punchError) {
            // Check if duplicate
            if (punchError.code === '23505') {
              skippedCount++;
              continue;
            }
            errors.push(`Error inserting punch log: ${punchError.message}`);
            continue;
          }

          syncedCount++;
        } catch (logError) {
          console.error('Error processing log:', logError);
          errors.push(logError instanceof Error ? logError.message : 'Unknown error');
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
          errors: errors.length,
          duration: `${duration}s`,
        },
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (syncError) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const errorMessage = syncError instanceof Error ? syncError.message : 'Sync failed';

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

      throw syncError;
    }
  } catch (error) {
    console.error('Attendance sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}

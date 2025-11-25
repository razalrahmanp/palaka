/**
 * Client-Initiated ESSL Sync API
 * 
 * This endpoint is called by browsers that are on the same local network as the ESSL device.
 * Unlike the regular sync endpoint (which runs on Vercel and can't reach local devices),
 * this endpoint is called FROM a client who CAN reach the device.
 * 
 * Flow:
 * 1. User on 192.168.1.90 (same network as device at 192.168.1.71)
 * 2. Their browser calls this API with deviceIp and deviceId
 * 3. This API runs the sync logic server-side (which works because request comes from their network context)
 * 4. Data is stored in database for all users to access
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseClient } from '@/lib/supabaseClient';
import { createESSLConnector } from '@/lib/essl/connector';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for sync operation

interface ClientSyncRequest {
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  clientInitiated: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: ClientSyncRequest = await request.json();
    const { deviceId, deviceIp, devicePort } = body;

    // Validate required fields
    if (!deviceId || !deviceIp) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceId, deviceIp' },
        { status: 400 }
      );
    }

    // Get client network info
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    console.log('🔄 Client-initiated sync request');
    console.log(`   Client IP: ${clientIp}`);
    console.log(`   Device: ${deviceIp}:${devicePort}`);
    console.log(`   Device ID: ${deviceId}`);

    // Use the supabase client
    const supabase = supabaseClient;

    // Get device info from database
    const { data: device, error: deviceError } = await supabase
      .from('essl_devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      console.error('❌ Device not found:', deviceId);
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Verify device IP matches (security check)
    if (device.ip_address !== deviceIp) {
      console.error('❌ Device IP mismatch');
      console.error(`   Expected: ${device.ip_address}`);
      console.error(`   Received: ${deviceIp}`);
      return NextResponse.json(
        { error: 'Device IP mismatch - possible security issue' },
        { status: 400 }
      );
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('essl_sync_logs')
      .insert({
        device_id: deviceId,
        status: 'in_progress',
        initiated_by: 'client',
        client_ip: clientIp,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('❌ Failed to create sync log:', syncLogError);
    }

    const syncLogId = syncLog?.id;

    try {
      // Connect to ESSL device
      console.log(`📡 Attempting to connect to device...`);
      const connector = createESSLConnector(deviceIp, devicePort);
      
      // Try to connect with retries
      const connected = await connector.connect(2);
      
      if (!connected) {
        throw new Error('Failed to connect to device');
      }

      console.log('✅ Connected to device, fetching attendance logs...');

      // Get attendance logs
      const logs = await connector.getAttendanceLogs();
      console.log(`📊 Fetched ${logs.length} attendance records from device`);

      // Disconnect from device
      await connector.disconnect();

      if (logs.length === 0) {
        console.log('ℹ️  No new attendance logs found');
        
        // Update sync log
        if (syncLogId) {
          await supabase
            .from('essl_sync_logs')
            .update({
              status: 'completed',
              records_synced: 0,
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime,
            })
            .eq('id', syncLogId);
        }

        return NextResponse.json({
          success: true,
          recordCount: 0,
          message: 'No new attendance logs found',
          clientIp,
          duration: Date.now() - startTime,
        });
      }

      // Get employee mappings
      const { data: employees } = await supabase
        .from('employees')
        .select('id, essl_user_id');

      const employeeMap = new Map(
        employees?.map((emp: { essl_user_id?: string | number; id: string }) => [emp.essl_user_id?.toString(), emp.id]) || []
      );

      // Prepare batch insert
      const attendanceRecords = logs
        .map((log) => {
          const employeeId = employeeMap.get(log.deviceUserId);
          
          if (!employeeId) {
            console.warn(`⚠️  No employee mapping for ESSL user ID: ${log.deviceUserId}`);
            return null;
          }

          return {
            employee_id: employeeId,
            device_id: deviceId,
            punch_time: log.recordTime.toISOString(),
            punch_type: log.direction === 0 ? 'in' : 'out',
            verify_mode: log.verifyMode,
            user_sn: log.userSN,
            device_user_id: log.deviceUserId,
            synced_at: new Date().toISOString(),
          };
        })
        .filter((record) => record !== null);

      console.log(`💾 Inserting ${attendanceRecords.length} records into database...`);

      // Batch insert attendance records
      const { data: insertedRecords, error: insertError } = await supabase
        .from('essl_punch_logs')
        .upsert(attendanceRecords, {
          onConflict: 'employee_id,device_id,punch_time',
          ignoreDuplicates: true,
        })
        .select();

      if (insertError) {
        console.error('❌ Failed to insert attendance records:', insertError);
        throw insertError;
      }

      const recordsInserted = insertedRecords?.length || 0;
      console.log(`✅ Successfully inserted ${recordsInserted} new records`);

      // Update sync log
      if (syncLogId) {
        await supabase
          .from('essl_sync_logs')
          .update({
            status: 'completed',
            records_synced: recordsInserted,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
          })
          .eq('id', syncLogId);
      }

      // Return success response
      return NextResponse.json({
        success: true,
        recordCount: recordsInserted,
        totalFetched: logs.length,
        message: `Successfully synced ${recordsInserted} records`,
        clientIp,
        duration: Date.now() - startTime,
        deviceInfo: {
          id: device.id,
          name: device.name,
          ip: device.ip_address,
          port: device.port,
        },
      });

    } catch (syncError) {
      // Handle sync errors
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
      console.error('❌ Sync failed:', errorMessage);

      // Update sync log with error
      if (syncLogId) {
        await supabase
          .from('essl_sync_logs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
          })
          .eq('id', syncLogId);
      }

      // Check if it's a connection error
      const isConnectionError = 
        errorMessage.toLowerCase().includes('connect') ||
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('econnrefused') ||
        errorMessage.toLowerCase().includes('unreachable');

      if (isConnectionError) {
        return NextResponse.json({
          success: false,
          error: errorMessage,
          deviceUnreachable: true,
          clientIp,
          suggestion: 'Ensure you are on the same network as the ESSL device (192.168.1.x). The device might be powered off, disconnected, or blocked by a firewall.',
        }, { status: 200 }); // Return 200 for graceful client handling
      }

      // Other errors
      return NextResponse.json({
        success: false,
        error: errorMessage,
        clientIp,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Client sync API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

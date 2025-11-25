/**
 * Client-Side ESSL Sync Proxy
 * 
 * This endpoint is designed to work with Vercel deployment by having the CLIENT
 * perform the actual device connection (since the client is on the same network),
 * then send the data to this endpoint for database insertion.
 * 
 * Flow:
 * 1. Client browser connects to ESSL device (192.168.1.x) directly
 * 2. Client fetches attendance logs from device
 * 3. Client sends logs to this API
 * 4. API validates and inserts into database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AttendanceLog {
  userSN: string;
  deviceUserId: string;
  recordTime: string; // ISO date string
  direction: number;
  verifyMode: number;
}

interface SyncRequestBody {
  deviceId: string;
  logs: AttendanceLog[];
  deviceInfo?: {
    ip: string;
    port: number;
    serialNumber?: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SyncRequestBody = await request.json();
    const { deviceId, logs, deviceInfo } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { success: false, error: 'Logs array is required' },
        { status: 400 }
      );
    }

    // Get device from database
    const { data: device, error: deviceError } = await supabase
      .from('essl_devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    // Get employee mappings
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, essl_user_id');

    if (empError) {
      console.error('Failed to fetch employees:', empError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch employee mappings' },
        { status: 500 }
      );
    }

    const employeeMap = new Map(
      employees?.map((emp) => [emp.essl_user_id?.toString(), emp.id]) || []
    );

    // Transform logs for database insertion
    const transformedLogs = logs
      .map((log) => {
        const employeeId = employeeMap.get(log.deviceUserId);
        if (!employeeId) {
          console.warn(`No employee mapping for device user ID: ${log.deviceUserId}`);
          return null;
        }

        return {
          employee_id: employeeId,
          device_id: deviceId,
          punch_time: log.recordTime,
          punch_type: log.direction === 0 ? 'check_in' : 'check_out',
          verify_mode: log.verifyMode,
          device_user_id: log.deviceUserId,
          raw_log: log,
        };
      })
      .filter((log): log is NonNullable<typeof log> => log !== null);

    // Insert logs (with duplicate handling)
    let insertedCount = 0;
    if (transformedLogs.length > 0) {
      const { error: insertError } = await supabase
        .from('punch_logs')
        .upsert(transformedLogs, {
          onConflict: 'employee_id,device_id,punch_time',
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error('Failed to insert logs:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to insert logs' },
          { status: 500 }
        );
      }

      insertedCount = transformedLogs.length;
    }

    // Update device last sync time
    await supabase
      .from('essl_devices')
      .update({ 
        last_sync: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', deviceId);

    // Create sync log
    await supabase.from('sync_logs').insert({
      device_id: deviceId,
      status: 'success',
      records_synced: insertedCount,
      duration_ms: Date.now() - startTime,
      message: `Client-side sync successful`,
      metadata: {
        totalLogs: logs.length,
        insertedCount,
        unmappedUsers: logs.length - transformedLogs.length,
        deviceInfo,
      },
    });

    return NextResponse.json({
      success: true,
      recordsProcessed: logs.length,
      recordsInserted: insertedCount,
      unmappedUsers: logs.length - transformedLogs.length,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    console.error('Client sync error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

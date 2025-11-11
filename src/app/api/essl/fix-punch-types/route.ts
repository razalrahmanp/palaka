/**
 * Fix Punch Types API
 * Corrects all punch types by alternating IN/OUT based on time sequence
 * This fixes the issue where devices in auto-mode send all punches as direction=0 (all marked as IN)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Starting punch type correction...');

    // Fetch all employees with punch logs
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_id')
      .not('essl_device_id', 'is', null);

    if (empError) {
      console.error('Error fetching employees:', empError);
      return NextResponse.json(
        { success: false, error: empError.message },
        { status: 500 }
      );
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No employees found with ESSL device mappings',
        stats: { totalEmployees: 0, correctedPunches: 0 },
      });
    }

    console.log(`Processing ${employees.length} employees...`);

    let totalCorrected = 0;
    const employeeDetails = [];

    for (const employee of employees) {
      // Get all punch logs for this employee, ordered by time
      const { data: punchLogs, error: logsError } = await supabase
        .from('attendance_punch_logs')
        .select('id, punch_time, punch_type, employee_id')
        .eq('employee_id', employee.id)
        .order('punch_time', { ascending: true });

      if (logsError) {
        console.error(`Error fetching logs for employee ${employee.name}:`, logsError);
        continue;
      }

      if (!punchLogs || punchLogs.length === 0) continue;

      // Alternate punch types: IN -> OUT -> IN -> OUT
      let expectedType: 'IN' | 'OUT' = 'IN';
      const updates = [];

      for (const log of punchLogs) {
        if (log.punch_type !== expectedType) {
          updates.push({
            id: log.id,
            punch_type: expectedType,
            punch_time: log.punch_time,
            old_type: log.punch_type,
          });
        }

        // Alternate for next punch
        expectedType = expectedType === 'IN' ? 'OUT' : 'IN';
      }

      // Batch update corrected punch types
      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabase
            .from('attendance_punch_logs')
            .update({ punch_type: update.punch_type })
            .eq('id', update.id);

          if (updateError) {
            console.error(`Error updating punch log ${update.id}:`, updateError);
          } else {
            totalCorrected++;
          }
        }

        employeeDetails.push({
          employee_id: employee.employee_id,
          name: employee.name,
          total_punches: punchLogs.length,
          corrected: updates.length,
          changes: updates.map(u => ({
            time: u.punch_time,
            old: u.old_type,
            new: u.punch_type,
          })),
        });

        console.log(`✅ ${employee.name}: Corrected ${updates.length}/${punchLogs.length} punches`);
      }
    }

    console.log(`🎉 Correction complete! Total corrected: ${totalCorrected}`);

    return NextResponse.json({
      success: true,
      message: 'Punch type correction completed',
      stats: {
        totalEmployees: employees.length,
        employeesProcessed: employeeDetails.length,
        totalCorrected,
      },
      details: employeeDetails,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in punch type correction:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

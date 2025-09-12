// lib/expense-integrations/vehicleExpenseIntegration.ts
import { supabase } from "@/lib/supabaseAdmin";

export interface VehicleExpenseParams {
  expenseId: string;
  truckId: string;
  amount: number;
  expenseDate: string;
  description: string;
  createdBy: string;
  expenseType: 'fuel' | 'maintenance' | 'insurance' | 'registration' | 'repair' | 'other';
  odometer?: number;
  quantity?: number;
  unitPrice?: number;
  location?: string;
  vendorName?: string;
  receiptNumber?: string;
}

export interface VehicleExpenseResult {
  success: boolean;
  error?: string;
  vehicleExpenseId?: string;
  maintenanceUpdateId?: string;
}

/**
 * Creates vehicle expense tracking tables if they don't exist
 */
async function ensureVehicleExpenseTables() {
  try {
    // Create vehicle_expense_logs table
    const createVehicleExpenseLogsTable = `
      CREATE TABLE IF NOT EXISTS vehicle_expense_logs (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        truck_id uuid NOT NULL,
        expense_id uuid NOT NULL,
        expense_type text NOT NULL CHECK (expense_type = ANY (ARRAY['fuel'::text, 'maintenance'::text, 'insurance'::text, 'registration'::text, 'repair'::text, 'other'::text])),
        amount numeric NOT NULL,
        expense_date date NOT NULL,
        description text,
        odometer_reading numeric,
        quantity numeric,
        unit_price numeric,
        location text,
        vendor_name text,
        receipt_number text,
        created_by uuid,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        CONSTRAINT vehicle_expense_logs_pkey PRIMARY KEY (id),
        CONSTRAINT vehicle_expense_logs_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id),
        CONSTRAINT vehicle_expense_logs_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id),
        CONSTRAINT vehicle_expense_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
      );
    `;

    // Create vehicle_maintenance_logs table
    const createMaintenanceLogsTable = `
      CREATE TABLE IF NOT EXISTS vehicle_maintenance_logs (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        truck_id uuid NOT NULL,
        expense_id uuid,
        maintenance_type text NOT NULL,
        description text NOT NULL,
        cost numeric NOT NULL,
        maintenance_date date NOT NULL,
        odometer_reading numeric,
        next_maintenance_due_date date,
        next_maintenance_odometer numeric,
        vendor_name text,
        receipt_number text,
        status text DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
        created_by uuid,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        CONSTRAINT vehicle_maintenance_logs_pkey PRIMARY KEY (id),
        CONSTRAINT vehicle_maintenance_logs_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id),
        CONSTRAINT vehicle_maintenance_logs_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id),
        CONSTRAINT vehicle_maintenance_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
      );
    `;

    // Execute table creation queries
    const { error: expenseTableError } = await supabase.rpc('exec_sql', { sql: createVehicleExpenseLogsTable });
    if (expenseTableError) {
      console.error('Error creating vehicle_expense_logs table:', expenseTableError);
    }

    const { error: maintenanceTableError } = await supabase.rpc('exec_sql', { sql: createMaintenanceLogsTable });
    if (maintenanceTableError) {
      console.error('Error creating vehicle_maintenance_logs table:', maintenanceTableError);
    }

    console.log('✅ Vehicle expense tables ensured');
    return true;
  } catch (error) {
    console.error('Error ensuring vehicle expense tables:', error);
    return false;
  }
}

/**
 * Creates vehicle expense integration and tracking records
 */
export async function createVehicleExpenseIntegration(params: VehicleExpenseParams): Promise<VehicleExpenseResult> {
  const { 
    expenseId, 
    truckId, 
    amount, 
    expenseDate, 
    description, 
    createdBy,
    expenseType,
    odometer,
    quantity,
    unitPrice,
    location,
    vendorName,
    receiptNumber
  } = params;

  try {
    console.log('🚛 Creating vehicle expense integration for expense:', expenseId);

    // Ensure tables exist
    await ensureVehicleExpenseTables();

    // 1. Create vehicle expense log
    const { data: vehicleExpense, error: expenseError } = await supabase
      .from('vehicle_expense_logs')
      .insert({
        truck_id: truckId,
        expense_id: expenseId,
        expense_type: expenseType,
        amount: amount,
        expense_date: expenseDate,
        description: description,
        odometer_reading: odometer,
        quantity: quantity,
        unit_price: unitPrice,
        location: location,
        vendor_name: vendorName,
        receipt_number: receiptNumber,
        created_by: createdBy
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating vehicle expense log:', expenseError);
      return { success: false, error: 'Failed to create vehicle expense log' };
    }

    console.log('✅ Created vehicle expense log:', vehicleExpense.id);

    let maintenanceUpdateId = null;

    // 2. If it's a maintenance expense, create maintenance log and update truck
    if (expenseType === 'maintenance' || expenseType === 'repair') {
      const { data: maintenanceLog, error: maintenanceError } = await supabase
        .from('vehicle_maintenance_logs')
        .insert({
          truck_id: truckId,
          expense_id: expenseId,
          maintenance_type: expenseType === 'repair' ? 'Repair' : 'Regular Maintenance',
          description: description,
          cost: amount,
          maintenance_date: expenseDate,
          odometer_reading: odometer,
          vendor_name: vendorName,
          receipt_number: receiptNumber,
          status: 'completed',
          created_by: createdBy
        })
        .select()
        .single();

      if (maintenanceError) {
        console.error('Error creating maintenance log:', maintenanceError);
      } else {
        maintenanceUpdateId = maintenanceLog.id;
        console.log('✅ Created maintenance log:', maintenanceUpdateId);

        // Update truck's last maintenance date
        await supabase
          .from('trucks')
          .update({
            last_maintenance_date: expenseDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', truckId);

        console.log('✅ Updated truck maintenance date');
      }
    }

    // 3. Update truck's current odometer if provided
    if (odometer && odometer > 0) {
      const { data: currentTruck, error: truckError } = await supabase
        .from('trucks')
        .select('current_odometer')
        .eq('id', truckId)
        .single();

      if (!truckError && currentTruck && (currentTruck.current_odometer || 0) < odometer) {
        await supabase
          .from('trucks')
          .update({
            current_odometer: odometer,
            updated_at: new Date().toISOString()
          })
          .eq('id', truckId);

        console.log('✅ Updated truck odometer reading');
      }
    }

    // 4. Update expense record to link with vehicle
    await supabase
      .from('expenses')
      .update({
        entity_type: 'truck',
        entity_id: truckId,
        entity_reference_id: vehicleExpense.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId);

    console.log('✅ Linked expense to vehicle');

    return {
      success: true,
      vehicleExpenseId: vehicleExpense.id,
      maintenanceUpdateId: maintenanceUpdateId
    };

  } catch (error) {
    console.error('Error in vehicle expense integration:', error);
    return { success: false, error: 'Failed to create vehicle expense integration' };
  }
}

/**
 * Gets vehicle expense history for a truck
 */
export async function getVehicleExpenseHistory(truckId: string) {
  try {
    const { data: expenses, error } = await supabase
      .from('vehicle_expense_logs')
      .select(`
        id,
        expense_type,
        amount,
        expense_date,
        description,
        odometer_reading,
        quantity,
        unit_price,
        location,
        vendor_name,
        receipt_number,
        expenses (
          id,
          payment_method,
          bank_account_id
        )
      `)
      .eq('truck_id', truckId)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle expense history:', error);
      return { success: false, error: 'Failed to fetch expense history' };
    }

    return { success: true, expenses: expenses || [] };
  } catch (error) {
    console.error('Error in getVehicleExpenseHistory:', error);
    return { success: false, error: 'Failed to fetch expense history' };
  }
}

/**
 * Gets vehicle maintenance history for a truck
 */
export async function getVehicleMaintenanceHistory(truckId: string) {
  try {
    const { data: maintenance, error } = await supabase
      .from('vehicle_maintenance_logs')
      .select(`
        id,
        maintenance_type,
        description,
        cost,
        maintenance_date,
        odometer_reading,
        next_maintenance_due_date,
        next_maintenance_odometer,
        vendor_name,
        receipt_number,
        status
      `)
      .eq('truck_id', truckId)
      .order('maintenance_date', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle maintenance history:', error);
      return { success: false, error: 'Failed to fetch maintenance history' };
    }

    return { success: true, maintenance: maintenance || [] };
  } catch (error) {
    console.error('Error in getVehicleMaintenanceHistory:', error);
    return { success: false, error: 'Failed to fetch maintenance history' };
  }
}

/**
 * Gets vehicle expense summary for a truck
 */
export async function getVehicleExpenseSummary(truckId: string, period?: '30d' | '90d' | '1y') {
  try {
    let dateFilter = '';
    if (period) {
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      dateFilter = fromDate.toISOString().split('T')[0];
    }

    let query = supabase
      .from('vehicle_expense_logs')
      .select('expense_type, amount, expense_date')
      .eq('truck_id', truckId);

    if (dateFilter) {
      query = query.gte('expense_date', dateFilter);
    }

    const { data: expenses, error } = await query
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching vehicle expense summary:', error);
      return { success: false, error: 'Failed to fetch expense summary' };
    }

    // Calculate summary by expense type
    const summary = (expenses || []).reduce((acc, expense) => {
      if (!acc[expense.expense_type]) {
        acc[expense.expense_type] = { total: 0, count: 0 };
      }
      acc[expense.expense_type].total += expense.amount;
      acc[expense.expense_type].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const totalAmount = (expenses || []).reduce((sum, expense) => sum + expense.amount, 0);

    return { 
      success: true, 
      summary: {
        totalAmount,
        expenseBreakdown: summary,
        period: period || 'all',
        recordCount: expenses?.length || 0
      }
    };
  } catch (error) {
    console.error('Error in getVehicleExpenseSummary:', error);
    return { success: false, error: 'Failed to fetch expense summary' };
  }
}

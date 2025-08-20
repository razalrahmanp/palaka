// API endpoint to create the missing sales_order_payment_summary view
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    const createViewSQL = `
CREATE OR REPLACE VIEW public.sales_order_payment_summary AS
SELECT 
    so.id as sales_order_id,
    c.name as customer_name,
    so.final_price as order_total,
    COALESCE(so.total_paid, 0) as total_paid,
    (so.final_price - COALESCE(so.total_paid, 0)) as balance_due,
    so.payment_status,
    COUNT(p.id) as payment_count,
    MAX(p.payment_date) as last_payment_date,
    COALESCE(inv.invoice_number, 'N/A') as invoice_number,
    COALESCE(inv.status, 'not_invoiced') as invoice_status
FROM 
    public.sales_orders so
    LEFT JOIN public.customers c ON so.customer_id = c.id
    LEFT JOIN public.payments p ON so.id = p.sales_order_id
    LEFT JOIN public.invoices inv ON so.id = inv.sales_order_id
GROUP BY 
    so.id, 
    c.name, 
    so.final_price, 
    so.total_paid, 
    so.payment_status,
    inv.invoice_number,
    inv.status
ORDER BY 
    balance_due DESC;
`;

    // Try to execute the SQL using Supabase's RPC function or raw query
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: createViewSQL 
    });

    if (error) {
      console.error('Error creating view with RPC:', error);
      
      // Alternative: Try using a simple query to test connection
      const { error: testError } = await supabase
        .from('sales_orders')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Database connection error:', testError);
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: testError.message
        }, { status: 500 });
      }

      // If connection works but view creation failed
      return NextResponse.json({ 
        error: 'View creation failed. Please run the SQL manually.',
        sql: createViewSQL,
        suggestion: 'Go to your Supabase dashboard > SQL Editor and run the provided SQL'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'View created successfully',
      data: data
    });

  } catch (error) {
    console.error('Unexpected error creating view:', error);
    return NextResponse.json({ 
      error: 'Failed to create view',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create the sales_order_payment_summary view
// This script creates the missing database view using Supabase admin client

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const createViewSQL = `
-- Create the sales_order_payment_summary view
-- This view provides a comprehensive summary of sales orders with payment information

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
    -- Invoice information
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

async function createView() {
    try {
        console.log('Creating sales_order_payment_summary view...');

        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            sql: createViewSQL
        });

        if (error) {
            console.error('Error creating view:', error);

            // Try alternative method using raw SQL
            const { error: rawError } = await supabaseAdmin
                .from('sales_orders')
                .select('*')
                .limit(1);

            if (rawError) {
                console.error('Database connection error:', rawError);
                return;
            }

            console.log('Connected to database successfully, but view creation failed.');
            console.log('You may need to run the SQL manually in your database admin panel.');
            console.log('\nSQL to execute:');
            console.log(createViewSQL);

        } else {
            console.log('✅ View created successfully:', data);
        }

    } catch (error) {
        console.error('Unexpected error:', error);
        console.log('\nPlease run this SQL manually in your Supabase SQL editor:');
        console.log(createViewSQL);
    }
}

createView();
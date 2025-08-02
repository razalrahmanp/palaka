// app/api/admin/setup-vendor-payments/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('Setting up vendor payment system...')
    
    // 1. Add additional fields to purchase_order_payments
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- Add columns if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_payments' AND column_name = 'payment_method') THEN
            ALTER TABLE purchase_order_payments ADD COLUMN payment_method text DEFAULT 'cash';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_payments' AND column_name = 'reference_number') THEN
            ALTER TABLE purchase_order_payments ADD COLUMN reference_number text;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_payments' AND column_name = 'notes') THEN
            ALTER TABLE purchase_order_payments ADD COLUMN notes text;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_payments' AND column_name = 'created_by') THEN
            ALTER TABLE purchase_order_payments ADD COLUMN created_by uuid REFERENCES users(id);
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_payments' AND column_name = 'status') THEN
            ALTER TABLE purchase_order_payments ADD COLUMN status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));
          END IF;
        END $$;
      `
    })

    // 2. Create vendor_payment_terms table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS vendor_payment_terms (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          supplier_id uuid NOT NULL REFERENCES suppliers(id),
          payment_terms_days integer DEFAULT 30,
          early_payment_discount_percentage numeric DEFAULT 0,
          early_payment_days integer DEFAULT 0,
          late_payment_penalty_percentage numeric DEFAULT 0,
          credit_limit numeric DEFAULT 0,
          is_active boolean DEFAULT true,
          created_at timestamp without time zone DEFAULT now(),
          created_by uuid REFERENCES users(id),
          CONSTRAINT vendor_payment_terms_pkey PRIMARY KEY (id)
        );
      `
    })

    // 3. Create vendor_bills table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS vendor_bills (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          supplier_id uuid NOT NULL REFERENCES suppliers(id),
          bill_number text NOT NULL,
          bill_date date NOT NULL,
          due_date date NOT NULL,
          total_amount numeric NOT NULL,
          paid_amount numeric DEFAULT 0,
          status text DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
          description text,
          tax_amount numeric DEFAULT 0,
          discount_amount numeric DEFAULT 0,
          purchase_order_id uuid REFERENCES purchase_orders(id),
          attachment_url text,
          created_by uuid REFERENCES users(id),
          created_at timestamp without time zone DEFAULT now(),
          updated_at timestamp without time zone DEFAULT now(),
          CONSTRAINT vendor_bills_pkey PRIMARY KEY (id)
        );
      `
    })

    // 4. Create vendor_payment_history table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS vendor_payment_history (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          supplier_id uuid NOT NULL REFERENCES suppliers(id),
          vendor_bill_id uuid REFERENCES vendor_bills(id),
          purchase_order_id uuid REFERENCES purchase_orders(id),
          amount numeric NOT NULL,
          payment_date date NOT NULL,
          payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other')),
          reference_number text,
          notes text,
          status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
          created_by uuid REFERENCES users(id),
          created_at timestamp without time zone DEFAULT now(),
          CONSTRAINT vendor_payment_history_pkey PRIMARY KEY (id)
        );
      `
    })

    // 5. Create indexes
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_vendor_bills_supplier_id ON vendor_bills(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON vendor_bills(status);
        CREATE INDEX IF NOT EXISTS idx_vendor_bills_due_date ON vendor_bills(due_date);
        CREATE INDEX IF NOT EXISTS idx_vendor_payment_history_supplier_id ON vendor_payment_history(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_vendor_payment_history_payment_date ON vendor_payment_history(payment_date);
      `
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Vendor payment system setup completed successfully' 
    })
  } catch (error) {
    console.error('Error setting up vendor payment system:', error)
    return NextResponse.json({ 
      error: 'Failed to setup vendor payment system',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

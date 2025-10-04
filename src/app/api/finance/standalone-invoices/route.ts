import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      customer_name, 
      customer_phone, 
      customer_email, 
      amount, 
      description, 
      date 
    } = body;

    console.log('🧾 Creating standalone invoice...', { customer_name, amount, description });

    // Validate required fields
    if (!customer_name || !amount || !description) {
      return NextResponse.json({ 
        error: "Missing required fields: customer_name, amount, and description are required" 
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ 
        error: "Amount must be greater than 0" 
      }, { status: 400 });
    }

    // Convert date to proper timestamp
    let createdAt = new Date().toISOString();
    if (date) {
      try {
        const invoiceDateObj = new Date(date);
        const currentTime = new Date();
        invoiceDateObj.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
        createdAt = invoiceDateObj.toISOString();
      } catch (error) {
        console.warn('Invalid invoice date provided, using current timestamp:', error);
      }
    }

    // Check if customer already exists
    let customerId = null;
    if (customer_phone || customer_email) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .or(`phone.eq.${customer_phone || ''},email.eq.${customer_email || ''}`)
        .single();
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
      }
    }

    // If no existing customer found, create a new one
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert([{
          name: customer_name,
          phone: customer_phone || null,
          email: customer_email || null,
          created_at: createdAt
        }])
        .select("id")
        .single();

      if (customerError) {
        console.error('❌ Error creating customer:', customerError);
        return NextResponse.json({ 
          error: `Failed to create customer: ${customerError.message}` 
        }, { status: 500 });
      }

      customerId = newCustomer.id;
    }

    // Create standalone invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert([{
        sales_order_id: null, // This is a standalone invoice
        customer_id: customerId,
        customer_name: `${customer_name} - ${description}`, // Include description in customer_name for now
        total: Number(amount),
        status: 'unpaid',
        paid_amount: 0,
        created_at: createdAt
      }])
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Error creating invoice:', invoiceError);
      return NextResponse.json({ 
        error: `Failed to create invoice: ${invoiceError.message}` 
      }, { status: 500 });
    }

    console.log('✅ Standalone invoice created:', invoice.id);

    // TODO: Create journal entry for the invoice
    // Dr. Accounts Receivable / Cr. Sales Revenue
    try {
      // Get the user ID - for now we'll use a default or fetch from auth
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'system';

      // Create journal entry header
      const { data: journalHeader, error: headerError } = await supabase
        .from("journal_entries")
        .insert([{
          entry_date: date || new Date().toISOString().split('T')[0],
          description: `Invoice ${invoice.id} - ${description}`,
          reference: `INV-${invoice.id}`,
          total_amount: Number(amount),
          created_by: userId,
          status: 'posted'
        }])
        .select("id")
        .single();

      if (headerError) {
        console.error('❌ Error creating journal header:', headerError);
      } else {
        // Create journal entry lines
        const journalLines = [
          {
            journal_entry_id: journalHeader.id,
            account_code: '1200', // Accounts Receivable
            debit: Number(amount),
            credit: 0,
            description: `A/R - ${customer_name}`
          },
          {
            journal_entry_id: journalHeader.id,
            account_code: '4000', // Sales Revenue
            debit: 0,
            credit: Number(amount),
            description: `Sales - ${description}`
          }
        ];

        const { error: linesError } = await supabase
          .from("journal_entry_lines")
          .insert(journalLines);

        if (linesError) {
          console.error('❌ Error creating journal lines:', linesError);
        } else {
          console.log('✅ Journal entry created for invoice:', invoice.id);
        }
      }
    } catch (journalError) {
      console.error('❌ Failed to create journal entry for invoice:', journalError);
      // Don't fail the invoice creation, but log the error
    }

    return NextResponse.json({ 
      data: invoice,
      message: "Standalone invoice created successfully",
      accounting_integration: true
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Standalone Invoice API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
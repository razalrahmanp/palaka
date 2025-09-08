// Test API endpoint to debug journal entry creation for payments
// src/app/api/debug/payment-journal/route.ts

import { supabase } from "@/lib/supabaseClient";
import { createPaymentJournalEntry } from "@/lib/journalHelper";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log('🔍 DEBUG: Testing payment journal entry creation...');
    
    // Get the most recent payment without a journal entry
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        method,
        date,
        reference,
        invoice_id
      `)
      .order('date', { ascending: false })
      .limit(5);
    
    if (paymentError) {
      console.error('Error fetching payments:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }
    
    if (!payments || payments.length === 0) {
      return NextResponse.json({ message: 'No payments found to test' });
    }
    
    // Check which payments already have journal entries
    const paymentIds = payments.map(p => p.id);
    const { data: existingEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('source_document_id')
      .eq('source_document_type', 'PAYMENT')
      .in('source_document_id', paymentIds);
    
    if (journalError) {
      console.error('Error checking existing journal entries:', journalError);
    }
    
    const existingIds = existingEntries?.map(je => je.source_document_id) || [];
    const paymentWithoutJournal = payments.find(p => !existingIds.includes(p.id));
    
    if (!paymentWithoutJournal) {
      return NextResponse.json({ 
        message: 'All recent payments already have journal entries',
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          hasJournalEntry: existingIds.includes(p.id)
        }))
      });
    }
    
    console.log('🎯 Testing journal entry creation for payment:', paymentWithoutJournal.id);
    
    // Create journal entry for this payment
    const journalResult = await createPaymentJournalEntry({
      paymentId: paymentWithoutJournal.id,
      amount: paymentWithoutJournal.amount,
      date: paymentWithoutJournal.date,
      reference: paymentWithoutJournal.reference,
      description: `Test journal entry for payment ${paymentWithoutJournal.id}`
    });
    
    if (journalResult.success) {
      // Fetch the created journal entry with lines
      const { data: journalEntry } = await supabase
        .from('journal_entries')
        .select(`
          id,
          journal_number,
          description,
          entry_date,
          status,
          journal_entry_lines (
            line_number,
            debit_amount,
            credit_amount,
            description,
            chart_of_accounts (
              account_code,
              account_name
            )
          )
        `)
        .eq('id', journalResult.journalEntryId)
        .single();
      
      return NextResponse.json({
        success: true,
        message: 'Journal entry created successfully',
        payment: paymentWithoutJournal,
        journalResult,
        journalEntry: journalEntry || 'Could not fetch created entry'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to create journal entry',
        payment: paymentWithoutJournal,
        error: journalResult.error
      });
    }
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check system status for journal entry creation
    console.log('🔍 DEBUG: Checking journal entry system status...');
    
    // 1. Check chart of accounts
    const { data: accounts, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, current_balance')
      .in('account_code', ['1010', '1200']);
    
    // 2. Check recent payments
    const { data: recentPayments, error: paymentError } = await supabase
      .from('payments')
      .select('id, amount, method, date')
      .order('date', { ascending: false })
      .limit(3);
    
    // 3. Check recent journal entries
    const { data: recentJournals, error: journalError } = await supabase
      .from('journal_entries')
      .select('id, journal_number, source_document_type, source_document_id, created_at')
      .eq('source_document_type', 'PAYMENT')
      .order('created_at', { ascending: false })
      .limit(3);
    
    return NextResponse.json({
      systemStatus: {
        accounts: accounts || [],
        accountError: accountError?.message,
        recentPayments: recentPayments || [],
        paymentError: paymentError?.message,
        recentJournals: recentJournals || [],
        journalError: journalError?.message
      },
      instructions: 'POST to this endpoint to test journal entry creation for the most recent payment'
    });
    
  } catch (error) {
    console.error('Debug GET endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Debug GET endpoint failed', details: errorMessage },
      { status: 500 }
    );
  }
}

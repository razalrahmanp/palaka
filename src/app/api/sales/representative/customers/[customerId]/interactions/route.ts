import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await context.params

    // Fetch customer interactions from multiple sources
    const [ordersResult, quotesResult, complaintsResult] = await Promise.all([
      // Orders as interactions
      supabase
        .from('sales_orders')
        .select(`
          id,
          status,
          created_at,
          final_price,
          notes
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),

      // Quotes as interactions (if you have a quotes table)
      supabase
        .from('quotes')
        .select(`
          id,
          status,
          created_at,
          total_amount,
          notes
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),

      // Complaints as interactions
      supabase
        .from('customer_complaints')
        .select(`
          id,
          status,
          category,
          subject,
          description,
          created_at,
          resolved_at
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
    ])

    // Process and combine interactions
    const interactions: Array<{
      id: string
      type: string
      description: string
      date: string
      outcome?: string
      details?: Record<string, unknown>
    }> = []

    // Add orders as interactions
    if (ordersResult.data) {
      ordersResult.data.forEach(order => {
        interactions.push({
          id: `order-${order.id}`,
          type: 'order',
          description: `Order #${order.id} - ${order.status}`,
          date: order.created_at,
          outcome: `₹${order.final_price?.toLocaleString()} - ${order.status}`,
          details: {
            amount: order.final_price,
            status: order.status,
            notes: order.notes
          }
        })
      })
    }

    // Add quotes as interactions (if quotes table exists)
    if (quotesResult.data) {
      quotesResult.data.forEach(quote => {
        interactions.push({
          id: `quote-${quote.id}`,
          type: 'quote',
          description: `Quote #${quote.id} - ${quote.status}`,
          date: quote.created_at,
          outcome: `₹${quote.total_amount?.toLocaleString()} - ${quote.status}`,
          details: {
            amount: quote.total_amount,
            status: quote.status,
            notes: quote.notes
          }
        })
      })
    }

    // Add complaints as interactions
    if (complaintsResult.data) {
      complaintsResult.data.forEach(complaint => {
        interactions.push({
          id: `complaint-${complaint.id}`,
          type: 'complaint',
          description: `${complaint.category}: ${complaint.subject}`,
          date: complaint.created_at,
          outcome: complaint.resolved_at ? 'Resolved' : 'Open',
          details: {
            category: complaint.category,
            subject: complaint.subject,
            description: complaint.description,
            status: complaint.status,
            resolved_at: complaint.resolved_at
          }
        })
      })
    }

    // Sort all interactions by date (most recent first)
    interactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      interactions,
      summary: {
        total_interactions: interactions.length,
        orders: interactions.filter(i => i.type === 'order').length,
        quotes: interactions.filter(i => i.type === 'quote').length,
        complaints: interactions.filter(i => i.type === 'complaint').length,
        last_interaction: interactions[0]?.date || null
      }
    })

  } catch (error) {
    console.error('Error fetching customer interactions:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabasePool'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ complaintId: string }> }
) {
  try {
    const { complaintId } = await context.params
    const body = await request.json()
    const { status, resolution, resolution_notes } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Update the complaint status
    const { data, error } = await supabase
      .from('customer_complaints')
      .update({
        status,
        resolution,
        resolution_notes,
        updated_at: new Date().toISOString(),
        ...(['resolved', 'closed'].includes(status) && { resolved_at: new Date().toISOString() })
      })
      .eq('id', complaintId)
      .select()
      .single()

    if (error) {
      console.error('Error updating complaint status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Complaint status updated successfully',
      complaint: data
    })

  } catch (error) {
    console.error('Error in complaint status update API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

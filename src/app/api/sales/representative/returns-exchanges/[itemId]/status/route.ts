import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabasePool'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params
    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Update the return status
    const { data, error } = await supabase
      .from('returns')
      .update({
        status,
        resolution_notes: notes,
        updated_at: new Date().toISOString(),
        ...(status === 'approved' && { approved_at: new Date().toISOString() }),
        ...(status === 'completed' && { completed_at: new Date().toISOString() })
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Error updating return status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Return status updated successfully',
      return: data
    })

  } catch (error) {
    console.error('Error in return status update API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

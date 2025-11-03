import { supabase } from '@/lib/supabasePool'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/crm/customers/[id]/visits - Get visit history for a customer
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from('customer_interactions')
      .select(`
        *,
        created_by_user:users!customer_interactions_created_by_fkey(id, name, email)
      `)
      .eq('customer_id', params.id)
      .eq('type', 'visit')
      .order('interaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching visit history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to include handled_by_name
    const visits = data.map(visit => ({
      ...visit,
      handled_by_name: Array.isArray(visit.created_by_user)
        ? visit.created_by_user[0]?.name
        : visit.created_by_user?.name || 'Unknown',
    }));

    return NextResponse.json(visits);
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crm/customers/[id]/visits - Record a new visit
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { notes, visit_type, interest_level, products_discussed, follow_up_required, follow_up_date } = body;

    // Get current user from request (you may need to adjust based on your auth implementation)
    // For now, using the first user or passing from request
    const userId = body.created_by || body.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Create visit notes with structured data
    const visitNotes = `
Visit Type: ${visit_type}
Interest Level: ${interest_level}
${products_discussed ? `Products Discussed: ${products_discussed}` : ''}

${notes}

${follow_up_required ? `Follow-up Required: ${follow_up_date || 'Date TBD'}` : ''}
`.trim();

    // Insert interaction record
    const { data: interaction, error: interactionError } = await supabase
      .from('customer_interactions')
      .insert({
        customer_id: params.id,
        type: 'visit',
        notes: visitNotes,
        interaction_date: new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (interactionError) {
      console.error('Error creating interaction:', interactionError);
      return NextResponse.json({ error: interactionError.message }, { status: 500 });
    }

    // Update customer's last visit date
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        customer_visit_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
        updated_by: userId,
        // Update status to Active if currently Lead and interest is high/medium
        ...(interest_level === 'high' || interest_level === 'medium' ? { status: 'Active' } : {}),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      // Don't fail the request if this update fails
    }

    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

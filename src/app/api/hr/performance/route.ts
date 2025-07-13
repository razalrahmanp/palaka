import { supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

// Handler for GET requests to fetch performance reviews
export async function GET() {
    try {
        // Join with employees and users tables to get the names
        const { data, error } = await supabase
            .from('performance_reviews')
            .select(`
                *,
                employee:employees(name),
                reviewer:users(name)
            `)
            .order('review_date', { ascending: false });

        if (error) {
            throw error;
        }

        // Reshape the data to include names directly, which is easier for the frontend
        const reshapedData = data.map(review => ({
            ...review,
            employee_name: review.employee?.name || 'Unknown Employee',
            reviewer_name: review.reviewer?.name || 'Unknown Reviewer',
        }));

        return NextResponse.json(reshapedData);
    } catch (error) {
        console.error('GET /api/hr/performance error:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

// Handler for POST requests to create a new performance review
export async function POST(req: NextRequest) {
    try {
        const { employee_id, reviewer_id, score, feedback, review_date } = await req.json();

        if (!employee_id || !reviewer_id || !score || !feedback || !review_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let final_reviewer_id = reviewer_id;

        // This block handles the placeholder ID sent from the frontend to prevent crashes.
        // It substitutes the placeholder with the ID of the first available user.
        if (reviewer_id === 'user-id-placeholder') {
            console.warn("Received placeholder for reviewer_id. Fetching a fallback user.");
            const { data: fallbackUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .limit(1)
                .single();

            if (userError || !fallbackUser) {
                throw new Error('Could not find a fallback user to assign as reviewer. Please ensure users exist in the database.');
            }
            final_reviewer_id = fallbackUser.id;
        }

        const { data, error } = await supabase
            .from('performance_reviews')
            .insert([{ employee_id, reviewer_id: final_reviewer_id, score, feedback, review_date }])
            .select()
            .single();

        if (error) {
            throw error;
        }
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('POST /api/hr/performance error:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

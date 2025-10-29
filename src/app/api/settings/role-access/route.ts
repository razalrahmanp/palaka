import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

// GET - Fetch all role access configurations
export async function GET() {
  try {
    // Get role access configurations
    const { data: roleAccessData, error: roleAccessError } = await supabase
      .from('role_access_config')
      .select('role, accessible_routes')
      .order('role');

    if (roleAccessError) {
      console.error('Error fetching role access:', roleAccessError);
      return NextResponse.json(
        { error: 'Failed to fetch role access configuration' },
        { status: 500 }
      );
    }

    // Transform to match frontend format
    const roleAccess = roleAccessData.map((item: { role: string; accessible_routes: string[] }) => ({
      role: item.role,
      accessibleRoutes: item.accessible_routes || [],
    }));

    return NextResponse.json(roleAccess);
  } catch (error) {
    console.error('Error in GET /api/settings/role-access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update role access configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, accessibleRoutes } = body;

    // Validate input
    if (!role || !Array.isArray(accessibleRoutes)) {
      return NextResponse.json(
        { error: 'Invalid input: role and accessibleRoutes are required' },
        { status: 400 }
      );
    }

    // Check authentication - For now, we'll need to implement proper auth check
    // This is a placeholder - in production, verify the user from session/token
    
    // For now, we'll skip auth check and allow the operation
    // TODO: Implement proper authentication check

    // Update or insert role access configuration
    const { data, error } = await supabase
      .from('role_access_config')
      .upsert({
        role,
        accessible_routes: accessibleRoutes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'role',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating role access:', error);
      return NextResponse.json(
        { error: 'Failed to update role access configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Role access configuration updated successfully',
      data: {
        role: data.role,
        accessibleRoutes: data.accessible_routes,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/settings/role-access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

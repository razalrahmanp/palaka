import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Step 1: Fetch the user and their role name
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, password, role_id, role:roles(name)')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Step 2: Securely compare the password
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // --- This is the new, crucial step ---
    // Step 3: Fetch all permissions associated with the user's role
    const { data: permissions, error: permsError } = await supabase
        .from('role_permissions')
        .select('permission:permissions(name)')
        .eq('role_id', user.role_id);

    if (permsError) {
        // If there's an error fetching permissions, it's a server-side issue.
        throw permsError;
    }

    // Step 4: Prepare the final user object for the client
    const { password: _, role_id, ...userWithoutPassword } = user;
    
    const finalUser = {
        ...userWithoutPassword,
        role: user.role?.name || 'Unknown Role',
        // Create a simple array of permission names (e.g., ['dashboard:read', 'user:manage'])
        permissions: permissions ? permissions.map(p => p.permission.name) : [] 
    };

    return NextResponse.json(finalUser);

  } catch (error) {
    console.error('Custom Login Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Login failed', details: errorMessage }, { status: 500 });
  }
}

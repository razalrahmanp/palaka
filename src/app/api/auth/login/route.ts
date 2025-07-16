import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

type UserWithRole = {
  id: number;
  email: string;
  password: string;
  role_id: number;
  role: { name: string } | { name: string }[];
};

type RolePermission = {
  permission: { name: string } | { name: string }[];
};

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
      .single<UserWithRole>();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Step 2: Securely compare the password
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Step 3: Fetch all permissions associated with the user's role
    const { data: permissions, error: permsError } = await supabase
      .from('role_permissions')
      .select('permission:permissions(name)')
      .eq('role_id', user.role_id) as { data: RolePermission[]; error: Error | null };

    if (permsError) {
      throw permsError;
    }

    // Step 4: Prepare the final user object for the client
    const { password: _, ...userWithoutPassword } = user;

    const roleName = Array.isArray(user.role)
      ? user.role[0]?.name || 'Unknown Role'
      : user.role?.name || 'Unknown Role';

    const permissionNames =
      permissions?.map((p) =>
        Array.isArray(p.permission)
          ? p.permission[0]?.name
          : p.permission?.name
      ).filter(Boolean) || [];

    const finalUser = {
      ...userWithoutPassword,
      role: roleName,
      permissions: permissionNames,
    };

    return NextResponse.json(finalUser);

  } catch (error) {
    console.error('Custom Login Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Login failed', details: errorMessage }, { status: 500 });
  }
}

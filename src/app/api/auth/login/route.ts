import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';
import bcrypt from 'bcryptjs';

type UserWithRole = {
  id: number;
  email: string;
  password: string;
  role_id: number;
  is_deleted: boolean;
  role: { name: string } | { name: string }[];
};

type RolePermission = {
  permission: { name: string } | { name: string }[];
};

// Helper function to check if a password looks like it's hashed
function isHashedPassword(password: string): boolean {
  // bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
  return /^\$2[ayb]\$\d{2}\$.{53}$/.test(password);
}

// Helper function to check if password uses simple hash format
function isSimpleHash(password: string): boolean {
  return password?.startsWith('SIMPLE_') || false;
}

// Simple hash function (same as in mobile app)
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `SIMPLE_${Math.abs(hash).toString(36)}_${str.length}`;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Validate password is not empty or just whitespace
    if (!password || password.trim() === '') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    console.log('🔍 Validating user:', email);

    // Step 1: Fetch the user and their role name
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, password, role_id, is_deleted, role:roles(name)')
      .eq('email', email)
      .eq('is_deleted', false)
      .single<UserWithRole>();

    console.log('📊 Database query result:', { user: user?.email, error: fetchError });

    if (fetchError) {
      console.error('❌ User lookup error:', fetchError);
      
      // Provide more user-friendly error messages based on the error code
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'No users found in database. Please contact your administrator to set up user accounts.' 
        }, { status: 401 });
      } else if (fetchError.code === 'PGRST301') {
        return NextResponse.json({ 
          error: 'Database connection error. Please check your internet connection and try again.' 
        }, { status: 500 });
      } else {
        return NextResponse.json({ 
          error: 'Unable to verify user credentials. Please try again or contact support.' 
        }, { status: 401 });
      }
    }

    if (!user) {
      console.error('❌ No user data returned');
      return NextResponse.json({ 
        error: 'User account not found. Please check your email address or contact your administrator.' 
      }, { status: 401 });
    }

    console.log('✅ User found:', { email: user.email, role: user.role });
    console.log('🔐 Validating password...', { 
      provided: password, 
      storedLength: user.password?.length,
      passwordType: isHashedPassword(user.password) ? 'bcrypt' : 
                   isSimpleHash(user.password) ? 'simple_hash' : 'plain_text'
    });

    // Step 2: Compare password - handle bcrypt, simple hash, and plain text
    let passwordMatches = false;
    
    if (isHashedPassword(user.password)) {
      // Password appears to be bcrypt hashed
      try {
        passwordMatches = await bcrypt.compare(password, user.password);
        console.log('Used bcrypt comparison for hashed password');
      } catch (error) {
        console.error('Bcrypt comparison failed:', error);
        passwordMatches = false;
      }
    } else if (isSimpleHash(user.password)) {
      // Password uses simple hash format
      const hashedInput = simpleHash(password);
      passwordMatches = hashedInput === user.password;
      console.log('Used simple hash comparison');
    } else {
      // Password appears to be plain text, use direct comparison
      passwordMatches = password === user.password;
      console.log('Used plain text comparison for unhashed password');
    }

    if (!passwordMatches) {
      console.error('❌ Password verification failed');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    console.log('✅ Password verification successful');

    // Step 3: Fetch all permissions associated with the user's role
    const { data: permissions, error: permsError } = await supabase
      .from('role_permissions')
      .select('permission:permissions(name)')
      .eq('role_id', user.role_id) as { data: RolePermission[]; error: Error | null };

    if (permsError) {
      throw permsError;
    }

    // Step 4: Prepare the final user object for the client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

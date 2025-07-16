import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin'; // Use the admin client on the server
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    // Look up role_id from the roles table
    const { data: roleRow, error: roleErr } = await supabase
        .from("roles")
        .select("id")
        .eq("name", role)
        .single();

    if (roleErr || !roleRow) {
        return NextResponse.json({ error: 'Selected role not found' }, { status: 400 });
    }

    // Hash the password securely on the server
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into your public.users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: uuidv4(),
        email,
        password: hashedPassword,
        name,
        role_id: roleRow.id,
        // You may need to adjust this if your 'users' table has a 'role' text column
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error('Custom Signup Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Signup failed', details: errorMessage }, { status: 500 });
  }
}

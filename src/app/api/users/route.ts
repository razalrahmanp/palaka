import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roleQuery = searchParams.get('role')

  if (!roleQuery) {
    return NextResponse.json({ error: 'Missing role parameter' }, { status: 400 })
  }

  const roleGroups: Record<string, string[]> = {
    sales: ['Sales Manager', 'Sales Representative'],
    hr: ['HR Manager'],
    logistics: ['Logistics Coordinator'],
    production: ['Production Manager', 'Production Staff'],
    finance: ['Finance Manager'],
    warehouse: ['Warehouse Manager', 'Warehouse Staff'],
    admin: ['System Administrator'],
    executive: ['Executive'],
    employee: ['Employee'],
    delivery: ['Delivery Driver'],
  }

  const rolesToFetch = roleGroups[roleQuery] ?? [roleQuery]

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role_id, created_at, roles!fk_role(name)')
    .in('roles.name', rolesToFetch)

  if (error) {
    console.error('Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type User = {
    id: string;
    name: string;
    email: string;
    role_id: string;
    roles?: { name: string }[];
    created_at: string;
  };

  const users = data.map((user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role: user.roles && user.roles.length > 0 ? user.roles[0].name : undefined,
    created_at: user.created_at,
  }))

  return NextResponse.json(users)
}

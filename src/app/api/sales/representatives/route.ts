import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        user:users!employees_user_id_fkey(
          id,
          email,
          name
        )
      `)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = data.map((employee: any) => ({
      id: employee.user_id,
      email: employee.user?.email || employee.email,
      name: employee.user?.name || employee.name,
      position: employee.position,
      role: employee.position,
      created_at: employee.created_at,
    }))

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching sales representatives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

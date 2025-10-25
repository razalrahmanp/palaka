import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const documentType = searchParams.get('document_type');
    const isVerified = searchParams.get('is_verified');

    let query = supabase
      .from('employee_documents')
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        ),
        verifier:users!employee_documents_verified_by_fkey (
          id,
          full_name
        ),
        uploader:users!employee_documents_uploaded_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (isVerified !== null) {
      query = query.eq('is_verified', isVerified === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      document_type,
      document_name,
      file_url,
      expiry_date,
      uploaded_by,
    } = body;

    if (!employee_id || !document_type || !document_name || !file_url) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employee_documents')
      .insert({
        employee_id,
        document_type,
        document_name,
        file_url,
        expiry_date,
        uploaded_by,
        is_verified: false,
      })
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error creating employee document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create employee document' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      document_name,
      document_type,
      file_url,
      expiry_date,
      is_verified,
      verified_by,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (document_name !== undefined) updateData.document_name = document_name;
    if (document_type !== undefined) updateData.document_type = document_type;
    if (file_url !== undefined) updateData.file_url = file_url;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (is_verified !== undefined) {
      updateData.is_verified = is_verified;
      if (is_verified) {
        updateData.verified_at = new Date().toISOString();
        if (verified_by) updateData.verified_by = verified_by;
      }
    }

    const { data, error } = await supabase
      .from('employee_documents')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        ),
        verifier:users!employee_documents_verified_by_fkey (
          id,
          full_name
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating employee document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee document' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee document' },
      { status: 500 }
    );
  }
}

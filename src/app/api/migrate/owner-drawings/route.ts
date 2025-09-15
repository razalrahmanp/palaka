import { NextResponse } from 'next/server';
import { migrateOwnerDrawings } from '@/lib/migrations/owner-drawings';

export async function POST() {
  try {
    const result = await migrateOwnerDrawings();
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Owner drawings migration completed successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
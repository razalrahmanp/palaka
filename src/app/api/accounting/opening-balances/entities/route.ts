import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

interface EntityItem {
  balance_type: string
  entity_id: string
  entity_name: string
  entity_type: string
}

interface GroupedData {
  [key: string]: EntityItem[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const balanceType = searchParams.get('balance_type')

    // Get all available entities for opening balances from the view
    const { data, error } = await supabase
      .from('opening_balance_entities')
      .select('*')
      .order('entity_name')

    if (error) {
      console.error('Error fetching opening balance entities:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter by balance type if specified
    let filteredData = data
    if (balanceType) {
      filteredData = data?.filter((item: EntityItem) => item.balance_type === balanceType)
    }

    // Group by balance type for easier UI consumption
    const groupedData = filteredData?.reduce((acc: GroupedData, item: EntityItem) => {
      if (!acc[item.balance_type]) {
        acc[item.balance_type] = []
      }
      acc[item.balance_type].push(item)
      return acc
    }, {})

    return NextResponse.json({ 
      entities: filteredData,
      grouped: groupedData,
      types: [...new Set(data?.map((item: EntityItem) => item.balance_type))]
    })
  } catch (error) {
    console.error('Error in opening balance entities API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
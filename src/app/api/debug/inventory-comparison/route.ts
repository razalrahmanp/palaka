// Debug API to compare P&L inventory calculation vs Vendor Stats calculation
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabasePool';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // P&L Style Calculation (how it's done in reports)
    const { data: plInventory, error: plError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        quantity,
        product_id,
        products (
          cost,
          name
        )
      `);

    if (plError) {
      console.error('P&L inventory error:', plError);
      return NextResponse.json({ error: 'Failed to fetch P&L inventory' }, { status: 500 });
    }

    let plTotal = 0;
    const plItems: any[] = [];
    plInventory?.forEach((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const productCost = Array.isArray(item.products) 
        ? (item.products[0]?.cost || 0)
        : (item.products?.cost || 0);
      
      // Only include items with quantity > 0
      if (quantity > 0) {
        const value = quantity * parseFloat(productCost || '0');
        plTotal += value;
        plItems.push({
          id: item.id,
          product_id: item.product_id,
          quantity,
          cost: productCost,
          value,
          product_name: Array.isArray(item.products) ? item.products[0]?.name : item.products?.name
        });
      }
    });

    // Vendor Style Calculation (how it's done in vendor stats)
    const { data: vendorInventory, error: vendorError } = await supabase
      .from('inventory_items')
      .select(`
        quantity,
        products!inner(
          price,
          cost,
          supplier_id
        )
      `);

    if (vendorError) {
      console.error('Vendor inventory error:', vendorError);
      return NextResponse.json({ error: 'Failed to fetch vendor inventory' }, { status: 500 });
    }

    let vendorTotal = 0;
    const vendorItems: any[] = [];
    vendorInventory?.forEach((item: any) => {
      const quantity = Number(item.quantity) || 0;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const cost = Number(product?.cost) || 0;
      
      // Only include items with quantity > 0
      if (quantity > 0) {
        const value = quantity * cost;
        vendorTotal += value;
        vendorItems.push({
          quantity,
          cost,
          value,
          supplier_id: product?.supplier_id
        });
      }
    });

    return NextResponse.json({
      plStyle: {
        totalValue: plTotal,
        itemCount: plItems.length,
        calculation: 'inventory_items.quantity × products.cost (where quantity > 0)',
        sampleItems: plItems.slice(0, 5)
      },
      vendorStyle: {
        totalValue: vendorTotal,
        itemCount: vendorItems.length,
        calculation: 'inventory_items.quantity × products.cost (where quantity > 0)',
        sampleItems: vendorItems.slice(0, 5)
      },
      difference: vendorTotal - plTotal,
      possibleIssues: [
        'Different join conditions (inner vs left)',
        'Different table relationships',
        'Data filtering differences',
        'Product records without supplier_id'
      ]
    });

  } catch (error) {
    console.error('Debug comparison error:', error);
    return NextResponse.json({ error: 'Failed to compare calculations' }, { status: 500 });
  }
}
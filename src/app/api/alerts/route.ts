import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

// Function to generate alerts from business data
async function generateSystemAlerts() {
  const alerts = [];

  try {
    // 1. Low Stock Alerts
    const { data: allInventoryItems, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        id,
        quantity,
        reorder_point,
        products!inner (
          name,
          sku
        )
      `);

    if (!inventoryError && allInventoryItems) {
      const lowStockItems = allInventoryItems.filter(item => item.quantity <= item.reorder_point);
      
      for (const item of lowStockItems) {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        alerts.push({
          id: `inventory-${item.id}-${Date.now()}`,
          type: 'inventory',
          priority: item.quantity === 0 ? 'high' : 'medium',
          title: `Low Stock: ${product?.name || 'Unknown Product'}`,
          message: `Stock level is ${item.quantity} (reorder point: ${item.reorder_point})`,
          status: 'unread',
          source: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            product_id: item.id,
            sku: product?.sku,
            current_quantity: item.quantity,
            reorder_point: item.reorder_point
          }
        });
      }
    }

    // 2. Overdue Purchase Orders
    const { data: overduePOs, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .select('*')
      .eq('status', 'pending')
      .lt('expected_delivery_date', new Date().toISOString());

    if (!poError && overduePOs) {
      for (const po of overduePOs) {
        alerts.push({
          id: `po-${po.id}-${Date.now()}`,
          type: 'procurement',
          priority: 'high',
          title: `Overdue Purchase Order`,
          message: `PO #${po.po_number} was expected on ${new Date(po.expected_delivery_date).toLocaleDateString()}`,
          status: 'unread',
          source: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            purchase_order_id: po.id,
            po_number: po.po_number,
            expected_date: po.expected_delivery_date
          }
        });
      }
    }

    // 3. Pending Sales Quotes (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: oldQuotes, error: quotesError } = await supabaseAdmin
      .from('sales_quotes')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (!quotesError && oldQuotes) {
      for (const quote of oldQuotes) {
        alerts.push({
          id: `quote-${quote.id}-${Date.now()}`,
          type: 'sales',
          priority: 'medium',
          title: `Follow up on Quote`,
          message: `Quote #${quote.quote_number} has been pending for over 7 days`,
          status: 'unread',
          source: 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            quote_id: quote.id,
            quote_number: quote.quote_number,
            customer: quote.customer_name
          }
        });
      }
    }

    // 4. System Maintenance Alerts
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('category', 'maintenance');

    if (!settingsError && settings) {
      const backupSetting = settings.find((s: { key: string; value: string }) => s.key === 'last_backup_date');
      if (backupSetting) {
        const lastBackup = new Date(backupSetting.value);
        const daysSinceBackup = Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceBackup > 7) {
          alerts.push({
            id: `backup-${Date.now()}`,
            type: 'system',
            priority: daysSinceBackup > 14 ? 'high' : 'medium',
            title: 'System Backup Overdue',
            message: `Last backup was ${daysSinceBackup} days ago`,
            status: 'unread',
            source: 'system',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              last_backup_date: backupSetting.value,
              days_since_backup: daysSinceBackup
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('Error generating system alerts:', error);
  }

  return alerts;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const includeGenerated = searchParams.get('include_generated') !== 'false'; // Default to true

    // First, fetch existing alerts from database
    let query = supabaseAdmin
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: existingAlerts, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    let allAlerts = existingAlerts || [];

    // Generate system alerts if requested
    if (includeGenerated) {
      const systemAlerts = await generateSystemAlerts();
      allAlerts = [...allAlerts, ...systemAlerts];
    }

    // Apply filters to combined alerts
    let filteredAlerts = allAlerts;
    
    if (type && type !== 'all') {
      filteredAlerts = filteredAlerts.filter((alert: { type: string }) => alert.type === type);
    }
    if (priority && priority !== 'all') {
      filteredAlerts = filteredAlerts.filter((alert: { priority: string }) => alert.priority === priority);
    }
    if (status && status !== 'all') {
      filteredAlerts = filteredAlerts.filter((alert: { status: string }) => alert.status === status);
    }

    // Sort by priority and creation date
    filteredAlerts.sort((a: { priority: string; created_at: string }, b: { priority: string; created_at: string }) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // High priority first
      }
      
      const aDate = new Date(a.created_at || Date.now()).getTime();
      const bDate = new Date(b.created_at || Date.now()).getTime();
      return bDate - aDate; // Newest first
    });

    return NextResponse.json(filteredAlerts);
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      title,
      message,
      priority,
      status = 'new',
      source,
      assigned_to,
      metadata
    } = body;

    if (!type || !title || !message || !priority || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message, priority, source' },
        { status: 400 }
      );
    }

    const { data: alert, error } = await supabaseAdmin
      .from('alerts')
      .insert([{
        type,
        title,
        message,
        priority,
        status,
        source,
        assigned_to,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Error in alerts POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

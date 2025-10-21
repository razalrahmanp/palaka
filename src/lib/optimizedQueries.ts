import { supabase } from '@/lib/supabasePool';

// Optimized query builders with proper indexing hints
export class OptimizedQueries {
  // Get vendors with minimal data for lists
  static async getVendorsList() {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, contact, created_at')
      .order('name')
      .limit(100); // Limit results for better performance
    
    if (error) throw error;
    return data;
  }
  
  // Get vendor details with related data in a single optimized query
  static async getVendorDetails(vendorId: string) {
    const [vendorResult, billsResult, stockResult] = await Promise.all([
      supabase
        .from('suppliers')
        .select('*')
        .eq('id', vendorId)
        .single(),
      
      supabase
        .from('vendor_bills')
        .select('id, bill_number, total_amount, paid_amount, status, bill_date')
        .eq('supplier_id', vendorId)
        .order('bill_date', { ascending: false })
        .limit(50), // Limit recent bills
      
      supabase
        .from('products')
        .select('id, name, current_quantity, unit_cost, unit_price')
        .eq('supplier_id', vendorId)
        .gt('current_quantity', 0) // Only products in stock
        .limit(100)
    ]);
    
    if (vendorResult.error) throw vendorResult.error;
    
    return {
      vendor: vendorResult.data,
      bills: billsResult.data || [],
      stock: stockResult.data || [],
    };
  }
  
  // Get dashboard stats with aggregated queries
  static async getDashboardStats() {
    const { data, error } = await supabase
      .rpc('get_dashboard_stats'); // Use a stored procedure for complex aggregations
    
    if (error) throw error;
    return data;
  }
}

// Database stored procedure for dashboard stats (to be created in Supabase)
export const DASHBOARD_STATS_PROCEDURE = `
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(CASE WHEN status = 'delivered' THEN final_price ELSE 0 END), 0),
    'total_orders', COUNT(*),
    'pending_amount', COALESCE(SUM(final_price - COALESCE(total_paid, 0)), 0),
    'delivered_orders', COUNT(CASE WHEN status = 'delivered' THEN 1 END)
  ) INTO result
  FROM sales_orders;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
`;
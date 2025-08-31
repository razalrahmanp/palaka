'use client';
import { useEffect, useState } from 'react';
import { Quote, Order, Product, Customer, User } from '@/types';

export function useSalesDataFixed() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching sales data...');

      // Fetch quotes with proper error handling
      const quotesResponse = await fetch('/api/sales/quotes');
      if (!quotesResponse.ok) {
        throw new Error(`Quotes API error: ${quotesResponse.status} ${quotesResponse.statusText}`);
      }
      const quotesData = await quotesResponse.json();
      console.log('📊 Quotes response:', quotesData);
      
      // Handle quotes response format: { quotes: [...] }
      const quotesArray = quotesData.quotes || quotesData || [];
      setQuotes(Array.isArray(quotesArray) ? quotesArray : []);
      console.log('✅ Quotes loaded:', quotesArray.length);

      // Fetch orders with proper error handling
      const ordersResponse = await fetch('/api/sales/orders');
      if (!ordersResponse.ok) {
        throw new Error(`Orders API error: ${ordersResponse.status} ${ordersResponse.statusText}`);
      }
      const ordersData = await ordersResponse.json();
      console.log('📦 Orders response:', ordersData);
      
      // Handle orders response format: { orders: [...] }
      const ordersArray = ordersData.orders || ordersData || [];
      setOrders(Array.isArray(ordersArray) ? ordersArray : []);
      console.log('✅ Orders loaded:', ordersArray.length);

      // Fetch products with proper error handling
      const productsResponse = await fetch('/api/products?limit=1000');
      if (!productsResponse.ok) {
        throw new Error(`Products API error: ${productsResponse.status} ${productsResponse.statusText}`);
      }
      const productsData = await productsResponse.json();
      console.log('🛍️ Products response:', productsData);
      
      // Handle both old format (array) and new format (object with products array)
      const productsArray = Array.isArray(productsData) ? productsData : productsData.products || [];
      const transformedProducts = productsArray.map((p: {
        product_id: string;
        product_name: string;
        product_price?: number;
        supplier_name?: string;
      }) => ({
        id: p.product_id,
        name: p.product_name,
        price: p.product_price ?? 0,
        supplier: p.supplier_name ?? '',
      }));
      setProducts(transformedProducts);
      console.log('✅ Products loaded:', transformedProducts.length);

      // Fetch customers with proper error handling
      const customersResponse = await fetch('/api/crm/customers');
      if (!customersResponse.ok) {
        throw new Error(`Customers API error: ${customersResponse.status} ${customersResponse.statusText}`);
      }
      const customersData = await customersResponse.json();
      console.log('👥 Customers response:', customersData);
      
      // Ensure we always set an array
      const customersArray = Array.isArray(customersData) ? customersData : [];
      setCustomers(customersArray);
      console.log('✅ Customers loaded:', customersArray.length);

      console.log('🎉 All sales data loaded successfully!');

    } catch (err) {
      console.error('❌ Error loading sales data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Set empty arrays on error to prevent filter errors
      setQuotes([]);
      setOrders([]);
      setProducts([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();

    // Load current user from localStorage
    const u = localStorage.getItem('user');
    if (u) {
      try {
        setCurrentUser(JSON.parse(u));
      } catch (err) {
        console.error('Error parsing user from localStorage:', err);
      }
    }
  }, []);

  const refresh = async () => {
    console.log('🔄 Refreshing sales data...');
    await fetchSalesData();
  };

  // Calculate stats
  const stats = {
    totalQuotes: quotes.length,
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.final_price || order.total || 0), 0),
    pendingQuotes: quotes.filter(q => q.status === 'Pending' || q.status === 'Draft').length,
    confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
    pendingOrders: orders.filter(o => o.status === 'draft').length, // using 'draft' as pending equivalent
    convertedQuotes: quotes.filter(q => q.status === 'Converted').length,
    
    // Additional calculated stats
    conversionRate: quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'Converted').length / quotes.length) * 100) : 0,
    totalOutstanding: orders.reduce((sum, order) => {
      const outstanding = (order.final_price || order.total || 0) - (order.total_paid || 0);
      return sum + (outstanding > 0 ? outstanding : 0);
    }, 0),
    pendingPaymentOrders: orders.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial').length,
    totalCollected: orders.reduce((sum, order) => sum + (order.total_paid || 0), 0),
    fullyPaidOrders: orders.filter(o => o.payment_status === 'paid').length,
    collectionRate: orders.length > 0 ? Math.round((orders.filter(o => o.payment_status === 'paid').length / orders.length) * 100) : 0,
  };

  console.log('📈 Sales stats:', stats);

  return {
    quotes,
    orders,
    products,
    customers,
    currentUser,
    loading,
    error,
    stats,
    refresh,
  };
}

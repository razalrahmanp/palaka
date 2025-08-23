'use client';
import  { useEffect, useState } from 'react';
import { Quote, Order, Product, Customer, User } from '@/types';

export function useSalesData() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/sales/quotes').then((r) => r.json()).then(data => {
        // Ensure we always set an array
        setQuotes(Array.isArray(data) ? data : []);
      }),
      fetch('/api/sales/orders').then((r) => r.json()).then(data => {
        // Ensure we always set an array
        setOrders(Array.isArray(data) ? data : []);
      }),
      fetch('/api/products?limit=1000')
        .then((r) => r.json())
        .then((data) => {
          // Handle both old format (array) and new format (object with products array)
          const productsArray = Array.isArray(data) ? data : data.products || [];
          setProducts(
            productsArray.map(
              (p: {
                product_id: string;
                product_name: string;
                product_price?: number;
                supplier_name?: string;
              }) => ({
                id: p.product_id,
                name: p.product_name,
                price: p.product_price ?? 0,
                supplier: p.supplier_name ?? '',
              })
            )
          );
        }),
      fetch('/api/crm/customers').then((r) => r.json()).then(data => {
        // Ensure we always set an array
        setCustomers(Array.isArray(data) ? data : []);
      }),
    ]).catch(error => {
      console.error('Error loading sales data:', error);
      // Set empty arrays on error to prevent filter errors
      setQuotes([]);
      setOrders([]);
      setProducts([]);
      setCustomers([]);
    });

    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));
  }, []);

  const refresh = () => {
    fetch('/api/sales/quotes').then((r) => r.json()).then(data => {
      setQuotes(Array.isArray(data) ? data : []);
    }).catch(() => setQuotes([]));
    
    fetch('/api/sales/orders').then((r) => r.json()).then(data => {
      setOrders(Array.isArray(data) ? data : []);
    }).catch(() => setOrders([]));
  };

  return {
    quotes,
    orders,
    products,
    customers,
    currentUser,
    refresh,
  };
}

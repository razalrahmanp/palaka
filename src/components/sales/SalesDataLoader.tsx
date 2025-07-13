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
      fetch('/api/sales/quotes').then((r) => r.json()).then(setQuotes),
      fetch('/api/sales/orders').then((r) => r.json()).then(setOrders),
      fetch('/api/products')
        .then((r) => r.json())
        .then((data) => {
          setProducts(
            data.map(
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
      fetch('/api/crm/customers').then((r) => r.json()).then(setCustomers),
    ]);

    const u = localStorage.getItem('user');
    if (u) setCurrentUser(JSON.parse(u));
  }, []);

  const refresh = () => {
    fetch('/api/sales/quotes').then((r) => r.json()).then(setQuotes);
    fetch('/api/sales/orders').then((r) => r.json()).then(setOrders);
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

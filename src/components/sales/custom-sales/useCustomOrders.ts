// src/components/sales/custom-orders/useCustomOrders.ts
import { useState, useEffect } from "react";
import { CustomOrder } from "./types";

export function useCustomOrders() {
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");


  async function fetchOrders() {
    const res = await fetch(
      `/api/sales/custom-orders?page=${page}&perPage=10&customer=${customerFilter}&date=${dateFilter}`
    );
    const data = await res.json();
    setCustomOrders(data.orders || []);
  }

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: "10",
      });
      if (customerFilter) params.set("customer", customerFilter);
      if (dateFilter) params.set("date", dateFilter);

      const res = await fetch(`/api/sales/custom-orders?${params}`);
      if (res.ok) {
        setCustomOrders(await res.json());
      } else {
        console.error("Failed to fetch custom orders");
      }
    }
    load();
  }, [page, customerFilter, dateFilter]);

  return {
    customOrders,
    page,
    setPage,
    customerFilter,
    setCustomerFilter,
    dateFilter,
    setDateFilter,
    refetch: fetchOrders,
  };
}

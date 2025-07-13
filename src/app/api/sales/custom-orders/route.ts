import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import {
  QuoteCustomItem,
  SalesOrderRow,
} from "@/components/sales/custom-sales/types";
import { normalizeSalesOrderItems } from "@/lib/helper";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("perPage") || "10", 10);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const customerFilter = searchParams.get("customer")?.toLowerCase() || "";
  const supplierFilter = searchParams.get("supplier")?.toLowerCase() || "";
  const dateFilter = searchParams.get("date");

  let query = supabase
    .from("sales_orders")
    .select(
      `
      id,
      quote_id,
      po_created,
      created_at,
      customer_id,
      customers (
        id,
        name
      ),
      sales_order_items (
        quantity,
        unit_price,
        custom_product_id,
        custom_products (
          id,
          name,
          supplier_name,
          price
        )
      )
    `
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Apply only date filter here (in Supabase) for performance
  if (dateFilter) {
    const startDate = new Date(dateFilter);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // Next day for range filtering

    query = query
      .gte("created_at", startDate.toISOString())
      .lt("created_at", endDate.toISOString());
  }

  const { data: rawOrders, error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rawOrders) {
    return NextResponse.json([]);
  }

  // Normalize structure
  const typedOrders: SalesOrderRow[] = rawOrders.map((order) => ({
    ...order,
    customers: Array.isArray(order.customers)
      ? order.customers[0] || null
      : order.customers,
    sales_order_items: order.sales_order_items.map(normalizeSalesOrderItems),
  }));

  // Load quote items (for supplier fallback)
  const quoteIds = typedOrders
    .map((o) => o.quote_id)
    .filter((q): q is string => !!q);

  let quoteItemsMap: Record<string, QuoteCustomItem[]> = {};

  if (quoteIds.length) {
    const { data: quoteItems, error: quoteItemsError } = await supabase
      .from("quote_custom_items")
      .select("quote_id, supplier_name, name")
      .in("quote_id", quoteIds);

    if (quoteItemsError) {
      console.error(quoteItemsError);
    } else {
      quoteItemsMap = (quoteItems ?? []).reduce((acc, item) => {
        if (!acc[item.quote_id]) acc[item.quote_id] = [];
        acc[item.quote_id].push(item);
        return acc;
      }, {} as Record<string, QuoteCustomItem[]>);
    }
  }

  // Final transform + in-memory filters
  const result = typedOrders
    .filter((order) => {
      // Customer name match
      const matchesCustomer = customerFilter
        ? order.customers?.name?.toLowerCase().includes(customerFilter)
        : true;

      // Supplier name match (any item’s supplier)
      const matchesSupplier = supplierFilter
        ? order.sales_order_items.some((item) => {
            const name =
              quoteItemsMap[order.quote_id || ""]?.find(
                (q) => q.name === item.custom_products?.name
              )?.supplier_name ??
              item.custom_products?.supplier_name ??
              "";
            return name.toLowerCase().includes(supplierFilter);
          })
        : true;

      return matchesCustomer && matchesSupplier;
    })
    .filter((order) =>
      order.sales_order_items.some((item) => item.custom_products)
    )
    .map((order) => {
      const itemsWithCustom = order.sales_order_items.filter(
        (item) => item.custom_products
      );

      const totalPrice = itemsWithCustom.reduce(
        (sum, item) => sum + (item.unit_price ?? 0) * (item.quantity ?? 0),
        0
      );

      const quoteItems = order.quote_id
        ? quoteItemsMap[order.quote_id] || []
        : [];

      return {
        orderId: order.id,
        customerId: order.customer_id,
        customerName: order.customers?.name ?? "",
        orderDate: order.created_at.slice(0, 10),
        totalPrice,
        poCreated: order.po_created === true,
        items: itemsWithCustom.map((item) => {
          const matchingQuoteItem = quoteItems.find(
            (q) => q.name === item.custom_products?.name
          );
          return {
            quantity: item.quantity,
            unitPrice: item.unit_price,
            productName: item.custom_products?.name ?? "",
            supplierName:
              matchingQuoteItem?.supplier_name ??
              item.custom_products?.supplier_name ??
              "",
            productPrice: item.custom_products?.price ?? 0,
          };
        }),
      };
    });

  return NextResponse.json(result);
}

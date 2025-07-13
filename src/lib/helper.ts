export function normalizeProduct(p: {
  product_id: string;
  product_name: string;
  product_price?: number;
  supplier_name?: string;
}) {
  return {
    id: p.product_id,
    name: p.product_name,
    price: p.product_price ?? 0,
    supplier: p.supplier_name ?? '',
  };
}

export const normalizeSalesOrderItems = (item: {
    quantity: number;
    unit_price: number;
    custom_product_id: string;
    custom_products: {
        id: string;
        name: string;
        supplier_name: string;
        price: number;
      } | {
        id: string;
        name: string;
        supplier_name: string;
        price: number;
      }[];
    })  => ({
      quantity: item.quantity,
      unit_price: item.unit_price,
      custom_product_id: item.custom_product_id,
      custom_products: Array.isArray(item.custom_products)
        ? item.custom_products[0] || null
        : item.custom_products,
    });
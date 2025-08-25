WITH custom_duplicates AS (
  SELECT 
    custom_product_id,
    order_id,
    COUNT(*) as count,
    array_agg(id) as item_ids,
    array_agg(name) as names,
    array_agg(quantity) as quantities,
    array_agg(unit_price) as prices,
    array_agg(created_at) as created_dates
  FROM sales_order_items 
  WHERE custom_product_id IS NOT NULL
  GROUP BY custom_product_id, order_id
  HAVING COUNT(*) > 1
)
SELECT 
  custom_product_id,
  order_id,
  count as duplicate_count,
  item_ids,
  names,
  quantities,
  prices,
  created_dates
FROM custom_duplicates
ORDER BY custom_product_id, order_id;

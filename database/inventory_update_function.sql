-- Function to update inventory quantity for returns
CREATE OR REPLACE FUNCTION update_inventory_quantity(
  p_product_id uuid,
  p_quantity_change integer
) RETURNS void AS $$
BEGIN
  -- Update inventory_items table
  UPDATE inventory_items 
  SET 
    quantity = quantity + p_quantity_change,
    updated_at = now()
  WHERE product_id = p_product_id;
  
  -- If no record exists for this product, create one
  IF NOT FOUND THEN
    INSERT INTO inventory_items (product_id, quantity, reorder_point)
    VALUES (p_product_id, GREATEST(0, p_quantity_change), 0);
  END IF;
  
  -- Log the inventory change
  INSERT INTO stock_adjustments (
    inventory_item_id,
    adjustment_type,
    quantity_change,
    reason,
    created_at
  )
  SELECT 
    ii.id,
    'return',
    p_quantity_change,
    'Product return - inventory restored',
    now()
  FROM inventory_items ii
  WHERE ii.product_id = p_product_id;
  
END;
$$ LANGUAGE plpgsql;
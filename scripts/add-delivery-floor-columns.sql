-- Add delivery floor and awareness columns to sales_orders table
ALTER TABLE public.sales_orders 
ADD COLUMN delivery_floor VARCHAR(50) DEFAULT 'ground',
ADD COLUMN first_floor_awareness BOOLEAN DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN public.sales_orders.delivery_floor IS 'Floor where product needs to be delivered (ground, first, second, third)';
COMMENT ON COLUMN public.sales_orders.first_floor_awareness IS 'Flag to indicate if 1st floor delivery requires special tools/reassembly preparation';

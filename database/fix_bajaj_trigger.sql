-- Fix the Bajaj expected deposit trigger to use correct column names
-- This fixes the error: record "new" has no field "payment_method"

DROP TRIGGER IF EXISTS trigger_create_bajaj_expected_deposit ON sales_orders;

-- Function to automatically create expected deposit when order is financed
CREATE OR REPLACE FUNCTION create_bajaj_expected_deposit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order has Bajaj finance (bajaj_finance_amount > 0)
  -- AND merchant receivable is set (meaning finance terms are finalized)
  IF NEW.bajaj_finance_amount > 0 AND NEW.bajaj_merchant_receivable > 0 THEN
    -- Check if expected deposit already exists to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM bajaj_expected_deposits 
      WHERE sales_order_id = NEW.id
    ) THEN
      INSERT INTO bajaj_expected_deposits (
        sales_order_id,
        order_total,
        finance_amount,
        expected_deposit,
        expected_date,
        status
      ) VALUES (
        NEW.id,
        NEW.final_price,
        NEW.bajaj_finance_amount,
        NEW.bajaj_merchant_receivable, -- Amount expected from Bajaj (after their fees)
        COALESCE(NEW.expected_delivery_date, NEW.created_at::DATE) + INTERVAL '7 days', -- Expect within 7 days after delivery
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_create_bajaj_expected_deposit
  AFTER INSERT OR UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_bajaj_expected_deposit();

-- Note: This trigger will now only create expected deposits when:
-- 1. bajaj_finance_amount > 0 (Bajaj finance is used)
-- 2. bajaj_merchant_receivable > 0 (Finance terms are calculated)
-- 3. No existing expected deposit for this order (prevent duplicates)

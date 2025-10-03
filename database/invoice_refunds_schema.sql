-- Invoice Refunds Schema Enhancement
-- This script adds refund functionality to the invoicing system

-- Create invoice_refunds table to track refunds at invoice level
CREATE TABLE IF NOT EXISTS public.invoice_refunds (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    return_id uuid, -- Link to returns table if refund is from a return
    refund_amount numeric NOT NULL CHECK (refund_amount > 0),
    refund_type varchar(50) NOT NULL CHECK (refund_type IN ('full', 'partial', 'return_based')),
    reason text NOT NULL,
    refund_method varchar(50) NOT NULL CHECK (refund_method IN ('cash', 'bank_transfer', 'credit_card', 'cheque', 'adjustment')),
    bank_account_id uuid, -- If refund is via bank transfer
    reference_number varchar(100), -- Cheque number, transaction ID, etc.
    status varchar(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'cancelled')),
    requested_by uuid NOT NULL,
    approved_by uuid,
    processed_by uuid,
    approved_at timestamp,
    processed_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    notes text,
    
    CONSTRAINT invoice_refunds_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_refunds_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE,
    CONSTRAINT invoice_refunds_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE SET NULL,
    CONSTRAINT invoice_refunds_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id),
    CONSTRAINT invoice_refunds_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id),
    CONSTRAINT invoice_refunds_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id),
    CONSTRAINT invoice_refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id)
);

-- Add refund tracking fields to invoices table if they don't exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS total_refunded numeric DEFAULT 0 CHECK (total_refunded >= 0),
ADD COLUMN IF NOT EXISTS refund_status varchar(50) DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_invoice_id ON public.invoice_refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_status ON public.invoice_refunds(status);
CREATE INDEX IF NOT EXISTS idx_invoice_refunds_created_at ON public.invoice_refunds(created_at);

-- Add trigger to update invoice refund totals automatically
CREATE OR REPLACE FUNCTION update_invoice_refund_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice's total_refunded and refund_status
    UPDATE public.invoices 
    SET 
        total_refunded = COALESCE((
            SELECT SUM(refund_amount) 
            FROM public.invoice_refunds 
            WHERE invoice_id = NEW.invoice_id 
            AND status = 'processed'
        ), 0),
        refund_status = CASE 
            WHEN COALESCE((
                SELECT SUM(refund_amount) 
                FROM public.invoice_refunds 
                WHERE invoice_id = NEW.invoice_id 
                AND status = 'processed'
            ), 0) = 0 THEN 'none'
            WHEN COALESCE((
                SELECT SUM(refund_amount) 
                FROM public.invoice_refunds 
                WHERE invoice_id = NEW.invoice_id 
                AND status = 'processed'
            ), 0) >= total THEN 'full'
            ELSE 'partial'
        END
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_invoice_refund_totals ON public.invoice_refunds;
CREATE TRIGGER trigger_update_invoice_refund_totals
    AFTER INSERT OR UPDATE OF status, refund_amount ON public.invoice_refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_refund_totals();

-- Add comments for documentation
COMMENT ON TABLE public.invoice_refunds IS 'Tracks all refunds issued against invoices, with approval workflow';
COMMENT ON COLUMN public.invoice_refunds.refund_type IS 'Type of refund: full (entire invoice), partial (part of invoice), return_based (from product return)';
COMMENT ON COLUMN public.invoice_refunds.refund_method IS 'Method used to process the refund';
COMMENT ON COLUMN public.invoice_refunds.status IS 'Workflow status: pending -> approved -> processed';
COMMENT ON COLUMN public.invoices.total_refunded IS 'Total amount refunded for this invoice (automatically calculated)';
COMMENT ON COLUMN public.invoices.refund_status IS 'Overall refund status: none, partial, or full (automatically calculated)';

-- Create view for refund summary reports
CREATE OR REPLACE VIEW invoice_refund_summary AS
SELECT 
    ir.invoice_id,
    i.customer_name,
    i.total as invoice_total,
    COUNT(ir.id) as refund_count,
    SUM(CASE WHEN ir.status = 'processed' THEN ir.refund_amount ELSE 0 END) as total_refunded,
    SUM(CASE WHEN ir.status = 'pending' THEN ir.refund_amount ELSE 0 END) as pending_refunds,
    i.refund_status,
    MAX(ir.processed_at) as last_refund_date
FROM public.invoice_refunds ir
JOIN public.invoices i ON ir.invoice_id = i.id
GROUP BY ir.invoice_id, i.customer_name, i.total, i.refund_status;

COMMENT ON VIEW invoice_refund_summary IS 'Summary view of refunds per invoice for reporting purposes';
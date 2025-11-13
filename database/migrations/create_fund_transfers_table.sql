-- Migration: Create fund_transfers table
-- Purpose: Track fund transfer records between bank accounts
-- Date: 2025-11-13

-- Create fund_transfers table
CREATE TABLE IF NOT EXISTS public.fund_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_account_id UUID NOT NULL,
    to_account_id UUID NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fund_transfers_from_account_fkey FOREIGN KEY (from_account_id) 
        REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fund_transfers_to_account_fkey FOREIGN KEY (to_account_id) 
        REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fund_transfers_created_by_fkey FOREIGN KEY (created_by) 
        REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Business logic constraints
    CONSTRAINT fund_transfers_different_accounts CHECK (from_account_id != to_account_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fund_transfers_from_account ON public.fund_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_to_account ON public.fund_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_transfer_date ON public.fund_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_status ON public.fund_transfers(status);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_created_at ON public.fund_transfers(created_at);

-- Add column comments for documentation
COMMENT ON TABLE public.fund_transfers IS 'Tracks fund transfers between bank accounts (including cash, bank, and UPI accounts)';
COMMENT ON COLUMN public.fund_transfers.id IS 'Unique identifier for the fund transfer';
COMMENT ON COLUMN public.fund_transfers.from_account_id IS 'Source bank account ID (where funds are withdrawn from)';
COMMENT ON COLUMN public.fund_transfers.to_account_id IS 'Destination bank account ID (where funds are deposited to)';
COMMENT ON COLUMN public.fund_transfers.amount IS 'Amount being transferred';
COMMENT ON COLUMN public.fund_transfers.transfer_date IS 'Date when the transfer occurred';
COMMENT ON COLUMN public.fund_transfers.description IS 'Optional description or notes about the transfer';
COMMENT ON COLUMN public.fund_transfers.reference IS 'Transaction reference number';
COMMENT ON COLUMN public.fund_transfers.status IS 'Transfer status: pending, completed, failed, or cancelled';
COMMENT ON COLUMN public.fund_transfers.created_by IS 'User who initiated the transfer';
COMMENT ON COLUMN public.fund_transfers.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.fund_transfers.updated_at IS 'Timestamp when the record was last updated';

-- Grant permissions (adjust based on your security requirements)
-- GRANT SELECT, INSERT, UPDATE ON public.fund_transfers TO authenticated;
-- GRANT SELECT ON public.fund_transfers TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ fund_transfers table created successfully';
    RAISE NOTICE '✅ Indexes created for optimal query performance';
    RAISE NOTICE '✅ Foreign key constraints added for data integrity';
END $$;

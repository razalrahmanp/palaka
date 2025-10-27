/**
 * Enhanced hook for managing vendor-related data with automatic refresh
 */
import { useState, useCallback, useEffect } from 'react';
import { useDataRefresh, REFRESH_KEYS, DataRefreshConfig } from './useDataRefresh';

export interface VendorBill {
  id: string;
  bill_number: string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid';
  date: string;
  due_date?: string;
}

export interface VendorExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  vendor_bill_id?: string;
  entity_reference_id?: string;
}

export interface VendorFinancialSummary {
  total_bills: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
}

export interface UseVendorDataProps {
  vendorId: string;
  initialBills?: VendorBill[];
  initialExpenses?: VendorExpense[];
  initialFinancialSummary?: VendorFinancialSummary;
}

export function useVendorData({ 
  vendorId, 
  initialBills = [], 
  initialExpenses = [], 
  initialFinancialSummary 
}: UseVendorDataProps) {
  const [bills, setBills] = useState<VendorBill[]>(initialBills);
  const [expenses, setExpenses] = useState<VendorExpense[]>(initialExpenses);
  const [financialSummary, setFinancialSummary] = useState<VendorFinancialSummary | undefined>(initialFinancialSummary);
  const [loading, setLoading] = useState(false);
  const [billPaymentHistory, setBillPaymentHistory] = useState<Record<string, unknown[]>>({});

  const { registerRefreshCallback, triggerRefresh, withRefresh } = useDataRefresh();

  // API helpers
  const fetchBills = useCallback(async () => {
    console.log('🔄 Fetching vendor bills...');
    const response = await fetch(`/api/vendors/${vendorId}/bills`);
    if (response.ok) {
      const data = await response.json();
      setBills(Array.isArray(data) ? data : []);
      return data;
    }
    throw new Error('Failed to fetch bills');
  }, [vendorId]);

  const fetchExpenses = useCallback(async (startDate?: string, endDate?: string) => {
    console.log('🔄 Fetching vendor expenses...');
    const params = new URLSearchParams({ 
      supplier_id: vendorId,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate })
    });
    
    const response = await fetch(`/api/finance/expenses?${params}`);
    if (response.ok) {
      const data = await response.json();
      const expenseList = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setExpenses(expenseList);
      return expenseList;
    }
    throw new Error('Failed to fetch expenses');
  }, [vendorId]);

  const fetchFinancialSummary = useCallback(async () => {
    console.log('🔄 Fetching vendor financial summary...');
    const response = await fetch(`/api/vendors/${vendorId}/financial-summary`);
    if (response.ok) {
      const data = await response.json();
      setFinancialSummary(data);
      return data;
    }
    throw new Error('Failed to fetch financial summary');
  }, [vendorId]);

  const fetchBillPaymentHistory = useCallback(async (billId: string) => {
    console.log('🔄 Fetching payment history for bill:', billId);
    const response = await fetch(`/api/vendors/${vendorId}/bills/${billId}/payments`);
    if (response.ok) {
      const data = await response.json();
      setBillPaymentHistory(prev => ({ ...prev, [billId]: data }));
      return data;
    }
    throw new Error('Failed to fetch payment history');
  }, [vendorId]);

  // Register refresh callbacks
  useEffect(() => {
    registerRefreshCallback(REFRESH_KEYS.VENDOR_BILLS, fetchBills);
    registerRefreshCallback(REFRESH_KEYS.VENDOR_EXPENSES, () => fetchExpenses());
    registerRefreshCallback(REFRESH_KEYS.VENDOR_FINANCIAL_SUMMARY, fetchFinancialSummary);
    registerRefreshCallback(REFRESH_KEYS.BILL_PAYMENT_HISTORY, async () => {
      // Refresh payment history for all currently expanded bills
      const billIds = Object.keys(billPaymentHistory);
      await Promise.all(billIds.map(billId => fetchBillPaymentHistory(billId)));
    });
  }, [
    registerRefreshCallback, 
    fetchBills, 
    fetchExpenses, 
    fetchFinancialSummary, 
    fetchBillPaymentHistory,
    billPaymentHistory
  ]);

  // Enhanced mutation functions with automatic refresh
  const createExpense = withRefresh(
    async (expenseData: Partial<VendorExpense>) => {
      console.log('💰 Creating vendor expense...');
      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseData,
          entity_id: vendorId,
          entity_type: 'supplier'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create expense');
      }

      return response.json();
    },
    [REFRESH_KEYS.VENDOR_EXPENSES, REFRESH_KEYS.VENDOR_BILLS, REFRESH_KEYS.VENDOR_FINANCIAL_SUMMARY],
    {
      showSuccessMessage: true,
      successMessage: 'Expense created successfully!'
    }
  );

  const createPayment = withRefresh(
    async (paymentData: {
      amount: number;
      payment_date: string;
      payment_method: string;
      bank_account_id?: string;
      vendor_bill_id?: string;
      reference_number?: string;
      notes?: string;
    }) => {
      console.log('💳 Creating vendor payment...');
      const response = await fetch(`/api/vendors/${vendorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment');
      }

      return response.json();
    },
    [REFRESH_KEYS.VENDOR_BILLS, REFRESH_KEYS.VENDOR_EXPENSES, REFRESH_KEYS.VENDOR_FINANCIAL_SUMMARY, REFRESH_KEYS.BILL_PAYMENT_HISTORY],
    {
      showSuccessMessage: true,
      successMessage: 'Payment recorded successfully!'
    }
  );

  const deleteExpense = withRefresh(
    async (expenseId: string, vendorBillId?: string) => {
      console.log('🗑️ Deleting vendor expense...');
      const response = await fetch('/api/finance/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          expense_id: expenseId,
          vendor_bill_id: vendorBillId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete expense');
      }

      // Optimistically update local state
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      
      return response.json();
    },
    [REFRESH_KEYS.VENDOR_BILLS, REFRESH_KEYS.VENDOR_EXPENSES, REFRESH_KEYS.VENDOR_FINANCIAL_SUMMARY, REFRESH_KEYS.BILL_PAYMENT_HISTORY],
    {
      showSuccessMessage: true,
      successMessage: 'Expense deleted successfully!'
    }
  );

  const updateBill = withRefresh(
    async (billId: string, billData: Partial<VendorBill>) => {
      console.log('📝 Updating vendor bill...');
      const response = await fetch('/api/finance/vendor-bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_id: billId,
          ...billData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update bill');
      }

      return response.json();
    },
    [REFRESH_KEYS.VENDOR_BILLS, REFRESH_KEYS.VENDOR_FINANCIAL_SUMMARY],
    {
      showSuccessMessage: true,
      successMessage: 'Bill updated successfully!'
    }
  );

  // Utility functions
  const refreshAll = useCallback(async (config?: DataRefreshConfig) => {
    setLoading(true);
    try {
      await triggerRefresh([
        REFRESH_KEYS.VENDOR_BILLS,
        REFRESH_KEYS.VENDOR_EXPENSES,
        REFRESH_KEYS.VENDOR_FINANCIAL_SUMMARY
      ], config);
    } finally {
      setLoading(false);
    }
  }, [triggerRefresh]);

  const clearBillPaymentHistory = useCallback((billId?: string) => {
    if (billId) {
      setBillPaymentHistory(prev => {
        const updated = { ...prev };
        delete updated[billId];
        return updated;
      });
    } else {
      setBillPaymentHistory({});
    }
  }, []);

  return {
    // State
    bills,
    expenses,
    financialSummary,
    billPaymentHistory,
    loading,

    // Mutations
    createExpense,
    createPayment,
    deleteExpense,
    updateBill,

    // Manual refresh
    refreshAll,
    fetchBills,
    fetchExpenses,
    fetchFinancialSummary,
    fetchBillPaymentHistory,

    // Utilities
    clearBillPaymentHistory,
    setBills,
    setExpenses,
    setFinancialSummary,
    setBillPaymentHistory
  };
}
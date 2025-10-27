/**
 * Example: Enhanced VendorBillsTab with automatic data refresh
 * 
 * This shows how to integrate the useVendorData hook to solve the data refresh issue
 */

import React from 'react';
import { useVendorData } from '@/hooks/useVendorData';
import { Button } from '@/components/ui/button';

interface Payment {
  amount: number;
  date: string;
  method: string;
}

interface VendorBillsTabEnhancedProps {
  vendorId: string;
  vendorName: string;
  // Remove these props as they'll be managed by the hook
  // bills: VendorBill[];
  // financialSummary: VendorFinancialSummary;
  // onBillUpdate: () => void;
}

export function VendorBillsTabEnhanced({ 
  vendorId, 
  vendorName 
}: VendorBillsTabEnhancedProps) {
  const {
    bills,
    expenses,
    financialSummary,
    billPaymentHistory,
    loading,
    createExpense,
    createPayment,
    deleteExpense,
    refreshAll,
    fetchBillPaymentHistory,
    clearBillPaymentHistory
  } = useVendorData({ vendorId });

  // Example: Enhanced expense creation with automatic refresh
  const handleCreateExpense = async (expenseData: {
    date: string;
    description: string;
    amount: string;
    category: string;
    payment_method: string;
    vendor_bill_id?: string;
  }) => {
    try {
      // This will automatically refresh bills, expenses, and financial summary
      await createExpense({
        date: expenseData.date,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        category: expenseData.category,
        payment_method: expenseData.payment_method,
        vendor_bill_id: expenseData.vendor_bill_id
      });

      console.log('✅ Expense created and data refreshed automatically!');
    } catch (error) {
      console.error('❌ Failed to create expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to create expense');
    }
  };

  // Example: Enhanced payment creation with automatic refresh
  const handleCreatePayment = async (paymentData: {
    amount: number;
    payment_date: string;
    payment_method: string;
    vendor_bill_id?: string;
    reference_number?: string;
  }) => {
    try {
      // This will automatically refresh bills, expenses, financial summary, and payment history
      await createPayment(paymentData);

      console.log('✅ Payment created and data refreshed automatically!');
    } catch (error) {
      console.error('❌ Failed to create payment:', error);
      alert(error instanceof Error ? error.message : 'Failed to create payment');
    }
  };

  // Example: Enhanced expense deletion with automatic refresh
  const handleDeleteExpense = async (expense: { id: string; vendor_bill_id?: string }) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      // This will automatically refresh bills, expenses, and financial summary
      await deleteExpense(expense.id, expense.vendor_bill_id);

      console.log('✅ Expense deleted and data refreshed automatically!');
    } catch (error) {
      console.error('❌ Failed to delete expense:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete expense');
    }
  };

  // Example: Manual refresh for edge cases
  const handleManualRefresh = async () => {
    try {
      await refreshAll({
        showSuccessMessage: true,
        successMessage: 'Data refreshed successfully!'
      });
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      alert('Failed to refresh data. Please try again.');
    }
  };

  // Example: Fetch payment history for a specific bill
  const handleViewPaymentHistory = async (billId: string) => {
    try {
      await fetchBillPaymentHistory(billId);
      console.log('✅ Payment history loaded for bill:', billId);
    } catch (error) {
      console.error('❌ Failed to fetch payment history:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Refreshing data...</p>
        </div>
      )}

      {/* Manual refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vendor Bills - {vendorName}</h2>
        <Button 
          variant="outline" 
          onClick={handleManualRefresh}
          disabled={loading}
        >
          🔄 Refresh All Data
        </Button>
      </div>

      {/* Financial Summary */}
      {financialSummary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-blue-600">Total Bills</p>
            <p className="text-2xl font-bold text-blue-800">{financialSummary.total_bills}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-green-600">Total Amount</p>
            <p className="text-2xl font-bold text-green-800">₹{financialSummary.total_amount.toLocaleString()}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <p className="text-sm text-yellow-600">Paid Amount</p>
            <p className="text-2xl font-bold text-yellow-800">₹{financialSummary.paid_amount.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <p className="text-sm text-red-600">Outstanding</p>
            <p className="text-2xl font-bold text-red-800">₹{financialSummary.outstanding_amount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Bills ({bills.length})</h3>
        {bills.map(bill => (
          <div key={bill.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{bill.bill_number}</h4>
                <p className="text-sm text-gray-600">{bill.description}</p>
                <p className="text-sm">
                  Total: ₹{bill.total_amount.toLocaleString()} | 
                  Paid: ₹{bill.paid_amount.toLocaleString()} | 
                  Remaining: ₹{bill.remaining_amount.toLocaleString()}
                </p>
                <span className={`inline-block px-2 py-1 text-xs rounded ${
                  bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                  bill.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {bill.status.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleViewPaymentHistory(bill.id)}
                >
                  View History
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCreatePayment({
                    amount: bill.remaining_amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'cash',
                    vendor_bill_id: bill.id
                  })}
                  disabled={bill.remaining_amount <= 0}
                >
                  Pay Bill
                </Button>
              </div>
            </div>
            
            {/* Payment History */}
            {billPaymentHistory[bill.id] && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-medium mb-2">Payment History</h5>
                {billPaymentHistory[bill.id].length > 0 ? (
                  <div className="space-y-2">
                    {(billPaymentHistory[bill.id] as Payment[]).map((payment, index: number) => (
                      <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                        <p>Amount: ₹{payment.amount} | Date: {payment.date} | Method: {payment.method}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No payments recorded</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold">Expenses ({expenses.length})</h3>
        {expenses.map(expense => (
          <div key={expense.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{expense.description}</h4>
                <p className="text-sm text-gray-600">
                  ₹{expense.amount.toLocaleString()} | {expense.date} | {expense.payment_method}
                </p>
                <p className="text-xs text-gray-500">Category: {expense.category}</p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteExpense(expense)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Example buttons for testing */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          onClick={() => handleCreateExpense({
            date: new Date().toISOString().split('T')[0],
            description: `Test expense - ${new Date().toLocaleTimeString()}`,
            amount: '1000',
            category: 'Office Supplies',
            payment_method: 'cash'
          })}
        >
          Add Test Expense
        </Button>
        <Button
          onClick={() => clearBillPaymentHistory()}
          variant="outline"
        >
          Clear Payment History Cache
        </Button>
      </div>
    </div>
  );
}

/*
INTEGRATION INSTRUCTIONS:

1. Replace your existing VendorBillsTab component with this enhanced version
2. Remove the manual refresh calls in your existing code
3. Remove the onBillUpdate prop dependency
4. The hook will automatically handle all data refresh scenarios:
   - After creating expenses
   - After creating payments
   - After deleting expenses
   - After updating bills

KEY BENEFITS:
✅ Automatic data refresh after all mutations
✅ Optimistic updates for better UX
✅ Proper loading states
✅ Error handling with user feedback
✅ Debounced refresh to prevent multiple rapid calls
✅ Payment history caching with automatic invalidation
✅ Manual refresh option for edge cases

MIGRATION STEPS:
1. Import the new hooks: useVendorData, useDataRefresh
2. Replace manual API calls with hook methods
3. Remove manual refresh logic from mutation handlers
4. Update component props to remove onBillUpdate callback
5. Test all mutation flows to ensure automatic refresh works

This approach solves the root cause of data not reflecting in UI by:
- Centralizing data management
- Automatic refresh after mutations
- Proper error handling
- Consistent state management
*/
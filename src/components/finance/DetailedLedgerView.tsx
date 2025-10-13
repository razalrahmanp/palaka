'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';

interface LedgerDetail {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  debit: number;
  credit: number;
  balance_due: number;
  status?: string;
  opening_balance?: number;
  last_transaction_date?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  reference_number?: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  source_document?: string;
  status?: string;
}

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  suppliers?: {
    id: string;
    name: string;
    email?: string;
  };
}





interface DetailedLedgerViewProps {
  ledgerId: string;
  ledgerType: string;
}

export function DetailedLedgerView({ ledgerId, ledgerType }: DetailedLedgerViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ledgerDetail, setLedgerDetail] = useState<LedgerDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0,
    transactionCount: 0
  });
  const [employeeSalaryInfo, setEmployeeSalaryInfo] = useState<{
    monthlySalary: number;
    totalPaid: number;
    currentMonthPaid: number;
    currentMonthPending: number;
    currentMonthIncentive: number;
    lastMonthPaid: number;
    lastMonthPending: number;
    lastMonthIncentive: number;
  } | null>(null);

  useEffect(() => {
    fetchLedgerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, ledgerType]);

  const fetchLedgerDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch ledger summary
      const summaryResponse = await fetch(
        `/api/finance/ledgers-summary?type=${ledgerType}&search=&page=1&limit=1000&hideZeroBalances=false`
      );
      
      if (!summaryResponse.ok) throw new Error('Failed to fetch ledger');
      
      const summaryData = await summaryResponse.json();
      const ledger = summaryData.data?.find((l: LedgerDetail) => l.id.toString() === ledgerId);
      
      if (ledger) {
        setLedgerDetail(ledger);
      }

      // Fetch real transactions based on ledger type
      let fetchedTransactions: Transaction[] = [];
      
      if (ledgerType === 'supplier') {
        fetchedTransactions = await fetchSupplierTransactions(ledgerId);
      } else if (ledgerType === 'customer') {
        fetchedTransactions = await fetchCustomerTransactions(ledgerId);
      } else if (ledgerType === 'employee') {
        console.log('🔍 Generating employee transactions for ledger:', { ledgerId, ledgerType });
        // For now, use enhanced mock data based on real salary patterns
        fetchedTransactions = generateEmployeeMockTransactions(ledger);
        console.log('✅ Employee transactions generated:', fetchedTransactions.length);
      } else {
        // For other types, use mock data for now
        fetchedTransactions = generateMockTransactions(ledger);
      }
      
      setTransactions(fetchedTransactions);
      
      // Calculate totals from actual transactions
      const totals = calculateTotalsFromTransactions(fetchedTransactions);
      setCalculatedTotals(totals);
      
      // Fetch employee salary information if this is an employee ledger
      if (ledgerType === 'employee' && ledger) {
        await fetchEmployeeSalaryInfo(ledgerId, totals.totalCredit, fetchedTransactions);
      }
      
      console.log(`✅ Calculated totals for ${ledgerType} ${ledgerId}:`, totals);
      
    } catch (error) {
      console.error('Error fetching ledger details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSalaryInfo = async (employeeId: string, totalPaidAmount: number, employeeTransactions: Transaction[]) => {
    try {
      console.log('🔍 Calculating employee salary info for:', employeeId);
      
      // Get position from ledger detail
      const position = ledgerDetail?.name.includes('(') 
        ? ledgerDetail.name.match(/\(([^)]+)\)/)?.[1] 
        : 'Staff';
      
      // Determine monthly salary based on position
      const getBaseSalary = (pos: string | undefined): number => {
        if (!pos) return 25000;
        const posLower = pos.toLowerCase();
        if (posLower.includes('coordinator')) return 35000;
        if (posLower.includes('representative')) return 30000;
        if (posLower.includes('manager')) return 45000;
        if (posLower.includes('assistant')) return 22000;
        return 25000;
      };
      
      const monthlySalary = getBaseSalary(position);
      
      // Get current date for month calculations
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth(); // 0-based (0 = January)
      const currentYear = currentDate.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Calculate payments by month from actual transactions, separating salary and incentives
      let currentMonthSalary = 0;
      let currentMonthIncentive = 0;
      let lastMonthSalary = 0;
      let lastMonthIncentive = 0;
      
      employeeTransactions.forEach(txn => {
        const txnDate = new Date(txn.date);
        const txnMonth = txnDate.getMonth();
        const txnYear = txnDate.getFullYear();
        
        // Only count credit amounts (payments made to employee)
        const amount = txn.credit_amount;
        
        // Determine if transaction is salary or incentive based on transaction type or description
        const isSalaryPayment = txn.transaction_type === 'Salary Payment' || 
                               txn.description.toLowerCase().includes('salary');
        const isIncentivePayment = txn.transaction_type === 'Incentive Payment' || 
                                  txn.description.toLowerCase().includes('incentive');
        
        if (txnYear === currentYear && txnMonth === currentMonth) {
          if (isSalaryPayment) {
            currentMonthSalary += amount;
          } else if (isIncentivePayment) {
            currentMonthIncentive += amount;
          }
        } else if (txnYear === lastMonthYear && txnMonth === lastMonth) {
          if (isSalaryPayment) {
            lastMonthSalary += amount;
          } else if (isIncentivePayment) {
            lastMonthIncentive += amount;
          }
        }
      });
      
      // Calculate total monthly payments (salary only for pending calculation)
      const currentMonthPaid = currentMonthSalary;
      const lastMonthPaid = lastMonthSalary;
      
      // Calculate pending amounts (based on salary only, incentives are additional)
      const currentMonthPending = Math.max(0, monthlySalary - currentMonthPaid);
      const lastMonthPending = Math.max(0, monthlySalary - lastMonthPaid);
      
      setEmployeeSalaryInfo({
        monthlySalary,
        totalPaid: totalPaidAmount,
        currentMonthPaid,
        currentMonthPending,
        currentMonthIncentive,
        lastMonthPaid,
        lastMonthPending,
        lastMonthIncentive
      });
      
      console.log('✅ Employee salary info calculated:', {
        position,
        monthlySalary,
        totalPaid: totalPaidAmount,
        currentMonth: {
          salary: currentMonthPaid,
          incentive: currentMonthIncentive,
          pending: currentMonthPending
        },
        lastMonth: {
          salary: lastMonthPaid,
          incentive: lastMonthIncentive,
          pending: lastMonthPending
        },
        currentMonthNum: currentMonth + 1, // Display as 1-based
        lastMonthNum: lastMonth + 1,
        transactionCount: employeeTransactions.length,
        sampleTransactions: employeeTransactions.slice(0, 3).map(t => ({ 
          date: t.date, 
          amount: t.credit_amount,
          type: t.transaction_type,
          month: new Date(t.date).getMonth() + 1,
          year: new Date(t.date).getFullYear()
        }))
      });
      
    } catch (error) {
      console.error('Error calculating employee salary info:', error);
    }
  };

  const calculateTotalsFromTransactions = (txns: Transaction[]) => {
    const totalDebit = txns.reduce((sum, txn) => sum + txn.debit_amount, 0);
    const totalCredit = txns.reduce((sum, txn) => sum + txn.credit_amount, 0);
    const netBalance = totalDebit - totalCredit;
    
    return {
      totalDebit,
      totalCredit,
      netBalance,
      transactionCount: txns.length
    };
  };

  const fetchSupplierTransactions = async (supplierId: string): Promise<Transaction[]> => {
    try {
      // Fetch vendor bills for this supplier - UNIFIED DATA SOURCE with VendorBillsTab
      const billsResponse = await fetch(`/api/finance/vendor-bills?supplier_id=${supplierId}`);
      const billsData = await billsResponse.json();
      
      console.log('🔍 DetailedLedgerView data source:', {
        billsCount: billsData.data?.length || 0,
        billsTotal: billsData.data?.reduce((sum: number, bill: VendorBill) => sum + (bill.total_amount || 0), 0) || 0,
        paidTotal: billsData.data?.reduce((sum: number, bill: VendorBill) => sum + (bill.paid_amount || 0), 0) || 0
      });
      
      const transactions: Transaction[] = [];
      
      // Add vendor bills as debit transactions
      if (billsData.success && billsData.data) {
        billsData.data.forEach((bill: VendorBill) => {
          transactions.push({
            id: `bill-${bill.id}`,
            date: bill.bill_date || bill.created_at,
            description: `Vendor Bill - ${bill.bill_number || 'N/A'}`,
            reference_number: bill.bill_number,
            transaction_type: 'Vendor Bill',
            debit_amount: bill.total_amount || 0,
            credit_amount: 0,
            running_balance: 0, // Will be calculated
            source_document: `Bill #${bill.bill_number}`,
            status: bill.status || 'pending'
          });
        });
      }
      
      // Add payments based on vendor_bills.paid_amount for consistency with VendorBillsTab
      if (billsData.success && billsData.data) {
        billsData.data.forEach((bill: VendorBill) => {
          // Only add payment transaction if the bill has been paid (partially or fully)
          if (bill.paid_amount && bill.paid_amount > 0) {
            transactions.push({
              id: `payment-for-bill-${bill.id}`,
              date: bill.updated_at || bill.created_at, // Use updated_at as proxy for payment date
              description: `Payment for vendor bill - ${bill.suppliers?.name || 'Vendor'} (${bill.bill_number})`,
              reference_number: bill.bill_number,
              transaction_type: 'Payment',
              debit_amount: 0,
              credit_amount: bill.paid_amount,
              running_balance: 0, // Will be calculated
              source_document: `Payment for Bill ${bill.bill_number}`,
              status: bill.status === 'paid' ? 'completed' : 'partial'
            });
          }
        });
      }
      
      // Sort chronologically
      transactions.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Calculate running balances
      let runningBalance = 0;
      const transactionsWithBalance = transactions.map(txn => {
        runningBalance += txn.debit_amount - txn.credit_amount;
        return {
          ...txn,
          running_balance: runningBalance
        };
      });
      
      // Return in chronological order (oldest first) for traditional accounting presentation
      return transactionsWithBalance;
      
    } catch (error) {
      console.error('Error fetching supplier transactions:', error);
      return [];
    }
  };

  const fetchCustomerTransactions = async (customerId: string): Promise<Transaction[]> => {
    try {
      console.log('🔍 Fetching customer transactions for:', customerId);
      
      // Use the dedicated customer transactions API that follows the same logic as ledgers-summary
      const response = await fetch(`/api/finance/customer-transactions?customer_id=${customerId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch customer transactions:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Customer transactions API error:', data.error);
        return [];
      }

      const { transactions: txnData, summary } = data;
      
      console.log('🔍 Customer transaction data from API:', {
        customerId,
        summary,
        transactionTypes: Object.keys(txnData).map(type => `${type}: ${txnData[type].length}`)
      });

      const transactions: Transaction[] = [];

      // Process all transaction types from the API response (excluding invoices to avoid double counting)
      const allTransactions = [
        ...txnData.sales_orders,
        // Note: Invoices are excluded to prevent double counting with sales orders
        ...txnData.payments,
        ...txnData.returns,
        ...txnData.refunds
      ];

      // Convert API format to internal Transaction format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allTransactions.forEach((txn: any) => {
        transactions.push({
          id: `${txn.type.toLowerCase().replace(' ', '-')}-${txn.id}`,
          date: txn.date,
          description: txn.description,
          reference_number: txn.reference,
          transaction_type: txn.type,
          debit_amount: txn.transaction_type === 'debit' ? txn.amount : 0,
          credit_amount: txn.transaction_type === 'credit' ? txn.amount : 0,
          running_balance: 0, // Will be calculated
          source_document: txn.description,
          status: txn.status
        });
      });

      // Sort chronologically (oldest first for proper accounting flow)
      // If dates are same, prioritize: Sales Orders → Payments → Returns → Refunds
      transactions.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB; // Different dates: oldest first
        }
        
        // Same date: prioritize transaction types for proper accounting flow
        const typeOrder = {
          'Sales Order': 1,
          'Sales Return': 2, // Returns create new obligations (debits)
          'Payment': 3,
          'Invoice Refund': 4 // Refunds settle the return obligations (credits)
        };
        
        const orderA = typeOrder[a.transaction_type as keyof typeof typeOrder] || 5;
        const orderB = typeOrder[b.transaction_type as keyof typeof typeOrder] || 5;
        
        return orderA - orderB;
      });

      // Calculate running balances starting from 0 (for customers: debit increases balance, credit decreases)
      let runningBalance = 0;
      const transactionsWithBalance = transactions.map(txn => {
        runningBalance += txn.debit_amount - txn.credit_amount;
        return {
          ...txn,
          running_balance: runningBalance
        };
      });

      console.log(`✅ Generated ${transactionsWithBalance.length} customer transactions`);

      // Return in chronological order (oldest first) for proper accounting presentation
      return transactionsWithBalance;

    } catch (error) {
      console.error('Error fetching customer transactions:', error);
      return [];
    }
  };



  const generateMockTransactions = (ledger: LedgerDetail | undefined): Transaction[] => {
    if (!ledger) return [];
    
    // For employees, generate more realistic data
    if (ledger.type === 'employee') {
      return generateEmployeeMockTransactions(ledger);
    }
    
    // Generate transaction entries in chronological order first
    const sampleCount = Math.min(ledger.total_transactions, 10);
    const chronologicalTransactions: Omit<Transaction, 'running_balance'>[] = [];
    
    // Add opening balance entry
    if (ledger.opening_balance && ledger.opening_balance !== 0) {
      chronologicalTransactions.push({
        id: 'opening',
        date: '2025-01-01',
        description: 'Opening Balance',
        transaction_type: 'Opening',
        debit_amount: ledger.opening_balance > 0 ? ledger.opening_balance : 0,
        credit_amount: ledger.opening_balance < 0 ? Math.abs(ledger.opening_balance) : 0,
        status: 'completed'
      });
    }
    
    // Generate transactions
    for (let i = 0; i < sampleCount; i++) {
      // For employees: all transactions are payments made to employee (credits)
      const isDebit = ledgerType === 'employee' ? false : i % 2 === 0;
      const amount = Math.random() * 50000 + 10000;
      
      chronologicalTransactions.push({
        id: `txn-${i}`,
        date: new Date(2025, 0, 5 + i * 3).toISOString().split('T')[0],
        description: getDescriptionByType(ledgerType, isDebit),
        reference_number: `REF-${1000 + i}`,
        transaction_type: isDebit ? 'Invoice' : 'Payment',
        debit_amount: isDebit ? amount : 0,
        credit_amount: isDebit ? 0 : amount,
        status: 'completed'
      });
    }

    // Calculate running balance in chronological order
    let runningBalance = ledger.opening_balance || 0;
    const transactionsWithBalance = chronologicalTransactions.map(txn => {
      if (txn.id === 'opening') {
        return {
          ...txn,
          running_balance: runningBalance
        };
      }
      
      // Calculate running balance
      runningBalance = runningBalance + txn.debit_amount - txn.credit_amount;
      
      return {
        ...txn,
        running_balance: runningBalance
      };
    });

    // Return in chronological order (oldest first) for consistent accounting presentation
    return transactionsWithBalance;
  };

  const generateEmployeeMockTransactions = (ledger: LedgerDetail): Transaction[] => {
    if (!ledger) return [];
    
    // Generate realistic employee salary data based on actual expense patterns
    const employeeName = ledger.name.split('(')[0].trim(); // Extract name without position
    const position = ledger.name.includes('(') ? ledger.name.match(/\(([^)]+)\)/)?.[1] : 'Staff';
    
    // Create realistic salary and incentive payments similar to the expense data
    const transactions: Omit<Transaction, 'running_balance'>[] = [];
    
    // Generate recent salary transactions (last 3 months)
    const salaryTransactions = [
      { date: '2025-10-10', desc: `SALARY ${employeeName.toUpperCase()}`, amount: 6000, type: 'Fixed' },
      { date: '2025-10-09', desc: `${employeeName.split(' ')[0].toUpperCase()} INCENTIVE`, amount: 4000, type: 'Variable' },
      { date: '2025-10-08', desc: `${employeeName.split(' ')[0].toLowerCase()} incentive`, amount: 1600, type: 'Variable' },
      { date: '2025-10-08', desc: `incentive ${employeeName.split(' ')[0].toLowerCase()}`, amount: 3500, type: 'Variable' },
      { date: '2025-10-01', desc: `SALARY`, amount: 8000, type: 'Fixed' },
      { date: '2025-09-23', desc: `SALARY`, amount: 3000, type: 'Fixed' },
      { date: '2025-09-20', desc: `SALARY`, amount: 4000, type: 'Fixed' },
      { date: '2025-09-17', desc: `INCENTIVE`, amount: 8800, type: 'Variable' },
      { date: '2025-09-16', desc: `INCENTIVE ${employeeName.split(' ')[0].toUpperCase()}`, amount: 1200, type: 'Variable' },
      { date: '2025-09-12', desc: `INCENTIVE`, amount: 9000, type: 'Variable' },
      { date: '2025-09-11', desc: `salary ${employeeName.split(' ')[0].toLowerCase()}`, amount: 7000, type: 'Fixed' },
      { date: '2025-09-10', desc: `${employeeName.split(' ')[0].toUpperCase()} INCENTIVE`, amount: 9400, type: 'Variable' },
      { date: '2025-09-09', desc: `salary ${employeeName.split(' ')[0].toLowerCase()}`, amount: 5000, type: 'Fixed' },
    ];
    
    // Convert to transaction format
    salaryTransactions.forEach((sal, index) => {
      const transactionType = sal.type === 'Fixed' ? 'Salary Payment' : 'Incentive Payment';
      
      transactions.push({
        id: `exp-${ledger.id}-${index}`,
        date: sal.date,
        description: `${sal.desc} [${employeeName} (${position})]`,
        reference_number: `EXP-${String(Math.random()).slice(2, 8)}`,
        transaction_type: transactionType,
        debit_amount: 0, // All are payments made to employee
        credit_amount: sal.amount,
        status: 'completed',
        source_document: `Expense Record - Salaries & Benefits`
      });
    });
    
    // Sort chronologically (oldest first)
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate running balances (for employees, credits accumulate as negative balance)
    let runningBalance = 0;
    const transactionsWithBalance = transactions.map(txn => {
      runningBalance += txn.debit_amount - txn.credit_amount; // Credits make balance more negative
      return {
        ...txn,
        running_balance: runningBalance
      };
    });
    
    return transactionsWithBalance;
  };

  const getDescriptionByType = (type: string, isDebit: boolean): string => {
    const descriptions: Record<string, { debit: string; credit: string }> = {
      customer: { debit: 'Sales Invoice', credit: 'Payment Received' },
      supplier: { debit: 'Vendor Bill', credit: 'Payment Made' },
      employee: { debit: 'Salary/Expense', credit: 'Salary Payment' },
      bank: { debit: 'Deposit', credit: 'Withdrawal' },
      investors: { debit: 'Investment', credit: 'Withdrawal' },
      loans: { debit: 'Loan Disbursement', credit: 'Loan Repayment' },
      sales_returns: { debit: 'Return Adjustment', credit: 'Sales Return' },
      purchase_returns: { debit: 'Purchase Return', credit: 'Return Adjustment' }
    };

    return isDebit 
      ? descriptions[type]?.debit || 'Debit Entry'
      : descriptions[type]?.credit || 'Credit Entry';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { color: string; icon: string }> = {
      completed: { color: 'bg-green-100 text-green-700 border-green-300', icon: '✓' },
      paid: { color: 'bg-green-100 text-green-700 border-green-300', icon: '✓' },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '⏳' },
      partial: { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '◐' },
      cancelled: { color: 'bg-red-100 text-red-700 border-red-300', icon: '✗' },
      overdue: { color: 'bg-red-100 text-red-700 border-red-300', icon: '⚠' },
    };
    
    const config = statusConfig[status || 'completed'] || statusConfig.completed;
    return (
      <Badge className={`${config.color} text-xs px-1 py-0 font-medium`}>
        <span className="mr-1">{config.icon}</span>
        {status || 'OK'}
      </Badge>
    );
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = generateProfessionalReport();
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleExport = () => {
    const exportMenu = document.createElement('div');
    exportMenu.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    exportMenu.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">Export Options</h3>
        <div class="space-y-2">
          <button id="export-csv" class="w-full p-3 text-left hover:bg-gray-100 rounded-md border">
            📊 Export as CSV
          </button>
          <button id="export-pdf" class="w-full p-3 text-left hover:bg-gray-100 rounded-md border">
            📄 Export as PDF Report
          </button>
          <button id="export-excel" class="w-full p-3 text-left hover:bg-gray-100 rounded-md border">
            📈 Export as Excel
          </button>
        </div>
        <button id="close-export" class="w-full mt-4 p-2 bg-gray-200 rounded-md">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(exportMenu);
    
    exportMenu.querySelector('#export-csv')?.addEventListener('click', () => {
      exportToCSV();
      document.body.removeChild(exportMenu);
    });
    
    exportMenu.querySelector('#export-pdf')?.addEventListener('click', () => {
      exportToPDF();
      document.body.removeChild(exportMenu);
    });
    
    exportMenu.querySelector('#export-excel')?.addEventListener('click', () => {
      exportToExcel();
      document.body.removeChild(exportMenu);
    });
    
    exportMenu.querySelector('#close-export')?.addEventListener('click', () => {
      document.body.removeChild(exportMenu);
    });
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Description', 'Reference', 'Type', 'Debit', 'Credit', 'Balance', 'Status'],
      ...transactions.map(txn => [
        formatDate(txn.date),
        `"${txn.description.replace(/"/g, '""')}"`,
        txn.reference_number || '',
        txn.transaction_type,
        txn.debit_amount > 0 ? txn.debit_amount.toString() : '',
        txn.credit_amount > 0 ? txn.credit_amount.toString() : '',
        txn.running_balance.toString(),
        txn.status || 'completed'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ledgerDetail?.name || 'Ledger'}_Statement_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const reportContent = generateProfessionalReport();
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      // Trigger print dialog which can save as PDF
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const exportToExcel = () => {
    // Create Excel-compatible HTML
    const excelData = `
      <table border="1">
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td>Date</td><td>Description</td><td>Reference</td><td>Type</td>
          <td>Debit (₹)</td><td>Credit (₹)</td><td>Balance (₹)</td><td>Status</td>
        </tr>
        ${transactions.map(txn => `
          <tr>
            <td>${formatDate(txn.date)}</td>
            <td>${txn.description}</td>
            <td>${txn.reference_number || ''}</td>
            <td>${txn.transaction_type}</td>
            <td style="text-align: right;">${txn.debit_amount > 0 ? txn.debit_amount : ''}</td>
            <td style="text-align: right;">${txn.credit_amount > 0 ? txn.credit_amount : ''}</td>
            <td style="text-align: right;">${txn.running_balance}</td>
            <td>${txn.status || 'completed'}</td>
          </tr>
        `).join('')}
      </table>
    `;

    const blob = new Blob([excelData], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ledgerDetail?.name || 'Ledger'}_Statement_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateProfessionalReport = (): string => {
    const currentDate = new Date().toLocaleDateString('en-IN');
    const currentTime = new Date().toLocaleTimeString('en-IN');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${ledgerDetail?.name} - Account Statement</title>
          <style>
            @page { margin: 1cm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; color: #333; line-height: 1.4; }
            .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
            .report-title { font-size: 20px; color: #374151; margin-bottom: 10px; }
            .report-date { font-size: 12px; color: #6b7280; }
            
            .account-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .info-section h3 { font-size: 16px; color: #1e40af; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .info-label { font-weight: 600; color: #374151; }
            .info-value { color: #6b7280; }
            
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
            .summary-card h4 { margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; }
            .summary-card p { margin: 0; font-size: 18px; font-weight: bold; }
            .debit { color: #dc2626; }
            .credit { color: #16a34a; }
            .balance { color: #2563eb; }
            .transactions { color: #7c3aed; }
            
            .transactions-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .transactions-table th { background: #f1f5f9; padding: 12px 8px; text-align: left; border: 1px solid #cbd5e1; font-weight: 600; color: #334155; }
            .transactions-table td { padding: 10px 8px; border: 1px solid #e2e8f0; }
            .transactions-table tr:nth-child(even) { background: #fafafa; }
            .amount { text-align: right; font-weight: 600; }
            .date { font-family: monospace; font-size: 11px; }
            .reference { font-family: monospace; font-size: 10px; color: #6b7280; }
            
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            
            @media print {
              .no-print { display: none; }
              body { font-size: 12px; }
              .summary-cards { grid-template-columns: repeat(2, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">PALAKA ERP</div>
            <div class="report-title">Account Statement - ${ledgerDetail?.name}</div>
            <div class="report-date">Generated on ${currentDate} at ${currentTime}</div>
          </div>
          
          <div class="account-info">
            <div class="info-section">
              <h3>Account Details</h3>
              <div class="info-row">
                <span class="info-label">Account ID:</span>
                <span class="info-value">${ledgerDetail?.id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account Type:</span>
                <span class="info-value">${ledgerType.charAt(0).toUpperCase() + ledgerType.slice(1)}</span>
              </div>
              ${ledgerDetail?.email ? `
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${ledgerDetail.email}</span>
                </div>
              ` : ''}
              ${ledgerDetail?.phone ? `
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value">${ledgerDetail.phone}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="info-section">
              <h3>Statement Period</h3>
              <div class="info-row">
                <span class="info-label">From:</span>
                <span class="info-value">${transactions.length > 0 ? formatDate(transactions[transactions.length - 1].date) : '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">To:</span>
                <span class="info-value">${transactions.length > 0 ? formatDate(transactions[0].date) : '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">${ledgerDetail?.status || 'Active'}</span>
              </div>
            </div>
          </div>
          
          <div class="summary-cards">
            <div class="summary-card">
              <h4>Total ${ledgerType === 'supplier' ? 'Bills' : 'Debit'}</h4>
              <p class="debit">${formatCurrency(ledgerDetail?.debit || ledgerDetail?.total_amount || 0)}</p>
            </div>
            <div class="summary-card">
              <h4>Total ${ledgerType === 'supplier' ? 'Payments' : 'Credit'}</h4>
              <p class="credit">${formatCurrency(ledgerDetail?.credit || 0)}</p>
            </div>
            <div class="summary-card">
              <h4>Outstanding Balance</h4>
              <p class="balance">${formatCurrency(ledgerDetail?.balance_due || 0)}</p>
            </div>
            <div class="summary-card">
              <h4>Total Transactions</h4>
              <p class="transactions">${ledgerDetail?.total_transactions || 0}</p>
            </div>
          </div>
          
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Type</th>
                <th>Debit (₹)</th>
                <th>Credit (₹)</th>
                <th>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(txn => `
                <tr>
                  <td class="date">${formatDate(txn.date)}</td>
                  <td>
                    ${txn.description}
                    ${txn.source_document ? `<br><small style="color: #6b7280;">${txn.source_document}</small>` : ''}
                  </td>
                  <td class="reference">${txn.reference_number || '-'}</td>
                  <td>${txn.transaction_type}</td>
                  <td class="amount debit">${txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : '-'}</td>
                  <td class="amount credit">${txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '-'}</td>
                  <td class="amount balance">${formatCurrency(txn.running_balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This statement is generated electronically and does not require a signature.</p>
            <p>For any queries, please contact your account manager.</p>
          </div>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 text-lg">Loading ledger details...</span>
      </div>
    );
  }

  if (!ledgerDetail) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <FileText className="h-24 w-24 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Ledger Not Found</h2>
        <p className="text-gray-500 mb-6">The requested ledger could not be found.</p>
        <Button onClick={() => router.push('/ledgers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledgers
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-4">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/ledgers')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                {ledgerDetail.name}
              </h1>
              <p className="text-sm text-gray-600">
                {ledgerType.charAt(0).toUpperCase() + ledgerType.slice(1)} Ledger - Account Statement
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium mb-1">
                  {ledgerType === 'supplier' ? 'Total Bills (Debit)' : 'Total Debit'}
                </p>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(calculatedTotals.totalDebit)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium mb-1">
                  {ledgerType === 'supplier' ? 'Total Payments (Credit)' : 'Total Credit'}
                </p>
                <p className="text-lg font-bold text-red-900">
                  {formatCurrency(calculatedTotals.totalCredit)}
                </p>
              </div>
              <TrendingDown className="h-6 w-6 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">
                  Outstanding Amount
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(calculatedTotals.netBalance)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium mb-1">Transaction Count</p>
                <p className="text-lg font-bold text-purple-900">
                  {calculatedTotals.transactionCount}
                </p>
              </div>
              <FileText className="h-6 w-6 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Account Information */}
      <Card className="mb-4">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {ledgerType === 'employee' && employeeSalaryInfo ? (
            /* Employee-specific professional layout */
            <div className="space-y-6">
              {/* Contact & Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ledgerDetail.email && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Email Address</span>
                      <span className="font-medium text-sm text-gray-800">{ledgerDetail.email}</span>
                    </div>
                  )}
                  {ledgerDetail.phone && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Phone Number</span>
                      <span className="font-medium text-sm text-gray-800">{ledgerDetail.phone}</span>
                    </div>
                  )}
                  {ledgerDetail.last_transaction_date && (
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">Last Transaction</span>
                      <span className="font-medium text-sm text-gray-800">{formatDate(ledgerDetail.last_transaction_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Salary Structure */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">Salary Structure</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-md border border-blue-100">
                    <span className="text-sm text-gray-600">Monthly Salary</span>
                    <span className="font-bold text-lg text-blue-700">{formatCurrency(employeeSalaryInfo.monthlySalary)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-md border border-blue-100">
                    <span className="text-sm text-gray-600">Total Paid (All Time)</span>
                    <span className="font-bold text-lg text-green-600">{formatCurrency(employeeSalaryInfo.totalPaid)}</span>
                  </div>
                </div>
              </div>

              {/* Current Month Performance */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Performance
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-md p-4 border border-green-100">
                    <div className="flex flex-col items-center text-center">
                      <span className="text-xs text-gray-500 mb-1">Salary Paid</span>
                      <span className="font-bold text-xl text-green-600">{formatCurrency(employeeSalaryInfo.currentMonthPaid)}</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`bg-green-500 h-2 rounded-full transition-all duration-300 ${
                            employeeSalaryInfo.currentMonthPaid >= employeeSalaryInfo.monthlySalary ? 'w-full' :
                            employeeSalaryInfo.currentMonthPaid >= employeeSalaryInfo.monthlySalary * 0.75 ? 'w-3/4' :
                            employeeSalaryInfo.currentMonthPaid >= employeeSalaryInfo.monthlySalary * 0.5 ? 'w-1/2' :
                            employeeSalaryInfo.currentMonthPaid >= employeeSalaryInfo.monthlySalary * 0.25 ? 'w-1/4' : 'w-1/12'
                          }`}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {Math.round((employeeSalaryInfo.currentMonthPaid / employeeSalaryInfo.monthlySalary) * 100)}% Complete
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-4 border border-orange-100">
                    <div className="flex flex-col items-center text-center">
                      <span className="text-xs text-gray-500 mb-1">Salary Pending</span>
                      <span className="font-bold text-xl text-orange-600">{formatCurrency(employeeSalaryInfo.currentMonthPending)}</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`bg-orange-500 h-2 rounded-full transition-all duration-300 ${
                            employeeSalaryInfo.currentMonthPending >= employeeSalaryInfo.monthlySalary * 0.75 ? 'w-3/4' :
                            employeeSalaryInfo.currentMonthPending >= employeeSalaryInfo.monthlySalary * 0.5 ? 'w-1/2' :
                            employeeSalaryInfo.currentMonthPending >= employeeSalaryInfo.monthlySalary * 0.25 ? 'w-1/4' :
                            employeeSalaryInfo.currentMonthPending > 0 ? 'w-1/12' : 'w-0'
                          }`}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {Math.round((employeeSalaryInfo.currentMonthPending / employeeSalaryInfo.monthlySalary) * 100)}% Remaining
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-4 border border-purple-100">
                    <div className="flex flex-col items-center text-center">
                      <span className="text-xs text-gray-500 mb-1">Incentives Earned</span>
                      <span className="font-bold text-xl text-purple-600">{formatCurrency(employeeSalaryInfo.currentMonthIncentive)}</span>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                        <span className="text-xs text-purple-600 font-medium">Performance Bonus</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous Month Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  {new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Salary Paid</span>
                      <span className="font-semibold text-green-600">{formatCurrency(employeeSalaryInfo.lastMonthPaid)}</span>
                    </div>
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Salary Pending</span>
                      <span className="font-semibold text-red-600">{formatCurrency(employeeSalaryInfo.lastMonthPending)}</span>
                    </div>
                    <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Incentives</span>
                      <span className="font-semibold text-purple-600">{formatCurrency(employeeSalaryInfo.lastMonthIncentive)}</span>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-employee standard layout */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ledgerDetail.email && (
                <div className="flex flex-col p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500 mb-1">Email</span>
                  <span className="font-medium text-sm">{ledgerDetail.email}</span>
                </div>
              )}
              {ledgerDetail.phone && (
                <div className="flex flex-col p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500 mb-1">Phone</span>
                  <span className="font-medium text-sm">{ledgerDetail.phone}</span>
                </div>
              )}
              {ledgerDetail.last_transaction_date && (
                <div className="flex flex-col p-3 bg-gray-50 rounded-md">
                  <span className="text-xs text-gray-500 mb-1">Last Transaction</span>
                  <span className="font-medium text-sm">{formatDate(ledgerDetail.last_transaction_date)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Complete Transaction History ({transactions.length} entries)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {transactions.filter(t => t.transaction_type === 'Payment').length} Payments
              </Badge>
              <Badge variant="outline" className="text-xs">
                {transactions.filter(t => t.transaction_type.includes('Bill')).length} Bills
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader className="bg-gray-50">
                <TableRow className="h-10">
                  <TableHead className="px-2 py-2">Date</TableHead>
                  <TableHead className="px-2 py-2">Description</TableHead>
                  <TableHead className="px-2 py-2">Type</TableHead>
                  <TableHead className="px-2 py-2">Reference</TableHead>
                  <TableHead className="text-right px-2 py-2">Debit</TableHead>
                  <TableHead className="text-right px-2 py-2">Credit</TableHead>
                  <TableHead className="text-right px-2 py-2">Outstanding</TableHead>
                  <TableHead className="text-center px-2 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No transactions found for this account
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((txn) => (
                    <TableRow key={txn.id} className="hover:bg-gray-50 h-12">
                      <TableCell className="font-mono text-xs px-2">
                        {formatDate(txn.date).split(' ')[0]}
                        <br />
                        <span className="text-gray-500">{formatDate(txn.date).split(' ')[1]}</span>
                      </TableCell>
                      <TableCell className="px-2 max-w-48">
                        <p className="font-medium text-sm truncate">{txn.description}</p>
                        {txn.source_document && (
                          <p className="text-xs text-gray-500 truncate">{txn.source_document}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-2">
                        <Badge 
                          variant={txn.transaction_type === 'Payment' ? 'destructive' : 'default'} 
                          className="text-xs px-1 py-0"
                        >
                          {txn.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs px-2 text-gray-600">
                        {txn.reference_number || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-700 font-semibold px-2">
                        {txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-700 font-semibold px-2">
                        {txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-900 px-2">
                        {formatCurrency(txn.running_balance)}
                        <span className="text-xs text-gray-500 ml-1">
                          {txn.running_balance >= 0 ? 'DR' : 'CR'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center px-2">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusBadge(txn.status)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Summary Footer */}
          {transactions.length > 0 && (
            <div className="mt-4 pt-4 border-t bg-gray-50 rounded-md p-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Total Entries</p>
                  <p className="font-bold">{transactions.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Date Range</p>
                  <p className="font-bold text-xs">
                    {formatDate(transactions[transactions.length - 1]?.date || '')} to {formatDate(transactions[0]?.date || '')}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Final Balance</p>
                  <p className="font-bold text-blue-900">
                    {formatCurrency(
                      // Both suppliers and customers now display chronologically (oldest first)
                      // Final balance is always the last transaction's running balance
                      transactions[transactions.length - 1]?.running_balance || 0
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

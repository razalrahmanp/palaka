'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Download, FileText, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TrialBalanceAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  debit_balance: number;
  credit_balance: number;
  opening_balance?: number;
  period_debits?: number;
  period_credits?: number;
  is_type_header?: boolean;
  is_account_item?: boolean;
  account_count?: number;
}

interface TrialBalanceReportProps {
  onBack: () => void;
}

export default function TrialBalanceReport({ onBack }: TrialBalanceReportProps) {
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [accounts, setAccounts] = useState<TrialBalanceAccount[]>([]);
  const [summary, setSummary] = useState({
    total_debits: 0,
    total_credits: 0,
    difference: 0,
    is_balanced: false
  });
  const [loading, setLoading] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set([
    'ASSET', 'LIABILITY', 'EQUITY'
  ]));

  const fetchTrialBalance = useCallback(async () => {
    setLoading(true);
    try {
      const formattedDate = format(asOfDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/finance/reports/trial-balance?asOfDate=${formattedDate}`);
      const data = await response.json();
      
      if (data.accounts) {
        setAccounts(data.accounts);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchTrialBalance();
  }, [fetchTrialBalance]);

  const toggleType = (accountType: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(accountType)) {
      newExpanded.delete(accountType);
    } else {
      newExpanded.add(accountType);
    }
    setExpandedTypes(newExpanded);
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '';
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToExcel = () => {
    const worksheetData = accounts
      .filter(acc => !acc.is_type_header)
      .map(acc => ({
        'Account Code': acc.account_code,
        'Account Name': acc.account_name.trim(),
        'Debit (₹)': acc.debit_balance > 0 ? acc.debit_balance.toFixed(2) : '',
        'Credit (₹)': acc.credit_balance > 0 ? acc.credit_balance.toFixed(2) : ''
      }));

    worksheetData.push({
      'Account Code': '',
      'Account Name': 'Total',
      'Debit (₹)': summary.total_debits.toFixed(2),
      'Credit (₹)': summary.total_credits.toFixed(2)
    });

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, `Trial_Balance_${format(asOfDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Trial Balance', 14, 20);
    doc.setFontSize(10);
    doc.text(`As of ${format(asOfDate, 'MMMM dd, yyyy')}`, 14, 28);

    const tableData = accounts
      .filter(acc => !acc.is_type_header)
      .map(acc => [
        acc.account_code,
        acc.account_name.trim(),
        acc.debit_balance > 0 ? `₹${acc.debit_balance.toFixed(2)}` : '',
        acc.credit_balance > 0 ? `₹${acc.credit_balance.toFixed(2)}` : ''
      ]);

    tableData.push([
      '',
      'Total',
      `₹${summary.total_debits.toFixed(2)}`,
      `₹${summary.total_credits.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Account Code', 'Account Name', 'Debit (₹)', 'Credit (₹)']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] }
    });

    doc.save(`Trial_Balance_${format(asOfDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Type color mapping
  const getTypeColor = (accountType: string) => {
    const colors: Record<string, string> = {
      'ASSET': 'bg-green-50 hover:bg-green-100',
      'LIABILITY': 'bg-red-50 hover:bg-red-100',
      'EQUITY': 'bg-blue-50 hover:bg-blue-100',
      'REVENUE': 'bg-purple-50 hover:bg-purple-100',
      'EXPENSE': 'bg-orange-50 hover:bg-orange-100'
    };
    return colors[accountType] || 'bg-gray-50 hover:bg-gray-100';
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Trial Balance</h2>
          <p className="text-sm text-gray-500 mt-1">
            As of {format(asOfDate, 'MMMM dd, yyyy')}
          </p>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal")}>
              <span>{format(asOfDate, 'PPP')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={asOfDate}
              onSelect={(date) => date && setAsOfDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading trial balance...</div>
          </div>
        ) : (
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Account Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Name
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Debit (₹)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Credit (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accounts.map((account, index) => {
                      if (account.is_type_header) {
                        const isExpanded = expandedTypes.has(account.account_type);
                        return (
                          <tr 
                            key={`${account.account_type}-header`}
                            className={cn(
                              'cursor-pointer transition-colors',
                              getTypeColor(account.account_type)
                            )}
                            onClick={() => toggleType(account.account_type)}
                          >
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 mr-2" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 mr-2" />
                                )}
                                <span className="text-sm font-semibold text-gray-900">
                                  {account.account_code}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className="text-sm font-bold text-gray-900">
                                {account.account_name} 
                                <span className="text-gray-500 ml-2">
                                  ({account.account_count} accounts)
                                </span>
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(account.debit_balance)}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(account.credit_balance)}
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      // Hide account items if parent type is collapsed
                      const isVisible = expandedTypes.has(account.account_type);
                      if (!isVisible) return null;

                      return (
                        <tr key={`${account.account_code}-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                            {account.account_code}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                            {account.account_name}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(account.debit_balance)}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                            {formatCurrency(account.credit_balance)}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Total Row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-900">Total</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(summary.total_debits)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(summary.total_credits)}
                        </span>
                      </td>
                    </tr>

                    {/* Balance Status */}
                    {!summary.is_balanced && (
                      <tr className="bg-red-50">
                        <td colSpan={2} className="px-6 py-3 text-sm text-red-600">
                          ⚠️ Books are not balanced
                        </td>
                        <td colSpan={2} className="px-6 py-3 text-sm text-red-600 text-right">
                          Difference: {formatCurrency(Math.abs(summary.difference))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed right-6 top-1/2 transform translate-y-4 flex flex-col gap-3 z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-white shadow-lg hover:shadow-xl"
          onClick={onBack}
        >
          <span className="sr-only">Back</span>
          ←
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-white shadow-lg hover:shadow-xl"
          onClick={exportToExcel}
        >
          <Download className="h-5 w-5 text-green-600" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-white shadow-lg hover:shadow-xl"
          onClick={exportToPDF}
        >
          <FileText className="h-5 w-5 text-red-600" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full bg-white shadow-lg hover:shadow-xl"
          onClick={handlePrint}
        >
          <Printer className="h-5 w-5 text-blue-600" />
        </Button>
      </div>
    </div>
  );
}

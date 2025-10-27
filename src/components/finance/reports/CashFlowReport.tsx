/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Download, Printer, Calendar as CalendarIcon, Info, LayoutList, LayoutGrid, Columns } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import autoTable from 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

interface CashFlowItem {
  account_code: string;
  account_name: string;
  amount: number;
}

interface CashFlowData {
  start_date: string;
  end_date: string;
  sections: {
    OPERATING?: CashFlowItem[];
    INVESTING?: CashFlowItem[];
    FINANCING?: CashFlowItem[];
  };
  summary: {
    net_operating: number;
    net_investing: number;
    net_financing: number;
    net_change: number;
    opening_balance: number;
    closing_balance: number;
  };
}

interface CashFlowReportProps {
  startDate: Date;
  endDate: Date;
}

export default function CashFlowReport({ startDate: initialStartDate, endDate: initialEndDate }: CashFlowReportProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<CashFlowData | null>(null);
  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<'operating' | 'investing' | 'financing' | null>(null);
  const [viewMode, setViewMode] = useState<'vertical' | 'horizontal' | 'accounting'>('vertical');
  const [showViewMenu, setShowViewMenu] = useState(false);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/finance/reports/cash-flow', window.location.origin);
      url.searchParams.set('start_date', format(startDate, 'yyyy-MM-dd'));
      url.searchParams.set('end_date', format(endDate, 'yyyy-MM-dd'));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch cash flow report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getCalculationDetails = (section: 'operating' | 'investing' | 'financing') => {
    const details = {
      operating: {
        title: 'Operating Activities Calculation',
        description: 'Cash flows from day-to-day business operations',
        formula: 'Net Operating Cash Flow = Cash from Customers - Cash to Suppliers - Operating Expenses - Employee Salaries',
        dataSources: [
          {
            item: 'Cash received from customers',
            table: 'payments',
            field: 'date (date type)',
            calculation: 'SUM of all customer payments in date range',
            notes: 'Customer payments received via all payment methods'
          },
          {
            item: 'Cash paid to suppliers',
            table: 'vendor_payment_history',
            field: 'payment_date',
            calculation: 'SUM of all vendor payments in date range',
            notes: 'Payments made to suppliers for goods/services'
          },
          {
            item: 'Cash paid for operating expenses',
            table: 'expenses',
            field: 'date',
            calculation: 'SUM of expenses (EXCLUDING Manufacturing, Salaries & Benefits, Salaries, Capital Expenditure, Asset Purchase, Equipment)',
            notes: 'Operating expenses like rent, utilities, admin costs, etc.'
          },
          {
            item: 'Cash paid to employees',
            table: 'payroll_records',
            field: 'processed_at',
            calculation: 'SUM of net_salary for all processed payroll',
            notes: 'Employee salary payments'
          }
        ],
        currentValues: reportData?.sections?.OPERATING || []
      },
      investing: {
        title: 'Investing Activities Calculation',
        description: 'Cash flows from purchase and sale of long-term assets',
        formula: 'Net Investing Cash Flow = Cash from Asset Sales - Cash Paid for Asset Purchases',
        dataSources: [
          {
            item: 'Cash received from sale of assets',
            table: 'asset_disposals',
            field: 'disposal_date',
            calculation: 'SUM of sale_price where disposal_type = "sale"',
            notes: 'Proceeds from selling fixed assets (machinery, vehicles, property, etc.)'
          },
          {
            item: 'Cash paid for purchase of assets',
            table: 'expenses',
            field: 'date',
            calculation: 'SUM of expenses where category IN (Capital Expenditure, Asset Purchase, Equipment Purchase, Vehicle Purchase, Property Purchase, Building Purchase, Machinery Purchase, Furniture Purchase, Computer Equipment Purchase, Software Purchase, Asset Improvement, Asset Installation)',
            notes: 'Capital expenditure on fixed assets'
          }
        ],
        currentValues: reportData?.sections?.INVESTING || []
      },
      financing: {
        title: 'Financing Activities Calculation',
        description: 'Cash flows from loans, investments, and owner transactions',
        formula: 'Net Financing Cash Flow = Cash from Loans + Cash from Investors - Loan Repayments - Dividends/Withdrawals',
        dataSources: [
          {
            item: 'Cash received from loans',
            table: 'loan_opening_balances',
            field: 'loan_start_date',
            calculation: 'SUM of original_loan_amount for loans disbursed in date range',
            notes: 'New loans received from banks/financial institutions'
          },
          {
            item: 'Cash received from investors',
            table: 'investments',
            field: 'investment_date',
            calculation: 'SUM of amount for all partner investments',
            notes: 'Capital contributions from partners/investors'
          },
          {
            item: 'Cash paid for loan repayments',
            table: 'liability_payments',
            field: 'date',
            calculation: 'SUM of total_amount (principal + interest)',
            notes: 'Loan repayments (principal and interest)'
          },
          {
            item: 'Cash paid as dividends/withdrawals',
            table: 'withdrawals',
            field: 'withdrawal_date',
            calculation: 'SUM of amount for all partner withdrawals',
            notes: 'Partner drawings, profit distributions'
          }
        ],
        currentValues: reportData?.sections?.FINANCING || []
      }
    };

    return details[section];
  };


  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [];
    
    wsData.push(['CASH FLOW STATEMENT']);
    wsData.push(['Period:', `${format(startDate, 'dd-MMM-yyyy')} to ${format(endDate, 'dd-MMM-yyyy')}`]);
    wsData.push(['']);

    if (reportData.sections?.OPERATING && reportData.sections.OPERATING.length > 0) {
      wsData.push(['OPERATING ACTIVITIES']);
      reportData.sections.OPERATING.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Net Operating Cash Flow', '', reportData.summary?.net_operating || 0]);
      wsData.push(['']);
    }

    if (reportData.sections?.INVESTING && reportData.sections.INVESTING.length > 0) {
      wsData.push(['INVESTING ACTIVITIES']);
      reportData.sections.INVESTING.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Net Investing Cash Flow', '', reportData.summary?.net_investing || 0]);
      wsData.push(['']);
    }

    if (reportData.sections?.FINANCING && reportData.sections.FINANCING.length > 0) {
      wsData.push(['FINANCING ACTIVITIES']);
      reportData.sections.FINANCING.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Net Financing Cash Flow', '', reportData.summary?.net_financing || 0]);
      wsData.push(['']);
    }

    wsData.push(['NET CHANGE IN CASH', '', reportData.summary?.net_change || 0]);
    wsData.push(['Opening Cash Balance', '', reportData.summary?.opening_balance || 0]);
    wsData.push(['Closing Cash Balance', '', reportData.summary?.closing_balance || 0]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, `Cash_Flow_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('CASH FLOW STATEMENT', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Period: ${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`, 14, 28);

    let yPos = 40;

    if (reportData.sections?.OPERATING && reportData.sections.OPERATING.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('OPERATING ACTIVITIES', 14, yPos);
      yPos += 5;

      doc.autoTable({
        startY: yPos,
        head: [['Code', 'Account', 'Amount']],
        body: reportData.sections.OPERATING.map(item => [
          item.account_code,
          item.account_name,
          formatCurrency(item.amount)
        ]),
        foot: [['', 'Net Operating Cash Flow', formatCurrency(reportData.summary?.net_operating || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.sections?.INVESTING && reportData.sections.INVESTING.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('INVESTING ACTIVITIES', 14, yPos);
      yPos += 5;

      doc.autoTable({
        startY: yPos,
        head: [['Code', 'Account', 'Amount']],
        body: reportData.sections.INVESTING.map(item => [
          item.account_code,
          item.account_name,
          formatCurrency(item.amount)
        ]),
        foot: [['', 'Net Investing Cash Flow', formatCurrency(reportData.summary?.net_investing || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.sections?.FINANCING && reportData.sections.FINANCING.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('FINANCING ACTIVITIES', 14, yPos);
      yPos += 5;

      doc.autoTable({
        startY: yPos,
        head: [['Code', 'Account', 'Amount']],
        body: reportData.sections.FINANCING.map(item => [
          item.account_code,
          item.account_name,
          formatCurrency(item.amount)
        ]),
        foot: [['', 'Net Financing Cash Flow', formatCurrency(reportData.summary?.net_financing || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22] },
      });
    }

    doc.save(`Cash_Flow_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.pdf`);
  };

  // View Mode Rendering Functions
  const renderVerticalView = () => {
    return (
      <div className="space-y-6">
        {/* Operating Activities */}
        {reportData?.sections?.OPERATING && reportData.sections.OPERATING.length > 0 && (
          <Card>
            <CardHeader className="bg-green-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-green-900">OPERATING ACTIVITIES</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-700 hover:bg-green-200"
                  onClick={() => {
                    setSelectedSection('operating');
                    setShowCalculationDialog(true);
                  }}
                  title="View calculation details"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right w-40">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections.OPERATING.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t bg-green-50 p-4 font-bold text-green-900">
                <div className="flex justify-between">
                  <span>Net Operating Cash Flow</span>
                  <span>{formatCurrency(reportData.summary?.net_operating || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Investing Activities */}
        {reportData?.sections?.INVESTING && reportData.sections.INVESTING.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-900">INVESTING ACTIVITIES</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-blue-700 hover:bg-blue-200"
                  onClick={() => {
                    setSelectedSection('investing');
                    setShowCalculationDialog(true);
                  }}
                  title="View calculation details"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right w-40">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections.INVESTING.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t bg-blue-50 p-4 font-bold text-blue-900">
                <div className="flex justify-between">
                  <span>Net Investing Cash Flow</span>
                  <span>{formatCurrency(reportData.summary?.net_investing || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financing Activities */}
        {reportData?.sections?.FINANCING && reportData.sections.FINANCING.length > 0 && (
          <Card>
            <CardHeader className="bg-orange-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-orange-900">FINANCING ACTIVITIES</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-orange-700 hover:bg-orange-200"
                  onClick={() => {
                    setSelectedSection('financing');
                    setShowCalculationDialog(true);
                  }}
                  title="View calculation details"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right w-40">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections.FINANCING.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t bg-orange-50 p-4 font-bold text-orange-900">
                <div className="flex justify-between">
                  <span>Net Financing Cash Flow</span>
                  <span>{formatCurrency(reportData.summary?.net_financing || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderHorizontalView = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Account</TableHead>
                    <TableHead className="text-center w-32">Operating</TableHead>
                    <TableHead className="text-center w-32">Investing</TableHead>
                    <TableHead className="text-center w-32">Financing</TableHead>
                    <TableHead className="text-center w-32">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Create a consolidated view of all accounts */}
                  {(() => {
                    const allAccounts = new Map();
                    
                    // Collect all accounts from all sections
                    (['OPERATING', 'INVESTING', 'FINANCING'] as const).forEach(section => {
                      if (reportData?.sections?.[section]) {
                        reportData.sections[section].forEach((item: CashFlowItem) => {
                          if (!allAccounts.has(item.account_name)) {
                            allAccounts.set(item.account_name, {
                              name: item.account_name,
                              code: item.account_code,
                              operating: 0,
                              investing: 0,
                              financing: 0
                            });
                          }
                          const sectionKey = section.toLowerCase() as 'operating' | 'investing' | 'financing';
                          allAccounts.get(item.account_name)![sectionKey] = item.amount;
                        });
                      }
                    });

                    return Array.from(allAccounts.values()).map((account, index) => {
                      const total = account.operating + account.investing + account.financing;
                      return (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell>
                            <div>
                              <div className="font-medium">{account.name}</div>
                              <div className="text-sm text-gray-500 font-mono">{account.code}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {account.operating !== 0 ? formatCurrency(account.operating) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {account.investing !== 0 ? formatCurrency(account.investing) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {account.financing !== 0 ? formatCurrency(account.financing) : '-'}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {total !== 0 ? formatCurrency(total) : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-100 font-bold">
                    <TableCell>Net Cash Flow</TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(reportData?.summary?.net_operating || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(reportData?.summary?.net_investing || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(reportData?.summary?.net_financing || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatCurrency(reportData?.summary?.net_change || 0)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAccountingView = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Cash Inflows */}
              <div>
                <h3 className="text-lg font-bold text-green-700 mb-4 border-b-2 border-green-200 pb-2">
                  CASH INFLOWS
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const inflows: Array<CashFlowItem & { section: string }> = [];
                    (['OPERATING', 'INVESTING', 'FINANCING'] as const).forEach(section => {
                      if (reportData?.sections?.[section]) {
                        reportData.sections[section].forEach((item: CashFlowItem) => {
                          if (item.amount > 0) {
                            inflows.push({
                              ...item,
                              section: section.charAt(0) + section.slice(1).toLowerCase()
                            });
                          }
                        });
                      }
                    });
                    
                    return inflows.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <div className="font-medium">{item.account_name}</div>
                          <div className="text-sm text-gray-500">
                            {item.section} • {item.account_code}
                          </div>
                        </div>
                        <div className="font-medium text-green-600">
                          +{formatCurrency(item.amount)}
                        </div>
                      </div>
                    ));
                  })()}
                  {(() => {
                    const totalInflows = (['OPERATING', 'INVESTING', 'FINANCING'] as const).reduce((total, section) => {
                      if (reportData?.sections?.[section]) {
                        return total + reportData.sections[section]
                          .filter((item: CashFlowItem) => item.amount > 0)
                          .reduce((sum: number, item: CashFlowItem) => sum + item.amount, 0);
                      }
                      return total;
                    }, 0);
                    
                    return (
                      <div className="border-t-2 border-green-200 pt-3 mt-4">
                        <div className="flex justify-between font-bold text-green-700">
                          <span>Total Inflows</span>
                          <span>+{formatCurrency(totalInflows)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Cash Outflows */}
              <div>
                <h3 className="text-lg font-bold text-red-700 mb-4 border-b-2 border-red-200 pb-2">
                  CASH OUTFLOWS
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const outflows: Array<CashFlowItem & { section: string }> = [];
                    (['OPERATING', 'INVESTING', 'FINANCING'] as const).forEach(section => {
                      if (reportData?.sections?.[section]) {
                        reportData.sections[section].forEach((item: CashFlowItem) => {
                          if (item.amount < 0) {
                            outflows.push({
                              ...item,
                              section: section.charAt(0) + section.slice(1).toLowerCase()
                            });
                          }
                        });
                      }
                    });
                    
                    return outflows.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <div className="font-medium">{item.account_name}</div>
                          <div className="text-sm text-gray-500">
                            {item.section} • {item.account_code}
                          </div>
                        </div>
                        <div className="font-medium text-red-600">
                          {formatCurrency(item.amount)}
                        </div>
                      </div>
                    ));
                  })()}
                  {(() => {
                    const totalOutflows = (['OPERATING', 'INVESTING', 'FINANCING'] as const).reduce((total, section) => {
                      if (reportData?.sections?.[section]) {
                        return total + reportData.sections[section]
                          .filter((item: CashFlowItem) => item.amount < 0)
                          .reduce((sum: number, item: CashFlowItem) => sum + item.amount, 0);
                      }
                      return total;
                    }, 0);
                    
                    return (
                      <div className="border-t-2 border-red-200 pt-3 mt-4">
                        <div className="flex justify-between font-bold text-red-700">
                          <span>Total Outflows</span>
                          <span>{formatCurrency(totalOutflows)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cash flow statement...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load cash flow report</p>
          <Button onClick={() => fetchReport()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Action Buttons - Right Side */}
      <div className="fixed right-6 top-1/2 transform translate-y-4 z-20 flex flex-col gap-3">
        <Button
          variant="default"
          size="icon"
          onClick={() => router.back()}
          className="h-12 w-12 rounded-full shadow-lg bg-gray-700 hover:bg-gray-800"
          title="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        {/* View Mode Toggle with Dropdown */}
        <div className="relative">
          <Button
            variant="default"
            size="icon"
            onMouseEnter={() => setShowViewMenu(true)}
            onMouseLeave={() => setShowViewMenu(false)}
            className="h-12 w-12 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 transition-all duration-200"
            title="View Mode"
          >
            {viewMode === 'vertical' && <LayoutList className="h-5 w-5" />}
            {viewMode === 'horizontal' && <LayoutGrid className="h-5 w-5" />}
            {viewMode === 'accounting' && <Columns className="h-5 w-5" />}
          </Button>
          
          {/* View Mode Dropdown */}
          {showViewMenu && (
            <div
              className="absolute right-full mr-3 top-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[140px] z-30"
              onMouseEnter={() => setShowViewMenu(true)}
              onMouseLeave={() => setShowViewMenu(false)}
            >
              <div className="space-y-1">
                <button
                  onClick={() => setViewMode('vertical')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'vertical'
                      ? 'bg-purple-100 text-purple-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <LayoutList className="h-4 w-4" />
                  Vertical
                </button>
                <button
                  onClick={() => setViewMode('horizontal')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'horizontal'
                      ? 'bg-purple-100 text-purple-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Horizontal
                </button>
                <button
                  onClick={() => setViewMode('accounting')}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'accounting'
                      ? 'bg-purple-100 text-purple-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Columns className="h-4 w-4" />
                  Accounting
                </button>
              </div>
            </div>
          )}
        </div>

        <Button
          variant="default"
          size="icon"
          onClick={exportToExcel}
          className="h-12 w-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
          title="Export to Excel"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={exportToPDF}
          className="h-12 w-12 rounded-full shadow-lg bg-red-600 hover:bg-red-700"
          title="Export to PDF"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={() => window.print()}
          className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          title="Print"
        >
          <Printer className="h-5 w-5" />
        </Button>
      </div>

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Cash Flow Statement</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm text-gray-600 gap-2 mt-1 h-auto p-1 hover:bg-gray-100"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      {format(startDate, 'dd MMM yyyy')} - {format(endDate, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Start Date</Label>
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            if (date) {
                              setStartDate(date);
                              const url = new URL(window.location.href);
                              url.searchParams.set('start_date', format(date, 'yyyy-MM-dd'));
                              router.push(url.pathname + url.search);
                            }
                          }}
                          disabled={(date) => date > endDate}
                          initialFocus
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">End Date</Label>
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => {
                            if (date) {
                              setEndDate(date);
                              const url = new URL(window.location.href);
                              url.searchParams.set('end_date', format(date, 'yyyy-MM-dd'));
                              router.push(url.pathname + url.search);
                            }
                          }}
                          disabled={(date) => date < startDate || date > new Date()}
                          initialFocus
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 w-full space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Operating Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(reportData.summary?.net_operating || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Investing Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(reportData.summary?.net_investing || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-700">Financing Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(reportData.summary?.net_financing || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700">Net Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(reportData.summary?.net_change || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conditional View Rendering */}
        {viewMode === 'vertical' && renderVerticalView()}
        {viewMode === 'horizontal' && renderHorizontalView()}
        {viewMode === 'accounting' && renderAccountingView()}

        {/* Net Change Summary */}
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Opening Cash Balance</span>
                <span className="text-lg font-mono font-semibold">
                  {formatCurrency(reportData.summary?.opening_balance || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Net Change in Cash</span>
                <span className="text-lg font-mono font-semibold">
                  {formatCurrency(reportData.summary?.net_change || 0)}
                </span>
              </div>
              <div className="border-t-2 border-purple-300 pt-3 flex justify-between items-center">
                <span className="text-xl font-bold text-purple-900">Closing Cash Balance</span>
                <span className="text-2xl font-mono font-bold text-purple-900">
                  {formatCurrency(reportData.summary?.closing_balance || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculation Details Dialog */}
      <Dialog open={showCalculationDialog} onOpenChange={setShowCalculationDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedSection && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {getCalculationDetails(selectedSection).title}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {getCalculationDetails(selectedSection).description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Formula */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Formula:</h3>
                  <p className="text-blue-800 font-mono text-sm">
                    {getCalculationDetails(selectedSection).formula}
                  </p>
                </div>

                {/* Current Values */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Current Values:</h3>
                  <div className="space-y-2">
                    {getCalculationDetails(selectedSection).currentValues.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{item.account_code}</span>
                          <span className="text-sm font-medium">{item.account_name}</span>
                        </div>
                        <span className={`text-sm font-mono font-semibold ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Sources Table */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Data Sources & Calculations:</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Line Item</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Database Table</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date Field</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Calculation</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getCalculationDetails(selectedSection).dataSources.map((source: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{source.item}</div>
                              <div className="text-xs text-gray-500 mt-1">{source.notes}</div>
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-blue-700 font-mono">
                                {source.table}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded text-purple-700 font-mono">
                                {source.field}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-gray-700 font-mono">{source.calculation}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Important Notes:
                  </h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>All amounts are filtered by date range: {format(startDate, 'dd MMM yyyy')} - {format(endDate, 'dd MMM yyyy')}</li>
                    <li>Calculations use database SUM aggregation for accuracy</li>
                    <li>Negative amounts represent cash outflows (payments)</li>
                    <li>Positive amounts represent cash inflows (receipts)</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { 
  BarChart3,
  TrendingUp,
  Calculator,
  CreditCard,
  BookOpen,
  FileSpreadsheet,
  FileText,
  Calendar as CalendarIcon,
  Eye,
  RefreshCw,
  Clock,
  X,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AgingReports from './AgingReports';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

interface ReportSectionItem {
  account_code: string;
  account_name: string;
  amount: number;
  account_type?: string;
}

interface ReportSections {
  REVENUE?: ReportSectionItem[];
  COST_OF_GOODS_SOLD?: ReportSectionItem[];
  EXPENSES?: ReportSectionItem[];
  ASSETS?: ReportSectionItem[];
  LIABILITIES?: ReportSectionItem[];
  EQUITY?: ReportSectionItem[];
}

interface ReportSummary {
  total_revenue?: number;
  total_cogs?: number;
  gross_profit?: number;
  total_expenses?: number;
  net_income?: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  balance_check?: number;
  total_debits?: number;
  total_credits?: number;
  difference?: number;
  is_balanced?: boolean;
  opening_cash?: number;
  total_inflows?: number;
  total_outflows?: number;
  net_cash_flow?: number;
  closing_cash?: number;
  total_accounts?: number;
  accounts_with_balance?: number;
}

interface ReportData {
  report_type: string;
  period?: { start_date: string; end_date: string };
  as_of_date?: string;
  sections?: ReportSections;
  summary?: ReportSummary;
  data: Record<string, unknown>[];
}

export default function FinancialReportsManager() {
  const [activeReport, setActiveReport] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [showParameterModal, setShowParameterModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');

  const reportTypes = [
    {
      id: 'profit-loss',
      name: 'Profit & Loss Statement',
      description: 'Revenue, expenses, and net income',
      icon: TrendingUp,
      usesPeriod: true,
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      description: 'Assets, liabilities, and equity snapshot',
      icon: BarChart3,
      usesPeriod: false,
    },
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      description: 'Verify accounting equation balance',
      icon: Calculator,
      usesPeriod: false,
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      description: 'Operating, investing, financing activities',
      icon: CreditCard,
      usesPeriod: true,
    },
    {
      id: 'account-balances',
      name: 'Account Balances',
      description: 'Current balances for all accounts',
      icon: BookOpen,
      usesPeriod: false,
    },
  ];

  const fetchReport = async (reportType: string) => {
    try {
      setLoading(true);
      setActiveReport(reportType);

      const report = reportTypes.find(r => r.id === reportType);
      const url = new URL(`/api/finance/reports/${reportType}`, window.location.origin);
      
      if (report?.usesPeriod) {
        url.searchParams.set('start_date', format(startDate, 'yyyy-MM-dd'));
        url.searchParams.set('end_date', format(endDate, 'yyyy-MM-dd'));
      } else {
        url.searchParams.set('as_of_date', format(asOfDate, 'yyyy-MM-dd'));
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch ${reportType} report`);
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
      // Set error state or show toast
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    
    // Create main data sheet
    const wsData: (string | number)[][] = [];
    
    // Add header info
    wsData.push([reportData.report_type]);
    wsData.push(['']);
    
    if (reportData.period) {
      wsData.push(['Period:', `${formatDate(reportData.period.start_date)} to ${formatDate(reportData.period.end_date)}`]);
    } else if (reportData.as_of_date) {
      wsData.push(['As of:', formatDate(reportData.as_of_date)]);
    }
    wsData.push(['']);

    // Add data based on report type
    if (activeReport === 'profit-loss' && reportData.sections) {
      // Revenue section
      if (reportData.sections.REVENUE && reportData.sections.REVENUE.length > 0) {
        wsData.push(['REVENUE']);
        reportData.sections.REVENUE.forEach((item) => {
          wsData.push([item.account_code, item.account_name, item.amount]);
        });
        wsData.push(['Total Revenue', '', reportData.summary?.total_revenue || 0]);
        wsData.push(['']);
      }

      // COGS section
      if (reportData.sections.COST_OF_GOODS_SOLD && reportData.sections.COST_OF_GOODS_SOLD.length > 0) {
        wsData.push(['COST OF GOODS SOLD']);
        reportData.sections.COST_OF_GOODS_SOLD.forEach((item) => {
          wsData.push([item.account_code, item.account_name, item.amount]);
        });
        wsData.push(['Total COGS', '', reportData.summary?.total_cogs || 0]);
        wsData.push(['Gross Profit', '', reportData.summary?.gross_profit || 0]);
        wsData.push(['']);
      }

      // Expenses section
      if (reportData.sections.EXPENSES && reportData.sections.EXPENSES.length > 0) {
        wsData.push(['EXPENSES']);
        reportData.sections.EXPENSES.forEach((item) => {
          wsData.push([item.account_code, item.account_name, item.amount]);
        });
        wsData.push(['Total Expenses', '', reportData.summary?.total_expenses || 0]);
        wsData.push(['']);
        wsData.push(['NET INCOME', '', reportData.summary?.net_income || 0]);
      }

    } else if (activeReport === 'balance-sheet' && reportData.sections) {
      // Assets section
      if (reportData.sections.ASSETS && reportData.sections.ASSETS.length > 0) {
        wsData.push(['ASSETS']);
        reportData.sections.ASSETS.forEach((item) => {
          wsData.push([item.account_code, item.account_name, item.amount]);
        });
        wsData.push(['Total Assets', '', reportData.summary?.total_assets || 0]);
        wsData.push(['']);
      }

      // Liabilities section
      if (reportData.sections.LIABILITIES && reportData.sections.LIABILITIES.length > 0) {
        wsData.push(['LIABILITIES']);
        reportData.sections.LIABILITIES.forEach((item) => {
          wsData.push([item.account_code, item.account_name, item.amount]);
        });
        wsData.push(['Total Liabilities', '', reportData.summary?.total_liabilities || 0]);
        wsData.push(['']);
      }

      // Equity section
      if (reportData.sections.EQUITY && reportData.sections.EQUITY.length > 0) {
        wsData.push(['EQUITY']);
        reportData.sections.EQUITY.forEach((item) => {
          wsData.push([item.account_code, item.account_name, item.amount]);
        });
        wsData.push(['Total Equity', '', reportData.summary?.total_equity || 0]);
      }

    } else if (activeReport === 'trial-balance') {
      wsData.push(['Account Code', 'Account Name', 'Account Type', 'Debit Balance', 'Credit Balance']);
      reportData.data?.forEach((item) => {
        wsData.push([
          String(item.account_code || ''),
          String(item.account_name || ''),
          String(item.account_type || ''),
          Number(item.debit_balance) || 0,
          Number(item.credit_balance) || 0
        ]);
      });
      wsData.push(['']);
      wsData.push(['TOTALS', '', '', reportData.summary?.total_debits || 0, reportData.summary?.total_credits || 0]);

    } else if (activeReport === 'cash-flow') {
      wsData.push(['Date', 'Description', 'Amount', 'Type']);
      reportData.data?.forEach((item) => {
        wsData.push([
          formatDate(String(item.date || '')),
          String(item.description || ''),
          Number(item.amount) || 0,
          String(item.type || '')
        ]);
      });
      wsData.push(['']);
      wsData.push(['Summary']);
      wsData.push(['Total Inflows', reportData.summary?.total_inflows || 0]);
      wsData.push(['Total Outflows', reportData.summary?.total_outflows || 0]);
      wsData.push(['Net Cash Flow', reportData.summary?.net_cash_flow || 0]);

    } else {
      // Generic data export
      if (reportData.data?.length > 0) {
        const headers = Object.keys(reportData.data[0]);
        wsData.push(headers);
        reportData.data.forEach((item) => {
          wsData.push(headers.map(header => String(item[header] || '')));
        });
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    const fileName = `${reportData.report_type.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text(reportData.report_type, 20, 20);
    
    // Add date info
    doc.setFontSize(12);
    let yPos = 35;
    if (reportData.period) {
      doc.text(`Period: ${formatDate(reportData.period.start_date)} to ${formatDate(reportData.period.end_date)}`, 20, yPos);
    } else if (reportData.as_of_date) {
      doc.text(`As of: ${formatDate(reportData.as_of_date)}`, 20, yPos);
    }
    yPos += 15;

    // Add data based on report type
    if (activeReport === 'profit-loss' && reportData.sections) {
      // Revenue section
      if (reportData.sections.REVENUE && reportData.sections.REVENUE.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['REVENUE', '', '']],
          body: [
            ...reportData.sections.REVENUE.map((item: any) => [
              item.account_code,
              item.account_name,
              formatCurrency(item.amount)
            ]),
            ['', 'Total Revenue', formatCurrency(reportData.summary?.total_revenue || 0)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Expenses section
      if (reportData.sections.EXPENSES && reportData.sections.EXPENSES.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['EXPENSES', '', '']],
          body: [
            ...reportData.sections.EXPENSES.map((item: any) => [
              item.account_code,
              item.account_name,
              formatCurrency(item.amount)
            ]),
            ['', 'Total Expenses', formatCurrency(reportData.summary?.total_expenses || 0)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [231, 76, 60] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Net Income
      doc.autoTable({
        startY: yPos,
        body: [['NET INCOME', formatCurrency(reportData.summary?.net_income || 0)]],
        theme: 'grid',
        styles: { fontStyle: 'bold', fillColor: [46, 204, 113] },
      });

    } else if (activeReport === 'balance-sheet' && reportData.sections) {
      // Assets
      if (reportData.sections.ASSETS && reportData.sections.ASSETS.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['ASSETS', '', '']],
          body: [
            ...reportData.sections.ASSETS.map((item: any) => [
              item.account_code,
              item.account_name,
              formatCurrency(item.amount)
            ]),
            ['', 'Total Assets', formatCurrency(reportData.summary?.total_assets || 0)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Liabilities
      if (reportData.sections.LIABILITIES && reportData.sections.LIABILITIES.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['LIABILITIES', '', '']],
          body: [
            ...reportData.sections.LIABILITIES.map((item: any) => [
              item.account_code,
              item.account_name,
              formatCurrency(item.amount)
            ]),
            ['', 'Total Liabilities', formatCurrency(reportData.summary?.total_liabilities || 0)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [231, 76, 60] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Equity
      if (reportData.sections.EQUITY && reportData.sections.EQUITY.length > 0) {
        doc.autoTable({
          startY: yPos,
          head: [['EQUITY', '', '']],
          body: [
            ...reportData.sections.EQUITY.map((item: any) => [
              item.account_code,
              item.account_name,
              formatCurrency(item.amount)
            ]),
            ['', 'Total Equity', formatCurrency(reportData.summary?.total_equity || 0)]
          ],
          theme: 'grid',
          headStyles: { fillColor: [46, 204, 113] },
        });
      }

    } else if (activeReport === 'trial-balance') {
      doc.autoTable({
        startY: yPos,
        head: [['Account Code', 'Account Name', 'Debit Balance', 'Credit Balance']],
        body: [
          ...reportData.data?.map((item: any) => [
            item.account_code,
            item.account_name,
            item.debit_balance ? formatCurrency(item.debit_balance) : '-',
            item.credit_balance ? formatCurrency(item.credit_balance) : '-'
          ]) || [],
          ['TOTALS', '', 
           formatCurrency(reportData.summary?.total_debits || 0),
           formatCurrency(reportData.summary?.total_credits || 0)]
        ],
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
      });

    } else {
      // Generic table for other reports
      if (reportData.data?.length > 0) {
        const headers = Object.keys(reportData.data[0]);
        doc.autoTable({
          startY: yPos,
          head: [headers],
          body: reportData.data.map((item: any) => 
            headers.map(header => item[header])
          ),
          theme: 'grid',
        });
      }
    }

    const fileName = `${reportData.report_type.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {/* Report Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{reportData.report_type}</h3>
            {reportData.period ? (
              <p className="text-gray-600">
                Period: {formatDate(reportData.period.start_date)} to {formatDate(reportData.period.end_date)}
              </p>
            ) : reportData.as_of_date ? (
              <p className="text-gray-600">As of: {formatDate(reportData.as_of_date)}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Report Content */}
        {activeReport === 'profit-loss' && renderProfitLossReport()}
        {activeReport === 'balance-sheet' && renderBalanceSheetReport()}
        {activeReport === 'trial-balance' && renderTrialBalanceReport()}
        {activeReport === 'cash-flow' && renderCashFlowReport()}
        {activeReport === 'account-balances' && renderAccountBalancesReport()}
      </div>
    );
  };

  const renderProfitLossReport = () => {
    if (!reportData?.sections && !reportData?.data) return null;

    return (
      <div className="space-y-6">
        {/* Revenue Section */}
        {reportData.sections && reportData.sections.REVENUE && reportData.sections.REVENUE.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections!.REVENUE!.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total Revenue</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reportData.summary?.total_revenue || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* COGS Section */}
        {reportData.sections && reportData.sections.COST_OF_GOODS_SOLD && reportData.sections.COST_OF_GOODS_SOLD.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-700">Cost of Goods Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections!.COST_OF_GOODS_SOLD!.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total COGS</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reportData.summary?.total_cogs || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Gross Profit */}
        {reportData.summary?.gross_profit !== undefined && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Gross Profit</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(reportData.summary.gross_profit)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses Section */}
        {reportData.sections && reportData.sections.EXPENSES && reportData.sections.EXPENSES.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-700">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections!.EXPENSES!.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total Expenses</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reportData.summary?.total_expenses || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Net Income */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">Net Income</span>
              <span className={`text-3xl font-bold ${
                (reportData.summary?.net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(reportData.summary?.net_income || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderBalanceSheetReport = () => {
    if (!reportData?.sections && !reportData?.data) return null;

    return (
      <div className="space-y-6">
        {/* Assets Section */}
        {reportData.sections && reportData.sections.ASSETS && reportData.sections.ASSETS.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-700">Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections!.ASSETS!.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total Assets</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reportData.summary?.total_assets || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Liabilities Section */}
        {reportData.sections && reportData.sections.LIABILITIES && reportData.sections.LIABILITIES.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-700">Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections!.LIABILITIES!.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total Liabilities</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reportData.summary?.total_liabilities || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Equity Section */}
        {reportData.sections && reportData.sections.EQUITY && reportData.sections.EQUITY.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections!.EQUITY!.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={2}>Total Equity</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(reportData.summary?.total_equity || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Balance Check */}
        {reportData.summary && (
          <Card className={`border-2 ${
            Math.abs(reportData.summary.balance_check || 0) < 0.01 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Assets</span>
                  <span className="font-mono">{formatCurrency(reportData.summary.total_assets || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Liabilities + Equity</span>
                  <span className="font-mono">
                    {formatCurrency((reportData.summary.total_liabilities || 0) + (reportData.summary.total_equity || 0))}
                  </span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Balance Check</span>
                  <span className={`font-mono font-bold ${
                    Math.abs(reportData.summary.balance_check || 0) < 0.01 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.abs(reportData.summary.balance_check || 0) < 0.01 ? 'BALANCED' : 'OUT OF BALANCE'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTrialBalanceReport = () => {
    if (!reportData?.data) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit Balance</TableHead>
                  <TableHead className="text-right">Credit Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{item.account_code}</TableCell>
                    <TableCell>{item.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.account_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.debit_balance > 0 ? formatCurrency(item.debit_balance) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.credit_balance > 0 ? formatCurrency(item.credit_balance) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold bg-gray-50">
                  <TableCell colSpan={3}>TOTALS</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(reportData.summary?.total_debits || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(reportData.summary?.total_credits || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Balance Status */}
        {reportData.summary && (
          <Card className={`border-2 ${
            reportData.summary.is_balanced 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <CardContent className="p-6">
              <div className="text-center">
                <span className={`text-2xl font-bold ${
                  reportData.summary.is_balanced ? 'text-green-600' : 'text-red-600'
                }`}>
                  {reportData.summary.is_balanced ? '✓ TRIAL BALANCE IS BALANCED' : '✗ TRIAL BALANCE IS OUT OF BALANCE'}
                </span>
                {!reportData.summary.is_balanced && (
                  <p className="text-red-600 mt-2">
                    Difference: {formatCurrency(Math.abs(reportData.summary.difference || 0))}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCashFlowReport = () => {
    if (!reportData?.data) return null;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {reportData.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Inflows</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(reportData.summary.total_inflows || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Outflows</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(reportData.summary.total_outflows || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                  <p className={`text-xl font-bold ${
                    (reportData.summary.net_cash_flow || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData.summary.net_cash_flow || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Closing Cash</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(reportData.summary.closing_cash || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cash Flow Details */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{formatDate(item.date)}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === 'inflow' ? 'default' : 'destructive'}>
                        {item.type === 'inflow' ? 'Inflow' : 'Outflow'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${
                      item.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(item.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAccountBalancesReport = () => {
    if (!reportData?.data) return null;

    return (
      <div className="space-y-6">
        {/* Summary */}
        {reportData.summary && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                  <p className="text-xl font-bold">{reportData.summary.total_accounts || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Accounts with Balance</p>
                  <p className="text-xl font-bold text-blue-600">{reportData.summary.accounts_with_balance || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Balances */}
        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.data.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono">{item.account_code}</TableCell>
                    <TableCell>{item.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.account_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.current_balance || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Tabbed Interface */}
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 rounded-lg">
          <TabsTrigger 
            value="reports" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            <BarChart3 className="h-4 w-4" />
            Financial Reports
          </TabsTrigger>
          <TabsTrigger 
            value="aging" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            <Clock className="h-4 w-4" />
            Aging Reports
          </TabsTrigger>
        </TabsList>

        {/* Financial Reports Tab */}
        <TabsContent value="reports" className="space-y-6 mt-6">
          {!reportData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportTypes.map((report) => {
                const IconComponent = report.icon;
                return (
                  <Card 
                    key={report.id} 
                    className="hover:shadow-md transition-all cursor-pointer border-gray-200 hover:border-blue-400 group"
                    onClick={() => {
                      setSelectedReportType(report.id);
                      setShowParameterModal(true);
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {report.name}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {report.description}
                          </p>
                          <div className="mt-3">
                            <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                              Generate Report →
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            renderReportContent()
          )}
        </TabsContent>

        {/* Aging Reports Tab */}
        <TabsContent value="aging" className="mt-6">
          <AgingReports />
        </TabsContent>
      </Tabs>

      {/* Parameter Modal - Zoho Style */}
      <Dialog open={showParameterModal} onOpenChange={setShowParameterModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              {reportTypes.find(r => r.id === selectedReportType)?.icon && 
                React.createElement(reportTypes.find(r => r.id === selectedReportType)!.icon, { 
                  className: "h-5 w-5 text-blue-600" 
                })
              }
              {reportTypes.find(r => r.id === selectedReportType)?.name}
            </DialogTitle>
            <DialogDescription>
              Configure report parameters and generate your financial report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date Parameters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {reportTypes.find(r => r.id === selectedReportType)?.usesPeriod ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Start Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start text-left font-normal hover:bg-gray-50"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span className="text-gray-900">{format(startDate, 'PPP')}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        End Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start text-left font-normal hover:bg-gray-50"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                            <span className="text-gray-900">{format(endDate, 'PPP')}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      As Of Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left font-normal hover:bg-gray-50"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">{format(asOfDate, 'PPP')}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={asOfDate}
                          onSelect={(date) => date && setAsOfDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowParameterModal(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  fetchReport(selectedReportType);
                  setShowParameterModal(false);
                }}
                disabled={loading}
                className="px-6 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report View Modal - Zoho Style */}
      <Dialog open={!!reportData} onOpenChange={(open) => !open && setReportData(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-gray-900">
                  {reportData?.report_type}
                </DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {reportData?.period ? (
                    <>
                      Period: {formatDate(reportData.period.start_date)} to {formatDate(reportData.period.end_date)}
                    </>
                  ) : reportData?.as_of_date ? (
                    <>As of: {formatDate(reportData.as_of_date)}</>
                  ) : null}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportToExcel}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportToPDF}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setReportData(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            {reportData && renderReportContent()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

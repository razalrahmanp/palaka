/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
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
import { ArrowLeft, Download, Printer, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import autoTable from 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

interface ProfitLossReportProps {
  startDate: Date;
  endDate: Date;
}

interface ReportSection {
  account_code: string;
  account_name: string;
  amount: number;
}

interface ReportData {
  sections?: {
    REVENUE?: ReportSection[];
    COST_OF_GOODS_SOLD?: ReportSection[];
    EXPENSES?: ReportSection[];
  };
  summary?: {
    total_revenue?: number;
    total_cogs?: number;
    gross_profit?: number;
    total_expenses?: number;
    net_income?: number;
  };
}

export default function ProfitLossReport({ startDate: initialStartDate, endDate: initialEndDate }: ProfitLossReportProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/finance/reports/profit-loss', window.location.origin);
      url.searchParams.set('start_date', format(startDate, 'yyyy-MM-dd'));
      url.searchParams.set('end_date', format(endDate, 'yyyy-MM-dd'));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch profit & loss report');
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

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [];
    
    wsData.push(['PROFIT & LOSS STATEMENT']);
    wsData.push(['Period:', `${format(startDate, 'dd-MMM-yyyy')} to ${format(endDate, 'dd-MMM-yyyy')}`]);
    wsData.push(['']);

    if (reportData.sections?.REVENUE && reportData.sections.REVENUE.length > 0) {
      wsData.push(['REVENUE']);
      reportData.sections.REVENUE.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Total Revenue', '', reportData.summary?.total_revenue || 0]);
      wsData.push(['']);
    }

    if (reportData.sections?.COST_OF_GOODS_SOLD && reportData.sections.COST_OF_GOODS_SOLD.length > 0) {
      wsData.push(['COST OF GOODS SOLD']);
      reportData.sections.COST_OF_GOODS_SOLD.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Total COGS', '', reportData.summary?.total_cogs || 0]);
      wsData.push(['Gross Profit', '', reportData.summary?.gross_profit || 0]);
      wsData.push(['']);
    }

    if (reportData.sections?.EXPENSES && reportData.sections.EXPENSES.length > 0) {
      wsData.push(['EXPENSES']);
      reportData.sections.EXPENSES.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Total Expenses', '', reportData.summary?.total_expenses || 0]);
      wsData.push(['']);
      wsData.push(['NET INCOME', '', reportData.summary?.net_income || 0]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'P&L Statement');
    XLSX.writeFile(wb, `Profit_Loss_Statement_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('PROFIT & LOSS STATEMENT', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Period: ${format(startDate, 'dd-MMM-yyyy')} to ${format(endDate, 'dd-MMM-yyyy')}`, 20, 35);

    let yPos = 50;

    if (reportData.sections?.REVENUE && reportData.sections.REVENUE.length > 0) {
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

    if (reportData.sections?.EXPENSES && reportData.sections.EXPENSES.length > 0) {
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

    doc.autoTable({
      startY: yPos,
      body: [['NET INCOME', formatCurrency(reportData.summary?.net_income || 0)]],
      theme: 'grid',
      styles: { fontStyle: 'bold', fillColor: [46, 204, 113] },
    });

    doc.save(`Profit_Loss_Statement_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Profit & Loss Statement</h1>
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(reportData?.summary?.total_revenue || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total COGS</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(reportData?.summary?.total_cogs || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(reportData?.summary?.total_expenses || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(reportData?.summary?.net_income || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Section */}
        {reportData?.sections?.REVENUE && reportData.sections.REVENUE.length > 0 && (
          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-900">REVENUE</CardTitle>
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
                  {reportData.sections.REVENUE.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-green-50 font-semibold">
                    <TableCell colSpan={2}>Total Revenue</TableCell>
                    <TableCell className="text-right font-mono text-green-700">
                      {formatCurrency(reportData.summary?.total_revenue || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* COGS Section */}
        {reportData?.sections?.COST_OF_GOODS_SOLD && reportData.sections.COST_OF_GOODS_SOLD.length > 0 && (
          <Card>
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-900">COST OF GOODS SOLD</CardTitle>
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
                  {reportData.sections.COST_OF_GOODS_SOLD.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-orange-50 font-semibold">
                    <TableCell colSpan={2}>Total COGS</TableCell>
                    <TableCell className="text-right font-mono text-orange-700">
                      {formatCurrency(reportData.summary?.total_cogs || 0)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50 font-bold">
                    <TableCell colSpan={2}>Gross Profit</TableCell>
                    <TableCell className="text-right font-mono text-blue-700">
                      {formatCurrency(reportData.summary?.gross_profit || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Expenses Section */}
        {reportData?.sections?.EXPENSES && reportData.sections.EXPENSES.length > 0 && (
          <Card>
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-900">EXPENSES</CardTitle>
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
                  {reportData.sections.EXPENSES.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-red-50 font-semibold">
                    <TableCell colSpan={2}>Total Expenses</TableCell>
                    <TableCell className="text-right font-mono text-red-700">
                      {formatCurrency(reportData.summary?.total_expenses || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Net Income Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-gray-700">NET INCOME</p>
                <p className="text-sm text-gray-600 mt-1">
                  {format(startDate, 'dd MMM yyyy')} - {format(endDate, 'dd MMM yyyy')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-blue-700">
                  {formatCurrency(reportData?.summary?.net_income || 0)}
                </p>
                <Badge 
                  variant={(reportData?.summary?.net_income || 0) >= 0 ? 'default' : 'destructive'}
                  className="mt-2"
                >
                  {(reportData?.summary?.net_income || 0) >= 0 ? 'Profit' : 'Loss'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

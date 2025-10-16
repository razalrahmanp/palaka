/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
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

        {/* Operating Activities */}
        {reportData.sections?.OPERATING && reportData.sections.OPERATING.length > 0 && (
          <Card>
            <CardHeader className="bg-green-600 text-white">
              <CardTitle>OPERATING ACTIVITIES</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Account Name</TableHead>
                    <TableHead className="text-right font-semibold w-40">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections.OPERATING.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-green-50 font-semibold">
                    <TableCell colSpan={2}>Net Operating Cash Flow</TableCell>
                    <TableCell className="text-right font-mono text-green-700">
                      {formatCurrency(reportData.summary?.net_operating || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Investing Activities */}
        {reportData.sections?.INVESTING && reportData.sections.INVESTING.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle>INVESTING ACTIVITIES</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Account Name</TableHead>
                    <TableHead className="text-right font-semibold w-40">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections.INVESTING.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-blue-50 font-semibold">
                    <TableCell colSpan={2}>Net Investing Cash Flow</TableCell>
                    <TableCell className="text-right font-mono text-blue-700">
                      {formatCurrency(reportData.summary?.net_investing || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Financing Activities */}
        {reportData.sections?.FINANCING && reportData.sections.FINANCING.length > 0 && (
          <Card>
            <CardHeader className="bg-orange-600 text-white">
              <CardTitle>FINANCING ACTIVITIES</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32 font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Account Name</TableHead>
                    <TableHead className="text-right font-semibold w-40">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sections.FINANCING.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-orange-50 font-semibold">
                    <TableCell colSpan={2}>Net Financing Cash Flow</TableCell>
                    <TableCell className="text-right font-mono text-orange-700">
                      {formatCurrency(reportData.summary?.net_financing || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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
    </div>
  );
}

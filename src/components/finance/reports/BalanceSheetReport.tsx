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

interface BalanceSheetItem {
  account_code: string;
  account_name: string;
  amount: number;
}

interface BalanceSheetData {
  as_of_date: string;
  sections: {
    ASSETS?: BalanceSheetItem[];
    LIABILITIES?: BalanceSheetItem[];
    EQUITY?: BalanceSheetItem[];
  };
  summary: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
  };
}

interface BalanceSheetReportProps {
  asOfDate: Date;
}

export default function BalanceSheetReport({ asOfDate: initialAsOfDate }: BalanceSheetReportProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<BalanceSheetData | null>(null);
  const [asOfDate, setAsOfDate] = useState<Date>(initialAsOfDate);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/finance/reports/balance-sheet', window.location.origin);
      url.searchParams.set('as_of_date', format(asOfDate, 'yyyy-MM-dd'));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch balance sheet report');
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
    
    wsData.push(['BALANCE SHEET']);
    wsData.push(['As Of:', format(asOfDate, 'dd-MMM-yyyy')]);
    wsData.push(['']);

    if (reportData.sections?.ASSETS && reportData.sections.ASSETS.length > 0) {
      wsData.push(['ASSETS']);
      reportData.sections.ASSETS.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Total Assets', '', reportData.summary?.total_assets || 0]);
      wsData.push(['']);
    }

    if (reportData.sections?.LIABILITIES && reportData.sections.LIABILITIES.length > 0) {
      wsData.push(['LIABILITIES']);
      reportData.sections.LIABILITIES.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Total Liabilities', '', reportData.summary?.total_liabilities || 0]);
      wsData.push(['']);
    }

    if (reportData.sections?.EQUITY && reportData.sections.EQUITY.length > 0) {
      wsData.push(['EQUITY']);
      reportData.sections.EQUITY.forEach((item) => {
        wsData.push([item.account_code, item.account_name, item.amount]);
      });
      wsData.push(['Total Equity', '', reportData.summary?.total_equity || 0]);
      wsData.push(['']);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
    XLSX.writeFile(wb, `Balance_Sheet_${format(asOfDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('BALANCE SHEET', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`As Of: ${format(asOfDate, 'dd MMM yyyy')}`, 14, 28);

    let yPos = 40;

    if (reportData.sections?.ASSETS && reportData.sections.ASSETS.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSETS', 14, yPos);
      yPos += 5;

      doc.autoTable({
        startY: yPos,
        head: [['Code', 'Account', 'Amount']],
        body: reportData.sections.ASSETS.map(item => [
          item.account_code,
          item.account_name,
          formatCurrency(item.amount)
        ]),
        foot: [['', 'Total Assets', formatCurrency(reportData.summary?.total_assets || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.sections?.LIABILITIES && reportData.sections.LIABILITIES.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('LIABILITIES', 14, yPos);
      yPos += 5;

      doc.autoTable({
        startY: yPos,
        head: [['Code', 'Account', 'Amount']],
        body: reportData.sections.LIABILITIES.map(item => [
          item.account_code,
          item.account_name,
          formatCurrency(item.amount)
        ]),
        foot: [['', 'Total Liabilities', formatCurrency(reportData.summary?.total_liabilities || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.sections?.EQUITY && reportData.sections.EQUITY.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('EQUITY', 14, yPos);
      yPos += 5;

      doc.autoTable({
        startY: yPos,
        head: [['Code', 'Account', 'Amount']],
        body: reportData.sections.EQUITY.map(item => [
          item.account_code,
          item.account_name,
          formatCurrency(item.amount)
        ]),
        foot: [['', 'Total Equity', formatCurrency(reportData.summary?.total_equity || 0)]],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    doc.save(`Balance_Sheet_${format(asOfDate, 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading balance sheet...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load balance sheet report</p>
          <Button onClick={() => fetchReport()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const totalLiabilitiesEquity = (reportData.summary?.total_liabilities || 0) + (reportData.summary?.total_equity || 0);
  const isBalanced = Math.abs((reportData.summary?.total_assets || 0) - totalLiabilitiesEquity) < 0.01;

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
                <h1 className="text-2xl font-semibold text-gray-900">Balance Sheet</h1>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm text-gray-600 gap-2 mt-1 h-auto p-1 hover:bg-gray-100"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      As of {format(asOfDate, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">As Of Date</Label>
                      <Calendar
                        mode="single"
                        selected={asOfDate}
                        onSelect={(date) => {
                          if (date) {
                            setAsOfDate(date);
                            const url = new URL(window.location.href);
                            url.searchParams.set('as_of_date', format(date, 'yyyy-MM-dd'));
                            router.push(url.pathname + url.search);
                          }
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Total Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(reportData.summary?.total_assets || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">Total Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(reportData.summary?.total_liabilities || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Total Equity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(reportData.summary?.total_equity || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Check */}
        <Card className={isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-xs">
                  {isBalanced ? '✓ BALANCED' : '✗ OUT OF BALANCE'}
                </Badge>
                <span className="text-sm text-gray-600">
                  Assets = Liabilities + Equity
                </span>
              </div>
              <div className="text-sm font-mono">
                {formatCurrency(reportData.summary?.total_assets || 0)} = {formatCurrency(totalLiabilitiesEquity)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assets Section */}
        {reportData.sections?.ASSETS && reportData.sections.ASSETS.length > 0 && (
          <Card>
            <CardHeader className="bg-green-600 text-white">
              <CardTitle>ASSETS</CardTitle>
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
                  {reportData.sections.ASSETS.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-green-50 font-semibold">
                    <TableCell colSpan={2}>Total Assets</TableCell>
                    <TableCell className="text-right font-mono text-green-700">
                      {formatCurrency(reportData.summary?.total_assets || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Liabilities Section */}
        {reportData.sections?.LIABILITIES && reportData.sections.LIABILITIES.length > 0 && (
          <Card>
            <CardHeader className="bg-red-600 text-white">
              <CardTitle>LIABILITIES</CardTitle>
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
                  {reportData.sections.LIABILITIES.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-red-50 font-semibold">
                    <TableCell colSpan={2}>Total Liabilities</TableCell>
                    <TableCell className="text-right font-mono text-red-700">
                      {formatCurrency(reportData.summary?.total_liabilities || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Equity Section */}
        {reportData.sections?.EQUITY && reportData.sections.EQUITY.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle>EQUITY</CardTitle>
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
                  {reportData.sections.EQUITY.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                      <TableCell>{item.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-blue-50 font-semibold">
                    <TableCell colSpan={2}>Total Equity</TableCell>
                    <TableCell className="text-right font-mono text-blue-700">
                      {formatCurrency(reportData.summary?.total_equity || 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

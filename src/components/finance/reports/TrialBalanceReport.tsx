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

interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
}

interface TrialBalanceData {
  as_of_date: string;
  accounts: TrialBalanceItem[];
  summary: {
    total_debit: number;
    total_credit: number;
    difference: number;
  };
}

interface TrialBalanceReportProps {
  asOfDate: Date;
}

export default function TrialBalanceReport({ asOfDate: initialAsOfDate }: TrialBalanceReportProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<TrialBalanceData | null>(null);
  const [asOfDate, setAsOfDate] = useState<Date>(initialAsOfDate);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/finance/reports/trial-balance', window.location.origin);
      url.searchParams.set('as_of_date', format(asOfDate, 'yyyy-MM-dd'));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch trial balance report');
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
    if (!reportData || !reportData.accounts) return;

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [];
    
    wsData.push(['TRIAL BALANCE']);
    wsData.push(['As Of:', format(asOfDate, 'dd-MMM-yyyy')]);
    wsData.push(['']);
    wsData.push(['Code', 'Account Name', 'Type', 'Debit', 'Credit']);

    reportData.accounts.forEach((item) => {
      wsData.push([
        item.account_code,
        item.account_name,
        item.account_type,
        item.debit,
        item.credit
      ]);
    });

    wsData.push(['']);
    wsData.push(['', '', 'TOTAL', reportData.summary?.total_debit || 0, reportData.summary?.total_credit || 0]);
    wsData.push(['', '', 'DIFFERENCE', '', reportData.summary?.difference || 0]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, `Trial_Balance_${format(asOfDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData || !reportData.accounts) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('TRIAL BALANCE', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`As Of: ${format(asOfDate, 'dd MMM yyyy')}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [['Code', 'Account Name', 'Type', 'Debit', 'Credit']],
      body: reportData.accounts.map(item => [
        item.account_code,
        item.account_name,
        item.account_type,
        formatCurrency(item.debit),
        formatCurrency(item.credit)
      ]),
      foot: [
        ['', '', 'TOTAL', formatCurrency(reportData.summary?.total_debit || 0), formatCurrency(reportData.summary?.total_credit || 0)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`Trial_Balance_${format(asOfDate, 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trial balance...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load trial balance report</p>
          <Button onClick={() => fetchReport()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const isBalanced = Math.abs(reportData.summary?.difference || 0) < 0.01;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Action Buttons - Left Side */}
      <div className="fixed left-6 top-24 z-20 flex flex-col gap-3">
        <Button
          variant="default"
          size="icon"
          onClick={() => router.back()}
          className="h-12 w-12 rounded-full shadow-lg bg-gray-700 hover:bg-gray-800"
          title="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
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
                <h1 className="text-2xl font-semibold text-gray-900">Trial Balance</h1>
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700">Total Debit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(reportData.summary?.total_debit || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-700">Total Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(reportData.summary?.total_credit || 0)}
              </div>
            </CardContent>
          </Card>

          <Card className={isBalanced ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">Difference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${isBalanced ? 'text-green-900' : 'text-orange-900'}`}>
                  {formatCurrency(reportData.summary?.difference || 0)}
                </div>
                <Badge variant={isBalanced ? 'default' : 'destructive'} className="text-xs">
                  {isBalanced ? '✓ BALANCED' : '✗ OUT OF BALANCE'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trial Balance Table */}
        <Card>
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle>Account Balances</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32 font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Account Name</TableHead>
                  <TableHead className="w-32 font-semibold">Type</TableHead>
                  <TableHead className="text-right font-semibold w-40">Debit (Dr)</TableHead>
                  <TableHead className="text-right font-semibold w-40">Credit (Cr)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.accounts && reportData.accounts.length > 0 ? (
                  <>
                    {reportData.accounts.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{item.account_code}</TableCell>
                        <TableCell>{item.account_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.account_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-700">
                          {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-700">
                          {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-100 font-bold border-t-2">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right font-mono text-green-700">
                        {formatCurrency(reportData.summary?.total_debit || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-700">
                        {formatCurrency(reportData.summary?.total_credit || 0)}
                      </TableCell>
                    </TableRow>
                    {!isBalanced && (
                      <TableRow className="bg-orange-50 font-semibold">
                        <TableCell colSpan={3}>DIFFERENCE</TableCell>
                        <TableCell colSpan={2} className="text-right font-mono text-orange-700">
                          {formatCurrency(reportData.summary?.difference || 0)}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No account data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Download, Printer, Calendar as CalendarIcon, Search } from 'lucide-react';
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

interface AccountBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountBalancesData {
  as_of_date: string;
  accounts: AccountBalance[];
  summary: {
    total_debit: number;
    total_credit: number;
    accounts_count: number;
  };
}

interface AccountBalancesReportProps {
  asOfDate: Date;
}

export default function AccountBalancesReport({ asOfDate: initialAsOfDate }: AccountBalancesReportProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<AccountBalancesData | null>(null);
  const [asOfDate, setAsOfDate] = useState<Date>(initialAsOfDate);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/finance/reports/account-balances', window.location.origin);
      url.searchParams.set('as_of_date', format(asOfDate, 'yyyy-MM-dd'));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch account balances report');
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

  const filteredAccounts = React.useMemo(() => {
    if (!reportData?.accounts) return [];
    
    const search = searchTerm.toLowerCase();
    return reportData.accounts.filter(account => (
      account.account_code.toLowerCase().includes(search) ||
      account.account_name.toLowerCase().includes(search) ||
      account.account_type.toLowerCase().includes(search)
    ));
  }, [reportData, searchTerm]);

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    const wsData: (string | number)[][] = [];
    
    wsData.push(['ACCOUNT BALANCES']);
    wsData.push(['As Of:', format(asOfDate, 'dd-MMM-yyyy')]);
    wsData.push(['']);
    wsData.push(['Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance']);

    filteredAccounts.forEach((item) => {
      wsData.push([
        item.account_code,
        item.account_name,
        item.account_type,
        item.debit,
        item.credit,
        item.balance
      ]);
    });

    wsData.push(['']);
    wsData.push(['', '', 'TOTAL', reportData.summary?.total_debit || 0, reportData.summary?.total_credit || 0, '']);
    wsData.push(['Total Accounts:', reportData.summary?.accounts_count || 0]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Account Balances');
    XLSX.writeFile(wb, `Account_Balances_${format(asOfDate, 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('ACCOUNT BALANCES', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`As Of: ${format(asOfDate, 'dd MMM yyyy')}`, 14, 28);

    doc.autoTable({
      startY: 35,
      head: [['Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance']],
      body: filteredAccounts.map(item => [
        item.account_code,
        item.account_name,
        item.account_type,
        formatCurrency(item.debit),
        formatCurrency(item.credit),
        formatCurrency(item.balance)
      ]),
      foot: [
        ['', '', 'TOTAL', formatCurrency(reportData.summary?.total_debit || 0), formatCurrency(reportData.summary?.total_credit || 0), '']
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    doc.save(`Account_Balances_${format(asOfDate, 'yyyy-MM-dd')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account balances...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load account balances report</p>
          <Button onClick={() => fetchReport()} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-semibold text-gray-900">Account Balances</h1>
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

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700">Total Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {reportData.summary?.accounts_count || 0}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Showing {filteredAccounts.length} {searchTerm && 'filtered'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by account code, name, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Balances Table */}
        <Card>
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle>All Account Balances</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-32 font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Account Name</TableHead>
                    <TableHead className="w-32 font-semibold">Type</TableHead>
                    <TableHead className="text-right font-semibold w-32">Debit (Dr)</TableHead>
                    <TableHead className="text-right font-semibold w-32">Credit (Cr)</TableHead>
                    <TableHead className="text-right font-semibold w-32">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchTerm ? 'No accounts found matching your search' : 'No account balances available'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredAccounts.map((item, idx) => (
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
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(item.balance)}
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
                        <TableCell className="text-right font-mono">-</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

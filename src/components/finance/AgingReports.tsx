/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Clock,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

interface AgingData {
  id: string;
  customer_name?: string;
  supplier_name?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  days_outstanding: number;
  aging_bucket: string;
  status: string;
}

interface AgingSummary {
  current: number;        // 0-30 days
  days_31_60: number;     // 31-60 days
  days_61_90: number;     // 61-90 days
  days_91_120: number;    // 91-120 days
  over_120: number;       // 120+ days
  total_outstanding: number;
}

interface AgingReportData {
  receivables: AgingData[];
  payables: AgingData[];
  receivables_summary: AgingSummary;
  payables_summary: AgingSummary;
  generated_at: string;
}

export default function AgingReports() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AgingReportData | null>(null);
  const [activeTab, setActiveTab] = useState('receivables');

  useEffect(() => {
    fetchAgingData();
  }, []);

  const fetchAgingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/aging-reports');
      
      if (!response.ok) {
        throw new Error('Failed to fetch aging reports');
      }
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching aging reports:', error);
      toast.error('Failed to load aging reports');
    } finally {
      setLoading(false);
    }
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'Current': return 'bg-green-100 text-green-800';
      case '31-60 Days': return 'bg-yellow-100 text-yellow-800';
      case '61-90 Days': return 'bg-orange-100 text-orange-800';
      case '91-120 Days': return 'bg-red-100 text-red-800';
      case '120+ Days': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportToExcel = (type: 'receivables' | 'payables') => {
    if (!data) return;

    const exportData = type === 'receivables' ? data.receivables : data.payables;
    const summary = type === 'receivables' ? data.receivables_summary : data.payables_summary;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Aging Summary', `${type.charAt(0).toUpperCase() + type.slice(1)} as of ${new Date().toLocaleDateString()}`],
      [''],
      ['Current (0-30 days)', formatCurrency(summary.current)],
      ['31-60 Days', formatCurrency(summary.days_31_60)],
      ['61-90 Days', formatCurrency(summary.days_61_90)],
      ['91-120 Days', formatCurrency(summary.days_91_120)],
      ['120+ Days', formatCurrency(summary.over_120)],
      [''],
      ['Total Outstanding', formatCurrency(summary.total_outstanding)]
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Detail sheet
    const detailData = exportData.map(item => ({
      [type === 'receivables' ? 'Customer' : 'Supplier']: type === 'receivables' ? item.customer_name : item.supplier_name,
      'Invoice Number': item.invoice_number,
      'Invoice Date': new Date(item.invoice_date).toLocaleDateString(),
      'Due Date': new Date(item.due_date).toLocaleDateString(),
      'Total Amount': item.total_amount,
      'Paid Amount': item.paid_amount,
      'Outstanding': item.outstanding_amount,
      'Days Outstanding': item.days_outstanding,
      'Aging Bucket': item.aging_bucket,
      'Status': item.status
    }));

    const detailWs = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailWs, 'Details');

    // Save file
    XLSX.writeFile(wb, `${type}_aging_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} aging report exported to Excel`);
  };

  const exportToPDF = (type: 'receivables' | 'payables') => {
    if (!data) return;

    const exportData = type === 'receivables' ? data.receivables : data.payables;
    const summary = type === 'receivables' ? data.receivables_summary : data.payables_summary;

    const doc = new jsPDF();
    const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Aging Report`;
    
    // Title
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);

    // Summary table
    doc.setFontSize(12);
    doc.text('Aging Summary:', 20, 45);

    const summaryTableData = [
      ['Current (0-30 days)', formatCurrency(summary.current)],
      ['31-60 Days', formatCurrency(summary.days_31_60)],
      ['61-90 Days', formatCurrency(summary.days_61_90)],
      ['91-120 Days', formatCurrency(summary.days_91_120)],
      ['120+ Days', formatCurrency(summary.over_120)],
      ['Total Outstanding', formatCurrency(summary.total_outstanding)]
    ];

    doc.autoTable({
      startY: 50,
      head: [['Aging Period', 'Amount']],
      body: summaryTableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 }
    });

    // Detail table
    const detailTableData = exportData.slice(0, 50).map(item => [
      type === 'receivables' ? item.customer_name : item.supplier_name,
      item.invoice_number,
      new Date(item.due_date).toLocaleDateString(),
      formatCurrency(item.outstanding_amount),
      item.days_outstanding,
      item.aging_bucket
    ]);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [[
        type === 'receivables' ? 'Customer' : 'Supplier',
        'Invoice #',
        'Due Date',
        'Outstanding',
        'Days',
        'Bucket'
      ]],
      body: detailTableData,
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219] },
      styles: { fontSize: 8 }
    });

    if (exportData.length > 50) {
      doc.text(`Note: Showing first 50 records out of ${exportData.length} total records.`, 20, (doc as any).lastAutoTable.finalY + 10);
    }

    doc.save(`${type}_aging_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} aging report exported to PDF`);
  };

  const renderSummaryCards = (summary: AgingSummary) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">Current (0-30)</div>
          <div className="text-xl font-semibold text-green-600">{formatCurrency(summary.current)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">31-60 Days</div>
          <div className="text-xl font-semibold text-yellow-600">{formatCurrency(summary.days_31_60)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">61-90 Days</div>
          <div className="text-xl font-semibold text-orange-600">{formatCurrency(summary.days_61_90)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">91-120 Days</div>
          <div className="text-xl font-semibold text-red-500">{formatCurrency(summary.days_91_120)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">120+ Days</div>
          <div className="text-xl font-semibold text-red-700">{formatCurrency(summary.over_120)}</div>
        </CardContent>
      </Card>
      <Card className="bg-blue-50">
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">Total Outstanding</div>
          <div className="text-xl font-bold text-blue-700">{formatCurrency(summary.total_outstanding)}</div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAgingTable = (agingData: AgingData[], type: 'receivables' | 'payables') => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{type === 'receivables' ? 'Customer' : 'Supplier'}</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead className="text-right">Paid Amount</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="text-center">Days Outstanding</TableHead>
            <TableHead className="text-center">Aging Bucket</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agingData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                No {type} data available
              </TableCell>
            </TableRow>
          ) : (
            agingData.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {type === 'receivables' ? item.customer_name : item.supplier_name}
                </TableCell>
                <TableCell className="font-mono text-sm">{item.invoice_number}</TableCell>
                <TableCell>{new Date(item.invoice_date).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(item.due_date).toLocaleDateString()}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(item.total_amount)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(item.paid_amount)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.outstanding_amount)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={item.days_outstanding > 90 ? 'destructive' : item.days_outstanding > 60 ? 'default' : 'secondary'}>
                    {item.days_outstanding}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={getBucketColor(item.aging_bucket)}>
                    {item.aging_bucket}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === 'overdue' ? 'destructive' : 'default'}>
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading aging reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Aging Reports</h2>
          <p className="text-muted-foreground">
            Track outstanding receivables and payables by aging periods
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAgingData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receivables" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Accounts Receivable
          </TabsTrigger>
          <TabsTrigger value="payables" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Accounts Payable
          </TabsTrigger>
        </TabsList>

        {/* Accounts Receivable */}
        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Accounts Receivable Aging
                  </CardTitle>
                  <CardDescription>
                    Outstanding customer invoices by aging periods
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportToExcel('receivables')} 
                    variant="outline" 
                    size="sm"
                    disabled={!data?.receivables.length}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button 
                    onClick={() => exportToPDF('receivables')} 
                    variant="outline" 
                    size="sm"
                    disabled={!data?.receivables.length}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data?.receivables_summary && renderSummaryCards(data.receivables_summary)}
              {data?.receivables && renderAgingTable(data.receivables, 'receivables')}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Payable */}
        <TabsContent value="payables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Accounts Payable Aging
                  </CardTitle>
                  <CardDescription>
                    Outstanding vendor bills by aging periods
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => exportToExcel('payables')} 
                    variant="outline" 
                    size="sm"
                    disabled={!data?.payables.length}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button 
                    onClick={() => exportToPDF('payables')} 
                    variant="outline" 
                    size="sm"
                    disabled={!data?.payables.length}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data?.payables_summary && renderSummaryCards(data.payables_summary)}
              {data?.payables && renderAgingTable(data.payables, 'payables')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

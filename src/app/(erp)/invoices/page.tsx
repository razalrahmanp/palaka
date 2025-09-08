'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { SalesOrderInvoiceManager } from '@/components/finance/SalesOrderInvoiceManager';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Invoice Management
            </h1>
            <p className="text-gray-600 mt-2">Create, manage and track all your invoices</p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8" />
                  <div>
                    <p className="text-sm font-medium opacity-90">Invoice Manager</p>
                    <p className="text-2xl font-bold">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <SalesOrderInvoiceManager />
      </div>
    </div>
  );
}

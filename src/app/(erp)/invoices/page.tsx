'use client';

import React from 'react';
import { SalesOrderInvoiceManager } from '@/components/finance/SalesOrderInvoiceManager';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 space-y-4">
      {/* Header Section */}
      {/* <div className="bg-white rounded-lg border shadow-sm px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-600" />
          <h1 className="text-lg font-semibold text-gray-900">Invoices</h1>
        </div>
      </div> */}

      {/* Main Content */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <SalesOrderInvoiceManager />
      </div>
    </div>
  );
}

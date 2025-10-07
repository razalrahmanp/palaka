'use client';

import React from 'react';
import { SalesOrderInvoiceManager } from '@/components/finance/SalesOrderInvoiceManager';

export default function InvoicesPage() {
  return (
    <div className="min-h-screen w-full">
      {/* Main Content - Full Screen */}
      <div className="w-full h-full">
        <SalesOrderInvoiceManager />
      </div>
    </div>
  );
}

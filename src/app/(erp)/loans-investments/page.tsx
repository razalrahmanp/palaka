'use client';

import React from 'react';
import { PartnerManagement } from '@/components/finance/PartnerManagement';

export default function LoansInvestmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Loans & Investments</h1>
          <p className="mt-2 text-gray-600">
            Manage your business partners, track investments and withdrawals, and monitor loan activities.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <PartnerManagement />
        </div>
      </div>
    </div>
  );
}
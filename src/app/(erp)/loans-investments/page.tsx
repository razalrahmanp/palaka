'use client';

import React from 'react';
import { PartnerManagement } from '@/components/finance/PartnerManagement';

export default function LoansInvestmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PartnerManagement />
      </div>
    </div>
  );
}
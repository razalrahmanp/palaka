'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProfitLossReport from '@/components/finance/reports/ProfitLossReport';

function ProfitLossContent() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');

  const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  return <ProfitLossReport startDate={startDate} endDate={endDate} />;
}

export default function ProfitLossPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ProfitLossContent />
    </Suspense>
  );
}

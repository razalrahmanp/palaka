'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { startOfYear } from 'date-fns';
import CashFlowReport from '@/components/finance/reports/CashFlowReport';

function CashFlowContent() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');
  
  // Default to start of year and today if no dates provided
  const startDate = startDateParam ? new Date(startDateParam) : startOfYear(new Date());
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  return <CashFlowReport startDate={startDate} endDate={endDate} />;
}

export default function CashFlowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cash flow statement...</p>
        </div>
      </div>
    }>
      <CashFlowContent />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TrialBalanceReport from '@/components/finance/reports/TrialBalanceReport';

function TrialBalanceContent() {
  const searchParams = useSearchParams();
  const asOfDateParam = searchParams.get('as_of_date');
  
  // Default to today if no date provided
  const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

  return <TrialBalanceReport asOfDate={asOfDate} />;
}

export default function TrialBalancePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trial balance...</p>
        </div>
      </div>
    }>
      <TrialBalanceContent />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BalanceSheetReport from '@/components/finance/reports/BalanceSheetReport';

function BalanceSheetContent() {
  const searchParams = useSearchParams();
  const asOfDateParam = searchParams.get('as_of_date');
  
  // Default to today if no date provided
  const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

  return <BalanceSheetReport asOfDate={asOfDate} />;
}

export default function BalanceSheetPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading balance sheet...</p>
        </div>
      </div>
    }>
      <BalanceSheetContent />
    </Suspense>
  );
}

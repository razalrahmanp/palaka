'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AccountBalancesReport from '@/components/finance/reports/AccountBalancesReport';

function AccountBalancesContent() {
  const searchParams = useSearchParams();
  const asOfDateParam = searchParams.get('as_of_date');
  
  // Default to today if no date provided
  const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();

  return <AccountBalancesReport asOfDate={asOfDate} />;
}

export default function AccountBalancesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account balances...</p>
        </div>
      </div>
    }>
      <AccountBalancesContent />
    </Suspense>
  );
}

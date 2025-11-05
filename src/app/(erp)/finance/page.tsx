'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FinancePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to overview as the default finance page
    router.replace('/finance/overview');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p className="ml-4 text-gray-600">Loading finance overview...</p>
    </div>
  );
}


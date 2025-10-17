'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProfitLossReport from '@/components/finance/reports/ProfitLossReport';
import { FloatingActionMenu } from '@/components/finance/FloatingActionMenu';
import { BarChart3, TrendingUp, Calculator, CreditCard, Users, Calendar, Clock } from 'lucide-react';

function ProfitLossContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');

  const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = endDateParam ? new Date(endDateParam) : new Date();

  const floatingActions = [
    {
      id: 'profit-loss',
      label: 'Profit & Loss Statement',
      icon: React.createElement(TrendingUp, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/profit-loss'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
    {
      id: 'trial-balance',
      label: 'Trial Balance',
      icon: React.createElement(Calculator, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/trial-balance'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow Statement',
      icon: React.createElement(CreditCard, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/cash-flow'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
    {
      id: 'balance-sheet',
      label: 'Balance Sheet',
      icon: React.createElement(BarChart3, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/balance-sheet'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
    {
      id: 'accounts-payable-receivable',
      label: 'Accounts Payable & Receivable',
      icon: React.createElement(Users, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/accounts-payable-receivable'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
    {
      id: 'day-sheet',
      label: 'Day Sheet',
      icon: React.createElement(Calendar, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/day-sheet'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
    {
      id: 'aging-report',
      label: 'Aging Report',
      icon: React.createElement(Clock, { className: "h-5 w-5 text-white" }),
      onClick: () => router.push('/reports/aging-report'),
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
    },
  ];

  return (
    <>
      <ProfitLossReport startDate={startDate} endDate={endDate} />
      <FloatingActionMenu actions={floatingActions} />
    </>
  );
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

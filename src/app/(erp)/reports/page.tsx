'use client';

import React from 'react';
import { BarChart3, TrendingUp, Calculator, CreditCard, BookOpen } from 'lucide-react';
import ReportsDashboard from '@/components/finance/ReportsDashboard';
import { FloatingActionMenu } from '@/components/finance/FloatingActionMenu';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  const reportTypes = [
    {
      id: 'profit-loss',
      name: 'Profit & Loss Statement',
      icon: TrendingUp,
      route: '/reports/profit-loss',
    },
    {
      id: 'balance-sheet',
      name: 'Balance Sheet',
      icon: BarChart3,
      route: '/reports/balance-sheet',
    },
    {
      id: 'trial-balance',
      name: 'Trial Balance',
      icon: Calculator,
      route: '/reports/trial-balance',
    },
    {
      id: 'cash-flow',
      name: 'Cash Flow Statement',
      icon: CreditCard,
      route: '/reports/cash-flow',
    },
    {
      id: 'account-balances',
      name: 'Account Balances',
      icon: BookOpen,
      route: '/reports/account-balances',
    },
  ];

  const floatingActions = reportTypes.map((report) => ({
    id: report.id,
    label: report.name,
    icon: React.createElement(report.icon, { className: "h-5 w-5 text-white" }),
    onClick: () => {
      router.push(report.route);
    },
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Comprehensive financial analysis and reporting dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ReportsDashboard />
      </div>

      <FloatingActionMenu actions={floatingActions} />
    </div>
  );
}

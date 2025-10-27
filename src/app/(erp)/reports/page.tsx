'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import ReportsDashboard from '@/components/finance/ReportsDashboard';

export default function ReportsPage() {
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
    </div>
  );
}

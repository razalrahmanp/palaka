'use client';

import React from 'react';
import { QueryProvider } from '@/components/providers/QueryProvider';
import CoreAnalyticsDashboard from '@/components/analytics/CoreAnalyticsDashboard';

// Main component wrapped with the provider
function AnalyticsDashboard() {
  return <CoreAnalyticsDashboard />;
}

// Export the wrapped component
export default function AnalyticsPage() {
  return (
    <QueryProvider>
      <AnalyticsDashboard />
    </QueryProvider>
  );
}

"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// This is the OLD finance dashboard component
// The NEW enhanced version is in EnhancedFinanceOverview.tsx
// This file is kept for reference but should not be used

interface Props {
  receivables: number;
  payables: number;
  totalPayments: number;
}

export function LegacyFinanceDashboard({ receivables, payables, totalPayments }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Receivables</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          ${receivables.toFixed(2)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Payables</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          ${payables.toFixed(2)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Payments Received</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          ${totalPayments.toFixed(2)}
        </CardContent>
      </Card>
    </div>
  );
}

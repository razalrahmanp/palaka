'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface PaymentSummaryCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
  subText?: string;
}

const colorClasses = {
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md',
    iconBg: 'bg-green-500',
    textColor: 'text-green-600',
    titleColor: 'text-green-900'
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md',
    iconBg: 'bg-blue-500',
    textColor: 'text-blue-600',
    titleColor: 'text-blue-900'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-md',
    iconBg: 'bg-red-500',
    textColor: 'text-red-600',
    titleColor: 'text-red-900'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-md',
    iconBg: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    titleColor: 'text-yellow-900'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md',
    iconBg: 'bg-purple-500',
    textColor: 'text-purple-600',
    titleColor: 'text-purple-900'
  }
};

export function PaymentSummaryCard({ title, amount, icon, color, subText }: PaymentSummaryCardProps) {
  const colorStyle = colorClasses[color];

  return (
    <Card className={colorStyle.bg}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${colorStyle.iconBg} rounded-lg flex items-center justify-center`}>
            <div className="h-5 w-5 text-white">
              {icon}
            </div>
          </div>
          <div>
            <p className={`text-sm ${colorStyle.textColor} font-medium`}>{title}</p>
            <p className={`text-xl font-bold ${colorStyle.titleColor}`}>
              {formatCurrency(amount)}
            </p>
            {subText && <p className="text-xs text-muted-foreground">{subText}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

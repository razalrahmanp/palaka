// Dashboard Components - Modular UI Components
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowUp,
  ArrowDown,
  LucideIcon
} from "lucide-react";

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: LucideIcon;
  format?: 'currency' | 'number' | 'percentage';
  isLoading?: boolean;
}

export function KPICard({ title, value, change, icon: Icon, format = 'number', isLoading }: KPICardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
      case 'percentage':
        return `${val}%`;
      default:
        return new Intl.NumberFormat('en-IN').format(val);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-8 bg-gray-300 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </div>
            {change !== undefined && (
              <div className={`flex items-center text-sm mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <div className="p-3 bg-blue-100 rounded-full">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Component
export function LoadingCard() {
  return (
    <Card className="bg-gradient-to-br from-white to-blue-50 border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Error Component
export function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="bg-gradient-to-br from-white to-red-50 border-red-200 shadow-lg">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </CardContent>
    </Card>
  );
}

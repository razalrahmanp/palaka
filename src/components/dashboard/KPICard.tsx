'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number; // percentage change vs previous period
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  gradient: string;
  subtitle?: string;
  loading?: boolean;
  onClick?: () => void;
  isCurrency?: boolean; // whether to format as currency
}

export default function KPICard({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  gradient,
  subtitle,
  loading = false,
  onClick,
  isCurrency = true
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (isCurrency) {
        return `₹${val.toLocaleString('en-IN')}`;
      }
      return val.toLocaleString('en-IN');
    }
    return val;
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <Card 
      className={`${gradient} border-0 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          {/* Left side - Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 truncate mb-1.5">
              {title}
            </p>
            
            {loading ? (
              <div className="space-y-1.5">
                <div className="h-6 w-20 bg-white/50 rounded skeleton-pulse"></div>
                {change !== undefined && (
                  <div className="h-3 w-16 bg-white/50 rounded skeleton-pulse"></div>
                )}
              </div>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-900 truncate mb-1">
                  {formatValue(value)}
                </div>
                
                {change !== undefined && (
                  <div className="flex items-center space-x-1">
                    <span className={getTrendColor()}>
                      {getTrendIcon()}
                    </span>
                    <span className={`text-xs font-medium ${getTrendColor()}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500">vs last period</span>
                  </div>
                )}
                
                {subtitle && !change && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Right side - Icon */}
          <div className="w-10 h-10 bg-white/60 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
            <Icon className="h-5 w-5 text-gray-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

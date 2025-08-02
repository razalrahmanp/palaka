'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';

interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  on_time_delivery_rate: number;
  quality_score: number;
  last_30_days_orders: number;
  trend: 'up' | 'down' | 'stable';
}

interface VendorAnalyticsProps {
  vendorId?: string; // If provided, show analytics for specific vendor
}

export function VendorAnalytics({ vendorId }: VendorAnalyticsProps) {
  const [performance, setPerformance] = useState<VendorPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const url = vendorId 
          ? `/api/vendors/${vendorId}/analytics`
          : '/api/vendors/analytics';
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const data = await response.json();
        setPerformance(Array.isArray(data) ? data : [data]);
      } catch (error) {
        console.error('Error fetching vendor analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [vendorId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {vendorId ? 'Vendor Performance' : 'Top Vendor Performance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performance.map((vendor) => (
              <div
                key={vendor.vendor_id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{vendor.vendor_name}</h3>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(vendor.trend)}
                    <Badge className={getPerformanceBadge(vendor.quality_score)}>
                      Quality: {vendor.quality_score}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Package className="h-5 w-5 text-blue-600 mr-1" />
                    </div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-xl font-bold">{vendor.total_orders}</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <DollarSign className="h-5 w-5 text-green-600 mr-1" />
                    </div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-xl font-bold">{formatCurrency(vendor.total_spent)}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-xl font-bold">{formatCurrency(vendor.avg_order_value)}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">On-Time Delivery</p>
                    <p className="text-xl font-bold">{vendor.on_time_delivery_rate}%</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Last 30 Days Orders:</span>
                    <span className="font-medium">{vendor.last_30_days_orders}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

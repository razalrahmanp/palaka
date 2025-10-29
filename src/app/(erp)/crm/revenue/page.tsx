'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, TrendingUp, TrendingDown, Users, 
  ShoppingCart, CreditCard, Calendar, ArrowUpRight
} from 'lucide-react';

export default function CRMRevenuePage() {
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const revenueMetrics = [
    {
      title: 'Total Revenue',
      value: '$125,340',
      change: '+18.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Average Deal Size',
      value: '$4,567',
      change: '+12.3%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Customer Lifetime Value',
      value: '$15,234',
      change: '+8.7%',
      trend: 'up',
      icon: Users,
      color: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Payment Received',
      value: '$98,456',
      change: '-2.4%',
      trend: 'down',
      icon: CreditCard,
      color: 'from-orange-500 to-red-600'
    }
  ];

  const revenueBySource = [
    { source: 'Facebook Ads', amount: 45678, percentage: 36, color: 'bg-blue-500', width: 'w-[36%]' },
    { source: 'Instagram Ads', amount: 32450, percentage: 26, color: 'bg-purple-500', width: 'w-[26%]' },
    { source: 'Direct Sales', amount: 28900, percentage: 23, color: 'bg-green-500', width: 'w-[23%]' },
    { source: 'Referrals', amount: 12456, percentage: 10, color: 'bg-orange-500', width: 'w-[10%]' },
    { source: 'Other', amount: 5856, percentage: 5, color: 'bg-gray-500', width: 'w-[5%]' }
  ];

  const monthlyRevenue = [
    { month: 'Jan', revenue: 12000 },
    { month: 'Feb', revenue: 15000 },
    { month: 'Mar', revenue: 18000 },
    { month: 'Apr', revenue: 14000 },
    { month: 'May', revenue: 22000 },
    { month: 'Jun', revenue: 25000 },
    { month: 'Jul', revenue: 28000 },
    { month: 'Aug', revenue: 24000 },
    { month: 'Sep', revenue: 26000 },
    { month: 'Oct', revenue: 30000 },
    { month: 'Nov', revenue: 28000 },
    { month: 'Dec', revenue: 32000 }
  ];

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Revenue Analytics</h1>
          <p className="text-gray-600">Track and analyze your revenue streams and financial performance</p>
        </div>
        
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
            <Button
              key={period}
              variant={timePeriod === period ? 'default' : 'outline'}
              onClick={() => setTimePeriod(period)}
              className={timePeriod === period ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {revenueMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          const trendColor = metric.trend === 'up' ? 'text-green-600' : 'text-red-600';
          
          return (
            <Card key={index} className="hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${metric.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{metric.change}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                <p className="text-sm text-gray-600">{metric.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Revenue Trend
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Last 12 Months</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyRevenue.map((item, index) => {
              const heightPercentage = (item.revenue / maxRevenue) * 100;
              const heightClass = heightPercentage > 90 ? 'h-52' : 
                                 heightPercentage > 80 ? 'h-44' : 
                                 heightPercentage > 70 ? 'h-40' :
                                 heightPercentage > 60 ? 'h-32' :
                                 heightPercentage > 50 ? 'h-28' :
                                 heightPercentage > 40 ? 'h-24' : 'h-20';
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full group">
                    <div 
                      className={`w-full bg-gradient-to-t from-purple-500 to-blue-500 rounded-t-lg hover:from-purple-600 hover:to-blue-600 transition-all cursor-pointer ${heightClass}`}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${(item.revenue / 1000).toFixed(1)}k
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">{item.month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Revenue by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueBySource.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{item.source}</span>
                    <span className="text-sm text-gray-600">${item.amount.toLocaleString()} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${item.color} ${item.width}`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">Total Revenue</span>
                <span className="text-2xl font-bold text-purple-600">
                  ${revenueBySource.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-purple-600" />
              Top Revenue Generators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Enterprise Package', revenue: 45000, customers: 12, color: 'from-blue-500 to-cyan-500' },
                { name: 'Premium Package', revenue: 32000, customers: 45, color: 'from-purple-500 to-pink-500' },
                { name: 'Standard Package', revenue: 28000, customers: 78, color: 'from-green-500 to-emerald-500' },
                { name: 'Basic Package', revenue: 20340, customers: 156, color: 'from-orange-500 to-red-500' }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r hover:shadow-md transition-shadow border border-gray-100">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-lg`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">{item.customers} customers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${item.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

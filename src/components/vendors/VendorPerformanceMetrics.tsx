'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Star, DollarSign } from 'lucide-react';

interface VendorMetrics {
  vendor_id: string;
  vendor_name: string;
  quality_score: number;
  on_time_delivery_rate: number;
  price_competitiveness: number;
  avg_delivery_time: number;
  customer_satisfaction: number;
  monthly_performance: Array<{
    month: string;
    orders: number;
    on_time_percentage: number;
    quality_score: number;
  }>;
  performance_trend: 'improving' | 'declining' | 'stable';
}

interface VendorPerformanceMetricsProps {
  vendorId: string;
}

export function VendorPerformanceMetrics({ vendorId }: VendorPerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/vendors/${vendorId}/performance`);
        if (!response.ok) throw new Error('Failed to fetch performance metrics');
        
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching vendor performance metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [vendorId]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading performance metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">No performance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Performance Overview</CardTitle>
            <div className="flex items-center space-x-2">
              {getTrendIcon(metrics.performance_trend)}
              <span className="text-sm text-gray-600 capitalize">
                {metrics.performance_trend}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">Quality Score</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.quality_score)}`}>
                {metrics.quality_score}%
              </div>
              <Progress value={metrics.quality_score} className="mt-2" />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600">On-Time Delivery</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.on_time_delivery_rate)}`}>
                {metrics.on_time_delivery_rate}%
              </div>
              <Progress value={metrics.on_time_delivery_rate} className="mt-2" />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Price Competitiveness</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.price_competitiveness)}`}>
                {metrics.price_competitiveness}%
              </div>
              <Progress value={metrics.price_competitiveness} className="mt-2" />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-6 w-6 text-purple-500 mr-2" />
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.customer_satisfaction)}`}>
                {metrics.customer_satisfaction}%
              </div>
              <Progress value={metrics.customer_satisfaction} className="mt-2" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Average Delivery Time</p>
              <p className="text-xl font-bold text-gray-900">{metrics.avg_delivery_time} days</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Overall Rating</p>
              <Badge className={getScoreBadge(
                (metrics.quality_score + metrics.on_time_delivery_rate + metrics.customer_satisfaction) / 3
              )}>
                {Math.round((metrics.quality_score + metrics.on_time_delivery_rate + metrics.customer_satisfaction) / 3)}%
              </Badge>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Performance Trend</p>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(metrics.performance_trend)}
                <span className="ml-2 font-medium capitalize">{metrics.performance_trend}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Order Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.monthly_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality & Delivery Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.monthly_performance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="on_time_percentage" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="On-Time %" 
                />
                <Line 
                  type="monotone" 
                  dataKey="quality_score" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Quality Score" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

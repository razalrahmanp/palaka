'use client';

import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  TrendingUp,
  DollarSign,
  Users,
  MousePointerClick,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
  Megaphone,
  ShoppingCart,
  Percent,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  leads: number;
  conversions: number;
  revenue: number;
  roi: number;
  roas: number;
  cost_per_lead: number;
  cost_per_conversion: number;
}

export default function CampaignPerformancePage() {
  const [performanceData, setPerformanceData] = useState<CampaignPerformance[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('roi');
  const [dateRange, setDateRange] = useState<string>('30days');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch campaigns and calculate performance metrics
  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('*')
        .order('spend', { ascending: false });

      if (error) {
        console.error('Error fetching performance data:', error);
        return;
      }

      // Transform campaigns into performance data
      const transformedData: CampaignPerformance[] = (data || []).map((campaign: {
        id: string;
        name: string;
        platform: string;
        spend: number;
        impressions: number;
        clicks: number;
        ctr: number;
        cpc: number;
        leads_count: number;
        conversions: number;
      }) => {
        // For revenue, we'll need to join with actual sales data or use estimated values
        // For now, we'll calculate based on conversions with an average order value
        const avgOrderValue = 30000; // Assumed average furniture order value in INR
        const revenue = (campaign.conversions || 0) * avgOrderValue;
        const roi = campaign.spend > 0 ? ((revenue - campaign.spend) / campaign.spend) * 100 : 0;
        const roas = campaign.spend > 0 ? revenue / campaign.spend : 0;
        const cost_per_lead = campaign.leads_count > 0 ? campaign.spend / campaign.leads_count : 0;
        const cost_per_conversion = campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;

        return {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          platform: campaign.platform,
          spend: campaign.spend || 0,
          impressions: campaign.impressions || 0,
          clicks: campaign.clicks || 0,
          ctr: campaign.ctr || 0,
          cpc: campaign.cpc || 0,
          leads: campaign.leads_count || 0,
          conversions: campaign.conversions || 0,
          revenue,
          roi,
          roas,
          cost_per_lead,
          cost_per_conversion
        };
      });

      setPerformanceData(transformedData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const totalStats = performanceData.reduce((acc, campaign) => ({
    spend: acc.spend + campaign.spend,
    revenue: acc.revenue + campaign.revenue,
    impressions: acc.impressions + campaign.impressions,
    clicks: acc.clicks + campaign.clicks,
    leads: acc.leads + campaign.leads,
    conversions: acc.conversions + campaign.conversions
  }), { spend: 0, revenue: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0 });

  const avgROI = (totalStats.revenue - totalStats.spend) / totalStats.spend * 100;
  const avgROAS = totalStats.revenue / totalStats.spend;
  const avgCTR = (totalStats.clicks / totalStats.impressions) * 100;
  const conversionRate = (totalStats.conversions / totalStats.leads) * 100;

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue,
    color = 'blue' 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType;
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: string;
  }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      orange: 'text-orange-600 bg-orange-50',
      pink: 'text-pink-600 bg-pink-50',
      indigo: 'text-indigo-600 bg-indigo-50'
    };

    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6" />
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <LineChart className="h-8 w-8 text-blue-600" />
            Campaign Performance
          </h1>
          <p className="text-gray-600 mt-1">
            Track ROI, ROAS, and conversion metrics across all Meta campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Select date range"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalStats.revenue)}
          icon={DollarSign}
          trend="up"
          trendValue="+24%"
          color="green"
        />
        <MetricCard
          title="Total Spend"
          value={formatCurrency(totalStats.spend)}
          icon={Target}
          trend="up"
          trendValue="+12%"
          color="blue"
        />
        <MetricCard
          title="Average ROI"
          value={formatPercentage(avgROI)}
          icon={TrendingUp}
          trend="up"
          trendValue="+8%"
          color="purple"
        />
        <MetricCard
          title="Average ROAS"
          value={avgROAS.toFixed(2) + 'x'}
          icon={Award}
          trend="up"
          trendValue="+15%"
          color="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads"
          value={formatNumber(totalStats.leads)}
          icon={Users}
          color="indigo"
        />
        <MetricCard
          title="Total Conversions"
          value={formatNumber(totalStats.conversions)}
          icon={ShoppingCart}
          color="green"
        />
        <MetricCard
          title="Average CTR"
          value={formatPercentage(avgCTR)}
          icon={MousePointerClick}
          color="blue"
        />
        <MetricCard
          title="Conversion Rate"
          value={formatPercentage(conversionRate)}
          icon={Percent}
          color="purple"
        />
      </div>

      {/* Performance by Campaign */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Performance by Campaign</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('roi')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${selectedMetric === 'roi' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ROI
              </button>
              <button
                onClick={() => setSelectedMetric('roas')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${selectedMetric === 'roas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ROAS
              </button>
              <button
                onClick={() => setSelectedMetric('conversions')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${selectedMetric === 'conversions' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Conversions
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROAS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conv. Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost/Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost/Conv
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                      <p className="text-lg font-medium">Loading performance data...</p>
                    </div>
                  </td>
                </tr>
              ) : performanceData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <BarChart3 className="h-12 w-12 text-gray-300" />
                      <p className="text-lg font-medium">No performance data available</p>
                      <p className="text-sm">Sync campaigns from Meta to see performance metrics</p>
                    </div>
                  </td>
                </tr>
              ) : (
                performanceData.map((campaign) => {
                const convRate = (campaign.conversions / campaign.leads) * 100;
                return (
                  <tr key={campaign.campaign_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{campaign.campaign_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{campaign.platform}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(campaign.spend)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">
                      {formatCurrency(campaign.revenue)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${campaign.roi > 100 ? 'text-green-600' : 'text-gray-900'}`}>
                          {formatPercentage(campaign.roi)}
                        </span>
                        {campaign.roi > 100 && <ArrowUpRight className="h-4 w-4 text-green-600" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${campaign.roas > 3 ? 'text-green-600' : 'text-gray-900'}`}>
                        {campaign.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(campaign.leads)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{campaign.conversions}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${convRate > 15 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {formatPercentage(convRate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(campaign.cost_per_lead)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(campaign.cost_per_conversion)}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">ROI Trend</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </div>
        </div>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Chart visualization will be integrated here</p>
            <p className="text-xs mt-1">Using Chart.js or Recharts library</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Users, Target, TrendingUp, MapPin, Briefcase } from 'lucide-react'

interface CustomerSegment {
  segment_id: string
  segment_name: string
  customer_count: number
  revenue: number
  avg_order_value: number
  frequency: number
  clv: number
  acquisition_cost: number
  retention_rate: number
  growth_rate: number
  profitability_score: number
}

interface GeographicData {
  region: string
  customers: number
  revenue: number
  market_share: number
  growth_potential: number
}

interface DemographicData {
  age_group: string
  gender: string
  income_level: string
  education: string
  customers: number
  revenue: number
  avg_spend: number
}

interface BehavioralData {
  behavior_type: string
  segment: string
  percentage: number
  value: number
  engagement_score: number
}

interface MarketSegmentationData {
  segments: CustomerSegment[]
  geographic: GeographicData[]
  demographic: DemographicData[]
  behavioral: BehavioralData[]
  segmentation_metrics: {
    total_segments: number
    largest_segment: string
    most_profitable: string
    fastest_growing: string
    total_customers: number
    segmentation_score: number
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC0CB', '#FFD700']

export default function MarketSegmentationChart() {
  const [segmentationData, setSegmentationData] = useState<MarketSegmentationData | null>(null)
  const [viewMode, setViewMode] = useState<'segments' | 'geographic' | 'demographic' | 'behavioral'>('segments')
  const [analysisType, setAnalysisType] = useState<'revenue' | 'customers' | 'profitability'>('revenue')
  const [loading, setLoading] = useState(true)

  const fetchSegmentationData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockSegments: CustomerSegment[] = [
        {
          segment_id: 'VIP',
          segment_name: 'VIP Customers',
          customer_count: 1250,
          revenue: 2850000,
          avg_order_value: 4800,
          frequency: 8.5,
          clv: 45000,
          acquisition_cost: 1200,
          retention_rate: 92.5,
          growth_rate: 15.2,
          profitability_score: 95
        },
        {
          segment_id: 'LOYAL',
          segment_name: 'Loyal Customers',
          customer_count: 3200,
          revenue: 4100000,
          avg_order_value: 2100,
          frequency: 6.2,
          clv: 18500,
          acquisition_cost: 450,
          retention_rate: 78.3,
          growth_rate: 8.7,
          profitability_score: 82
        },
        {
          segment_id: 'REGULAR',
          segment_name: 'Regular Customers',
          customer_count: 5800,
          revenue: 3200000,
          avg_order_value: 1200,
          frequency: 4.1,
          clv: 8500,
          acquisition_cost: 280,
          retention_rate: 65.2,
          growth_rate: 5.3,
          profitability_score: 68
        },
        {
          segment_id: 'OCCASIONAL',
          segment_name: 'Occasional Buyers',
          customer_count: 8900,
          revenue: 2150000,
          avg_order_value: 450,
          frequency: 2.1,
          clv: 2800,
          acquisition_cost: 150,
          retention_rate: 35.8,
          growth_rate: -2.1,
          profitability_score: 45
        },
        {
          segment_id: 'NEW',
          segment_name: 'New Customers',
          customer_count: 4200,
          revenue: 980000,
          avg_order_value: 380,
          frequency: 1.2,
          clv: 1500,
          acquisition_cost: 120,
          retention_rate: 25.5,
          growth_rate: 28.9,
          profitability_score: 32
        }
      ]

      const mockGeographic: GeographicData[] = [
        { region: 'North India', customers: 8500, revenue: 4200000, market_share: 32.5, growth_potential: 85 },
        { region: 'West India', customers: 6200, revenue: 3800000, market_share: 28.8, growth_potential: 78 },
        { region: 'South India', customers: 5800, revenue: 3100000, market_share: 22.1, growth_potential: 92 },
        { region: 'East India', customers: 3850, revenue: 2180000, market_share: 16.6, growth_potential: 68 }
      ]

      const mockDemographic: DemographicData[] = [
        { age_group: '25-35', gender: 'Mixed', income_level: 'Middle', education: 'Graduate', customers: 8200, revenue: 4500000, avg_spend: 549 },
        { age_group: '35-45', gender: 'Mixed', income_level: 'Upper Middle', education: 'Graduate+', customers: 6800, revenue: 4800000, avg_spend: 706 },
        { age_group: '18-25', gender: 'Mixed', income_level: 'Lower Middle', education: 'Undergraduate', customers: 5200, revenue: 2200000, avg_spend: 423 },
        { age_group: '45-60', gender: 'Mixed', income_level: 'High', education: 'Professional', customers: 3150, revenue: 2780000, avg_spend: 883 }
      ]

      const mockBehavioral: BehavioralData[] = [
        { behavior_type: 'Price Sensitive', segment: 'Bargain Hunters', percentage: 35.2, value: 2800000, engagement_score: 65 },
        { behavior_type: 'Quality Focused', segment: 'Premium Seekers', percentage: 28.5, value: 4200000, engagement_score: 88 },
        { behavior_type: 'Convenience', segment: 'Quick Buyers', percentage: 22.8, value: 1800000, engagement_score: 72 },
        { behavior_type: 'Brand Loyal', segment: 'Brand Advocates', percentage: 13.5, value: 4480000, engagement_score: 95 }
      ]

      const mockData: MarketSegmentationData = {
        segments: mockSegments,
        geographic: mockGeographic,
        demographic: mockDemographic,
        behavioral: mockBehavioral,
        segmentation_metrics: {
          total_segments: 5,
          largest_segment: 'Occasional Buyers',
          most_profitable: 'VIP Customers',
          fastest_growing: 'New Customers',
          total_customers: 23350,
          segmentation_score: 78.5
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      setSegmentationData(mockData)
    } catch (error) {
      console.error('Error fetching segmentation data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSegmentationData()
  }, [fetchSegmentationData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getRadarData = () => {
    if (!segmentationData) return []
    
    return segmentationData.segments.map(segment => ({
      segment: segment.segment_name,
      Revenue: (segment.revenue / 1000000), // Convert to millions for better visualization
      CLV: (segment.clv / 1000), // Convert to thousands
      Retention: segment.retention_rate,
      Growth: Math.max(0, segment.growth_rate + 20), // Normalize negative values
      Profitability: segment.profitability_score
    }))
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Market Segmentation Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading segmentation data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!segmentationData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Market Segmentation Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No segmentation data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Market Segmentation Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive customer segmentation across multiple dimensions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'segments' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('segments')}
            >
              Segments
            </Button>
            <Button
              variant={viewMode === 'geographic' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('geographic')}
            >
              Geographic
            </Button>
            <Button
              variant={viewMode === 'demographic' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('demographic')}
            >
              Demographic
            </Button>
            <Button
              variant={viewMode === 'behavioral' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('behavioral')}
            >
              Behavioral
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Segments</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {segmentationData.segmentation_metrics.total_segments}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Customers</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {segmentationData.segmentation_metrics.total_customers.toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Most Profitable</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {segmentationData.segmentation_metrics.most_profitable}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Segmentation Score</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {segmentationData.segmentation_metrics.segmentation_score}%
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={analysisType} onValueChange={(value: 'revenue' | 'customers' | 'profitability') => setAnalysisType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">By Revenue</SelectItem>
              <SelectItem value="customers">By Customer Count</SelectItem>
              <SelectItem value="profitability">By Profitability</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'segments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Segments Pie Chart */}
              <div className="h-96">
                <h4 className="text-sm font-medium mb-3">Customer Segments Distribution</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentationData.segments}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment_name, customer_count }) => 
                        `${segment_name} (${((customer_count / segmentationData.segmentation_metrics.total_customers) * 100).toFixed(1)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="customer_count"
                    >
                      {segmentationData.segments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Segment Performance Radar */}
              <div className="h-96">
                <h4 className="text-sm font-medium mb-3">Segment Performance Radar</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={getRadarData()[0] ? [getRadarData()[0]] : []}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis />
                    <Radar
                      name="VIP Segment"
                      dataKey="Revenue"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="CLV"
                      dataKey="CLV"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segment Details Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Segment</th>
                    <th className="text-right p-2">Customers</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">AOV</th>
                    <th className="text-right p-2">CLV</th>
                    <th className="text-right p-2">Retention %</th>
                    <th className="text-right p-2">Growth %</th>
                    <th className="text-right p-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentationData.segments.map((segment) => (
                    <tr key={segment.segment_id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full bg-blue-500" 
                          />
                          <span className="font-medium">{segment.segment_name}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right">{segment.customer_count.toLocaleString()}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(segment.revenue)}</td>
                      <td className="p-2 text-right">{formatCurrency(segment.avg_order_value)}</td>
                      <td className="p-2 text-right">{formatCurrency(segment.clv)}</td>
                      <td className="p-2 text-right">{segment.retention_rate.toFixed(1)}%</td>
                      <td className={`p-2 text-right ${segment.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {segment.growth_rate.toFixed(1)}%
                      </td>
                      <td className="p-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${
                          segment.profitability_score >= 80 ? 'bg-green-100 text-green-700' :
                          segment.profitability_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {segment.profitability_score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'geographic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Geographic Distribution */}
              <div className="h-96">
                <h4 className="text-sm font-medium mb-3">Revenue by Region</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentationData.geographic}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Market Share */}
              <div className="h-96">
                <h4 className="text-sm font-medium mb-3">Market Share by Region</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentationData.geographic}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ region, market_share }) => `${region} ${market_share}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="market_share"
                    >
                      {segmentationData.geographic.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Geographic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {segmentationData.geographic.map((region) => (
                <div key={region.region} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <h5 className="font-medium">{region.region}</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customers:</span>
                      <span className="font-medium">{region.customers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-medium">{formatCurrency(region.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Share:</span>
                      <span className="font-medium">{region.market_share}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Growth Potential:</span>
                      <span className={`font-medium ${region.growth_potential >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {region.growth_potential}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'demographic' && (
          <div className="space-y-6">
            {/* Demographic Analysis */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Revenue by Age Group</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentationData.demographic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age_group" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  <Bar dataKey="customers" fill="#82ca9d" name="Customers" yAxisId="right" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Demographic Scatter Plot */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Customers vs Average Spend</h4>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis type="number" dataKey="customers" name="Customers" />
                  <YAxis type="number" dataKey="avg_spend" name="Avg Spend" tickFormatter={formatCurrency} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: number, name: string) => [
                      name === 'customers' ? value.toLocaleString() : formatCurrency(value), 
                      name === 'customers' ? 'Customers' : 'Avg Spend'
                    ]}
                  />
                  <Scatter name="Demographics" data={segmentationData.demographic} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'behavioral' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Behavioral Segments */}
              <div className="h-96">
                <h4 className="text-sm font-medium mb-3">Behavioral Segments</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentationData.behavioral}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ segment, percentage }) => `${segment} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {segmentationData.behavioral.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Engagement vs Value */}
              <div className="h-96">
                <h4 className="text-sm font-medium mb-3">Value vs Engagement Score</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="value" name="Value" tickFormatter={formatCurrency} />
                    <YAxis type="number" dataKey="engagement_score" name="Engagement" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: number, name: string) => [
                        name === 'value' ? formatCurrency(value) : `${value}%`, 
                        name === 'value' ? 'Value' : 'Engagement Score'
                      ]}
                    />
                    <Scatter name="Behavioral" data={segmentationData.behavioral} fill="#82ca9d" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Behavioral Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {segmentationData.behavioral.map((behavior) => (
                <div key={behavior.behavior_type} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full bg-green-500" 
                    />
                    <h5 className="font-medium">{behavior.segment}</h5>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{behavior.behavior_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Share:</span>
                      <span className="font-medium">{behavior.percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="font-medium">{formatCurrency(behavior.value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engagement:</span>
                      <span className={`font-medium ${
                        behavior.engagement_score >= 80 ? 'text-green-600' : 
                        behavior.engagement_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {behavior.engagement_score}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
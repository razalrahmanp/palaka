'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { TrendingUp, TrendingDown, Calendar, Target, Zap, AlertTriangle } from 'lucide-react'

interface SalesForecastData {
  historical: Array<{
    month: string
    actual: number
    target: number
    forecast?: number
  }>
  forecast: Array<{
    month: string
    predicted: number
    confidence_low: number
    confidence_high: number
    target: number
  }>
  metrics: {
    accuracy: number
    trend: 'up' | 'down' | 'stable'
    growth_rate: number
    seasonal_factor: number
    confidence_score: number
  }
  targets: {
    monthly: number
    quarterly: number
    yearly: number
    variance: number
  }
}

export default function SalesForecasting() {
  const [forecastData, setForecastData] = useState<SalesForecastData | null>(null)
  // View mode for future use
  // const [viewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [forecastPeriod, setForecastPeriod] = useState<3 | 6 | 12>(6)
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchForecastData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: '2023-01-01',
        end_date: new Date().toISOString().split('T')[0]
      });
      
      const response = await fetch(`/api/analytics/sales-forecasting?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setForecastData(result.data);
      } else {
        console.error('API Error:', result.error);
        // Fallback to mock data
        const mockData: SalesForecastData = {
          historical: [
            { month: 'Jan 2024', actual: 125000, target: 120000 },
            { month: 'Feb 2024', actual: 135000, target: 125000 },
            { month: 'Mar 2024', actual: 142000, target: 130000 },
            { month: 'Apr 2024', actual: 138000, target: 135000 },
            { month: 'May 2024', actual: 155000, target: 140000 },
            { month: 'Jun 2024', actual: 162000, target: 145000 },
            { month: 'Jul 2024', actual: 158000, target: 150000 },
            { month: 'Aug 2024', actual: 168000, target: 155000 },
            { month: 'Sep 2024', actual: 175000, target: 160000 },
            { month: 'Oct 2024', actual: 172000, target: 165000 },
            { month: 'Nov 2024', actual: 185000, target: 170000 },
            { month: 'Dec 2024', actual: 195000, target: 175000 }
          ],
          forecast: [
            { month: 'Jan 2025', predicted: 198000, confidence_low: 185000, confidence_high: 211000, target: 180000 },
            { month: 'Feb 2025', predicted: 205000, confidence_low: 190000, confidence_high: 220000, target: 185000 },
            { month: 'Mar 2025', predicted: 212000, confidence_low: 195000, confidence_high: 229000, target: 190000 },
            { month: 'Apr 2025', predicted: 208000, confidence_low: 191000, confidence_high: 225000, target: 195000 },
            { month: 'May 2025', predicted: 218000, confidence_low: 200000, confidence_high: 236000, target: 200000 },
            { month: 'Jun 2025', predicted: 225000, confidence_low: 206000, confidence_high: 244000, target: 205000 }
          ],
          metrics: {
            accuracy: 87.5,
            trend: 'up',
            growth_rate: 12.5,
            seasonal_factor: 1.15,
            confidence_score: 82.3
          },
          targets: {
            monthly: 195000,
            quarterly: 585000,
            yearly: 2340000,
            variance: 8.5
          }
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setForecastData(mockData);
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      // Set mock data on error
      const mockData: SalesForecastData = {
        historical: [
          { month: 'Jan 2024', actual: 125000, target: 120000 },
          { month: 'Feb 2024', actual: 135000, target: 125000 }
        ],
        forecast: [
          { month: 'Jan 2025', predicted: 198000, confidence_low: 185000, confidence_high: 211000, target: 180000 }
        ],
        metrics: { accuracy: 87.5, trend: 'up', growth_rate: 12.5, seasonal_factor: 1.15, confidence_score: 82.3 },
        targets: { monthly: 195000, quarterly: 585000, yearly: 2340000, variance: 8.5 }
      };
      setForecastData(mockData);
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    fetchForecastData()
  }, [fetchForecastData])

  const getCombinedData = () => {
    if (!forecastData) return []
    
    const historical = forecastData.historical.map(item => ({
      ...item,
      type: 'historical'
    }))
    
    const forecast = forecastData.forecast.slice(0, forecastPeriod).map(item => ({
      month: item.month,
      actual: null,
      target: item.target,
      forecast: item.predicted,
      confidence_low: item.confidence_low,
      confidence_high: item.confidence_high,
      type: 'forecast'
    }))
    
    return [...historical, ...forecast]
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Target className="h-4 w-4 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sales Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading forecast data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!forecastData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sales Forecasting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No forecast data available</div>
        </CardContent>
      </Card>
    )
  }

  const combinedData = getCombinedData()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Sales Forecasting
            </CardTitle>
            <CardDescription>
              AI-powered sales predictions with confidence intervals
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={forecastPeriod === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setForecastPeriod(3)}
            >
              3M
            </Button>
            <Button
              variant={forecastPeriod === 6 ? "default" : "outline"}
              size="sm"
              onClick={() => setForecastPeriod(6)}
            >
              6M
            </Button>
            <Button
              variant={forecastPeriod === 12 ? "default" : "outline"}
              size="sm"
              onClick={() => setForecastPeriod(12)}
            >
              12M
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
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Forecast Accuracy</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {forecastData.metrics.accuracy}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Growth Rate</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center gap-1">
                  {forecastData.metrics.growth_rate}%
                  {getTrendIcon(forecastData.metrics.trend)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Confidence Score</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {forecastData.metrics.confidence_score}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Target Variance</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {forecastData.targets.variance}%
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant={showConfidenceInterval ? "default" : "outline"}
            size="sm"
            onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
          >
            {showConfidenceInterval ? "Hide" : "Show"} Confidence Interval
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Forecast Period: {forecastPeriod} months
          </div>
        </div>

        {/* Main Forecast Chart */}
        <div className="h-96 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'actual' ? 'Actual Sales' : 
                  name === 'forecast' ? 'Forecasted Sales' : 
                  name === 'target' ? 'Target' : name
                ]}
              />
              <Legend />
              
              {/* Historical Actual Sales */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                name="Actual Sales"
              />
              
              {/* Forecast */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                name="Forecast"
              />
              
              {/* Target */}
              <Line
                type="monotone"
                dataKey="target"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                name="Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Interval Chart */}
        {showConfidenceInterval && (
          <div className="h-64">
            <h4 className="text-sm font-medium mb-3">Forecast Confidence Interval</h4>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData.forecast.slice(0, forecastPeriod)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'confidence_high' ? 'Upper Bound' : 
                    name === 'confidence_low' ? 'Lower Bound' : 
                    name === 'predicted' ? 'Predicted' : name
                  ]}
                />
                
                {/* Confidence Interval Area */}
                <Area
                  type="monotone"
                  dataKey="confidence_high"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#fef3c7"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="confidence_low"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#fef3c7"
                  fillOpacity={0.3}
                />
                
                {/* Predicted Line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Target Performance */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Target Performance Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Target</span>
                <span className="font-medium">{formatCurrency(forecastData.targets.monthly)}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quarterly Target</span>
                <span className="font-medium">{formatCurrency(forecastData.targets.quarterly)}</span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Yearly Target</span>
                <span className="font-medium">{formatCurrency(forecastData.targets.yearly)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
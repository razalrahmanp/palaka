'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, BarChart, Bar, ComposedChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Calendar, TrendingUp, TrendingDown, Snowflake, Sun, Cloud, Leaf } from 'lucide-react'

interface SeasonalData {
  period: string
  month: number
  season: 'Spring' | 'Summer' | 'Monsoon' | 'Winter'
  revenue: number
  orders: number
  customers: number
  avg_order_value: number
  year_over_year: number
  seasonal_index: number
  temperature_avg: number
  rainfall_mm: number
}

interface CategorySeasonality {
  category: string
  spring: number
  summer: number
  monsoon: number
  winter: number
  peak_season: string
  seasonality_strength: number
}

interface ForecastData {
  period: string
  actual?: number
  forecast: number
  confidence_low: number
  confidence_high: number
  seasonal_component: number
  trend_component: number
}

interface SeasonalAnalysisData {
  historical: SeasonalData[]
  categories: CategorySeasonality[]
  forecast: ForecastData[]
  insights: {
    peak_season: string
    low_season: string
    seasonality_score: number
    trend_direction: 'up' | 'down' | 'stable'
    weather_correlation: number
    best_performing_month: string
  }
  weather_impact: {
    temperature_correlation: number
    rainfall_correlation: number
    seasonal_adjustment_factor: number
  }
}

const SEASON_COLORS = {
  Spring: '#00C49F',
  Summer: '#FFBB28', 
  Monsoon: '#0088FE',
  Winter: '#FF8042'
}

const SEASON_ICONS = {
  Spring: Leaf,
  Summer: Sun,
  Monsoon: Cloud,
  Winter: Snowflake
}

export default function SeasonalTrendAnalysis() {
  const [analysisData, setAnalysisData] = useState<SeasonalAnalysisData | null>(null)
  const [viewMode, setViewMode] = useState<'trends' | 'categories' | 'forecast' | 'weather'>('trends')
  const [timeRange, setTimeRange] = useState<'12m' | '24m' | '36m'>('24m')
  const [metricType, setMetricType] = useState<'revenue' | 'orders' | 'customers'>('revenue')
  const [loading, setLoading] = useState(true)

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockHistorical: SeasonalData[] = [
        // 2023 Data
        { period: 'Jan 2023', month: 1, season: 'Winter', revenue: 1200000, orders: 2400, customers: 1800, avg_order_value: 500, year_over_year: 8.5, seasonal_index: 0.85, temperature_avg: 15, rainfall_mm: 45 },
        { period: 'Feb 2023', month: 2, season: 'Winter', revenue: 1100000, orders: 2200, customers: 1650, avg_order_value: 500, year_over_year: 7.2, seasonal_index: 0.78, temperature_avg: 18, rainfall_mm: 38 },
        { period: 'Mar 2023', month: 3, season: 'Spring', revenue: 1350000, orders: 2700, customers: 2000, avg_order_value: 500, year_over_year: 12.3, seasonal_index: 0.95, temperature_avg: 25, rainfall_mm: 25 },
        { period: 'Apr 2023', month: 4, season: 'Spring', revenue: 1450000, orders: 2900, customers: 2150, avg_order_value: 500, year_over_year: 15.8, seasonal_index: 1.02, temperature_avg: 30, rainfall_mm: 15 },
        { period: 'May 2023', month: 5, season: 'Summer', revenue: 1600000, orders: 3200, customers: 2400, avg_order_value: 500, year_over_year: 18.5, seasonal_index: 1.13, temperature_avg: 35, rainfall_mm: 10 },
        { period: 'Jun 2023', month: 6, season: 'Summer', revenue: 1750000, orders: 3500, customers: 2600, avg_order_value: 500, year_over_year: 22.1, seasonal_index: 1.23, temperature_avg: 38, rainfall_mm: 45 },
        { period: 'Jul 2023', month: 7, season: 'Monsoon', revenue: 1580000, orders: 3160, customers: 2350, avg_order_value: 500, year_over_year: 16.8, seasonal_index: 1.11, temperature_avg: 32, rainfall_mm: 185 },
        { period: 'Aug 2023', month: 8, season: 'Monsoon', revenue: 1420000, orders: 2840, customers: 2100, avg_order_value: 500, year_over_year: 12.5, seasonal_index: 1.00, temperature_avg: 30, rainfall_mm: 220 },
        { period: 'Sep 2023', month: 9, season: 'Monsoon', revenue: 1380000, orders: 2760, customers: 2050, avg_order_value: 500, year_over_year: 10.2, seasonal_index: 0.97, temperature_avg: 28, rainfall_mm: 165 },
        { period: 'Oct 2023', month: 10, season: 'Winter', revenue: 1620000, orders: 3240, customers: 2400, avg_order_value: 500, year_over_year: 20.5, seasonal_index: 1.14, temperature_avg: 25, rainfall_mm: 45 },
        { period: 'Nov 2023', month: 11, season: 'Winter', revenue: 1850000, orders: 3700, customers: 2750, avg_order_value: 500, year_over_year: 25.8, seasonal_index: 1.30, temperature_avg: 20, rainfall_mm: 15 },
        { period: 'Dec 2023', month: 12, season: 'Winter', revenue: 2100000, orders: 4200, customers: 3100, avg_order_value: 500, year_over_year: 32.5, seasonal_index: 1.48, temperature_avg: 16, rainfall_mm: 8 },
        
        // 2024 Data
        { period: 'Jan 2024', month: 1, season: 'Winter', revenue: 1300000, orders: 2600, customers: 1950, avg_order_value: 500, year_over_year: 8.3, seasonal_index: 0.87, temperature_avg: 14, rainfall_mm: 52 },
        { period: 'Feb 2024', month: 2, season: 'Winter', revenue: 1180000, orders: 2360, customers: 1770, avg_order_value: 500, year_over_year: 7.3, seasonal_index: 0.79, temperature_avg: 17, rainfall_mm: 42 },
        { period: 'Mar 2024', month: 3, season: 'Spring', revenue: 1515000, orders: 3030, customers: 2250, avg_order_value: 500, year_over_year: 12.2, seasonal_index: 1.01, temperature_avg: 26, rainfall_mm: 28 },
        { period: 'Apr 2024', month: 4, season: 'Spring', revenue: 1680000, orders: 3360, customers: 2500, avg_order_value: 500, year_over_year: 15.9, seasonal_index: 1.12, temperature_avg: 32, rainfall_mm: 18 },
        { period: 'May 2024', month: 5, season: 'Summer', revenue: 1900000, orders: 3800, customers: 2850, avg_order_value: 500, year_over_year: 18.8, seasonal_index: 1.27, temperature_avg: 37, rainfall_mm: 12 },
        { period: 'Jun 2024', month: 6, season: 'Summer', revenue: 2140000, orders: 4280, customers: 3200, avg_order_value: 500, year_over_year: 22.3, seasonal_index: 1.43, temperature_avg: 39, rainfall_mm: 48 }
      ]

      const mockCategories: CategorySeasonality[] = [
        { category: 'Electronics', spring: 85, summer: 120, monsoon: 75, winter: 140, peak_season: 'Winter', seasonality_strength: 85.2 },
        { category: 'Clothing', spring: 110, summer: 95, monsoon: 60, winter: 135, peak_season: 'Winter', seasonality_strength: 78.5 },
        { category: 'Home & Garden', spring: 130, summer: 110, monsoon: 70, winter: 90, peak_season: 'Spring', seasonality_strength: 65.8 },
        { category: 'Sports', spring: 120, summer: 140, monsoon: 50, winter: 90, peak_season: 'Summer', seasonality_strength: 82.3 },
        { category: 'Books', spring: 95, summer: 85, monsoon: 110, winter: 110, peak_season: 'Monsoon', seasonality_strength: 28.5 }
      ]

      const mockForecast: ForecastData[] = [
        { period: 'Jul 2024', forecast: 1720000, confidence_low: 1550000, confidence_high: 1890000, seasonal_component: 120000, trend_component: 50000 },
        { period: 'Aug 2024', forecast: 1580000, confidence_low: 1420000, confidence_high: 1740000, seasonal_component: 80000, trend_component: 55000 },
        { period: 'Sep 2024', forecast: 1520000, confidence_low: 1360000, confidence_high: 1680000, seasonal_component: 60000, trend_component: 60000 },
        { period: 'Oct 2024', forecast: 1780000, confidence_low: 1600000, confidence_high: 1960000, seasonal_component: 140000, trend_component: 65000 },
        { period: 'Nov 2024', forecast: 2050000, confidence_low: 1840000, confidence_high: 2260000, seasonal_component: 280000, trend_component: 70000 },
        { period: 'Dec 2024', forecast: 2350000, confidence_low: 2110000, confidence_high: 2590000, seasonal_component: 420000, trend_component: 75000 }
      ]

      const mockData: SeasonalAnalysisData = {
        historical: mockHistorical,
        categories: mockCategories,
        forecast: mockForecast,
        insights: {
          peak_season: 'Winter',
          low_season: 'Monsoon',
          seasonality_score: 78.5,
          trend_direction: 'up',
          weather_correlation: 0.72,
          best_performing_month: 'December'
        },
        weather_impact: {
          temperature_correlation: -0.45,
          rainfall_correlation: -0.28,
          seasonal_adjustment_factor: 1.15
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      setAnalysisData(mockData)
    } catch (error) {
      console.error('Error fetching analysis data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalysisData()
  }, [fetchAnalysisData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getSeasonIcon = (season: string) => {
    const IconComponent = SEASON_ICONS[season as keyof typeof SEASON_ICONS] || Calendar
    return <IconComponent className="h-4 w-4" />
  }

  const getSeasonalData = () => {
    if (!analysisData) return []
    
    const data = analysisData.historical.slice(-parseInt(timeRange.replace('m', '')))
    
    return data.map(item => ({
      ...item,
      value: metricType === 'revenue' ? item.revenue : 
             metricType === 'orders' ? item.orders : 
             item.customers
    }))
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seasonal Trend Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading seasonal data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysisData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Seasonal Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No seasonal data available</div>
        </CardContent>
      </Card>
    )
  }

  const seasonalData = getSeasonalData()

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seasonal Trend Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive seasonal patterns and weather impact analysis
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'trends' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('trends')}
            >
              Trends
            </Button>
            <Button
              variant={viewMode === 'categories' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('categories')}
            >
              Categories
            </Button>
            <Button
              variant={viewMode === 'forecast' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('forecast')}
            >
              Forecast
            </Button>
            <Button
              variant={viewMode === 'weather' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('weather')}
            >
              Weather
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Peak Season</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  {analysisData.insights.peak_season}
                  {getSeasonIcon(analysisData.insights.peak_season)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Low Season</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                  {analysisData.insights.low_season}
                  {getSeasonIcon(analysisData.insights.low_season)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Seasonality Score</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {analysisData.insights.seasonality_score}%
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Weather Impact</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {(analysisData.insights.weather_correlation * 100).toFixed(0)}%
                </p>
              </div>
              <Cloud className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={timeRange} onValueChange={(value: '12m' | '24m' | '36m') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12m">12 Months</SelectItem>
              <SelectItem value="24m">24 Months</SelectItem>
              <SelectItem value="36m">36 Months</SelectItem>
            </SelectContent>
          </Select>

          <Select value={metricType} onValueChange={(value: 'revenue' | 'orders' | 'customers') => setMetricType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="customers">Customers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'trends' && (
          <div className="space-y-6">
            {/* Main Seasonal Trend */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Seasonal Trend Pattern</h4>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" angle={-45} textAnchor="end" height={100} />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={metricType === 'revenue' ? formatCurrency : (value: number) => value.toLocaleString()}
                  />
                  <YAxis yAxisId="right" orientation="right" domain={[0.5, 1.5]} />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'Seasonal Index') return [value.toFixed(2), name]
                      return metricType === 'revenue' ? [formatCurrency(value), name] : [value.toLocaleString(), name]
                    }}
                  />
                  <Legend />
                  
                  {/* Main metric as area chart */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name={metricType === 'revenue' ? 'Revenue' : metricType === 'orders' ? 'Orders' : 'Customers'}
                  />
                  
                  {/* Seasonal index as line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="seasonal_index"
                    stroke="#ff7300"
                    strokeWidth={2}
                    dot={{ fill: '#ff7300', strokeWidth: 2, r: 3 }}
                    name="Seasonal Index"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Year-over-Year Comparison */}
            <div className="h-64">
              <h4 className="text-sm font-medium mb-3">Year-over-Year Growth</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'YoY Growth']} />
                  <Bar 
                    dataKey="year_over_year" 
                    fill="#00C49F"
                    name="YoY Growth %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'categories' && (
          <div className="space-y-6">
            {/* Category Seasonality Heatmap */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Category Seasonal Performance</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.categories} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="spring" stackId="a" fill={SEASON_COLORS.Spring} name="Spring" />
                  <Bar dataKey="summer" stackId="a" fill={SEASON_COLORS.Summer} name="Summer" />
                  <Bar dataKey="monsoon" stackId="a" fill={SEASON_COLORS.Monsoon} name="Monsoon" />
                  <Bar dataKey="winter" stackId="a" fill={SEASON_COLORS.Winter} name="Winter" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisData.categories.map((category) => (
                <div key={category.category} className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-3">{category.category}</h5>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Leaf className="h-3 w-3 text-green-500" />
                        Spring:
                      </span>
                      <span className="font-medium">{category.spring}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Sun className="h-3 w-3 text-yellow-500" />
                        Summer:
                      </span>
                      <span className="font-medium">{category.summer}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Cloud className="h-3 w-3 text-blue-500" />
                        Monsoon:
                      </span>
                      <span className="font-medium">{category.monsoon}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Snowflake className="h-3 w-3 text-blue-300" />
                        Winter:
                      </span>
                      <span className="font-medium">{category.winter}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Peak Season:</span>
                        <span className="font-medium">{category.peak_season}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Strength:</span>
                        <span className="font-medium">{category.seasonality_strength.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'forecast' && (
          <div className="space-y-6">
            {/* Seasonal Forecast */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Seasonal Forecast with Confidence Intervals</h4>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={[...seasonalData.slice(-6), ...analysisData.forecast]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  
                  {/* Historical data */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                    name="Historical"
                    connectNulls={false}
                  />
                  
                  {/* Forecast */}
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#ff7300"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
                    name="Forecast"
                    connectNulls={false}
                  />
                  
                  {/* Confidence interval */}
                  <Area
                    type="monotone"
                    dataKey="confidence_high"
                    stroke="none"
                    fill="#ff7300"
                    fillOpacity={0.1}
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="confidence_low"
                    stroke="none"
                    fill="#ff7300"
                    fillOpacity={0.1}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast Components */}
            <div className="h-64">
              <h4 className="text-sm font-medium mb-3">Forecast Components</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="trend_component" stackId="a" fill="#82ca9d" name="Trend Component" />
                  <Bar dataKey="seasonal_component" stackId="a" fill="#8884d8" name="Seasonal Component" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'weather' && (
          <div className="space-y-6">
            {/* Weather Correlation */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Revenue vs Weather Patterns</h4>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name.includes('Temperature')) return [`${value}°C`, name]
                      if (name.includes('Rainfall')) return [`${value}mm`, name]
                      return [formatCurrency(value), name]
                    }}
                  />
                  <Legend />
                  
                  <Bar yAxisId="left" dataKey="value" fill="#8884d8" name="Revenue" fillOpacity={0.6} />
                  <Line yAxisId="right" type="monotone" dataKey="temperature_avg" stroke="#ff7300" strokeWidth={2} name="Temperature (°C)" />
                  <Line yAxisId="right" type="monotone" dataKey="rainfall_mm" stroke="#0088fe" strokeWidth={2} name="Rainfall (mm)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Weather Impact Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2 flex items-center gap-2">
                  <Sun className="h-4 w-4 text-yellow-500" />
                  Temperature Impact
                </h5>
                <div className="text-2xl font-bold">
                  {(analysisData.weather_impact.temperature_correlation * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysisData.weather_impact.temperature_correlation < 0 ? 'Negative' : 'Positive'} correlation
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2 flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  Rainfall Impact
                </h5>
                <div className="text-2xl font-bold">
                  {(analysisData.weather_impact.rainfall_correlation * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysisData.weather_impact.rainfall_correlation < 0 ? 'Negative' : 'Positive'} correlation
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Seasonal Adjustment</h5>
                <div className="text-2xl font-bold">
                  {analysisData.weather_impact.seasonal_adjustment_factor.toFixed(2)}x
                </div>
                <p className="text-sm text-muted-foreground">
                  Weather adjustment factor
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
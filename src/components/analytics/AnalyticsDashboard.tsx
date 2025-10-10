'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Download,
  RefreshCw,
  Settings,
  Calendar,
  DollarSign,
  Percent,
  Activity,
  PieChart
} from 'lucide-react'

// Import all BI widgets
import {
  CustomerLifetimeValueWidget,
  SalesForecasting,
  ProductPerformanceMatrix,
  ProfitabilityAnalysisChart,
  MarketSegmentationChart,
  SeasonalTrendAnalysis,
  CompetitiveAnalysisWidget,
  ROICalculator
} from './index'

interface AnalyticsDashboardProps {
  dateRange?: {
    startDate: string
    endDate: string
  }
}

export default function AnalyticsDashboard({ dateRange }: AnalyticsDashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'detailed'>('overview')
  const [selectedWidget, setSelectedWidget] = useState<string>('clv')
  const [refreshing, setRefreshing] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'png'>('pdf')

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 2000))
    setRefreshing(false)
  }

  const handleExport = async (format: 'pdf' | 'excel' | 'png') => {
    // Implementation for export functionality
    console.log(`Exporting analytics in ${format} format...`)
    // This would typically call an API endpoint to generate the export
  }

  const analyticsKPIs = [
    {
      title: 'Revenue Growth',
      value: '+15.2%',
      description: 'vs last month',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Customer LTV',
      value: '₹45,250',
      description: 'average lifetime value',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Profit Margin',
      value: '28.5%',
      description: 'industry avg: 22%',
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Market Share',
      value: '15.8%',
      description: 'in target segment',
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ]

  const widgetOptions = [
    { id: 'clv', name: 'Customer Lifetime Value', icon: Users },
    { id: 'forecasting', name: 'Sales Forecasting', icon: TrendingUp },
    { id: 'products', name: 'Product Performance', icon: BarChart3 },
    { id: 'profitability', name: 'Profitability Analysis', icon: DollarSign },
    { id: 'segmentation', name: 'Market Segmentation', icon: PieChart },
    { id: 'seasonal', name: 'Seasonal Trends', icon: Calendar },
    { id: 'competitive', name: 'Competitive Analysis', icon: Activity },
    { id: 'roi', name: 'ROI Calculator', icon: Target }
  ]

  const renderWidget = () => {
    switch (selectedWidget) {
      case 'clv':
        return <CustomerLifetimeValueWidget />
      case 'forecasting':
        return <SalesForecasting />
      case 'products':
        return <ProductPerformanceMatrix />
      case 'profitability':
        return <ProfitabilityAnalysisChart />
      case 'segmentation':
        return <MarketSegmentationChart />
      case 'seasonal':
        return <SeasonalTrendAnalysis />
      case 'competitive':
        return <CompetitiveAnalysisWidget />
      case 'roi':
        return <ROICalculator />
      default:
        return <CustomerLifetimeValueWidget />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Intelligence Dashboard</h2>
            <p className="text-gray-600">Advanced analytics and insights for data-driven decisions</p>
            {dateRange && (
              <Badge variant="outline" className="mt-2">
                {dateRange.startDate} to {dateRange.endDate}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'png') => setExportFormat(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(exportFormat)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView(activeView === 'overview' ? 'detailed' : 'overview')}
            >
              <Settings className="h-4 w-4 mr-2" />
              {activeView === 'overview' ? 'Detailed View' : 'Overview'}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsKPIs.map((kpi, index) => {
          const IconComponent = kpi.icon
          return (
            <Card key={index} className={`${kpi.bgColor} ${kpi.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${kpi.color.replace('text-', 'bg-')} rounded-lg`}>
                    <IconComponent className={`h-5 w-5 text-white`} />
                  </div>
                  <div>
                    <p className={`text-sm ${kpi.color} font-medium`}>{kpi.title}</p>
                    <p className={`text-lg font-bold ${kpi.color.replace('600', '900')}`}>{kpi.value}</p>
                    <p className={`text-xs ${kpi.color}`}>{kpi.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {activeView === 'overview' ? (
        /* Overview Mode - Grid of all widgets */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <CustomerLifetimeValueWidget />
            <ProductPerformanceMatrix />
            <MarketSegmentationChart />
            <ROICalculator />
          </div>
          <div className="space-y-6">
            <SalesForecasting />
            <ProfitabilityAnalysisChart />
            <SeasonalTrendAnalysis />
            <CompetitiveAnalysisWidget />
          </div>
        </div>
      ) : (
        /* Detailed Mode - Single widget focus */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Widget Selection
              </CardTitle>
              <CardDescription>
                Choose a specific analytics widget to focus on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {widgetOptions.map((widget) => {
                  const IconComponent = widget.icon
                  return (
                    <Button
                      key={widget.id}
                      variant={selectedWidget === widget.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedWidget(widget.id)}
                      className="justify-start h-auto p-3"
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      <span className="text-xs">{widget.name}</span>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Widget */}
          <div className="w-full">
            {renderWidget()}
          </div>
        </div>
      )}

      {/* Real-time Status Indicator */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-900">
                Live Data Feed Active
              </span>
              <span className="text-xs text-blue-600">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                Real-time
              </Badge>
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                All Systems Operational
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
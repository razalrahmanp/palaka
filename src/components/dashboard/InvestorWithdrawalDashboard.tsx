'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Users, User, PieChart as PieChartIcon } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface InvestorData {
  id: number
  name: string
  total_investment: number
  total_withdrawal: number
  net_position: number
  equity_percentage: number
  investment_by_category?: { category: string; amount: number }[]
  withdrawal_by_type?: { type: string; amount: number }[]
}

interface InvestorApiResponse {
  totalInvestment: number
  totalWithdrawal: number
  netPosition: number
  investmentByCategory: { name: string; value: number }[]
  withdrawalByType: { name: string; value: number }[]
  trendData: { month: string; investment: number; withdrawal: number }[]
  investors: InvestorData[]
}

interface InvestorWithdrawalDashboardProps {
  kpiData: {
    withdrawalsTotal?: number
    withdrawalsCount?: number
    investmentData?: {
      totalInvestment: number
      totalWithdrawal: number
      netPosition: number
      investmentByCategory: { name: string; value: number }[]
      withdrawalByType: { name: string; value: number }[]
      trendData: { month: string; investment: number; withdrawal: number }[]
      investors: InvestorData[]
    }
  } | null
}

const INVESTMENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const WITHDRAWAL_COLORS = ['#DC2626', '#F59E0B', '#10B981', '#3B82F6']

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`
  return `₹${value.toFixed(0)}`
}

export default function InvestorWithdrawalDashboard({ }: InvestorWithdrawalDashboardProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'investors'>('overview')
  const [investorData, setInvestorData] = useState<InvestorApiResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch investor data when component mounts or view mode changes
  useEffect(() => {
    const fetchInvestorData = async () => {
      setLoading(true)
      try {
        // Use all-time data instead of filtering by date
        const response = await fetch('/api/dashboard/investors?all_time=true')
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Investor data received:', data)
          setInvestorData(data)
        } else {
          console.error('Failed to fetch investor data:', response.status, response.statusText)
          const errorData = await response.json().catch(() => ({}))
          console.error('Error details:', errorData)
        }
      } catch (error) {
        console.error('Error fetching investor data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInvestorData()
  }, [])

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const investmentByCategory = investorData?.investmentByCategory || []
  const withdrawalByType = investorData?.withdrawalByType || []
  const trendData = investorData?.trendData || []
  const investors = investorData?.investors || []

  return (
    <div className="space-y-3">
      {/* Compact Header with Toggle Buttons */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold text-violet-900">Investor Dashboard</h3>
        </div>
        
        {/* Toggle Buttons */}
        <div className="flex bg-white border border-violet-300 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              viewMode === 'overview'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-violet-700 hover:text-violet-900 hover:bg-violet-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <PieChartIcon className="h-3.5 w-3.5" />
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setViewMode('investors')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              viewMode === 'investors'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-violet-700 hover:text-violet-900 hover:bg-violet-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>All Investors</span>
            </div>
          </button>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <>
          {/* Summary Cards - Matching KPI card height */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700 block truncate">Total Investment</span>
                    <div className="text-sm sm:text-lg font-bold text-blue-900 truncate">
                      {formatCurrency(investorData?.totalInvestment || 0)}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700 block truncate">Total Withdrawal</span>
                    <div className="text-sm sm:text-lg font-bold text-red-900 truncate">
                      {formatCurrency(investorData?.totalWithdrawal || 0)}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700 block truncate">Net Position</span>
                    <div className="text-sm sm:text-lg font-bold text-green-900 truncate">
                      {formatCurrency(investorData?.netPosition || 0)}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section - Fixed Height Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[380px]">
            {/* Investment Breakdown Pie Chart */}
            <Card className="bg-white border-blue-200 h-full flex flex-col overflow-hidden">
              <CardHeader className="py-2 pb-1 flex-shrink-0">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <PieChartIcon className="h-3.5 w-3.5 text-blue-600" />
                  Investment by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-1 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 5, bottom: 25, left: 5 }}>
                    <Pie
                      data={investmentByCategory}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {investmentByCategory.map((_entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={INVESTMENT_COLORS[index % INVESTMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={50}
                      wrapperStyle={{ 
                        fontSize: '10px',
                        paddingTop: '8px'
                      }}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Withdrawal Breakdown Pie Chart */}
            <Card className="bg-white border-red-200 h-full flex flex-col overflow-hidden">
              <CardHeader className="py-2 pb-1 flex-shrink-0">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <PieChartIcon className="h-3.5 w-3.5 text-red-600" />
                  Withdrawal by Type
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-1 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 5, right: 5, bottom: 25, left: 5 }}>
                    <Pie
                      data={withdrawalByType}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {withdrawalByType.map((_entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={WITHDRAWAL_COLORS[index % WITHDRAWAL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={50}
                      wrapperStyle={{ 
                        fontSize: '10px',
                        paddingTop: '8px'
                      }}
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trend Line Chart */}
            <Card className="bg-white border-violet-200 h-full flex flex-col overflow-hidden">
              <CardHeader className="py-2 pb-1 flex-shrink-0">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                  Investment vs Withdrawal Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-1 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 35, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={9}
                      stroke="#6b7280"
                      angle={-35}
                      textAnchor="end"
                      height={50}
                      interval={0}
                    />
                    <YAxis 
                      fontSize={9}
                      stroke="#6b7280"
                      tickFormatter={(value) => formatNumber(value)}
                      width={55}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: '10px',
                        padding: '4px 8px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={30}
                      wrapperStyle={{ 
                        fontSize: '10px',
                        paddingTop: '5px'
                      }}
                      iconSize={8}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="investment" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Investment"
                      dot={{ fill: '#3B82F6', r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="withdrawal" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Withdrawal"
                      dot={{ fill: '#EF4444', r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Individual Investors Mode - Compact Grid with Charts */}
      {viewMode === 'investors' && (
        <div className="h-[480px] overflow-hidden">
          {investors.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No investor data available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full overflow-y-auto pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {investors.map((investor: InvestorData) => {
                  const maxValue = Math.max(investor.total_investment, investor.total_withdrawal, Math.abs(investor.net_position));
                  const investmentWidth = maxValue > 0 ? (investor.total_investment / maxValue) * 100 : 0;
                  const withdrawalWidth = maxValue > 0 ? (investor.total_withdrawal / maxValue) * 100 : 0;
                  
                  return (
                    <Card 
                      key={investor.id} 
                      className={`border ${
                        investor.net_position > 0 
                          ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
                          : investor.net_position < 0 
                          ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
                          : 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50'
                      } hover:shadow-md transition-shadow`}
                      style={{
                        ['--investment-width' as string]: `${investmentWidth}%`,
                        ['--withdrawal-width' as string]: `${withdrawalWidth}%`
                      } as React.CSSProperties}
                    >
                      <CardContent className="p-3">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate" title={investor.name}>
                              {investor.name}
                            </h4>
                            {investor.equity_percentage > 0 && (
                              <p className="text-[9px] text-gray-600">
                                Equity: {investor.equity_percentage}%
                              </p>
                            )}
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-1 ${
                            investor.net_position > 0 
                              ? 'bg-green-500' 
                              : investor.net_position < 0 
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}>
                            <User className="h-3 w-3 text-white" />
                          </div>
                        </div>

                        {/* Net Position - Large */}
                        <div className="mb-2">
                          <div className="text-[9px] text-gray-600 mb-0.5">Net Position</div>
                          <div className={`text-lg font-bold truncate ${
                            investor.net_position > 0 
                              ? 'text-green-600' 
                              : investor.net_position < 0 
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}>
                            {formatCurrency(investor.net_position)}
                          </div>
                        </div>

                        {/* Investment Bar */}
                        <div className="mb-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-blue-700 font-medium">Investment</span>
                            <span className="text-[9px] text-blue-900 font-semibold">
                              {formatNumber(investor.total_investment)}
                            </span>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full rounded-full transition-all [width:var(--investment-width)]"
                            ></div>
                          </div>
                        </div>

                        {/* Withdrawal Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-red-700 font-medium">Withdrawal</span>
                            <span className="text-[9px] text-red-900 font-semibold">
                              {formatNumber(investor.total_withdrawal)}
                            </span>
                          </div>
                          <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-red-500 h-full rounded-full transition-all [width:var(--withdrawal-width)]"
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

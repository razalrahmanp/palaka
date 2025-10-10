'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Calculator, TrendingUp, Target, AlertCircle, CheckCircle } from 'lucide-react'

interface InvestmentScenario {
  id: string
  name: string
  initial_investment: number
  expected_return: number
  time_period: number
  risk_level: 'Low' | 'Medium' | 'High'
  category: string
  monthly_cash_flow: number[]
  roi_percentage: number
  payback_period: number
  npv: number
  irr: number
}

interface ROICalculation {
  investment_amount: number
  returns: number[]
  periods: number
  discount_rate: number
  roi: number
  annualized_roi: number
  total_return: number
  net_profit: number
  payback_period: number
  npv: number
  irr: number
  profitability_index: number
}

interface ROIAnalysisData {
  scenarios: InvestmentScenario[]
  calculations: ROICalculation[]
  benchmarks: {
    industry_average_roi: number
    market_roi: number
    risk_free_rate: number
    inflation_rate: number
  }
  historical_performance: {
    period: string
    investment: number
    returns: number
    roi: number
  }[]
}

// Risk level colors (now using CSS classes instead)
// const RISK_COLORS = {
//   'Low': '#00C49F',
//   'Medium': '#FFBB28', 
//   'High': '#FF8042'
// }

export default function ROICalculator() {
  const [analysisData, setAnalysisData] = useState<ROIAnalysisData | null>(null)
  const [viewMode, setViewMode] = useState<'calculator' | 'scenarios' | 'analysis' | 'comparison'>('calculator')
  const [loading, setLoading] = useState(true)

  // Calculator inputs
  const [investment, setInvestment] = useState<number>(100000)
  const [expectedReturn, setExpectedReturn] = useState<number>(150000)
  const [timePeriod, setTimePeriod] = useState<number>(12)
  const [discountRate, setDiscountRate] = useState<number>(10)
  const [calculatedROI, setCalculatedROI] = useState<ROICalculation | null>(null)

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockScenarios: InvestmentScenario[] = [
        {
          id: 'marketing_campaign',
          name: 'Digital Marketing Campaign',
          initial_investment: 50000,
          expected_return: 125000,
          time_period: 6,
          risk_level: 'Medium',
          category: 'Marketing',
          monthly_cash_flow: [0, 5000, 15000, 25000, 35000, 45000],
          roi_percentage: 150,
          payback_period: 4.2,
          npv: 68500,
          irr: 45.2
        },
        {
          id: 'equipment_upgrade',
          name: 'Equipment Upgrade',
          initial_investment: 200000,
          expected_return: 280000,
          time_period: 24,
          risk_level: 'Low',
          category: 'Operations',
          monthly_cash_flow: Array.from({length: 24}, (_, i) => 10000 + (i * 500)),
          roi_percentage: 40,
          payback_period: 18.5,
          npv: 45000,
          irr: 12.8
        },
        {
          id: 'new_product',
          name: 'New Product Launch',
          initial_investment: 300000,
          expected_return: 500000,
          time_period: 18,
          risk_level: 'High',
          category: 'Product Development',
          monthly_cash_flow: [0, 0, 0, 10000, 20000, 30000, 40000, 50000, 45000, 40000, 35000, 30000, 25000, 20000, 15000, 10000, 8000, 5000],
          roi_percentage: 66.7,
          payback_period: 12.8,
          npv: 125000,
          irr: 18.5
        }
      ]

      const mockHistorical = [
        { period: 'Q1 2023', investment: 180000, returns: 245000, roi: 36.1 },
        { period: 'Q2 2023', investment: 220000, returns: 285000, roi: 29.5 },
        { period: 'Q3 2023', investment: 150000, returns: 195000, roi: 30.0 },
        { period: 'Q4 2023', investment: 280000, returns: 385000, roi: 37.5 },
        { period: 'Q1 2024', investment: 190000, returns: 275000, roi: 44.7 },
        { period: 'Q2 2024', investment: 250000, returns: 365000, roi: 46.0 }
      ]

      const mockData: ROIAnalysisData = {
        scenarios: mockScenarios,
        calculations: [],
        benchmarks: {
          industry_average_roi: 25.5,
          market_roi: 18.2,
          risk_free_rate: 6.5,
          inflation_rate: 4.2
        },
        historical_performance: mockHistorical
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

  const calculateROI = useCallback(() => {
    const roi = ((expectedReturn - investment) / investment) * 100
    const annualizedROI = ((expectedReturn / investment) ** (12 / timePeriod) - 1) * 100
    const netProfit = expectedReturn - investment
    const paybackPeriod = investment / (expectedReturn / timePeriod)
    
    // Simple NPV calculation
    const monthlyReturn = expectedReturn / timePeriod
    const monthlyRate = discountRate / 100 / 12
    let npv = -investment
    for (let i = 1; i <= timePeriod; i++) {
      npv += monthlyReturn / Math.pow(1 + monthlyRate, i)
    }
    
    // Simple IRR estimation (approximation)
    const irr = (Math.pow(expectedReturn / investment, 1 / (timePeriod / 12)) - 1) * 100
    
    const profitabilityIndex = (npv + investment) / investment

    const calculation: ROICalculation = {
      investment_amount: investment,
      returns: [expectedReturn],
      periods: timePeriod,
      discount_rate: discountRate,
      roi,
      annualized_roi: annualizedROI,
      total_return: expectedReturn,
      net_profit: netProfit,
      payback_period: paybackPeriod,
      npv,
      irr,
      profitability_index: profitabilityIndex
    }

    setCalculatedROI(calculation)
  }, [investment, expectedReturn, timePeriod, discountRate])

  useEffect(() => {
    calculateROI()
  }, [calculateROI])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Utility function for risk level colors (now using CSS classes)
  // const getRiskColor = (level: string) => {
  //   return RISK_COLORS[level as keyof typeof RISK_COLORS] || '#666'
  // }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            ROI Calculator & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading ROI data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysisData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ROI Calculator & Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No ROI data available</div>
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
              <Calculator className="h-5 w-5" />
              ROI Calculator & Analysis
            </CardTitle>
            <CardDescription>
              Calculate and analyze return on investment for various scenarios
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'calculator' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('calculator')}
            >
              Calculator
            </Button>
            <Button
              variant={viewMode === 'scenarios' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('scenarios')}
            >
              Scenarios
            </Button>
            <Button
              variant={viewMode === 'analysis' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('analysis')}
            >
              Analysis
            </Button>
            <Button
              variant={viewMode === 'comparison' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('comparison')}
            >
              Comparison
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Benchmarks */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Industry Average</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {analysisData.benchmarks.industry_average_roi.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Market ROI</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {analysisData.benchmarks.market_roi.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Risk-Free Rate</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {analysisData.benchmarks.risk_free_rate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Inflation Rate</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {analysisData.benchmarks.inflation_rate.toFixed(1)}%
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {viewMode === 'calculator' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Investment Parameters</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="investment">Initial Investment (₹)</Label>
                    <Input
                      id="investment"
                      type="number"
                      value={investment}
                      onChange={(e) => setInvestment(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="return">Expected Return (₹)</Label>
                    <Input
                      id="return"
                      type="number"
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="period">Time Period (Months)</Label>
                    <Input
                      id="period"
                      type="number"
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="discount">Discount Rate (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.1"
                      value={discountRate}
                      onChange={(e) => setDiscountRate(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Calculation Results</h4>
                {calculatedROI && (
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">ROI</span>
                        <span className="text-2xl font-bold text-green-600">
                          {calculatedROI.roi.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Annualized ROI</span>
                        <span className="font-medium">{calculatedROI.annualized_roi.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Net Profit</span>
                        <span className="font-medium">{formatCurrency(calculatedROI.net_profit)}</span>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Payback Period</span>
                        <span className="font-medium">{calculatedROI.payback_period.toFixed(1)} months</span>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">NPV</span>
                        <span className={`font-medium ${calculatedROI.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(calculatedROI.npv)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">IRR</span>
                        <span className="font-medium">{calculatedROI.irr.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foregoing">Profitability Index</span>
                        <span className="font-medium">{calculatedROI.profitability_index.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Investment vs Return Visualization */}
            {calculatedROI && (
              <div className="h-64">
                <h4 className="text-sm font-medium mb-3">Investment Breakdown</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Initial Investment', value: calculatedROI.investment_amount },
                        { name: 'Net Profit', value: calculatedROI.net_profit }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#8884d8" />
                      <Cell fill="#00C49F" />
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {viewMode === 'scenarios' && (
          <div className="space-y-6">
            {/* Scenarios Comparison */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Investment Scenarios Comparison</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.scenarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="initial_investment" fill="#8884d8" name="Investment" />
                  <Bar dataKey="expected_return" fill="#00C49F" name="Expected Return" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Scenarios Details */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Scenario</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Investment</th>
                    <th className="text-right p-2">Expected Return</th>
                    <th className="text-right p-2">ROI %</th>
                    <th className="text-right p-2">Payback Period</th>
                    <th className="text-right p-2">NPV</th>
                    <th className="text-center p-2">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisData.scenarios.map((scenario) => (
                    <tr key={scenario.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{scenario.name}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 text-xs bg-muted rounded">
                          {scenario.category}
                        </span>
                      </td>
                      <td className="p-2 text-right">{formatCurrency(scenario.initial_investment)}</td>
                      <td className="p-2 text-right">{formatCurrency(scenario.expected_return)}</td>
                      <td className={`p-2 text-right font-medium ${scenario.roi_percentage >= 30 ? 'text-green-600' : scenario.roi_percentage >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scenario.roi_percentage.toFixed(1)}%
                      </td>
                      <td className="p-2 text-right">{scenario.payback_period.toFixed(1)} months</td>
                      <td className={`p-2 text-right ${scenario.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(scenario.npv)}
                      </td>
                      <td className="p-2 text-center">
                        <span 
                          className={`px-2 py-1 rounded text-xs text-white font-medium ${
                            scenario.risk_level === 'Low' ? 'bg-green-500' :
                            scenario.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        >
                          {scenario.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'analysis' && (
          <div className="space-y-6">
            {/* Historical Performance */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Historical ROI Performance</h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analysisData.historical_performance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'roi' ? `${value}%` : formatCurrency(value), 
                      name === 'roi' ? 'ROI %' : name === 'investment' ? 'Investment' : 'Returns'
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="investment" fill="#8884d8" name="Investment" />
                  <Bar yAxisId="left" dataKey="returns" fill="#00C49F" name="Returns" />
                  <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#ff7300" strokeWidth={2} name="ROI %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Average ROI</h5>
                <div className="text-2xl font-bold text-green-600">
                  {(analysisData.historical_performance.reduce((sum, p) => sum + p.roi, 0) / analysisData.historical_performance.length).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  vs Industry {analysisData.benchmarks.industry_average_roi}%
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Total Investment</h5>
                <div className="text-2xl font-bold">
                  {formatCurrency(analysisData.historical_performance.reduce((sum, p) => sum + p.investment, 0))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Over {analysisData.historical_performance.length} periods
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Total Returns</h5>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(analysisData.historical_performance.reduce((sum, p) => sum + p.returns, 0))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Net profit: {formatCurrency(
                    analysisData.historical_performance.reduce((sum, p) => sum + p.returns, 0) - 
                    analysisData.historical_performance.reduce((sum, p) => sum + p.investment, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'comparison' && (
          <div className="space-y-6">
            {/* ROI vs Risk Analysis */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">ROI vs Risk Analysis</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.scenarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'ROI']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="roi_percentage" 
                    fill="#8884d8" 
                    name="ROI %"
                  />
                  {/* Benchmark line */}
                  <Line 
                    type="monotone" 
                    dataKey={() => analysisData.benchmarks.industry_average_roi} 
                    stroke="#ff7300" 
                    strokeDasharray="5 5"
                    name="Industry Average"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">High ROI Opportunities</h4>
                {analysisData.scenarios
                  .filter(s => s.roi_percentage > analysisData.benchmarks.industry_average_roi)
                  .map((scenario) => (
                    <div key={scenario.id} className="p-3 border rounded bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{scenario.name}</span>
                        <span className="text-green-600 font-bold">{scenario.roi_percentage}%</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {scenario.category} • {scenario.risk_level} Risk • {scenario.payback_period.toFixed(1)}m payback
                      </div>
                    </div>
                  ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Investment Recommendations</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded bg-blue-50 dark:bg-blue-900/20">
                    <h5 className="font-medium text-blue-700 dark:text-blue-300">Best Overall ROI</h5>
                    <p className="text-sm">
                      {analysisData.scenarios.reduce((best, current) => 
                        current.roi_percentage > best.roi_percentage ? current : best
                      ).name}
                    </p>
                  </div>

                  <div className="p-3 border rounded bg-green-50 dark:bg-green-900/20">
                    <h5 className="font-medium text-green-700 dark:text-green-300">Fastest Payback</h5>
                    <p className="text-sm">
                      {analysisData.scenarios.reduce((best, current) => 
                        current.payback_period < best.payback_period ? current : best
                      ).name}
                    </p>
                  </div>

                  <div className="p-3 border rounded bg-purple-50 dark:bg-purple-900/20">
                    <h5 className="font-medium text-purple-700 dark:text-purple-300">Highest NPV</h5>
                    <p className="text-sm">
                      {analysisData.scenarios.reduce((best, current) => 
                        current.npv > best.npv ? current : best
                      ).name}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
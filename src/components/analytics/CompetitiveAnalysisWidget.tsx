'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Sword, TrendingUp, TrendingDown, Shield, Zap, Award } from 'lucide-react'

interface CompetitorData {
  company_name: string
  market_share: number
  revenue_estimate: number
  growth_rate: number
  pricing_index: number
  quality_score: number
  innovation_score: number
  customer_satisfaction: number
  digital_presence: number
  brand_strength: number
  competitive_advantage: string[]
  threat_level: 'Low' | 'Medium' | 'High' | 'Critical'
}

interface MarketPosition {
  dimension: string
  our_company: number
  top_competitor: number
  market_average: number
  benchmark_score: number
}

interface CompetitiveMetrics {
  swot_analysis: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  market_dynamics: {
    market_size: number
    growth_rate: number
    concentration_ratio: number
    barriers_to_entry: number
    competitive_intensity: number
  }
  positioning: {
    our_rank: number
    total_competitors: number
    market_leadership_score: number
    competitive_moat: number
  }
}

interface CompetitiveAnalysisData {
  competitors: CompetitorData[]
  market_position: MarketPosition[]
  metrics: CompetitiveMetrics
  trends: {
    emerging_competitors: CompetitorData[]
    declining_competitors: CompetitorData[]
    market_consolidation: number
    innovation_pace: number
  }
}

// Threat level colors (now using CSS classes instead)
// const THREAT_COLORS = {
//   'Low': '#00C49F',
//   'Medium': '#FFBB28',
//   'High': '#FF8042',
//   'Critical': '#FF0000'
// }

export default function CompetitiveAnalysisWidget() {
  const [analysisData, setAnalysisData] = useState<CompetitiveAnalysisData | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'positioning' | 'swot' | 'trends'>('overview')
  const [comparisonMetric, setComparisonMetric] = useState<'market_share' | 'growth_rate' | 'quality_score'>('market_share')
  const [loading, setLoading] = useState(true)

  const fetchAnalysisData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data - replace with actual API call
      const mockCompetitors: CompetitorData[] = [
        {
          company_name: 'Our Company',
          market_share: 15.2,
          revenue_estimate: 125000000,
          growth_rate: 18.5,
          pricing_index: 95,
          quality_score: 88,
          innovation_score: 85,
          customer_satisfaction: 4.3,
          digital_presence: 78,
          brand_strength: 82,
          competitive_advantage: ['Customer Service', 'Innovation', 'Pricing'],
          threat_level: 'Low'
        },
        {
          company_name: 'Market Leader Co.',
          market_share: 28.7,
          revenue_estimate: 285000000,
          growth_rate: 12.3,
          pricing_index: 110,
          quality_score: 92,
          innovation_score: 89,
          customer_satisfaction: 4.1,
          digital_presence: 95,
          brand_strength: 94,
          competitive_advantage: ['Market Presence', 'Brand Recognition', 'Distribution'],
          threat_level: 'High'
        },
        {
          company_name: 'TechCorp Solutions',
          market_share: 18.5,
          revenue_estimate: 180000000,
          growth_rate: 22.8,
          pricing_index: 88,
          quality_score: 86,
          innovation_score: 94,
          customer_satisfaction: 4.2,
          digital_presence: 92,
          brand_strength: 79,
          competitive_advantage: ['Technology', 'Innovation', 'Speed'],
          threat_level: 'Critical'
        },
        {
          company_name: 'ValueMax Inc.',
          market_share: 12.8,
          revenue_estimate: 95000000,
          growth_rate: 8.9,
          pricing_index: 75,
          quality_score: 78,
          innovation_score: 68,
          customer_satisfaction: 3.9,
          digital_presence: 65,
          brand_strength: 70,
          competitive_advantage: ['Low Pricing', 'Cost Efficiency'],
          threat_level: 'Medium'
        },
        {
          company_name: 'Premium Services Ltd.',
          market_share: 8.5,
          revenue_estimate: 72000000,
          growth_rate: 15.2,
          pricing_index: 135,
          quality_score: 95,
          innovation_score: 82,
          customer_satisfaction: 4.6,
          digital_presence: 88,
          brand_strength: 91,
          competitive_advantage: ['Premium Quality', 'Luxury Brand', 'Exclusivity'],
          threat_level: 'Medium'
        }
      ]

      const mockMarketPosition: MarketPosition[] = [
        { dimension: 'Market Share', our_company: 15.2, top_competitor: 28.7, market_average: 16.5, benchmark_score: 72 },
        { dimension: 'Growth Rate', our_company: 18.5, top_competitor: 22.8, market_average: 15.5, benchmark_score: 85 },
        { dimension: 'Quality Score', our_company: 88, top_competitor: 95, market_average: 82, benchmark_score: 78 },
        { dimension: 'Innovation', our_company: 85, top_competitor: 94, market_average: 80, benchmark_score: 82 },
        { dimension: 'Customer Satisfaction', our_company: 4.3, top_competitor: 4.6, market_average: 4.1, benchmark_score: 88 },
        { dimension: 'Digital Presence', our_company: 78, top_competitor: 95, market_average: 76, benchmark_score: 68 },
        { dimension: 'Brand Strength', our_company: 82, top_competitor: 94, market_average: 79, benchmark_score: 75 }
      ]

      const mockData: CompetitiveAnalysisData = {
        competitors: mockCompetitors,
        market_position: mockMarketPosition,
        metrics: {
          swot_analysis: {
            strengths: [
              'Strong customer service',
              'Innovative product features',
              'Competitive pricing strategy',
              'Agile development process',
              'Growing market share'
            ],
            weaknesses: [
              'Limited brand recognition',
              'Smaller marketing budget',
              'Less extensive distribution network',
              'Resource constraints for R&D'
            ],
            opportunities: [
              'Emerging market segments',
              'Digital transformation trends',
              'Partnership opportunities',
              'International expansion',
              'New technology adoption'
            ],
            threats: [
              'Intense price competition',
              'New market entrants',
              'Economic downturn',
              'Regulatory changes',
              'Technology disruption'
            ]
          },
          market_dynamics: {
            market_size: 1250000000,
            growth_rate: 15.8,
            concentration_ratio: 65.2,
            barriers_to_entry: 72,
            competitive_intensity: 85
          },
          positioning: {
            our_rank: 3,
            total_competitors: 12,
            market_leadership_score: 68,
            competitive_moat: 75
          }
        },
        trends: {
          emerging_competitors: mockCompetitors.filter(c => c.growth_rate > 20),
          declining_competitors: mockCompetitors.filter(c => c.growth_rate < 10),
          market_consolidation: 45,
          innovation_pace: 82
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

  // Utility function for threat level colors (now using CSS classes)
  // const getThreatColor = (level: string) => {
  //   return THREAT_COLORS[level as keyof typeof THREAT_COLORS] || '#666'
  // }

  const getRadarData = () => {
    if (!analysisData) return []
    
    return analysisData.market_position.map(pos => ({
      dimension: pos.dimension,
      'Our Company': pos.our_company,
      'Top Competitor': pos.top_competitor,
      'Market Average': pos.market_average
    }))
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="h-5 w-5" />
            Competitive Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading competitive data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analysisData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Competitive Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No competitive data available</div>
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
              <Sword className="h-5 w-5" />
              Competitive Analysis
            </CardTitle>
            <CardDescription>
              Comprehensive competitive landscape and market positioning analysis
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'overview' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('overview')}
            >
              Overview
            </Button>
            <Button
              variant={viewMode === 'positioning' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('positioning')}
            >
              Positioning
            </Button>
            <Button
              variant={viewMode === 'swot' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('swot')}
            >
              SWOT
            </Button>
            <Button
              variant={viewMode === 'trends' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('trends')}
            >
              Trends
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
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Market Rank</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  #{analysisData.metrics.positioning.our_rank}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Market Share</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {analysisData.competitors.find(c => c.company_name === 'Our Company')?.market_share.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Competitive Moat</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {analysisData.metrics.positioning.competitive_moat}%
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Market Intensity</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {analysisData.metrics.market_dynamics.competitive_intensity}%
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={comparisonMetric} onValueChange={(value: 'market_share' | 'growth_rate' | 'quality_score') => setComparisonMetric(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market_share">Market Share</SelectItem>
              <SelectItem value="growth_rate">Growth Rate</SelectItem>
              <SelectItem value="quality_score">Quality Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Competitive Landscape */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Competitive Landscape</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysisData.competitors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="company_name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickFormatter={
                      comparisonMetric === 'market_share' ? (value: number) => `${value}%` :
                      comparisonMetric === 'growth_rate' ? (value: number) => `${value}%` :
                      (value: number) => value.toString()
                    }
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      comparisonMetric === 'market_share' ? `${value}%` :
                      comparisonMetric === 'growth_rate' ? `${value}%` :
                      value.toString(),
                      comparisonMetric === 'market_share' ? 'Market Share' :
                      comparisonMetric === 'growth_rate' ? 'Growth Rate' :
                      'Quality Score'
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey={comparisonMetric} 
                    fill="#8884d8" 
                    name={
                      comparisonMetric === 'market_share' ? 'Market Share %' :
                      comparisonMetric === 'growth_rate' ? 'Growth Rate %' :
                      'Quality Score'
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Competitor Details Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Company</th>
                    <th className="text-right p-2">Market Share</th>
                    <th className="text-right p-2">Revenue Est.</th>
                    <th className="text-right p-2">Growth %</th>
                    <th className="text-right p-2">Quality</th>
                    <th className="text-center p-2">Threat Level</th>
                    <th className="text-left p-2">Advantages</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisData.competitors.map((competitor) => (
                    <tr key={competitor.company_name} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <span className={`font-medium ${competitor.company_name === 'Our Company' ? 'text-blue-600' : ''}`}>
                          {competitor.company_name}
                        </span>
                      </td>
                      <td className="p-2 text-right">{competitor.market_share.toFixed(1)}%</td>
                      <td className="p-2 text-right">{formatCurrency(competitor.revenue_estimate)}</td>
                      <td className={`p-2 text-right ${competitor.growth_rate >= 15 ? 'text-green-600' : competitor.growth_rate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {competitor.growth_rate.toFixed(1)}%
                      </td>
                      <td className="p-2 text-right">{competitor.quality_score}</td>
                      <td className="p-2 text-center">
                        <span 
                          className={`px-2 py-1 rounded text-xs text-white font-medium ${
                            competitor.threat_level === 'Low' ? 'bg-green-500' :
                            competitor.threat_level === 'Medium' ? 'bg-yellow-500' :
                            competitor.threat_level === 'High' ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                        >
                          {competitor.threat_level}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {competitor.competitive_advantage.slice(0, 2).map((advantage, index) => (
                            <span key={index} className="px-1 py-0.5 text-xs bg-muted rounded">
                              {advantage}
                            </span>
                          ))}
                          {competitor.competitive_advantage.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{competitor.competitive_advantage.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'positioning' && (
          <div className="space-y-6">
            {/* Market Position Radar */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Competitive Positioning Radar</h4>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={getRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis />
                  <Radar
                    name="Our Company"
                    dataKey="Our Company"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Top Competitor"
                    dataKey="Top Competitor"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                  <Radar
                    name="Market Average"
                    dataKey="Market Average"
                    stroke="#ffc658"
                    fill="#ffc658"
                    fillOpacity={0.3}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Position Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Competitive Strengths</h4>
                {analysisData.market_position
                  .filter(pos => pos.our_company > pos.market_average)
                  .map((position) => (
                    <div key={position.dimension} className="p-3 border rounded bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{position.dimension}</span>
                        <span className="text-green-600 font-bold">
                          +{(position.our_company - position.market_average).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Above market average by {((position.our_company / position.market_average - 1) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Areas for Improvement</h4>
                {analysisData.market_position
                  .filter(pos => pos.our_company < pos.market_average)
                  .map((position) => (
                    <div key={position.dimension} className="p-3 border rounded bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{position.dimension}</span>
                        <span className="text-red-600 font-bold">
                          {(position.our_company - position.market_average).toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Below market average by {((1 - position.our_company / position.market_average) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'swot' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {analysisData.metrics.swot_analysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
              <h4 className="font-medium text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Weaknesses
              </h4>
              <ul className="space-y-2">
                {analysisData.metrics.swot_analysis.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Opportunities
              </h4>
              <ul className="space-y-2">
                {analysisData.metrics.swot_analysis.opportunities.map((opportunity, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    {opportunity}
                  </li>
                ))}
              </ul>
            </div>

            {/* Threats */}
            <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Threats
              </h4>
              <ul className="space-y-2">
                {analysisData.metrics.swot_analysis.threats.map((threat, index) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    {threat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {viewMode === 'trends' && (
          <div className="space-y-6">
            {/* Market Growth vs Market Share */}
            <div className="h-96">
              <h4 className="text-sm font-medium mb-3">Growth vs Market Share Analysis</h4>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid />
                  <XAxis 
                    type="number" 
                    dataKey="market_share" 
                    name="Market Share"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="growth_rate" 
                    name="Growth Rate"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as CompetitorData
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow">
                            <p className="font-medium">{data.company_name}</p>
                            <p className="text-sm">Market Share: {data.market_share}%</p>
                            <p className="text-sm">Growth Rate: {data.growth_rate}%</p>
                            <p className="text-sm">Threat Level: {data.threat_level}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter 
                    name="Competitors" 
                    data={analysisData.competitors} 
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Emerging Threats</h4>
                {analysisData.trends.emerging_competitors.map((competitor) => (
                  <div key={competitor.company_name} className="p-3 border rounded bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{competitor.company_name}</span>
                      <span className="text-red-600 font-bold">{competitor.growth_rate}%</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Market Share: {competitor.market_share}% • {competitor.threat_level} Threat
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Market Dynamics</h4>
                <div className="space-y-3">
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Market Consolidation</span>
                      <span className="font-medium">{analysisData.trends.market_consolidation}%</span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Innovation Pace</span>
                      <span className="font-medium">{analysisData.trends.innovation_pace}%</span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Barriers to Entry</span>
                      <span className="font-medium">{analysisData.metrics.market_dynamics.barriers_to_entry}%</span>
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Concentration Ratio</span>
                      <span className="font-medium">{analysisData.metrics.market_dynamics.concentration_ratio}%</span>
                    </div>
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
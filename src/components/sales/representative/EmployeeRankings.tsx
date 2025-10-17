import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  Target,
  Crown,
  Medal,
  Award,
  Percent,
  CreditCard,
  RotateCcw
} from 'lucide-react'

interface SalesRepRanking {
  rank: number
  id: string
  name: string
  email: string
  metric_value: number
  metric_label: string
  additional_info: string
  total_revenue?: number // Optional field for total revenue
  total_pending?: number // Optional field for pending amount
}

interface Rankings {
  most_profitable: SalesRepRanking[]
  profit_efficiency: SalesRepRanking[]
  most_sales: SalesRepRanking[]
  highest_revenue: SalesRepRanking[]
  discount_control: SalesRepRanking[]
  best_collection: SalesRepRanking[]
  service_excellence: SalesRepRanking[]
}

interface EmployeeRankingsProps {
  timeFilter?: string
}

const EmployeeRankings: React.FC<EmployeeRankingsProps> = ({ timeFilter = 'all' }) => {
  const [rankings, setRankings] = useState<Rankings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<keyof Rankings>('most_profitable')

  const fetchRankings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/rankings?period=${timeFilter}`)
      const data = await response.json()
      setRankings(data.rankings)
    } catch (error) {
      console.error('Error fetching rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRankings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>
  }

  const formatMetricValue = (value: number, label: string) => {
    if (label === 'Revenue' || label === 'Avg Order Value' || label === 'Total Profit' || label === 'Avg Profit/Order' || label === 'Avg Discount/Order' || label === 'Pending Amount') {
      return `₹${new Intl.NumberFormat('en-IN').format(Math.round(value))}`
    }
    if (label === 'Collection Rate') {
      return `${Math.round(value)}%`
    }
    return value.toString()
  }

  const rankingCategories = [
    {
      key: 'most_profitable',
      title: 'Most Profitable',
      icon: <Target className="w-5 h-5" />,
      description: 'Brings highest profit to business',
      gradient: 'from-emerald-500 to-emerald-600'
    },
    {
      key: 'profit_efficiency',
      title: 'Profit Efficiency',
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Less orders, more profit per order',
      gradient: 'from-amber-500 to-amber-600'
    },
    {
      key: 'most_sales',
      title: 'Most Sales',
      icon: <Trophy className="w-5 h-5" />,
      description: 'Ranked by total number of orders',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      key: 'highest_revenue',
      title: 'Highest Revenue',
      icon: <DollarSign className="w-5 h-5" />,
      description: 'Ranked by total revenue generated',
      gradient: 'from-green-500 to-green-600'
    },
    {
      key: 'discount_control',
      title: 'Best Discount Control',
      icon: <Percent className="w-5 h-5" />,
      description: 'Gives lowest discount per order',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      key: 'best_collection',
      title: 'Best Collection',
      icon: <CreditCard className="w-5 h-5" />,
      description: 'Minimum pending amount to collect',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      key: 'service_excellence',
      title: 'Service Excellence',
      icon: <RotateCcw className="w-5 h-5" />,
      description: 'Low returns & complaints rate',
      gradient: 'from-rose-500 to-rose-600'
    }
  ]

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Employee Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!rankings) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Employee Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No ranking data available</p>
        </CardContent>
      </Card>
    )
  }

  const currentRankings = rankings[activeTab] || []

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Employee Rankings
        </CardTitle>
        
        {/* Category Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2 mt-4">
          {rankingCategories.map((category) => {
            const isActive = activeTab === category.key
            return (
              <button
                key={category.key}
                onClick={() => setActiveTab(category.key as keyof Rankings)}
                className={`flex-1 min-w-[160px] p-3 rounded-lg border-2 transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${category.gradient} text-white border-transparent`
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 justify-center">
                  {category.icon}
                  <span className="font-medium text-sm">{category.title}</span>
                </div>
                <p className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {category.description}
                </p>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {currentRankings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available for this ranking</p>
        ) : (
          <div className="space-y-3">
            {currentRankings.map((rep) => (
              <div
                key={rep.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  rep.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10">
                    {getRankIcon(rep.rank)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{rep.name}</h4>
                    <p className="text-sm text-gray-600">{rep.email}</p>
                    <p className="text-xs text-gray-500">{rep.additional_info}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Badge variant={rep.rank <= 3 ? "default" : "secondary"}>
                      {formatMetricValue(rep.metric_value, rep.metric_label)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{rep.metric_label}</p>
                  
                  {/* Show pending amount stat card for all rankings */}
                  {rep.total_pending !== undefined && (
                    <div className="mt-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                      <p className="text-xs font-medium text-orange-800">Pending Amount</p>
                      <p className="text-sm font-bold text-orange-900">
                        ₹{new Intl.NumberFormat('en-IN').format(rep.total_pending)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EmployeeRankings
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mt-4">
          {rankingCategories.map((category) => {
            const isActive = activeTab === category.key
            return (
              <button
                key={category.key}
                onClick={() => setActiveTab(category.key as keyof Rankings)}
                className={`p-3 rounded-lg border-2 transition-all shadow-sm hover:shadow-md h-[100px] ${
                  isActive
                    ? `bg-gradient-to-br ${category.gradient} text-white border-transparent shadow-lg`
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex flex-col items-center justify-center text-center gap-1.5 h-full">
                  <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {category.icon}
                  </div>
                  <span className={`font-semibold text-xs leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>
                    {category.title}
                  </span>
                  <p className={`text-[10px] leading-tight line-clamp-2 ${isActive ? 'text-white/90' : 'text-gray-600'}`}>
                    {category.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent>
        {currentRankings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available for this ranking</p>
        ) : (
          <div className="space-y-4">
            {currentRankings.map((rep) => (
              <div
                key={rep.id}
                className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                  rep.rank <= 3 
                    ? 'bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border-amber-300 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-sm">
                    {getRankIcon(rep.rank)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-base">{rep.name}</h4>
                    <p className="text-sm text-gray-600 font-medium">{rep.email}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{rep.additional_info}</p>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <Badge 
                      variant={rep.rank <= 3 ? "default" : "secondary"}
                      className={`text-sm font-bold px-3 py-1 ${
                        rep.rank <= 3 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : ''
                      }`}
                    >
                      {formatMetricValue(rep.metric_value, rep.metric_label)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">{rep.metric_label}</p>
                  
                  {/* Show pending amount stat card for all rankings */}
                  {rep.total_pending !== undefined && (
                    <div className="mt-3 p-3 bg-white rounded-lg border-2 border-orange-300 shadow-sm">
                      <p className="text-xs font-bold text-orange-700 mb-1">Pending Amount</p>
                      <p className="text-base font-bold text-orange-900">
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
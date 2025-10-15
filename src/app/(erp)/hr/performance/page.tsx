'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Star, 
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Eye,
  Edit,
  FileText
} from 'lucide-react'
import { hasPermission } from '@/lib/auth'

interface PerformanceReview {
  id: string
  employeeId: string
  employeeName: string
  position: string
  department: string
  reviewPeriod: string
  reviewer: string
  status: 'pending' | 'in-progress' | 'completed' | 'overdue'
  overallScore: number
  completedDate?: Date
  dueDate: Date
  goals: Goal[]
  ratings: Rating[]
  comments: string
}

interface Goal {
  id: string
  title: string
  description: string
  category: 'performance' | 'development' | 'behavioral'
  target: number
  achieved: number
  status: 'on-track' | 'at-risk' | 'completed' | 'not-started'
  dueDate: Date
}

interface Rating {
  category: string
  score: number
  maxScore: number
  comments: string
}

const PerformancePage = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([])
  const [filteredReviews, setFilteredReviews] = useState<PerformanceReview[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Mock performance reviews data
  useEffect(() => {
    const mockReviews: PerformanceReview[] = [
      {
        id: '1',
        employeeId: 'EMP001',
        employeeName: 'John Smith',
        position: 'Sales Manager',
        department: 'Sales',
        reviewPeriod: 'Q4 2024',
        reviewer: 'Executive Team',
        status: 'completed',
        overallScore: 4.2,
        completedDate: new Date('2024-12-15'),
        dueDate: new Date('2024-12-31'),
        goals: [
          {
            id: 'g1',
            title: 'Increase Sales Revenue',
            description: 'Achieve 15% increase in quarterly sales revenue',
            category: 'performance',
            target: 15,
            achieved: 18,
            status: 'completed',
            dueDate: new Date('2024-12-31')
          },
          {
            id: 'g2',
            title: 'Team Leadership Development',
            description: 'Complete leadership training program',
            category: 'development',
            target: 100,
            achieved: 100,
            status: 'completed',
            dueDate: new Date('2024-11-30')
          }
        ],
        ratings: [
          { category: 'Job Performance', score: 4.5, maxScore: 5, comments: 'Excellent sales results' },
          { category: 'Communication', score: 4.0, maxScore: 5, comments: 'Good team communication' },
          { category: 'Leadership', score: 4.2, maxScore: 5, comments: 'Strong leadership skills' },
          { category: 'Innovation', score: 3.8, maxScore: 5, comments: 'Room for creative improvement' }
        ],
        comments: 'Outstanding performance this quarter. Exceeded all sales targets and demonstrated excellent leadership qualities.'
      },
      {
        id: '2',
        employeeId: 'EMP002',
        employeeName: 'Sarah Johnson',
        position: 'Production Manager',
        department: 'Manufacturing',
        reviewPeriod: 'Q4 2024',
        reviewer: 'Executive Team',
        status: 'in-progress',
        overallScore: 0,
        dueDate: new Date('2024-12-31'),
        goals: [
          {
            id: 'g3',
            title: 'Reduce Production Downtime',
            description: 'Decrease equipment downtime by 20%',
            category: 'performance',
            target: 20,
            achieved: 15,
            status: 'on-track',
            dueDate: new Date('2024-12-31')
          },
          {
            id: 'g4',
            title: 'Safety Training Completion',
            description: 'Complete advanced safety certification',
            category: 'development',
            target: 100,
            achieved: 75,
            status: 'on-track',
            dueDate: new Date('2024-12-31')
          }
        ],
        ratings: [
          { category: 'Job Performance', score: 0, maxScore: 5, comments: 'Pending evaluation' },
          { category: 'Safety Compliance', score: 0, maxScore: 5, comments: 'Pending evaluation' },
          { category: 'Team Management', score: 0, maxScore: 5, comments: 'Pending evaluation' },
          { category: 'Process Improvement', score: 0, maxScore: 5, comments: 'Pending evaluation' }
        ],
        comments: 'Review in progress. Strong performance indicators so far.'
      },
      {
        id: '3',
        employeeId: 'EMP003',
        employeeName: 'Michael Brown',
        position: 'Warehouse Supervisor',
        department: 'Warehouse',
        reviewPeriod: 'Q4 2024',
        reviewer: 'Sarah Johnson',
        status: 'pending',
        overallScore: 0,
        dueDate: new Date('2025-01-15'),
        goals: [
          {
            id: 'g5',
            title: 'Inventory Accuracy Improvement',
            description: 'Achieve 99% inventory accuracy',
            category: 'performance',
            target: 99,
            achieved: 96,
            status: 'on-track',
            dueDate: new Date('2025-01-15')
          }
        ],
        ratings: [
          { category: 'Job Performance', score: 0, maxScore: 5, comments: 'Pending review' },
          { category: 'Organization', score: 0, maxScore: 5, comments: 'Pending review' },
          { category: 'Reliability', score: 0, maxScore: 5, comments: 'Pending review' }
        ],
        comments: 'Scheduled for review next month.'
      },
      {
        id: '4',
        employeeId: 'EMP004',
        employeeName: 'Emily Davis',
        position: 'Sales Representative',
        department: 'Sales',
        reviewPeriod: 'Q3 2024',
        reviewer: 'John Smith',
        status: 'overdue',
        overallScore: 0,
        dueDate: new Date('2024-10-31'),
        goals: [
          {
            id: 'g6',
            title: 'Client Acquisition',
            description: 'Acquire 10 new clients',
            category: 'performance',
            target: 10,
            achieved: 8,
            status: 'at-risk',
            dueDate: new Date('2024-12-31')
          }
        ],
        ratings: [
          { category: 'Sales Performance', score: 0, maxScore: 5, comments: 'Review overdue' },
          { category: 'Customer Service', score: 0, maxScore: 5, comments: 'Review overdue' }
        ],
        comments: 'Review is overdue. Needs immediate attention.'
      }
    ]
    setReviews(mockReviews)
  }, [])

  // Filter reviews
  useEffect(() => {
    let filtered = reviews

    if (searchTerm) {
      filtered = filtered.filter(review => 
        review.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewPeriod.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(review => review.status === filterStatus)
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter(review => review.department === filterDepartment)
    }

    setFilteredReviews(filtered)
  }, [reviews, searchTerm, filterStatus, filterDepartment])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on-track': return 'bg-blue-100 text-blue-800'
      case 'at-risk': return 'bg-red-100 text-red-800'
      case 'not-started': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateProgress = (achieved: number, target: number) => {
    return Math.min((achieved / target) * 100, 100)
  }

  const departments = [...new Set(reviews.map(review => review.department))]
  
  const reviewStats = {
    total: reviews.length,
    completed: reviews.filter(r => r.status === 'completed').length,
    inProgress: reviews.filter(r => r.status === 'in-progress').length,
    overdue: reviews.filter(r => r.status === 'overdue').length,
    avgScore: reviews.filter(r => r.overallScore > 0).reduce((sum, r) => sum + r.overallScore, 0) / 
              reviews.filter(r => r.overallScore > 0).length || 0
  }

  const handleViewReview = (review: PerformanceReview) => {
    setSelectedReview(review)
    setShowDetailsDialog(true)
  }

  if (!hasPermission('performance:manage')) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="mx-auto h-16 w-16 mb-4 opacity-50 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-gray-600">You don&apos;t have permission to manage performance reviews</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Performance Management
            </h1>
            <p className="text-gray-600 mt-2">Manage employee performance reviews and goals</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Performance Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emp001">John Smith</SelectItem>
                      <SelectItem value="emp002">Sarah Johnson</SelectItem>
                      <SelectItem value="emp003">Michael Brown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Review Period</Label>
                  <Input id="period" placeholder="Q1 2025" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer">Reviewer</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reviewer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive Team</SelectItem>
                      <SelectItem value="manager">Direct Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={() => setShowCreateDialog(false)}>Create Review</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{reviewStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{reviewStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{reviewStats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{reviewStats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900">{reviewStats.avgScore.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="text-center py-12">
              <BarChart3 className="mx-auto h-16 w-16 mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600">No reviews match your current filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id} className="bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {review.employeeName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{review.employeeName}</h3>
                      <p className="text-sm text-gray-600">{review.position} • {review.department}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(review.status)}>
                          {review.status.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {review.reviewPeriod} • Due {formatDate(review.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {review.overallScore > 0 && (
                      <div className="text-right bg-gray-50 px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-1 justify-end">
                          <Star className="h-5 w-5 text-yellow-500 fill-current" />
                          <span className="text-2xl font-bold text-gray-900">{review.overallScore.toFixed(1)}</span>
                          <span className="text-gray-500">/5.0</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Overall Score</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewReview(review)} className="justify-start">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="justify-start">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Goals Progress */}
                {review.goals.length > 0 && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700">Goals Progress</h4>
                    {review.goals.slice(0, 2).map((goal) => (
                      <div key={goal.id} className="space-y-2 bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{goal.title}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${getGoalStatusColor(goal.status)} text-xs`}>
                              {goal.status.replace('-', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-sm font-semibold text-gray-900">
                              {goal.achieved}/{goal.target}
                            </span>
                          </div>
                        </div>
                        <Progress 
                          value={calculateProgress(goal.achieved, goal.target)} 
                          className="h-2"
                        />
                      </div>
                    ))}
                    {review.goals.length > 2 && (
                      <p className="text-sm text-gray-500 pl-3">+{review.goals.length - 2} more goals</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedReview && (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedReview.employeeName.split(' ').map(n => n[0]).join('')}
                  </div>
                  {selectedReview.employeeName} - {selectedReview.reviewPeriod}
                  <Badge className={getStatusColor(selectedReview.status)}>
                    {selectedReview.status.toUpperCase()}
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="ratings">Ratings</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Employee</p>
                      <p className="font-medium">{selectedReview.employeeName}</p>
                      <p className="text-sm text-gray-500">{selectedReview.position}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Department</p>
                      <p className="font-medium">{selectedReview.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Review Period</p>
                      <p className="font-medium">{selectedReview.reviewPeriod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reviewer</p>
                      <p className="font-medium">{selectedReview.reviewer}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge className={getStatusColor(selectedReview.status)}>
                        {selectedReview.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Due Date</p>
                      <p className="font-medium">{formatDate(selectedReview.dueDate)}</p>
                    </div>
                    {selectedReview.completedDate && (
                      <div>
                        <p className="text-sm text-gray-600">Completed Date</p>
                        <p className="font-medium">{formatDate(selectedReview.completedDate)}</p>
                      </div>
                    )}
                    {selectedReview.overallScore > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">Overall Score</p>
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500 fill-current" />
                          <span className="text-lg font-semibold">{selectedReview.overallScore.toFixed(1)}</span>
                          <span className="text-gray-500">/5.0</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="goals" className="space-y-4">
                {selectedReview.goals.map((goal) => (
                  <Card key={goal.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{goal.title}</h4>
                          <p className="text-sm text-gray-600">{goal.description}</p>
                        </div>
                        <Badge className={getGoalStatusColor(goal.status)}>
                          {goal.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Progress</span>
                          <span className="text-sm font-medium">
                            {goal.achieved}/{goal.target} ({calculateProgress(goal.achieved, goal.target).toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={calculateProgress(goal.achieved, goal.target)} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Category: {goal.category}</span>
                          <span>Due: {formatDate(goal.dueDate)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="ratings" className="space-y-4">
                {selectedReview.ratings.map((rating, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{rating.category}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{rating.score}</span>
                          <span className="text-gray-500">/{rating.maxScore}</span>
                        </div>
                      </div>
                      <Progress value={(rating.score / rating.maxScore) * 100} className="h-2 mb-2" />
                      {rating.comments && (
                        <p className="text-sm text-gray-600">{rating.comments}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{selectedReview.comments}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PerformancePage

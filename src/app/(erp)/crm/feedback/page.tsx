'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Star, ThumbsUp, ThumbsDown, 
  TrendingUp, TrendingDown, Users, Filter, Calendar
} from 'lucide-react';

interface Feedback {
  id: string;
  customerName: string;
  rating: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  comment: string;
  date: string;
  status: 'new' | 'reviewed' | 'resolved';
  tags: string[];
}

export default function CRMFeedbackPage() {
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'reviewed' | 'resolved'>('all');

  const feedbacks: Feedback[] = [
    {
      id: '1',
      customerName: 'Ava Corlette',
      rating: 5,
      sentiment: 'positive',
      category: 'Product Quality',
      comment: 'Excellent product! The quality exceeded my expectations and the customer service was outstanding.',
      date: '2024-10-28',
      status: 'new',
      tags: ['quality', 'service']
    },
    {
      id: '2',
      customerName: 'Bessie Cooper',
      rating: 4,
      sentiment: 'positive',
      category: 'Customer Service',
      comment: 'Great support team. They helped me resolve my issue quickly and professionally.',
      date: '2024-10-27',
      status: 'reviewed',
      tags: ['support', 'responsive']
    },
    {
      id: '3',
      customerName: 'Jerome Bell',
      rating: 2,
      sentiment: 'negative',
      category: 'Delivery',
      comment: 'Delivery took longer than expected. The product is good but shipping needs improvement.',
      date: '2024-10-26',
      status: 'resolved',
      tags: ['shipping', 'delay']
    },
    {
      id: '4',
      customerName: 'Esther Howard',
      rating: 5,
      sentiment: 'positive',
      category: 'Features',
      comment: 'Love the new features! The interface is intuitive and easy to use.',
      date: '2024-10-25',
      status: 'reviewed',
      tags: ['features', 'ui']
    },
    {
      id: '5',
      customerName: 'Robert Fox',
      rating: 3,
      sentiment: 'neutral',
      category: 'Pricing',
      comment: 'Product is decent but feels a bit overpriced compared to competitors.',
      date: '2024-10-24',
      status: 'new',
      tags: ['pricing', 'value']
    },
    {
      id: '6',
      customerName: 'Kristin Watson',
      rating: 1,
      sentiment: 'negative',
      category: 'Technical Issues',
      comment: 'Experiencing frequent bugs and crashes. Support team is working on it but frustrated.',
      date: '2024-10-23',
      status: 'reviewed',
      tags: ['bugs', 'technical']
    }
  ];

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSentiment = filterSentiment === 'all' || feedback.sentiment === filterSentiment;
    const matchesStatus = filterStatus === 'all' || feedback.status === filterStatus;
    return matchesSentiment && matchesStatus;
  });

  const getSentimentColor = (sentiment: string) => {
    const colors = {
      positive: 'bg-green-100 text-green-700 border-green-200',
      negative: 'bg-red-100 text-red-700 border-red-200',
      neutral: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[sentiment as keyof typeof colors];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      reviewed: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      resolved: 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[status as keyof typeof colors];
  };

  const stats = [
    {
      label: 'Total Feedback',
      value: feedbacks.length,
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'Positive',
      value: feedbacks.filter(f => f.sentiment === 'positive').length,
      change: '+12%',
      trend: 'up',
      icon: ThumbsUp,
      color: 'from-green-500 to-emerald-600'
    },
    {
      label: 'Negative',
      value: feedbacks.filter(f => f.sentiment === 'negative').length,
      change: '-5%',
      trend: 'down',
      icon: ThumbsDown,
      color: 'from-red-500 to-rose-600'
    },
    {
      label: 'Avg Rating',
      value: (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1),
      icon: Star,
      color: 'from-orange-500 to-amber-600'
    }
  ];

  const satisfactionData = [
    { rating: 5, count: 2, percentage: 33, width: 'w-[33%]' },
    { rating: 4, count: 1, percentage: 17, width: 'w-[17%]' },
    { rating: 3, count: 1, percentage: 17, width: 'w-[17%]' },
    { rating: 2, count: 1, percentage: 17, width: 'w-[17%]' },
    { rating: 1, count: 1, percentage: 17, width: 'w-[17%]' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Feedback</h1>
        <p className="text-gray-600">Monitor and respond to customer feedback and reviews</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {stat.change && (
                    <div className={`flex items-center gap-1 text-sm ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendIcon className="h-4 w-4" />
                      <span>{stat.change}</span>
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Satisfaction Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {satisfactionData.map((item) => (
                <div key={item.rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-16">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 ${item.width}`}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-16 text-right">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              View New Feedback
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <ThumbsDown className="mr-2 h-4 w-4" />
              Urgent Issues
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Top Contributors
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Feedback Trends
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">Sentiment:</span>
              {(['all', 'positive', 'neutral', 'negative'] as const).map((sentiment) => (
                <Button
                  key={sentiment}
                  variant={filterSentiment === sentiment ? 'default' : 'outline'}
                  onClick={() => setFilterSentiment(sentiment)}
                  size="sm"
                  className={filterSentiment === sentiment ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}
                >
                  {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                </Button>
              ))}
            </div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">Status:</span>
              {(['all', 'new', 'reviewed', 'resolved'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status)}
                  size="sm"
                  className={filterStatus === status ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.map((feedback) => (
          <Card key={feedback.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                  {feedback.customerName.split(' ').map(n => n[0]).join('')}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{feedback.customerName}</h3>
                      <p className="text-sm text-gray-600">{feedback.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSentimentColor(feedback.sentiment)}>
                        {feedback.sentiment}
                      </Badge>
                      <Badge className={getStatusColor(feedback.status)}>
                        {feedback.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          i < feedback.rating 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-600 ml-2">{feedback.rating}.0</span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{feedback.comment}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {new Date(feedback.date).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2 ml-4">
                        {feedback.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Respond
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFeedbacks.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No feedback found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

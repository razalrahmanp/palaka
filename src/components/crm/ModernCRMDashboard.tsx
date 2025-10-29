'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Star, User,
  Bell, Search
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  submitter: string;
  time: string;
  details: string;
}

interface Customer {
  id: string;
  name: string;
  identifier: string;
  status: 'Star Member' | 'Gold Member';
  color: string;
}

interface RevenueSource {
  name: string;
  percentage: number;
  color: string;
}

export default function ModernCRM() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Sample data
  const tasks: Task[] = [
    {
      id: '1',
      title: 'Edit the landing page',
      submitter: 'Manager',
      time: '12 hrs ago',
      details: 'View details →'
    },
    {
      id: '2',
      title: 'Edit the landing page',
      submitter: 'Manager',
      time: '12 hrs ago',
      details: 'View details →'
    },
    {
      id: '3',
      title: 'Edit the landing page',
      submitter: 'Manager',
      time: '12 hrs ago',
      details: 'View details →'
    }
  ];

  const topCustomers: Customer[] = [
    { id: '1', name: 'Ava Corlette', identifier: '43352', status: 'Star Member', color: 'bg-blue-500' },
    { id: '2', name: 'Bessie Cooper', identifier: '43124', status: 'Star Member', color: 'bg-red-500' },
    { id: '3', name: 'Jerome Bell', identifier: '45678', status: 'Gold Member', color: 'bg-purple-500' },
    { id: '4', name: 'Esther Howard', identifier: '98765', status: 'Gold Member', color: 'bg-red-400' }
  ];

  const revenueSources: RevenueSource[] = [
    { name: 'Facebook', percentage: 45, color: '#3b82f6' },
    { name: 'Instagram', percentage: 25, color: '#8b5cf6' }
  ];

  const salesData = [
    { month: 'Jan', value: 0 },
    { month: 'Feb', value: 280 },
    { month: 'Mar', value: 120 },
    { month: 'Apr', value: 220 },
    { month: 'May', value: 180 },
    { month: 'Jun', value: 280 },
    { month: 'Jul', value: 200 },
    { month: 'Aug', value: 320 },
    { month: 'Sep', value: 280 },
    { month: 'Oct', value: 220 },
    { month: 'Nov', value: 180 },
    { month: 'Dec', value: 0 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🎯</span>
              </div>
              <span className="text-xl font-bold text-gray-900">CRM</span>
            </div>
            
            <div className="relative ml-8">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search"
                className="pl-10 w-80 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></span>
            </Button>
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-medium">Log Out</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Area - Full Width */}
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Today's Tasks & Calendar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Task Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Today&apos;s Task</CardTitle>
                    <div className="text-sm text-gray-500">
                      <span className="text-green-600 font-semibold">4</span> task completed out of <span className="font-semibold">10</span>
                      <div className="w-32 h-1 bg-gray-200 rounded-full mt-1">
                        <div className="h-1 bg-green-500 rounded-full w-2/5"></div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{task.title}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>Submitted by {task.submitter}</span>
                            <span>•</span>
                            <span>{task.time}</span>
                          </div>
                        </div>
                        <Button variant="link" className="text-orange-500">
                          Details →
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Calendar */}
                  <div className="mt-6 bg-white rounded-lg">
                    <Calendar
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => date && setCurrentDate(date)}
                      month={selectedMonth}
                      onMonthChange={setSelectedMonth}
                      className="border-0"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Bottom Row Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Satisfaction Rate */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Satisfaction Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Star className="h-8 w-8 text-white fill-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">63,745 Vote</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <span>Vote by Consumer</span>
                          <span className="text-blue-500">3.5% ↗</span>
                        </div>
                      </div>
                      <div className="ml-auto text-3xl font-bold">78%</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue by Industry */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Revenue by Industry</CardTitle>
                      <Button variant="link" className="text-sm text-blue-500">
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {revenueSources.map((source) => {
                        const widthClass = source.percentage === 45 ? 'w-[45%]' : 'w-1/4';
                        const bgClass = source.name === 'Facebook' ? 'bg-blue-500' : 'bg-purple-500';
                        return (
                          <div key={source.name}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{source.name}</span>
                              <span className="text-sm font-semibold">{source.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${widthClass} ${bgClass}`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Revenue & Customer Report */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Sales Revenue</CardTitle>
                        <p className="text-2xl font-bold mt-1">$112,340</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Yearly ▼
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40 flex items-end justify-between gap-2">
                      {salesData.map((item, index) => {
                        const heightClass = 
                          item.value === 0 ? 'h-0' :
                          item.value >= 300 ? 'h-full' :
                          item.value >= 250 ? 'h-4/5' :
                          item.value >= 200 ? 'h-3/5' :
                          item.value >= 150 ? 'h-2/5' : 'h-1/5';
                        
                        return (
                          <div key={item.month} className="flex flex-col items-center flex-1">
                            <div className={`w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t ${heightClass}`}>
                              {item.value > 0 && (
                                <div className="relative">
                                  {index === 1 && <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded">$12k</div>}
                                  {index === 4 && <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded">$4k</div>}
                                  {index === 8 && <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded">$22k</div>}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Customers Report</CardTitle>
                      <Button variant="outline" size="sm">
                        Yearly ▼
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      {/* Donut Chart Placeholder */}
                      <div className="relative w-40 h-40">
                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="12"
                            strokeDasharray="165 250"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="12"
                            strokeDasharray="85 250"
                            strokeDashoffset="-165"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold">82.3%</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <div>
                            <p className="text-sm font-medium">+ 18%</p>
                            <p className="text-xs text-gray-500">Current customers</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div>
                            <p className="text-sm font-medium">+ 14%</p>
                            <p className="text-xs text-gray-500">New customers</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Visit Online */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Customer Visit Online</CardTitle>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Total in July</span>
                          <span className="text-xl font-bold">34,678</span>
                          <span className="text-sm text-blue-500">3.5% ↗</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-32 relative">
                    {/* Simple line chart visualization */}
                    <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        points="0,70 50,50 100,65 150,40 200,55 250,35 300,60 350,45 400,55"
                      />
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                        opacity="0.5"
                        points="0,80 50,60 100,75 150,50 200,65 250,45 300,70 350,55 400,65"
                      />
                    </svg>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Top Customers */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Top Customers</CardTitle>
                    <Button variant="outline" size="sm" className="text-xs">
                      Weekly ▼
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topCustomers.map((customer) => (
                      <div key={customer.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`w-10 h-10 ${customer.color} rounded-full flex items-center justify-center text-white font-semibold`}>
                          {customer.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.identifier}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {customer.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
    </div>
  );
}

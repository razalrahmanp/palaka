'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FileText, Download, Filter, Calendar as CalendarIcon,
  TrendingUp, TrendingDown, Users, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

export default function CRMReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const reports = [
    {
      title: 'Customer Acquisition Report',
      description: 'New customers added in the selected period',
      value: '156',
      change: '+12.5%',
      trend: 'up',
      icon: Users
    },
    {
      title: 'Revenue Report',
      description: 'Total revenue generated from customers',
      value: '$45,678',
      change: '+8.3%',
      trend: 'up',
      icon: DollarSign
    },
    {
      title: 'Conversion Rate',
      description: 'Lead to customer conversion percentage',
      value: '23.4%',
      change: '-2.1%',
      trend: 'down',
      icon: TrendingUp
    },
    {
      title: 'Customer Retention',
      description: 'Customers retained this quarter',
      value: '89.2%',
      change: '+5.2%',
      trend: 'up',
      icon: Users
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM Reports</h1>
        <p className="text-gray-600">Comprehensive reports and analytics for your customer relationships</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'From Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-gray-500">to</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'To Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>

            <Button className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Export Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {reports.map((report, index) => {
          const Icon = report.icon;
          const TrendIcon = report.trend === 'up' ? TrendingUp : TrendingDown;
          const trendColor = report.trend === 'up' ? 'text-green-600' : 'text-red-600';
          
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {report.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">{report.value}</div>
                <p className="text-xs text-gray-500 mb-2">{report.description}</p>
                <div className={`flex items-center text-sm ${trendColor}`}>
                  <TrendIcon className="h-4 w-4 mr-1" />
                  <span>{report.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Customer Activity Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'New Leads', count: 45, color: 'bg-blue-500', width: 'w-full' },
                { name: 'Contacted', count: 32, color: 'bg-purple-500', width: 'w-[71%]' },
                { name: 'Qualified', count: 28, color: 'bg-green-500', width: 'w-[62%]' },
                { name: 'Converted', count: 12, color: 'bg-orange-500', width: 'w-[27%]' }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-gray-600">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color} ${item.width}`}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Sales Performance Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { period: 'This Week', amount: '$12,450', target: '$15,000', percentage: 83, width: 'w-[83%]' },
                { period: 'This Month', amount: '$45,678', target: '$50,000', percentage: 91, width: 'w-[91%]' },
                { period: 'This Quarter', amount: '$125,340', target: '$150,000', percentage: 84, width: 'w-[84%]' },
                { period: 'This Year', amount: '$456,780', target: '$500,000', percentage: 91, width: 'w-[91%]' }
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">{item.period}</span>
                    <span className="text-sm text-gray-600">{item.amount} / {item.target}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 ${item.width}`}
                    ></div>
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">{item.percentage}% achieved</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

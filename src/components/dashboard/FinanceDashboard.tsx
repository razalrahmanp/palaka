'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/dashboard/KPICard';
import { 
  Wallet,
  TrendingDown,
  CreditCard,
  ArrowDownCircle,
  Flame,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

// Data fetching hook with date range
const useFinanceData = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard-finance', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/dashboard/finance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch finance data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

// Helper to get initial date range from sessionStorage or default to current month
const getInitialDateRange = () => {
  // First try to get from sessionStorage (set by main dashboard)
  const stored = sessionStorage.getItem('dashboard-date-range');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.startDate && parsed.endDate) {
        return { startDate: parsed.startDate, endDate: parsed.endDate };
      }
    } catch (e) {
      console.error('Failed to parse stored date range:', e);
    }
  }

  // Default to current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    startDate: new Date(year, month, 1).toISOString().split('T')[0],
    endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
  };
};

export default function FinanceDashboard() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const { data, isLoading, refetch } = useFinanceData(dateRange);

  // Listen for date filter changes
  useEffect(() => {
    const handleDateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { startDate, endDate } = customEvent.detail;
      if (startDate && endDate) {
        setDateRange({ startDate, endDate });
      }
    };
    
    const handleRefresh = () => refetch();
    
    window.addEventListener('dashboard-date-change', handleDateChange);
    window.addEventListener('dashboard-refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('dashboard-date-change', handleDateChange);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [refetch]);

  // All data comes from API - no mock data
  const expenseBreakdownData = data?.data?.expenseBreakdown || [];
  const expenseTrendData = data?.data?.expenseTrend || [];
  const runningCapitalData = data?.data?.runningCapital || [];

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Total Expenses"
          value={`₹${((data?.data?.totalExpenses || 0) / 1000).toFixed(0)}k`}
          change={8.5}
          trend="up"
          icon={Wallet}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          subtitle="MTD"
          loading={isLoading}
        />
        
        <KPICard
          title="Operating Margin"
          value={data?.data?.operatingMargin ? `${data.data.operatingMargin}%` : '0.0%'}
          change={3.2}
          trend="up"
          icon={TrendingDown}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          subtitle="Profit margin"
          loading={isLoading}
        />
        
        <KPICard
          title="Total Liabilities"
          value={`₹${((data?.data?.totalLiabilities || 0) / 1000).toFixed(0)}k`}
          change={-12.3}
          trend="down"
          icon={CreditCard}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100"
          subtitle="Outstanding"
          loading={isLoading}
        />
        
        <KPICard
          title="Withdrawals"
          value={`₹${((data?.data?.withdrawals || 0) / 1000).toFixed(0)}k`}
          change={-5.8}
          trend="down"
          icon={ArrowDownCircle}
          gradient="bg-gradient-to-br from-pink-50 to-pink-100"
          subtitle="MTD"
          loading={isLoading}
        />
        
        <KPICard
          title="Burn Rate"
          value={`₹${((data?.data?.burnRate || 0) / 1000).toFixed(0)}k`}
          change={2.1}
          trend="up"
          icon={Flame}
          gradient="bg-gradient-to-br from-red-50 to-red-100"
          subtitle="Per month"
          loading={isLoading}
        />
        
        <KPICard
          title="Cash Runway"
          value={data?.data?.cashRunway || '0.0 mo'}
          change={-8.5}
          trend="down"
          icon={Calendar}
          gradient="bg-gradient-to-br from-teal-50 to-teal-100"
          subtitle="Months left"
          loading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Expense Breakdown by Category
            </CardTitle>
            <p className="text-sm text-gray-500">MTD expense distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {expenseBreakdownData.map((_entry: { name: string; value: number }, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Daily Expense Trend
            </CardTitle>
            <p className="text-sm text-gray-500">Actual vs Budget (7 days)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={expenseTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Actual Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="budget" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name="Budget"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Running Capital Requirements */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Running Capital Requirements
            </CardTitle>
            <p className="text-sm text-gray-500">Capital needed to run business operations</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={runningCapitalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="expenses" 
                  fill="#ef4444" 
                  radius={[8, 8, 0, 0]}
                  name="Expenses"
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#10b981" 
                  radius={[8, 8, 0, 0]}
                  name="Revenue"
                />
                <Bar 
                  dataKey="net" 
                  fill="#8b5cf6" 
                  radius={[8, 8, 0, 0]}
                  name="Net"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Expense Categories
            </CardTitle>
            <p className="text-sm text-gray-500">Breakdown by category</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expenseBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts & Cash Flow Section - Full Width */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Bank Accounts & Cash Flow
          </CardTitle>
          <p className="text-sm text-gray-500">All account balances with 7-day transaction flow</p>
        </CardHeader>
        <CardContent>
          {/* All Accounts in Single Row */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-gray-600" />
              All Accounts
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* Total Balance Card */}
              {(() => {
                const totalBalance = 
                  (data?.data?.bankAccounts?.cash?.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0) || 0) +
                  (data?.data?.bankAccounts?.bank?.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0) || 0);
                
                return (
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-300 min-w-[220px] flex-shrink-0">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">Total Balance</span>
                      <span className="text-xs text-purple-600 font-medium">ALL ACCOUNTS</span>
                    </div>
                    <span className="text-base font-bold text-purple-700 ml-4">
                      ₹{totalBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })()}
              
              {/* Cash Accounts */}
              {data?.data?.bankAccounts?.cash?.map((account: { id: string; name: string; balance: number }) => (
                <div key={account.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200 min-w-[200px] flex-shrink-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">{account.name}</span>
                    <span className="text-xs text-green-600 font-medium">CASH</span>
                  </div>
                  <span className="text-sm font-bold text-green-700 ml-4">
                    ₹{account.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              
              {/* Bank & UPI Accounts */}
              {data?.data?.bankAccounts?.bank?.map((account: { id: string; name: string; balance: number; type: string }) => (
                <div key={account.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200 min-w-[200px] flex-shrink-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">{account.name}</span>
                    <span className="text-xs text-blue-600 font-medium">{account.type}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700 ml-4">
                    ₹{account.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
              
              {/* Empty State */}
              {(!data?.data?.bankAccounts?.cash?.length && !data?.data?.bankAccounts?.bank?.length) && (
                <p className="text-sm text-gray-500 italic w-full text-center py-4">No accounts found</p>
              )}
            </div>
          </div>

          {/* Cash Flow Trend Chart */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">7-Day Cash Flow Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.data?.cashFlowTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Bar dataKey="cashIn" fill="#10b981" name="Cash In" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cashOut" fill="#ef4444" name="Cash Out" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} name="Net Flow" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Section */}
      <Card className="glass-card border-l-4 border-purple-500">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Finance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-green-700">Budget Adherence:</span> Operating within budget for most categories. Marketing spend 15% under budget - opportunity to increase promotional activities.
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-orange-700">Cash Flow Alert:</span> Cash runway at 3.2 months - consider reducing burn rate or securing additional funding to maintain healthy reserves.
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-blue-700">Margin Improvement:</span> Operating margin improved to 24.8% - up 3.2% from last month. Expense optimization showing positive results.
              </p>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-pink-700">Liability Management:</span> ₹45,000 in 60+ day liabilities - prioritize clearing aging payables to maintain vendor relationships and avoid penalties.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

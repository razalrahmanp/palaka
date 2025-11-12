'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from './KPICard';
import { Users, DollarSign, Calendar, TrendingUp, UserX, Activity, Award, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// Custom hook to fetch HR data
const useHRData = () => {
  return useQuery({
    queryKey: ['dashboard-hr'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/hr');
      if (!response.ok) {
        throw new Error('Failed to fetch HR data');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export default function HRDashboard() {
  const { data, isLoading, refetch } = useHRData();

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };

    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [refetch]);

  // Sample data for development
  const employeeCount = data?.data?.employeeCount || 127;
  const totalPayroll = data?.data?.totalPayroll || 3850000;
  const attendanceRate = data?.data?.attendanceRate || '94.5';
  const productivityScore = data?.data?.productivityScore || '87.2';
  const employeeTurnover = data?.data?.employeeTurnover || '8.5';

  const departmentHeadcountData = data?.data?.departmentHeadcount || [
    { department: 'Sales', employees: 35, budget: 40 },
    { department: 'Manufacturing', employees: 28, budget: 30 },
    { department: 'Logistics', employees: 18, budget: 20 },
    { department: 'Admin', employees: 15, budget: 15 },
    { department: 'Finance', employees: 12, budget: 12 },
    { department: 'HR', employees: 8, budget: 10 },
    { department: 'IT', employees: 11, budget: 12 },
  ];

  const payrollTrendData = data?.data?.payrollTrend || [
    { month: 'May', payroll: 3650000, overtime: 145000 },
    { month: 'Jun', payroll: 3720000, overtime: 158000 },
    { month: 'Jul', payroll: 3580000, overtime: 132000 },
    { month: 'Aug', payroll: 3890000, overtime: 175000 },
    { month: 'Sep', payroll: 3750000, overtime: 149000 },
    { month: 'Oct', payroll: 3680000, overtime: 138000 },
    { month: 'Nov', payroll: 3850000, overtime: 165000 },
  ];

  const attendanceHeatmapData = data?.data?.attendanceHeatmap || [
    { day: 'Mon', present: 122, absent: 5, leave: 0 },
    { day: 'Tue', present: 120, absent: 4, leave: 3 },
    { day: 'Wed', present: 118, absent: 6, leave: 3 },
    { day: 'Thu', present: 121, absent: 3, leave: 3 },
    { day: 'Fri', present: 119, absent: 5, leave: 3 },
    { day: 'Sat', present: 85, absent: 2, leave: 40 },
    { day: 'Sun', present: 0, absent: 0, leave: 127 },
  ];

  const performanceDistributionData = data?.data?.performanceDistribution || [
    { name: 'Outstanding (90+)', employees: 18, avgSalary: 65000, color: '#22c55e' },
    { name: 'Excellent (80-90)', employees: 42, avgSalary: 52000, color: '#3b82f6' },
    { name: 'Good (70-80)', employees: 45, avgSalary: 42000, color: '#f59e0b' },
    { name: 'Satisfactory (60-70)', employees: 18, avgSalary: 35000, color: '#ef4444' },
    { name: 'Needs Improvement (<60)', employees: 4, avgSalary: 28000, color: '#991b1b' },
  ];

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Employee Count"
          value={employeeCount}
          change={5.2}
          trend="up"
          icon={Users}
          gradient="from-blue-500 to-blue-600"
          subtitle="Active employees"
          loading={isLoading}
        />
        <KPICard
          title="Total Payroll"
          value={`₹${(totalPayroll / 1000000).toFixed(2)}M`}
          change={2.8}
          trend="up"
          icon={DollarSign}
          gradient="from-green-500 to-green-600"
          subtitle="MTD payroll"
          loading={isLoading}
        />
        <KPICard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          change={1.2}
          trend="up"
          icon={Calendar}
          gradient="from-purple-500 to-purple-600"
          subtitle="Weekly average"
          loading={isLoading}
        />
        <KPICard
          title="Productivity Score"
          value={`${productivityScore}%`}
          change={3.5}
          trend="up"
          icon={TrendingUp}
          gradient="from-orange-500 to-orange-600"
          subtitle="Team performance"
          loading={isLoading}
        />
        <KPICard
          title="Employee Turnover"
          value={`${employeeTurnover}%`}
          change={-2.1}
          trend="down"
          icon={UserX}
          gradient="from-red-500 to-red-600"
          subtitle="Annual rate"
          loading={isLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Headcount */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Department Headcount
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentHeadcountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="employees" fill="#3b82f6" name="Current" radius={[4, 4, 0, 0]} />
                <Bar dataKey="budget" fill="#93c5fd" name="Budget" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payroll Trend */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payroll Trend (6 Months)
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={payrollTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="payroll"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Base Payroll"
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="overtime"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Overtime"
                  dot={{ fill: '#f59e0b', r: 3 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Attendance Heatmap */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Weekly Attendance Pattern
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceHeatmapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" radius={[0, 0, 0, 0]} />
                <Bar dataKey="leave" stackId="a" fill="#f59e0b" name="Leave" radius={[0, 0, 0, 0]} />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance Distribution */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600" />
              Performance Distribution
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ employees }: { employees: number }) => `${employees}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="employees"
                >
                  {performanceDistributionData.map((entry: { color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass-card p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          AI-Powered HR Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Productivity Trending Up</p>
                <p className="text-xs text-blue-700 mt-1">
                  Team productivity increased 3.5% this month. Manufacturing and Sales teams leading the improvement.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-900">Headcount Under Budget</p>
                <p className="text-xs text-orange-700 mt-1">
                  Currently at 127 employees vs 149 budgeted. HR and IT departments have open positions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-900">Strong Attendance</p>
                <p className="text-xs text-green-700 mt-1">
                  94.5% attendance rate exceeds industry benchmark of 92%. Weekday attendance consistently above 93%.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Award className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900">Performance Review Due</p>
                <p className="text-xs text-purple-700 mt-1">
                  18 employees with Outstanding ratings (90+). Consider salary reviews and promotion candidates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Dashboard Components
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { LucideIcon } from "lucide-react";

// Enhanced KPI Card with better animations and styling
export function EnhancedKPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = "number",
  trend = "up",
  description,
  isLoading = false 
}: {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  format?: "number" | "currency" | "percentage";
  trend?: "up" | "down" | "neutral";
  description?: string;
  isLoading?: boolean;
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return `₹${val.toLocaleString()}`;
      case "percentage":
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-green-600";
      case "down": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Activity;

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="p-2 rounded-lg bg-blue-50">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-3xl font-bold text-gray-900">
            {formatValue(value)}
          </p>
          
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              <TrendIcon className={`h-4 w-4 ${getTrendColor()}`} />
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-500">vs last period</span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Chart Container
export function ChartContainer({ 
  title, 
  children, 
  actions,
  height = 400,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <Card className={`border-0 shadow-lg ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className={`h-[${height}px] w-full`}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// Revenue Trend Chart
export function RevenueTrendChart({ data, isLoading }: { data: { month: string; revenue: number; growth?: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
        <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} />
        <Tooltip 
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
          labelStyle={{ color: '#374151' }}
          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Inventory Status Pie Chart
export function InventoryStatusChart({ data, isLoading }: { data: { category: string; quantity: number; value: number }[]; isLoading: boolean }) {
  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="quantity"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Quantity']} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Production Efficiency Chart
export function ProductionEfficiencyChart({ data, isLoading }: { data: { week: string; completed: number; inProgress: number; delayed: number }[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="week" stroke="#6B7280" fontSize={12} />
        <YAxis stroke="#6B7280" fontSize={12} />
        <Tooltip 
          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
        />
        <Legend />
        <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" />
        <Bar dataKey="inProgress" stackId="a" fill="#F59E0B" name="In Progress" />
        <Bar dataKey="delayed" stackId="a" fill="#EF4444" name="Delayed" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Enhanced Alert Card
export function AlertCard({ 
  title, 
  alerts, 
  type = "warning",
  isLoading = false 
}: { 
  title: string; 
  alerts: { productName?: string; name?: string; category?: string; description?: string; currentStock?: number; value?: string | number; priority?: string; status?: string }[]; 
  type?: "warning" | "error" | "info";
  isLoading?: boolean;
}) {
  const getAlertIcon = () => {
    switch (type) {
      case "error": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "info": return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getAlertColor = () => {
    switch (type) {
      case "error": return "border-red-200 bg-red-50";
      case "info": return "border-blue-200 bg-blue-50";
      default: return "border-yellow-200 bg-yellow-50";
    }
  };

  if (isLoading) {
    return (
      <Card className={`${getAlertColor()}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            {getAlertIcon()}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${getAlertColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            {getAlertIcon()}
            <span>{title}</span>
          </div>
          <Badge variant="secondary">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {alerts.slice(0, 5).map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
              <div className="flex-1">
                <p className="font-medium text-sm">{alert.productName || alert.name}</p>
                <p className="text-xs text-gray-500">{alert.category || alert.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{alert.currentStock || alert.value}</p>
                <p className="text-xs text-gray-500">{alert.priority || alert.status}</p>
              </div>
            </div>
          ))}
          {alerts.length > 5 && (
            <Button variant="outline" size="sm" className="w-full">
              View All {alerts.length} Items
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

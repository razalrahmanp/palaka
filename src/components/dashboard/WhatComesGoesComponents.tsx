"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Receipt,
  DollarSign,
  CheckCircle,
  Clock,
  Eye,
  UserCheck,
  UserX,
  Banknote,
  Building2,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';

// Types for our data structures
interface DateRangeProps {
  startDate?: string;
  endDate?: string;
  isLoading?: boolean;
}

// Utility function to determine period type for dynamic headings
const getPeriodType = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return 'Daily';
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  
  if (diffDays === 1) return 'Daily';
  if (diffDays <= 7) return 'Weekly';
  if (diffDays <= 31) return 'Monthly';
  return 'Custom Period';
};

interface WalkInData {
  date: string;
  total_walkins: number;
  converted: number;
  not_converted: number;
  conversion_rate: number;
  non_conversion_reasons: {
    reason: string;
    count: number;
  }[];
}

interface MoneyFlowData {
  date: string;
  total_expected: number;
  collected: number;
  pending: number;
  collection_rate: number;
  pending_invoices: {
    customer_name: string;
    amount: number;
    due_date: string;
    days_overdue: number;
  }[];
}

interface CashBankData {
  cash_on_hand: number;
  bank_balances: {
    account_name: string;
    balance: number;
    account_type: string;
  }[];
  upi_balances: {
    account_name: string;
    balance: number;
    account_type: string;
  }[];
  total_liquid_assets: number;
  last_updated: string;
}

interface SpendingData {
  date: string;
  total_spent: number;
  categories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  comparison_yesterday: number;
  comparison_last_week: number;
}

// Daily Walk-ins Component
export function DailyWalkInsComponent({ startDate, endDate, isLoading = false }: DateRangeProps) {
  const [walkInData, setWalkInData] = useState<WalkInData | null>(null);
  const periodType = getPeriodType(startDate, endDate);

  const fetchWalkInData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/dashboard/walkins?${params.toString()}`);
      const data = await response.json();
      setWalkInData(data.data);
    } catch (error) {
      console.error('Error fetching walk-in data:', error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // Fetch walk-in data
    fetchWalkInData();
  }, [fetchWalkInData]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {periodType} Walk-ins & Conversions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {periodType} Walk-ins & Conversions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Total Walk-ins</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {walkInData?.total_walkins || 0}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Converted</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                {walkInData?.converted || 0}
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">Not Converted</span>
              </div>
              <div className="text-2xl font-bold text-red-900">
                {walkInData?.not_converted || 0}
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-purple-600 font-medium">Conversion Rate</span>
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {walkInData?.conversion_rate || 0}%
              </div>
            </div>
          </div>

          {/* Conversion Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Conversion Progress</span>
              <span>{walkInData?.conversion_rate || 0}%</span>
            </div>
            <Progress value={walkInData?.conversion_rate || 0} className="h-2" />
          </div>

          {/* Non-conversion Reasons */}
          <div>
            <h4 className="font-semibold mb-3">
              Why customers didn&apos;t convert {periodType === 'Daily' ? 'today' : 'this period'}:
            </h4>
            <div className="space-y-2">
              {walkInData?.non_conversion_reasons?.map((reason, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm">{reason.reason}</span>
                  <Badge variant="secondary">{reason.count} customers</Badge>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4">
                  No non-conversion data available
                </div>
              )}
            </div>
          </div>

          {/* Info Note about Walk-ins vs Sales */}
          {walkInData && walkInData.total_walkins > 0 && walkInData.converted === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium">Understanding Walk-in Conversions</div>
                  <div className="mt-1">
                    Walk-in conversions only count purchases made by <strong>new customers</strong> who visited today.
                    Sales from existing customers (shown in Sales tab) are tracked separately to maintain accurate lead conversion metrics.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Daily Money Flow Component
export function DailyMoneyFlowComponent({ startDate, endDate, isLoading = false }: DateRangeProps) {
  const [moneyFlowData, setMoneyFlowData] = useState<MoneyFlowData | null>(null);
  const periodType = getPeriodType(startDate, endDate);

  const fetchMoneyFlowData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/dashboard/money-flow?${params.toString()}`);
      const data = await response.json();
      setMoneyFlowData(data.data);
    } catch (error) {
      console.error('Error fetching money flow data:', error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchMoneyFlowData();
  }, [fetchMoneyFlowData]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            {periodType} Money Coming In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5" />
          {periodType} Money Coming In
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Expected Today</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ₹{(moneyFlowData?.total_expected || 0).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Collected</span>
              </div>
              <div className="text-2xl font-bold text-green-900">
                ₹{(moneyFlowData?.collected || 0).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-600 font-medium">Pending</span>
              </div>
              <div className="text-2xl font-bold text-orange-900">
                ₹{(moneyFlowData?.pending || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Collection Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Collection Progress</span>
              <span>{moneyFlowData?.collection_rate || 0}%</span>
            </div>
            <Progress value={moneyFlowData?.collection_rate || 0} className="h-2" />
          </div>

          {/* Pending Invoices */}
          <div>
            <h4 className="font-semibold mb-3">Pending Collections:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {moneyFlowData?.pending_invoices?.map((invoice, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{invoice.customer_name}</div>
                    <div className="text-xs text-gray-500">Due: {invoice.due_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{invoice.amount.toLocaleString()}</div>
                    {invoice.days_overdue > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {invoice.days_overdue} days overdue
                      </Badge>
                    )}
                  </div>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4">
                  No pending collections
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Cash and Bank Balance Component  
export function CashBankBalanceComponent({ startDate, endDate, isLoading = false }: DateRangeProps) {
  const [cashBankData, setCashBankData] = useState<CashBankData | null>(null);

  const fetchCashBankData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/dashboard/cash-bank?${params.toString()}`);
      const data = await response.json();
      setCashBankData(data.data);
    } catch (error) {
      console.error('Error fetching cash bank data:', error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchCashBankData();
  }, [fetchCashBankData]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash & Bank Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Cash & Bank Balances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Total Liquid Assets */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-5 w-5" />
              <span className="text-green-100">Total Available</span>
            </div>
            <div className="text-3xl font-bold">
              ₹{(cashBankData?.total_liquid_assets || 0).toLocaleString()}
            </div>
            <div className="text-green-100 text-sm mt-1">
              Last updated: {cashBankData?.last_updated || 'N/A'}
            </div>
          </div>

          {/* Cash on Hand */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Cash on Hand</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              ₹{(cashBankData?.cash_on_hand || 0).toLocaleString()}
            </div>
          </div>

          {/* Bank Accounts */}
          <div>
            <h4 className="font-semibold mb-3">Bank Accounts:</h4>
            <div className="space-y-2">
              {cashBankData?.bank_balances?.map((account, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-sm">{account.account_name}</div>
                      <div className="text-xs text-gray-500">{account.account_type}</div>
                    </div>
                  </div>
                  <div className="font-semibold">
                    ₹{account.balance.toLocaleString()}
                  </div>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4">
                  No bank accounts configured
                </div>
              )}
            </div>
          </div>

          {/* UPI Accounts */}
          <div>
            <h4 className="font-semibold mb-3">UPI Accounts:</h4>
            <div className="space-y-2">
              {cashBankData?.upi_balances?.map((account, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="font-medium text-sm">{account.account_name}</div>
                      <div className="text-xs text-gray-500">{account.account_type}</div>
                    </div>
                  </div>
                  <div className="font-semibold">
                    ₹{account.balance.toLocaleString()}
                  </div>
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4">
                  No UPI accounts configured
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Daily Spending Component
export function DailySpendingComponent({ startDate, endDate, isLoading = false }: DateRangeProps) {
  const [spendingData, setSpendingData] = useState<SpendingData | null>(null);
  const periodType = getPeriodType(startDate, endDate);

  const fetchSpendingData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/dashboard/spending?${params.toString()}`);
      const data = await response.json();
      setSpendingData(data.data);
    } catch (error) {
      console.error('Error fetching spending data:', error);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSpendingData();
  }, [fetchSpendingData]);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownRight className="h-5 w-5" />
            {periodType} Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownRight className="h-5 w-5" />
          {periodType} Spending
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Total Spending */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-5 w-5" />
              <span className="text-red-100">Total Spent {periodType === 'Daily' ? 'Today' : 'This Period'}</span>
            </div>
            <div className="text-3xl font-bold">
              ₹{(spendingData?.total_spent || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-4 mt-2 text-red-100 text-sm">
              <div className="flex items-center gap-1">
                {spendingData?.comparison_yesterday && spendingData.comparison_yesterday > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {Math.abs(spendingData?.comparison_yesterday || 0)}% vs yesterday
                </span>
              </div>
            </div>
          </div>

          {/* Spending Categories */}
          <div>
            <h4 className="font-semibold mb-3">Spending by Category:</h4>
            <div className="space-y-2">
              {spendingData?.categories?.map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.category}</span>
                    <div className="text-right">
                      <div className="font-semibold">₹{category.amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{category.percentage}%</div>
                    </div>
                  </div>
                  <Progress value={category.percentage} className="h-1" />
                </div>
              )) || (
                <div className="text-gray-500 text-center py-4">
                  No spending data available
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
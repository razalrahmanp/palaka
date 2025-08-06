'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BookOpen,
  BarChart3,
  AlertCircle,
  Check,
  Plus
} from 'lucide-react'
import { format } from 'date-fns'

interface AccountingDashboardProps {
  onQuickAction?: (action: string) => void
}

interface AccountingSummary {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  totalRevenue: number
  totalExpenses: number
  netIncome: number
  cashBalance: number
  accountsReceivable: number
  accountsPayable: number
  isBalanced: boolean
}

interface JournalEntry {
  id: string
  entry_number: string
  entry_date: string
  reference: string
  description: string
  total_amount: number
  status: 'DRAFT' | 'POSTED'
  created_at: string
}

export default function AccountingDashboard({ onQuickAction }: AccountingDashboardProps) {
  const [summary, setSummary] = useState<AccountingSummary | null>(null)
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccountingData()
  }, [])

  const fetchAccountingData = async () => {
    try {
      setLoading(true)
      
      // Fetch multiple accounting reports in parallel
      const [balanceSheetRes, incomeStatementRes, journalEntriesRes] = await Promise.all([
        fetch('/api/accounting/reports/balance-sheet'),
        fetch('/api/accounting/reports/income-statement'),
        fetch('/api/accounting/journal-entries?limit=10')
      ])

      if (!balanceSheetRes.ok || !incomeStatementRes.ok || !journalEntriesRes.ok) {
        throw new Error('Failed to fetch accounting data')
      }

      const [balanceSheet, incomeStatement, journalEntries] = await Promise.all([
        balanceSheetRes.json(),
        incomeStatementRes.json(),
        journalEntriesRes.json()
      ])

      // Create summary from balance sheet and income statement
      const accountingSummary: AccountingSummary = {
        totalAssets: balanceSheet.data.totals.totalAssets || 0,
        totalLiabilities: balanceSheet.data.liabilities.total || 0,
        totalEquity: balanceSheet.data.equity.total || 0,
        totalRevenue: incomeStatement.data.revenue.total || 0,
        totalExpenses: (incomeStatement.data.costOfGoodsSold.total || 0) + 
                      (incomeStatement.data.operatingExpenses.total || 0) + 
                      (incomeStatement.data.otherExpenses.total || 0),
        netIncome: incomeStatement.data.netIncome || 0,
        cashBalance: balanceSheet.data.assets.currentAssets.accounts
          .filter((acc: { account_code?: string; balance?: number }) => acc.account_code?.startsWith('11'))
          .reduce((sum: number, acc: { balance?: number }) => sum + (acc.balance || 0), 0),
        accountsReceivable: balanceSheet.data.assets.currentAssets.accounts
          .filter((acc: { account_code?: string; balance?: number }) => acc.account_code?.startsWith('12'))
          .reduce((sum: number, acc: { balance?: number }) => sum + (acc.balance || 0), 0),
        accountsPayable: balanceSheet.data.liabilities.currentLiabilities.accounts
          .filter((acc: { account_code?: string; balance?: number }) => acc.account_code?.startsWith('201'))
          .reduce((sum: number, acc: { balance?: number }) => sum + (acc.balance || 0), 0),
        isBalanced: balanceSheet.data.totals.isBalanced
      }

      setSummary(accountingSummary)
      setRecentEntries(journalEntries.data.entries || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading accounting dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading accounting data: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Accounting Dashboard</h1>
          <p className="text-gray-600">
            Financial overview as of {format(new Date(), 'MMMM dd, yyyy')}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Balance Status Alert */}
      {summary && (
        <Card className={summary.isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="p-4">
            <div className={`flex items-center space-x-2 ${summary.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {summary.isBalanced ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">
                {summary.isBalanced 
                  ? 'Books are balanced' 
                  : 'Books are out of balance - please review journal entries'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalAssets)}</div>
              <p className="text-xs text-muted-foreground">Current book value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalLiabilities)}</div>
              <p className="text-xs text-muted-foreground">Outstanding obligations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <DollarSign className={`h-4 w-4 ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netIncome)}
              </div>
              <p className="text-xs text-muted-foreground">Current period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.cashBalance)}</div>
              <p className="text-xs text-muted-foreground">Available cash</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounts Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.accountsReceivable)}</div>
              <p className="text-xs text-muted-foreground">Outstanding from customers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts Payable</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.accountsPayable)}</div>
              <p className="text-xs text-muted-foreground">Owed to suppliers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Equity</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalEquity)}</div>
              <p className="text-xs text-muted-foreground">Owner&apos;s equity</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Journal Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Recent Journal Entries</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length > 0 ? (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">JE-{entry.entry_number}</span>
                      <Badge variant={entry.status === 'POSTED' ? 'default' : 'secondary'}>
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(entry.entry_date), 'MMM dd, yyyy')}</span>
                      </span>
                      {entry.reference && (
                        <span>Ref: {entry.reference}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(entry.total_amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No journal entries found</p>
              <p className="text-sm">Create your first journal entry to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => onQuickAction?.('entry-form')}
            >
              <Plus className="h-6 w-6" />
              <span className="text-sm">New Journal Entry</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => onQuickAction?.('reports')}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Trial Balance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => onQuickAction?.('reports')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Balance Sheet</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center space-y-2"
              onClick={() => onQuickAction?.('reports')}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Income Statement</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

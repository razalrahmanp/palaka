'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, BarChart3, Download, Printer, Filter, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface AccountData {
  account_code: string
  account_name: string
  balance: number
}

interface TrialBalanceData {
  accounts: Array<{
    account_code: string
    account_name: string
    account_type: string
    debit_balance: number
    credit_balance: number
  }>
  totals: {
    totalDebits: number
    totalCredits: number
    isBalanced: boolean
  }
}

interface BalanceSheetData {
  assets: {
    currentAssets: { accounts: AccountData[]; total: number }
    fixedAssets: { accounts: AccountData[]; total: number }
    total: number
  }
  liabilities: {
    currentLiabilities: { accounts: AccountData[]; total: number }
    longTermLiabilities: { accounts: AccountData[]; total: number }
    total: number
  }
  equity: {
    accounts: AccountData[]
    total: number
  }
  totals: {
    totalAssets: number
    totalLiabilitiesAndEquity: number
    isBalanced: boolean
  }
}

interface IncomeStatementData {
  revenue: { accounts: AccountData[]; total: number }
  costOfGoodsSold: { accounts: AccountData[]; total: number }
  grossProfit: number
  operatingExpenses: { accounts: AccountData[]; total: number }
  operatingIncome: number
  otherExpenses: { accounts: AccountData[]; total: number }
  netIncome: number
}

interface GeneralLedgerEntry {
  id: string
  transaction_date: string
  debit_amount: number
  credit_amount: number
  running_balance: number
  reference: string
  description: string
  chart_of_accounts: {
    account_code: string
    account_name: string
    account_type: string
    normal_balance: string
  }
  journal_entries: {
    journal_number: string
    reference_number: string
    description: string
  }
}

interface GeneralLedgerData {
  entries: GeneralLedgerEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface AgingBucket {
  current: number
  days30: number
  days60: number
  days90: number
  over90: number
  total: number
}

interface CustomerAging {
  customer_id: string
  customer_name: string
  customer_email?: string
  aging: AgingBucket
  invoices: Array<{
    id: string
    total: number
    paid_amount: number
    balance: number
    days_outstanding: number
    created_at: string
  }>
}

interface ARAgingData {
  customers: CustomerAging[]
  summary: AgingBucket
  asOfDate: string
}

interface APAgingData {
  vendors: Array<{
    vendor_id: string
    vendor_name: string
    vendor_email?: string
    aging: AgingBucket
    bills: Array<{
      id: string
      total: number
      paid_amount: number
      balance: number
      days_outstanding: number
      created_at: string
    }>
  }>
  summary: AgingBucket
  asOfDate: string
}

interface DaysheetTransaction {
  id: string
  transaction_date: string
  debit_amount: number
  credit_amount: number
  reference: string
  description: string
  chart_of_accounts: {
    account_code: string
    account_name: string
    account_type: string
    account_subtype?: string
  }
  journal_entries: {
    journal_number: string
    reference_number: string
    description: string
  }
}

interface DaysheetData {
  date: string
  transactions: DaysheetTransaction[]
  summary: {
    totalDebits: number
    totalCredits: number
    transactionCount: number
    cashReceipts: number
    cashPayments: number
    netCashFlow: number
  }
  accountSummary: Array<{
    account_type: string
    debit_total: number
    credit_total: number
    net_change: number
  }>
}

export default function FinancialReports() {
  const [activeTab, setActiveTab] = useState('trial-balance')
  const [dateFilter, setDateFilter] = useState({
    asOfDate: new Date().toISOString().split('T')[0],
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (activeTab) {
      fetchReportData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      let url = ''
      const params = new URLSearchParams()

      switch (activeTab) {
        case 'trial-balance':
          url = '/api/accounting/reports/trial-balance'
          params.append('asOfDate', dateFilter.asOfDate)
          break
        case 'balance-sheet':
          url = '/api/accounting/reports/balance-sheet'
          params.append('asOfDate', dateFilter.asOfDate)
          break
        case 'income-statement':
          url = '/api/accounting/reports/income-statement'
          params.append('startDate', dateFilter.startDate)
          params.append('endDate', dateFilter.endDate)
          break
        case 'general-ledger':
          url = '/api/accounting/general-ledger'
          params.append('startDate', dateFilter.startDate)
          params.append('endDate', dateFilter.endDate)
          break
        case 'ar-aging':
          url = '/api/accounting/reports/ar-aging'
          params.append('asOfDate', dateFilter.asOfDate)
          break
        case 'ap-aging':
          url = '/api/accounting/reports/ap-aging'
          params.append('asOfDate', dateFilter.asOfDate)
          break
        case 'daysheet':
          url = '/api/accounting/reports/daysheet'
          params.append('date', dateFilter.asOfDate)
          break
        default:
          return
      }

      const response = await fetch(`${url}?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()

      if (result.success) {
        setReportData(result.data)
      } else {
        throw new Error(result.error || `Failed to fetch ${activeTab} data`)
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to load ${activeTab}: ${errorMessage}`)
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    // Handle NaN, null, undefined, and invalid numbers
    const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericAmount)
  }

  const handleDateChange = (field: string, value: string) => {
    setDateFilter(prev => ({ ...prev, [field]: value }))
  }

  const handleRefresh = () => {
    fetchReportData()
  }

  const renderTrialBalance = (data: TrialBalanceData) => {
    if (!data || !data.accounts || !Array.isArray(data.accounts)) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Trial balance data is incomplete or unavailable</p>
        </div>
      )
    }

    return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Trial Balance</h3>
        <div className="flex items-center space-x-2">
          <Badge variant={data.totals?.isBalanced ? 'default' : 'destructive'}>
            {data.totals?.isBalanced ? 'Balanced' : 'Out of Balance'}
          </Badge>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Code</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Debit Balance</TableHead>
            <TableHead className="text-right">Credit Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.accounts.map((account, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{account.account_code}</TableCell>
              <TableCell>{account.account_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{account.account_type}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {account.debit_balance > 0 ? formatCurrency(account.debit_balance) : '-'}
              </TableCell>
              <TableCell className="text-right">
                {account.credit_balance > 0 ? formatCurrency(account.credit_balance) : '-'}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-bold">
            <TableCell colSpan={3}>TOTALS</TableCell>
            <TableCell className="text-right">{formatCurrency(data.totals?.totalDebits || 0)}</TableCell>
            <TableCell className="text-right">{formatCurrency(data.totals?.totalCredits || 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    )
  }

  const renderBalanceSheet = (data: BalanceSheetData) => {
    if (!data || !data.assets || !data.liabilities || !data.equity) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Balance sheet data is incomplete or unavailable</p>
        </div>
      )
    }

    return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Balance Sheet</h3>
        <Badge variant={data.totals?.isBalanced ? 'default' : 'destructive'}>
          {data.totals?.isBalanced ? 'Balanced' : 'Out of Balance'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">ASSETS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Assets</h4>
                {data.assets.currentAssets?.accounts?.map((account: AccountData, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{account.account_name}</span>
                    <span>{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Current Assets</span>
                  <span>{formatCurrency(data.assets.currentAssets?.total || 0)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Fixed Assets</h4>
                {data.assets.fixedAssets?.accounts?.map((account: AccountData, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{account.account_name}</span>
                    <span>{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Fixed Assets</span>
                  <span>{formatCurrency(data.assets.fixedAssets?.total || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                <span>TOTAL ASSETS</span>
                <span>{formatCurrency(data.assets.total || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">LIABILITIES & EQUITY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Liabilities</h4>
                {data.liabilities.currentLiabilities?.accounts?.map((account: AccountData, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{account.account_name}</span>
                    <span>{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Current Liabilities</span>
                  <span>{formatCurrency(data.liabilities.currentLiabilities?.total || 0)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Long-term Liabilities</h4>
                {data.liabilities.longTermLiabilities?.accounts?.map((account: AccountData, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{account.account_name}</span>
                    <span>{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Long-term Liabilities</span>
                  <span>{formatCurrency(data.liabilities.longTermLiabilities?.total || 0)}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Equity</h4>
                {data.equity.accounts?.map((account: AccountData, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{account.account_name}</span>
                    <span>{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total Equity</span>
                  <span>{formatCurrency(data.equity.total || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold border-t-2 pt-2">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>{formatCurrency(data.totals?.totalLiabilitiesAndEquity || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    )
  }

  const renderIncomeStatement = (data: IncomeStatementData) => {
    if (!data || !data.revenue || !data.costOfGoodsSold || !data.operatingExpenses || !data.otherExpenses) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Income statement data is incomplete or unavailable</p>
        </div>
      )
    }

    return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Income Statement</h3>
      
      <Table>
        <TableBody>
          <TableRow className="border-b-2">
            <TableCell className="font-bold text-lg">REVENUE</TableCell>
            <TableCell></TableCell>
          </TableRow>
          {data.revenue.accounts?.map((account: AccountData, index: number) => (
            <TableRow key={index}>
              <TableCell className="pl-4">{account.account_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t">
            <TableCell className="font-medium">Total Revenue</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(data.revenue.total || 0)}</TableCell>
          </TableRow>

          <TableRow className="border-b-2">
            <TableCell className="font-bold text-lg pt-4">COST OF GOODS SOLD</TableCell>
            <TableCell></TableCell>
          </TableRow>
          {data.costOfGoodsSold.accounts?.map((account: AccountData, index: number) => (
            <TableRow key={index}>
              <TableCell className="pl-4">{account.account_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t">
            <TableCell className="font-medium">Total Cost of Goods Sold</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(data.costOfGoodsSold.total || 0)}</TableCell>
          </TableRow>
          <TableRow className="border-t-2">
            <TableCell className="font-bold">GROSS PROFIT</TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(data.grossProfit || 0)}</TableCell>
          </TableRow>

          <TableRow className="border-b-2">
            <TableCell className="font-bold text-lg pt-4">OPERATING EXPENSES</TableCell>
            <TableCell></TableCell>
          </TableRow>
          {data.operatingExpenses.accounts?.map((account: AccountData, index: number) => (
            <TableRow key={index}>
              <TableCell className="pl-4">{account.account_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t">
            <TableCell className="font-medium">Total Operating Expenses</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(data.operatingExpenses.total || 0)}</TableCell>
          </TableRow>
          <TableRow className="border-t-2">
            <TableCell className="font-bold">OPERATING INCOME</TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(data.operatingIncome || 0)}</TableCell>
          </TableRow>

          <TableRow className="border-b-2">
            <TableCell className="font-bold text-lg pt-4">OTHER EXPENSES</TableCell>
            <TableCell></TableCell>
          </TableRow>
          {data.otherExpenses.accounts?.map((account: AccountData, index: number) => (
            <TableRow key={index}>
              <TableCell className="pl-4">{account.account_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t">
            <TableCell className="font-medium">Total Other Expenses</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(data.otherExpenses.total || 0)}</TableCell>
          </TableRow>

          <TableRow className="border-t-2 bg-gray-50">
            <TableCell className="font-bold text-lg">NET INCOME</TableCell>
            <TableCell className={`text-right font-bold text-lg ${(data.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.netIncome || 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    )
  }

  const renderGeneralLedger = (data: GeneralLedgerData) => {
    if (!data || !data.entries) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>General ledger data is unavailable</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">General Ledger</h3>
          <div className="text-sm text-gray-500">
            Showing {data.entries.length} of {data.pagination?.total || 0} entries
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Journal #</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.entries.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{format(new Date(entry.transaction_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{entry.chart_of_accounts.account_code}</div>
                    <div className="text-sm text-gray-500">{entry.chart_of_accounts.account_name}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{entry.journal_entries.journal_number}</TableCell>
                <TableCell className="text-sm">{entry.reference || entry.journal_entries.reference_number || '-'}</TableCell>
                <TableCell className="text-sm">{entry.description || entry.journal_entries.description}</TableCell>
                <TableCell className="text-right">
                  {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(entry.running_balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 text-sm text-gray-600">
            <span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
          </div>
        )}
      </div>
    )
  }

  const renderARAging = (data: ARAgingData) => {
    if (!data || !data.customers) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Accounts receivable aging data is unavailable</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Accounts Receivable Aging</h3>
          <div className="text-sm text-gray-500">
            As of {format(new Date(data.asOfDate), 'MMM dd, yyyy')}
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-500">Current</div>
                <div className="font-semibold text-green-600">{formatCurrency(data.summary.current)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">1-30 Days</div>
                <div className="font-semibold text-yellow-600">{formatCurrency(data.summary.days30)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">31-60 Days</div>
                <div className="font-semibold text-orange-600">{formatCurrency(data.summary.days60)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">61-90 Days</div>
                <div className="font-semibold text-red-600">{formatCurrency(data.summary.days90)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Over 90 Days</div>
                <div className="font-semibold text-red-800">{formatCurrency(data.summary.over90)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Total</div>
                <div className="font-bold text-lg">{formatCurrency(data.summary.total)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">Over 90 Days</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.customers.map((customer, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <div className="font-medium">{customer.customer_name}</div>
                    {customer.customer_email && (
                      <div className="text-sm text-gray-500">{customer.customer_email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(customer.aging.current)}
                </TableCell>
                <TableCell className="text-right text-yellow-600">
                  {formatCurrency(customer.aging.days30)}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  {formatCurrency(customer.aging.days60)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(customer.aging.days90)}
                </TableCell>
                <TableCell className="text-right text-red-800">
                  {formatCurrency(customer.aging.over90)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(customer.aging.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderAPAging = (data: APAgingData) => {
    if (!data || !data.vendors) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Accounts payable aging data is unavailable</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Accounts Payable Aging</h3>
          <div className="text-sm text-gray-500">
            As of {format(new Date(data.asOfDate), 'MMM dd, yyyy')}
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-500">Current</div>
                <div className="font-semibold text-green-600">{formatCurrency(data.summary.current)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">1-30 Days</div>
                <div className="font-semibold text-yellow-600">{formatCurrency(data.summary.days30)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">31-60 Days</div>
                <div className="font-semibold text-orange-600">{formatCurrency(data.summary.days60)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">61-90 Days</div>
                <div className="font-semibold text-red-600">{formatCurrency(data.summary.days90)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Over 90 Days</div>
                <div className="font-semibold text-red-800">{formatCurrency(data.summary.over90)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Total</div>
                <div className="font-bold text-lg">{formatCurrency(data.summary.total)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Details */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1-30 Days</TableHead>
              <TableHead className="text-right">31-60 Days</TableHead>
              <TableHead className="text-right">61-90 Days</TableHead>
              <TableHead className="text-right">Over 90 Days</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.vendors.map((vendor, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div>
                    <div className="font-medium">{vendor.vendor_name}</div>
                    {vendor.vendor_email && (
                      <div className="text-sm text-gray-500">{vendor.vendor_email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(vendor.aging.current)}
                </TableCell>
                <TableCell className="text-right text-yellow-600">
                  {formatCurrency(vendor.aging.days30)}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  {formatCurrency(vendor.aging.days60)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(vendor.aging.days90)}
                </TableCell>
                <TableCell className="text-right text-red-800">
                  {formatCurrency(vendor.aging.over90)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(vendor.aging.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderDaysheet = (data: DaysheetData) => {
    if (!data || !data.transactions) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Daily cash report data is unavailable</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Daily Cash Report</h3>
          <div className="text-sm text-gray-500">
            {format(new Date(data.date), 'EEEE, MMMM dd, yyyy')}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cash Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data.summary.cashReceipts)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cash Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(data.summary.cashPayments)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Net Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.summary.netCashFlow)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Summary by Account Type */}
        <Card>
          <CardHeader>
            <CardTitle>Summary by Account Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="text-right">Total Debits</TableHead>
                  <TableHead className="text-right">Total Credits</TableHead>
                  <TableHead className="text-right">Net Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accountSummary?.map((summary, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{summary.account_type}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.debit_total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.credit_total)}</TableCell>
                    <TableCell className={`text-right font-medium ${summary.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(summary.net_change))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detailed Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details ({data.transactions.length} transactions)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Journal #</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.chart_of_accounts.account_code}</div>
                        <div className="text-sm text-gray-500">{transaction.chart_of_accounts.account_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{transaction.journal_entries.journal_number}</TableCell>
                    <TableCell className="text-sm">{transaction.reference || transaction.journal_entries.reference_number || '-'}</TableCell>
                    <TableCell className="text-sm">{transaction.description || transaction.journal_entries.description}</TableCell>
                    <TableCell className="text-right">
                      {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span>Total Debits:</span>
                <span className="font-semibold">{formatCurrency(data.summary.totalDebits)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Credits:</span>
                <span className="font-semibold">{formatCurrency(data.summary.totalCredits)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Transaction Count:</span>
                <span className="font-semibold">{data.summary.transactionCount}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className={data.summary.totalDebits === data.summary.totalCredits ? 'text-green-600' : 'text-red-600'}>
                  {data.summary.totalDebits === data.summary.totalCredits ? 'Balanced' : 'Out of Balance'}
                </span>
                <span className="font-semibold">
                  {formatCurrency(Math.abs(data.summary.totalDebits - data.summary.totalCredits))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getReportTitle = () => {
    const titles = {
      'trial-balance': 'Trial Balance',
      'balance-sheet': 'Balance Sheet',
      'income-statement': 'Income Statement',
      'general-ledger': 'General Ledger',
      'ar-aging': 'Accounts Receivable Aging',
      'ap-aging': 'Accounts Payable Aging',
      'daysheet': 'Daily Cash Report'
    }
    return titles[activeTab as keyof typeof titles] || 'Financial Report'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-gray-600">
            Generate and view comprehensive financial reports
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="trial-balance" className="text-xs lg:text-sm">Trial Balance</TabsTrigger>
          <TabsTrigger value="balance-sheet" className="text-xs lg:text-sm">Balance Sheet</TabsTrigger>
          <TabsTrigger value="income-statement" className="text-xs lg:text-sm">P&L Statement</TabsTrigger>
          <TabsTrigger value="general-ledger" className="text-xs lg:text-sm hidden lg:block">General Ledger</TabsTrigger>
          <TabsTrigger value="ar-aging" className="text-xs lg:text-sm hidden lg:block">AR Aging</TabsTrigger>
          <TabsTrigger value="ap-aging" className="text-xs lg:text-sm hidden lg:block">AP Aging</TabsTrigger>
          <TabsTrigger value="daysheet" className="text-xs lg:text-sm hidden lg:block">Daysheet</TabsTrigger>
        </TabsList>

        {/* Additional Reports Dropdown for Mobile */}
        <div className="lg:hidden">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col space-y-2">
                <Button 
                  variant={activeTab === 'general-ledger' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('general-ledger')}
                  className="justify-start"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  General Ledger
                </Button>
                <Button 
                  variant={activeTab === 'ar-aging' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('ar-aging')}
                  className="justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Accounts Receivable Aging
                </Button>
                <Button 
                  variant={activeTab === 'ap-aging' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('ap-aging')}
                  className="justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Accounts Payable Aging
                </Button>
                <Button 
                  variant={activeTab === 'daysheet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('daysheet')}
                  className="justify-start"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Daily Cash Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Date Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {(activeTab === 'trial-balance' || activeTab === 'balance-sheet' || activeTab === 'ar-aging' || activeTab === 'ap-aging' || activeTab === 'daysheet') && (
                <div>
                  <Label htmlFor="asOfDate">As Of Date</Label>
                  <Input
                    id="asOfDate"
                    type="date"
                    value={dateFilter.asOfDate}
                    onChange={(e) => handleDateChange('asOfDate', e.target.value)}
                  />
                </div>
              )}
              
              {(activeTab === 'income-statement' || activeTab === 'general-ledger') && (
                <>
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => handleDateChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => handleDateChange('endDate', e.target.value)}
                    />
                  </div>
                </>
              )}
              
              <Button onClick={handleRefresh} disabled={loading}>
                <Filter className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{getReportTitle()}</span>
              </CardTitle>
              <div className="text-sm text-gray-500">
                Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-lg">Generating report...</div>
              </div>
            ) : !reportData ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No report data available</p>
                <p className="text-sm">Click &quot;Generate Report&quot; to load data</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeTab === 'trial-balance' && renderTrialBalance(reportData as unknown as TrialBalanceData)}
                {activeTab === 'balance-sheet' && renderBalanceSheet(reportData as unknown as BalanceSheetData)}
                {activeTab === 'income-statement' && renderIncomeStatement(reportData as unknown as IncomeStatementData)}
                {activeTab === 'general-ledger' && renderGeneralLedger(reportData as unknown as GeneralLedgerData)}
                {activeTab === 'ar-aging' && renderARAging(reportData as unknown as ARAgingData)}
                {activeTab === 'ap-aging' && renderAPAging(reportData as unknown as APAgingData)}
                {activeTab === 'daysheet' && renderDaysheet(reportData as unknown as DaysheetData)}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  )
}

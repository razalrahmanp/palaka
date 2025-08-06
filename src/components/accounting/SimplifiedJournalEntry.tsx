'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronsUpDown, Save, RefreshCw, Calculator, TrendingUp, TrendingDown, Building, CreditCard, DollarSign, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: string
  account_subtype: string
  normal_balance: 'DEBIT' | 'CREDIT'
  is_active?: boolean
}

interface Employee {
  id: string
  name: string
  employee_id: string
  salary?: number
  department?: string
  role?: string
  total_sales?: number
  monthly_sales?: number
  sales_target?: number
}

interface EmployeeSalesData {
  total_sales: number
  monthly_sales: number
  sales_target: number
  achievement_percentage: number
}

interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
}

interface TransactionFormData {
  entry_date: string
  reference_number: string
  description: string
  amount: number
  debit_account_id: string
  credit_account_id: string
  employee_id?: string
  supplier_id?: string
  incentive_amount?: number
}

// Predefined transaction templates for common business transactions
const TRANSACTION_TEMPLATES = [
  {
    id: 'salary_payment',
    name: 'Salary Payment',
    description: 'Record employee salary payment',
    icon: DollarSign,
    debit_type: 'EXPENSE',
    credit_type: 'ASSET',
    suggested_debit: 'Salaries & Wages Expense',
    suggested_credit: 'Cash/Bank Account'
  },
  {
    id: 'supplier_payment',
    name: 'Supplier Payment',
    description: 'Pay outstanding supplier bills',
    icon: CreditCard,
    debit_type: 'LIABILITY',
    credit_type: 'ASSET',
    suggested_debit: 'Accounts Payable',
    suggested_credit: 'Cash/Bank Account'
  },
  {
    id: 'expense_payment',
    name: 'Business Expense',
    description: 'Record business expense payment',
    icon: TrendingDown,
    debit_type: 'EXPENSE',
    credit_type: 'ASSET',
    suggested_debit: 'Operating Expenses',
    suggested_credit: 'Cash/Bank Account'
  },
  {
    id: 'sales_revenue',
    name: 'Sales Revenue',
    description: 'Record sales income',
    icon: TrendingUp,
    debit_type: 'ASSET',
    credit_type: 'REVENUE',
    suggested_debit: 'Cash/Bank Account',
    suggested_credit: 'Sales Revenue'
  },
  {
    id: 'asset_purchase',
    name: 'Asset Purchase',
    description: 'Buy business assets',
    icon: Building,
    debit_type: 'ASSET',
    credit_type: 'ASSET',
    suggested_debit: 'Fixed Assets',
    suggested_credit: 'Cash/Bank Account'
  }
]

export default function SimplifiedJournalEntry({ onSave }: { onSave: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedEmployeeSales, setSelectedEmployeeSales] = useState<EmployeeSalesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [openDebitCombo, setOpenDebitCombo] = useState(false)
  const [openCreditCombo, setOpenCreditCombo] = useState(false)
  const [openEmployeeCombo, setOpenEmployeeCombo] = useState(false)
  const [openSupplierCombo, setOpenSupplierCombo] = useState(false)
  const [journalSearchQuery, setJournalSearchQuery] = useState('')
  
  const [formData, setFormData] = useState<TransactionFormData>({
    entry_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    description: '',
    amount: 0,
    debit_account_id: '',
    credit_account_id: '',
    employee_id: '',
    supplier_id: '',
    incentive_amount: 0
  })

  useEffect(() => {
    fetchAccounts()
    fetchEmployees()
    fetchSuppliers()
    generateReferenceNumber()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/chart-of-accounts')
      const result = await response.json()
      if (result.success) {
        setAccounts(result.data.filter((acc: Account) => acc.is_active !== false))
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to load chart of accounts')
    }
  }

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true)
      const response = await fetch('/api/hr/employees')
      const result = await response.json()
      console.log('Employee fetch result:', result) // Debug log
      
      let employeeData: Employee[] = []
      
      if (result && Array.isArray(result)) {
        employeeData = result
      } else if (result.success && Array.isArray(result.data)) {
        employeeData = result.data
      } else {
        console.warn('Unexpected employee data format:', result)
        // Add some test data if API fails
        employeeData = [
          {
            id: 'emp-001',
            name: 'John Doe',
            employee_id: 'EMP001',
            salary: 50000,
            department: 'Sales',
            role: 'Sales Representative'
          },
          {
            id: 'emp-002', 
            name: 'Jane Smith',
            employee_id: 'EMP002',
            salary: 45000,
            department: 'HR',
            role: 'HR Manager'
          },
          {
            id: 'emp-003',
            name: 'Mike Johnson', 
            employee_id: 'EMP003',
            salary: 60000,
            department: 'Sales',
            role: 'Sales Manager'
          }
        ]
        toast.info('Using test employee data - please check your employee API')
      }
      
      setEmployees(employeeData)
      console.log('Employees set:', employeeData) // Debug log
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      toast.error('Failed to load employees')
      // Set test data on error
      setEmployees([
        {
          id: 'emp-001',
          name: 'John Doe',
          employee_id: 'EMP001',
          salary: 50000,
          department: 'Sales',
          role: 'Sales Representative'
        },
        {
          id: 'emp-002', 
          name: 'Jane Smith',
          employee_id: 'EMP002',
          salary: 45000,
          department: 'HR',
          role: 'HR Manager'
        }
      ])
    } finally {
      setEmployeesLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      const result = await response.json()
      if (result && Array.isArray(result)) {
        setSuppliers(result)
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  const fetchEmployeeSales = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/sales/representative/${employeeId}/stats`)
      const result = await response.json()
      if (result.success) {
        setSelectedEmployeeSales(result.data)
      } else {
        setSelectedEmployeeSales(null)
      }
    } catch (error) {
      console.error('Failed to fetch employee sales:', error)
      setSelectedEmployeeSales(null)
    }
  }

  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    setFormData(prev => ({
      ...prev,
      reference_number: `JE-${timestamp}`
    }))
  }

  // Group accounts by type for better organization
  const accountsByType = useMemo(() => {
    const grouped = accounts.reduce((acc, account) => {
      const type = account.account_type
      if (!acc[type]) acc[type] = []
      acc[type].push(account)
      return acc
    }, {} as Record<string, Account[]>)
    
    return grouped
  }, [accounts])

  // Get account type icon
  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'ASSET': return Building
      case 'LIABILITY': return CreditCard
      case 'EQUITY': return DollarSign
      case 'REVENUE': return TrendingUp
      case 'EXPENSE': return TrendingDown
      default: return Calculator
    }
  }

  // Get account type color
  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-green-100 text-green-800'
      case 'LIABILITY': return 'bg-red-100 text-red-800'
      case 'EQUITY': return 'bg-blue-100 text-blue-800'
      case 'REVENUE': return 'bg-purple-100 text-purple-800'
      case 'EXPENSE': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = TRANSACTION_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    setFormData(prev => ({
      ...prev,
      description: template.description,
      employee_id: '',
      supplier_id: '',
      incentive_amount: 0
    }))

    // Find accounts more accurately with multiple search strategies
    const findAccount = (type: string, searchTerms: string[]) => {
      return accounts.find(acc => {
        if (acc.account_type !== type) return false
        
        const accountName = acc.account_name.toLowerCase()
        const accountCode = acc.account_code.toLowerCase()
        
        return searchTerms.some(term => 
          accountName.includes(term.toLowerCase()) || 
          accountCode.includes(term.toLowerCase())
        )
      })
    }

    let debitAccount: Account | undefined
    let creditAccount: Account | undefined

    // Enhanced account selection logic
    switch (templateId) {
      case 'salary_payment':
        debitAccount = findAccount('EXPENSE', ['salary', 'wage', 'payroll', 'compensation'])
        creditAccount = findAccount('ASSET', ['cash', 'bank', 'checking', 'current'])
        break
      
      case 'supplier_payment':
        debitAccount = findAccount('LIABILITY', ['payable', 'supplier', 'vendor', 'creditor'])
        creditAccount = findAccount('ASSET', ['cash', 'bank', 'checking', 'current'])
        break
      
      case 'expense_payment':
        debitAccount = findAccount('EXPENSE', ['operating', 'general', 'administrative', 'expense'])
        creditAccount = findAccount('ASSET', ['cash', 'bank', 'checking', 'current'])
        break
      
      case 'sales_revenue':
        debitAccount = findAccount('ASSET', ['cash', 'bank', 'checking', 'receivable'])
        creditAccount = findAccount('REVENUE', ['sales', 'revenue', 'income'])
        break
      
      case 'asset_purchase':
        debitAccount = findAccount('ASSET', ['fixed', 'equipment', 'furniture', 'building'])
        creditAccount = findAccount('ASSET', ['cash', 'bank', 'checking', 'current'])
        break
      
      default:
        // Fallback to original logic
        debitAccount = accounts.find(acc => 
          acc.account_type === template.debit_type && 
          acc.account_name.toLowerCase().includes(template.suggested_debit.toLowerCase().split(' ')[0])
        )
        creditAccount = accounts.find(acc => 
          acc.account_type === template.credit_type && 
          acc.account_name.toLowerCase().includes(template.suggested_credit.toLowerCase().split(' ')[0])
        )
    }

    // Set the accounts if found
    if (debitAccount) {
      setFormData(prev => ({ ...prev, debit_account_id: debitAccount!.id }))
    }
    
    if (creditAccount) {
      setFormData(prev => ({ ...prev, credit_account_id: creditAccount!.id }))
    }

    // Show a toast if accounts couldn't be found
    if (!debitAccount || !creditAccount) {
      toast.info('Please select the appropriate accounts manually')
    }
  }

  const handleSubmit = async () => {
    if (!formData.debit_account_id || !formData.credit_account_id || !formData.amount || !formData.description) {
      toast.error('Please fill all required fields')
      return
    }

    if (formData.debit_account_id === formData.credit_account_id) {
      toast.error('Debit and Credit accounts must be different')
      return
    }

    try {
      setLoading(true)

      // Create journal entry with automated double-entry
      const journalEntry = {
        entry_date: formData.entry_date,
        reference_number: formData.reference_number,
        description: formData.description,
        status: 'POSTED',
        lines: [
          {
            account_id: formData.debit_account_id,
            description: formData.description,
            debit_amount: formData.amount,
            credit_amount: 0
          },
          {
            account_id: formData.credit_account_id,
            description: formData.description,
            debit_amount: 0,
            credit_amount: formData.amount
          }
        ]
      }

      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalEntry)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Transaction recorded successfully!')
        // Reset form
        setFormData({
          entry_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          description: '',
          amount: 0,
          debit_account_id: '',
          credit_account_id: '',
          employee_id: '',
          supplier_id: '',
          incentive_amount: 0
        })
        setSelectedTemplate('')
        setSelectedEmployeeSales(null)
        generateReferenceNumber()
        onSave()
      } else {
        throw new Error(result.error || 'Failed to save transaction')
      }
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  const selectedDebitAccount = accounts.find(acc => acc.id === formData.debit_account_id)
  const selectedCreditAccount = accounts.find(acc => acc.id === formData.credit_account_id)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Quick Search for Journal Entries */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-full">
              <Calculator className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-purple-800 mb-1">Quick Journal Entry Search</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search previous transactions, accounts, employees, or suppliers..."
                  value={journalSearchQuery}
                  onChange={(e) => setJournalSearchQuery(e.target.value)}
                  className="pl-10 pr-10 bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
                {journalSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setJournalSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {journalSearchQuery && (
                <div className="mt-2 text-sm text-purple-600 bg-purple-100 px-3 py-2 rounded-md border border-purple-300">
                  <Search className="inline h-4 w-4 mr-1" />
                  Found {journalSearchQuery.length > 2 ? '3' : '0'} matching entries. Click templates below for quick entry.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Quick Transaction Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TRANSACTION_TEMPLATES.map(template => {
              const Icon = template.icon
              return (
                <div
                  key={template.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                    selectedTemplate === template.id 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="text-center">
                    <div className="bg-blue-100 p-2 rounded-full w-fit mx-auto mb-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="font-medium text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-gray-600">{template.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-green-600" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Date</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="JE-123456"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Transaction Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter transaction description..."
              rows={2}
            />
          </div>

          {/* Employee/Supplier Selection */}
          {(selectedTemplate === 'salary_payment' || selectedTemplate === 'supplier_payment') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Selection for Salary */}
              {selectedTemplate === 'salary_payment' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Employee</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchEmployees}
                      disabled={employeesLoading}
                      className="h-6 text-xs"
                    >
                      {employeesLoading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  <div className="text-xs text-blue-600 mb-2 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    💡 Selecting an employee will auto-fill the salary amount. Sales performance will be shown for sales roles.
                    {employees.length > 0 && <span className="ml-2 text-green-600">({employees.length} employees loaded)</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('Current employees:', employees)
                        console.log('Current formData:', formData)
                        toast.info(`${employees.length} employees available`)
                      }}
                      className="ml-2 h-5 text-xs"
                    >
                      Debug
                    </Button>
                  </div>
                  <Popover open={openEmployeeCombo} onOpenChange={setOpenEmployeeCombo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openEmployeeCombo}
                        className="w-full justify-between h-auto p-3"
                      >
                        {formData.employee_id ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800">EMP</Badge>
                            <div className="flex-1 text-left">
                              <span className="font-medium">{employees.find(emp => emp.id === formData.employee_id)?.name}</span>
                              {employees.find(emp => emp.id === formData.employee_id)?.role && (
                                <div className="text-xs text-gray-500">
                                  {employees.find(emp => emp.id === formData.employee_id)?.role} • ₹{employees.find(emp => emp.id === formData.employee_id)?.salary?.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          "Select employee..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 max-h-60 overflow-hidden" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Search employees by name or ID..." />
                        <CommandEmpty>
                          {employeesLoading 
                            ? 'Loading employees...' 
                            : employees.length === 0 
                              ? 'No employees found. Please add employees first.' 
                              : 'No employee found.'
                          }
                        </CommandEmpty>
                        <div className="max-h-48 overflow-y-auto">
                          <CommandGroup>
                            {employees.map((employee) => {
                              const handleEmployeeSelect = () => {
                                console.log('Employee selected:', employee) // Debug log
                                
                                setFormData(prev => ({ 
                                  ...prev, 
                                  employee_id: employee.id,
                                  description: `Salary payment for ${employee.name}`,
                                  amount: employee.salary || 0
                                }))
                                
                                // Fetch sales data if employee is in sales role
                                if (employee.role && ['sales representative', 'sales manager', 'sales executive'].includes(employee.role.toLowerCase())) {
                                  fetchEmployeeSales(employee.id)
                                } else {
                                  setSelectedEmployeeSales(null)
                                }
                                
                                setOpenEmployeeCombo(false)
                              }

                              return (
                                <CommandItem
                                  key={employee.id}
                                  value={`${employee.name} ${employee.employee_id} ${employee.department || ''}`}
                                  onSelect={handleEmployeeSelect}
                                  onClick={handleEmployeeSelect}
                                  className="cursor-pointer hover:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2 w-full">
                                    <Badge className="bg-blue-100 text-blue-800" variant="secondary">
                                      {employee.employee_id}
                                    </Badge>
                                    <div className="flex-1">
                                      <div className="font-medium">{employee.name}</div>
                                      <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{employee.department}</span>
                                        {employee.role && (
                                          <>
                                            <span>•</span>
                                            <span className="font-medium">{employee.role}</span>
                                          </>
                                        )}
                                        {employee.salary && (
                                          <>
                                            <span>•</span>
                                            <span className="text-green-600 font-medium">₹{employee.salary.toLocaleString()}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        formData.employee_id === employee.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Sales Performance Display for Sales Representatives */}
              {selectedTemplate === 'salary_payment' && formData.employee_id && selectedEmployeeSales && (
                <div className="space-y-2">
                  <Label>Sales Performance</Label>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-100 text-green-800">SALES REP</Badge>
                          <span className="text-sm font-medium text-green-800">Performance Overview</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <div className="text-gray-600">Total Sales</div>
                            <div className="font-semibold text-green-700">₹{selectedEmployeeSales.total_sales?.toLocaleString() || 0}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-600">Monthly Sales</div>
                            <div className="font-semibold text-green-700">₹{selectedEmployeeSales.monthly_sales?.toLocaleString() || 0}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-600">Sales Target</div>
                            <div className="font-semibold text-blue-700">₹{selectedEmployeeSales.sales_target?.toLocaleString() || 0}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-gray-600">Achievement</div>
                            <div className={cn(
                              "font-semibold",
                              (selectedEmployeeSales.achievement_percentage || 0) >= 100 ? "text-green-700" : "text-orange-600"
                            )}>
                              {selectedEmployeeSales.achievement_percentage?.toFixed(1) || 0}%
                            </div>
                          </div>
                        </div>
                        {(selectedEmployeeSales.achievement_percentage || 0) >= 100 && (
                          <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md border border-green-200 mt-2">
                            🎉 Target achieved! Consider performance bonus.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Supplier Selection for Supplier Payment */}
              {selectedTemplate === 'supplier_payment' && (
                <div className="space-y-2">
                  <Label>Select Supplier</Label>
                  <Popover open={openSupplierCombo} onOpenChange={setOpenSupplierCombo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSupplierCombo}
                        className="w-full justify-between h-auto p-3"
                      >
                        {formData.supplier_id ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800">SUP</Badge>
                            <span>{suppliers.find(sup => sup.id === formData.supplier_id)?.name}</span>
                          </div>
                        ) : (
                          "Select supplier..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 max-h-60 overflow-hidden" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Search suppliers..." />
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <div className="max-h-48 overflow-y-auto">
                          <CommandGroup>
                            {suppliers.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={supplier.name}
                                onSelect={() => {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    supplier_id: supplier.id,
                                    description: `Payment to ${supplier.name}`
                                  }))
                                  setOpenSupplierCombo(false)
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                                    SUP
                                  </Badge>
                                  <div className="flex-1">
                                    <div className="font-medium">{supplier.name}</div>
                                    <div className="text-xs text-gray-500">{supplier.email}</div>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      formData.supplier_id === supplier.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Incentive Amount for Salary */}
              {selectedTemplate === 'salary_payment' && formData.employee_id && (
                <div className="space-y-2">
                  <Label htmlFor="incentive_amount">Incentive Amount (₹)</Label>
                  <Input
                    id="incentive_amount"
                    type="number"
                    value={formData.incentive_amount || ''}
                    onChange={(e) => {
                      const incentiveAmount = parseFloat(e.target.value) || 0
                      const selectedEmployee = employees.find(emp => emp.id === formData.employee_id)
                      const baseSalary = selectedEmployee?.salary || 0
                      setFormData(prev => ({ 
                        ...prev, 
                        incentive_amount: incentiveAmount,
                        amount: baseSalary + incentiveAmount
                      }))
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  {selectedEmployeeSales && (selectedEmployeeSales.achievement_percentage || 0) >= 100 && (
                    <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                      🎯 Suggested incentive: {Math.round((selectedEmployeeSales.monthly_sales || 0) * 0.02).toLocaleString()} (2% of monthly sales)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Account Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Debit Account */}
            <div className="space-y-2">
              <Label>Debit Account (Money Goes To)</Label>
              <Popover open={openDebitCombo} onOpenChange={setOpenDebitCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openDebitCombo}
                    className="w-full justify-between h-auto p-3"
                  >
                    {selectedDebitAccount ? (
                      <div className="flex items-center gap-2">
                        <Badge className={getAccountTypeColor(selectedDebitAccount.account_type)}>
                          {selectedDebitAccount.account_type}
                        </Badge>
                        <span>{selectedDebitAccount.account_code} - {selectedDebitAccount.account_name}</span>
                      </div>
                    ) : (
                      "Select debit account..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-[400px] overflow-hidden" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder="Search accounts..." />
                    <CommandEmpty>No account found.</CommandEmpty>
                    <div className="max-h-80 overflow-y-auto">
                      {Object.entries(accountsByType).map(([type, typeAccounts]) => (
                        <CommandGroup key={type} heading={type}>
                          {typeAccounts.map((account) => {
                            const Icon = getAccountTypeIcon(account.account_type)
                            return (
                              <CommandItem
                                key={account.id}
                                value={`${account.account_code} ${account.account_name}`}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, debit_account_id: account.id }))
                                  setOpenDebitCombo(false)
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Icon className="h-4 w-4" />
                                  <Badge className={getAccountTypeColor(account.account_type)} variant="secondary">
                                    {account.account_code}
                                  </Badge>
                                  <span className="flex-1">{account.account_name}</span>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      formData.debit_account_id === account.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      ))}
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Credit Account */}
            <div className="space-y-2">
              <Label>Credit Account (Money Comes From)</Label>
              <Popover open={openCreditCombo} onOpenChange={setOpenCreditCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCreditCombo}
                    className="w-full justify-between h-auto p-3"
                  >
                    {selectedCreditAccount ? (
                      <div className="flex items-center gap-2">
                        <Badge className={getAccountTypeColor(selectedCreditAccount.account_type)}>
                          {selectedCreditAccount.account_type}
                        </Badge>
                        <span>{selectedCreditAccount.account_code} - {selectedCreditAccount.account_name}</span>
                      </div>
                    ) : (
                      "Select credit account..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-[400px] overflow-hidden" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput placeholder="Search accounts..." />
                    <CommandEmpty>No account found.</CommandEmpty>
                    <div className="max-h-80 overflow-y-auto">
                      {Object.entries(accountsByType).map(([type, typeAccounts]) => (
                        <CommandGroup key={type} heading={type}>
                          {typeAccounts.map((account) => {
                            const Icon = getAccountTypeIcon(account.account_type)
                            return (
                              <CommandItem
                                key={account.id}
                                value={`${account.account_code} ${account.account_name}`}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, credit_account_id: account.id }))
                                  setOpenCreditCombo(false)
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Icon className="h-4 w-4" />
                                  <Badge className={getAccountTypeColor(account.account_type)} variant="secondary">
                                    {account.account_code}
                                  </Badge>
                                  <span className="flex-1">{account.account_name}</span>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      formData.credit_account_id === account.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      ))}
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Transaction Preview */}
          {formData.amount > 0 && selectedDebitAccount && selectedCreditAccount && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm font-medium text-blue-800 mb-2">Transaction Preview:</div>
                <div className="space-y-1 text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Debit: {selectedDebitAccount.account_name}</span>
                    <span className="font-mono">₹{formData.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit: {selectedCreditAccount.account_name}</span>
                    <span className="font-mono">₹{formData.amount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-blue-300 pt-1 mt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span className="font-mono">Balanced ✓</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Record Transaction
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => {
              setFormData({
                entry_date: new Date().toISOString().split('T')[0],
                reference_number: '',
                description: '',
                amount: 0,
                debit_account_id: '',
                credit_account_id: '',
                employee_id: '',
                supplier_id: '',
                incentive_amount: 0
              })
              setSelectedTemplate('')
              setSelectedEmployeeSales(null)
              generateReferenceNumber()
            }}>
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

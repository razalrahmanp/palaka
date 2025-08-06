'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Edit, Trash2, MoreHorizontal, Search, Filter, BookOpen, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  account_subtype?: string
  normal_balance: 'DEBIT' | 'CREDIT'
  parent_account_id?: string
  current_balance: number
  description?: string
  is_active: boolean
  created_at: string
}

interface AccountFormData {
  account_code: string
  account_name: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  account_subtype: string
  normal_balance: 'DEBIT' | 'CREDIT'
  parent_account_id: string
  description: string
  is_active: boolean
}

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_type: 'ASSET',
    account_subtype: '',
    normal_balance: 'DEBIT',
    parent_account_id: '',
    description: '',
    is_active: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    filterAccounts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, searchTerm, typeFilter])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounting/chart-of-accounts')
      const result = await response.json()
      
      if (result.success) {
        setAccounts(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to load chart of accounts')
    } finally {
      setLoading(false)
    }
  }

  const filterAccounts = () => {
    let filtered = accounts

    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(account => account.account_type === typeFilter)
    }

    setFilteredAccounts(filtered)
  }

  const resetForm = () => {
    setFormData({
      account_code: '',
      account_name: '',
      account_type: 'ASSET',
      account_subtype: '',
      normal_balance: 'DEBIT',
      parent_account_id: '',
      description: '',
      is_active: true
    })
    setErrors({})
    setEditingAccount(null)
  }

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_subtype: account.account_subtype || '',
      normal_balance: account.normal_balance,
      parent_account_id: account.parent_account_id || '',
      description: account.description || '',
      is_active: account.is_active
    })
    setShowForm(true)
  }

  const handleAdd = () => {
    resetForm()
    setShowForm(true)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.account_code.trim()) newErrors.account_code = 'Account code is required'
    if (!formData.account_name.trim()) newErrors.account_name = 'Account name is required'
    if (!formData.account_type) newErrors.account_type = 'Account type is required'
    if (!formData.normal_balance) newErrors.normal_balance = 'Normal balance is required'
    
    // Check for duplicate account code (excluding current account when editing)
    const duplicateCode = accounts.find(acc => 
      acc.account_code === formData.account_code && 
      acc.id !== editingAccount?.id
    )
    if (duplicateCode) {
      newErrors.account_code = 'Account code already exists'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix form errors before saving')
      return
    }

    try {
      const url = editingAccount 
        ? `/api/accounting/chart-of-accounts/${editingAccount.id}`
        : '/api/accounting/chart-of-accounts'
      
      const method = editingAccount ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success(`Account ${editingAccount ? 'updated' : 'created'} successfully`)
        setShowForm(false)
        resetForm()
        fetchAccounts()
      } else {
        throw new Error(result.error || 'Failed to save account')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save account')
    }
  }

  const handleDelete = async (account: Account) => {
    try {
      const response = await fetch(`/api/accounting/chart-of-accounts/${account.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Account deleted successfully')
        fetchAccounts()
      } else {
        throw new Error(result.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete account')
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

  const getAccountTypeColor = (type: string) => {
    const colors = {
      ASSET: 'bg-green-100 text-green-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-purple-100 text-purple-800',
      REVENUE: 'bg-blue-100 text-blue-800',
      EXPENSE: 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getAccountTypeSummary = () => {
    const summary = {
      ASSET: { count: 0, balance: 0 },
      LIABILITY: { count: 0, balance: 0 },
      EQUITY: { count: 0, balance: 0 },
      REVENUE: { count: 0, balance: 0 },
      EXPENSE: { count: 0, balance: 0 }
    }

    filteredAccounts.forEach(account => {
      summary[account.account_type].count++
      summary[account.account_type].balance += account.current_balance || 0
    })

    return summary
  }

  const summary = getAccountTypeSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-gray-600">
            Manage your account structure and balances
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(summary).map(([type, data]) => (
          <Card key={type}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{type}</p>
                  <p className="text-lg font-bold">{data.count} accounts</p>
                  <p className="text-sm text-gray-500">{formatCurrency(data.balance)}</p>
                </div>
                <div className={`p-2 rounded-full ${getAccountTypeColor(type)}`}>
                  {type === 'ASSET' && <DollarSign className="h-4 w-4" />}
                  {type === 'LIABILITY' && <BookOpen className="h-4 w-4" />}
                  {type === 'EQUITY' && <BookOpen className="h-4 w-4" />}
                  {type === 'REVENUE' && <DollarSign className="h-4 w-4" />}
                  {type === 'EXPENSE' && <BookOpen className="h-4 w-4" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by account code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="ASSET">Assets</SelectItem>
                  <SelectItem value="LIABILITY">Liabilities</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="REVENUE">Revenue</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg">Loading accounts...</div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No accounts found</p>
              <p className="text-sm">
                {searchTerm || typeFilter !== 'ALL' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first account to get started'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.account_code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.account_name}</div>
                        {account.description && (
                          <div className="text-sm text-gray-500">{account.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getAccountTypeColor(account.account_type)}>
                        {account.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {account.normal_balance}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.current_balance || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.is_active ? 'default' : 'secondary'}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(account)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this account? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(account)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Account Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_code">Account Code</Label>
                <Input
                  id="account_code"
                  placeholder="e.g., 1100"
                  value={formData.account_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_code: e.target.value }))}
                  className={errors.account_code ? 'border-red-500' : ''}
                />
                {errors.account_code && <p className="text-sm text-red-500 mt-1">{errors.account_code}</p>}
              </div>
              
              <div>
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  placeholder="e.g., Cash"
                  value={formData.account_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                  className={errors.account_name ? 'border-red-500' : ''}
                />
                {errors.account_name && <p className="text-sm text-red-500 mt-1">{errors.account_name}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account_type">Account Type</Label>
                <Select value={formData.account_type} onValueChange={(value: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE') => setFormData(prev => ({ ...prev, account_type: value }))}>
                  <SelectTrigger className={errors.account_type ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="REVENUE">Revenue</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
                {errors.account_type && <p className="text-sm text-red-500 mt-1">{errors.account_type}</p>}
              </div>
              
              <div>
                <Label htmlFor="normal_balance">Normal Balance</Label>
                <Select value={formData.normal_balance} onValueChange={(value: 'DEBIT' | 'CREDIT') => setFormData(prev => ({ ...prev, normal_balance: value }))}>
                  <SelectTrigger className={errors.normal_balance ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
                {errors.normal_balance && <p className="text-sm text-red-500 mt-1">{errors.normal_balance}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="account_subtype">Account Subtype (Optional)</Label>
              <Input
                id="account_subtype"
                placeholder="e.g., Current Asset, Fixed Asset"
                value={formData.account_subtype}
                onChange={(e) => setFormData(prev => ({ ...prev, account_subtype: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this account..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
                aria-label="Account is active"
              />
              <Label htmlFor="is_active">Account is active</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingAccount ? 'Update' : 'Create'} Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

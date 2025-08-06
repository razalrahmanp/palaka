'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, DollarSign, Building, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface ChartOfAccount {
  id: string
  account_code: string
  account_name: string
  account_type: string
  account_subtype: string
  normal_balance: 'DEBIT' | 'CREDIT'
  current_balance: number
  opening_balance: number
  parent_account_id?: string
  description?: string
  is_active: boolean
}

interface AccountFormData {
  account_code: string
  account_name: string
  account_type: string
  account_subtype: string
  normal_balance: 'DEBIT' | 'CREDIT'
  opening_balance: number
  parent_account_id?: string
  description: string
}

const ACCOUNT_TYPES = {
  'ASSET': {
    subtypes: ['CURRENT_ASSET', 'FIXED_ASSET', 'INTANGIBLE_ASSET'],
    normal_balance: 'DEBIT',
    icon: Building,
    color: 'bg-green-100 text-green-800'
  },
  'LIABILITY': {
    subtypes: ['CURRENT_LIABILITY', 'LONG_TERM_LIABILITY'],
    normal_balance: 'CREDIT',
    icon: CreditCard,
    color: 'bg-red-100 text-red-800'
  },
  'EQUITY': {
    subtypes: ['CAPITAL', 'RETAINED_EARNINGS', 'DISTRIBUTIONS'],
    normal_balance: 'CREDIT',
    icon: DollarSign,
    color: 'bg-blue-100 text-blue-800'
  },
  'REVENUE': {
    subtypes: ['SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_REVENUE'],
    normal_balance: 'CREDIT',
    icon: DollarSign,
    color: 'bg-purple-100 text-purple-800'
  },
  'EXPENSE': {
    subtypes: ['OPERATING_EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE'],
    normal_balance: 'DEBIT',
    icon: DollarSign,
    color: 'bg-orange-100 text-orange-800'
  }
}

export default function ChartOfAccountsManager() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)
  const [filterType, setFilterType] = useState<string>('ALL')
  
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_type: '',
    account_subtype: '',
    normal_balance: 'DEBIT',
    opening_balance: 0,
    parent_account_id: '',
    description: ''
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounting/chart-of-accounts')
      const result = await response.json()
      
      if (result.success) {
        setAccounts(result.data || [])
      } else {
        toast.error('Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Error loading accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
        toast.success(editingAccount ? 'Account updated successfully' : 'Account created successfully')
        await fetchAccounts()
        resetForm()
        setIsAddModalOpen(false)
        setIsEditModalOpen(false)
      } else {
        toast.error(result.error || 'Failed to save account')
      }
    } catch (error) {
      console.error('Error saving account:', error)
      toast.error('Error saving account')
    }
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    
    try {
      const response = await fetch(`/api/accounting/chart-of-accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Account deleted successfully')
        await fetchAccounts()
      } else {
        toast.error(result.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Error deleting account')
    }
  }

  const handleEdit = (account: ChartOfAccount) => {
    setEditingAccount(account)
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_subtype: account.account_subtype,
      normal_balance: account.normal_balance,
      opening_balance: account.opening_balance || 0,
      parent_account_id: account.parent_account_id || '',
      description: account.description || ''
    })
    setIsEditModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      account_code: '',
      account_name: '',
      account_type: '',
      account_subtype: '',
      normal_balance: 'DEBIT',
      opening_balance: 0,
      parent_account_id: '',
      description: ''
    })
    setEditingAccount(null)
  }

  const formatCurrency = (amount: number | null | undefined) => {
    const numericAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(numericAmount)
  }

  const filteredAccounts = filterType === 'ALL' 
    ? accounts 
    : accounts.filter(account => account.account_type === filterType)

  const AccountForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="account_code">Account Code</Label>
          <Input
            id="account_code"
            value={formData.account_code}
            onChange={(e) => setFormData(prev => ({ ...prev, account_code: e.target.value }))}
            placeholder="e.g., 1000"
            required
          />
        </div>
        <div>
          <Label htmlFor="account_name">Account Name</Label>
          <Input
            id="account_name"
            value={formData.account_name}
            onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
            placeholder="e.g., Cash"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="account_type">Account Type</Label>
          <Select
            value={formData.account_type}
            onValueChange={(value) => {
              const typeConfig = ACCOUNT_TYPES[value as keyof typeof ACCOUNT_TYPES]
              setFormData(prev => ({
                ...prev,
                account_type: value,
                account_subtype: '',
                normal_balance: (typeConfig?.normal_balance || 'DEBIT') as 'DEBIT' | 'CREDIT'
              }))
            }}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(ACCOUNT_TYPES).map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="account_subtype">Account Subtype</Label>
          <Select
            value={formData.account_subtype}
            onValueChange={(value) => setFormData(prev => ({ ...prev, account_subtype: value }))}
            required
            disabled={!formData.account_type}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subtype" />
            </SelectTrigger>
            <SelectContent>
              {formData.account_type && ACCOUNT_TYPES[formData.account_type as keyof typeof ACCOUNT_TYPES]?.subtypes.map(subtype => (
                <SelectItem key={subtype} value={subtype}>{subtype.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="normal_balance">Normal Balance</Label>
          <Select
            value={formData.normal_balance}
            onValueChange={(value: 'DEBIT' | 'CREDIT') => setFormData(prev => ({ ...prev, normal_balance: value }))}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEBIT">DEBIT</SelectItem>
              <SelectItem value="CREDIT">CREDIT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="opening_balance">Opening Balance</Label>
          <Input
            id="opening_balance"
            type="number"
            step="0.01"
            value={formData.opening_balance}
            onChange={(e) => setFormData(prev => ({ ...prev, opening_balance: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Account description..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm()
            setIsAddModalOpen(false)
            setIsEditModalOpen(false)
          }}
        >
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update Account' : 'Create Account'}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your accounting structure</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
            </DialogHeader>
            <AccountForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilterType('ALL')}
              size="sm"
            >
              All Accounts
            </Button>
            {Object.entries(ACCOUNT_TYPES).map(([type, config]) => {
              const Icon = config.icon
              return (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  onClick={() => setFilterType(type)}
                  size="sm"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {type}
                </Button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading accounts...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subtype</TableHead>
                  <TableHead>Normal Balance</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead className="text-right">Opening Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const typeConfig = ACCOUNT_TYPES[account.account_type as keyof typeof ACCOUNT_TYPES]
                  const Icon = typeConfig?.icon || DollarSign
                  
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.account_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {account.account_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeConfig?.color}>
                          {account.account_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.account_subtype.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Badge variant={account.normal_balance === 'DEBIT' ? 'default' : 'secondary'}>
                          {account.normal_balance}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.current_balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.opening_balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {!loading && filteredAccounts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No accounts found for the selected filter.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          <AccountForm isEdit />
        </DialogContent>
      </Dialog>
    </div>
  )
}

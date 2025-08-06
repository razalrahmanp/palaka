'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Trash2, Save, Send, X, Calculator, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: string
  normal_balance: 'DEBIT' | 'CREDIT'
}

interface JournalEntryLine {
  id?: string
  account_id: string
  account_code?: string
  account_name?: string
  description: string
  debit_amount: number
  credit_amount: number
}

interface JournalEntry {
  id?: string
  entry_date: string
  reference_number: string
  description: string
  lines: JournalEntryLine[]
  status?: 'DRAFT' | 'POSTED'
  total_debit?: number
  total_credit?: number
}

interface JournalEntryFormProps {
  entry?: JournalEntry
  onSave: (entry: JournalEntry) => void
  onCancel: () => void
}

export default function JournalEntryForm({ entry, onSave, onCancel }: JournalEntryFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [formData, setFormData] = useState<JournalEntry>({
    entry_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    description: '',
    lines: [
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchAccounts()
    if (entry) {
      setFormData(entry)
    }
  }, [entry])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/chart-of-accounts')
      const result = await response.json()
      if (result.success) {
        setAccounts(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to load chart of accounts')
    }
  }

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }]
    }))
  }

  const removeLine = (index: number) => {
    if (formData.lines.length <= 2) {
      toast.error('Journal entry must have at least 2 lines')
      return
    }
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }))
  }

  const updateLine = (index: number, field: keyof JournalEntryLine, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => {
        if (i === index) {
          const updatedLine = { ...line, [field]: value }
          
          // If account is selected, populate account details
          if (field === 'account_id' && value) {
            const account = accounts.find(acc => acc.id === value)
            if (account) {
              updatedLine.account_code = account.account_code
              updatedLine.account_name = account.account_name
            }
          }
          
          // Ensure only debit OR credit has a value
          if (field === 'debit_amount' && typeof value === 'number' && value > 0) {
            updatedLine.credit_amount = 0
          } else if (field === 'credit_amount' && typeof value === 'number' && value > 0) {
            updatedLine.debit_amount = 0
          }
          
          return updatedLine
        }
        return line
      })
    }))
  }

  const calculateTotals = () => {
    const totalDebit = formData.lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0)
    const totalCredit = formData.lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0)
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.entry_date) newErrors.entry_date = 'Entry date is required'
    if (!formData.description) newErrors.description = 'Description is required'
    
    const { totalDebit, totalCredit, isBalanced } = calculateTotals()
    if (!isBalanced) {
      newErrors.balance = 'Debits must equal credits'
    }
    
    if (totalDebit === 0 && totalCredit === 0) {
      newErrors.amount = 'At least one line must have an amount'
    }
    
    formData.lines.forEach((line, index) => {
      if (!line.account_id) {
        newErrors[`line_${index}_account`] = 'Account is required'
      }
      if (!line.description) {
        newErrors[`line_${index}_description`] = 'Description is required'
      }
      if (line.debit_amount === 0 && line.credit_amount === 0) {
        newErrors[`line_${index}_amount`] = 'Either debit or credit amount is required'
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (postImmediately = false) => {
    if (!validateForm()) {
      toast.error('Please fix form errors before saving')
      return
    }

    setLoading(true)
    try {
      const { totalDebit, totalCredit } = calculateTotals()
      const entryToSave = {
        ...formData,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: postImmediately ? 'POSTED' : 'DRAFT'
      }

      const url = entry?.id 
        ? `/api/accounting/journal-entries/${entry.id}` 
        : '/api/accounting/journal-entries'
      
      const method = entry?.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryToSave)
      })

      const result = await response.json()
      
      if (result.success) {
        // If posting immediately and this is a new entry, post it
        if (postImmediately && !entry?.id) {
          await fetch(`/api/accounting/journal-entries/${result.data.id}/post`, {
            method: 'POST'
          })
        }
        
        toast.success(postImmediately ? 'Journal entry posted successfully' : 'Journal entry saved successfully')
        onSave(result.data)
      } else {
        throw new Error(result.error || 'Failed to save journal entry')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save journal entry')
    } finally {
      setLoading(false)
    }
  }

  const { totalDebit, totalCredit, isBalanced } = calculateTotals()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>{entry?.id ? 'Edit' : 'New'} Journal Entry</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="entry_date">Entry Date</Label>
            <Input
              id="entry_date"
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
              className={errors.entry_date ? 'border-red-500' : ''}
            />
            {errors.entry_date && <p className="text-sm text-red-500 mt-1">{errors.entry_date}</p>}
          </div>
          
          <div>
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              placeholder="e.g., INV-001, PO-123"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
            />
          </div>
          
          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-gray-500" />
              <div className="text-sm">
                <div className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced ? 'Balanced' : 'Out of Balance'}
                </div>
                <div className="text-gray-500">
                  ₹{totalDebit.toLocaleString()} / ₹{totalCredit.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe this journal entry..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={errors.description ? 'border-red-500' : ''}
          />
          {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Journal Entry Lines */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-medium">Journal Entry Lines</Label>
            <Button onClick={addLine} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell className="w-1/3">
                    <Select
                      value={line.account_id}
                      onValueChange={(value) => updateLine(index, 'account_id', value)}
                    >
                      <SelectTrigger className={errors[`line_${index}_account`] ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_code} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`line_${index}_account`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`line_${index}_account`]}</p>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Input
                      placeholder="Line description"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      className={errors[`line_${index}_description`] ? 'border-red-500' : ''}
                    />
                    {errors[`line_${index}_description`] && (
                      <p className="text-xs text-red-500 mt-1">{errors[`line_${index}_description`]}</p>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.debit_amount || ''}
                      onChange={(e) => updateLine(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.credit_amount || ''}
                      onChange={(e) => updateLine(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </TableCell>
                  
                  <TableCell>
                    {formData.lines.length > 2 && (
                      <Button
                        onClick={() => removeLine(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="mt-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Totals:</span>
              <div className="flex space-x-8">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Debits</div>
                  <div className="font-medium">₹{totalDebit.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Credits</div>
                  <div className="font-medium">₹{totalCredit.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Difference</div>
                  <div className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(totalDebit - totalCredit).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
            {!isBalanced && (
              <div className="mt-2 text-sm text-red-600">
                ⚠️ Journal entry is out of balance. Debits must equal credits.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button onClick={onCancel} variant="outline" disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => handleSave(false)} 
              variant="outline" 
              disabled={loading || !isBalanced}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={loading || !isBalanced}>
                  <Send className="h-4 w-4 mr-2" />
                  Post Entry
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Post Journal Entry</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to post this journal entry? Posted entries cannot be modified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSave(true)}>
                    Post Entry
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

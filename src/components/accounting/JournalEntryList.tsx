'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Edit, Trash2, Send, MoreHorizontal, Calendar, Filter, Search, FileText, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import JournalEntryForm from './JournalEntryForm'

interface JournalEntry {
  id: string
  journal_number: string
  entry_date: string
  reference_number: string
  description: string
  total_debit: number
  total_credit: number
  status: 'DRAFT' | 'POSTED'
  created_at: string
  created_by?: string
}

interface JournalEntryLine {
  id: string
  account_id: string
  account_code: string
  account_name: string
  description: string
  debit_amount: number
  credit_amount: number
}

interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[]
}

export default function JournalEntryList() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryWithLines | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntryWithLines | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [])

  useEffect(() => {
    filterEntries()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, searchTerm, statusFilter])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/accounting/journal-entries')
      const result = await response.json()
      
      if (result.success) {
        setEntries(result.data.entries || [])
      } else {
        throw new Error(result.error || 'Failed to fetch journal entries')
      }
    } catch (error) {
      console.error('Failed to fetch journal entries:', error)
      toast.error('Failed to load journal entries')
    } finally {
      setLoading(false)
    }
  }

  const fetchEntryDetails = async (id: string): Promise<JournalEntryWithLines | null> => {
    try {
      const response = await fetch(`/api/accounting/journal-entries/${id}`)
      const result = await response.json()
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch entry details')
      }
    } catch (error) {
      console.error('Failed to fetch entry details:', error)
      toast.error('Failed to load entry details')
      return null
    }
  }

  const filterEntries = () => {
    let filtered = entries

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.journal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(entry => entry.status === statusFilter)
    }

    setFilteredEntries(filtered)
  }

  const handleView = async (entry: JournalEntry) => {
    const entryWithLines = await fetchEntryDetails(entry.id)
    if (entryWithLines) {
      setSelectedEntry(entryWithLines)
      setShowViewDialog(true)
    }
  }

  const handleEdit = async (entry: JournalEntry) => {
    if (entry.status === 'POSTED') {
      toast.error('Cannot edit posted journal entries')
      return
    }

    const entryWithLines = await fetchEntryDetails(entry.id)
    if (entryWithLines) {
      setEditingEntry(entryWithLines)
      setShowForm(true)
    }
  }

  const handlePost = async (entry: JournalEntry) => {
    if (entry.status === 'POSTED') {
      toast.error('Entry is already posted')
      return
    }

    try {
      const response = await fetch(`/api/accounting/journal-entries/${entry.id}/post`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Journal entry posted successfully')
        fetchEntries()
      } else {
        throw new Error(result.error || 'Failed to post journal entry')
      }
    } catch (error) {
      console.error('Failed to post journal entry:', error)
      toast.error('Failed to post journal entry')
    }
  }

  const handleDelete = async (entry: JournalEntry) => {
    if (entry.status === 'POSTED') {
      toast.error('Cannot delete posted journal entries')
      return
    }

    try {
      const response = await fetch(`/api/accounting/journal-entries/${entry.id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Journal entry deleted successfully')
        fetchEntries()
      } else {
        throw new Error(result.error || 'Failed to delete journal entry')
      }
    } catch (error) {
      console.error('Failed to delete journal entry:', error)
      toast.error('Failed to delete journal entry')
    }
  }

  const handleSaveEntry = () => {
    setShowForm(false)
    setEditingEntry(null)
    fetchEntries()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTotalBalance = () => {
    const totalDebits = filteredEntries.reduce((sum, entry) => sum + (entry.total_debit || 0), 0)
    const totalCredits = filteredEntries.reduce((sum, entry) => sum + (entry.total_credit || 0), 0)
    return { totalDebits, totalCredits }
  }

  const { totalDebits, totalCredits } = getTotalBalance()

  if (showForm) {
    return (
      <JournalEntryForm
        entry={editingEntry || undefined}
        onSave={handleSaveEntry}
        onCancel={() => {
          setShowForm(false)
          setEditingEntry(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <p className="text-gray-600">
            Manage all journal entries and transactions
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Journal Entry
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by journal number, description, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{filteredEntries.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debits</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDebits)}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">+</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCredits)}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">-</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journal Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg">Loading journal entries...</div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No journal entries found</p>
              <p className="text-sm">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first journal entry to get started'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Journal #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      JE-{entry.journal_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{format(new Date(entry.entry_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{entry.reference_number || '-'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={entry.description}>
                        {entry.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.total_debit)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'POSTED' ? 'default' : 'secondary'}>
                        {entry.status}
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
                          <DropdownMenuItem onClick={() => handleView(entry)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          
                          {entry.status === 'DRAFT' && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => handlePost(entry)}>
                                <Send className="h-4 w-4 mr-2" />
                                Post Entry
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
                                    <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this journal entry? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(entry)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
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

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Journal Entry Details - JE-{selectedEntry?.journal_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-600">Date</label>
                  <p className="text-sm">{format(new Date(selectedEntry.entry_date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Reference</label>
                  <p className="text-sm">{selectedEntry.reference_number || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge variant={selectedEntry.status === 'POSTED' ? 'default' : 'secondary'}>
                    {selectedEntry.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Amount</label>
                  <p className="text-sm font-medium">{formatCurrency(selectedEntry.total_debit)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm mt-1">{selectedEntry.description}</p>
              </div>

              {/* Journal Lines */}
              <div>
                <h4 className="text-lg font-medium mb-4">Journal Entry Lines</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines?.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{line.account_code}</div>
                            <div className="text-sm text-gray-600">{line.account_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="text-right">
                          {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Totals */}
                <div className="mt-4 pt-4 border-t bg-gray-50 p-4 rounded">
                  <div className="flex justify-between font-medium">
                    <span>Totals:</span>
                    <div className="flex space-x-8">
                      <span>Debits: {formatCurrency(selectedEntry.total_debit)}</span>
                      <span>Credits: {formatCurrency(selectedEntry.total_credit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

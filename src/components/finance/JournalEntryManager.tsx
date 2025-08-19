'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check,
  Receipt,
  Calendar as CalendarIcon,
  AlertTriangle
} from 'lucide-react';

interface JournalEntry {
  id: string;
  entry_number: string;
  transaction_date: string;
  description: string;
  reference_number?: string;
  total_amount: number;
  status: 'DRAFT' | 'POSTED';
  created_at: string;
  journal_entry_lines: JournalEntryLine[];
}

interface JournalEntryLine {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface JournalEntryFormData {
  entry_number: string;
  transaction_date: Date;
  description: string;
  reference_number: string;
  lines: {
    account_id: string;
    description: string;
    debit_amount: string;
    credit_amount: string;
  }[];
}

export default function JournalEntryManager() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [formData, setFormData] = useState<JournalEntryFormData>({
    entry_number: '',
    transaction_date: new Date(),
    description: '',
    reference_number: '',
    lines: [
      { account_id: '', description: '', debit_amount: '', credit_amount: '' },
      { account_id: '', description: '', debit_amount: '', credit_amount: '' },
    ],
  });

  useEffect(() => {
    fetchJournalEntries();
    fetchAccounts();
  }, []);

  const fetchJournalEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/journal-entries');
      
      if (!response.ok) {
        throw new Error('Failed to fetch journal entries');
      }
      
      const { data } = await response.json();
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/finance/chart-of-accounts');
      const { data } = await response.json();
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateTotals = () => {
    const totalDebits = formData.lines.reduce((sum, line) => {
      return sum + (parseFloat(line.debit_amount) || 0);
    }, 0);
    const totalCredits = formData.lines.reduce((sum, line) => {
      return sum + (parseFloat(line.credit_amount) || 0);
    }, 0);
    return { totalDebits, totalCredits, isBalanced: totalDebits === totalCredits };
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { account_id: '', description: '', debit_amount: '', credit_amount: '' },
      ],
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 2) {
      const newLines = formData.lines.filter((_, i) => i !== index);
      setFormData({ ...formData, lines: newLines });
    }
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const resetForm = () => {
    setFormData({
      entry_number: '',
      transaction_date: new Date(),
      description: '',
      reference_number: '',
      lines: [
        { account_id: '', description: '', debit_amount: '', credit_amount: '' },
        { account_id: '', description: '', debit_amount: '', credit_amount: '' },
      ],
    });
    setEditingEntry(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { totalDebits, isBalanced } = calculateTotals();
    
    if (!isBalanced) {
      alert('Journal entry must be balanced. Debits must equal credits.');
      return;
    }

    try {
      const method = editingEntry ? 'PUT' : 'POST';
      const body = {
        ...formData,
        transaction_date: format(formData.transaction_date, 'yyyy-MM-dd'),
        total_amount: totalDebits,
        ...(editingEntry && { id: editingEntry.id }),
      };

      const response = await fetch('/api/finance/journal-entries', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        fetchJournalEntries();
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }
  };

  const handlePost = async (entryId: string) => {
    try {
      const response = await fetch('/api/finance/journal-entries/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      });

      if (response.ok) {
        fetchJournalEntries();
      }
    } catch (error) {
      console.error('Error posting journal entry:', error);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      try {
        const response = await fetch('/api/finance/journal-entries', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: entryId }),
        });

        if (response.ok) {
          fetchJournalEntries();
        }
      } catch (error) {
        console.error('Error deleting journal entry:', error);
      }
    }
  };

  const { totalDebits, totalCredits, isBalanced } = calculateTotals();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading journal entries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Journal Entries</h2>
          <p className="text-gray-600">Create and manage double-entry journal entries</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? 'Edit Journal Entry' : 'Create New Journal Entry'}
              </DialogTitle>
              <DialogDescription>
                Enter the journal entry details. Debits must equal credits.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entry_number">Entry Number</Label>
                  <Input
                    id="entry_number"
                    value={formData.entry_number}
                    onChange={(e) => setFormData({ ...formData, entry_number: e.target.value })}
                    placeholder="e.g., JE001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="transaction_date">Transaction Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.transaction_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.transaction_date}
                        onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter journal entry description"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="e.g., INV001, PO001"
                  />
                </div>
              </div>

              {/* Journal Entry Lines */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Journal Entry Lines</Label>
                  <Button type="button" variant="outline" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select 
                              value={line.account_id} 
                              onValueChange={(value) => updateLine(index, 'account_id', value)}
                            >
                              <SelectTrigger className="w-full">
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
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.description}
                              onChange={(e) => updateLine(index, 'description', e.target.value)}
                              placeholder="Line description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.debit_amount}
                              onChange={(e) => updateLine(index, 'debit_amount', e.target.value)}
                              placeholder="0.00"
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.credit_amount}
                              onChange={(e) => updateLine(index, 'credit_amount', e.target.value)}
                              placeholder="0.00"
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            {formData.lines.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLine(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Debits</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(totalDebits)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Credits</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(totalCredits)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Status</p>
                      <div className="flex items-center justify-center gap-2">
                        {isBalanced ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-green-600">Balanced</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">Not Balanced</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isBalanced}>
                  {editingEntry ? 'Update' : 'Create'} Journal Entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Journal Entries Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {entry.entry_number}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatDate(entry.transaction_date)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.reference_number || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(entry.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'POSTED' ? 'default' : 'secondary'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {entry.status === 'DRAFT' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePost(entry.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEntry(entry);
                              // Populate form with entry data for editing
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={entry.status === 'POSTED'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {entries.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first journal entry.</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Journal Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ObligationEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName?: string;
  onSuccess?: () => void;
  initialData?: {
    id?: string;
    obligation_date?: string;
    obligation_type?: string;
    amount?: number;
    description?: string;
    reference_number?: string;
    notes?: string;
  };
}

const obligationTypes = [
  { value: 'salary', label: 'Salary' },
  { value: 'incentive', label: 'Incentive' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'commission', label: 'Commission' },
  { value: 'other', label: 'Other' },
];

export default function ObligationEntryDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
  initialData,
}: ObligationEntryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    initialData?.obligation_date ? new Date(initialData.obligation_date) : new Date()
  );
  const [obligationType, setObligationType] = useState(initialData?.obligation_type || 'salary');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [referenceNumber, setReferenceNumber] = useState(initialData?.reference_number || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');

  const isEditMode = !!initialData?.id;

  useEffect(() => {
    if (initialData) {
      setDate(initialData.obligation_date ? new Date(initialData.obligation_date) : new Date());
      setObligationType(initialData.obligation_type || 'salary');
      setAmount(initialData.amount?.toString() || '');
      setDescription(initialData.description || '');
      setReferenceNumber(initialData.reference_number || '');
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!date) {
      setError('Please select a date');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        employee_id: employeeId,
        obligation_date: format(date, 'yyyy-MM-dd'),
        obligation_type: obligationType,
        amount: parseFloat(amount),
        description: description.trim() || null,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      };

      let response;

      if (isEditMode) {
        // Update existing obligation
        response = await fetch('/api/finance/employee-obligations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: initialData.id, ...payload }),
        });
      } else {
        // Create new obligation
        response = await fetch('/api/finance/employee-obligations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save obligation');
      }

      // Reset form
      setDate(new Date());
      setObligationType('salary');
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      setNotes('');

      // Close dialog and trigger success callback
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving obligation:', err);
      setError(err instanceof Error ? err.message : 'Failed to save obligation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit' : 'Add'} Employee Obligation
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update' : 'Create a new'} obligation entry for {employeeName || 'the employee'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Obligation Date */}
            <div className="space-y-2">
              <Label htmlFor="obligation-date">Obligation Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="obligation-date"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Obligation Type */}
            <div className="space-y-2">
              <Label htmlFor="obligation-type">Obligation Type *</Label>
              <Select value={obligationType} onValueChange={setObligationType}>
                <SelectTrigger id="obligation-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {obligationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference-number">Reference Number</Label>
            <Input
              id="reference-number"
              type="text"
              placeholder="e.g., SAL-2025-01"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter obligation description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update' : 'Create'} Obligation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

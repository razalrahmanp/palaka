'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CustomerVisitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
  } | null;
  onSubmit: (data: VisitFormData) => void | Promise<void>;
}

export interface VisitFormData {
  customer_id: string;
  visit_type: 'walk-in' | 'scheduled' | 'follow-up' | 'delivery';
  interest_level: 'high' | 'medium' | 'low' | 'not_interested';
  notes: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  products_discussed?: string;
}

export function CustomerVisitDialog({ isOpen, onClose, customer, onSubmit }: CustomerVisitDialogProps) {
  const [formData, setFormData] = useState<VisitFormData>({
    customer_id: customer?.id || '',
    visit_type: 'walk-in',
    interest_level: 'medium',
    notes: '',
    follow_up_required: false,
    follow_up_date: '',
    products_discussed: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update customer_id when customer changes
  useEffect(() => {
    if (customer?.id) {
      setFormData(prev => ({ ...prev, customer_id: customer.id }));
    }
  }, [customer?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Customer Visit</DialogTitle>
          <DialogDescription>
            Track visit details, interest level, and follow-up requirements for {customer.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100">
            <p className="text-sm font-medium text-gray-700">Recording visit for:</p>
            <p className="text-lg font-bold text-purple-700">{customer.name}</p>
          </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="visit_type">Visit Type *</Label>
          <Select 
            value={formData.visit_type} 
            onValueChange={(value) => setFormData({...formData, visit_type: value as VisitFormData['visit_type']})}
          >
            <SelectTrigger id="visit_type">
              <SelectValue placeholder="Select visit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">🚶 Walk-in</SelectItem>
              <SelectItem value="scheduled">📅 Scheduled Appointment</SelectItem>
              <SelectItem value="follow-up">🔄 Follow-up Visit</SelectItem>
              <SelectItem value="delivery">🚚 Delivery Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="interest_level">Interest Level *</Label>
          <Select 
            value={formData.interest_level} 
            onValueChange={(value) => setFormData({...formData, interest_level: value as VisitFormData['interest_level']})}
          >
            <SelectTrigger id="interest_level">
              <SelectValue placeholder="Select interest level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">🔥 High - Ready to buy</SelectItem>
              <SelectItem value="medium">👍 Medium - Exploring options</SelectItem>
              <SelectItem value="low">🤔 Low - Just browsing</SelectItem>
              <SelectItem value="not_interested">❌ Not interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="products_discussed">Products Discussed</Label>
        <Input
          id="products_discussed"
          value={formData.products_discussed}
          onChange={(e) => setFormData({...formData, products_discussed: e.target.value})}
          placeholder="e.g., Sofa Set, Dining Table, Bedroom Furniture"
        />
      </div>

      <div>
        <Label htmlFor="notes">Visit Notes *</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="What did you discuss? Customer concerns? Specific requirements? Budget discussed?"
          rows={4}
          required
          className="resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Include: Products shown, customer concerns, budget, decision timeline
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-3">
          <Checkbox
            id="follow_up_required"
            checked={formData.follow_up_required}
            onCheckedChange={(checked) => setFormData({...formData, follow_up_required: !!checked})}
          />
          <Label htmlFor="follow_up_required" className="cursor-pointer">
            Follow-up Required
          </Label>
        </div>

        {formData.follow_up_required && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="follow_up_date">Follow-up Date</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
              className="max-w-xs"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Recording...' : '✓ Record Visit'}
        </Button>
      </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

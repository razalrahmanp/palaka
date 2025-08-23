import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, AlertCircle } from 'lucide-react';
import { Order } from '@/types';

interface SalesRepresentative {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignSalesRepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess: () => void;
}

export function AssignSalesRepModal({ 
  open, 
  onOpenChange, 
  order, 
  onSuccess 
}: AssignSalesRepModalProps) {
  const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch sales representatives
  useEffect(() => {
    if (open) {
      fetchSalesReps();
    }
  }, [open]);

  // Set current sales rep when order changes
  useEffect(() => {
    if (order?.created_by) {
      setSelectedRepId(order.created_by);
    } else {
      setSelectedRepId('');
    }
  }, [order]);

  const fetchSalesReps = async () => {
    try {
      const response = await fetch('/api/sales/representatives');
      if (response.ok) {
        const data = await response.json();
        setSalesReps(data);
      } else {
        setError('Failed to load sales representatives');
      }
    } catch (error) {
      console.error('Error fetching sales representatives:', error);
      setError('Failed to load sales representatives');
    }
  };

  const handleAssign = async () => {
    if (!order?.id || !selectedRepId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/sales/orders/${order.id}/assign-rep`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_rep_id: selectedRepId,
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update sales representative');
      }
    } catch (error) {
      console.error('Error assigning sales representative:', error);
      setError('Failed to update sales representative');
    } finally {
      setLoading(false);
    }
  };

  const currentRep = order?.sales_representative;
  const selectedRep = salesReps.find(rep => rep.id === selectedRepId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Assign Sales Representative
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono">#{order?.id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer:</span>
                <span>{order?.customer?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Rep:</span>
                <span>
                  {currentRep ? (
                    <Badge variant="outline" className="text-xs">
                      {currentRep.name}
                    </Badge>
                  ) : (
                    <span className="text-gray-500">Not assigned</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Sales Representative Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900">
              Select New Sales Representative
            </label>
            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a sales representative..." />
              </SelectTrigger>
              <SelectContent>
                {salesReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">{rep.name}</div>
                        <div className="text-xs text-gray-600">{rep.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview of Change */}
          {selectedRep && selectedRep.id !== currentRep?.id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">Change Preview</div>
                  <div className="text-blue-700 mt-1">
                    Order will be assigned to <strong>{selectedRep.name}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={loading || !selectedRepId || selectedRepId === currentRep?.id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Updating...' : 'Assign Representative'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

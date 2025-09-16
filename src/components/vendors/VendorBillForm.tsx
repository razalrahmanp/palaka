'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Calendar, DollarSign, Package } from 'lucide-react';
import { toast } from 'sonner';

interface VendorBillFormProps {
  vendorId: string;
  vendorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PurchaseOrder {
  id: string;
  total: number;
  created_at: string;
  status: string;
  description?: string;
  quantity: number;
  is_custom?: boolean;
  custom_type?: string | null;
  product_name?: string | null;
  materials?: string[] | null;
  product?: {
    id: string;
    name: string;
  };
}

export function VendorBillForm({ vendorId, vendorName, open, onOpenChange, onSuccess }: VendorBillFormProps) {
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [formData, setFormData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    total_amount: '',
    description: '',
    tax_amount: '',
    discount_amount: '',
    purchase_order_ids: [] as string[], // Changed to array for multiple selection
    reference_number: ''
  });

  // Generate bill number automatically
  useEffect(() => {
    if (open) {
      // Create a more descriptive bill number with supplier name abbreviation
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const timeStamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness
      
      // Create supplier abbreviation from vendor name
      const supplierAbbr = vendorName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 6); // Max 6 characters
      
      const billNumber = `BILL-${supplierAbbr}-${timeStamp}-${dateStr}`;
      setFormData(prev => ({ ...prev, bill_number: billNumber }));
      
      const fetchPurchaseOrders = async () => {
        try {
          const response = await fetch(`/api/vendors/${vendorId}/purchase-orders`);
          if (response.ok) {
            const data = await response.json();
            // Filter for approved/pending orders that might need bills
            const eligibleOrders = data.filter((po: PurchaseOrder) => 
              ['approved', 'pending', 'confirmed'].includes(po.status.toLowerCase())
            );
            setPurchaseOrders(eligibleOrders);
          }
        } catch (error) {
          console.error('Error fetching purchase orders:', error);
          // Fallback: Set empty array if endpoint doesn't exist
          setPurchaseOrders([]);
        }
      };

      fetchPurchaseOrders();
    }
  }, [open, vendorId, vendorName]);

  // Auto-calculate due date when bill date changes
  useEffect(() => {
    if (formData.bill_date) {
      const billDate = new Date(formData.bill_date);
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days payment terms
      setFormData(prev => ({ ...prev, due_date: dueDate.toISOString().split('T')[0] }));
    }
  }, [formData.bill_date]);

  // Auto-populate amount when POs are selected
  const handlePurchaseOrderChange = (selectedIds: string[]) => {
    const selectedPOs = purchaseOrders.filter(po => selectedIds.includes(po.id));
    if (selectedPOs.length > 0) {
      const totalAmount = selectedPOs.reduce((sum, po) => sum + po.total, 0);
      const productNames = selectedPOs.map(po => {
        // Use the same comprehensive fallback as procurement tab
        return po.product?.name || po.product_name || po.custom_type || po.description || 'Custom Product';
      }).join(', ');
      
      setFormData(prev => ({
        ...prev,
        purchase_order_ids: selectedIds,
        total_amount: totalAmount.toString(),
        description: `Bill for: ${productNames} (${vendorName})`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        purchase_order_ids: [],
        total_amount: '',
        description: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.bill_number.trim()) {
      toast.error('Bill number is required');
      return;
    }
    
    if (!formData.bill_date) {
      toast.error('Bill date is required');
      return;
    }
    
    if (!formData.due_date) {
      toast.error('Due date is required');
      return;
    }
    
    const totalAmount = parseFloat(formData.total_amount);
    if (!totalAmount || totalAmount <= 0) {
      toast.error('Please enter a valid total amount');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/vendors/${vendorId}/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bill_number: formData.bill_number,
          bill_date: formData.bill_date,
          due_date: formData.due_date,
          total_amount: totalAmount,
          description: formData.description,
          tax_amount: parseFloat(formData.tax_amount) || 0,
          discount_amount: parseFloat(formData.discount_amount) || 0,
          purchase_order_ids: formData.purchase_order_ids.length > 0 ? formData.purchase_order_ids : null,
          reference_number: formData.reference_number || null,
          created_by: null // Will be handled by the API
        }),
      });

      if (response.ok) {
        toast.success('Vendor bill created successfully!');
        resetForm();
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create vendor bill');
      }
    } catch (error) {
      console.error('Error creating vendor bill:', error);
      toast.error('Error creating vendor bill');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      bill_number: '',
      bill_date: new Date().toISOString().split('T')[0],
      due_date: '',
      total_amount: '',
      description: '',
      tax_amount: '',
      discount_amount: '',
      purchase_order_ids: [] as string[],
      reference_number: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-700 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Vendor Bill - {vendorName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bill Information Section */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Bill Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bill_number">Bill Number *</Label>
                  <Input
                    id="bill_number"
                    value={formData.bill_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, bill_number: e.target.value }))}
                    placeholder="BILL-001"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="INV-2024-001"
                  />
                </div>
              </div>
            </div>

            {/* Date Information Section */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bill_date">Bill Date *</Label>
                  <Input
                    id="bill_date"
                    type="date"
                    value={formData.bill_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, bill_date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Purchase Order Link Section */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Link to Purchase Orders (Optional)
              </h3>
              
              <div>
                <Label>Select Purchase Orders (Multiple allowed)</Label>
                <div className="mt-2 max-h-60 overflow-y-auto border rounded-md bg-white">
                  {purchaseOrders.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="font-medium">No purchase orders available</p>
                      <p className="text-sm mt-1">
                        Create a purchase order first, or proceed without linking to an existing order
                      </p>
                    </div>
                  ) : (
                    purchaseOrders.map((po) => (
                      <div key={po.id} className="flex items-center space-x-3 p-3 border-b hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`po-${po.id}`}
                          aria-label={`Select purchase order for ${po.product?.name || po.product_name || po.custom_type || po.description || 'Custom Product'}`}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={formData.purchase_order_ids.includes(po.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handlePurchaseOrderChange([...formData.purchase_order_ids, po.id]);
                            } else {
                              handlePurchaseOrderChange(formData.purchase_order_ids.filter(id => id !== po.id));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm text-gray-900">
                                {po.product?.name || po.product_name || po.custom_type || po.description || 'Custom Product'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500">
                                  Quantity: {po.quantity} | Status: {po.status}
                                </p>
                                {po.is_custom && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {po.materials && po.materials.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Materials: {po.materials.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-gray-900">
                                {formatCurrency(po.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {formData.purchase_order_ids.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border text-sm">
                    <span className="font-medium text-blue-900">
                      Selected: {formData.purchase_order_ids.length} purchase order(s)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information Section */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="total_amount">Total Amount *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="tax_amount">Tax Amount</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Bill description, items purchased, etc."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
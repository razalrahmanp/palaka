'use client';

import React, { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Plus, FileText, Trash2, Calculator } from 'lucide-react';
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



interface BillLineItem {
  id: string;
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  purchase_order_id?: string;
}

interface TaxCalculation {
  subtotal: number;
  freight_total: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  grand_total: number;
}

export function EnhancedVendorBillForm({ vendorId, vendorName, open, onOpenChange, onSuccess }: VendorBillFormProps) {
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [lineItems, setLineItems] = useState<BillLineItem[]>([]);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculation>({
    subtotal: 0,
    freight_total: 0,
    taxable_amount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total_gst: 0,
    grand_total: 0
  });

  const [formData, setFormData] = useState({
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    description: '',
    reference_number: '',
    gst_rate: '18', // Default 18% GST
    is_interstate: false, // For CGST+SGST vs IGST
    freight_total: '0', // Bill-level freight
    additional_charges: '0',
    discount_amount: '0'
  });

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      // Fetch purchase orders and exclude those already linked to bills
      const response = await fetch(`/api/vendors/${vendorId}/purchase-orders?exclude_linked=true`);
      if (response.ok) {
        const data = await response.json();
        const eligibleOrders = data.filter((po: PurchaseOrder) => 
          ['approved', 'pending', 'confirmed'].includes(po.status.toLowerCase())
        );
        setPurchaseOrders(eligibleOrders);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  }, [vendorId]);

  // Generate bill number automatically
  useEffect(() => {
    if (open) {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const timeStamp = Date.now().toString().slice(-6);
      
      const supplierAbbr = vendorName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 6);
      
      const billNumber = `BILL-${supplierAbbr}-${timeStamp}-${dateStr}`;
      setFormData(prev => ({ ...prev, bill_number: billNumber }));
      
      // Add one empty line item to start
      setLineItems([{
        id: Date.now().toString(),
        product_name: '',
        quantity: 1,
        unit_price: 0,
        line_total: 0
      }]);

      fetchPurchaseOrders();
    }
  }, [open, vendorId, vendorName, fetchPurchaseOrders]);

  // Auto-calculate due date when bill date changes
  useEffect(() => {
    if (formData.bill_date) {
      const billDate = new Date(formData.bill_date);
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + 30);
      setFormData(prev => ({ ...prev, due_date: dueDate.toISOString().split('T')[0] }));
    }
  }, [formData.bill_date]);

  const calculateTotals = useCallback(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const freight_total = parseFloat(formData.freight_total) || 0;
    const additional_charges = parseFloat(formData.additional_charges) || 0;
    const discount_amount = parseFloat(formData.discount_amount) || 0;
    
    const taxable_amount = subtotal + freight_total + additional_charges - discount_amount;
    const gst_rate = parseFloat(formData.gst_rate) || 0;
    
    let cgst = 0, sgst = 0, igst = 0;
    
    if (formData.is_interstate) {
      // Interstate: IGST only
      igst = (taxable_amount * gst_rate) / 100;
    } else {
      // Intrastate: CGST + SGST
      cgst = (taxable_amount * gst_rate) / 200; // Half of total rate
      sgst = (taxable_amount * gst_rate) / 200; // Half of total rate  
    }
    
    const total_gst = cgst + sgst + igst;
    const grand_total = taxable_amount + total_gst;

    setTaxCalculation({
      subtotal,
      freight_total,
      taxable_amount,
      cgst,
      sgst,
      igst,
      total_gst,
      grand_total
    });

    // Note: Line totals are calculated inline in the render, not stored in state
  }, [lineItems, formData.gst_rate, formData.is_interstate, formData.freight_total, formData.additional_charges, formData.discount_amount]);

  // Recalculate totals when line items or tax settings change
  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const addLineItem = () => {
    const newItem: BillLineItem = {
      id: Date.now().toString(),
      product_name: '',
      quantity: 1,
      unit_price: 0,
      line_total: 0
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, updates: Partial<BillLineItem>) => {
    setLineItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };



  const loadFromPurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      const productName = po.product?.name || po.product_name || po.custom_type || po.description || 'Custom Product';
      const unitPrice = po.total / (po.quantity || 1);
      
      const newItem: BillLineItem = {
        id: Date.now().toString(),
        product_id: po.product?.id,
        product_name: productName,
        quantity: po.quantity || 1,
        unit_price: unitPrice,
        line_total: 0, // Will be calculated inline
        purchase_order_id: poId
      };
      
      setLineItems(prev => [...prev, newItem]);
      // Refresh purchase orders to exclude the newly linked one
      fetchPurchaseOrders();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.bill_number.trim()) {
      toast.error('Bill number is required');
      return;
    }
    
    if (lineItems.length === 0 || lineItems.every(item => !item.product_name.trim())) {
      toast.error('Please add at least one line item');
      return;
    }

    if (taxCalculation.grand_total <= 0) {
      toast.error('Bill total must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`/api/vendors/${vendorId}/bills/enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Basic bill info
          bill_number: formData.bill_number,
          bill_date: formData.bill_date,
          due_date: formData.due_date,
          description: formData.description,
          reference_number: formData.reference_number,
          
          // Financial totals
          subtotal: taxCalculation.subtotal,
          freight_total: taxCalculation.freight_total,
          additional_charges: parseFloat(formData.additional_charges) || 0,
          discount_amount: parseFloat(formData.discount_amount) || 0,
          cgst: taxCalculation.cgst,
          sgst: taxCalculation.sgst,
          igst: taxCalculation.igst,
          total_gst: taxCalculation.total_gst,
          grand_total: taxCalculation.grand_total,
          
          // Tax info
          gst_rate: parseFloat(formData.gst_rate),
          is_interstate: formData.is_interstate,
          
          // Line items with detailed costing
          line_items: lineItems.filter(item => item.product_name.trim()).map(item => {
            const gstRate = parseFloat(formData.gst_rate) || 0;
            const freight_total = parseFloat(formData.freight_total) || 0;
            const subtotal = lineItems.reduce((sum, lineItem) => sum + (lineItem.quantity * lineItem.unit_price), 0);
            
            // Allocate freight proportionally based on line total
            const lineTotal = item.quantity * item.unit_price;
            const freightAllocation = subtotal > 0 ? (lineTotal / subtotal) * freight_total : 0;
            const freightPerUnit = item.quantity > 0 ? freightAllocation / item.quantity : 0;
            
            // Calculate actual cost per unit with freight allocation and GST
            const unitPriceWithFreight = item.unit_price + freightPerUnit;
            const gstAmount = (unitPriceWithFreight * gstRate) / 100;
            const actualCostPerUnit = unitPriceWithFreight + gstAmount;
            
            return {
              product_id: item.product_id || null,
              product_name: item.product_name,
              description: item.description || null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              line_total: lineTotal,
              purchase_order_id: item.purchase_order_id || null,
              // Send the calculated actual cost per unit including freight allocation and GST
              actual_cost_per_unit: actualCostPerUnit
            };
          })
        }),
      });

      if (response.ok) {
        toast.success('Enhanced vendor bill created successfully!');
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
      description: '',
      reference_number: '',
      gst_rate: '18',
      is_interstate: false,
      freight_total: '0',
      additional_charges: '0',
      discount_amount: '0'
    });
    setLineItems([]);
    setTaxCalculation({
      subtotal: 0,
      freight_total: 0,
      taxable_amount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total_gst: 0,
      grand_total: 0
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-none bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-blue-700 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Vendor Bill - {vendorName}
            </h1>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2"
            >
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-1 p-6 space-y-6">
          {/* Basic Bill Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <Label htmlFor="bill_number">Bill Number *</Label>
              <Input
                id="bill_number"
                value={formData.bill_number}
                onChange={(e) => setFormData(prev => ({ ...prev, bill_number: e.target.value }))}
                required
              />
            </div>
            
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

          {/* Purchase Order Quick Load */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <Label>Quick Load from Purchase Order</Label>
            <Select onValueChange={loadFromPurchaseOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Select PO to load items" />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders.map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      PO-{po.id.slice(-6)} - {po.product?.name || po.product_name || 'Custom'} - {formatCurrency(po.total)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line Items Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Bill Line Items</h3>
              <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[400px] text-left font-semibold">Product</TableHead>
                    <TableHead className="w-[100px] text-center font-semibold">Qty</TableHead>
                    <TableHead className="w-[150px] text-right font-semibold">Unit Price</TableHead>
                    <TableHead className="w-[200px] text-right font-semibold">Actual Cost/Unit</TableHead>
                    <TableHead className="w-[150px] text-right font-semibold">Line Total</TableHead>
                    <TableHead className="w-[100px] text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const gstRate = parseFloat(formData.gst_rate) || 0;
                    const freight_total = parseFloat(formData.freight_total) || 0;
                    const subtotal = lineItems.reduce((sum, lineItem) => sum + (lineItem.quantity * lineItem.unit_price), 0);
                    
                    // Allocate freight proportionally based on line total
                    const lineTotal = item.quantity * item.unit_price;
                    const freightAllocation = subtotal > 0 ? (lineTotal / subtotal) * freight_total : 0;
                    const freightPerUnit = item.quantity > 0 ? freightAllocation / item.quantity : 0;
                    
                    // Calculate actual cost per unit with freight allocation
                    const unitPriceWithFreight = item.unit_price + freightPerUnit;
                    const gstAmount = (unitPriceWithFreight * gstRate) / 100;
                    const finalCostPerUnit = unitPriceWithFreight + gstAmount;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="w-[400px] p-3">
                          <Input
                            placeholder="Enter product name"
                            value={item.product_name}
                            onChange={(e) => updateLineItem(item.id, { product_name: e.target.value })}
                            className="w-full border-gray-300 focus:border-blue-500"
                          />
                        </TableCell>
                        
                        <TableCell className="w-[100px] p-3 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                            className="w-full text-center border-gray-300 focus:border-blue-500"
                          />
                        </TableCell>
                        
                        <TableCell className="w-[150px] p-3">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-full text-right border-gray-300 focus:border-blue-500"
                            placeholder="0.00"
                          />
                        </TableCell>
                        
                        <TableCell className="w-[200px] p-3 text-right">
                          <div className="space-y-1">
                            <div className="text-base font-semibold text-blue-600">
                              {formatCurrency(finalCostPerUnit)}
                            </div>
                            <div className="text-xs text-gray-600 leading-tight">
                              Base: {formatCurrency(item.unit_price)}<br/>
                              Freight: {formatCurrency(freightPerUnit)}<br/>
                              GST {gstRate.toFixed(1)}%: {formatCurrency(gstAmount)}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="w-[150px] p-3 text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </div>
                        </TableCell>
                        
                        <TableCell className="w-[100px] p-3 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            className="w-full hover:bg-red-50 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tax and Total Calculation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tax Settings */}
            <div className="p-4 bg-green-50 rounded-lg space-y-4">
              <h3 className="font-medium text-green-900">Tax Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst_rate">GST Rate (%)</Label>
                  <Select value={formData.gst_rate} onValueChange={(value) => setFormData(prev => ({ ...prev, gst_rate: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% - Nil Rated</SelectItem>
                      <SelectItem value="0.1">0.1% - Gold/Silver</SelectItem>
                      <SelectItem value="0.25">0.25% - Rough Diamond</SelectItem>
                      <SelectItem value="1">1% - Cotton</SelectItem>
                      <SelectItem value="3">3% - Essential Items</SelectItem>
                      <SelectItem value="5">5% - Essential Goods</SelectItem>
                      <SelectItem value="12">12% - Standard Goods</SelectItem>
                      <SelectItem value="18">18% - Standard Rate</SelectItem>
                      <SelectItem value="28">28% - Luxury Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 mt-6">
                  <input
                    type="checkbox"
                    id="is_interstate"
                    checked={formData.is_interstate}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_interstate: e.target.checked }))}
                    title="Interstate transaction (uses IGST instead of CGST+SGST)"
                  />
                  <Label htmlFor="is_interstate">Interstate (IGST)</Label>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="freight_total">Freight Total</Label>
                  <Input
                    id="freight_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.freight_total}
                    onChange={(e) => setFormData(prev => ({ ...prev, freight_total: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="additional_charges">Additional Charges</Label>
                  <Input
                    id="additional_charges"
                    type="number"
                    step="0.01"
                    value={formData.additional_charges}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional_charges: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Bill Summary
              </h3>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(taxCalculation.subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Freight Total:</span>
                  <span>{formatCurrency(taxCalculation.freight_total)}</span>
                </div>
                
                {parseFloat(formData.additional_charges) > 0 && (
                  <div className="flex justify-between">
                    <span>Additional Charges:</span>
                    <span>{formatCurrency(parseFloat(formData.additional_charges))}</span>
                  </div>
                )}
                
                {parseFloat(formData.discount_amount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(parseFloat(formData.discount_amount))}</span>
                  </div>
                )}
                
                <div className="flex justify-between border-t pt-1">
                  <span>Taxable Amount:</span>
                  <span>{formatCurrency(taxCalculation.taxable_amount)}</span>
                </div>
                
                {!formData.is_interstate ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST ({parseFloat(formData.gst_rate) / 2}%):</span>
                      <span>{formatCurrency(taxCalculation.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({parseFloat(formData.gst_rate) / 2}%):</span>
                      <span>{formatCurrency(taxCalculation.sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST ({formData.gst_rate}%):</span>
                    <span>{formatCurrency(taxCalculation.igst)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(taxCalculation.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Vendor invoice number"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional notes about this bill"
                rows={3}
              />
            </div>
          </div>

            </div>

            {/* Footer - Fixed at bottom */}
            <div className="flex-none bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Bill'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText,
  User,
  Calculator,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { CartItem, CreateQuoteRequest, EMIPlan } from "@/services/CartService";
import { QuoteService } from "@/services/QuoteService";
import { BillingCustomer } from "./CustomerForm";
import { formatPrice } from "@/utils/billing";

interface QuoteCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quoteId: string) => void;
  cartItems: CartItem[];
  customer: BillingCustomer;
  emiPlan?: EMIPlan;
}

interface QuoteFormData {
  valid_until: string;
  billing_address: string;
  shipping_address: string;
  customer_notes: string;
  internal_notes: string;
  probability_percentage: number;
  expected_close_date: string;
  discount_percentage: number;
  discount_amount: number;
  freight_charges: number;
  emi_enabled: boolean;
}

export const QuoteCreationModal: React.FC<QuoteCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cartItems,
  customer,
  emiPlan
}) => {
  const [formData, setFormData] = useState<QuoteFormData>({
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
    billing_address: customer.address || '',
    shipping_address: customer.address || '',
    customer_notes: '',
    internal_notes: '',
    probability_percentage: 50,
    expected_close_date: '',
    discount_percentage: 0,
    discount_amount: 0,
    freight_charges: 0,
    emi_enabled: !!emiPlan
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
  const additional_discount = (subtotal * formData.discount_percentage / 100) + formData.discount_amount;
  const freight = formData.freight_charges || (subtotal > 50000 ? 0 : 2000);
  const tax_amount = (subtotal - additional_discount) * 0.18;
  const total = subtotal - additional_discount + tax_amount + freight;
  const final_total = formData.emi_enabled && emiPlan ? emiPlan.total_amount : total;

  const handleInputChange = (field: keyof QuoteFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.valid_until) {
      newErrors.valid_until = 'Valid until date is required';
    } else if (new Date(formData.valid_until) <= new Date()) {
      newErrors.valid_until = 'Valid until date must be in the future';
    }

    if (!formData.billing_address.trim()) {
      newErrors.billing_address = 'Billing address is required';
    }

    if (!formData.shipping_address.trim()) {
      newErrors.shipping_address = 'Shipping address is required';
    }

    if (formData.probability_percentage < 0 || formData.probability_percentage > 100) {
      newErrors.probability_percentage = 'Probability must be between 0 and 100';
    }

    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      newErrors.discount_percentage = 'Discount percentage must be between 0 and 100';
    }

    if (formData.discount_amount < 0) {
      newErrors.discount_amount = 'Discount amount cannot be negative';
    }

    if (formData.freight_charges < 0) {
      newErrors.freight_charges = 'Freight charges cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!customer.id) {
      setErrors({ general: 'Customer information is required' });
      return;
    }

    if (cartItems.length === 0) {
      setErrors({ general: 'Cart items are required' });
      return;
    }

    setIsSubmitting(true);

    try {
      const quoteRequest: CreateQuoteRequest = {
        customer_id: customer.id,
        sales_representative_id: 'current-user-id', // Get from auth context
        cart_items: cartItems,
        quote_details: {
          valid_until: new Date(formData.valid_until),
          billing_address: formData.billing_address,
          shipping_address: formData.shipping_address,
          customer_notes: formData.customer_notes,
          internal_notes: formData.internal_notes,
          probability_percentage: formData.probability_percentage,
          expected_close_date: formData.expected_close_date ? new Date(formData.expected_close_date) : undefined
        },
        pricing_options: {
          discount_percentage: formData.discount_percentage,
          discount_amount: formData.discount_amount,
          freight_charges: formData.freight_charges,
          emi_enabled: formData.emi_enabled,
          emi_plan: emiPlan
        }
      };

      const quote = await QuoteService.createQuoteFromCart(quoteRequest);
      onSuccess(quote.id);
      onClose();

    } catch (error) {
      console.error('Failed to create quote:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create quote. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Quote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{errors.general}</span>
            </div>
          )}

          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{customer.name}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Items</Label>
                  <div className="mt-1">
                    <span className="font-medium">{cartItems.length} items</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Discount:</span>
                  <span>-{formatPrice(additional_discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18% GST):</span>
                  <span>{formatPrice(tax_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freight Charges:</span>
                  <span>{formatPrice(freight)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(final_total)}</span>
                </div>
                {formData.emi_enabled && emiPlan && (
                  <div className="flex justify-between text-blue-600">
                    <span>EMI Monthly:</span>
                    <span>{formatPrice(emiPlan.monthly_amount)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valid_until">Valid Until *</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => handleInputChange('valid_until', e.target.value)}
                    className={errors.valid_until ? 'border-red-500' : ''}
                  />
                  {errors.valid_until && (
                    <span className="text-red-500 text-sm">{errors.valid_until}</span>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability_percentage}
                    onChange={(e) => handleInputChange('probability_percentage', parseInt(e.target.value) || 0)}
                    className={errors.probability_percentage ? 'border-red-500' : ''}
                  />
                  {errors.probability_percentage && (
                    <span className="text-red-500 text-sm">{errors.probability_percentage}</span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="expected_close_date">Expected Close Date</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => handleInputChange('expected_close_date', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount_percentage">Additional Discount (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.discount_percentage}
                    onChange={(e) => handleInputChange('discount_percentage', parseFloat(e.target.value) || 0)}
                    className={errors.discount_percentage ? 'border-red-500' : ''}
                  />
                  {errors.discount_percentage && (
                    <span className="text-red-500 text-sm">{errors.discount_percentage}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="discount_amount">Additional Discount (₹)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
                    className={errors.discount_amount ? 'border-red-500' : ''}
                  />
                  {errors.discount_amount && (
                    <span className="text-red-500 text-sm">{errors.discount_amount}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="freight_charges">Freight Charges (₹)</Label>
                  <Input
                    id="freight_charges"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.freight_charges}
                    onChange={(e) => handleInputChange('freight_charges', parseFloat(e.target.value) || 0)}
                    className={errors.freight_charges ? 'border-red-500' : ''}
                  />
                  {errors.freight_charges && (
                    <span className="text-red-500 text-sm">{errors.freight_charges}</span>
                  )}
                </div>
              </div>

              {emiPlan && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emi_enabled"
                    checked={formData.emi_enabled}
                    onChange={(e) => handleInputChange('emi_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                    aria-label="Enable EMI Options"
                  />
                  <Label htmlFor="emi_enabled" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Enable EMI Options ({emiPlan.tenure_months} months @ {emiPlan.interest_rate}%)
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="billing_address">Billing Address *</Label>
                <Textarea
                  id="billing_address"
                  value={formData.billing_address}
                  onChange={(e) => handleInputChange('billing_address', e.target.value)}
                  className={errors.billing_address ? 'border-red-500' : ''}
                  rows={3}
                />
                {errors.billing_address && (
                  <span className="text-red-500 text-sm">{errors.billing_address}</span>
                )}
              </div>

              <div>
                <Label htmlFor="shipping_address">Shipping Address *</Label>
                <Textarea
                  id="shipping_address"
                  value={formData.shipping_address}
                  onChange={(e) => handleInputChange('shipping_address', e.target.value)}
                  className={errors.shipping_address ? 'border-red-500' : ''}
                  rows={3}
                />
                {errors.shipping_address && (
                  <span className="text-red-500 text-sm">{errors.shipping_address}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer_notes">Customer Notes</Label>
                <Textarea
                  id="customer_notes"
                  value={formData.customer_notes}
                  onChange={(e) => handleInputChange('customer_notes', e.target.value)}
                  placeholder="Notes visible to customer"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="internal_notes">Internal Notes</Label>
                <Textarea
                  id="internal_notes"
                  value={formData.internal_notes}
                  onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                  placeholder="Internal notes for team reference"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Quote...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Quote
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteCreationModal;

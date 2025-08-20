import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { 
  X, 
  Printer, 
  Download, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Percent, 
  Truck, 
  CreditCard,
  Package,
  User,
  Building,
  FileText,
  Edit,
  Check,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { Quote } from '@/types';

interface QuoteItem {
  id?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: string;
    image_url?: string;
  };
  description?: string;
  sku?: string;
  quantity?: number;
  unit_price?: number;
  specifications?: string;
}

interface QuoteDetailsProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (quote: Quote) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}

export default function QuoteDetails({
  quote,
  isOpen,
  onClose,
  onEdit,
  formatCurrency,
  getStatusColor
}: QuoteDetailsProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!quote) return null;

  const handleImageError = (productId: string) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Quote #${quote.id?.slice(-8)} - ${quote.customer}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
                .header { border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 20px; }
                .company-info { text-align: right; }
                .quote-details { margin-bottom: 20px; }
                .products-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .products-table th, .products-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .products-table th { background-color: #f8f9fa; font-weight: bold; }
                .totals { margin-top: 20px; text-align: right; }
                .footer { margin-top: 40px; border-top: 1px solid #e5e5e5; padding-top: 20px; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } .no-print { display: none; } }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'confirmed':
        return <Check className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Quote #{quote.id?.slice(-8)}
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Created on {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(quote.status || '')} flex items-center gap-1`}>
                {getStatusIcon(quote.status || '')}
                {quote.status}
              </Badge>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={handlePrint} className="no-print">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="no-print">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="no-print">
                  <Mail className="h-4 w-4" />
                </Button>
                {onEdit && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEdit(quote)}
                    className="no-print"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto max-h-[70vh]">
          <div ref={printRef} className="p-6 space-y-6">
            {/* Header Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 header">
              {/* Company Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Al Rams Furniture ERP
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Arakkal, Pattambi Road, Perumpilavu, Thrissur, Kerala, 680519
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    +91 9645075858 | +91 8606056999
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    www.alramsfurnitures.com
                  </p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-3 company-info">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Customer Details
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{quote.customer}</p>
                  <p className="text-gray-600">Customer ID: {quote.customer_id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Quote Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 quote-details">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-600 bg-blue-50 rounded-lg p-2" />
                    <div>
                      <p className="text-sm text-gray-600">Quote Date</p>
                      <p className="font-semibold">{quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-orange-600 bg-orange-50 rounded-lg p-2" />
                    <div>
                      <p className="text-sm text-gray-600">Valid Until</p>
                      <p className="font-semibold">
                        {quote.created_at ? 
                          new Date(new Date(quote.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : 
                          '30 Days'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-green-600 bg-green-50 rounded-lg p-2" />
                    <div>
                      <p className="text-sm text-gray-600">Reference</p>
                      <p className="font-semibold">{`QT-${quote.id?.slice(-6)}`}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Products Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Products & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map((item: QuoteItem, index: number) => (
                      <div key={index} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                            {item.product?.image_url && !imageErrors[item.product.id] ? (
                              <Image
                                src={item.product.image_url}
                                alt={item.product?.name || item.description || 'Product'}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={() => handleImageError(item.product?.id || '')}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {item.product?.name || item.description || 'Product'}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                SKU: {item.product?.sku || item.sku || 'N/A'}
                              </p>
                              {item.product?.category && (
                                <p className="text-sm text-gray-500">
                                  Category: {item.product.category}
                                </p>
                              )}
                              {item.specifications && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.specifications}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                {item.quantity || 1} × {formatCurrency(item.unit_price || 0)}
                              </p>
                              <p className="font-semibold text-lg">
                                {formatCurrency((item.quantity || 1) * (item.unit_price || 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No products added to this quote</p>
                    </div>
                  )}
                </div>

                {/* Products Table for Print */}
                <div className="hidden print:block mt-6">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>SKU</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items?.map((item: QuoteItem, index: number) => (
                        <tr key={index}>
                          <td>{item.product?.name || item.description || 'Product'}</td>
                          <td>{item.product?.sku || item.sku || 'N/A'}</td>
                          <td>{item.quantity || 1}</td>
                          <td>{formatCurrency(item.unit_price || 0)}</td>
                          <td>{formatCurrency((item.quantity || 1) * (item.unit_price || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 totals">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {formatCurrency(quote.total_price || 0)}
                    </span>
                  </div>

                  {(quote.discount_amount || 0) > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span className="flex items-center gap-1">
                        <Percent className="h-4 w-4" />
                        Discount:
                      </span>
                      <span className="font-medium">
                        -{formatCurrency(quote.discount_amount || 0)}
                      </span>
                    </div>
                  )}

                  {(quote.freight_charges || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <Truck className="h-4 w-4" />
                        Freight:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.freight_charges || 0)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">
                      {formatCurrency(quote.final_price || quote.total_price || 0)}
                    </span>
                  </div>

                  {quote.emi_enabled && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">EMI Available</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Monthly Payment: {formatCurrency(quote.emi_monthly || 0)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {quote.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Additional Notes:</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="footer text-center text-gray-500">
              <p>Thank you for your business!</p>
              <p>Al Rams Furniture ERP - Your trusted furniture partner</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhatsAppDialog } from './WhatsAppDialog';
import { 
  Printer, 
  Download, 
  Package, 
  User, 
  MapPin, 
  Building2,
  Phone,
  Mail,
  FileText,
  Hash,
  Truck,
  UserCheck,
  MessageCircle,
  Image as ImageIcon,
  Receipt
} from 'lucide-react';

interface OrderDetailsProps {
  order: Order;
}

interface OrderItemDetailed {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  price?: number;
  supplier_name?: string;
  product_id?: string;
  sku?: string;
  discount_percentage?: number;
  cost?: number;
}

interface DetailedOrder {
  id: string;
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  sales_representative?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  address?: string;
  expected_delivery_date?: string;
  notes?: string;
  emi_enabled?: boolean;
  freight_charges?: number;
  items: OrderItemDetailed[];
  status: string;
  total?: number;
  final_price?: number;
  original_price?: number;
  discount_amount?: number;
  date?: string;
  created_at?: string;
  quote_id?: string;
}

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
    case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'ready_for_delivery': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order: initialOrder }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<DetailedOrder>(initialOrder as unknown as DetailedOrder);
  const [loading, setLoading] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    totalPaid: number;
    balanceDue: number;
    paymentStatus: string;
    paymentCount: number;
    lastPaymentDate?: string;
  } | null>(null);

  // Helper function to fetch payment information
  const fetchPaymentInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/sales/orders/${initialOrder.id}/payment-summary`);
      if (!response.ok) {
        console.log('Payment summary not available');
        return null;
      }
      
      const paymentSummary = await response.json();
      return {
        totalPaid: paymentSummary.total_paid || 0,
        balanceDue: paymentSummary.balance_due || 0,
        paymentStatus: paymentSummary.payment_status || 'pending',
        paymentCount: paymentSummary.payment_count || 0,
        lastPaymentDate: paymentSummary.last_payment_date
      };
    } catch (error) {
      console.error('Error fetching payment info:', error);
      return null;
    }
  }, [initialOrder.id]);

  // Fetch detailed order information
  useEffect(() => {
    const fetchDetailedOrder = async () => {
      if (!initialOrder.id) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/sales/orders/${initialOrder.id}`);
        if (response.ok) {
          const detailedOrder = await response.json();
          setOrder(detailedOrder);
        }

        // Fetch payment information
        const paymentData = await fetchPaymentInfo();
        setPaymentInfo(paymentData);
      } catch (error) {
        console.error('Error fetching detailed order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedOrder();
  }, [initialOrder.id, fetchPaymentInfo]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 0.5in;
        }
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          font-size: 11px;
          line-height: 1.3;
        }
        .no-print { display: none !important; }
        .print-break { page-break-before: always; }
        table { 
          page-break-inside: avoid; 
          font-size: 10px;
        }
        .print-full-width { width: 100% !important; max-width: none !important; }
        .print-compact { 
          padding: 8px !important; 
          margin: 4px 0 !important;
        }
        .text-sm { font-size: 10px !important; }
        .text-xs { font-size: 9px !important; }
        .space-y-2 > * + * { margin-top: 4px !important; }
        .space-y-1 > * + * { margin-top: 2px !important; }
        h1, h2, h3, h4, h5 { 
          margin: 8px 0 4px 0 !important; 
          line-height: 1.2 !important;
        }
        .bg-gray-50, .bg-yellow-50 { 
          background-color: #f9fafb !important; 
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .border-t, .border-b { 
          border-width: 1px !important; 
        }
      }
    `;
    document.head.appendChild(style);

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handleDownload = () => {
    if (!printRef.current) return;
    const element = document.createElement('a');
    const file = new Blob([`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Order Invoice - ${order.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
          .no-print { display: none; }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `Invoice_${order.id}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadPDF = async () => {
    try {
      // Fetch payment information
      const paymentInfo = await fetchPaymentInfo();

      // Format data for PDF generation
      const billData = {
        customerName: order.customer?.name || 'Unknown Customer',
        customerPhone: order.customer?.phone || 'N/A',
        orderNumber: order.id?.slice(0, 8) || 'N/A',
        items: order.items?.map(item => ({
          name: item.name || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.unit_price || item.final_price || item.price || 0,
          total: item.final_price || (item.quantity || 0) * (item.unit_price || item.price || 0)
        })) || [],
        subtotal: order.original_price || order.total || 0,
        discount: order.discount_amount || 0,
        total: order.final_price || order.total || 0,
        companyName: 'FurniFlow ERP',
        companyPhone: '+91 9645075858 | +91 8606056999 | +91 9747141858',
        companyAddress: '',
        paymentInfo: paymentInfo || undefined
      };
      
      const { WhatsAppService } = await import('@/lib/whatsappService');
      await WhatsAppService.downloadInvoicePDF(billData);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Please try again.');
    }
  };

  const handleSendWhatsApp = () => {
    setWhatsappDialogOpen(true);
  };

  const handleWhatsAppSend = async (phoneNumber: string, sendAsText: boolean) => {
    setWhatsappLoading(true);
    try {
      console.log('Starting WhatsApp send process...', { phoneNumber, sendAsText });
      
      // Fetch payment information
      const paymentInfo = await fetchPaymentInfo();
      console.log('Payment info fetched:', paymentInfo);

      // Format data for WhatsApp
      const billData = {
        customerName: order.customer?.name || 'Unknown Customer',
        customerPhone: phoneNumber,
        orderNumber: order.id?.slice(0, 8) || 'N/A',
        items: order.items?.map(item => ({
          name: item.name || 'Unknown Product',
          quantity: item.quantity || 0,
          price: item.unit_price || item.final_price || item.price || 0,
          total: item.final_price || (item.quantity || 0) * (item.unit_price || item.price || 0)
        })) || [],
        subtotal: order.original_price || order.total || 0,
        discount: order.discount_amount || 0,
        total: order.final_price || order.total || 0,
        companyName: 'FurniFlow ERP',
        companyPhone: '+91 9645075858 | +91 8606056999 | +91 9747141858',
        companyAddress: '',
        paymentInfo: paymentInfo || undefined
      };
      
      console.log('Bill data prepared:', billData);
      
      const { WhatsAppService } = await import('@/lib/whatsappService');
      console.log('WhatsApp service imported');
      
      let result;
      if (sendAsText) {
        console.log('Sending as text...');
        result = await WhatsAppService.sendBillAsText(phoneNumber, billData);
      } else {
        console.log('Sending as PDF...');
        result = await WhatsAppService.sendBillAsPDF(phoneNumber, billData);
      }
      
      console.log('WhatsApp send result:', result);
      
      if (result.success) {
        alert(result.message);
        setWhatsappDialogOpen(false);
      } else {
        alert(`Failed to send WhatsApp: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error sending WhatsApp: ${errorMessage}. Please try again.`);
    } finally {
      setWhatsappLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading order details...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Fixed Action Bar */}
        <div className="flex-shrink-0 flex justify-end gap-3 p-4 bg-white border-b no-print">
        <Button onClick={handlePrint} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="border-blue-600 text-blue-600 hover:bg-blue-50">
          <Download className="h-4 w-4 mr-2" />
          Download HTML
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="border-purple-600 text-purple-600 hover:bg-purple-50">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button onClick={handleSendWhatsApp} size="sm" className="bg-green-600 hover:bg-green-700">
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div ref={printRef} className="bg-white">
          {/* Compact Invoice Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">ESTIMATE</h1>
                  <p className="text-blue-100 text-sm">FurniFlow ERP</p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <div className="text-blue-100 text-xs font-medium">Invoice #</div>
                  <div className="font-mono text-sm font-bold">
                    INV-{order.id?.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-blue-100 text-xs mt-1">
                    {formatDate(order.date || order.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company & Customer Information - Compact */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print-compact p-4 bg-gray-50 text-sm">
            {/* Company Information */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-sm text-gray-900">FurniFlow ERP</h3>
              </div>
              <div className="space-y-1 text-xs text-gray-700">
                <p className="flex items-center">
                  <Phone className="h-3 w-3 mr-1 text-gray-500" />
                  +91 9645075858 | +91 8606056999 | +91 9747141858
                </p>
              </div>
            </div>

            {/* Customer Information */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-green-600" />
                <h3 className="font-bold text-sm text-gray-900">Bill To</h3>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="space-y-1">
                  <p className="font-bold text-sm text-gray-900">
                    {order.customer?.name || order.customers?.name || 'Customer Name Not Available'}
                  </p>
                  {(order.customer?.phone || order.customers?.phone) && (
                    <p className="flex items-center text-xs text-gray-700">
                      <Phone className="h-3 w-3 mr-1 text-gray-500" />
                      {order.customer?.phone || order.customers?.phone}
                    </p>
                  )}
                  {(order.customer?.email || order.customers?.email) && (
                    <p className="flex items-center text-xs text-gray-700">
                      <Mail className="h-3 w-3 mr-1 text-gray-500" />
                      {order.customer?.email || order.customers?.email}
                    </p>
                  )}
                  {(order.address || order.customer?.address || order.customers?.address) && (
                    <p className="flex items-start text-xs text-gray-700">
                      <MapPin className="h-3 w-3 mr-1 mt-0.5 text-gray-500 flex-shrink-0" />
                      <span className="whitespace-pre-line">
                        {order.address || order.customer?.address || order.customers?.address}
                        {(order.customer?.city || order.customers?.city) && `, ${order.customer?.city || order.customers?.city}`}
                        {(order.customer?.state || order.customers?.state) && `, ${order.customer?.state || order.customers?.state}`}
                        {(order.customer?.pincode || order.customers?.pincode) && ` - ${order.customer?.pincode || order.customers?.pincode}`}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Info - Compact Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <Badge className={`mt-1 text-xs ${getStatusColor(order.status)}`}>
                    {order.status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {order.quote_id && (
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Quote Ref</p>
                    <p className="font-mono text-xs font-medium">QT-{order.quote_id.slice(0, 6)}</p>
                  </div>
                </div>
              </div>
            )}

            {order.expected_delivery_date && (
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Delivery</p>
                    <p className="text-xs font-medium">{formatDate(order.expected_delivery_date)}</p>
                  </div>
                </div>
              </div>
            )}

            {order.sales_representative && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-600">Sales Rep</p>
                    <p className="text-xs font-medium">{order.sales_representative.name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items Table - Optimized for space */}
          <div className="print-compact p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Order Items</h3>
              <div className="text-xs text-gray-500">
                {order.items?.length || 0} item(s)
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 text-xs truncate">
                              {item.name || 'Unknown Product'}
                            </div>
                            {item.supplier_name && (
                              <div className="text-xs text-gray-500 truncate">
                                {item.supplier_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span className="font-mono bg-gray-100 px-1 py-1 rounded text-xs">
                          {item.sku || 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex items-center px-1 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-xs">
                        {formatCurrency(item.unit_price || item.price || 0)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {item.discount_percentage ? (
                          <span className="text-green-600 font-medium text-xs">
                            {item.discount_percentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-xs">
                        {formatCurrency(item.final_price || (item.unit_price || item.price || 0) * item.quantity)}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No items found in this order</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary with Payment Information - Compact */}
          <div className="bg-gray-50 print-compact p-4 border-t border-gray-200">
            <div className="max-w-md ml-auto">
              <h4 className="font-bold text-base text-gray-900 mb-3">Order Summary</h4>
              <div className="space-y-1 text-sm">
                {order.original_price && order.original_price !== order.final_price && (
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="line-through">{formatCurrency(order.original_price)}</span>
                  </div>
                )}
                {order.discount_amount && order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount Applied:</span>
                    <span className="font-medium">-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                {order.freight_charges && order.freight_charges > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Freight Charges:</span>
                    <span>{formatCurrency(order.freight_charges)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">
                    {formatCurrency(order.final_price || order.total || 0)}
                  </span>
                </div>
                
                {/* Payment Information */}
                {paymentInfo && (
                  <div className="mt-4 pt-3 border-t border-gray-300">
                    <h5 className="font-bold text-sm text-gray-900 mb-2">Payment Details</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>Payment Status:</span>
                        <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                          paymentInfo.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          paymentInfo.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {paymentInfo.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Amount Paid:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(paymentInfo.totalPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Balance Due:</span>
                        <span className={`font-medium ${paymentInfo.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(paymentInfo.balanceDue)}
                        </span>
                      </div>
                      {paymentInfo.paymentCount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Payments Made:</span>
                          <span className="font-medium">{paymentInfo.paymentCount}</span>
                        </div>
                      )}
                      {paymentInfo.lastPaymentDate && (
                        <div className="flex justify-between text-gray-600">
                          <span>Last Payment:</span>
                          <span className="font-medium">{formatDate(paymentInfo.lastPaymentDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Information - No Print - Removed Payment Button */}
          <div className="no-print">
            {/* Payment button removed per request - payments will be managed from finance tab */}
          </div>

          {/* Notes Section - Compact */}
          {order.notes && (
            <div className="print-compact p-4 bg-yellow-50 border-t border-yellow-200">
              <h4 className="font-bold text-gray-900 mb-2 flex items-center text-sm">
                <FileText className="h-4 w-4 mr-2 text-yellow-600" />
                Order Notes
              </h4>
              <p className="text-gray-700 text-xs bg-white p-2 rounded-lg border border-yellow-200">
                {order.notes}
              </p>
            </div>
          )}

          {/* Compact Footer */}
          <div className="bg-gray-900 text-white print-compact p-3 text-center">
            <p className="text-xs">Thank you for your business!</p>
            <p className="text-xs text-gray-400 mt-1">
              Generated on {new Date().toLocaleDateString('en-IN')} by FurniFlow ERP
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* WhatsApp Dialog */}
      <WhatsAppDialog
        isOpen={whatsappDialogOpen}
        onClose={() => setWhatsappDialogOpen(false)}
        onSend={handleWhatsAppSend}
        customerName={order.customer?.name}
        customerPhone={order.customer?.phone}
        orderNumber={order.id?.slice(0, 8)}
        isLoading={whatsappLoading}
      />
    </>
  );
};

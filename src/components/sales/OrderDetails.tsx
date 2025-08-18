'use client';

import React, { useRef } from 'react';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Package, Calendar, User, MapPin, DollarSign, TrendingUp } from 'lucide-react';

interface OrderDetailsProps {
  order: Order;
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

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handleDownload = () => {
    if (!printRef.current) return;
    const element = document.createElement('a');
    const file = new Blob([printRef.current.innerHTML], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `Order_${order.id}.html`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="space-y-4 py-4 text-sm">
      <div className="flex justify-end gap-2 no-print">
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>

      <div
        ref={printRef}
        className="border rounded-lg bg-white text-gray-900 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Invoice</h2>
              <p className="text-gray-600">Professional Sales Order Document</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Order #</div>
              <div className="font-mono text-lg font-bold text-purple-600">
                {order.id.slice(0, 12)}
              </div>
            </div>
          </div>
        </div>

        {/* Order Info Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                Order Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500 text-sm">Order Date:</span>
                    <p className="font-medium">{formatDate(order.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500 text-sm">Status:</span>
                    <Badge 
                      className={`ml-2 ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
                {order.quote_id && (
                  <div>
                    <span className="text-gray-500 text-sm">Related Quote:</span>
                    <p className="font-medium font-mono">{order.quote_id}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                Customer Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-gray-500 text-sm">Customer Name:</span>
                    <p className="font-medium">{order.customer}</p>
                  </div>
                </div>
                {order.deliveryAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <span className="text-gray-500 text-sm">Delivery Address:</span>
                      <p className="font-medium">{order.deliveryAddress}</p>
                    </div>
                  </div>
                )}
                {order.deliveryDate && (
                  <div>
                    <span className="text-gray-500 text-sm">Delivery Date:</span>
                    <p className="font-medium">{formatDate(order.deliveryDate)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                Pricing Summary
              </h3>
              <div className="space-y-3">
                {order.original_price && order.original_price !== order.final_price && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-gray-500 text-sm">Original Amount:</span>
                      <p className="text-gray-500 line-through">{formatCurrency(order.original_price)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <span className="text-gray-500 text-sm">Final Amount:</span>
                    <p className="font-bold text-xl text-green-600">
                      {formatCurrency(order.final_price || order.total || 0)}
                    </p>
                  </div>
                </div>
                {order.discount_amount && order.discount_amount > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <span className="text-green-700 text-sm font-medium">Total Savings:</span>
                      <p className="font-bold text-green-700">{formatCurrency(order.discount_amount)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {item.name || 'Unknown Product'}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Item #{idx + 1}</span>
                          {item.supplier_name && (
                            <span>Supplier: {item.supplier_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency((item.price || 0) * item.quantity)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.quantity} × {formatCurrency(item.price || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No items in this order</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="mt-8 border-t pt-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Order Summary</h4>
                <div className="space-y-2">
                  {order.original_price && order.original_price !== order.final_price && (
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span className="line-through">{formatCurrency(order.original_price)}</span>
                    </div>
                  )}
                  {order.discount_amount && order.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-{formatCurrency(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(order.final_price || order.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

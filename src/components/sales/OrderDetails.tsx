'use client';

import React, { useRef } from 'react';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

interface OrderDetailsProps {
  order: Order;
}

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
        className="border rounded-lg p-6 bg-white text-gray-900"
      >
        <h2 className="text-xl font-bold mb-4">Order Invoice</h2>

        <div className="grid grid-cols-2 gap-y-2 gap-x-8 mb-6">
          <div>
            <span className="font-semibold text-gray-500">Order ID:</span>
            <p>{order.id}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Order Date:</span>
            <p>{order.date}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Customer:</span>
            <p>{order.customer}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Status:</span>
            <p>{order.status}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Related Quote:</span>
            <p>{order.quote_id || 'N/A'}</p>
          </div>
          <div>
            <span className="font-semibold text-gray-500">Total Amount:</span>
            <p className="font-bold">${order.total.toFixed(2)}</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2">Items</h3>
        <table className="w-full text-left border-t border-b">
          <thead>
            <tr className="border-b">
              <th className="py-2">#</th>
              <th className="py-2">Product</th>
              <th className="py-2 no-print">Supplier</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit Price</th>
              <th className="py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="py-1">{idx + 1}</td>
                <td className="py-1">{item.name}</td>
                <td className="py-1 no-print">{item.supplier_name || 'N/A'}</td>
                <td className="py-1">{item.quantity}</td>
                <td className="py-1">
                  ${item.price?.toFixed(2) || '0.00'}
                </td>
                <td className="py-1">
                  ${((item.price || 0) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

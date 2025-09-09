'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, User, Building2, DollarSign, Package, Truck } from 'lucide-react';
import { PurchaseOrder } from '@/types';
import { formatDate } from '@/lib/utils';

interface PurchaseOrderListProps {
  orders: PurchaseOrder[];
  onViewDetails: (order: PurchaseOrder) => void;
  onUpdateStatus: (order: PurchaseOrder) => void;
  loading?: boolean;
}

export function PurchaseOrderList({ 
  orders, 
  onViewDetails, 
  onUpdateStatus,
  loading = false 
}: PurchaseOrderListProps) {
  
  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading purchase orders...</span>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'received':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200">
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Expected Delivery
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Product
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sales Rep
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="font-medium">No purchase orders found</p>
                        <p className="text-sm">Create your first purchase order to get started</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow 
                    key={order.id} 
                    className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200 cursor-pointer group"
                    onClick={() => onViewDetails(order)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {order.sales_order?.customer?.[0]?.name || 
                           order.sales_order?.customer_name || 
                           'N/A'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {(() => {
                            const customer = order.sales_order?.customer?.[0];
                            if (!customer) return 'No Customer Data';
                            
                            const addressParts = [
                              customer.address,
                              customer.city,
                              customer.state,
                              customer.pincode
                            ].filter(Boolean);
                            
                            return addressParts.length > 0 ? addressParts.join(', ') : 'No Address';
                          })()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {order.sales_order?.expected_delivery_date ? 
                           formatDate(order.sales_order.expected_delivery_date) : 
                           'Not Set'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {order.supplier?.name || 'Unknown Supplier'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ID: {order.supplier_id?.split('-')[0]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {order.product?.name || order.product_name || order.custom_type || order.description || 'Custom Product'}
                        </span>
                        {order.is_custom && (
                          <Badge variant="outline" className="w-fit mt-1 text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.quantity?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        ₹{(order.total || 0).toLocaleString('en-IN', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={getStatusBadgeClass(order.status)}
                          variant="secondary"
                        >
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(order);
                          }}
                          className="h-6 w-6 p-0 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Update status"
                        >
                          ↻
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {order.sales_order?.sales_rep?.[0]?.name || 
                           order.creator?.name || 
                           'Unknown Sales Rep'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {order.created_at ? formatDate(order.created_at) : 'Unknown'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
  );
}

'use client';
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2, ShoppingCart, Package, Calendar, DollarSign, MapPin, User } from "lucide-react";
import { Order } from "@/types";

// Helper function (assuming it's defined elsewhere, e.g., in a utils file)
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function OrderSection({
  orderSearch, setOrderSearch,
  orderDate, setOrderDate,
  filteredOrders,
  onViewOrder, onEditOrder, onDeleteOrder
}: {
  orderSearch: string;
  setOrderSearch: (v: string) => void;
  orderDate: string;
  setOrderDate: (v: string) => void;
  filteredOrders: Order[];
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
}) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100/50">
        <div>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Sales Orders
          </CardTitle>
          <CardDescription className="text-gray-600">Confirmed orders from converted quotes.</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Input 
            placeholder="Search by customer or ID..." 
            value={orderSearch} 
            onChange={(e) => setOrderSearch(e.target.value)}
            className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg"
          />
          <Input 
            type="date" 
            value={orderDate} 
            onChange={(e) => setOrderDate(e.target.value)} 
            className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg pl-3 pr-12 sm:w-auto" 
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100">
                  <TableHead className="w-[100px] font-semibold text-gray-700">Order</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer & Items</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold text-gray-700">Pricing Details</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-gray-700">Date & Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                  <TableRow key={o.id} className="hover:bg-white/60 transition-colors duration-200 group">
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          #{o.id.slice(0, 8)}
                        </div>
                        {o.quote_id && (
                          <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Package className="h-3 w-3" />
                            <span>Quote: {o.quote_id.slice(0, 6)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{o.customer?.name || 'Unknown Customer'}</span>
                        </div>
                        {o.items && o.items.length > 0 && (
                          <div className="space-y-2">
                            {o.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {item.name || 'Unknown Product'}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>Qty: {item.quantity}</span>
                                    <span>Price: {formatCurrency(item.price || 0)}</span>
                                    {item.supplier_name && (
                                      <span>Supplier: {item.supplier_name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {o.items.length > 2 && (
                              <div className="text-xs text-gray-500 text-center py-1">
                                +{o.items.length - 2} more items
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-4">
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          {o.original_price && o.original_price !== o.final_price && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Original:</span>
                              <span className="text-sm text-gray-500 line-through">
                                {formatCurrency(o.original_price)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-bold text-lg text-gray-900">
                              {formatCurrency(o.final_price || o.total || 0)}
                            </span>
                          </div>
                          {o.discount_amount && o.discount_amount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded text-green-700">
                              <span className="text-xs font-medium">
                                Saved: {formatCurrency(o.discount_amount)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{formatDate(o.date)}</span>
                        </div>
                        <Badge 
                          className={`${
                            o.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                            o.status === 'draft' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            o.status === 'shipped' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          } border`}
                        >
                          {o.status === 'confirmed' ? 'Confirm' : 
                           o.status === 'draft' ? 'Draft' : 
                           o.status === 'shipped' ? 'Shipped' : 
                           o.status === 'delivered' ? 'Delivered' : 
                           String(o.status).charAt(0).toUpperCase() + String(o.status).slice(1)}
                        </Badge>
                        {o.deliveryAddress && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{o.deliveryAddress}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onViewOrder(o)}
                          className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                          title="View Order Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEditOrder(o)}
                          className="h-8 w-8 hover:bg-green-100 hover:text-green-600 transition-colors duration-200"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-600 transition-colors duration-200" 
                          onClick={() => onDeleteOrder(o.id)}
                          title="Delete Order"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="h-8 w-8 text-purple-400" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-gray-500 font-medium text-lg">No orders found</p>
                          <p className="text-gray-400 text-sm max-w-sm">
                            Orders will appear here when quotes are approved and converted to sales orders
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Edit, Trash2, ShoppingCart } from "lucide-react";
import { Order } from "@/types";

// Helper function (assuming it's defined elsewhere, e.g., in a utils file)
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export function OrderSection({
  orderSearch, setOrderSearch,
  orderDate, setOrderDate,
  filteredOrders,
  onViewOrder, onEditOrder, onDeleteOrder,
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
                  <TableHead className="w-[80px] font-semibold text-gray-700">Order ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="hidden md:table-cell text-right font-semibold text-gray-700">Total</TableHead>
                  <TableHead className="hidden sm:table-cell font-semibold text-gray-700">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                  <TableRow key={o.id} className="hover:bg-white/60 transition-colors duration-200">
                    <TableCell className="font-mono text-xs text-gray-600">{o.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium text-gray-900">{o.customer}</TableCell>
                    <TableCell className="hidden md:table-cell text-right font-semibold text-gray-900">{formatCurrency(o.total || 0)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-600">{formatDate(o.date)}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`${
                          o.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                          o.status === 'draft' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          o.status === 'shipped' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        } border`}
                      >
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onViewOrder(o)}
                          className="h-8 w-8 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEditOrder(o)}
                          className="h-8 w-8 hover:bg-green-100 hover:text-green-600 transition-colors duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-red-100 hover:text-red-600 transition-colors duration-200" 
                          onClick={() => onDeleteOrder(o.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No orders found</p>
                        <p className="text-gray-400 text-sm">Orders will appear here when quotes are approved</p>
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

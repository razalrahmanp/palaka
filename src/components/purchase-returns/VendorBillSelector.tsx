'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Receipt, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  remaining_amount: number;
  status: string;
  vendor: {
    id: string;
    name: string;
    email?: string;
  };
  vendor_bill_line_items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    total_returned_quantity?: number;
  }[];
}

interface VendorBillSelectorProps {
  onBillSelect: (bill: VendorBill) => void;
  selectedBillId?: string;
}

export default function VendorBillSelector({ onBillSelect, selectedBillId }: VendorBillSelectorProps) {
  const [bills, setBills] = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorBills();
  }, []);

  const fetchVendorBills = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendor-bills?status=approved&returnable=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vendor bills');
      }

      const data = await response.json();
      setBills(data.bills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getReturnableItems = (bill: VendorBill) => {
    return bill.vendor_bill_line_items.filter(item => 
      (item.quantity - (item.total_returned_quantity || 0)) > 0
    ).length;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Select Vendor Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Select Vendor Bill
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 text-center py-4">
            {error}
          </div>
          <Button onClick={fetchVendorBills} className="w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Select Vendor Bill for Return
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by bill number or vendor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredBills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No bills found matching your search.' : 'No returnable vendor bills found.'}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredBills.map((bill) => (
              <Card 
                key={bill.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedBillId === bill.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onBillSelect(bill)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{bill.bill_number}</h3>
                        <Badge variant={bill.status === 'approved' ? 'default' : 'secondary'}>
                          {bill.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground font-medium">
                        {bill.vendor.name}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(bill.bill_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {getReturnableItems(bill)} returnable items
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-1 text-lg font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {formatAmount(bill.total_amount)}
                      </div>
                      {bill.remaining_amount > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Remaining: {formatAmount(bill.remaining_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
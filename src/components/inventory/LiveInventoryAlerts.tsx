'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LowStockItem {
  quantity: number;
  reorder_point: number;
  products: {
    name: string;
  };
}

export const LiveInventoryAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Low Stock Alerts</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAlerts}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{alert.products.name}</TableCell>
                  <TableCell>{alert.quantity}</TableCell>
                  <TableCell>{alert.reorder_point}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {alert.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? 'Loading alerts...' : 'No low stock alerts at this time'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

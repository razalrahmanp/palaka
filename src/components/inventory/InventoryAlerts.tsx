'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert as AlertType } from '@/types';

interface Props {
  alerts: AlertType[];
}

export const InventoryAlerts: React.FC<Props> = ({ alerts }) => {
  const invAlerts = alerts.filter(a => a.type === 'Inventory');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {invAlerts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invAlerts.map(alert => (
                <TableRow key={alert.id}>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell>
                    <Badge variant={alert.priority === 'high' ? 'destructive' : 'secondary'}>
                      {alert.priority}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-center text-gray-500 py-4">No active inventory alerts.</p>
        )}
      </CardContent>
    </Card>
  );
};

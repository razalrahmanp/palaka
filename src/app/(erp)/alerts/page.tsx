'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/types';

// Example mock alerts data
const MOCK_ALERTS: Alert[] = [
    {
        id: '1',
        type: 'Production',
        message: 'Server CPU usage is high.',
        priority: 'high',
    },
    {
        id: '2',
        type: 'Inventory',
        message: 'Stock for item #1234 is below threshold.',
        priority: 'medium',
    },
    {
        id: '3',
        type: 'Procurement',
        message: 'New user registration pending approval.',
        priority: 'low',
    },
];

export default function AlertsPage() {
    const getPriorityBadge = (priority: Alert['priority']) => {
        switch (priority) {
            case 'high': return <Badge variant="destructive">High</Badge>;
            case 'medium': return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">Medium</Badge>;
            default: return <Badge variant="outline">Low</Badge>;
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Alerts & Notifications</CardTitle>
                    <CardDescription>A centralized list of active system alerts requiring attention.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Priority</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_ALERTS.map((alert) => (
                                <TableRow key={alert.id}>
                                    <TableCell className="font-medium">{alert.type}</TableCell>
                                    <TableCell>{alert.message}</TableCell>
                                    <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Notification Settings (Placeholder)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600">This section will allow users to configure their notification preferences, such as email alerts for specific events, in-app notification pop-ups, and custom alert thresholds.</p>
                </CardContent>
            </Card>
        </div>
    );
}

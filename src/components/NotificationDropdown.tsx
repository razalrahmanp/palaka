'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Warehouse, ShieldAlert, AlertTriangle, Info, LucideProps } from 'lucide-react';

// --- Type Definitions ---
type IconComponent = React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

interface AlertItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: IconComponent;
  priority: 'High' | 'Medium' | 'Low';
}

// --- Data Fetching Functions ---
const fetchRiskData = async () => {
  const res = await fetch('/api/analytics/risk');
  if (!res.ok) throw new Error('Failed to fetch risk data');
  return res.json();
};

const fetchInventoryAlerts = async () => {
  const res = await fetch('/api/inventory/alerts');
  if (!res.ok) throw new Error('Failed to fetch inventory alerts');
  return res.json();
};

// Helper to map alert types to UI properties
const getAlertDetails = (type: string) => {
    switch (type.toLowerCase()) {
        case 'inventory':
            return { icon: Warehouse, priority: 'High' as const };
        case 'security':
            return { icon: ShieldAlert, priority: 'High' as const };
        case 'operational':
            return { icon: AlertTriangle, priority: 'Medium' as const };
        default:
            return { icon: Info, priority: 'Low' as const };
    }
};

const AlertItemDisplay = ({ alert }: { alert: AlertItem }) => {
    const priorityStyles = {
        High: 'bg-red-100 border-red-200',
        Medium: 'bg-yellow-100 border-yellow-200',
        Low: 'bg-blue-100 border-blue-200',
    };
    const badgeStyles = {
        High: 'bg-red-500',
        Medium: 'bg-yellow-500',
        Low: 'bg-blue-500',
    };
    const iconColor = {
        High: 'text-red-600',
        Medium: 'text-yellow-600',
        Low: 'text-blue-600',
    };
    
    const Icon = alert.icon;

    return (
        <div className={`flex items-start gap-4 p-3 rounded-lg border ${priorityStyles[alert.priority] || 'bg-gray-100 border-gray-200'}`}>
            <Icon className={`h-6 w-6 mt-1 flex-shrink-0 ${iconColor[alert.priority] || 'text-gray-600'}`} />
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800 text-sm">{alert.title}</h4>
                    <Badge className={`${badgeStyles[alert.priority] || 'bg-gray-500'} text-white text-xs`}>{alert.priority}</Badge>
                </div>
                <p className="text-sm text-gray-600">{alert.description}</p>
                <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
            </div>
        </div>
    );
};

export const NotificationDropdown = () => {
    const { data: riskData, isLoading: isLoadingRisk } = useQuery({
        queryKey: ['riskAlertsData'],
        queryFn: fetchRiskData,
    });

    const { data: inventoryAlerts, isLoading: isLoadingInventory } = useQuery({
        queryKey: ['inventoryAlertsData'],
        queryFn: fetchInventoryAlerts,
    });

    // Combine risk and inventory alerts into a single list
    const allAlerts: AlertItem[] = [];
    if (riskData?.incidentsByType) {
        riskData.incidentsByType.forEach((alert: { type: string; count: number }, index: number) => {
            const details = getAlertDetails(alert.type);
            allAlerts.push({
                id: `risk-${index}`,
                title: `${alert.type} Risk`,
                description: `There are ${alert.count} open alert(s) of this type.`,
                timestamp: new Date().toLocaleDateString(),
                ...details
            });
        });
    }
    if (inventoryAlerts) {
        inventoryAlerts.forEach((alert: { products: { name: string; }; quantity: number; reorder_point: number; }, index: number) => {
            const details = getAlertDetails('Inventory');
            allAlerts.push({
                id: `inv-${index}`,
                title: "Low Stock",
                description: `${alert.products.name} is at ${alert.quantity} units (reorder point: ${alert.reorder_point}).`,
                timestamp: new Date().toLocaleDateString(),
                ...details
            });
        });
    }

    return (
        <Card className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-md shadow-lg border z-50">
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {isLoadingRisk || isLoadingInventory ? (
                    <p className="text-sm text-gray-500">Loading alerts...</p>
                ) : allAlerts.length > 0 ? (
                    allAlerts.map(alert => <AlertItemDisplay key={alert.id} alert={alert} />)
                ) : (
                    <p className="text-sm text-gray-500">No new notifications.</p>
                )}
            </CardContent>
        </Card>
    );
};

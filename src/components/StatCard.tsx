import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideProps } from 'lucide-react';

// --- Type Definition for StatCard Props ---
interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral' | 'danger';
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon }) => {
    // Default styling, can be customized further if needed.
    const bgColor = 'bg-gray-100';
    const color = 'text-gray-600';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
            <div className={`p-2 rounded-full ${bgColor}`}>
                {/* Use the Icon prop directly */}
                {Icon && <Icon className={`h-4 w-4 ${color}`} />}
            </div>
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className={`text-xs ${
                changeType === 'increase' ? 'text-green-500' : 
                changeType === 'decrease' || changeType === 'danger' ? 'text-red-500' : 'text-gray-500'
                }`}
            >
                {change}
            </p>
            </CardContent>
        </Card>
    );
};

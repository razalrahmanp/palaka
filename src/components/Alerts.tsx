import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

type Alert = {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  timestamp: string;
  icon?: LucideIcon;
};

type AlertsProps = {
  alerts: Alert[];
};

const AlertItem: React.FC<{ alert: Alert }> = ({ alert }) => {
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

  const Icon = alert.icon ?? (() => <span>🔔</span>);

  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg border ${priorityStyles[alert.priority] || 'bg-gray-100 border-gray-200'}`}>
      <Icon className={`h-6 w-6 mt-1 ${iconColor[alert.priority] || 'text-gray-600'}`} />
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-gray-800">{alert.title}</h4>
          <Badge className={`${badgeStyles[alert.priority] || 'bg-gray-500'} text-white`}>
            {alert.priority}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">{alert.description}</p>
        <p className="text-xs text-gray-400 mt-1">{alert.timestamp}</p>
      </div>
    </div>
  );
};

export const Alerts: React.FC<AlertsProps> = ({ alerts }) => (
  <Card>
    <CardHeader>
      <CardTitle>Alerts & Notifications</CardTitle>
      <p className="text-sm text-gray-500">Action Required</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {alerts && alerts.length > 0 ? (
        alerts.map((alert) => <AlertItem key={alert.id} alert={alert} />)
      ) : (
        <p className="text-sm text-gray-500">No active alerts.</p>
      )}
    </CardContent>
  </Card>
);

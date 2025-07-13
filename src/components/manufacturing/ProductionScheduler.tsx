'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductionRun } from '@/types';

interface ProductionSchedulerProps {
  productionRuns: ProductionRun[];
}

export const ProductionScheduler: React.FC<ProductionSchedulerProps> = ({ productionRuns }) => {
  return (
    <Card>
        <CardHeader><CardTitle>Production Schedule View</CardTitle></CardHeader>
        <CardContent>
            <p className="text-sm text-gray-600 mb-4">
                This is a placeholder for a visual Gantt chart or calendar to manage production timelines.
            </p>
            {productionRuns.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-2">Upcoming/In Progress Jobs:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {productionRuns.map(job => (
                            <li key={job.id}>
                                <strong>{job.product} ({job.quantity} units)</strong> - Status: {job.status}, Due: {job.due_date || 'N/A'}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : (
                <p className="text-center text-gray-500 py-4">No production jobs scheduled.</p>
            )}
        </CardContent>
    </Card>
  );
};

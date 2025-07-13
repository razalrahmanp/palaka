'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const CustomerFilters = ({ filterStatus, onFilterStatusChange, filterSource, onFilterSourceChange }) => {
    return (
        <div className="flex space-x-4 mb-4">
            <div className="w-full md:w-1/4">
                <Label>Filter by Status</Label>
                <Select value={filterStatus} onValueChange={onFilterStatusChange}>
                    <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Churned">Churned</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="w-full md:w-1/4">
                <Label>Filter by Source</Label>
                <Select value={filterSource} onValueChange={onFilterSourceChange}>
                    <SelectTrigger><SelectValue placeholder="All Sources" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Trade Show">Trade Show</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};

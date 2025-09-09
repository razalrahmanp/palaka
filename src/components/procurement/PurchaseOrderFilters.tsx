'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Filter, Calendar as CalendarIcon, X, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface PurchaseOrderFilters {
  search: string;
  status: string;
  supplier: string;
  dueDateFrom: Date | null;
  dueDateTo: Date | null;
  createdDateFrom: Date | null;
  createdDateTo: Date | null;
  salesRep: string;
}

interface PurchaseOrderFiltersProps {
  filters: PurchaseOrderFilters;
  onFiltersChange: (filters: PurchaseOrderFilters) => void;
  suppliers: Array<{ id: string; name: string }>;
  salesReps: Array<{ id: string; name: string }>;
  onReset: () => void;
}

export function PurchaseOrderFilters({
  filters,
  onFiltersChange,
  suppliers,
  salesReps,
  onReset
}: PurchaseOrderFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof PurchaseOrderFilters, value: string | Date | null) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status) count++;
    if (filters.supplier) count++;
    if (filters.dueDateFrom) count++;
    if (filters.dueDateTo) count++;
    if (filters.createdDateFrom) count++;
    if (filters.createdDateTo) count++;
    if (filters.salesRep) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Always visible: Search and Quick filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by PO#, supplier, product..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Supplier</Label>
            <Select value={filters.supplier} onValueChange={(value) => updateFilter('supplier', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sales Rep */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Sales Rep</Label>
            <Select value={filters.salesRep} onValueChange={(value) => updateFilter('salesRep', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All sales reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sales reps</SelectItem>
                {salesReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expandable: Date filters */}
        {isExpanded && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Filters
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Due Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Due Date From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueDateFrom ? formatDate(filters.dueDateFrom) : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateFrom || undefined}
                      onSelect={(date) => updateFilter('dueDateFrom', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Due Date To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dueDateTo ? formatDate(filters.dueDateTo) : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dueDateTo || undefined}
                      onSelect={(date) => updateFilter('dueDateTo', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Created Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Created From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdDateFrom ? formatDate(filters.createdDateFrom) : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdDateFrom || undefined}
                      onSelect={(date) => updateFilter('createdDateFrom', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Created Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Created To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.createdDateTo ? formatDate(filters.createdDateTo) : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.createdDateTo || undefined}
                      onSelect={(date) => updateFilter('createdDateTo', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {activeFiltersCount > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-800 mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.search}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('search', '')}
                  />
                </Badge>
              )}
              {filters.status && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('status', '')}
                  />
                </Badge>
              )}
              {filters.supplier && (
                <Badge variant="secondary" className="gap-1">
                  Supplier: {suppliers.find(s => s.id === filters.supplier)?.name || filters.supplier}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('supplier', '')}
                  />
                </Badge>
              )}
              {filters.salesRep && (
                <Badge variant="secondary" className="gap-1">
                  Sales Rep: {salesReps.find(r => r.id === filters.salesRep)?.name || filters.salesRep}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilter('salesRep', '')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

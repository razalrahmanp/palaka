'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Search } from 'lucide-react';

export interface PurchaseOrderFilters {
  search: string;
  status: string;
  supplier: string;
  dueDateFrom: Date | null;
  dueDateTo: Date | null;
  createdDateFrom: Date | null;
  createdDateTo: Date | null;
  salesRep: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
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
  const updateFilter = (key: keyof PurchaseOrderFilters, value: string | Date | null) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.supplier && filters.supplier !== 'all') count++;
    if (filters.salesRep && filters.salesRep !== 'all') count++;
    if (filters.dueDateFrom) count++;
    if (filters.dueDateTo) count++;
    if (filters.createdDateFrom) count++;
    if (filters.createdDateTo) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Single Row Layout */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[280px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by PO#, supplier, product..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10 h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status */}
        <div className="min-w-[140px]">
          <Select value={filters.status || 'all'} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue />
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
        <div className="min-w-[140px]">
          <Select value={filters.supplier || 'all'} onValueChange={(value) => updateFilter('supplier', value)}>
            <SelectTrigger className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue />
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
        <div className="min-w-[140px]">
          <Select value={filters.salesRep || 'all'} onValueChange={(value) => updateFilter('salesRep', value)}>
            <SelectTrigger className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue />
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

        {/* Sort By */}
        <div className="min-w-[160px]">
          <Select
            value={filters.sortBy || 'created_at'}
            onValueChange={(value) => updateFilter('sortBy', value)}
          >
            <SelectTrigger className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="total">Total Amount</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="expected_delivery">Expected Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="min-w-[180px]">
          <Select
            value={filters.sortOrder || 'desc'}
            onValueChange={(value) => updateFilter('sortOrder', value as 'asc' | 'desc')}
          >
            <SelectTrigger className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending (A-Z, 1-9, Old-New)</SelectItem>
              <SelectItem value="desc">Descending (Z-A, 9-1, New-Old)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Badge & Clear Button */}
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-medium">
                {activeFiltersCount} active
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onReset}
                className="h-9 px-3 text-gray-600 hover:text-gray-800 border-gray-300"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Active Filters:</span>
            <div className="flex flex-wrap gap-1">
              {filters.status && filters.status !== 'all' && (
                <span className="text-gray-700">Status: {filters.status}</span>
              )}
              {filters.supplier && filters.supplier !== 'all' && (
                <span className="text-gray-700">
                  {filters.status && filters.status !== 'all' ? ', ' : ''}
                  Supplier: {suppliers.find(s => s.id === filters.supplier)?.name || filters.supplier}
                </span>
              )}
              {filters.salesRep && filters.salesRep !== 'all' && (
                <span className="text-gray-700">
                  {((filters.status && filters.status !== 'all') || (filters.supplier && filters.supplier !== 'all')) ? ', ' : ''}
                  Sales Rep: {salesReps.find(r => r.id === filters.salesRep)?.name || filters.salesRep}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

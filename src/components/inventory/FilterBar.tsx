'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Supplier } from '@/types'

export interface Props {
  suppliers: Supplier[]
  selectedSupplierId: string | null
  onSelectSupplier: (id: string | null) => void
  // onAddSupplier: () => void
  onFilterChange: (filters: { supplier: string | null; category: string | null; priceRange: 'low' | 'medium' | 'high' | null }) => void
  onClearFilters: () => void
  isOpen: boolean
  onClose: () => void
}

export const FilterBarDialog: React.FC<Props> = ({
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  // onAddSupplier,
  onFilterChange,
  onClearFilters,
  isOpen,
  onClose
}) => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState<'low' | 'medium' | 'high' | null>(null)

  // Memoize filtered suppliers to avoid unnecessary re-renders
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search, suppliers])

  const handleFilterChange = () => {
    onFilterChange({ supplier: selectedSupplierId, category, priceRange })
    onClose() // Close dialog after applying filters
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Inventory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier Filter */}
          <div>
            <h3 className="text-sm font-semibold">Select Supplier</h3>
            <Select value={selectedSupplierId ?? ''} onValueChange={(value) => onSelectSupplier(value === '' ? null : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search suppliers"
                  className="w-full mb-2"
                />
                {filteredSuppliers.length === 0 ? (
                  <SelectItem value="no-suppliers" disabled>No suppliers found</SelectItem>
                ) : (
                  filteredSuppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-semibold">Select Category</h3>
            <Select value={category ?? ''} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Crockeries</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="clothing">Curtains</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <div>
            <h3 className="text-sm font-semibold">Select Price Range</h3>
            <Select value={priceRange ?? ''} onValueChange={(value) => setPriceRange(value as 'low' | 'medium' | 'high' | null)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Under ₹1000)</SelectItem>
                <SelectItem value="medium">Medium (₹1000 - ₹5000)</SelectItem>
                <SelectItem value="high">High (Above ₹5000)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleFilterChange}>Apply Filters</Button>
          <Button variant="ghost" className="ml-2" onClick={onClearFilters}>Clear Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

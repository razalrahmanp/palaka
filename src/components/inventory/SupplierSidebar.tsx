// components/inventory/SupplierSidebar.tsx
'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Supplier } from '@/types'

type Props = {
  suppliers: Supplier[]
  selectedSupplierId: string | null
  onSelectSupplier: (id: string | null) => void
  onAddSupplier: () => void
}

export const SupplierSidebar: React.FC<Props> = ({
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  onAddSupplier
}) => {
  return (
    <div className="relative max-w-xs w-full md:w-60 border-l p-4 overflow-y-auto bg-muted/50 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Suppliers</h2>
      <div className="flex flex-col gap-2">
        <Button
          variant={!selectedSupplierId ? "secondary" : "ghost"}
          onClick={() => onSelectSupplier(null)}
          className="justify-start"
        >
          All Suppliers
        </Button>
        {suppliers.map(s => (
          <Button
            key={s.id}
            variant={selectedSupplierId === s.id ? "secondary" : "ghost"}
            onClick={() => onSelectSupplier(s.id)}
            className="justify-start"
          >
            {s.name}
          </Button>
        ))}
        <Button
          variant="outline"
          className="mt-4"
          onClick={onAddSupplier}
        >
          Add Supplier
        </Button>
      </div>
    </div>
  )
}

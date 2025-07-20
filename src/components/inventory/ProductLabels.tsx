// components/inventory/ProductLabels.tsx
'use client'
import React, { useState } from 'react'
import { ProductWithInventory } from '@/types'
import { LABEL_SIZES, DEFAULT_LABEL_SIZE } from './labels/LabelSizes'
import { LabelControls } from './labels/LabelControls'
import { LabelPreview } from './labels/LabelPreview'
import { EmptyLabelsState } from './labels/EmptyLabelsState'
import { printSingleLabel, printBatchLabels } from './labels/PrintService'

type Props = {
  products: ProductWithInventory[]
}

export const ProductLabels: React.FC<Props> = ({ products }) => {
  const [selectedSize, setSelectedSize] = useState<string>(DEFAULT_LABEL_SIZE)

  const currentSize = LABEL_SIZES[selectedSize]

  const handlePrint = (product: ProductWithInventory) => {
    printSingleLabel(product, currentSize)
  }

  const handlePrintAll = () => {
    printBatchLabels(products, currentSize)
  }

  return (
    <div className="space-y-4">
      <LabelControls
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        onPrintAll={handlePrintAll}
        productCount={products.length}
      />

      {products.length === 0 ? (
        <EmptyLabelsState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map(product => (
            <LabelPreview
              key={product.product_id}
              product={product}
              size={currentSize}
              onPrint={() => handlePrint(product)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

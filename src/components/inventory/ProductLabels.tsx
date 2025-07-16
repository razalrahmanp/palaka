// components/inventory/ProductLabels.tsx
'use client'
import React from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { ProductWithInventory } from '@/types'

type Props = {
  products: (ProductWithInventory & { sku?: string | null })[]
}

export const ProductLabels: React.FC<Props> = ({ products }) => {
  const handlePrint = (product: ProductWithInventory) => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(product.product_id)}`
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Label</title>
            <style>
              @media print {
                body { font-family: sans-serif; margin: 0; padding: 0; }
                .label-container {
                  width: 4in;
                  height: 3in;
                  padding: 0.25in;
                  border: 1px solid #ccc;
                  display: flex;
                  flex-direction: column;
                  box-sizing: border-box;
                }
                .label-header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
                .label-title { font-size: 18px; font-weight: bold; margin: 0; }
                .label-body { display: flex; flex: 1; gap: 16px; }
                .label-details { flex: 1; }
                .label-details p { margin: 4px 0; font-size: 14px; }
                .label-qr { text-align: center; }
                .label-qr img { width: 100px; height: 100px; }
                .label-qr p { font-size: 10px; margin-top: 4px; }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="label-header">
                <h2 class="label-title">${product.product_name}</h2>
              </div>
              <div class="label-body">
                <div class="label-details">
                  <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
                  <p><strong>Material:</strong> ${product.material || 'N/A'}</p>
                  <p><strong>Supplier:</strong> ${product.supplier_name || 'N/A'}</p>
                </div>
                <div class="label-qr">
                  <img src="${qrCodeUrl}" alt="QR Code" />
                  <p>${product.product_id}</p>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map(product => {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(product.product_id)}`
        return (
          <Card key={product.product_id} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="truncate">{product.product_name}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <div className="flex-1 space-y-1 text-sm">
                <p><strong className="font-medium">Category:</strong> {product.category || 'N/A'}</p>
                <p><strong className="font-medium">Material:</strong> {product.material || 'N/A'}</p>
                <p><strong className="font-medium">Supplier:</strong> {product.supplier_name || 'N/A'}</p>
              </div>
              <Image
                src={qrCodeUrl}
                alt="QR Code"
                width={96}
                height={96}
                className="w-24 h-24 rounded-md"
                unoptimized
              />
              <Button variant="outline" size="sm" className="mt-2" onClick={() => handlePrint(product)}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

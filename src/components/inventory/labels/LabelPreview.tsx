import React from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { ProductWithInventory } from '@/types'
import { LabelSize } from './LabelSizes'
import { generateQRCodeUrl } from './PrintUtils'

type Props = {
  product: ProductWithInventory
  size: LabelSize
  onPrint: () => void
}

export const LabelPreview: React.FC<Props> = ({ product, size, onPrint }) => {
  const qrCodeUrl = generateQRCodeUrl(product.product_id, size.qrSize)
  const isTscSize = size.name.includes('40mm x 35mm')

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {product.product_image_url ? (
              <div className="w-12 h-12 rounded-md overflow-hidden border bg-gray-50">
                <Image
                  src={product.product_image_url}
                  alt={product.product_name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md border bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-400">No Image</span>
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate text-base leading-tight">{product.product_name}</CardTitle>
            <div className="text-xs text-gray-500 mt-1">
              Preview - {size.name}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {product.supplier_name && (
                <div>Supplier: {product.supplier_name}</div>
              )}
              {product.location && (
                <div>Location: {product.location}</div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Label Preview - Different layouts for different sizes */}
        <div className="border-2 border-dashed border-gray-300 p-2 bg-white aspect-[40/35] min-h-[140px]">
          {isTscSize ? (
            // Vertical layout for 40mm x 35mm
            <div className="h-full flex flex-col items-center justify-center text-xs">
              <div className="flex-shrink-0 mb-2">
                <div className="flex items-center justify-center bg-white p-1">
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={size.qrSize * 1.8} // Larger QR code preview
                    height={size.qrSize * 1.8}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
              <div className="text-center font-bold text-[0.7rem] font-mono">
                {product.sku || 'N/A'}
              </div>
            </div>
          ) : (
            // Horizontal layout for other sizes
            <div className="h-full flex gap-2 items-center min-h-0 py-1">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center bg-white p-1">
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={size.qrSize * 1.2}
                    height={size.qrSize * 1.2}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-[0.7rem] font-bold space-y-1">
                <div className="text-center font-bold text-[0.8rem] leading-tight">
                  {product.product_name}
                </div>
                <div className="text-center text-[0.7rem] leading-tight">
                  <strong>SKU:</strong> {product.sku || 'N/A'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>SKU:</span>
            <span className="font-mono">{product.sku || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Quantity:</span>
            <span>{product.quantity}</span>
          </div>
          {product.category && (
            <div className="flex justify-between">
              <span>Category:</span>
              <span>{product.category}</span>
            </div>
          )}
          {product.cost && (
            <div className="flex justify-between">
              <span>Cost:</span>
              <span>${Number(product.cost).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Print Button */}
        <Button variant="outline" size="sm" className="w-full" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" /> 
          Print Label
        </Button>
      </CardContent>
    </Card>
  )
}

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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="truncate text-base">{product.product_name}</CardTitle>
        <div className="text-xs text-gray-500">Preview - {size.name}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Label Preview */}
        <div className="border-2 border-dashed border-gray-300 p-3 bg-white aspect-[2/1] min-h-[180px]">
          <div className="h-full flex flex-col text-xs">            
            {/* Body */}
            <div className="flex-1 flex gap-2 items-center min-h-0 py-1">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center bg-white p-1">
                  <Image
                    src={qrCodeUrl}
                    alt="QR Code"
                    width={size.qrSize * 1.4}
                    height={size.qrSize * 1.4}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-[0.7rem] font-bold">
                <div className="text-center mb-1 font-bold text-[0.8rem]">
                  {product.product_name}
                </div>
                <div className="text-center">
                  <strong>SKU:</strong> {product.sku || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex justify-between items-center text-xs text-gray-600">
          <div>SKU: {product.sku || 'N/A'}</div>
          <div>Product: {product.product_name}</div>
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

import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Printer, Eye, ZoomIn } from 'lucide-react'
import { ProductWithInventory } from '@/types'
import { LabelSize } from './LabelSizes'
import { generateQRCodeUrl } from './PrintUtils'

type Props = {
  product: ProductWithInventory
  size: LabelSize
  onPrint: () => void
}

export const LabelPreview: React.FC<Props> = ({ product, size, onPrint }) => {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const qrCodeUrl = generateQRCodeUrl(product.product_id, size.qrSize)
  const isTscSize = size.name.includes('40mm x 35mm')

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Enhanced Product Image with Preview */}
          <div className="flex-shrink-0">
            {product.product_image_url ? (
              <div className="relative group">
                <div className="w-20 h-20 rounded-md overflow-hidden border bg-gray-50 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                  <Image
                    src={product.product_image_url}
                    alt={product.product_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                    onClick={() => setImagePreviewOpen(true)}
                  />
                </div>
                {/* Overlay with preview icon */}
                <div 
                  className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-md"
                  onClick={() => setImagePreviewOpen(true)}
                >
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
                {/* Verification Badge */}
                <div className="absolute -top-2 -right-2 bg-green-100 border border-green-300 rounded-full p-1">
                  <Eye className="h-3 w-3 text-green-600" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-md border bg-gray-100 flex items-center justify-center">
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
              <div className="mt-1 text-green-600 font-medium">
                ✓ Ready for verification
              </div>
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

        {/* Enhanced Print Section */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-green-50 hover:bg-green-100 border-green-200" 
            onClick={onPrint}
          >
            <Printer className="mr-2 h-4 w-4" /> 
            Print {product.quantity || 1} Label{(product.quantity || 1) > 1 ? 's' : ''} - Verified
          </Button>
          
          {product.product_image_url && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full" 
              onClick={() => setImagePreviewOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" /> 
              Preview Image for Verification
            </Button>
          )}
        </div>
      </CardContent>

      {/* Image Preview Dialog */}
      {product.product_image_url && (
        <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Product Image Verification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Product Details:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Name:</strong> {product.product_name}</div>
                  <div><strong>SKU:</strong> {product.sku || 'N/A'}</div>
                  <div><strong>Category:</strong> {product.category || 'N/A'}</div>
                  <div><strong>Location:</strong> {product.location || 'N/A'}</div>
                  <div><strong>Supplier:</strong> {product.supplier_name || 'N/A'}</div>
                  <div><strong>Quantity:</strong> {product.quantity}</div>
                </div>
              </div>
              
              <div className="relative border rounded-lg overflow-hidden bg-white">
                <Image
                  src={product.product_image_url}
                  alt={`${product.product_name} - Full Size`}
                  width={800}
                  height={600}
                  className="w-full h-auto max-h-96 object-contain"
                  unoptimized
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>📋 Verification Instructions:</strong><br/>
                  • Compare this image with the physical stock<br/>
                  • Ensure the product matches exactly<br/>
                  • Check for any damage or discrepancies<br/>
                  • Verify quantities and location before printing labels
                </p>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setImagePreviewOpen(false)}
                >
                  Close Preview
                </Button>
                <Button 
                  onClick={() => {
                    setImagePreviewOpen(false)
                    onPrint()
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✓ Verified - Print Labels
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}

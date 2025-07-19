// components/inventory/ProductLabels.tsx
'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer, Settings } from 'lucide-react'
import { ProductWithInventory } from '@/types'

type LabelSize = {
  name: string
  width: string
  height: string
  qrSize: number
  fontSize: {
    title: string
    body: string
    small: string
  }
}

const LABEL_SIZES: Record<string, LabelSize> = {
  '4x3': {
    name: '4" x 3" (Large)',
    width: '4in',
    height: '3in',
    qrSize: 100,
    fontSize: { title: '18px', body: '14px', small: '10px' }
  },
  '4x2': {
    name: '4" x 2" (Medium)',
    width: '4in',
    height: '2in',
    qrSize: 80,
    fontSize: { title: '16px', body: '12px', small: '9px' }
  },
  '3x2': {
    name: '3" x 2" (Standard)',
    width: '3in',
    height: '2in',
    qrSize: 70,
    fontSize: { title: '14px', body: '11px', small: '8px' }
  },
  '2x1': {
    name: '2" x 1" (Small)',
    width: '2in',
    height: '1in',
    qrSize: 40,
    fontSize: { title: '12px', body: '9px', small: '7px' }
  }
}

type Props = {
  products: (ProductWithInventory & { sku?: string | null })[]
}

export const ProductLabels: React.FC<Props> = ({ products }) => {
  const [selectedSize, setSelectedSize] = useState<string>('3x2')

  const handlePrint = (product: ProductWithInventory, labelSize?: string) => {
    const size = LABEL_SIZES[labelSize || selectedSize]
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size.qrSize * 2}x${size.qrSize * 2}&data=${encodeURIComponent(product.product_id)}`
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>TSC Label - ${product.product_name}</title>
            <meta charset="utf-8">
            <style>
              @page {
                size: ${size.width} ${size.height};
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: white;
                color: black;
              }
              .print-label {
                width: ${size.width};
                height: ${size.height};
                padding: 0.15in;
                border: 2px solid #000;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                background: white;
                page-break-after: always;
              }
              .label-header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 4px;
                margin-bottom: 6px;
              }
              .label-title {
                font-size: ${size.fontSize.title};
                font-weight: bold;
                margin: 0;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .label-body {
                display: flex;
                flex: 1;
                gap: 8px;
                align-items: flex-start;
              }
              .label-details {
                flex: 1;
                font-size: ${size.fontSize.body};
                line-height: 1.3;
              }
              .label-details p {
                margin: 2px 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .label-qr {
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .label-qr img {
                width: ${size.qrSize}px;
                height: ${size.qrSize}px;
                display: block;
              }
              .label-qr-text {
                font-size: ${size.fontSize.small};
                margin: 2px 0 0 0;
                font-family: 'Courier New', monospace;
                font-weight: bold;
              }
              .label-footer {
                border-top: 2px solid #000;
                padding-top: 2px;
                margin-top: 4px;
                text-align: center;
                font-size: ${size.fontSize.small};
                font-weight: bold;
              }
              @media screen {
                body { padding: 20px; background: #f0f0f0; }
                .print-controls {
                  text-align: center;
                  margin: 20px 0;
                }
                .print-controls button {
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 16px;
                  margin: 0 10px;
                }
                .print-controls button:hover {
                  background: #0056b3;
                }
                .print-controls button.secondary {
                  background: #6c757d;
                }
                .print-controls button.secondary:hover {
                  background: #545b62;
                }
              }
              @media print {
                .print-controls { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="print-controls">
              <button onclick="window.print()">🖨️ Print Label</button>
              <button onclick="window.close()" class="secondary">❌ Close</button>
            </div>
            
            <div class="print-label">
              <div class="label-header">
                <div class="label-title">${product.product_name}</div>
              </div>
              <div class="label-body">
                <div class="label-details">
                  <p><strong>SKU:</strong> ${product.sku || product.product_id.slice(-8)}</p>
                  <p><strong>Category:</strong> ${(product.category || 'N/A').substring(0, 15)}</p>
                  <p><strong>Material:</strong> ${(product.material || 'N/A').substring(0, 15)}</p>
                  <p><strong>Location:</strong> ${product.location || 'N/A'}</p>
                  <p><strong>Stock:</strong> ${product.quantity || 0} units</p>
                </div>
                <div class="label-qr">
                  <img src="${qrCodeUrl}" alt="QR Code" />
                  <div class="label-qr-text">${product.product_id}</div>
                </div>
              </div>
              <div class="label-footer">
                ${product.supplier_name || 'Al Rams Furniture ERP'}
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const handlePrintAll = () => {
    const size = LABEL_SIZES[selectedSize]
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const labelElements = products.map(product => {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size.qrSize * 2}x${size.qrSize * 2}&data=${encodeURIComponent(product.product_id)}`
        return `
          <div class="print-label" style="page-break-after: always;">
            <div class="label-header">
              <div class="label-title">${product.product_name}</div>
            </div>
            <div class="label-body">
              <div class="label-details">
                <p><strong>SKU:</strong> ${product.sku || product.product_id.slice(-8)}</p>
                <p><strong>Category:</strong> ${(product.category || 'N/A').substring(0, 15)}</p>
                <p><strong>Material:</strong> ${(product.material || 'N/A').substring(0, 15)}</p>
                <p><strong>Location:</strong> ${product.location || 'N/A'}</p>
                <p><strong>Stock:</strong> ${product.quantity || 0} units</p>
              </div>
              <div class="label-qr">
                <img src="${qrCodeUrl}" alt="QR Code" />
                <div class="label-qr-text">${product.product_id}</div>
              </div>
            </div>
            <div class="label-footer">
              ${product.supplier_name || 'Al Rams Furniture ERP'}
            </div>
          </div>
        `
      }).join('')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>TSC Labels - Batch Print (${products.length} labels)</title>
            <meta charset="utf-8">
            <style>
              @page {
                size: ${size.width} ${size.height};
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background: white;
                color: black;
              }
              .print-label {
                width: ${size.width};
                height: ${size.height};
                padding: 0.15in;
                border: 2px solid #000;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                background: white;
                page-break-after: always;
              }
              .print-label:last-child {
                page-break-after: avoid;
              }
              .label-header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 4px;
                margin-bottom: 6px;
              }
              .label-title {
                font-size: ${size.fontSize.title};
                font-weight: bold;
                margin: 0;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .label-body {
                display: flex;
                flex: 1;
                gap: 8px;
                align-items: flex-start;
              }
              .label-details {
                flex: 1;
                font-size: ${size.fontSize.body};
                line-height: 1.3;
              }
              .label-details p {
                margin: 2px 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .label-qr {
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .label-qr img {
                width: ${size.qrSize}px;
                height: ${size.qrSize}px;
                display: block;
              }
              .label-qr-text {
                font-size: ${size.fontSize.small};
                margin: 2px 0 0 0;
                font-family: 'Courier New', monospace;
                font-weight: bold;
              }
              .label-footer {
                border-top: 2px solid #000;
                padding-top: 2px;
                margin-top: 4px;
                text-align: center;
                font-size: ${size.fontSize.small};
                font-weight: bold;
              }
              @media screen {
                body { padding: 20px; background: #f0f0f0; }
                .print-controls {
                  text-align: center;
                  margin: 20px 0;
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .print-controls h2 {
                  margin: 0 0 15px 0;
                  color: #333;
                }
                .print-controls button {
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 16px;
                  margin: 0 10px;
                }
                .print-controls button:hover {
                  background: #0056b3;
                }
                .print-controls button.secondary {
                  background: #6c757d;
                }
                .print-controls button.secondary:hover {
                  background: #545b62;
                }
              }
              @media print {
                .print-controls { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="print-controls">
              <h2>Ready to Print ${products.length} Labels</h2>
              <p>Size: ${size.name} - Optimized for TSC thermal barcode printers</p>
              <button onclick="window.print()">🖨️ Print All Labels</button>
              <button onclick="window.close()" class="secondary">❌ Close</button>
            </div>
            
            ${labelElements}
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">Label Settings</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="label-size" className="text-sm font-medium">Size:</label>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger id="label-size" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_SIZES).map(([key, size]) => (
                    <SelectItem key={key} value={key}>
                      {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handlePrintAll} 
              className="flex items-center gap-2"
              disabled={products.length === 0}
            >
              <Printer className="h-4 w-4" />
              Print All ({products.length})
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Current size: <strong>{LABEL_SIZES[selectedSize].name}</strong> - Optimized for TSC thermal barcode printers
        </div>
      </div>

      {/* Product Labels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map(product => {
          const size = LABEL_SIZES[selectedSize]
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size.qrSize * 2}x${size.qrSize * 2}&data=${encodeURIComponent(product.product_id)}`
          
          return (
            <Card key={product.product_id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="truncate text-base">{product.product_name}</CardTitle>
                <div className="text-xs text-gray-500">
                  Preview - {size.name}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Label Preview */}
                <div 
                  className={`border-2 border-dashed border-gray-300 p-3 bg-white ${
                    size.width === '4in' && size.height === '3in' ? 'aspect-[4/3]' :
                    size.width === '4in' && size.height === '2in' ? 'aspect-[2/1]' :
                    size.width === '3in' && size.height === '2in' ? 'aspect-[3/2]' :
                    'aspect-[2/1]'
                  }`}
                >
                  <div className="h-full flex flex-col text-xs">
                    {/* Header */}
                    <div className="text-center border-b border-gray-300 pb-1 mb-2">
                      <div className="font-bold truncate text-[0.7rem]">
                        {product.product_name}
                      </div>
                    </div>
                    
                    {/* Body */}
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 space-y-0.5 text-[0.6rem]">
                        <div className="truncate"><strong>SKU:</strong> {product.sku || product.product_id.slice(-6)}</div>
                        <div className="truncate"><strong>Cat:</strong> {product.category || 'N/A'}</div>
                        <div className="truncate"><strong>Mat:</strong> {product.material || 'N/A'}</div>
                        <div className="truncate"><strong>Loc:</strong> {product.location || 'N/A'}</div>
                        <div className="truncate"><strong>Qty:</strong> {product.quantity || 0}</div>
                      </div>
                      <div className="text-center">
                        <Image
                          src={qrCodeUrl}
                          alt="QR Code"
                          width={40}
                          height={40}
                          className="w-10 h-10"
                          unoptimized
                        />
                        <div className="text-xs font-mono font-bold mt-0.5 text-[0.5rem]">
                          {product.product_id.slice(-8)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="border-t border-gray-300 pt-1 text-center text-[0.5rem]">
                      {product.supplier_name || 'Al Rams Furniture'}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <div>ID: {product.product_id}</div>
                  <div>Stock: {product.quantity || 0}</div>
                </div>

                {/* Print Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => handlePrint(product)}
                >
                  <Printer className="mr-2 h-4 w-4" /> 
                  Print Label
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Printer className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p>Add some inventory items to generate labels</p>
        </div>
      )}
    </div>
  )
}

import { ProductWithInventory } from '@/types'
import { LabelSize } from './LabelSizes'
import { generatePrintStyles, generateLabelHTML } from './PrintUtils'

// Print single label
export const printSingleLabel = (product: ProductWithInventory, size: LabelSize) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TSC Label - ${product.product_name}</title>
        <meta charset="utf-8">
        <style>${generatePrintStyles(size)}</style>
      </head>
      <body>
        <div class="print-controls">
          <button onclick="window.print()">🖨️ Print Label</button>
          <button onclick="window.close()" class="secondary">❌ Close</button>
        </div>
        ${generateLabelHTML(product, size)}
      </body>
    </html>
  `)
  printWindow.document.close()
}

// Print multiple labels
export const printBatchLabels = (products: ProductWithInventory[], size: LabelSize) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const labelElements = products
    .map(product => generateLabelHTML(product, size))
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TSC Labels - Batch Print (${products.length} labels)</title>
        <meta charset="utf-8">
        <style>${generatePrintStyles(size)}</style>
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

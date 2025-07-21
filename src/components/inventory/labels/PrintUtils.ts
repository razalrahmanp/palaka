import { LabelSize } from './LabelSizes'
import { ProductWithInventory } from '@/types'

// Generate print styles for labels
export const generatePrintStyles = (size: LabelSize) => `
  @page {
    size: ${size.width} ${size.height};
    margin: 0;
    padding: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: Arial, sans-serif;
    background: white;
    color: black;
    width: ${size.width};
    height: ${size.height};
  }
  .print-label {
    width: ${size.width};
    height: ${size.height};
    padding: 2mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: white;
  }
  .qr-section {
    flex-shrink: 0;
  }
  .qr-section img {
    width: ${size.qrSize}mm;
    height: ${size.qrSize}mm;
    display: block;
  }
  .text-section {
    flex: 1;
    margin-left: 3mm;
    text-align: center;
  }
  .product-name {
    font-size: ${size.fontSize.title};
    font-weight: bold;
    margin-bottom: 2mm;
    color: black;
  }
  .sku-text {
    font-size: ${size.fontSize.body};
    font-weight: bold;
    color: black;
  }
`

// Generate QR code URL
export const generateQRCodeUrl = (productId: string, size: number) => {
  // Ensure minimum resolution for print quality
  const pixelSize = Math.max(size * 6, 150) // Higher resolution for print
  return `https://api.qrserver.com/v1/create-qr-code/?size=${pixelSize}x${pixelSize}&data=${encodeURIComponent(productId)}&format=png&margin=1&ecc=M`
}

// Generate single label HTML - Very simple structure
export const generateLabelHTML = (product: ProductWithInventory, size: LabelSize) => {
  const qrCodeUrl = generateQRCodeUrl(product.product_id, size.qrSize)
  
  return `
    <div class="print-label">
      <div class="qr-section">
        <img src="${qrCodeUrl}" alt="QR Code" />
      </div>
      <div class="text-section">
        <div class="product-name">${product.product_name}</div>
        <div class="sku-text"><strong>SKU:</strong> ${product.sku || 'N/A'}</div>
      </div>
    </div>
  `
}

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
  }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background: white;
    color: black;
    width: ${size.width};
    height: ${size.height};
    overflow: hidden;
  }
  .print-label {
    width: ${size.width};
    height: ${size.height};
    padding: 2mm;
    border: 1px solid #000;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: white;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .label-header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 0.5mm;
    margin-bottom: 1mm;
  }
  .label-title {
    font-size: ${size.fontSize.title};
    font-weight: bold;
    margin: 0;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label-body {
    display: flex;
    flex: 1;
    gap: 1.5mm;
    align-items: center;
    justify-content: space-between;
    padding: 0.5mm 0;
    overflow: hidden;
    min-height: ${Math.max(size.qrSize + 2, 12)}mm;
  }
  .label-details {
    flex: 1;
    font-size: ${size.fontSize.body};
    line-height: 1.1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .label-details p {
    margin: 0;
    padding: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: bold;
    text-align: center;
  }
  .label-qr {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: ${size.qrSize + 2}mm;
  }
  .label-qr img {
    width: ${size.qrSize}mm;
    height: ${size.qrSize}mm;
    max-width: 100%;
    max-height: 100%;
    display: block;
    object-fit: contain;
    border: none;
  }
  .label-qr-text {
    font-size: ${size.fontSize.small};
    margin: 0.5mm 0 0 0;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .label-footer {
    border-top: 2px solid #000;
    padding-top: 0.5mm;
    margin-top: 1mm;
    text-align: center;
    font-size: ${size.fontSize.small};
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  }
  @media print {
    .print-controls { display: none !important; }
    .label-qr img {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      image-rendering: pixelated;
      width: ${size.qrSize}mm !important;
      height: ${size.qrSize}mm !important;
      max-width: none !important;
      max-height: none !important;
    }
    .print-label {
      width: ${size.width} !important;
      height: ${size.height} !important;
      overflow: visible !important;
    }
  }
`

// Generate QR code URL
export const generateQRCodeUrl = (productId: string, size: number) => {
  // Ensure minimum resolution for print quality
  const pixelSize = Math.max(size * 6, 150) // Higher resolution for print
  return `https://api.qrserver.com/v1/create-qr-code/?size=${pixelSize}x${pixelSize}&data=${encodeURIComponent(productId)}&format=png&margin=1&ecc=M`
}

// Generate single label HTML
export const generateLabelHTML = (product: ProductWithInventory, size: LabelSize) => {
  const qrCodeUrl = generateQRCodeUrl(product.product_id, size.qrSize)
  
  return `
    <div class="print-label">
      <div class="label-body">
        <div class="label-qr">
          <img src="${qrCodeUrl}" alt="QR Code" />
        </div>
        <div class="label-details">
          <p style="font-weight: bold; font-size: ${size.fontSize.title}; text-align: center; margin: 0 0 2mm 0; padding: 0;">${product.product_name}</p>
          <p style="font-weight: bold; font-size: ${size.fontSize.body}; text-align: center; margin: 0; padding: 0;"><strong>SKU:</strong> ${product.sku || 'N/A'}</p>
        </div>
      </div>
    </div>
  `
}

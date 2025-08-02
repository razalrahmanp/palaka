import { ProductWithInventory } from '@/types'
import { LabelSize } from './LabelSizes'
import { generatePrintStyles, generateLabelHTML } from './PrintUtils'

// Print single label - Direct printing without preview screen
export const printSingleLabel = (product: ProductWithInventory, size: LabelSize) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const styles = generatePrintStyles(size)
  const labelHTML = generateLabelHTML(product, size)

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Print Label</title>
  <meta charset="utf-8">
  <style>${styles}</style>
</head>
<body>
  ${labelHTML}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>`

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

// Print labels based on product quantity - NEW FUNCTION
export const printQuantityLabels = (product: ProductWithInventory, size: LabelSize) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const styles = generatePrintStyles(size)
  const quantity = product.quantity || 1
  
  // Generate multiple labels based on quantity
  const labelElements = Array.from({ length: quantity }, () => 
    generateLabelHTML(product, size)
  ).join('')

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Print ${quantity} Labels - ${product.product_name}</title>
  <meta charset="utf-8">
  <style>${styles}</style>
</head>
<body>
  ${labelElements}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>`

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

// Print multiple labels - Direct printing without preview screen
export const printBatchLabels = (products: ProductWithInventory[], size: LabelSize) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const styles = generatePrintStyles(size)
  
  // Generate labels based on each product's quantity
  const labelElements = products
    .flatMap(product => {
      const quantity = product.quantity || 1
      return Array.from({ length: quantity }, () => 
        generateLabelHTML(product, size)
      )
    })
    .join('')

  // Calculate total label count
  const totalLabels = products.reduce((sum, product) => sum + (product.quantity || 1), 0)

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Batch Print ${totalLabels} Labels</title>
  <meta charset="utf-8">
  <style>${styles}</style>
</head>
<body>
  ${labelElements}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>`

  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
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

// Print multiple labels - Direct printing without preview screen
export const printBatchLabels = (products: ProductWithInventory[], size: LabelSize) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const styles = generatePrintStyles(size)
  const labelElements = products
    .map(product => generateLabelHTML(product, size))
    .join('')

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Batch Print Labels</title>
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
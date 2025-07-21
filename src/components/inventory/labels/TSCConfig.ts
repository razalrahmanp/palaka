// TSC TE244 Printer Configuration Helper
export interface TSCPrinterConfig {
  labelWidth: number // in mm
  labelHeight: number // in mm
  gap: number // in mm
  columns: number
  sheetWidth: number // in mm
}

// Your specific label configuration - Updated for 40x35mm stickers
export const TSC_LABEL_CONFIG: TSCPrinterConfig = {
  labelWidth: 40, // 40 mm
  labelHeight: 35, // 35 mm
  gap: 1.3, // 1.3 mm
  columns: 1, // 1 label per row (40mm is too wide for 2 columns on standard roll)
  sheetWidth: 40 // 40mm single label width
}

// Generate TSC printer commands for label setup
export const generateTSCCommands = (config: TSCPrinterConfig) => {
  return `
SIZE ${config.labelWidth} mm, ${config.labelHeight} mm
GAP ${config.gap} mm, 0 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET PARTIAL_CUTTER OFF
SET TEAR ON
SPEED 4
DENSITY 8
SET RIBBON ON
CLS
`.trim()
}

// Print instructions for TSC TE244 setup
export const TSC_SETUP_INSTRUCTIONS = `
📐 TSC TE244 Printer Setup Instructions - Updated for 40x35mm Labels

1. PRINTER DRIVER SETTINGS:
   • Width: 40mm
   • Height: 35mm
   • Gap: 1.3mm
   • Media Type: Gap/Notch
   • Print Mode: Single Label (not continuous)

2. PRINTER CALIBRATION:
   • Turn OFF printer
   • Hold FEED button
   • Turn ON while holding FEED
   • Release after 2 beeps
   • Printer will auto-detect labels

3. PRINT SETTINGS:
   • Scale: 100% (Actual Size)
   • Paper Size: Custom 40x35mm
   • Print Quantity: 1 (single label)
   • Avoid "Fit to Page" options

4. QUALITY SETTINGS:
   • Print Speed: 4 ips (medium)
   • Print Density: 8 (medium-dark)
   • Ribbon: ON (for thermal transfer)

5. SINGLE LABEL PRINTING:
   • Each print job prints ONE label only
   • Labels print individually (single column format)
   • For batch printing, send multiple single-label jobs
`

// Validate if QR code will fit properly on the label
export const validateQRCodeSize = (qrSizeMM: number, labelConfig: TSCPrinterConfig): {
  isValid: boolean
  recommendation?: string
} => {
  const availableWidth = labelConfig.labelWidth - 6 // 3mm margin each side
  const availableHeight = labelConfig.labelHeight - 6 // 3mm margin top/bottom
  
  if (qrSizeMM > availableWidth || qrSizeMM > availableHeight) {
    return {
      isValid: false,
      recommendation: `QR code size should be maximum ${Math.min(availableWidth, availableHeight)}mm for proper fit`
    }
  }
  
  if (qrSizeMM < 20) {
    return {
      isValid: true,
      recommendation: "QR code might be too small for reliable scanning. Consider 20-25mm minimum for 40x35mm labels."
    }
  }
  
  return { isValid: true }
}

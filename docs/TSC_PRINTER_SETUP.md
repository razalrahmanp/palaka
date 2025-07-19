# TSC Barcode Printer Integration

## Overview

The ProductLabels component has been enhanced to support TSC thermal barcode printers with optimized label sizes and printing functionality.

## Features

### Supported Label Sizes
- **4" x 3" (Large)** - Full information display with large QR codes
- **4" x 2" (Medium)** - Standard size for most products
- **3" x 2" (Standard)** - Compact size, most common for inventory
- **2" x 1" (Small)** - Minimal information, for small items

### Label Contents
Each label includes:
- Product name (truncated to fit)
- SKU (auto-generated or custom)
- Category and Material (abbreviated)
- Location and Stock quantity
- QR code containing product ID
- Supplier information
- Company footer

## Usage Instructions

### Individual Label Printing
1. Navigate to **Inventory → Product Labels** tab
2. Select desired label size from the dropdown
3. Click **"Print Label"** on any product card
4. A new window opens with print preview
5. Click **"Print Label"** to send to printer
6. Configure printer settings for your TSC printer

### Batch Printing
1. Select desired label size
2. Click **"Print All"** button
3. Review the batch print preview
4. Click **"Print All Labels"** to print entire batch

## TSC Printer Setup

### Recommended Settings
- **Paper Size**: Match your physical label size
- **Print Quality**: High (300 DPI)
- **Paper Type**: Thermal transfer or direct thermal
- **Orientation**: Portrait
- **Margins**: 0 (labels are pre-formatted)

### Driver Configuration
1. Install latest TSC printer drivers
2. Set paper size to match selected label dimensions
3. Enable **"Fit to page"** if labels appear too small
4. Disable **"Scale to fit"** for exact sizing

## Label Specifications

### 4" x 3" Labels
- **Dimensions**: 4 inches wide × 3 inches tall
- **QR Code**: 100×100 pixels
- **Font Sizes**: Title 18px, Body 14px, Footer 10px
- **Best for**: Detailed product information

### 4" x 2" Labels  
- **Dimensions**: 4 inches wide × 2 inches tall
- **QR Code**: 80×80 pixels
- **Font Sizes**: Title 16px, Body 12px, Footer 9px
- **Best for**: Standard inventory items

### 3" x 2" Labels (Recommended)
- **Dimensions**: 3 inches wide × 2 inches tall
- **QR Code**: 70×70 pixels  
- **Font Sizes**: Title 14px, Body 11px, Footer 8px
- **Best for**: Most inventory applications

### 2" x 1" Labels
- **Dimensions**: 2 inches wide × 1 inch tall
- **QR Code**: 40×40 pixels
- **Font Sizes**: Title 12px, Body 9px, Footer 7px
- **Best for**: Small items, price tags

## QR Code Information

The QR codes contain the product ID and can be scanned with:
- Barcode scanners
- Mobile apps
- Inventory management systems
- Point-of-sale systems

## Troubleshooting

### Labels Printing Too Small
- Check printer driver settings
- Ensure "Actual Size" or "100%" scaling is selected
- Verify paper size matches label dimensions

### Labels Cut Off
- Reduce font sizes in label size configuration
- Check printer margins are set to 0
- Verify label dimensions match physical labels

### QR Codes Not Scanning
- Increase QR code size in component configuration
- Ensure high print quality (300 DPI minimum)
- Clean printer head and use fresh ribbon/paper

### Print Quality Issues
- Clean TSC printer head with cleaning cards
- Replace thermal ribbon if using thermal transfer
- Check paper feed alignment
- Calibrate printer if needed

## Browser Compatibility

Printing functionality works best with:
- **Chrome** (Recommended)
- **Edge** (Good)
- **Firefox** (Good)
- **Safari** (Limited print controls)

## Future Enhancements

Planned improvements include:
- Barcode format options (Code 128, UPC, etc.)
- Custom label templates
- Direct printer integration (bypass browser print)
- Batch export to common label software
- Integration with TSC printer utilities

## Technical Notes

- Labels use CSS @page rules for precise sizing
- Print media queries hide screen elements
- QR codes generated via external API (qrserver.com)
- Font sizes optimized for thermal printing clarity
- Border styles designed for clean TSC printing

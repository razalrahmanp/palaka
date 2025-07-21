# TSC Custom Printer Setup (40mm x 35mm)

## Your Specific Printer Configuration

### Physical Specifications
- **Sheet Width**: 4.0 cm (40mm)
- **Sticker Width**: 4.0 cm (40mm)
- **Sticker Height**: 3.5 cm (35mm)
- **Gap**: 1.3 mm

## Label Configuration
The ProductLabels component includes your custom TSC size: **TSC 40mm x 35mm (Current)**

### Optimized Dimensions
- **Width**: 40mm (matches your sticker width exactly)
- **Height**: 35mm (matches your sticker height exactly)
- **QR Code**: 25mm x 25mm (optimal for this format)
- **Gap Setting**: 1.3mm (as specified)

### Font Sizes (Optimized for 40mm width)
- **Title**: 11px (product name)
- **Body**: 9px (SKU text)
- **Small**: 7px (product ID under QR code)

## TSC Printer Driver Configuration

### Page Setup (Critical Settings)
```
Paper Size: User Defined/Custom
Width: 40mm
Height: 35mm
Orientation: Portrait
Margins: 0mm (all sides)
Print Area: Full page
Scaling: 100% (never use fit-to-page)
```

### TSC Command Configuration
```
SIZE 40 mm, 35 mm
GAP 1.3 mm, 0 mm  
DIRECTION 0
REFERENCE 0, 0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET PARTIAL_CUTTER OFF
SET TEAR ON
CLS
```

### Print Quality Settings
- **Print Speed**: 4-6 IPS (slower for small labels)
- **Print Density**: 10-12 (adjust based on paper quality)
- **Print Mode**: Thermal Direct or Thermal Transfer
- **Resolution**: 203 DPI (standard for TSC printers)

## Label Layout (38mm x 25mm)
```
┌─────────────────────────────────────┐
│         PRODUCT NAME (7px)          │ ← Header (centered)
├─────────────────────┬───────────────┤
│ SKU: ABC123 (5px)   │   ┌─────────┐ │
│                     │   │ QR CODE │ │ ← 18x18mm QR
│                     │   │  18x18  │ │
│                     │   └─────────┘ │
│                     │   ID123 (4px) │ ← Product ID
├─────────────────────┴───────────────┤
│      SUPPLIER NAME (4px)            │ ← Footer (centered)
└─────────────────────────────────────┘
      38mm total width
```

## Step-by-Step Setup Process

### 1. Physical Setup
- Load 38mm x 25mm labels with 0.3mm gap
- Ensure labels are centered on the 83mm sheet width
- Check that label path is straight and aligned

### 2. Driver Installation
- Install latest TSC printer driver
- Create custom paper size: 38mm x 25mm
- Set gap detection to 0.3mm

### 3. ERP System Setup
- Select "TSC 38mm x 25mm (Custom)" from label size dropdown
- This is now the default selection
- Test with single label first

### 4. Calibration Process
1. Power on printer and load labels
2. Press and hold PAUSE + FEED buttons simultaneously for 3 seconds
3. Printer will auto-calibrate for your gap setting
4. Print test label to verify alignment

## Troubleshooting Your Specific Setup

### QR Code Splitting/Misalignment
**Most likely causes:**
1. **Gap sensor not calibrated** for 0.3mm gap
   - Solution: Run calibration command `~M` or hold PAUSE+FEED
2. **Wrong label dimensions** in driver
   - Solution: Verify 38mm x 25mm exactly in driver settings
3. **Label loading position**
   - Solution: Center labels on 83mm sheet, align with guides

### Text Too Small/Large
- Current font sizes are optimized for 38mm width
- If text appears too small, you can increase font sizes slightly
- Test readability at your typical scanning distance

### Print Quality Issues
- **Too light**: Increase density to 12-14
- **Too dark**: Decrease density to 8-10
- **Blurry**: Reduce print speed to 3-4 IPS
- **Skipping**: Check ribbon installation (if using thermal transfer)

## Testing Your Setup

### Single Label Test
1. Go to Inventory → Product Labels
2. Ensure "TSC 38mm x 25mm (Custom)" is selected
3. Click "Print Label" on any product
4. Check alignment, readability, and QR code quality

### Batch Printing
1. Only proceed after single label test is successful
2. Use "Print All" button for multiple labels
3. Monitor first few labels for consistency

## Maintenance for Your Configuration

### Weekly
- Clean print head with isopropyl alcohol
- Check label alignment and feeding
- Test QR code scanning functionality

### Monthly  
- Recalibrate gap sensor if print quality changes
- Check for label adhesive buildup on sensors
- Verify print density settings

### As Needed
- Replace ribbon (thermal transfer) when print becomes light
- Clean gap sensor if feeding becomes irregular
- Update driver if Windows updates cause issues

## Command Reference for Your Printer

### Manual Calibration
- `~M` - Auto calibrate
- `~M1` - Gap sensor calibration only
- `~R` - Printer reset

### Status Check
- Print configuration page: Hold FEED button for 3 seconds
- Check sensor status in TSC driver utility

Your labels should now print perfectly aligned with the QR codes intact and readable at your specified 38mm x 25mm dimensions!

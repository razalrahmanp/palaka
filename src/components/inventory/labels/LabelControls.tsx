import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Settings, Printer } from 'lucide-react'
import { LABEL_SIZES } from './LabelSizes'

type Props = {
  selectedSize: string
  onSizeChange: (size: string) => void
  onPrintAll: () => void
  productCount: number
}

export const LabelControls: React.FC<Props> = ({ 
  selectedSize, 
  onSizeChange, 
  onPrintAll, 
  productCount 
}) => (
  <div className="bg-white p-4 rounded-lg border shadow-sm">
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="font-medium">Label Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="label-size" className="text-sm font-medium">Size:</label>
          <Select value={selectedSize} onValueChange={onSizeChange}>
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
      <Button 
        onClick={onPrintAll} 
        className="flex items-center gap-2"
        disabled={productCount === 0}
      >
        <Printer className="h-4 w-4" />
        Print All ({productCount})
      </Button>
    </div>
    <div className="mt-2 text-xs text-gray-600">
      Current size: <strong>{LABEL_SIZES[selectedSize].name}</strong> - Optimized for TSC thermal barcode printers
    </div>
  </div>
)

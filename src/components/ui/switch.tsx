import * as React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex h-6 w-11 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          checked ? 'bg-blue-600' : 'bg-gray-200',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <input
          id={id}
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          aria-label="Toggle switch"
        />
        <span
          className={cn(
            'block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </label>
    )
  }
)

Switch.displayName = 'Switch'

export { Switch }

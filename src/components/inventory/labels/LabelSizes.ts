// Label size configurations
export type LabelSize = {
  name: string
  width: string
  height: string
  qrSize: number
  fontSize: {
    title: string
    body: string
    small: string
  }
}

export const LABEL_SIZES: Record<string, LabelSize> = {
  'tsc-40x35': {
    name: 'TSC 40mm x 35mm (Current)',
    width: '40mm',
    height: '35mm',
    qrSize: 28,
    fontSize: { title: '12px', body: '10px', small: '9px' }
  },
  
  '50x25': {
    name: '50mm x 25mm (2" x 1")',
    width: '50mm',
    height: '25mm',
    qrSize: 22,
    fontSize: { title: '8px', body: '6px', small: '5px' }
  },
  '75x25': {
    name: '75mm x 25mm (3" x 1")',
    width: '75mm',
    height: '25mm',
    qrSize: 24,
    fontSize: { title: '10px', body: '8px', small: '6px' }
  },
  '100x50': {
    name: '100mm x 50mm (4" x 2")',
    width: '100mm',
    height: '50mm',
    qrSize: 42,
    fontSize: { title: '12px', body: '10px', small: '8px' }
  },
  '75x50': {
    name: '75mm x 50mm (3" x 2")',
    width: '75mm',
    height: '50mm',
    qrSize: 38,
    fontSize: { title: '10px', body: '8px', small: '6px' }
  }
}

export const DEFAULT_LABEL_SIZE = 'tsc-40x35'

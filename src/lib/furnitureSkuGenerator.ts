// src/lib/furnitureSkuGenerator.ts
import { supabase } from './supabaseAdmin';

// Subcategory code mapping
const SUBCATEGORY_CODES: Record<string, string> = {
  // Seating
  'Chairs': 'CHR',
  'Office Chairs': 'OCH',
  'Stools': 'STL',
  'Benches': 'BNC',
  'Sofas': 'SOF',
  
  // Tables
  'Dining Tables': 'DTB',
  'Coffee & Side Tables': 'CTB',
  'Specialty Tables': 'SPT',
  'Work Tables': 'WTB',
  'Utility Tables': 'UTB',
  
  // Bedroom
  'Beds': 'BED',
  'Mattresses & Bedding': 'MTT',
  'Bedroom Furniture': 'BDF',
  'Storage Units': 'STU',
  
  // Storage
  'Shelving & Racks': 'SHV',
  'Stands & Hangers': 'STD',
  
  // Decor
  'Wall Decor': 'WDC',
  'Home Textiles': 'HTX',
  'Traditional Items': 'TRD',
  'Decorative Items': 'DCR'
};

// Material code mapping
const MATERIAL_CODES: Record<string, string> = {
  // Woods
  'Teak': 'TK',
  'Mahogany': 'MH',
  'Acacia': 'AC',
  'Rubberwood': 'RW',
  'Plywood': 'PW',
  'Multi Wood': 'MW',
  'Particle Board': 'PB',
  'MDF': 'MD',
  
  // Upholstery
  'Leather': 'LT',
  'Rexin': 'RX',
  'Cotton': 'CT',
  'Velvet': 'VL',
  
  // Metals
  'Steel': 'ST',
  'Iron': 'IR',
  'Aluminum': 'AL',
  
  // Glass
  'Glass': 'GL',
  'Tempered Glass': 'TG',
  'Frosted Glass': 'FG',
  
  // Synthetic
  'Plastic': 'PL',
  'Fiber': 'FB',
  
  // Others
  'Marble': 'MB'
};

interface SkuOptions {
  category: string;
  subcategory: string;
  material: string;
  color?: string;
  size?: string;
}

/**
 * Generate a SKU for furniture items based on category, subcategory and material
 * Format: SUB-MAT-COLOR-SIZE-XXXX (e.g., CHR-TK-NA-STD-0001 for Chair-Teak-NA-Standard)
 */
export async function generateFurnitureSku(
  options: SkuOptions
): Promise<string> {
  const { subcategory, material, color = 'NA', size = 'STD' } = options;
  
  // Generate category and subcategory codes
  const subCode = SUBCATEGORY_CODES[subcategory] || subcategory.substring(0, 3).toUpperCase();
  const matCode = MATERIAL_CODES[material] || material.substring(0, 3).toUpperCase();
  
  // Process color and size
  const colorCode = color.substring(0, 2).toUpperCase();
  const sizeCode = size.substring(0, 3).toUpperCase();
  
  const prefix = `${subCode}-${matCode}-${colorCode}-${sizeCode}-`;

  // Find the highest existing SKU with this prefix
  const { data, error } = await supabase
    .from('products')
    .select('sku')
    .like('sku', `${prefix}%`);

  if (error) throw new Error(error.message);

  const used = new Set(
    (data || [])
      .map(d => d.sku)
      .map(sku => {
        const parts = sku.split('-');
        return parseInt(parts[4], 10);
      })
      .filter(n => !isNaN(n))
  );

  let next = 1;
  while (used.has(next) && next < 9999) next++;
  if (next >= 9999) throw new Error(`SKU space exhausted for ${prefix}`);

  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * Parse SKU to extract furniture attributes
 */
export function parseFurnitureSku(sku: string): Partial<SkuOptions> | null {
  // Expected format: SUB-MAT-COLOR-SIZE-XXXX
  const parts = sku.split('-');
  if (parts.length !== 5) {
    return null;
  }
  
  const [subCode, matCode, colorCode, sizeCode] = parts;
  
  // Reverse lookup for subcategory
  let subcategory = '';
  for (const [key, value] of Object.entries(SUBCATEGORY_CODES)) {
    if (value === subCode) {
      subcategory = key;
      break;
    }
  }
  
  // Reverse lookup for material
  let material = '';
  for (const [key, value] of Object.entries(MATERIAL_CODES)) {
    if (value === matCode) {
      material = key;
      break;
    }
  }
  
  // Find category based on subcategory
  let category = '';
  for (const [cat, subCats] of Object.entries({
    'Seating': ['Chairs', 'Office Chairs', 'Stools', 'Benches', 'Sofas'],
    'Tables': ['Dining Tables', 'Coffee & Side Tables', 'Specialty Tables', 'Work Tables', 'Utility Tables'],
    'Bedroom Furniture': ['Beds', 'Mattresses & Bedding', 'Bedroom Furniture', 'Storage Units'],
    'Storage & Organization': ['Shelving & Racks', 'Stands & Hangers'],
    'Decor & Accessories': ['Wall Decor', 'Home Textiles', 'Traditional Items', 'Decorative Items']
  })) {
    if (subCats.includes(subcategory)) {
      category = cat;
      break;
    }
  }
  
  return {
    category,
    subcategory,
    material,
    color: colorCode,
    size: sizeCode
  };
}

import { supabase } from './supabaseAdmin';

/**
 * Generate an advanced SKU:
 * SUPP-PROD-XXXX
 * @param productName
 * @param supplierName
 */
export async function generateSku(productName: string, supplierName?: string): Promise<string> {
  const product = (productName.replace(/\W+/g, '').toUpperCase() + 'XXXX').slice(0, 4);
  const supplier = supplierName
    ? (supplierName.replace(/\W+/g, '').toUpperCase() + 'XXXX').slice(0, 4)
    : 'GENR';

  const prefix = `${supplier}-${product}-`;

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
        return parseInt(parts[2], 10);
      })
      .filter(n => !isNaN(n))
  );

  let next = 1;
  while (used.has(next) && next < 9999) next++;
  if (next >= 9999) throw new Error(`SKU space exhausted for ${prefix}`);

  return `${prefix}${String(next).padStart(4, '0')}`;
}

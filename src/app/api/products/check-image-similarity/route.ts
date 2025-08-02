import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

// Types for image similarity detection
interface ImageMatch {
  id: string
  product_name: string
  sku: string
  category: string
  subcategory: string
  image_url: string
  similarity_score: number
  match_type: 'EXACT_IMAGE' | 'SIMILAR_IMAGE' | 'VISUAL_FEATURES'
  created_at: string
}

interface ProductData {
  id: string
  name: string
  sku: string
  description: string
  image_url: string
  created_at: string
}

interface InventoryItemWithProduct {
  id: string
  category: string
  subcategory: string
  products: ProductData
}

// Image similarity detection using AI vision
export async function POST(req: NextRequest) {
  try {
    const { imageUrl, productName, threshold = 0.8 } = await req.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Fetch all products with images for comparison
    const { data: existingProducts, error } = await supabase
      .from('inventory_items')
      .select(`
        id,
        category,
        subcategory,
        products!inner (
          id,
          name,
          sku,
          description,
          image_url,
          created_at
        )
      `)
      .not('products.image_url', 'is', null) as { data: InventoryItemWithProduct[] | null, error: Error | null }

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    console.log('Database query result:', { 
      count: existingProducts?.length, 
      firstItem: existingProducts?.[0],
      productStructure: existingProducts?.[0]?.products
    })

    if (!existingProducts) {
      return NextResponse.json({ 
        hasMatches: false,
        matchCount: 0,
        matches: [],
        riskLevel: 'NONE',
        message: 'No existing products found.',
        recommendations: []
      })
    }

    const matches: ImageMatch[] = []
    
    // For now, we'll use a simple approach with image metadata comparison
    // In production, you'd integrate with Azure Computer Vision or Google Vision AI
    
    for (const inventoryItem of existingProducts) {
      const product = inventoryItem.products;
      
      if (!product || !product.image_url) continue;
      
      // Simple URL-based similarity check (basic implementation)
      let similarity = 0
      
      // Check if it's the exact same image URL
      if (imageUrl === product.image_url) {
        similarity = 1.0
      } else {
        // Basic filename comparison
        const newImageName = imageUrl.split('/').pop()?.toLowerCase() || ''
        const existingImageName = product.image_url.split('/').pop()?.toLowerCase() || ''
        
        if (newImageName && existingImageName) {
          // Remove file extensions for comparison
          const newName = newImageName.replace(/\.[^/.]+$/, "")
          const existingName = existingImageName.replace(/\.[^/.]+$/, "")
          
          // Calculate simple string similarity
          similarity = calculateStringSimilarity(newName, existingName)
        }
      }
      
      // If we have a product name, factor that in
      if (productName && product.name) {
        const nameSimilarity = calculateStringSimilarity(productName.toLowerCase(), product.name.toLowerCase())
        // Weighted combination: 70% image, 30% name
        similarity = (similarity * 0.7) + (nameSimilarity * 0.3)
      }
      
      if (similarity >= threshold) {
        matches.push({
          id: product.id,
          product_name: product.name,
          sku: product.sku,
          category: inventoryItem.category,
          subcategory: inventoryItem.subcategory,
          image_url: product.image_url,
          similarity_score: Math.round(similarity * 100),
          match_type: similarity === 1.0 ? 'EXACT_IMAGE' : 'SIMILAR_IMAGE',
          created_at: product.created_at
        })
      }
    }

    // Sort by similarity score
    matches.sort((a, b) => b.similarity_score - a.similarity_score)

    const riskLevel = matches.length > 0 ? 
      (matches[0].similarity_score >= 95 ? 'VERY_HIGH' :
       matches[0].similarity_score >= 85 ? 'HIGH' :
       matches[0].similarity_score >= 75 ? 'MEDIUM' : 'LOW') : 'NONE'

    return NextResponse.json({
      hasMatches: matches.length > 0,
      matchCount: matches.length,
      matches: matches.slice(0, 10), // Return top 10 matches
      riskLevel,
      message: matches.length > 0 ? 
        `Found ${matches.length} visually similar product(s). ${matches[0].match_type === 'EXACT_IMAGE' ? 'EXACT image match detected!' : 'Similar images found.'}` :
        'No visually similar products found.',
      recommendations: getRecommendations(matches, riskLevel)
    })

  } catch (error) {
    console.error('Error in image similarity detection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  
  const len1 = str1.length
  const len2 = str2.length
  
  if (len1 === 0 || len2 === 0) return 0
  
  // Simple Jaccard similarity for quick comparison
  const set1 = new Set(str1.toLowerCase().split(''))
  const set2 = new Set(str2.toLowerCase().split(''))
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

function getRecommendations(matches: ImageMatch[], riskLevel: string): string[] {
  const recommendations = []
  
  if (riskLevel === 'VERY_HIGH') {
    recommendations.push('🚨 CRITICAL: Exact or near-exact image match found!')
    recommendations.push('Strongly recommend reviewing existing product before adding')
    recommendations.push('This may be a duplicate entry attempt')
  } else if (riskLevel === 'HIGH') {
    recommendations.push('⚠️ HIGH RISK: Very similar image detected')
    recommendations.push('Check if this is a different angle/variant of existing product')
    recommendations.push('Verify product specifications are genuinely different')
  } else if (riskLevel === 'MEDIUM') {
    recommendations.push('⚡ MEDIUM RISK: Visually similar products found')
    recommendations.push('Review similar products to ensure this is unique')
    recommendations.push('Consider if this is a color/size variant')
  } else if (riskLevel === 'LOW') {
    recommendations.push('💡 LOW RISK: Some visual similarities detected')
    recommendations.push('Likely a different product, but worth quick review')
  }
  
  if (matches.some(m => m.match_type === 'EXACT_IMAGE')) {
    recommendations.push('🔍 EXACT IMAGE MATCH: Same image file detected in system')
  }
  
  return recommendations
}

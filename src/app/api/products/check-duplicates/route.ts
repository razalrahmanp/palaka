import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

// Simple similarity function for product names
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // Calculate Levenshtein distance
  const matrix = []
  const len1 = s1.length
  const len2 = s2.length
  
  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  
  const distance = matrix[len1][len2]
  const maxLength = Math.max(len1, len2)
  return (maxLength - distance) / maxLength
}

// Extract key features from product name for better matching
function extractFeatures(productName: string): string[] {
  const features: string[] = []
  const name = productName.toLowerCase()
  
  // Extract common furniture terms
  const furnitureTypes = ['chair', 'table', 'sofa', 'bed', 'desk', 'cabinet', 'shelf', 'drawer', 'wardrobe']
  const materials = ['wood', 'metal', 'glass', 'fabric', 'leather', 'plastic', 'bamboo', 'oak', 'pine', 'steel']
  const colors = ['black', 'white', 'brown', 'red', 'blue', 'green', 'gray', 'beige', 'yellow']
  const sizes = ['small', 'medium', 'large', 'xl', 'xs', 'king', 'queen', 'single', 'double']
  
  // Check for furniture types
  furnitureTypes.forEach(type => {
    if (name.includes(type)) features.push(`type:${type}`)
  })
  
  // Check for materials
  materials.forEach(material => {
    if (name.includes(material)) features.push(`material:${material}`)
  })
  
  // Check for colors
  colors.forEach(color => {
    if (name.includes(color)) features.push(`color:${color}`)
  })
  
  // Check for sizes
  sizes.forEach(size => {
    if (name.includes(size)) features.push(`size:${size}`)
  })
  
  return features
}

export async function POST(req: NextRequest) {
  try {
    const { productName, category, subcategory, description, sku } = await req.json()
    
    if (!productName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 })
    }

    // Fetch existing products for comparison
    const { data: existingProducts, error } = await supabase
      .from('products')
      .select('id, product_name, category, subcategory, description, sku, created_at')
      .neq('sku', sku) // Exclude the current product if updating

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    const duplicates = []
    const productFeatures = extractFeatures(productName)

    for (const existing of existingProducts) {
      let totalScore = 0
      let factors = 0

      // 1. Product name similarity (weight: 40%)
      const nameSimilarity = calculateSimilarity(productName, existing.product_name)
      totalScore += nameSimilarity * 0.4
      factors++

      // 2. Category match (weight: 20%)
      if (category && existing.category) {
        const categoryMatch = category.toLowerCase() === existing.category.toLowerCase() ? 1 : 0
        totalScore += categoryMatch * 0.2
        factors++
      }

      // 3. Subcategory match (weight: 15%)
      if (subcategory && existing.subcategory) {
        const subcategoryMatch = subcategory.toLowerCase() === existing.subcategory.toLowerCase() ? 1 : 0
        totalScore += subcategoryMatch * 0.15
        factors++
      }

      // 4. Description similarity (weight: 15%)
      if (description && existing.description) {
        const descSimilarity = calculateSimilarity(description, existing.description)
        totalScore += descSimilarity * 0.15
        factors++
      }

      // 5. Feature overlap (weight: 10%)
      const existingFeatures = extractFeatures(existing.product_name)
      const commonFeatures = productFeatures.filter(f => existingFeatures.includes(f))
      const featureScore = existingFeatures.length > 0 ? commonFeatures.length / Math.max(productFeatures.length, existingFeatures.length) : 0
      totalScore += featureScore * 0.1
      factors++

      // Calculate final similarity score
      const similarityScore = factors > 0 ? totalScore : 0

      // Consider it a potential duplicate if similarity > 60%
      if (similarityScore > 0.6) {
        duplicates.push({
          id: existing.id,
          product_name: existing.product_name,
          category: existing.category,
          subcategory: existing.subcategory,
          sku: existing.sku,
          similarity_score: Math.round(similarityScore * 100),
          created_at: existing.created_at,
          reasons: [
            nameSimilarity > 0.7 ? `Name similarity: ${Math.round(nameSimilarity * 100)}%` : null,
            category && existing.category && category.toLowerCase() === existing.category.toLowerCase() ? 'Same category' : null,
            subcategory && existing.subcategory && subcategory.toLowerCase() === existing.subcategory.toLowerCase() ? 'Same subcategory' : null,
            commonFeatures.length > 0 ? `Common features: ${commonFeatures.join(', ')}` : null
          ].filter(Boolean)
        })
      }
    }

    // Sort by similarity score (highest first)
    duplicates.sort((a, b) => b.similarity_score - a.similarity_score)

    return NextResponse.json({
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.length,
      duplicates: duplicates.slice(0, 10), // Return top 10 matches
      riskLevel: duplicates.length > 0 ? 
        (duplicates[0].similarity_score > 90 ? 'HIGH' : 
         duplicates[0].similarity_score > 75 ? 'MEDIUM' : 'LOW') : 'NONE',
      message: duplicates.length > 0 ? 
        `Found ${duplicates.length} potential duplicate(s). Please review before adding.` :
        'No potential duplicates found. Safe to add.'
    })

  } catch (error) {
    console.error('Error in duplicate detection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

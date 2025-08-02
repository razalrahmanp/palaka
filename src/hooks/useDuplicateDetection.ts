import { useState } from 'react'

interface DuplicateProduct {
  id: string
  product_name: string
  category: string
  subcategory: string
  sku: string
  similarity_score: number
  created_at: string
  reasons: string[]
}

interface DuplicateCheckResult {
  hasDuplicates: boolean
  duplicateCount: number
  duplicates: DuplicateProduct[]
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  message: string
}

interface ProductData {
  productName: string
  category?: string
  subcategory?: string
  description?: string
  sku?: string
}

export const useDuplicateDetection = () => {
  const [isChecking, setIsChecking] = useState(false)
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const checkForDuplicates = async (productData: ProductData): Promise<DuplicateCheckResult | null> => {
    setIsChecking(true)
    
    try {
      const response = await fetch('/api/products/check-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        throw new Error('Failed to check for duplicates')
      }

      const result: DuplicateCheckResult = await response.json()
      setDuplicateResult(result)
      
      // Show dialog if duplicates found
      if (result.hasDuplicates) {
        setShowDialog(true)
      }
      
      return result
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      return null
    } finally {
      setIsChecking(false)
    }
  }

  const resetDuplicateCheck = () => {
    setDuplicateResult(null)
    setShowDialog(false)
  }

  const closeDuplicateDialog = () => {
    setShowDialog(false)
  }

  return {
    isChecking,
    duplicateResult,
    showDialog,
    checkForDuplicates,
    resetDuplicateCheck,
    closeDuplicateDialog,
    setShowDialog
  }
}

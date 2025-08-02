import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Eye, CheckCircle2, XCircle } from 'lucide-react'

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

interface ImageSimilarityResult {
  hasMatches: boolean
  matchCount: number
  matches: ImageMatch[]
  riskLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  message: string
  recommendations: string[]
}

interface ImageSimilarityDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  productName?: string
  onProceed: () => void
  onCancel: () => void
}

export function ImageSimilarityDialog({ 
  isOpen, 
  onClose, 
  imageUrl, 
  productName, 
  onProceed, 
  onCancel 
}: ImageSimilarityDialogProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<ImageSimilarityResult | null>(null)
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null)

  const checkImageSimilarity = useCallback(async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/products/check-image-similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          productName,
          threshold: 0.75
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to check image similarity')
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error checking image similarity:', error)
      setResult({
        hasMatches: false,
        matchCount: 0,
        matches: [],
        riskLevel: 'NONE',
        message: 'Error checking for similar images. Please proceed with caution.',
        recommendations: ['⚠️ Image similarity check failed', 'Manually verify if this product already exists']
      })
    } finally {
      setIsChecking(false)
    }
  }, [imageUrl, productName])

  React.useEffect(() => {
    if (isOpen && imageUrl) {
      checkImageSimilarity()
    }
  }, [isOpen, imageUrl, checkImageSimilarity])

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'VERY_HIGH': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'VERY_HIGH': return <XCircle className="h-4 w-4" />
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4" />
      case 'LOW': return <Eye className="h-4 w-4" />
      default: return <CheckCircle2 className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Image Similarity Detection
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Image Preview */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <Image 
                src={imageUrl} 
                alt="Product being added" 
                width={80}
                height={80}
                className="object-cover rounded-md border"
              />
              <div>
                <h3 className="font-medium">New Product Image</h3>
                {productName && <p className="text-sm text-muted-foreground">{productName}</p>}
                <p className="text-xs text-muted-foreground">Checking for similar images in database...</p>
              </div>
            </div>

            {/* Loading State */}
            {isChecking && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Analyzing image similarity...</span>
              </div>
            )}

            {/* Results */}
            {result && !isChecking && (
              <div className="space-y-4">
                {/* Risk Level Alert */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {getRiskIcon(result.riskLevel)}
                    <Badge variant={getRiskColor(result.riskLevel)}>
                      {result.riskLevel.replace('_', ' ')} RISK
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    {result.message}
                  </p>
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">AI Recommendations:</h4>
                    <ul className="space-y-1">
                      {result.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Similar Images Found */}
                {result.hasMatches && result.matches.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Similar Products Found ({result.matchCount}):</h4>
                    <div className="grid gap-3">
                      {result.matches.map((match) => (
                        <div key={match.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                          <Image 
                            src={match.image_url} 
                            alt={match.product_name}
                            width={64}
                            height={64}
                            className="object-cover rounded-md border cursor-pointer hover:opacity-80"
                            onClick={() => setShowImagePreview(match.image_url)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium truncate">{match.product_name}</h5>
                              <Badge variant="outline" className="shrink-0">
                                {match.similarity_score}% Match
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">SKU: {match.sku}</p>
                            <p className="text-sm text-muted-foreground">
                              {match.category} • {match.subcategory} • Added {formatDate(match.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={match.match_type === 'EXACT_IMAGE' ? 'destructive' : 'secondary'}
                              className="mb-1"
                            >
                              {match.match_type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Matches */}
                {!result.hasMatches && (
                  <div className="text-center p-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No visually similar products found!</p>
                    <p className="text-sm">This appears to be a unique product image.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel Addition
              </Button>
            </div>
            <div className="flex gap-2">
              {result && result.hasMatches && (
                <Button variant="outline" onClick={checkImageSimilarity}>
                  Re-check
                </Button>
              )}
              <Button 
                onClick={onProceed}
                variant={result?.riskLevel === 'VERY_HIGH' ? 'destructive' : 'default'}
                disabled={isChecking}
              >
                {result?.riskLevel === 'VERY_HIGH' ? 'Add Anyway (Risk)' : 'Proceed to Add'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {showImagePreview && (
        <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <Image 
                src={showImagePreview} 
                alt="Preview" 
                width={600}
                height={400}
                className="object-contain rounded-lg"
                style={{ maxHeight: '400px', width: 'auto' }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// Hook for using image similarity detection
export function useImageSimilarity() {
  const [isOpen, setIsOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [onProceedCallback, setOnProceedCallback] = useState<(() => void) | null>(null)
  const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null)

  const checkSimilarity = (
    url: string, 
    name: string, 
    onProceed: () => void, 
    onCancel: () => void
  ) => {
    setImageUrl(url)
    setProductName(name)
    setOnProceedCallback(() => onProceed)
    setOnCancelCallback(() => onCancel)
    setIsOpen(true)
  }

  const handleProceed = () => {
    setIsOpen(false)
    onProceedCallback?.()
  }

  const handleCancel = () => {
    setIsOpen(false)
    onCancelCallback?.()
  }

  const Dialog = () => (
    <ImageSimilarityDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      imageUrl={imageUrl}
      productName={productName}
      onProceed={handleProceed}
      onCancel={handleCancel}
    />
  )

  return {
    checkSimilarity,
    Dialog
  }
}

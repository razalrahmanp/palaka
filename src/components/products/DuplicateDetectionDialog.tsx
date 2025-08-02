import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

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

interface Props {
  isOpen: boolean
  onClose: () => void
  duplicateResult: DuplicateCheckResult | null
  onProceed: () => void
  onCancel: () => void
  productName: string
}

export const DuplicateDetectionDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  duplicateResult,
  onProceed,
  onCancel,
  productName
}) => {

  if (!duplicateResult) return null

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'HIGH': return <AlertTriangle className="h-5 w-5" />
      case 'MEDIUM': return <Info className="h-5 w-5" />
      case 'LOW': return <Info className="h-5 w-5" />
      default: return <CheckCircle className="h-5 w-5" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getRiskIcon(duplicateResult.riskLevel)}
            AI Product Duplicate Detection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Risk Level Banner */}
          <div className={`p-4 rounded-lg border ${getRiskColor(duplicateResult.riskLevel)}`}>
            <div className="flex items-center gap-2 mb-2">
              {getRiskIcon(duplicateResult.riskLevel)}
              <h3 className="font-semibold">
                Risk Level: {duplicateResult.riskLevel}
              </h3>
            </div>
            <p>{duplicateResult.message}</p>
          </div>

          {/* Product Being Added */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Product Being Added:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                <p className="font-medium">{productName}</p>
              </div>
            </CardContent>
          </Card>

          {/* Potential Duplicates */}
          {duplicateResult.hasDuplicates && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Potential Duplicates Found ({duplicateResult.duplicateCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {duplicateResult.duplicates.map((duplicate) => (
                    <div key={duplicate.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{duplicate.product_name}</h4>
                          <div className="text-xs text-gray-600 mt-1">
                            SKU: {duplicate.sku} | Added: {new Date(duplicate.created_at).toLocaleDateString()}
                          </div>
                          {duplicate.category && (
                            <div className="text-xs text-gray-600">
                              Category: {duplicate.category}
                              {duplicate.subcategory && ` > ${duplicate.subcategory}`}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={duplicate.similarity_score > 90 ? 'destructive' : 
                                   duplicate.similarity_score > 75 ? 'default' : 'secondary'}
                        >
                          {duplicate.similarity_score}% match
                        </Badge>
                      </div>
                      
                      {/* Reasons for similarity */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {duplicate.reasons.map((reason, reasonIndex) => (
                          <Badge key={reasonIndex} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                🤖 AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {duplicateResult.riskLevel === 'HIGH' && (
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-red-800">
                      <strong>⚠️ High Risk:</strong> This product appears very similar to existing items. 
                      Consider reviewing the existing products before adding this one.
                    </p>
                  </div>
                )}
                {duplicateResult.riskLevel === 'MEDIUM' && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-yellow-800">
                      <strong>⚡ Medium Risk:</strong> Some similarities detected. 
                      Please verify this is genuinely a different product.
                    </p>
                  </div>
                )}
                {duplicateResult.riskLevel === 'LOW' && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-blue-800">
                      <strong>💡 Low Risk:</strong> Minor similarities found, but likely a different product.
                    </p>
                  </div>
                )}
                {duplicateResult.riskLevel === 'NONE' && (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-green-800">
                      <strong>✅ No Risk:</strong> No significant duplicates detected. Safe to proceed.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                onCancel()
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel & Review
            </Button>
            
            <Button 
              onClick={() => {
                onProceed()
              }}
              className={`${
                duplicateResult.riskLevel === 'HIGH' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {duplicateResult.riskLevel === 'HIGH' 
                ? 'Proceed Anyway (High Risk)' 
                : 'Proceed with Adding Product'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

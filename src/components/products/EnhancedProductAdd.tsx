import React, { useState } from 'react'
import Image from 'next/image'
import { useImageSimilarity } from './ImageSimilarityDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Eye, Shield } from 'lucide-react'

interface ProductData {
  product_name: string
  category: string
  image_url: string
  description: string
}

interface EnhancedProductAddProps {
  onProductAdd: (productData: ProductData) => void
}

export function EnhancedProductAdd({ onProductAdd }: EnhancedProductAddProps) {
  const [productData, setProductData] = useState({
    product_name: '',
    category: '',
    image_url: '',
    description: ''
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { checkSimilarity, Dialog } = useImageSimilarity()

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setImagePreview(imageUrl)
        setProductData(prev => ({ ...prev, image_url: imageUrl }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitWithSimilarityCheck = () => {
    if (!productData.image_url || !productData.product_name) {
      alert('Please provide both product name and image')
      return
    }

    // Start similarity check before adding product
    checkSimilarity(
      productData.image_url,
      productData.product_name,
      () => {
        // User chose to proceed despite similarities
        onProductAdd(productData)
      },
      () => {
        // User cancelled - don't add product
        console.log('Product addition cancelled due to similarity check')
      }
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Smart Product Addition with AI Duplicate Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="product_name">Product Name</Label>
            <Input
              id="product_name"
              value={productData.product_name}
              onChange={(e) => setProductData(prev => ({ ...prev, product_name: e.target.value }))}
              placeholder="Enter product name"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={productData.category}
              onChange={(e) => setProductData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Enter category"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={productData.description}
              onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image">Product Image</Label>
            <div className="flex items-center gap-4">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="flex-1"
              />
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="space-y-2">
              <Label>Image Preview</Label>
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <Image 
                  src={imagePreview} 
                  alt="Product preview" 
                  width={96}
                  height={96}
                  className="object-cover rounded-md border"
                />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Image ready for similarity analysis
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Our AI will check for visually similar products before adding
                  </p>
                </div>
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmitWithSimilarityCheck}
              disabled={!productData.product_name || !productData.image_url}
              className="flex-1"
            >
              <Shield className="h-4 w-4 mr-2" />
              Add Product with AI Check
            </Button>
            <Button
              variant="outline"
              onClick={() => onProductAdd(productData)}
              disabled={!productData.product_name}
            >
              Skip AI Check
            </Button>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <p className="font-medium text-blue-900">🤖 AI-Powered Duplicate Detection</p>
            <p className="text-blue-700">
              Our system will analyze your image and compare it with existing products to prevent duplicates.
              This helps maintain inventory accuracy and prevents accidental re-entries.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Image Similarity Dialog */}
      <Dialog />
    </div>
  )
}

// Usage example for inventory management
export function ProductInventoryWithAI() {
  const handleProductAdd = (productData: ProductData) => {
    console.log('Adding product:', productData)
    // Here you would typically save to database
    // fetch('/api/products', { method: 'POST', body: JSON.stringify(productData) })
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Inventory Management - Smart Product Addition</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedProductAdd onProductAdd={handleProductAdd} />
        
        <Card>
          <CardHeader>
            <CardTitle>How Image Detection Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">1</div>
              <div>
                <p className="font-medium">Image Upload</p>
                <p className="text-sm text-muted-foreground">Upload your product image</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">2</div>
              <div>
                <p className="font-medium">AI Analysis</p>
                <p className="text-sm text-muted-foreground">Our AI compares with existing product images</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">3</div>
              <div>
                <p className="font-medium">Similarity Detection</p>
                <p className="text-sm text-muted-foreground">Identifies potentially duplicate products</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">4</div>
              <div>
                <p className="font-medium">Risk Assessment</p>
                <p className="text-sm text-muted-foreground">Provides risk level and recommendations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

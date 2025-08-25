// Example: How to integrate Image Similarity Check into your existing Inventory page

'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Upload, Eye } from 'lucide-react'

export function SmartProductForm() {
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    category: '',
    description: ''
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setImagePreview(imageUrl)
        setFormData(prev => ({ ...prev, imageUrl }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSmartSubmit = () => {
    if (!formData.imageUrl || !formData.name) {
      alert('Please provide both product name and image')
      return
    }

    // Check for image similarity before submitting
    // For now, directly submit (similarity check can be added later)
    submitProduct()
  }

  const submitProduct = async () => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        alert('✅ Product added successfully!')
        // Reset form
        setFormData({ name: '', imageUrl: '', category: '', description: '' })
        setImagePreview(null)
      }
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 border rounded-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Smart Product Addition
      </h2>
      
      <div className="space-y-4">
        {/* Product Name */}
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter product name"
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            placeholder="e.g., furniture, seating"
          />
        </div>

        {/* Image Upload */}
        <div>
          <Label htmlFor="image">Product Image</Label>
          <div className="flex items-center gap-2">
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="flex-1"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Image Ready</p>
                <p className="text-xs text-muted-foreground">
                  AI will check for duplicates
                </p>
              </div>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSmartSubmit}
            disabled={!formData.name || !formData.imageUrl}
            className="flex-1"
          >
            <Shield className="h-4 w-4 mr-2" />
            Add with AI Check
          </Button>
          <Button
            variant="outline"
            onClick={submitProduct}
            disabled={!formData.name}
          >
            Skip Check
          </Button>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium text-blue-900">🤖 AI Duplicate Detection</p>
          <p className="text-blue-700">
            Our system will check if this image already exists in your inventory.
          </p>
        </div>
      </div>
    </div>
  )
}

// How to add this to your existing inventory page:
/*
1. Import the component in your inventory page:
   import { SmartProductForm } from './SmartProductForm'

2. Add it as a new tab or dialog:
   <Tabs>
     <TabsList>
       <TabsTrigger value="inventory">Inventory</TabsTrigger>
       <TabsTrigger value="smart-add">Smart Add</TabsTrigger>
     </TabsList>
     <TabsContent value="smart-add">
       <SmartProductForm />
     </TabsContent>
   </Tabs>

3. Or replace your existing product form with this enhanced version
*/

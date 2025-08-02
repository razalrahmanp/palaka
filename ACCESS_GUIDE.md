# 🔗 Image Similarity Detection - Integration Guide

## API Endpoint Access

### Base URL
```
http://localhost:3000/api/products/check-image-similarity
```

### Method: POST

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Request Body
```json
{
  "imageUrl": "https://your-image-url.com/image.jpg",
  "productName": "Product Name (optional)",
  "threshold": 0.75
}
```

### Response Format
```json
{
  "hasMatches": true,
  "matchCount": 3,
  "riskLevel": "HIGH",
  "message": "Found 3 visually similar product(s)",
  "matches": [
    {
      "id": "product-123",
      "product_name": "Similar Product",
      "sku": "SKU-001",
      "category": "furniture",
      "subcategory": "chairs",
      "image_url": "https://...",
      "similarity_score": 95,
      "match_type": "EXACT_IMAGE",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "recommendations": [
    "🚨 CRITICAL: Exact or near-exact image match found!",
    "Strongly recommend reviewing existing product before adding"
  ]
}
```

## 📱 Frontend Integration Examples

### 1. JavaScript/Fetch API
```javascript
async function checkImageSimilarity(imageUrl, productName = '') {
  try {
    const response = await fetch('/api/products/check-image-similarity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        productName: productName,
        threshold: 0.75
      })
    });
    
    const result = await response.json();
    
    if (result.hasMatches) {
      console.log(`⚠️ ${result.riskLevel} RISK: ${result.message}`);
      result.matches.forEach(match => {
        console.log(`- ${match.product_name} (${match.similarity_score}% match)`);
      });
    } else {
      console.log('✅ No similar products found');
    }
    
    return result;
  } catch (error) {
    console.error('Error checking similarity:', error);
  }
}

// Usage
checkImageSimilarity('https://example.com/chair.jpg', 'Office Chair');
```

### 2. React Hook Integration
```jsx
import { useState } from 'react';

export function useImageSimilarityCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkSimilarity = async (imageUrl, productName = '') => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/products/check-image-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, productName, threshold: 0.75 })
      });
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (error) {
      console.error('Similarity check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return { checkSimilarity, isChecking, result };
}

// Usage in component
function ProductForm() {
  const { checkSimilarity, isChecking, result } = useImageSimilarityCheck();
  
  const handleImageUpload = async (imageUrl) => {
    const similarityResult = await checkSimilarity(imageUrl, productName);
    
    if (similarityResult?.riskLevel === 'VERY_HIGH') {
      alert('⚠️ Duplicate product detected!');
    }
  };
}
```

### 3. PowerShell Script Integration
```powershell
# Function to check image similarity
function Check-ImageSimilarity {
    param(
        [string]$ImageUrl,
        [string]$ProductName = "",
        [decimal]$Threshold = 0.75
    )
    
    $headers = @{ "Content-Type" = "application/json" }
    $body = @{
        imageUrl = $ImageUrl
        productName = $ProductName
        threshold = $Threshold
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/products/check-image-similarity" -Method POST -Headers $headers -Body $body
        
        Write-Host "🔍 Similarity Check Results:" -ForegroundColor Cyan
        Write-Host "Risk Level: $($response.riskLevel)" -ForegroundColor $(if($response.riskLevel -eq "VERY_HIGH") {"Red"} else {"Yellow"})
        Write-Host "Matches Found: $($response.matchCount)" -ForegroundColor White
        
        if ($response.hasMatches) {
            Write-Host "Similar Products:" -ForegroundColor Yellow
            $response.matches | ForEach-Object {
                Write-Host "  - $($_.product_name) ($($_.similarity_score)% match)" -ForegroundColor Gray
            }
        }
        
        return $response
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Usage
Check-ImageSimilarity -ImageUrl "https://example.com/sofa.jpg" -ProductName "Leather Sofa"
```

## 🎯 Integration Points in Your ERP

### 1. Product Addition Forms
Add this check before submitting new products:

```javascript
// In your product form submission
const handleSubmit = async (formData) => {
  // First check for image similarity
  const similarityCheck = await checkImageSimilarity(formData.imageUrl, formData.productName);
  
  if (similarityCheck.riskLevel === 'VERY_HIGH') {
    const userConfirmed = confirm(`⚠️ DUPLICATE DETECTED!\n\nFound ${similarityCheck.matchCount} similar products.\nDo you want to proceed anyway?`);
    if (!userConfirmed) return;
  }
  
  // Proceed with product creation
  await createProduct(formData);
};
```

### 2. Inventory Management Interface
```jsx
import { ImageSimilarityDialog } from '@/components/products/ImageSimilarityDialog';

function InventoryPage() {
  const { checkSimilarity, Dialog } = useImageSimilarity();
  
  const handleAddProduct = (imageUrl, productName) => {
    checkSimilarity(imageUrl, productName, 
      () => console.log('User chose to proceed'),
      () => console.log('User cancelled')
    );
  };
  
  return (
    <div>
      {/* Your inventory interface */}
      <Dialog />
    </div>
  );
}
```

### 3. Bulk Import with Similarity Check
```javascript
async function processBulkImport(products) {
  const results = [];
  
  for (const product of products) {
    const similarity = await checkImageSimilarity(product.imageUrl, product.name);
    
    results.push({
      product: product,
      similarity: similarity,
      action: similarity.riskLevel === 'VERY_HIGH' ? 'SKIP' : 'IMPORT'
    });
  }
  
  return results;
}
```

## 🔧 Configuration Options

### Threshold Settings
```javascript
const thresholds = {
  strict: 0.95,    // Only exact matches
  standard: 0.75,  // Default - good balance
  loose: 0.60      // More permissive
};
```

### Risk Level Actions
```javascript
const riskActions = {
  VERY_HIGH: 'BLOCK',      // Don't allow addition
  HIGH: 'WARN',            // Show warning dialog
  MEDIUM: 'NOTIFY',        // Show notification
  LOW: 'LOG',              // Just log for review
  NONE: 'ALLOW'            // Proceed normally
};
```

## 📍 Current Access Points in Your ERP

Based on your existing structure, you can integrate this at:

1. **Inventory Page**: `/inventory`
2. **Product Management**: `/products/add`
3. **Purchase Orders**: When adding new products
4. **Supplier Management**: When suppliers upload product images

## 🎯 Quick Start Examples

### Test the API Right Now:
```bash
# Using PowerShell (run from your project directory)
powershell -ExecutionPolicy Bypass -File .\test-image-exact-match.ps1
```

### Add to Existing Component:
```jsx
// In any React component
import { useImageSimilarity } from '@/components/products/ImageSimilarityDialog';

function YourComponent() {
  const { checkSimilarity, Dialog } = useImageSimilarity();
  
  // Use checkSimilarity() anywhere you handle image uploads
  // Include <Dialog /> in your JSX
}
```

This feature is **ready to use right now** and can be integrated into any part of your ERP system where products are added or images are uploaded! 🚀

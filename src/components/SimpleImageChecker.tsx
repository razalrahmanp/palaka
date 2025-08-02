// 🚀 SIMPLE INTEGRATION: Add this to any existing React component

import { useState } from 'react';

// Type definitions for the image similarity API response
interface ImageMatch {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  subcategory: string;
  image_url: string;
  similarity_score: number;
  match_type: 'EXACT_IMAGE' | 'SIMILAR_IMAGE' | 'VISUAL_FEATURES';
  created_at: string;
}

interface SimilarityResult {
  hasMatches: boolean;
  matchCount: number;
  matches: ImageMatch[];
  riskLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  message: string;
  recommendations: string[];
}

export function SimpleImageChecker() {
  const [imageUrl, setImageUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkForDuplicates = async () => {
    if (!imageUrl) {
      alert('Please enter an image URL');
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch('/api/products/check-image-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl,
          productName: productName,
          threshold: 0.75
        })
      });

      const data = await response.json();
      setResult(data);

      // Show immediate feedback
      if (data.riskLevel === 'VERY_HIGH') {
        alert(`🚨 DUPLICATE DETECTED!\n\nFound ${data.matchCount} similar products.\nRisk Level: ${data.riskLevel}`);
      } else if (data.hasMatches) {
        alert(`⚠️ Similar products found!\n\nMatches: ${data.matchCount}\nRisk Level: ${data.riskLevel}`);
      } else {
        alert('✅ No duplicates found! Safe to add.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error checking for duplicates');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px' }}>
      <h3>🔍 Quick Duplicate Checker</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <label>Product Name (optional):</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Enter product name"
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>Image URL:</label>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          style={{ width: '100%', padding: '8px', margin: '5px 0' }}
        />
      </div>

      <button
        onClick={checkForDuplicates}
        disabled={isChecking}
        style={{
          padding: '10px 20px',
          backgroundColor: isChecking ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isChecking ? 'not-allowed' : 'pointer'
        }}
      >
        {isChecking ? '🔍 Checking...' : '🔍 Check for Duplicates'}
      </button>

      {/* Try with a real example */}
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <p><strong>🧪 Try with real data:</strong></p>
        <button
          onClick={() => {
            setImageUrl('https://my-erp-po-uploads.s3.eu-north-1.amazonaws.com/product_images/f085e033-89bf-4018-847f-f18738ffa987.png');
            setProductName('SOFA SETTY');
          }}
          style={{ padding: '5px 10px', fontSize: '12px' }}
        >
          Load Test Data
        </button>
      </div>

      {/* Results Display */}
      {result && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: result.riskLevel === 'VERY_HIGH' ? '#ffe6e6' : result.hasMatches ? '#fff3cd' : '#d4edda',
          borderRadius: '4px'
        }}>
          <h4>Results:</h4>
          <p><strong>Risk Level:</strong> {result.riskLevel}</p>
          <p><strong>Matches Found:</strong> {result.matchCount}</p>
          <p><strong>Message:</strong> {result.message}</p>
          
          {result.matches && result.matches.length > 0 && (
            <div>
              <p><strong>Similar Products:</strong></p>
              <ul>
                {result.matches.slice(0, 5).map((match: ImageMatch) => (
                  <li key={match.id}>
                    {match.product_name} (SKU: {match.sku}) - {match.similarity_score}% match
                  </li>
                ))}
              </ul>
              {result.matches.length > 5 && <p>...and {result.matches.length - 5} more</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* 
🚀 HOW TO USE THIS:

1. Copy this component to any file in your project
2. Import it in your inventory page:
   import { SimpleImageChecker } from './SimpleImageChecker';

3. Add it to your JSX:
   <SimpleImageChecker />

4. Test it immediately with real data!

📍 INTEGRATION POINTS:
- Add to /inventory page as a new section
- Include in product forms before submission
- Use in bulk import validation
- Add to supplier product upload forms

⚡ INSTANT TESTING:
- Click "Load Test Data" button
- Click "Check for Duplicates"
- See real results with your actual database!
*/

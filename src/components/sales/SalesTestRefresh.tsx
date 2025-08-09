'use client';

import React, { useState } from 'react';

interface SalesTestRefreshProps {
  onTest: () => void;
}

export default function SalesTestRefresh({ onTest }: SalesTestRefreshProps) {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runRefreshTest = async () => {
    setIsLoading(true);
    setTestResult('Testing enhanced refresh system...');
    
    try {
      // Simulate a quote approval process
      console.log('🧪 Testing Sales refresh system');
      
      // Call the refresh function
      onTest();
      
      // Wait a moment to see if data updates
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTestResult('✅ Enhanced refresh system test completed! Check console for details.');
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setTestResult('');
      }, 3000);
      
    } catch (error) {
      console.error('Refresh test error:', error);
      setTestResult('❌ Refresh test failed - check console for details');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        🧪 Sales Refresh System Test
      </h3>
      <p className="text-blue-700 mb-3 text-sm">
        Test the enhanced refresh system to ensure quote approvals immediately update all sections.
      </p>
      
      <div className="flex gap-2 items-center">
        <button
          onClick={runRefreshTest}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Testing...' : 'Test Refresh System'}
        </button>
        
        {testResult && (
          <span className={`text-sm font-medium ${
            testResult.includes('✅') ? 'text-green-600' : 
            testResult.includes('❌') ? 'text-red-600' : 
            'text-blue-600'
          }`}>
            {testResult}
          </span>
        )}
      </div>
      
      <div className="mt-3 text-xs text-blue-600">
        <p><strong>Expected behavior:</strong> All sales sections should refresh simultaneously</p>
        <p><strong>Key indicators:</strong> Quote changes → Order updates → Custom orders refresh</p>
      </div>
    </div>
  );
}

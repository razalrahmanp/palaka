import React from 'react'
import { Printer } from 'lucide-react'

export const EmptyLabelsState: React.FC = () => (
  <div className="text-center py-12 text-gray-500">
    <Printer className="mx-auto h-12 w-12 mb-4 opacity-50" />
    <h3 className="text-lg font-medium mb-2">No products found</h3>
    <p>Add some inventory items to generate labels</p>
  </div>
)

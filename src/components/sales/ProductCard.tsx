'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Tag, Truck, Info, Plus, Eye } from 'lucide-react';
import { Product } from '@/types';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
  showActions?: boolean;
  className?: string;
}

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onViewDetails,
  showActions = true,
  className = ''
}) => {
  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-white/90 backdrop-blur-sm border border-white/20 ${className}`}>
      <CardContent className="p-0">
        {/* Product Image */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-gray-400" />
            </div>
          )}
          
          {/* Stock Badge */}
          <div className="absolute top-3 right-3">
            <Badge 
              className={`${
                product.stock > 10 ? 'bg-green-100 text-green-800' :
                product.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              } border-0 shadow-sm`}
            >
              Stock: {product.stock}
            </Badge>
          </div>

          {/* Category Badge */}
          {product.category && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-white/90 text-gray-700 border-0 shadow-sm">
                {product.category}
              </Badge>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          {/* Product Name & SKU */}
          <div>
            <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
              {product.name}
            </h3>
            {product.sku && (
              <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                SKU: {product.sku}
              </p>
            )}
          </div>

          {/* Material & Color */}
          <div className="flex items-center gap-4 text-sm">
            {product.material && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">{product.material}</span>
              </div>
            )}
            {product.color && (
              <div className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full border border-gray-300 ${
                    product.color.toLowerCase() === 'red' ? 'bg-red-500' :
                    product.color.toLowerCase() === 'blue' ? 'bg-blue-500' :
                    product.color.toLowerCase() === 'green' ? 'bg-green-500' :
                    product.color.toLowerCase() === 'yellow' ? 'bg-yellow-500' :
                    product.color.toLowerCase() === 'purple' ? 'bg-purple-500' :
                    product.color.toLowerCase() === 'pink' ? 'bg-pink-500' :
                    product.color.toLowerCase() === 'brown' ? 'bg-amber-600' :
                    product.color.toLowerCase() === 'black' ? 'bg-gray-900' :
                    product.color.toLowerCase() === 'white' ? 'bg-gray-100' :
                    product.color.toLowerCase() === 'gray' || product.color.toLowerCase() === 'grey' ? 'bg-gray-500' :
                    'bg-gray-400'
                  }`}
                  title={product.color}
                />
                <span className="text-gray-600 text-xs">{product.color}</span>
              </div>
            )}
          </div>

          {/* Supplier */}
          {product.supplier_name && (
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-3 w-3 text-gray-400" />
              <span className="text-gray-600">Supplier: {product.supplier_name}</span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(product.price)}
              </div>
              <div className="text-xs text-gray-500">per unit</div>
            </div>
            
            {/* Actions */}
            {showActions && (
              <div className="flex gap-2">
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(product)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onSelect && (
                  <Button
                    size="sm"
                    onClick={() => onSelect(product)}
                    className="h-8 w-8 p-0 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200"
                    title="Add to Quote/Order"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Additional Info Indicator */}
          {product.config_schema && Object.keys(product.config_schema).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600 pt-1">
              <Info className="h-3 w-3" />
              <span>Customizable options available</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;

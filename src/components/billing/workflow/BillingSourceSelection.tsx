"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Quote, ShoppingCart, ArrowLeft, ArrowRight, FileText } from 'lucide-react';

export type BillingSource = 'new' | 'quote' | 'sales_order';

interface SourceOption {
  key: BillingSource;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverColor: string;
}

interface BillingSourceSelectionProps {
  selectedSource: BillingSource;
  onSourceSelect: (source: BillingSource) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const sourceOptions: SourceOption[] = [
  {
    key: 'new',
    title: 'New Bill',
    description: 'Start with a fresh billing session from scratch',
    icon: <Plus className="h-8 w-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100'
  },
  {
    key: 'quote',
    title: 'From Quote',
    description: 'Load products and details from an existing quote',
    icon: <Quote className="h-8 w-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100'
  },
  {
    key: 'sales_order',
    title: 'From Sales Order',
    description: 'Continue billing from an approved sales order',
    icon: <ShoppingCart className="h-8 w-8" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-100'
  }
];

export function BillingSourceSelection({ 
  selectedSource, 
  onSourceSelect, 
  onNext, 
  onBack,
  isLoading = false 
}: BillingSourceSelectionProps) {
  return (
    <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-orange-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Choose Billing Source
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Select how you want to create this bill
        </p>
      </CardHeader>
      
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sourceOptions.map((option) => {
            const isSelected = selectedSource === option.key;
            
            return (
              <Card 
                key={option.key}
                className={`
                  cursor-pointer transition-all duration-300 border-2 transform hover:scale-105
                  ${isSelected 
                    ? `border-blue-500 ${option.bgColor} shadow-lg` 
                    : `border-gray-200 hover:border-gray-300 ${option.hoverColor}`
                  }
                `}
                onClick={() => onSourceSelect(option.key)}
              >
                <CardContent className="p-8 text-center">
                  <div className={`
                    w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors
                    ${isSelected ? option.bgColor : 'bg-gray-100'}
                  `}>
                    <div className={isSelected ? option.color : 'text-gray-600'}>
                      {option.icon}
                    </div>
                  </div>
                  
                  <h3 className={`
                    text-xl font-semibold mb-3 transition-colors
                    ${isSelected ? option.color : 'text-gray-800'}
                  `}>
                    {option.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {option.description}
                  </p>
                  
                  {isSelected && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="ml-2 text-sm font-medium text-blue-600">Selected</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="flex items-center px-6 py-3 text-base"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!selectedSource || isLoading}
            className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

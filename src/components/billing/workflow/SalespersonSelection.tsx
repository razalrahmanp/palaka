"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, ArrowRight } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface SalespersonSelectionProps {
  salespeople: UserData[];
  selectedSalespersonId: string;
  onSalespersonSelect: (id: string) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function SalespersonSelection({ 
  salespeople, 
  selectedSalespersonId, 
  onSalespersonSelect, 
  onNext,
  isLoading = false 
}: SalespersonSelectionProps) {
  return (
    <Card className="max-w-2xl mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Select Salesperson
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Choose the salesperson responsible for this billing session
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="salesperson" className="text-base font-medium text-gray-700">
            Salesperson *
          </Label>
          <Select 
            value={selectedSalespersonId} 
            onValueChange={onSalespersonSelect}
            disabled={isLoading}
          >
            <SelectTrigger 
              id="salesperson"
              className="h-12 text-base border-2 border-gray-200 focus:border-blue-500 hover:border-gray-300 transition-colors"
            >
              <SelectValue placeholder="Select a salesperson..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {(salespeople || []).map((person) => (
                <SelectItem key={person.id} value={person.id} className="py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{person.name}</div>
                      {person.email && (
                        <div className="text-sm text-gray-500">{person.email}</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <div className="flex justify-end">
            <Button
              onClick={onNext}
              disabled={!selectedSalespersonId || isLoading}
              className="h-12 px-8 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                <div className="flex items-center">
                  Continue to Source Selection
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calculator, Percent } from "lucide-react";

interface TaxCalculatorProps {
  amount: number;
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
}

const TAX_RATES = [
  { value: 0, label: '0% (Exempt)', description: 'Tax-exempt items' },
  { value: 5, label: '5% (GST)', description: 'Essential goods, food items' },
  { value: 12, label: '12% (GST)', description: 'Processed foods, computers' },
  { value: 18, label: '18% (GST)', description: 'Most goods and services' },
  { value: 28, label: '28% (GST)', description: 'Luxury items, automobiles' }
];

export function TaxCalculator({ amount, taxRate, onTaxRateChange }: TaxCalculatorProps) {
  const taxAmount = (amount * taxRate) / 100;
  const totalAmount = amount + taxAmount;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Tax Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tax Rate Selection */}
        <div>
          <Label htmlFor="taxRate">Tax Rate</Label>
          <Select
            value={taxRate.toString()}
            onValueChange={(value) => onTaxRateChange(parseFloat(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tax rate" />
            </SelectTrigger>
            <SelectContent>
              {TAX_RATES.map((rate) => (
                <SelectItem key={rate.value} value={rate.value.toString()}>
                  <div className="flex flex-col">
                    <span className="font-medium">{rate.label}</span>
                    <span className="text-xs text-gray-500">{rate.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tax Calculation */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Base Amount:</span>
            <span>₹{amount.toLocaleString()}</span>
          </div>
          
          {taxRate > 0 && (
            <div className="flex justify-between text-blue-600">
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Tax ({taxRate}%):
              </span>
              <span>₹{taxAmount.toLocaleString()}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Total Amount:</span>
            <span className="text-green-600">₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* GST Breakdown (for GST rates) */}
        {taxRate > 0 && (
          <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-medium mb-1">GST Breakdown:</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>CGST ({taxRate / 2}%):</span>
                <span>₹{(taxAmount / 2).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST ({taxRate / 2}%):</span>
                <span>₹{(taxAmount / 2).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

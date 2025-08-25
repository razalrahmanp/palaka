"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Edit, Plus, ArrowLeft, ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import { BillingCustomer } from "@/components/billing/CustomerForm";

interface CustomerStepProps {
  customer: BillingCustomer | null;
  onAddCustomer: () => void;
  onEditCustomer: () => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function CustomerStep({ 
  customer, 
  onAddCustomer, 
  onEditCustomer, 
  onNext, 
  onBack,
  isLoading = false 
}: CustomerStepProps) {
  return (
    <Card className="max-w-3xl mx-auto shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Customer Information
        </CardTitle>
        <p className="text-gray-600 mt-2">
          {customer ? 'Review customer details or make changes' : 'Add customer information to continue'}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {customer ? (
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-900">{customer.name}</h3>
                    <p className="text-green-700">Customer Details</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={onEditCustomer}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">Email</p>
                      <p className="text-green-900">{customer.email || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">Phone</p>
                      <p className="text-green-900">{customer.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                {customer.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-green-600 mt-1" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">Address</p>
                      <p className="text-green-900">{customer.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Customer Selected</h3>
              <p className="text-gray-500 mb-6">
                Please add customer information to proceed with the billing
              </p>
              <Button
                onClick={onAddCustomer}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </CardContent>
          </Card>
        )}

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
            disabled={!customer || isLoading}
            className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </div>
            ) : (
              <>
                Continue to Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

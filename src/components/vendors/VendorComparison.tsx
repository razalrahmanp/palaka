'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VendorComparison {
  vendor_id: string;
  vendor_name: string;
  total_orders: number;
  total_spent: number;
  avg_delivery_time: number;
  quality_score: number;
  price_competitiveness: number;
  monthly_trend: Array<{
    month: string;
    orders: number;
    spent: number;
  }>;
}

export function VendorComparison() {
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<VendorComparison[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch available vendors
    const fetchVendors = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
          const data = await response.json();
          setVendors(data);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };

    fetchVendors();
  }, []);

  const handleCompare = async () => {
    if (selectedVendors.length < 2) {
      alert('Please select at least 2 vendors to compare');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/vendors/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_ids: selectedVendors })
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      }
    } catch (error) {
      console.error('Error comparing vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Comparison Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vendors to Compare
                </label>
                <Select
                  onValueChange={(value) => {
                    if (!selectedVendors.includes(value)) {
                      setSelectedVendors([...selectedVendors, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose vendors..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors
                      .filter(vendor => !selectedVendors.includes(vendor.id))
                      .map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Vendors
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedVendors.map(vendorId => {
                    const vendor = vendors.find(v => v.id === vendorId);
                    return (
                      <Badge
                        key={vendorId}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setSelectedVendors(prev => 
                          prev.filter(id => id !== vendorId)
                        )}
                      >
                        {vendor?.name} ×
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCompare}
              disabled={selectedVendors.length < 2 || loading}
              className="w-full md:w-auto"
            >
              {loading ? 'Comparing...' : 'Compare Vendors'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comparisonData.length > 0 && (
        <>
          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Comparison Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Metric</th>
                      {comparisonData.map(vendor => (
                        <th key={vendor.vendor_id} className="text-center p-4">
                          {vendor.vendor_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Total Orders</td>
                      {comparisonData.map(vendor => (
                        <td key={vendor.vendor_id} className="text-center p-4">
                          {vendor.total_orders}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Total Spent</td>
                      {comparisonData.map(vendor => (
                        <td key={vendor.vendor_id} className="text-center p-4">
                          {formatCurrency(vendor.total_spent)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Avg Delivery Time (days)</td>
                      {comparisonData.map(vendor => (
                        <td key={vendor.vendor_id} className="text-center p-4">
                          {vendor.avg_delivery_time}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Quality Score</td>
                      {comparisonData.map(vendor => (
                        <td key={vendor.vendor_id} className="text-center p-4">
                          <Badge className={getScoreBadge(vendor.quality_score)}>
                            {vendor.quality_score}%
                          </Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-medium">Price Competitiveness</td>
                      {comparisonData.map(vendor => (
                        <td key={vendor.vendor_id} className="text-center p-4">
                          <Badge className={getScoreBadge(vendor.price_competitiveness)}>
                            {vendor.price_competitiveness}%
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spending Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="vendor_name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total_spent" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Volume Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="vendor_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_orders" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

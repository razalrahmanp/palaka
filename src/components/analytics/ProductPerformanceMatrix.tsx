'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Package, TrendingUp, TrendingDown, Star, RefreshCw } from 'lucide-react'

interface ApiProduct {
  id: string
  name: string
  category: string
  revenue: number
  quantity?: number
  margin?: number
  revenueScore?: number
  profit?: number
  performance?: string
}

// API response type definition
type ApiResponseData = {
  products: ApiProduct[]
}

interface ProductPerformance {
  product_id: string
  product_name: string
  category: string
  revenue: number
  units_sold: number
  profit_margin: number
  growth_rate: number
  inventory_turnover: number
  customer_rating: number
  return_rate: number
  contribution_margin: number
  rank: number
  trend: 'up' | 'down' | 'stable'
}

interface CategoryPerformance {
  category: string
  total_revenue: number
  total_units: number
  avg_margin: number
  product_count: number
  growth_rate: number
}

interface ProductMatrixData {
  products: ProductPerformance[]
  categories: CategoryPerformance[]
  topPerformers: ProductPerformance[]
  underPerformers: ProductPerformance[]
  matrix: {
    high_revenue_high_margin: ProductPerformance[]
    high_revenue_low_margin: ProductPerformance[]
    low_revenue_high_margin: ProductPerformance[]
    low_revenue_low_margin: ProductPerformance[]
  }
}

export default function ProductPerformanceMatrix() {
  const [matrixData, setMatrixData] = useState<ProductMatrixData | null>(null)
  const [viewMode, setViewMode] = useState<'matrix' | 'ranking' | 'category' | 'trends'>('matrix')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'revenue' | 'margin' | 'growth' | 'rating'>('revenue')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatrixData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        start_date: '2024-01-01',
        end_date: new Date().toISOString().split('T')[0]
      });
      
      const response = await fetch(`/api/analytics/product-performance?${params}`);
      const result = await response.json() as {
        success: boolean;
        data?: ApiResponseData;
        error?: string;
      };
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch product performance data');
      }
      
      // Transform API data to component format
      const apiData = result.data;
      
      // Map products from API response
      const products: ProductPerformance[] = apiData.products.map((product: ApiProduct, index: number) => ({
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        revenue: product.revenue,
        units_sold: product.quantity || 0,
        profit_margin: product.margin || 0,
        growth_rate: product.revenueScore ? (product.revenueScore - 50) / 2 : 0,
        inventory_turnover: 10, // Default value if not provided by API
        customer_rating: 4.0, // Default value if not provided by API
        return_rate: 2.0, // Default value if not provided by API
        contribution_margin: product.profit || 0,
        rank: index + 1,
        trend: product.performance === 'excellent' || product.performance === 'good' ? 'up' : 
               product.performance === 'poor' ? 'down' : 'stable'
      }));
      
      // Create category statistics from products
      const categoryMap = new Map<string, CategoryPerformance>();
      
      products.forEach(product => {
        if (!categoryMap.has(product.category)) {
          categoryMap.set(product.category, {
            category: product.category,
            total_revenue: 0,
            total_units: 0,
            avg_margin: 0,
            product_count: 0,
            growth_rate: 0
          });
        }
        
        const categoryData = categoryMap.get(product.category)!;
        categoryData.total_revenue += product.revenue;
        categoryData.total_units += product.units_sold;
        categoryData.product_count += 1;
        categoryData.avg_margin = ((categoryData.avg_margin * (categoryData.product_count - 1)) + product.profit_margin) / categoryData.product_count;
        categoryData.growth_rate = ((categoryData.growth_rate * (categoryData.product_count - 1)) + product.growth_rate) / categoryData.product_count;
      });
      
      const categories = Array.from(categoryMap.values());
      
      // Create data for BCG matrix (Stars, Cash Cows, Question Marks, Dogs)
      const matrixData: ProductMatrixData = {
        products: products,
        categories: categories,
        topPerformers: products.filter(p => p.trend === 'up').slice(0, 5),
        underPerformers: products.filter(p => p.trend === 'down').slice(0, 5),
        matrix: {
          high_revenue_high_margin: products.filter(p => p.revenue > 100000 && p.profit_margin > 30),
          high_revenue_low_margin: products.filter(p => p.revenue > 100000 && p.profit_margin <= 30),
          low_revenue_high_margin: products.filter(p => p.revenue <= 100000 && p.profit_margin > 30),
          low_revenue_low_margin: products.filter(p => p.revenue <= 100000 && p.profit_margin <= 30)
        }
      };
      
      setMatrixData(matrixData);
    } catch (error) {
      console.error('Error fetching matrix data:', error);
      setError('Failed to load product performance data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getFilteredProducts = () => {
    if (!matrixData) return [];
    
    let products = matrixData.products;
    
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }
    
    return products.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'margin':
          return b.profit_margin - a.profit_margin;
        case 'growth':
          return b.growth_rate - a.growth_rate;
        case 'rating':
          return b.customer_rating - a.customer_rating;
        default:
          return 0;
      }
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Performance Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-pulse text-muted-foreground">Loading product data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Performance Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            <p>{error}</p>
            <Button 
              onClick={() => fetchMatrixData()} 
              variant="outline" 
              size="sm" 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!matrixData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Product Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No product data available</div>
        </CardContent>
      </Card>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Performance Matrix
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of product performance across key metrics
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'matrix' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('matrix')}
            >
              Matrix
            </Button>
            <Button
              variant={viewMode === 'ranking' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('ranking')}
            >
              Ranking
            </Button>
            <Button
              variant={viewMode === 'category' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('category')}
            >
              Categories
            </Button>
            <Button
              variant={viewMode === 'trends' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('trends')}
            >
              Trends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMatrixData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex justify-between mb-6">
          <div className="flex gap-2 items-center">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {matrixData.categories.map(cat => (
                  <SelectItem key={cat.category} value={cat.category}>{cat.category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: 'revenue' | 'margin' | 'growth' | 'rating') => setSortBy(value)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="margin">Profit Margin</SelectItem>
                <SelectItem value="growth">Growth Rate</SelectItem>
                <SelectItem value="rating">Customer Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Badge variant="outline" className="text-xs">
              {filteredProducts.length} Products
            </Badge>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'matrix' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Stars (High Revenue, High Margin)</CardTitle>
                  <CardDescription>{matrixData.matrix.high_revenue_high_margin.length} products</CardDescription>
                </CardHeader>
                <CardContent>
                  {matrixData.matrix.high_revenue_high_margin.length > 0 ? (
                    <ul className="space-y-2">
                      {matrixData.matrix.high_revenue_high_margin.map(product => (
                        <li key={product.product_id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-2" />
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(product.revenue)}</span>
                            <span className="text-green-600">{product.profit_margin.toFixed(1)}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No products in this quadrant</div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Cash Cows (High Revenue, Low Margin)</CardTitle>
                  <CardDescription>{matrixData.matrix.high_revenue_low_margin.length} products</CardDescription>
                </CardHeader>
                <CardContent>
                  {matrixData.matrix.high_revenue_low_margin.length > 0 ? (
                    <ul className="space-y-2">
                      {matrixData.matrix.high_revenue_low_margin.map(product => (
                        <li key={product.product_id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="h-4 w-4 bg-blue-200 rounded-full flex items-center justify-center mr-2">$</span>
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(product.revenue)}</span>
                            <span className="text-amber-600">{product.profit_margin.toFixed(1)}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No products in this quadrant</div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700">Question Marks (Low Revenue, High Margin)</CardTitle>
                  <CardDescription>{matrixData.matrix.low_revenue_high_margin.length} products</CardDescription>
                </CardHeader>
                <CardContent>
                  {matrixData.matrix.low_revenue_high_margin.length > 0 ? (
                    <ul className="space-y-2">
                      {matrixData.matrix.low_revenue_high_margin.map(product => (
                        <li key={product.product_id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="h-4 w-4 bg-amber-200 rounded-full flex items-center justify-center mr-2">?</span>
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(product.revenue)}</span>
                            <span className="text-green-600">{product.profit_margin.toFixed(1)}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No products in this quadrant</div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">Dogs (Low Revenue, Low Margin)</CardTitle>
                  <CardDescription>{matrixData.matrix.low_revenue_low_margin.length} products</CardDescription>
                </CardHeader>
                <CardContent>
                  {matrixData.matrix.low_revenue_low_margin.length > 0 ? (
                    <ul className="space-y-2">
                      {matrixData.matrix.low_revenue_low_margin.map(product => (
                        <li key={product.product_id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="h-4 w-4 bg-gray-200 rounded-full flex items-center justify-center mr-2">•</span>
                            <span className="font-medium">{product.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{formatCurrency(product.revenue)}</span>
                            <span className="text-red-600">{product.profit_margin.toFixed(1)}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">No products in this quadrant</div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">BCG Matrix Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="revenue"
                        name="Revenue"
                        unit="₹"
                        domain={['dataMin - 10000', 'dataMax + 10000']}
                        tickFormatter={(value) => `${(value / 1000)}k`}
                        label={{ value: 'Revenue (₹)', position: 'bottom', offset: 0 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="profit_margin"
                        name="Profit Margin"
                        unit="%"
                        domain={['dataMin - 5', 'dataMax + 5']}
                        label={{ value: 'Profit Margin (%)', angle: -90, position: 'left' }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(value: number | string, name: string) => {
                          if (name === 'Revenue') return [formatCurrency(value as number), name];
                          if (name === 'Profit Margin') return [`${(value as number).toFixed(1)}%`, name];
                          return [value, name];
                        }}
                      />
                      <Scatter
                        name="Products"
                        data={matrixData.products}
                        fill="#8884d8"
                      >
                        {matrixData.products.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.trend === 'up' ? '#4ade80' : entry.trend === 'down' ? '#f87171' : '#60a5fa'}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'ranking' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Top Performing Products</CardTitle>
                  <CardDescription>Products with highest revenue and growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {matrixData.topPerformers.map((product, idx) => (
                      <div key={product.product_id} className="flex items-center justify-between py-1 border-b last:border-0">
                        <div className="flex items-center">
                          <div className="w-5 text-muted-foreground">{idx + 1}.</div>
                          <span className="font-medium ml-2">{product.product_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{formatCurrency(product.revenue)}</span>
                          <div className="flex items-center text-green-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span>{product.growth_rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Under Performing Products</CardTitle>
                  <CardDescription>Products that need attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {matrixData.underPerformers.map((product, idx) => (
                      <div key={product.product_id} className="flex items-center justify-between py-1 border-b last:border-0">
                        <div className="flex items-center">
                          <div className="w-5 text-muted-foreground">{idx + 1}.</div>
                          <span className="font-medium ml-2">{product.product_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{formatCurrency(product.revenue)}</span>
                          <div className="flex items-center text-red-600">
                            <TrendingDown className="h-4 w-4 mr-1" />
                            <span>{product.growth_rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Detailed Product Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.slice(0, 10).map((product, idx) => (
                        <tr key={product.product_id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{product.product_name}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{formatCurrency(product.revenue)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{product.units_sold.toLocaleString()}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                            <span className={product.profit_margin > 30 ? 'text-green-600' : product.profit_margin < 15 ? 'text-red-600' : 'text-amber-600'}>
                              {product.profit_margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                            <span className={product.growth_rate > 0 ? 'text-green-600' : product.growth_rate < 0 ? 'text-red-600' : 'text-gray-500'}>
                              {product.growth_rate > 0 ? '+' : ''}{product.growth_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                            {getTrendIcon(product.trend)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'category' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={matrixData.categories}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip formatter={(value: number | string, name: string) => {
                          if (name === 'Total Revenue') return [formatCurrency(value as number), name];
                          if (name === 'Avg Margin') return [`${(value as number).toFixed(1)}%`, name];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="total_revenue" name="Total Revenue" fill="#8884d8" />
                        <Bar yAxisId="right" dataKey="avg_margin" name="Avg Margin" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="rounded-md border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Units Sold</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Margin</th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matrixData.categories.map((category) => (
                    <tr key={category.category}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{category.category}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{category.product_count}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{formatCurrency(category.total_revenue)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right">{category.total_units.toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                        <span className={category.avg_margin > 30 ? 'text-green-600' : category.avg_margin < 15 ? 'text-red-600' : 'text-amber-600'}>
                          {category.avg_margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                        <span className={category.growth_rate > 0 ? 'text-green-600' : category.growth_rate < 0 ? 'text-red-600' : 'text-gray-500'}>
                          {category.growth_rate > 0 ? '+' : ''}{category.growth_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'trends' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Revenue Trends by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={matrixData.categories}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip formatter={(value: number | string) => formatCurrency(value as number)} />
                        <Legend />
                        <Line type="monotone" dataKey="total_revenue" name="Revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Profit Margin Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'High Margin (>30%)', value: matrixData.products.filter(p => p.profit_margin > 30).length },
                            { name: 'Medium Margin (15-30%)', value: matrixData.products.filter(p => p.profit_margin >= 15 && p.profit_margin <= 30).length },
                            { name: 'Low Margin (<15%)', value: matrixData.products.filter(p => p.profit_margin < 15).length },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'High Margin (>30%)', color: '#4ade80' },
                            { name: 'Medium Margin (15-30%)', color: '#facc15' },
                            { name: 'Low Margin (<15%)', color: '#f87171' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number | string) => [value, 'Products']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Growth Trend Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Growing (>0%)', value: matrixData.products.filter(p => p.growth_rate > 0).length },
                            { name: 'Stable (0%)', value: matrixData.products.filter(p => p.growth_rate === 0).length },
                            { name: 'Declining (<0%)', value: matrixData.products.filter(p => p.growth_rate < 0).length },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Growing (>0%)', color: '#4ade80' },
                            { name: 'Stable (0%)', color: '#60a5fa' },
                            { name: 'Declining (<0%)', color: '#f87171' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number | string) => [value, 'Products']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
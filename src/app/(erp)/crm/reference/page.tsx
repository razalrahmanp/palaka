'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Search, Tag, Filter,
  Calendar, User, FileText, Link as LinkIcon
} from 'lucide-react';

interface ReferenceItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  lastUpdated: string;
  author: string;
  type: 'document' | 'link' | 'note';
}

export default function CRMReferencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All References', count: 24 },
    { id: 'sales', name: 'Sales Materials', count: 8 },
    { id: 'support', name: 'Customer Support', count: 6 },
    { id: 'product', name: 'Product Info', count: 5 },
    { id: 'training', name: 'Training Docs', count: 5 }
  ];

  const references: ReferenceItem[] = [
    {
      id: '1',
      title: 'Sales Pitch Template',
      category: 'sales',
      description: 'Standard template for initial customer outreach and value proposition presentation',
      tags: ['sales', 'template', 'outreach'],
      lastUpdated: '2024-10-15',
      author: 'Sarah Johnson',
      type: 'document'
    },
    {
      id: '2',
      title: 'Product Pricing Guide',
      category: 'product',
      description: 'Complete pricing structure, discount policies, and package comparisons',
      tags: ['pricing', 'product', 'packages'],
      lastUpdated: '2024-10-20',
      author: 'Mike Chen',
      type: 'document'
    },
    {
      id: '3',
      title: 'Customer Onboarding Checklist',
      category: 'support',
      description: 'Step-by-step guide for onboarding new customers successfully',
      tags: ['onboarding', 'support', 'checklist'],
      lastUpdated: '2024-10-18',
      author: 'Emily Davis',
      type: 'document'
    },
    {
      id: '4',
      title: 'Objection Handling Guide',
      category: 'sales',
      description: 'Common customer objections and proven response strategies',
      tags: ['sales', 'objections', 'techniques'],
      lastUpdated: '2024-10-12',
      author: 'David Wilson',
      type: 'document'
    },
    {
      id: '5',
      title: 'Product Demo Video',
      category: 'product',
      description: 'Comprehensive product demonstration for prospective customers',
      tags: ['demo', 'video', 'product'],
      lastUpdated: '2024-10-22',
      author: 'Lisa Anderson',
      type: 'link'
    },
    {
      id: '6',
      title: 'FAQ Database',
      category: 'support',
      description: 'Frequently asked questions and approved responses',
      tags: ['faq', 'support', 'knowledge'],
      lastUpdated: '2024-10-25',
      author: 'Tom Martinez',
      type: 'link'
    },
    {
      id: '7',
      title: 'Competitor Analysis',
      category: 'sales',
      description: 'Market positioning and competitive advantages overview',
      tags: ['competitors', 'analysis', 'strategy'],
      lastUpdated: '2024-10-10',
      author: 'Sarah Johnson',
      type: 'document'
    },
    {
      id: '8',
      title: 'Customer Success Stories',
      category: 'sales',
      description: 'Case studies and testimonials from satisfied customers',
      tags: ['testimonials', 'success', 'cases'],
      lastUpdated: '2024-10-19',
      author: 'Emily Davis',
      type: 'document'
    }
  ];

  const filteredReferences = references.filter(ref => {
    const matchesSearch = ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ref.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ref.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || ref.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return FileText;
      case 'link': return LinkIcon;
      case 'note': return BookOpen;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      sales: 'bg-blue-100 text-blue-700 border-blue-200',
      support: 'bg-green-100 text-green-700 border-green-200',
      product: 'bg-purple-100 text-purple-700 border-purple-200',
      training: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reference Library</h1>
        <p className="text-gray-600">Sales materials, product information, and support resources</p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search references, tags, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <Badge variant="secondary" className={selectedCategory === category.id ? 'bg-white/20 text-white' : ''}>
                        {category.count}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Resources</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-semibold">Today</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Most Viewed</span>
                <span className="font-semibold">FAQ Database</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reference Items */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-4">
            {filteredReferences.length > 0 ? (
              filteredReferences.map((reference) => {
                const TypeIcon = getTypeIcon(reference.type);
                return (
                  <Card key={reference.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
                          <TypeIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{reference.title}</h3>
                            <Badge className={getCategoryColor(reference.category)}>
                              {reference.category}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3">{reference.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {reference.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{reference.author}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(reference.lastUpdated).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No references found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

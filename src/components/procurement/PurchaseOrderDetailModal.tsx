'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { 
  Package, 
  Building2, 
  Calendar as CalendarIcon, 
  User, 
  FileText, 
  Image as ImageIcon,
  Edit,
  Save,
  X,
  Upload,
  Eye,
  Download
} from 'lucide-react';
import { PurchaseOrder, Supplier } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

interface PurchaseOrderDetailModalProps {
  order: PurchaseOrder | null;
  suppliers: Supplier[];
  onClose: () => void;
  onSave: (orderData: Partial<PurchaseOrder>) => Promise<void>;
  onUploadImages: (orderId: string, images: File[]) => Promise<void>;
}

export function PurchaseOrderDetailModal({
  order,
  suppliers,
  onClose,
  onSave,
  onUploadImages
}: PurchaseOrderDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    supplier_id?: string;
    description?: string;
  }>({});
  const [uploading, setUploading] = useState(false);

  if (!order) return null;

  const handleEdit = () => {
    setEditData({
      supplier_id: order.supplier_id,
      description: order.description || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await onSave({ ...editData, id: order.id });
      setIsEditing(false);
      setEditData({});
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      await onUploadImages(order.id, imageFiles);
    } catch (error) {
      console.error('Failed to upload images:', error);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'received':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              Purchase Order Details
              <Badge className={getStatusBadgeClass(order.status)}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button onClick={handleEdit} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="supplier" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Supplier
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Images
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Purchase Order ID</Label>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      #{order.id.split('-')[0].toUpperCase()}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Product</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {order.product?.name || order.product_name || order.custom_type || order.description || 'Custom Product'}
                      </p>
                      {order.is_custom && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Quantity</Label>
                    <p className="font-medium">{order.quantity?.toLocaleString() || 0}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Customer</Label>
                    <p className="font-medium">
                      {order.sales_order?.customer?.[0]?.name || order.sales_order?.customer_name || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Total Amount</Label>
                    <p className="font-bold text-lg text-green-600">
                      {formatCurrency(order.total || 0)}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    {isEditing ? (
                      <Input
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="Enter description..."
                      />
                    ) : (
                      <p className="text-gray-800">{order.description || 'No description provided'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dates and Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Dates & Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <Badge variant="outline" className="mt-1">
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created Date</Label>
                    <p className="font-medium">
                      {order.created_at ? formatDate(order.created_at) : 'Unknown'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created By</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <p className="font-medium">{order.sales_order?.sales_rep?.[0]?.name || order.creator?.name || 'Unknown Sales Rep'}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-600">Order Status</Label>
                    <Badge variant="outline" className="mt-1">
                      Unpaid
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="supplier" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Supplier</Label>
                  {isEditing ? (
                    <Select 
                      value={editData.supplier_id || ''} 
                      onValueChange={(value) => setEditData({ ...editData, supplier_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          {order.supplier?.name || 'Unknown Supplier'}
                        </p>
                        <p className="text-sm text-gray-600">
                          ID: {order.supplier_id?.split('-')[0]}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Product Images & Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-700">Click to upload images</p>
                      <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                    </div>
                  </label>
                  {uploading && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm">Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Display existing images */}
                {order.images && order.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {order.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={imageUrl}
                          alt={`Product image ${index + 1}`}
                          width={200}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!order.images || order.images.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No images uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Order Created</p>
                      <p className="text-sm text-gray-600">
                        {order.created_at ? formatDate(order.created_at) : 'Unknown date'}
                      </p>
                    </div>
                  </div>

                  {order.status === 'approved' && (
                    <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg">
                      <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Order Approved</p>
                        <p className="text-sm text-gray-600">Ready for processing</p>
                      </div>
                    </div>
                  )}

                  {order.status === 'received' && (
                    <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                      <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Order Received</p>
                        <p className="text-sm text-gray-600">Items delivered and verified</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { generateFurnitureSku } from '@/lib/furnitureSkuGenerator';
import { 
  FURNITURE_CATEGORIES,
  getMaterialsForSubcategory 
} from '@/data/furniture-categories';

interface ProductFormState {
  id?: string;
  productName: string;
  sku: string;
  category: string;
  subcategory: string;
  material: string;
  color?: string;
  price: number;
  costPrice: number;
  quantity: number;
  description?: string;
  imageUrl?: string;
}

interface ProductFormProps {
  onSubmit: (data: ProductFormState) => void;
  initialData?: Partial<ProductFormState>;
  isLoading?: boolean;
}

export default function ProductForm({ 
  onSubmit, 
  initialData, 
  isLoading = false 
}: ProductFormProps) {
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [materialOptions, setMaterialOptions] = useState<{ id: string; name: string }[]>([]);
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  const form = useForm<ProductFormState>({
    defaultValues: initialData || {
      productName: '',
      sku: '',
      category: '',
      subcategory: '',
      material: '',
      color: '',
      price: 0,
      costPrice: 0,
      quantity: 0,
      description: '',
      imageUrl: '',
    },
  });

  const { watch, setValue } = form;
  const selectedCategory = watch('category');
  const selectedSubcategory = watch('subcategory');

  // Update subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      const category = FURNITURE_CATEGORIES.find(cat => cat.id === selectedCategory);
      if (category) {
        setSubcategories(
          category.subcategories.map(sub => ({ 
            id: sub.id, 
            name: sub.name 
          }))
        );
        
        // Reset subcategory and material when category changes
        setValue('subcategory', '');
        setValue('material', '');
      }
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory, setValue]);

  // Update materials when subcategory changes
  useEffect(() => {
    if (selectedCategory && selectedSubcategory) {
      const materialsList = getMaterialsForSubcategory(selectedCategory, selectedSubcategory);
      setMaterialOptions(materialsList);
      setValue('material', '');
    } else {
      setMaterialOptions([]);
    }
  }, [selectedCategory, selectedSubcategory, setValue]);

  const handleGenerateSku = async () => {
    const productName = form.getValues('productName');
    const category = form.getValues('category');
    const subcategory = form.getValues('subcategory');
    const material = form.getValues('material');
    const color = form.getValues('color') || 'NA';

    if (productName && category && subcategory && material) {
      try {
        setIsGeneratingSku(true);
        const sku = await generateFurnitureSku({
          category,
          subcategory,
          material,
          color
        });
        form.setValue('sku', sku);
      } catch (error) {
        console.error('Error generating SKU:', error);
      } finally {
        setIsGeneratingSku(false);
      }
    }
  };

  async function onFormSubmit(values: ProductFormState) {
    if (!values.sku) {
      // Generate SKU if it's not already set
      try {
        const sku = await generateFurnitureSku({
          category: values.category,
          subcategory: values.subcategory,
          material: values.material,
          color: values.color || 'NA'
        });
        values.sku = sku;
      } catch (error) {
        console.error('Error generating SKU:', error);
        return;
      }
    }

    onSubmit(values);
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">
        {initialData?.id ? 'Edit Product' : 'Add New Product'}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="productName"
              rules={{ required: "Product name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Auto-generated SKU" {...field} readOnly={!initialData?.id} />
                      </FormControl>
                      {!initialData?.id && (
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={handleGenerateSku}
                          disabled={isGeneratingSku || !form.getValues('category') || !form.getValues('subcategory') || !form.getValues('material')}
                        >
                          {isGeneratingSku ? 'Generating...' : 'Generate'}
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="category"
              rules={{ required: "Category is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FURNITURE_CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subcategory"
              rules={{ required: "Subcategory is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={subcategories.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="material"
              rules={{ required: "Material is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={materialOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {materialOptions.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter color" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              rules={{ 
                required: "Price is required",
                min: { value: 0, message: "Price must be positive" } 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter price" 
                      {...field} 
                      onChange={e => field.onChange(Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="costPrice"
              rules={{ 
                required: "Cost price is required",
                min: { value: 0, message: "Cost price must be positive" } 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter cost price" 
                      {...field} 
                      onChange={e => field.onChange(Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="quantity"
              rules={{ 
                required: "Quantity is required",
                min: { value: 0, message: "Quantity must be positive" } 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter quantity" 
                      {...field} 
                      onChange={e => field.onChange(Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter image URL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter product description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline">Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : initialData?.id ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

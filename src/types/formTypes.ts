// Define form state interface
export interface ProductFormState {
  productName: string;
  category: string;
  subcategory: string;
  material: string;
  upholstery: string;
  style: string;
  quantity: number;
  price: number;
  description: string;
  dimensions: {
    length: string | number;
    width: string | number;
    height: string | number;
  };
  sku: string;
}

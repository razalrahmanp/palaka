// src/types/furniture.ts
// Original catalog structure interfaces
export interface FurnitureProduct {
  name: string;
  materials: string[];
  upholstery?: string[];
  styles?: string[];
  components?: string[];
}

export interface FurnitureSubcategory {
  name: string;
  products: FurnitureProduct[];
}

export interface FurnitureCategory {
  name: string;
  subcategories: FurnitureSubcategory[];
}

export interface MaterialCategory {
  type: string;
  variants: string[];
}

export interface StyleCategory {
  [key: string]: string[];
}

export interface FurnitureCatalog {
  categories: FurnitureCategory[];
  materials: MaterialCategory[];
  styles: StyleCategory;
}

// New interfaces for the form and database
export interface FurnitureProductItem {
  id: string;
  name: string;
  type: string;
  category: string;
  subcategory: string;
  material: string;
  description?: string;
  price: number;
  costPrice: number;
  sku: string;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  weight?: number;
  stock: number;
  image_url?: string;
  createdAt: string;
  updatedAt: string;
}

// For furniture category related components in form
export interface Material {
  id: string;
  name: string;
}

export interface SubCategory {
  id: string;
  name: string;
  materials?: Material[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: SubCategory[];
}

export interface FurnitureCategoryMap {
  [key: string]: Category[];
}

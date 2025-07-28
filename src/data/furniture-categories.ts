// src/data/furniture-categories.ts
// Defines the furniture categories, subcategories and materials structure

export interface Material {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  name: string;
  products: string[];
  materials?: string[];
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

// Wood materials
export const WOOD_MATERIALS = [
  { id: "teak", name: "Teak" },
  { id: "mahogany", name: "Mahogany" },
  { id: "acacia", name: "Acacia" },
  { id: "rubberwood", name: "Rubberwood" },
  { id: "plywood", name: "Plywood" },
  { id: "multi_wood", name: "Multi Wood" },
  { id: "particle_board", name: "Particle Board" },
  { id: "mdf", name: "MDF" }
];

// Upholstery materials
export const UPHOLSTERY_MATERIALS = [
  { id: "leather", name: "Leather" },
  { id: "rexin", name: "Rexin" },
  { id: "cotton", name: "Cotton" },
  { id: "velvet", name: "Velvet" }
];

// Metal materials
export const METAL_MATERIALS = [
  { id: "steel", name: "Steel" },
  { id: "iron", name: "Iron" },
  { id: "aluminum", name: "Aluminum" }
];

// Glass materials
export const GLASS_MATERIALS = [
  { id: "tempered", name: "Tempered Glass" },
  { id: "frosted", name: "Frosted Glass" }
];

// Plastic and synthetic materials
export const SYNTHETIC_MATERIALS = [
  { id: "plastic", name: "Plastic" },
  { id: "fiber", name: "Fiber" }
];

// All materials combined
export const ALL_MATERIALS = [
  ...WOOD_MATERIALS,
  ...UPHOLSTERY_MATERIALS,
  ...METAL_MATERIALS,
  ...GLASS_MATERIALS,
  ...SYNTHETIC_MATERIALS
];

// Industry standard furniture categories based on provided product list
export const FURNITURE_CATEGORIES: Category[] = [
  {
    id: "seating",
    name: "Seating",
    subcategories: [
      {
        id: "chairs",
        name: "Chairs",
        products: ["DINING CHAIR", "CHAIR FIBER", "SITOUT CHAIR", "EASY CHAIR", "COFEE CHAIR", "FOLDING CHAIR", "BABY CHAIR"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "fiber", "plastic"]
      },
      {
        id: "office_chairs",
        name: "Office Chairs",
        products: ["OFFICE CHAIR", "REVOLVING CHAIR", "COUNTER CHAIR"],
        materials: ["steel", "leather", "rexin", "fiber", "plastic"]
      },
      {
        id: "stools",
        name: "Stools",
        products: ["BARSTOOL", "STOOL", "STUP STOOL"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "steel", "iron"]
      },
      {
        id: "benches",
        name: "Benches",
        products: ["GARDEN BENCH", "SITOUT BENCH"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "steel", "iron"]
      },
      {
        id: "sofas",
        name: "Sofas",
        products: ["THREE SEATER", "SOFA SETTY", "BEEN BAG"],
        materials: ["leather", "rexin", "cotton", "velvet", "teak", "mahogany", "acacia", "rubberwood"]
      }
    ]
  },
  {
    id: "tables",
    name: "Tables",
    subcategories: [
      {
        id: "dining_tables",
        name: "Dining Tables",
        products: ["DINING TABLE"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "plywood", "multi_wood", "marble"]
      },
      {
        id: "coffee_tables",
        name: "Coffee & Side Tables",
        products: ["TEAPOY", "GLASS TEAPOY", "COFEE TABLE"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "plywood", "glass", "tempered", "frosted"]
      },
      {
        id: "specialty_tables",
        name: "Specialty Tables",
        products: ["MARBLE TOP", "KITCHEN TABLE", "PIANO TABLE"],
        materials: ["teak", "mahogany", "acacia", "marble", "glass"]
      },
      {
        id: "work_tables",
        name: "Work Tables",
        products: ["OFFICE TABLE", "COMPUTER TABLE", "STUDAY TABLE"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "plywood", "particle_board"]
      },
      {
        id: "utility_tables",
        name: "Utility Tables",
        products: ["IRON TABLE", "FIBER TABLE", "STEEL TABLE"],
        materials: ["iron", "steel", "fiber", "plastic"]
      }
    ]
  },
  {
    id: "bedroom",
    name: "Bedroom Furniture",
    subcategories: [
      {
        id: "beds",
        name: "Beds",
        products: ["COT", "FOLDING COT", "FOLDING BED", "DIVAN"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "iron", "steel", "plywood"]
      },
      {
        id: "mattresses",
        name: "Mattresses & Bedding",
        products: ["MATTRESS", "PILLOW", "CUSHION"],
        materials: ["cotton", "velvet", "rexin"]
      },
      {
        id: "bedroom_furniture",
        name: "Bedroom Furniture",
        products: ["BEDSIDE", "DRESSING TABLE", "BEDROOM SET"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "plywood", "particle_board"]
      },
      {
        id: "storage_units",
        name: "Storage Units",
        products: ["ALMIRAH", "STEEL ALMIRAH"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "plywood", "particle_board", "steel"]
      }
    ]
  },
  {
    id: "storage",
    name: "Storage & Organization",
    subcategories: [
      {
        id: "shelving",
        name: "Shelving & Racks",
        products: ["BOOK SHELF", "SHOE RACK"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "plywood", "particle_board", "steel"]
      },
      {
        id: "stands",
        name: "Stands & Hangers",
        products: ["CLOTH HANGER", "SAREE STAND", "DRYER STAND", "TV STAND"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "steel", "iron"]
      }
    ]
  },
  {
    id: "decor",
    name: "Decor & Accessories",
    subcategories: [
      {
        id: "wall_decor",
        name: "Wall Decor",
        products: ["MIRROR", "COLOGREPHY"],
        materials: ["teak", "mahogany", "acacia", "glass", "steel"]
      },
      {
        id: "home_textiles",
        name: "Home Textiles",
        products: ["MAT", "CURTAIN"],
        materials: ["cotton", "velvet", "rexin"]
      },
      {
        id: "traditional",
        name: "Traditional Items",
        products: ["AMBALAM", "SWING"],
        materials: ["teak", "mahogany", "acacia", "rubberwood", "cotton"]
      },
      {
        id: "decorative_items",
        name: "Decorative Items",
        products: ["GLASS"],
        materials: ["glass", "tempered", "frosted"]
      }
    ]
  }
];

// Map for looking up categories by product name
export const productToCategoryMap = new Map<string, { categoryId: string; subcategoryId: string }>();

// Build the lookup map
FURNITURE_CATEGORIES.forEach(category => {
  category.subcategories.forEach(subcategory => {
    subcategory.products.forEach(product => {
      productToCategoryMap.set(product, {
        categoryId: category.id,
        subcategoryId: subcategory.id
      });
    });
  });
});

// Helper function to find category by product name
export function findCategoryByProduct(productName: string) {
  const normalizedName = productName.trim().toUpperCase();
  return productToCategoryMap.get(normalizedName);
}

// Helper function to get materials for a subcategory
export function getMaterialsForSubcategory(categoryId: string, subcategoryId: string): Material[] {
  const category = FURNITURE_CATEGORIES.find(cat => cat.id === categoryId);
  if (!category) return [];
  
  const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
  if (!subcategory || !subcategory.materials) return [];
  
  return subcategory.materials.map(materialId => {
    const material = ALL_MATERIALS.find(m => m.id === materialId);
    return material || { id: materialId, name: materialId };
  });
}

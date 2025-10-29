// Role-Based Access Control (RBAC) Configuration
// Maps roles to accessible sidebar navigation items

export interface SidebarItem {
  path: string;
  label: string;
  icon: string;
  category?: string;
  subItems?: SidebarItem[];
}

export interface SidebarConfig {
  mainNav: SidebarItem[];
  quickActions?: SidebarItem[];
}

export const roleSidebarConfig: Record<string, SidebarConfig> = {
  // System Administrator - Full access to all modules
  'System Administrator': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/sales', 
        label: 'Sales', 
        icon: 'ShoppingCart',
        subItems: [
          { path: '/sales/customers', label: 'Customers', icon: 'Users' },
          { path: '/sales/orders', label: 'Sales Orders', icon: 'FileText' },
          { path: '/sales/quotes', label: 'Quotations', icon: 'FileSignature' },
        ]
      },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: 'Package',
        subItems: [
          { path: '/inventory/products', label: 'Products', icon: 'Box' },
          { path: '/inventory/stock', label: 'Stock Management', icon: 'Warehouse' },
          { path: '/inventory/adjustments', label: 'Adjustments', icon: 'Settings' },
        ]
      },
      { 
        path: '/manufacturing', 
        label: 'Manufacturing', 
        icon: 'Factory',
        subItems: [
          { path: '/manufacturing/bom', label: 'Bill of Materials', icon: 'ClipboardList' },
          { path: '/manufacturing/work-orders', label: 'Work Orders', icon: 'Wrench' },
        ]
      },
      { 
        path: '/logistics', 
        label: 'Logistics', 
        icon: 'Truck',
        subItems: [
          { path: '/logistics/deliveries', label: 'Deliveries', icon: 'PackageCheck' },
          { path: '/logistics/vehicles', label: 'Vehicles', icon: 'Car' },
        ]
      },
      { 
        path: '/procurement', 
        label: 'Procurement', 
        icon: 'ShoppingBag',
        subItems: [
          { path: '/procurement/purchase-orders', label: 'Purchase Orders', icon: 'FileInput' },
          { path: '/procurement/vendors', label: 'Vendors', icon: 'Building' },
        ]
      },
      { 
        path: '/finance', 
        label: 'Finance', 
        icon: 'DollarSign',
        subItems: [
          { path: '/finance/invoices', label: 'Invoices', icon: 'Receipt' },
          { path: '/finance/payments', label: 'Payments', icon: 'CreditCard' },
        ]
      },
      { 
        path: '/hr', 
        label: 'Human Resources', 
        icon: 'Users',
        subItems: [
          { path: '/hr/employees', label: 'Employees', icon: 'UserCheck' },
          { path: '/hr/attendance', label: 'Attendance', icon: 'Clock' },
          { path: '/hr/payroll', label: 'Payroll', icon: 'Wallet' },
          { path: '/hr/performance', label: 'Performance', icon: 'Star' },
        ]
      },
      { path: '/settings', label: 'Settings', icon: 'Settings' },
    ],
  },

  // Auditor - Same as System Administrator (full access)
  'Auditor': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/sales', 
        label: 'Sales', 
        icon: 'ShoppingCart',
        subItems: [
          { path: '/sales/customers', label: 'Customers', icon: 'Users' },
          { path: '/sales/orders', label: 'Sales Orders', icon: 'FileText' },
          { path: '/sales/quotes', label: 'Quotations', icon: 'FileSignature' },
        ]
      },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: 'Package',
        subItems: [
          { path: '/inventory/products', label: 'Products', icon: 'Box' },
          { path: '/inventory/stock', label: 'Stock Management', icon: 'Warehouse' },
          { path: '/inventory/adjustments', label: 'Adjustments', icon: 'Settings' },
        ]
      },
      { 
        path: '/manufacturing', 
        label: 'Manufacturing', 
        icon: 'Factory',
        subItems: [
          { path: '/manufacturing/bom', label: 'Bill of Materials', icon: 'ClipboardList' },
          { path: '/manufacturing/work-orders', label: 'Work Orders', icon: 'Wrench' },
        ]
      },
      { 
        path: '/logistics', 
        label: 'Logistics', 
        icon: 'Truck',
        subItems: [
          { path: '/logistics/deliveries', label: 'Deliveries', icon: 'PackageCheck' },
          { path: '/logistics/vehicles', label: 'Vehicles', icon: 'Car' },
        ]
      },
      { 
        path: '/procurement', 
        label: 'Procurement', 
        icon: 'ShoppingBag',
        subItems: [
          { path: '/procurement/purchase-orders', label: 'Purchase Orders', icon: 'FileInput' },
          { path: '/procurement/vendors', label: 'Vendors', icon: 'Building' },
        ]
      },
      { 
        path: '/finance', 
        label: 'Finance', 
        icon: 'DollarSign',
        subItems: [
          { path: '/finance/invoices', label: 'Invoices', icon: 'Receipt' },
          { path: '/finance/payments', label: 'Payments', icon: 'CreditCard' },
        ]
      },
      { 
        path: '/hr', 
        label: 'Human Resources', 
        icon: 'Users',
        subItems: [
          { path: '/hr/employees', label: 'Employees', icon: 'UserCheck' },
          { path: '/hr/attendance', label: 'Attendance', icon: 'Clock' },
          { path: '/hr/payroll', label: 'Payroll', icon: 'Wallet' },
          { path: '/hr/performance', label: 'Performance', icon: 'Star' },
        ]
      },
    ],
  },

  // Executive - High-level overview and reporting
  'Executive': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/sales', label: 'Sales Overview', icon: 'ShoppingCart' },
      { path: '/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/finance', label: 'Finance', icon: 'DollarSign' },
      { path: '/hr', label: 'HR Overview', icon: 'Users' },
    ],
  },

  // Sales Representative - Sales focused
  'Sales Representative': {
    mainNav: [
      { path: '/sales', label: 'Sales Dashboard', icon: 'ShoppingCart' },
      { path: '/sales/customers', label: 'My Customers', icon: 'Users' },
      { path: '/sales/orders', label: 'My Orders', icon: 'FileText' },
      { path: '/inventory/products', label: 'Product Catalog', icon: 'Box' },
    ],
  },

  // Sales Manager - Sales + team management
  'Sales Manager': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/sales', 
        label: 'Sales', 
        icon: 'ShoppingCart',
        subItems: [
          { path: '/sales/customers', label: 'Customers', icon: 'Users' },
          { path: '/sales/orders', label: 'Sales Orders', icon: 'FileText' },
          { path: '/sales/quotes', label: 'Quotations', icon: 'FileSignature' },
        ]
      },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: 'Package',
        subItems: [
          { path: '/inventory/products', label: 'Products', icon: 'Box' },
          { path: '/inventory/stock', label: 'Stock', icon: 'Warehouse' },
        ]
      },
    ],
  },

  // HR Manager - HR focused
  'HR Manager': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/hr', 
        label: 'Human Resources', 
        icon: 'Users',
        subItems: [
          { path: '/hr/employees', label: 'Employees', icon: 'UserCheck' },
          { path: '/hr/attendance', label: 'Attendance', icon: 'Clock' },
          { path: '/hr/payroll', label: 'Payroll', icon: 'Wallet' },
          { path: '/hr/performance', label: 'Performance', icon: 'Star' },
          { path: '/hr/leaves', label: 'Leave Management', icon: 'Calendar' },
        ]
      },
    ],
  },

  // Warehouse Staff - Warehouse operations
  'Warehouse Staff': {
    mainNav: [
      { path: '/logistics', label: 'Warehouse Operations', icon: 'Warehouse' },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: 'Package',
        subItems: [
          { path: '/inventory/stock', label: 'Stock Management', icon: 'Box' },
          { path: '/inventory/adjustments', label: 'Adjustments', icon: 'Settings' },
        ]
      },
      { path: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    ],
  },

  // Warehouse Manager - Full warehouse and logistics
  'Warehouse Manager': {
    mainNav: [
      { 
        path: '/logistics', 
        label: 'Logistics', 
        icon: 'Truck',
        subItems: [
          { path: '/logistics/deliveries', label: 'Deliveries', icon: 'PackageCheck' },
          { path: '/logistics/vehicles', label: 'Vehicles', icon: 'Car' },
        ]
      },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: 'Package',
        subItems: [
          { path: '/inventory/products', label: 'Products', icon: 'Box' },
          { path: '/inventory/stock', label: 'Stock Management', icon: 'Warehouse' },
          { path: '/inventory/adjustments', label: 'Adjustments', icon: 'Settings' },
        ]
      },
      { path: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    ],
  },

  // Delivery Driver - Driver-focused
  'Delivery Driver': {
    mainNav: [
      { path: '/logistics/deliveries', label: 'My Routes', icon: 'Navigation' },
      { path: '/logistics', label: 'Deliveries', icon: 'Truck' },
    ],
  },

  // Logistics Coordinator - Logistics control center
  'Logistics Coordinator': {
    mainNav: [
      { 
        path: '/logistics', 
        label: 'Logistics', 
        icon: 'Truck',
        subItems: [
          { path: '/logistics/deliveries', label: 'Deliveries', icon: 'PackageCheck' },
          { path: '/logistics/vehicles', label: 'Vehicles', icon: 'Car' },
        ]
      },
      { path: '/inventory', label: 'Inventory', icon: 'Package' },
      { path: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
    ],
  },

  // Procurement Manager - Purchasing and inventory
  'Procurement Manager': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/procurement', 
        label: 'Procurement', 
        icon: 'ShoppingBag',
        subItems: [
          { path: '/procurement/purchase-orders', label: 'Purchase Orders', icon: 'FileInput' },
          { path: '/procurement/vendors', label: 'Vendors', icon: 'Building' },
        ]
      },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: 'Package',
        subItems: [
          { path: '/inventory/products', label: 'Products', icon: 'Box' },
          { path: '/inventory/stock', label: 'Stock', icon: 'Warehouse' },
        ]
      },
      { path: '/logistics', label: 'Logistics', icon: 'Truck' },
    ],
  },

  // Production Manager - Production and inventory
  'Production Manager': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/manufacturing', 
        label: 'Manufacturing', 
        icon: 'Factory',
        subItems: [
          { path: '/manufacturing/bom', label: 'Bill of Materials', icon: 'ClipboardList' },
          { path: '/manufacturing/work-orders', label: 'Work Orders', icon: 'Wrench' },
        ]
      },
      { path: '/inventory', label: 'Inventory', icon: 'Package' },
    ],
  },

  // Production Staff - Production focused
  'Production Staff': {
    mainNav: [
      { path: '/manufacturing', label: 'Production', icon: 'Factory' },
      { path: '/manufacturing/work-orders', label: 'Work Orders', icon: 'Wrench' },
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    ],
  },

  // Finance Manager - Financial management
  'Finance Manager': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { 
        path: '/finance', 
        label: 'Finance', 
        icon: 'DollarSign',
        subItems: [
          { path: '/finance/invoices', label: 'Invoices', icon: 'Receipt' },
          { path: '/finance/payments', label: 'Payments', icon: 'CreditCard' },
        ]
      },
      { path: '/sales/orders', label: 'Sales Orders', icon: 'FileText' },
      { path: '/procurement/purchase-orders', label: 'Purchase Orders', icon: 'FileInput' },
    ],
  },

  // Employee - Basic access
  'Employee': {
    mainNav: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/hr/performance', label: 'My Performance', icon: 'Star' },
    ],
  },

  // HR - Basic HR role
  'HR': {
    mainNav: [
      { 
        path: '/hr', 
        label: 'Human Resources', 
        icon: 'Users',
        subItems: [
          { path: '/hr/employees', label: 'Employees', icon: 'UserCheck' },
          { path: '/hr/attendance', label: 'Attendance', icon: 'Clock' },
        ]
      },
    ],
  },
};

// Fallback configuration for unknown roles
export const defaultSidebarConfig: SidebarConfig = {
  mainNav: [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  ],
};

// Helper function to get sidebar config for a specific role
export const getSidebarForRole = (roleName: string): SidebarConfig => {
  // Clean the role name to handle potential whitespace issues
  const cleanRoleName = roleName?.trim().replace(/\s+/g, ' ');
  const config = roleSidebarConfig[cleanRoleName];
  
  if (!config) {
    console.warn('⚠️ Role not found in RBAC configuration:', `"${cleanRoleName}"`);
    console.warn('⚠️ Available roles:', Object.keys(roleSidebarConfig));
    console.warn('⚠️ Using default sidebar instead');
    return defaultSidebarConfig;
  }
  
  return config;
};

// Helper function to flatten all accessible paths for a role (including sub-items)
export const getAllAccessiblePaths = (roleName: string): string[] => {
  const config = getSidebarForRole(roleName);
  const paths: string[] = [];
  
  const extractPaths = (items: SidebarItem[]) => {
    items.forEach(item => {
      paths.push(item.path);
      if (item.subItems) {
        extractPaths(item.subItems);
      }
    });
  };
  
  extractPaths(config.mainNav);
  if (config.quickActions) {
    extractPaths(config.quickActions);
  }
  
  return paths;
};

// Helper function to check if a role has access to a specific route
export const hasRouteAccess = (roleName: string, routePath: string): boolean => {
  const accessiblePaths = getAllAccessiblePaths(roleName);
  return accessiblePaths.some(path => routePath.startsWith(path));
};

// Helper function to get main navigation items
export const getMainNavigation = (roleName: string): SidebarItem[] => {
  const config = getSidebarForRole(roleName);
  return config.mainNav;
};

// Helper function to get quick actions
export const getQuickActions = (roleName: string): SidebarItem[] | undefined => {
  const config = getSidebarForRole(roleName);
  return config.quickActions;
};

// Helper function to find a navigation item by path
export const findNavItemByPath = (roleName: string, searchPath: string): SidebarItem | null => {
  const config = getSidebarForRole(roleName);
  
  const findInItems = (items: SidebarItem[]): SidebarItem | null => {
    for (const item of items) {
      if (item.path === searchPath) {
        return item;
      }
      if (item.subItems) {
        const found = findInItems(item.subItems);
        if (found) return found;
      }
    }
    return null;
  };
  
  const mainNavResult = findInItems(config.mainNav);
  if (mainNavResult) return mainNavResult;
  
  if (config.quickActions) {
    return findInItems(config.quickActions);
  }
  
  return null;
};

// Helper function to check route access from database (for dynamic configuration)
export const hasRouteAccessFromDB = async (roleName: string, routePath: string): Promise<boolean> => {
  try {
    // Import dynamically to avoid circular dependencies
    const { supabase } = await import('@/lib/supabaseClient');

    const { data, error } = await supabase
      .from('role_access_config')
      .select('accessible_routes')
      .eq('role', roleName)
      .single();

    if (error || !data) {
      // Fallback to code-based RBAC if database query fails
      return hasRouteAccess(roleName, routePath);
    }

    const accessibleRoutes: string[] = data.accessible_routes || [];
    
    // Check exact match or parent route match
    return accessibleRoutes.some(route => {
      return routePath === route || routePath.startsWith(route + '/');
    });
  } catch (error) {
    console.error('Error checking route access from DB:', error);
    // Fallback to code-based RBAC
    return hasRouteAccess(roleName, routePath);
  }
};

// Helper function to get sidebar filtered by database configuration
export const getDynamicSidebarForRole = async (roleName: string): Promise<SidebarConfig> => {
  // System Administrator always gets full access from code
  if (roleName === 'System Administrator') {
    return getSidebarForRole(roleName);
  }

  try {
    const { supabase } = await import('@/lib/supabaseClient');

    const { data, error } = await supabase
      .from('role_access_config')
      .select('accessible_routes')
      .eq('role', roleName)
      .single();

    if (error || !data) {
      // Fallback to code-based config
      return getSidebarForRole(roleName);
    }

    const accessibleRoutes: string[] = data.accessible_routes || [];
    const baseConfig = getSidebarForRole(roleName);

    // Filter navigation items based on database configuration
    const filterNavItems = (items: SidebarItem[]): SidebarItem[] => {
      return items
        .filter(item => {
          // Check if this route or any of its children are accessible
          const hasAccess = accessibleRoutes.some(route => 
            route === item.path || route.startsWith(item.path + '/')
          );
          return hasAccess;
        })
        .map(item => {
          if (item.subItems) {
            const filteredSubItems = filterNavItems(item.subItems);
            return { ...item, subItems: filteredSubItems.length > 0 ? filteredSubItems : undefined };
          }
          return item;
        });
    };

    return {
      mainNav: filterNavItems(baseConfig.mainNav),
      quickActions: baseConfig.quickActions ? filterNavItems(baseConfig.quickActions) : undefined,
    };
  } catch (error) {
    console.error('Error getting dynamic sidebar:', error);
    // Fallback to code-based config
    return getSidebarForRole(roleName);
  }
};

// Export all roles for reference
export const ALL_ROLES = Object.keys(roleSidebarConfig);

// Helper to check if user can access a specific module
export const canAccessModule = (roleName: string, modulePath: string): boolean => {
  const paths = getAllAccessiblePaths(roleName);
  return paths.some(path => path.startsWith(modulePath));
};

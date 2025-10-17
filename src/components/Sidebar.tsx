'use client';

import React, { useState, useEffect } from 'react';
import { NavLink } from './NavLink';
import { 
  Home, Users, Receipt, Warehouse, ShoppingCart, Wrench, Truck, 
  DollarSign, Settings, Star, Users2, Building2, Package, 
  FileText, TrendingUp, BookOpen, BarChart, ChevronDown, ChevronRight
} from 'lucide-react';
import { hasPermission, hasAnyPermission, getCurrentUser } from '@/lib/auth';

// Nav item definition
interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  permission: string | string[];
}

// Helper function to check if user is system admin
const isSystemAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'System Administrator';
};

// Helper function to check if user is HR Manager
const isHRManager = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'HR Manager';
};

// Helper function to check if user should see HR section
const canSeeHRSection = (): boolean => {
  return isSystemAdmin() || isHRManager() || hrNavItems.some(i => hasPermission(i.permission as string));
};

// Menu definitions organized by logical groups

// Dashboard
const dashboardItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard", permission: 'dashboard:read' },
];

// Sales & CRM
const salesItems: NavItem[] = [
  { href: "/crm", icon: Users, label: "CRM", permission: ['customer:read','customer:read_own'] },
  { href: "/sales", icon: ShoppingCart, label: "Sales Orders", permission: ['sales_order:read','sales_order:read_own'] },
  { href: "/billing", icon: Receipt, label: "Billing", permission: 'product:read' },
  { href: "/invoices", icon: FileText, label: "Invoices", permission: ['invoice:create','invoice:read'] },
];

// Purchases & Procurement
const purchaseItems: NavItem[] = [
  { href: "/vendors", icon: Building2, label: "Vendors", permission: 'purchase_order:read' },
  { href: "/procurement", icon: Truck, label: "Purchase Orders", permission: 'purchase_order:read' },
];

// Inventory & Manufacturing
const inventoryItems: NavItem[] = [
  { href: "/inventory", icon: Warehouse, label: "Inventory", permission: 'inventory:read' },
  { href: "/manufacturing", icon: Wrench, label: "Manufacturing", permission: 'bom:manage' },
  { href: "/logistics", icon: Truck, label: "Logistics", permission: ['delivery:read','delivery:read_own'] },
];

// Banking & Finance
const financeItems: NavItem[] = [
  { href: "/finance", icon: DollarSign, label: "Finance", permission: ['invoice:create','payment:manage'] },
  { href: "/ledgers", icon: BookOpen, label: "Ledgers", permission: ['invoice:create','payment:manage'] },
  { href: "/loans-investments", icon: TrendingUp, label: "Loans & Investments", permission: ['invoice:create','payment:manage'] },
];

// Human Resources
const hrNavItems: NavItem[] = [
  { href: "/hr/employees", icon: Users2, label: "Employees", permission: 'employee:manage' },
  { href: "/hr/performance", icon: Star, label: "Performance", permission: 'performance_review:read' },
];

// Reports & Analytics
const reportItems: NavItem[] = [
  { href: "/reports", icon: BarChart, label: "Reports & Analytics", permission: 'analytics:read' },
];

// System
const adminNavItems: NavItem[] = [
  { href: "/settings", icon: Settings, label: "Settings", permission: 'user:manage' },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['dashboard', 'sales', 'purchases', 'inventory', 'finance', 'hr', 'reports', 'system'])
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (!isHydrated) {
    // Show minimal sidebar during hydration to prevent mismatch
    return (
      <aside className={`fixed md:relative z-30 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-xl transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-16 md:w-64'
      } h-full overflow-y-auto`}>
        <div className="flex items-center h-12 px-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <Package className="h-6 w-6 text-white" />
          <span className="ml-2 text-lg font-bold">Palaka ERP</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-xs">Loading...</p>
            </div>
          </div>
        </nav>
      </aside>
    );
  }

  // Collapsible Section Component
  const CollapsibleSection = ({ 
    title, 
    items, 
    sectionKey 
  }: { 
    title: string; 
    items: NavItem[]; 
    sectionKey: string;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    const visibleItems = items.filter(i =>
      Array.isArray(i.permission)
        ? hasAnyPermission(i.permission)
        : hasPermission(i.permission)
    );

    if (visibleItems.length === 0) return null;

    return (
      <div className="mb-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          <span className="uppercase tracking-wide">{title}</span>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          )}
        </button>
        {isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {visibleItems.map(i => (
              <NavLink key={i.href} href={i.href} icon={i.icon}>
                {i.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed md:fixed top-0 left-0 z-50 h-screen flex flex-col bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-xl transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 md:translate-x-0' : 'w-0 md:-translate-x-64'}
      `}
    >
    {/* Header - Compact */}
    <div className="flex-shrink-0 flex items-center justify-between h-12 px-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="flex items-center">
        <Package className="h-6 w-6 text-white" />
        <span className="ml-2 text-lg font-bold">Palaka ERP</span>
      </div>
      <button onClick={onToggle} className="text-white hover:bg-white/10 rounded p-1 transition-colors">
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    </div>
    
    {/* Compact Collapsible Navigation */}
    <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {/* Dashboard - Always visible */}
      {dashboardItems.filter(i => 
        Array.isArray(i.permission)
          ? hasAnyPermission(i.permission)
          : hasPermission(i.permission)
      ).map(i => (
        <NavLink key={i.href} href={i.href} icon={i.icon}>
          {i.label}
        </NavLink>
      ))}

      {/* Collapsible Sections */}
      <CollapsibleSection 
        title="Sales & CRM" 
        items={salesItems} 
        sectionKey="sales" 
      />

      <CollapsibleSection 
        title="Purchases" 
        items={purchaseItems} 
        sectionKey="purchases" 
      />

      <CollapsibleSection 
        title="Inventory & Manufacturing" 
        items={inventoryItems} 
        sectionKey="inventory" 
      />

      <CollapsibleSection 
        title="Banking & Finance" 
        items={financeItems} 
        sectionKey="finance" 
      />

      {/* HR Section - with special permission check */}
      {canSeeHRSection() && (
        <div className="mb-1">
          <button
            onClick={() => toggleSection('hr')}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <span className="uppercase tracking-wide">Human Resources</span>
            {expandedSections.has('hr') ? (
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            )}
          </button>
          {expandedSections.has('hr') && (
            <div className="mt-0.5 space-y-0.5">
              {hrNavItems
                .filter(i => hasPermission(i.permission as string) || isSystemAdmin() || isHRManager())
                .map(i => (
                  <NavLink key={i.href} href={i.href} icon={i.icon}>
                    {i.label}
                  </NavLink>
                ))}
            </div>
          )}
        </div>
      )}

      <CollapsibleSection 
        title="Reports & Analytics" 
        items={reportItems} 
        sectionKey="reports" 
      />

      {/* System Section */}
      {adminNavItems.some(i => hasPermission(i.permission as string)) && (
        <div className="mb-1">
          <button
            onClick={() => toggleSection('system')}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          >
            <span className="uppercase tracking-wide">System</span>
            {expandedSections.has('system') ? (
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
            )}
          </button>
          {expandedSections.has('system') && (
            <div className="mt-0.5 space-y-0.5">
              {adminNavItems
                .filter(i => hasPermission(i.permission as string))
                .map(i => (
                  <NavLink key={i.href} href={i.href} icon={i.icon}>
                    {i.label}
                  </NavLink>
                ))}
            </div>
          )}
        </div>
      )}
    </nav>
  </aside>
  );
}

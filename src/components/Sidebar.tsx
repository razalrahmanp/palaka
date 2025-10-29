'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NavLink } from './NavLink';
import { 
  Home, Users, Receipt, Warehouse, ShoppingCart, Wrench, Truck, 
  DollarSign, Star, Users2, Building2, Package, 
  FileText, TrendingUp, BookOpen, BarChart, ChevronDown, ChevronRight,
  Mail, LogOut, Fingerprint, Clock, Calendar, GraduationCap,
  Wallet, FolderOpen, Settings, Calculator
} from 'lucide-react';
import { hasPermission, hasAnyPermission, getCurrentUser } from '@/lib/auth';
import { useRoleAccess, clearRoleAccessCache } from '@/hooks/useRoleAccess';

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

// Menu definitions organized by logical groups

// Dashboard
const dashboardItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard", permission: 'dashboard:read' },
];

// Sales & CRM
const salesItems: NavItem[] = [
  { href: "/sales-crm", icon: Users, label: "CRM", permission: ['customer:read','customer:read_own'] },
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
  { href: "/hr", icon: Home, label: "HR Dashboard", permission: 'employee:manage' },
  { href: "/hr/employees", icon: Users2, label: "Employees", permission: 'employee:manage' },
  { href: "/hr/attendance", icon: Clock, label: "Attendance", permission: 'employee:manage' },
  { href: "/hr/devices", icon: Fingerprint, label: "Biometric Devices", permission: 'employee:manage' },
  { href: "/hr/leaves", icon: Calendar, label: "Leave Management", permission: 'employee:manage' },
  { href: "/hr/performance", icon: Star, label: "Performance", permission: 'performance_review:read' },
  { href: "/hr/training", icon: GraduationCap, label: "Training", permission: 'employee:manage' },
  { href: "/hr/payroll", icon: Wallet, label: "Payroll", permission: 'employee:manage' },
  { href: "/hr/documents", icon: FolderOpen, label: "Documents", permission: 'employee:manage' },
  { href: "/hr/settings", icon: Settings, label: "HR Settings", permission: 'employee:manage' },
];

// Reports & Analytics
const reportItems: NavItem[] = [
  { href: "/reports", icon: BarChart, label: "Reports Overview", permission: 'analytics:read' },
  { href: "/reports/profit-loss", icon: TrendingUp, label: "Profit & Loss Statement", permission: 'analytics:read' },
  { href: "/reports/trial-balance", icon: Calculator, label: "Trial Balance", permission: 'analytics:read' },
  { href: "/reports/cash-flow", icon: DollarSign, label: "Cash Flow Statement", permission: 'analytics:read' },
  { href: "/reports/balance-sheet", icon: BarChart, label: "Balance Sheet", permission: 'analytics:read' },
  { href: "/reports/accounts-payable-receivable", icon: Users, label: "Accounts Payable & Receivable", permission: 'analytics:read' },
  { href: "/reports/day-sheet", icon: Calendar, label: "Day Sheet", permission: 'analytics:read' },
  { href: "/reports/aging-report", icon: Clock, label: "Aging Report", permission: 'analytics:read' },
];

// Settings (System Administrator only)
const settingsItems: NavItem[] = [
  { href: "/settings", icon: Settings, label: "Settings", permission: 'user:manage' }, // System Admin permission
];

export const Sidebar = () => {
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { hasRouteAccess, loading: accessLoading } = useRoleAccess();
  
  // State for collapsible sections
  // HR managers get HR section expanded by default, but can collapse it
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const sections = new Set<string>();
    if (isHRManager() || isSystemAdmin()) {
      sections.add('hr'); // HR section starts expanded for HR managers, but can be collapsed
    }
    return sections;
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Collapse sidebar when pathname changes (navigation occurs)
  useEffect(() => {
    if (pathname) {
      setIsHovered(false);
      // Collapse all sections when navigating to keep sidebar clean
      setExpandedSections(new Set());
    }
  }, [pathname]);

  // Helper function to check if user should see HR section
  const canSeeHRSection = (): boolean => {
    if (accessLoading) return true; // Show while loading to prevent flicker
    return isSystemAdmin() || isHRManager() || hrNavItems.some(i => {
      const hasPermissionCheck = hasPermission(i.permission as string);
      if (!hasPermissionCheck) return false;
      return hasRouteAccess(i.href);
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set<string>();
      
      // Normal behavior for all sections - expand/collapse toggle
      // If clicking the same section, collapse it. Otherwise, expand only the clicked section
      if (!prev.has(section)) {
        newSet.add(section);
      }
      // If section was expanded, clicking it will collapse it (newSet stays empty)
      
      return newSet;
    });
  };

  if (!isHydrated) {
    // Show minimal sidebar during hydration to prevent mismatch
    return (
      <aside className="fixed top-0 left-0 z-50 w-16 h-screen bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-xl">
        <div className="flex items-center justify-center h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <Package className="h-6 w-6 text-white" />
        </div>
        <nav className="flex-1 p-2">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        </nav>
      </aside>
    );
  }

  const isExpanded = isHovered;

  // Collapsible Section Component
  const CollapsibleSection = ({ 
    title, 
    items, 
    sectionKey,
    icon: SectionIcon
  }: { 
    title: string; 
    items: NavItem[]; 
    sectionKey: string;
    icon: React.ElementType;
  }) => {
    const isSectionExpanded = expandedSections.has(sectionKey);
    const visibleItems = items.filter(i => {
      // First check permissions
      const hasPermissionCheck = Array.isArray(i.permission)
        ? hasAnyPermission(i.permission)
        : hasPermission(i.permission);
      
      // If no permission, don't show
      if (!hasPermissionCheck) return false;
      
      // Then check route access from database
      if (!accessLoading && !hasRouteAccess(i.href)) {
        return false;
      }
      
      return true;
    });

    if (visibleItems.length === 0) return null;

    return (
      <div>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-all group"
          title={!isExpanded ? title : ''}
        >
          <SectionIcon className="h-5 w-5 flex-shrink-0" />
          {isExpanded && (
            <>
              <span className="text-sm font-medium flex-1 text-left truncate">{title}</span>
              {isSectionExpanded ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
            </>
          )}
        </button>
        {isSectionExpanded && isExpanded && (
          <div className="mt-1 ml-8 space-y-0.5">
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 z-50 h-screen flex flex-col bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-xl transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
    {/* Header - Compact */}
    <div className="flex-shrink-0 flex items-center justify-center h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white relative">
      <Package className="h-6 w-6 text-white flex-shrink-0" />
      {isExpanded && <span className="ml-2 text-lg font-bold whitespace-nowrap">Palaka ERP</span>}
    </div>
    
    {/* Compact Navigation */}
    <nav className="flex-1 px-2 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex flex-col justify-between">
      <div className="space-y-2">
        {/* Dashboard - Always visible */}
        {dashboardItems.filter(i => {
          const hasPermissionCheck = Array.isArray(i.permission)
            ? hasAnyPermission(i.permission)
            : hasPermission(i.permission);
          
          if (!hasPermissionCheck) return false;
          
          // Check route access from database
          if (!accessLoading && !hasRouteAccess(i.href)) {
            return false;
          }
          
          return true;
        }).map(i => (
          <NavLink key={i.href} href={i.href} icon={i.icon}>
            {isExpanded && i.label}
          </NavLink>
        ))}
      </div>

      <div className="space-y-2 flex-1 flex flex-col justify-evenly py-4">
        {/* Collapsible Sections */}
        <CollapsibleSection 
          title="Sales & CRM" 
          items={salesItems} 
          sectionKey="sales"
          icon={ShoppingCart}
        />

        <CollapsibleSection 
          title="Purchases" 
          items={purchaseItems} 
          sectionKey="purchases"
          icon={Truck}
        />

      <CollapsibleSection 
        title="Inventory & Manufacturing" 
        items={inventoryItems} 
        sectionKey="inventory"
        icon={Warehouse}
      />

      <CollapsibleSection 
        title="Banking & Finance" 
        items={financeItems} 
        sectionKey="finance"
        icon={DollarSign}
      />

      {/* HR Section - with special permission check */}
      {canSeeHRSection() && (
        <div>
          <button
            onClick={() => toggleSection('hr')}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-all group"
            title={!isExpanded ? 'Human Resources' : ''}
          >
            <Users2 className="h-5 w-5 flex-shrink-0" />
            {isExpanded && (
              <>
                <span className="text-sm font-medium flex-1 text-left truncate">Human Resources</span>
                {expandedSections.has('hr') ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </>
            )}
          </button>
          {expandedSections.has('hr') && isExpanded && (
            <div className="mt-1 ml-8 space-y-0.5">
              {hrNavItems
                .filter(i => {
                  const hasPermissionCheck = hasPermission(i.permission as string) || isSystemAdmin() || isHRManager();
                  if (!hasPermissionCheck) return false;
                  
                  // Check route access from database
                  if (!accessLoading && !hasRouteAccess(i.href)) {
                    return false;
                  }
                  
                  return true;
                })
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
        icon={BarChart}
      />

      {/* Settings - System Administrator Only */}
      {isSystemAdmin() && settingsItems
        .filter(i => {
          const hasPermissionCheck = hasPermission(i.permission as string);
          if (!hasPermissionCheck) return false;
          
          // Check route access from database
          if (!accessLoading && !hasRouteAccess(i.href)) {
            return false;
          }
          
          return true;
        })
        .map(i => (
          <NavLink key={i.href} href={i.href} icon={i.icon}>
            {isExpanded && i.label}
          </NavLink>
        ))}
      </div>
    </nav>

    {/* Profile Section at Bottom */}
    <div className="flex-shrink-0 border-t border-gray-200 bg-white">
      {isExpanded ? (
        <div className="p-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md text-sm">
                {getCurrentUser()?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {getCurrentUser()?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getCurrentUser()?.role || 'Role'}
              </p>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                clearRoleAccessCache();
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          
          {/* Email */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{getCurrentUser()?.email || 'email@example.com'}</span>
          </div>
        </div>
      ) : (
        <div className="p-2 flex justify-center">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold shadow-md text-sm">
              {getCurrentUser()?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  </aside>
  );
}

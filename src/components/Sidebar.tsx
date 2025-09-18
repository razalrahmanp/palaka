'use client';

import React, { useState, useEffect } from 'react';
import { NavLink } from './NavLink';
import { Home, Users, Receipt, Warehouse, ShoppingCart, Wrench, Truck, DollarSign, Bell, Settings, Star, Users2, Building2, Package, FileText, TrendingUp } from 'lucide-react';
import { hasPermission, hasAnyPermission } from '@/lib/auth';

// Nav item definition
interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  permission: string | string[];
}

// Menu definitions
const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard", permission: 'dashboard:read' },
  { href: "/crm", icon: Users, label: "CRM", permission: ['customer:read','customer:read_own'] },
  { href: "/sales", icon: ShoppingCart, label: "Sales", permission: ['sales_order:read','sales_order:read_own'] },
  { href: "/billing", icon: Receipt, label: "Billing", permission: 'product:read' },
  { href: "/invoices", icon: FileText, label: "Invoices", permission: ['invoice:create','invoice:read'] },
  { href: "/inventory", icon: Warehouse, label: "Inventory", permission: 'inventory:read' },
  { href: "/vendors", icon: Building2, label: "Vendors", permission: 'purchase_order:read' },
  { href: "/manufacturing", icon: Wrench, label: "Manufacturing", permission: 'bom:manage' },
  { href: "/procurement", icon: Truck, label: "Procurement", permission: 'purchase_order:read' },
  { href: "/logistics", icon: Truck, label: "Logistics", permission: ['delivery:read','delivery:read_own'] },
  { href: "/finance", icon: DollarSign, label: "Finance", permission: ['invoice:create','payment:manage'] },
  { href: "/loans-investments", icon: TrendingUp, label: "Loans & Investments", permission: ['invoice:create','payment:manage'] },
];

const hrNavItems: NavItem[] = [
  { href: "/hr/employees", icon: Users2, label: "Employees", permission: 'employee:manage' },
  { href: "/hr/performance", icon: Star, label: "Performance", permission: 'performance_review:read' },
];

const adminNavItems: NavItem[] = [
  { href: "/alerts", icon: Bell, label: "Alerts", permission: 'analytics:read' },
  { href: "/settings", icon: Settings, label: "Settings", permission: 'user:manage' },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    // Show minimal sidebar during hydration to prevent mismatch
    return (
      <aside className={`fixed md:relative z-30 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-xl transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-16 md:w-64'
      } h-full overflow-y-auto`}>
        <div className="flex items-center h-16 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <Package className="h-8 w-8 text-white" />
          <span className="ml-3 text-xl font-bold">Al Rams ERP</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-sm">Loading...</p>
            </div>
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed md:fixed top-0 left-0 z-50 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 shadow-xl transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 md:translate-x-0' : 'w-0 md:-translate-x-64'}
      `}
    >
    {/* Header */}
    <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="flex items-center">
        <Package className="h-8 w-8 text-white" />
        <span className="ml-3 text-xl font-bold">Palaka ERP</span>
      </div>
      {/* Toggle button for both desktop and mobile */}
      <button onClick={onToggle} className="text-white">
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    </div>
    
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {/* Core Modules */}
      <div className="mb-6">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Core Modules</p>
        <div className="space-y-1">
          {navItems
            .filter(i =>
              Array.isArray(i.permission)
                ? hasAnyPermission(i.permission)
                : hasPermission(i.permission)
            )
            .map(i => (
              <NavLink
                key={i.href}
                href={i.href}
                icon={i.icon}
              >
                {i.label}
              </NavLink>
            ))}
        </div>
      </div>

      {/* Human Resources */}
      <div className="mb-6">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Human Resources</p>
        <div className="space-y-1">
          {hrNavItems
            .filter(i => hasPermission(i.permission as string))
            .map(i => (
              <NavLink
                key={i.href}
                href={i.href}
                icon={i.icon}
              >
                {i.label}
              </NavLink>
            ))}
        </div>
      </div>

      {/* System Management */}
      <div className="mb-6">
        <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">System</p>
        <div className="space-y-1">
          {adminNavItems
            .filter(i => hasPermission(i.permission as string))
            .map(i => (
              <NavLink
                key={i.href}
                href={i.href}
                icon={i.icon}
              >
                {i.label}
              </NavLink>
            ))}
        </div>
      </div>
    </nav>
  </aside>
  );
}

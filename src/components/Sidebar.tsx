'use client';

import React, { useState, useEffect } from 'react';
import { NavLink } from './NavLink';
import { Home, Users, Package, Warehouse, ShoppingCart, Wrench, Truck, DollarSign, BarChart as AnalyticsIcon, Bell, Settings, Star, Users2, Building2, Calculator } from 'lucide-react';
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
  { href: "/products", icon: Package, label: "Products", permission: 'product:read' },
  { href: "/inventory", icon: Warehouse, label: "Inventory", permission: 'inventory:read' },
  { href: "/vendors", icon: Building2, label: "Vendors", permission: 'purchase_order:read' },
  { href: "/manufacturing", icon: Wrench, label: "Manufacturing", permission: 'bom:manage' },
  { href: "/procurement", icon: Truck, label: "Procurement", permission: 'purchase_order:read' },
  { href: "/logistics", icon: Truck, label: "Logistics", permission: ['delivery:read','delivery:read_own'] },
  { href: "/finance", icon: DollarSign, label: "Finance", permission: ['invoice:create','payment:manage'] },
  { href: "/accounting", icon: Calculator, label: "Accounting", permission: ['invoice:create','payment:manage'] },
  { href: "/analytics", icon: AnalyticsIcon, label: "Analytics", permission: 'analytics:read' },
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
      <aside className={`fixed md:relative z-30 bg-amber-50 border-r border-amber-200 transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-16 md:w-64'
      } h-full overflow-y-auto`}>
        <div className="p-4">
          <h2 className="text-xl font-bold text-amber-800">Al Rams ERP</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <div className="text-center text-amber-600">Loading...</div>
        </nav>
      </aside>
    );
  }

  return (
  <aside
    className={`fixed md:relative top-0 left-0 z-50 w-64 bg-white/70 backdrop-blur-md border-r border-white/30 text-brown-900 shadow-lg transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:block`}
  >
    <div className="flex items-center justify-between h-16 px-4 bg-white/20">
      <Package className="h-8 w-8 text-amber-700" />
      <span className="ml-2 text-xl font-bold text-amber-800">Furniture ERP</span>
      {/* Mobile toggle button */}
      <button onClick={onToggle} className="md:hidden text-amber-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
      {/* Menu */}
      <p className="px-4 pt-4 pb-2 text-xs font-semibold text-amber-800 uppercase">Menu</p>
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

      {/* HR */}
      <p className="px-4 pt-4 pb-2 text-xs font-semibold text-amber-800 uppercase">Human Resources</p>
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

      {/* System */}
      <p className="px-4 pt-4 pb-2 text-xs font-semibold text-amber-800 uppercase">System</p>
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
    </nav>
  </aside>
  );
}

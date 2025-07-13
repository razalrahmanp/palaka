'use client';

import React from 'react';
import { NavLink } from './NavLink';
import {
  Home, Users, Package, Warehouse, ShoppingCart, Wrench,
  Truck, DollarSign, BarChart as AnalyticsIcon, Bell, Settings,
  Star, Users2
} from 'lucide-react';
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
  { href: "/dashboard",    icon: Home,           label: "Dashboard",    permission: 'dashboard:read' },
  { href: "/crm",          icon: Users,          label: "CRM",          permission: ['customer:read','customer:read_own'] },
  { href: "/sales",        icon: ShoppingCart,   label: "Sales",        permission: ['sales_order:read','sales_order:read_own'] },
  { href: "/products",     icon: Package,        label: "Products",     permission: 'product:read' },
  { href: "/inventory",    icon: Warehouse,      label: "Inventory",    permission: 'inventory:read' },
  { href: "/manufacturing",icon: Wrench,         label: "Manufacturing",permission: 'bom:manage' },
  { href: "/procurement",  icon: Truck,          label: "Procurement",  permission: 'purchase_order:read' },
  { href: "/logistics",    icon: Truck,          label: "Logistics",    permission: ['delivery:read','delivery:read_own'] },
  { href: "/finance",      icon: DollarSign,     label: "Finance",      permission: ['invoice:create','payment:manage'] },
  { href: "/analytics",    icon: AnalyticsIcon,  label: "Analytics",    permission: 'analytics:read' },
];

const hrNavItems: NavItem[] = [
  { href: "/hr/employees",   icon: Users2, label: "Employees",   permission: 'employee:manage' },
  { href: "/hr/performance", icon: Star,   label: "Performance", permission: 'performance_review:read' },
];

const adminNavItems: NavItem[] = [
  { href: "/alerts",   icon: Bell,     label: "Alerts",   permission: 'analytics:read' },
  { href: "/settings", icon: Settings, label: "Settings", permission: 'user:manage' },
];

export const Sidebar = () => (
  <aside
    className="
      hidden md:flex md:flex-col md:w-64
      bg-white/70 backdrop-blur-md
      border-r border-b border-white/30
      text-brown-900
      shadow-lg
    "
  >
    <div className="flex items-center justify-center h-16 border-b border-white/30 shrink-0 bg-white/20">
      <Package className="h-8 w-8 text-amber-700" />
      <span className="ml-2 text-xl font-bold text-amber-800">Furniture ERP</span>
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

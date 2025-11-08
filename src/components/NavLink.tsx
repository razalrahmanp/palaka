// File: src/components/NavLink.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

export const NavLink = ({ href, icon: Icon, children }: NavLinkProps) => {
  const pathname = usePathname();
  const active = pathname === href;
  const iconOnly = !children;

  return (
    <Link
      href={href}
      className={`group flex items-center ${iconOnly ? 'justify-center' : ''} px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg'
          : 'text-slate-700 hover:bg-sky-100 hover:text-sky-700'
      }`}
      title={iconOnly ? String(children) : ''}
    >
      <Icon
        className={`${iconOnly ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 transition-all duration-200 ${
          active 
            ? 'text-white' 
            : 'text-slate-500 group-hover:text-sky-700'
        }`}
      />
      {children && <span className="transition-all duration-200 truncate">{children}</span>}
      {active && children && (
        <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75 flex-shrink-0"></div>
      )}
    </Link>
  );
};

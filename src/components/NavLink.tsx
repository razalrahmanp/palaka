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

  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors
        ${
          active
            ? 'bg-amber-700 text-white'
            : 'text-amber-800 hover:bg-amber-100/60 hover:text-amber-900'
        }`}
    >
      <Icon
        className={`mr-3 h-5 w-5 transition-colors ${
          active ? 'text-white' : 'text-amber-700'
        }`}
      />
      {children}
    </Link>
  );
};

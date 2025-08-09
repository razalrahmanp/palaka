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
      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-[1.02]'
          : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 hover:text-blue-700 hover:shadow-md hover:transform hover:scale-[1.01]'
      }`}
    >
      <Icon
        className={`mr-3 h-5 w-5 transition-all duration-200 ${
          active 
            ? 'text-white' 
            : 'text-gray-500 group-hover:text-blue-600'
        }`}
      />
      <span className="transition-all duration-200">{children}</span>
      {active && (
        <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-75"></div>
      )}
    </Link>
  );
};

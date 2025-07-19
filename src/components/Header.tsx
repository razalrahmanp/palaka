'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCurrentUser, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { NotificationDropdown } from './NotificationDropdown'; // Import the new component

export const Header = ({ onSidebarToggle }: { onSidebarToggle: () => void }) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const user = getCurrentUser();
  const router = useRouter();
  const notificationRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b relative z-10">
      {/* Mobile Sidebar Toggle Button */}
      <button onClick={onSidebarToggle} className="md:hidden text-amber-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Center content can be added here if needed */}
      <div className="flex-grow"></div>  {/* This takes up the space between the left and right items */}

      <div className="flex items-center space-x-4">
        {/* Bell Icon with Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
            className="p-2 rounded-full hover:bg-gray-100 relative"
          >
            <Bell className="h-6 w-6 text-gray-500" />
          </button>
          {notificationDropdownOpen && <NotificationDropdown />}
        </div>

        {/* Avatar Button */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="focus:outline-none"
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
              <AvatarFallback>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border z-50">
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-800">{user?.email}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <div className="border-t" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

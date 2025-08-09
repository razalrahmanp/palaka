'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, Settings, LogOut, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCurrentUser, logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { NotificationDropdown } from './NotificationDropdown';

export const Header = ({ onSidebarToggle }: { onSidebarToggle?: () => void }) => {
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
    <div className="fixed top-6 right-6 z-50 flex items-center space-x-3">
      {/* Mobile Menu Button - Only visible on mobile */}
      {onSidebarToggle && (
        <button
          onClick={onSidebarToggle}
          className="md:hidden p-3 rounded-full bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 hover:scale-105 group"
        >
          <Menu className="h-5 w-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
        </button>
      )}

      {/* Bell Icon with Dropdown */}
      <div className="relative" ref={notificationRef}>
        <button
          onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
          className="p-3 rounded-full bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 hover:scale-105 group"
        >
          <Bell className="h-5 w-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
        </button>
        {notificationDropdownOpen && (
          <div className="absolute right-0 top-full mt-2">
            <NotificationDropdown />
          </div>
        )}
      </div>

      {/* Avatar Button */}
      <div className="relative" ref={userRef}>
        <button
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="p-1 rounded-full bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </button>

        {userDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 overflow-hidden z-50">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-4 text-white">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 border-2 border-white/20">
                  <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
                  <AvatarFallback className="bg-white/20 text-white font-semibold">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{user?.email}</p>
                  <p className="text-xs text-purple-100 bg-white/10 px-2 py-1 rounded-full inline-block mt-1">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <div className="my-2 border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

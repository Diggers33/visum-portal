import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  FolderOpen, 
  GraduationCap, 
  Megaphone,
  Settings,
  LogOut,
  HelpCircle,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Toaster } from '../ui/sonner';
import { supabase } from '../../lib/supabase';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Distributors', href: '/admin/distributors', icon: Users },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Documentation', href: '/admin/documentation', icon: FileText },
  { name: 'Marketing Assets', href: '/admin/marketing', icon: FolderOpen },
  { name: 'Training', href: '/admin/training', icon: GraduationCap },
  { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export default function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        
        // Try to get name from metadata, otherwise use email
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        setUserName(name);
        
        // Generate initials
        const initials = name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setUserInitials(initials || 'U');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e293b] transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700">
          <div>
            <h1 className="text-[20px] font-semibold text-white">
              Visum<sup className="text-[12px]">®</sup>
            </h1>
            <p className="text-[11px] text-[#ef4444]">Admin Portal</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  isActive
                    ? 'bg-[#ef4444] text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-[12px] text-slate-400 text-center">
            Need help?{' '}
            <a 
              href="mailto:it@iris-eng.com" 
              className="text-[#00a8b5] hover:text-[#008a95] underline"
            >
              Contact IT
            </a>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          {/* Left: Mobile menu + Badge */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#ef4444]/10 rounded-full">
              <div className="w-2 h-2 bg-[#ef4444] rounded-full" />
              <span className="text-[12px] font-medium text-[#ef4444]">ADMIN MODE</span>
            </div>
          </div>

          {/* Right: Search, Notifications, User Menu */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 w-64 bg-slate-50 border-slate-200"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full" />
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg">
                  <div className="w-8 h-8 bg-[#ef4444] rounded-full flex items-center justify-center">
                    <span className="text-[13px] text-white">{userInitials || 'U'}</span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-[13px] font-medium text-slate-900">{userName || 'User'}</div>
                    <div className="text-[11px] text-slate-500">Admin</div>
                  </div>
                  <ChevronDown className="hidden lg:block h-4 w-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-[13px] font-medium">{userName || 'User'}</p>
                  <p className="text-[12px] text-slate-500">{userEmail || 'No email'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

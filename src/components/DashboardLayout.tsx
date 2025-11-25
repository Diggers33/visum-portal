import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  FolderOpen,
  FileText,
  GraduationCap,
  Settings,
  Bell,
  LogOut,
  HelpCircle,
  Globe,
  Search,
  ChevronDown,
  Users
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import LanguageSwitcher from './LanguageSwitcher';
import { supabase } from '../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export default function DashboardLayout({ children, onLogout }: DashboardLayoutProps) {
  const location = useLocation();
  const { t } = useTranslation('common');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const navigation = [
    { name: t('navigation.whatsNew'), href: '/portal', icon: Bell },
    { name: t('navigation.products'), href: '/portal/products', icon: Package },
    { name: t('navigation.marketingAssets'), href: '/portal/marketing', icon: FolderOpen },
    { name: t('navigation.documentation'), href: '/portal/docs', icon: FileText },
    { name: t('navigation.trainingCenter'), href: '/portal/training', icon: GraduationCap },
    { name: t('navigation.customers', 'Customers'), href: '/portal/customers', icon: Users },
    { name: t('navigation.myAccount'), href: '/portal/account', icon: Settings },
  ];
  
  // User data state
  const [userProfile, setUserProfile] = useState({
    companyName: t('common.loading'),
    territory: '',
    fullName: '',
    initials: 'U',
    notificationCount: 0
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('company_name, territory, full_name, email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading user profile:', error);
          return;
        }

        if (profile) {
          const name = profile.company_name || profile.full_name || profile.email?.split('@')[0] || 'User';
          const initials = name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          setUserProfile({
            companyName: profile.company_name || 'Your Company',
            territory: profile.territory || 'No Territory',
            fullName: profile.full_name || profile.email?.split('@')[0] || 'User',
            initials: initials || 'U',
            notificationCount: 1
          });
        }
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-slate-200 px-4">
            <div className="flex flex-col items-center">
              <span className="text-xl text-[#00a8b5] tracking-tight leading-tight">Visum®</span>
              <span className="text-xs text-[#666666] leading-tight">{t('footer.distributorPortal')}</span>
              <span className="text-[10px] text-[#999999] leading-tight">{t('footer.byIRIS')}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              // For customers section, check if we're in any nested route
              const isActive = item.href === '/portal/customers'
                ? location.pathname.startsWith('/portal/customers')
                : location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 relative ${
                    isActive
                      ? 'bg-[#d1f2f7] text-cyan-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00a8b5] rounded-r" />}
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-cyan-900' : 'text-slate-500'}`} />
                  <span className="text-[15px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg bg-[#f9fafb] p-3 border border-[#e5e7eb]">
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                <p className="text-xs text-slate-600">{t('footer.needHelp')}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs bg-white border border-[#e5e7eb] hover:border-[#00a8b5] hover:text-[#00a8b5] transition-colors rounded-md py-2"
              >
                {t('buttons.contactSupport')}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder={t('header.search')}
                className="pl-10 bg-slate-50 border-slate-200 focus:border-[#00a8b5] focus:ring-2 focus:ring-[#00a8b5]/20 transition-all"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 transition-colors">
              <Bell className="h-5 w-5 text-slate-600" />
              {userProfile.notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-[18px] w-[18px] rounded-full bg-red-500 text-[11px] text-white flex items-center justify-center font-medium">
                  {userProfile.notificationCount}
                </span>
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-100 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-cyan-600 text-white text-sm">
                      {userProfile.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden md:block">
                    <div className="text-sm text-slate-900">{userProfile.companyName}</div>
                    <div className="text-xs text-slate-500">{userProfile.territory}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{userProfile.companyName}</p>
                    <p className="text-xs text-slate-500">{userProfile.territory}</p>
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
                      <Globe className="h-3.5 w-3.5 text-[#00a8b5]" />
                      <p className="text-xs text-slate-600">Territory: {userProfile.territory}</p>
                    </div>
                    <p className="text-xs text-slate-500">Distributor</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/portal/account" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('navigation.myAccount')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>{t('header.helpSupport')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('header.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

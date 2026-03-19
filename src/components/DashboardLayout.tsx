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
  Users,
  Download,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import LanguageSwitcher from './LanguageSwitcher';
import { supabase } from '../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

interface Notification {
  id: string;
  type: 'announcement' | 'release' | 'system';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
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
    { name: t('navigation.softwareUpdates', 'Software Updates'), href: '/portal/software-updates', icon: Download },
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Fetch recent announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, content, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(5);

      // Fetch recent software releases
      const { data: releases } = await supabase
        .from('software_releases')
        .select('id, name, version, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);

      const notificationList: Notification[] = [];

      // Add announcements
      announcements?.forEach(a => {
        notificationList.push({
          id: `announcement-${a.id}`,
          type: 'announcement',
          title: a.title,
          message: a.content?.substring(0, 100) + '...' || '',
          date: a.published_at,
          read: false,
          link: '/portal'
        });
      });

      // Add releases
      releases?.forEach(r => {
        notificationList.push({
          id: `release-${r.id}`,
          type: 'release',
          title: `New Release: ${r.name}`,
          message: `Version ${r.version} is now available`,
          date: r.published_at,
          read: false,
          link: '/portal/software-updates'
        });
      });

      // Sort by date
      notificationList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setNotifications(notificationList.slice(0, 5));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

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
            notificationCount: 0 // Will be updated by notifications
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
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#0a1228]" style={{ background: '#0F183D' }}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-center border-b border-white/10 px-4 py-4">
            <div className="flex flex-col items-center gap-1">
              <img src="/assets/Logo_Visum.svg" alt="Visum" className="h-10 w-auto" />
              <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/40 mt-1">{t('footer.distributorPortal')}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              // For customers section, check if we're in any nested route
              const isActive = item.href === '/portal/customers'
                ? location.pathname.startsWith('/portal/customers')
                : location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-150 relative ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                  style={isActive ? {} : {}}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  {isActive && <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#01B8D1] rounded-r" />}
                  <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/50'}`} />
                  <span className="text-[14px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/10 p-4 space-y-4">
            <div className="rounded-md p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-white/40" />
                <p className="text-xs text-white/50">{t('footer.needHelp')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs bg-transparent border border-white/20 text-white/60 hover:border-[#01B8D1] hover:text-[#01B8D1] transition-colors rounded-md py-2"
              >
                {t('buttons.contactSupport')}
              </Button>
            </div>
            <div className="flex justify-center pb-1">
              <img src="/assets/IRIS_LOGO.svg" alt="IRIS Technology Solutions" className="h-7 w-auto opacity-60" />
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
                className="pl-10 bg-slate-50 border-slate-200 focus:border-[#01B8D1] focus:ring-2 focus:ring-[#01B8D1]/20 transition-all"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 transition-colors">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-[18px] w-[18px] rounded-full bg-red-500 text-[11px] text-white flex items-center justify-center font-medium">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                </div>
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notification) => (
                        <Link
                          key={notification.id}
                          to={notification.link || '/portal'}
                          onClick={() => setNotificationsOpen(false)}
                          className="block p-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                              notification.type === 'release' ? 'bg-green-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {notification.date ? new Date(notification.date).toLocaleDateString() : ''}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-2 border-t border-slate-200">
                  <Link
                    to="/portal"
                    onClick={() => setNotificationsOpen(false)}
                    className="block w-full text-center text-sm text-[#01B8D1] hover:text-[#00a0bb] py-1"
                  >
                    View all updates
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 hover:bg-slate-100 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#01B8D1] text-white text-sm">
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
                      <Globe className="h-3.5 w-3.5 text-[#01B8D1]" />
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

            {/* Language Switcher */}
            <LanguageSwitcher />
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

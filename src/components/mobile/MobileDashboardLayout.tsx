import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  FolderOpen, 
  FileText, 
  GraduationCap, 
  Bell,
  LogOut,
  HelpCircle,
  Globe,
  Menu,
  Search,
  X,
  User,
  Loader2
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import MobileNotificationsPanel from './MobileNotificationsPanel';
import { useUserProfile } from '../../hooks/useData';
import { useNotifications } from '../../hooks/useNotifications';

interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const navigation = [
  { name: 'What\'s New', href: '/mobile/dashboard', icon: Bell, showInBottomNav: true },
  { name: 'Products', href: '/mobile/products', icon: Package, showInBottomNav: true },
  { name: 'Marketing', href: '/mobile/marketing-assets', icon: FolderOpen, showInBottomNav: false },
  { name: 'Docs', href: '/mobile/documentation', icon: FileText, showInBottomNav: true },
  { name: 'Training', href: '/mobile/training', icon: GraduationCap, showInBottomNav: false },
  { name: 'Account', href: '/mobile/account', icon: User, showInBottomNav: true },
];

export default function MobileDashboardLayout({ children, onLogout }: MobileDashboardLayoutProps) {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Load user profile
  const { profile, loading: profileLoading } = useUserProfile();
  
  // Load notifications for badge count
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const bottomNavItems = navigation.filter(item => item.showInBottomNav);
  const menuItems = navigation.filter(item => !item.showInBottomNav);

  // Get initials for avatar
  const getInitials = () => {
    if (profile?.company_name) {
      return profile.company_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex flex-col">
            <span className="text-base text-[#00a8b5] tracking-tight leading-tight">Visum®</span>
            <span className="text-[9px] text-[#999999] leading-tight -mt-0.5">By IRIS Technology</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              className="h-9 w-9"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              {searchOpen ? <X className="h-5 w-5 text-slate-600" /> : <Search className="h-5 w-5 text-slate-600" />}
            </Button>

            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-9 w-9"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-medium">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Mobile Notifications Panel */}
            <MobileNotificationsPanel 
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />

            {/* Menu Sheet */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5 text-slate-600" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* User Info */}
                  <div className="p-6 bg-gradient-to-br from-[#00a8b5] to-[#008a95]">
                    {profileLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="h-12 w-12 border-2 border-white/30">
                            <AvatarFallback className="bg-white/20 text-white">
                              {getInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-white font-medium">
                              {profile?.company_name || 'Distributor'}
                            </div>
                            <div className="text-xs text-white/80">
                              {profile?.region || 'Region'}
                            </div>
                          </div>
                        </div>
                        {profile?.territory && (
                          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-2">
                            <Globe className="h-3.5 w-3.5 text-white/90" />
                            <span className="text-xs text-white/90">{profile.territory}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Menu Items */}
                  <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                            isActive
                              ? 'bg-[#d1f2f7] text-cyan-900'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-cyan-900' : 'text-slate-500'}`} />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-slate-200 space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      size="sm"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Contact Support
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={onLogout}
                      size="sm"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search Bar - Expandable */}
        {searchOpen && (
          <div className="px-4 pb-3 pt-1 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="Search products, docs..."
                className="pl-10 bg-slate-50 border-slate-200 focus:border-[#00a8b5] h-10"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-8rem)]">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex items-center justify-around px-2 h-16">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] flex-1 relative touch-manipulation"
                style={{ 
                  WebkitTapHighlightColor: 'rgba(0,168,181,0.1)',
                  cursor: 'pointer'
                }}
              >
                <item.icon 
                  className={`h-5 w-5 pointer-events-none ${
                    isActive ? 'text-[#00a8b5]' : 'text-slate-500'
                  }`} 
                />
                <span 
                  className={`text-[10px] pointer-events-none ${
                    isActive ? 'text-[#00a8b5]' : 'text-slate-600'
                  }`}
                >
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[#00a8b5] rounded-t-full pointer-events-none" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Auth Components
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/admin/AdminLoginPage';
import AuthCallback from './components/AuthCallback';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import SetPassword from './components/SetPassword';

// Admin Pages
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import DocumentationManagement from './components/admin/DocumentationManagement';
import TrainingManagement from './components/admin/TrainingManagement';
import MarketingManagement from './components/admin/MarketingManagement';
import AnnouncementsManagement from './components/admin/AnnouncementsManagement';
import DistributorsManagement from './components/admin/DistributorsManagement';
import ProductsManagement from './components/admin/ProductsManagement';
import EditProduct from './components/admin/EditProduct';
import AdminSettings from './components/admin/AdminSettings';

// Desktop Distributor Portal Components
import DashboardLayout from './components/DashboardLayout';
import WhatsNew from './components/WhatsNew';
import ProductCatalog from './components/ProductCatalog';
import ProductDetail from './components/ProductDetail';
import MarketingAssets from './components/MarketingAssets';
import TechnicalDocs from './components/TechnicalDocs';
import TrainingCenter from './components/TrainingCenter';
import MyAccount from './components/MyAccount';

// Mobile Distributor Portal Components
import MobileDashboardLayout from './components/mobile/MobileDashboardLayout';
import MobileLoginPage from './components/mobile/MobileLoginPage';
import MobileWhatsNew from './components/mobile/MobileWhatsNew';
import MobileProductCatalog from './components/mobile/MobileProductCatalog';
import MobileProductDetail from './components/mobile/MobileProductDetail';
import MobileMarketingAssets from './components/mobile/MobileMarketingAssets';
import MobileTechnicalDocs from './components/mobile/MobileTechnicalDocs';
import MobileTrainingCenter from './components/mobile/MobileTrainingCenter';
import MobileMyAccount from './components/mobile/MobileMyAccount';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'distributor';
}

// ✅ Device detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize based on Capacitor or window width
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      // If Capacitor native platform, always mobile
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Capacitor native platform detected - mobile mode');
        setIsMobile(true);
        return;
      }

      // For web browsers, check screen width only
      const isSmallScreen = window.innerWidth < 768;

      console.log('📱 Device type:', isSmallScreen ? 'Mobile' : 'Desktop', {
        width: window.innerWidth,
        isNativePlatform: false
      });

      setIsMobile(isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Diagnostic logger component
function RouteLogger() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('🛣️ Route changed to:', location.pathname);
  }, [location]);
  
  return null;
}

// ✅ Smart Layout Component - chooses desktop or mobile
function DistributorPortalLayout({ children, onLogout }: { children: React.ReactNode; onLogout: () => Promise<void> }) {
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');
  }, [isMobile]);

  if (isMobile) {
    return <MobileDashboardLayout onLogout={onLogout}>{children}</MobileDashboardLayout>;
  }
  
  return <DashboardLayout onLogout={onLogout}>{children}</DashboardLayout>;
}

// ✅ Smart Component Wrapper - renders mobile or desktop version
function SmartComponent({ 
  desktopComponent: Desktop, 
  mobileComponent: Mobile 
}: { 
  desktopComponent: React.ComponentType; 
  mobileComponent: React.ComponentType;
}) {
  const isMobile = useIsMobile();
  return isMobile ? <Mobile /> : <Desktop />;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle deep link OAuth callbacks on mobile
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const handleDeepLink = (data: any) => {
        console.log('🔗 Deep link opened:', data.url);
        
        if (data.url.includes('auth/callback')) {
          console.log('✅ OAuth callback detected');
          
          // Extract hash from deep link
          const hashIndex = data.url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = data.url.substring(hashIndex);
            window.location.hash = hash;
            console.log('🔑 Hash set:', hash);
          }
          
          // Navigate to callback route
          window.location.href = '/auth/callback' + window.location.hash;
        }
      };

      CapacitorApp.addListener('appUrlOpen', handleDeepLink);
      return () => CapacitorApp.removeAllListeners();
    }
  }, []);

  useEffect(() => {
    console.log('🚀 App mounted - checking session...');
    
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Session check:', session ? '✅ Has session' : '❌ No session');
      
      if (session) {
        // Try admin_users first (for admin portal users)
        supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data: adminUser, error: adminError }) => {
            let userRole = 'distributor';
            
            if (adminUser && !adminError) {
              userRole = 'admin';
              console.log('👤 User role: admin (from admin_users)');
            } else {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              userRole = profile?.role || 'distributor';
              console.log('👤 User role:', userRole, '(from user_profiles)');
            }
            
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: userRole,
            });
            setLoading(false);
            
            // Load user's language preference (non-blocking)
            try {
              const { default: i18n } = await import('./i18n');
              const { data: regionalSettings } = await supabase
                .from('regional_settings')
                .select('preferred_language')
                .eq('user_id', session.user.id)
                .single();
              
              if (regionalSettings?.preferred_language) {
                await i18n.changeLanguage(regionalSettings.preferred_language);
                console.log('🌐 Language set to:', regionalSettings.preferred_language);
              }
            } catch (error) {
              console.log('ℹ️ i18n not loaded (optional)');
            }
          })
          .catch((error) => {
            console.log('⚠️ admin_users check failed, using user_profiles');
            supabase
              .from('user_profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
              .then(async ({ data: profile }) => {
                const userRole = profile?.role || 'distributor';
                console.log('👤 User role:', userRole);
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  role: userRole,
                });
                setLoading(false);
              })
              .catch(() => {
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  role: 'distributor',
                });
                setLoading(false);
              });
          });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (but ignore silent token refreshes to prevent auto-reload)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);

      // Only react to significant auth events, not silent token refreshes
      // This prevents auto-refresh when switching browser tabs
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') {
        console.log('⏭️  Ignoring auth event:', event, '(no UI refresh)');
        return;
      }

      if (session) {
        supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data: adminUser, error: adminError }) => {
            let userRole = 'distributor';
            
            if (adminUser && !adminError) {
              userRole = 'admin';
            } else {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              userRole = profile?.role || 'distributor';
            }
            
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: userRole,
            });
            
            try {
              const { default: i18n } = await import('./i18n');
              const { data: regionalSettings } = await supabase
                .from('regional_settings')
                .select('preferred_language')
                .eq('user_id', session.user.id)
                .single();
              
              if (regionalSettings?.preferred_language) {
                await i18n.changeLanguage(regionalSettings.preferred_language);
              }
            } catch (error) {
              // i18n is optional
            }
          })
          .catch(() => {
            supabase
              .from('user_profiles')
              .select('role')
              .eq('id', session.user.id)
              .single()
              .then(async ({ data: profile }) => {
                const userRole = profile?.role || 'distributor';
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  role: userRole,
                });
              })
              .catch(() => {
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  role: 'distributor',
                });
              });
          });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    console.log('✅ Login successful, refreshing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('admin_users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(async ({ data: adminUser, error: adminError }) => {
            let userRole = 'distributor';
            
            if (adminUser && !adminError) {
              userRole = 'admin';
            } else {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              userRole = profile?.role || 'distributor';
            }
            
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: userRole,
            });
          });
      }
    });
  };

  const ProtectedRoute = ({ 
    element, 
    requireRole,
    routeName
  }: { 
    element: JSX.Element; 
    requireRole?: 'admin' | 'distributor';
    routeName: string;
  }) => {
    useEffect(() => {
      console.log(`🔐 Protected route: ${routeName}`);
      console.log(`   User: ${user ? `${user.email} (${user.role})` : 'none'}`);
      console.log(`   Required: ${requireRole || 'any'}`);
    }, [routeName]);
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
        </div>
      );
    }

    if (!user) {
      console.log(`⛔ ${routeName}: Not authenticated, redirecting to login`);
      return <Navigate to="/login" replace />;
    }

    if (requireRole && user.role !== requireRole) {
      console.log(`⛔ ${routeName}: Wrong role (${user.role} != ${requireRole})`);
      return <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />;
    }

    console.log(`✅ ${routeName}: Access granted`);
    return element;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <BrowserRouter>
      <RouteLogger />
      <Routes>
        {/* Auth Callback Routes */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/admin-callback" element={<AuthCallback />} />

        {/* Public Routes */}
        <Route
          path="/login"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
              </div>
            ) : user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
              </div>
            ) : user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />
            ) : (
              <AdminLoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
              </div>
            ) : user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />
            ) : (
              <ForgotPassword />
            )
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Admin Routes - UNCHANGED */}
        <Route 
          path="/admin" 
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
              </div>
            ) : user?.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route path="/admin/dashboard" element={<ProtectedRoute routeName="admin-dashboard" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><AdminDashboard /></AdminLayout>} />} />
        <Route path="/admin/documentation" element={<ProtectedRoute routeName="admin-docs" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><DocumentationManagement /></AdminLayout>} />} />
        <Route path="/admin/training" element={<ProtectedRoute routeName="admin-training" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><TrainingManagement /></AdminLayout>} />} />
        <Route path="/admin/marketing" element={<ProtectedRoute routeName="admin-marketing" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><MarketingManagement /></AdminLayout>} />} />
        <Route path="/admin/announcements" element={<ProtectedRoute routeName="admin-announcements" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><AnnouncementsManagement /></AdminLayout>} />} />
        <Route path="/admin/distributors" element={<ProtectedRoute routeName="admin-distributors" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><DistributorsManagement /></AdminLayout>} />} />
        <Route path="/admin/products" element={<ProtectedRoute routeName="admin-products" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><ProductsManagement /></AdminLayout>} />} />
        <Route path="/admin/products/edit/:id" element={<ProtectedRoute routeName="admin-edit-product" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><EditProduct /></AdminLayout>} />} />
        <Route path="/admin/settings" element={<ProtectedRoute routeName="admin-settings" requireRole="admin" element={<AdminLayout onLogout={handleLogout}><AdminSettings /></AdminLayout>} />} />

        {/* ✅ Distributor Portal Routes - SMART (Desktop OR Mobile) */}
        <Route 
          path="/portal/products/:id" 
          element={
            <ProtectedRoute 
              routeName="product-detail"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={ProductDetail}
                    mobileComponent={MobileProductDetail}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route 
          path="/portal/products" 
          element={
            <ProtectedRoute 
              routeName="products"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={ProductCatalog}
                    mobileComponent={MobileProductCatalog}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route 
          path="/portal/marketing" 
          element={
            <ProtectedRoute 
              routeName="marketing"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={MarketingAssets}
                    mobileComponent={MobileMarketingAssets}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route 
          path="/portal/docs" 
          element={
            <ProtectedRoute 
              routeName="docs"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={TechnicalDocs}
                    mobileComponent={MobileTechnicalDocs}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route 
          path="/portal/training" 
          element={
            <ProtectedRoute 
              routeName="training"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={TrainingCenter}
                    mobileComponent={MobileTrainingCenter}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route 
          path="/portal/account" 
          element={
            <ProtectedRoute 
              routeName="account"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={MyAccount}
                    mobileComponent={MobileMyAccount}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route 
          path="/portal" 
          element={
            <ProtectedRoute 
              routeName="whats-new"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={WhatsNew}
                    mobileComponent={MobileWhatsNew}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />

        {/* ✅ MOBILE ROUTE ALIASES - Redirect /mobile/* to /portal/* */}
        {/* This allows mobile navigation to use /mobile/* URLs while keeping smart routing */}
        <Route path="/mobile/dashboard" element={<Navigate to="/portal" replace />} />
        <Route path="/mobile/products" element={<Navigate to="/portal/products" replace />} />
        <Route 
          path="/mobile/products/:id" 
          element={
            <ProtectedRoute 
              routeName="mobile-product-detail"
              requireRole="distributor"
              element={
                <DistributorPortalLayout onLogout={handleLogout}>
                  <SmartComponent 
                    desktopComponent={ProductDetail}
                    mobileComponent={MobileProductDetail}
                  />
                </DistributorPortalLayout>
              }
            />
          } 
        />
        <Route path="/mobile/marketing-assets" element={<Navigate to="/portal/marketing" replace />} />
        <Route path="/mobile/documentation" element={<Navigate to="/portal/docs" replace />} />
        <Route path="/mobile/training" element={<Navigate to="/portal/training" replace />} />
        <Route path="/mobile/account" element={<Navigate to="/portal/account" replace />} />
        <Route path="/mobile/login" element={<Navigate to="/login" replace />} />


        {/* Shortcut Routes */}
        <Route 
          path="/products/:id" 
          element={
            <ProtectedRoute 
              routeName="shortcut-product"
              requireRole="distributor"
              element={<Navigate to={`/portal/products/${window.location.pathname.split('/').pop()}`} replace />}
            />
          } 
        />
        <Route 
          path="/products" 
          element={
            <ProtectedRoute 
              routeName="shortcut-products"
              requireRole="distributor"
              element={<Navigate to="/portal/products" replace />}
            />
          } 
        />

        {/* Default Redirect */}
        <Route
          path="/"
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
              </div>
            ) : (
              <Navigate
                to={user ? (user.role === 'admin' ? '/admin' : '/portal') : '/login'}
                replace
              />
            )
          }
        />

        {/* 404 Route */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">404 - Page Not Found</h1>
              <p className="text-slate-600 mb-4">Path: {window.location.pathname}</p>
              <Navigate to="/" replace />
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

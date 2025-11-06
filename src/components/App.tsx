import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Auth Components
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/admin/AdminLoginPage';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

// Admin Pages - EXACT file names from your admin folder
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import DocumentationManagement from './components/admin/DocumentationManagement';
import TrainingManagement from './components/admin/TrainingManagement';
import MarketingManagement from './components/admin/MarketingManagement';
import AnnouncementsManagement from './components/admin/AnnouncementsManagement';
import DistributorsManagement from './components/admin/DistributorsManagement';
import ProductsManagement from './components/admin/ProductsManagement';
import EditProduct from './components/admin/EditProduct';

// Distributor Portal Pages
import DashboardLayout from './components/DashboardLayout';
import WhatsNew from './components/WhatsNew';
import ProductCatalog from './components/ProductCatalog';
import ProductDetail from './components/ProductDetail';
import MarketingAssets from './components/MarketingAssets';
import TechnicalDocs from './components/TechnicalDocs';
import TrainingCenter from './components/TrainingCenter';
import MyAccount from './components/MyAccount';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'distributor';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Get user role from user_profiles table
        supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: profile?.role || 'distributor',
            });
          });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: profile?.role || 'distributor',
            });
          });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    // This will be called by LoginPage after successful login
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a8b5]"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} />
            ) : (
              <AdminLoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/forgot-password"
          element={
            user ? (
              <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} />
            ) : (
              <ForgotPassword />
            )
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Routes - Using children pattern like yesterday */}
        <Route 
          path="/admin" 
          element={
            user?.role === 'admin' ? 
            <Navigate to="/admin/dashboard" replace /> : 
            <Navigate to="/login" />
          } 
        />
        <Route path="/admin/dashboard" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><AdminDashboard /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/documentation" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><DocumentationManagement /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/training" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><TrainingManagement /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/marketing" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><MarketingManagement /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/announcements" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><AnnouncementsManagement /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/distributors" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><DistributorsManagement /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/products" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><ProductsManagement /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/products/edit/:id" element={user?.role === 'admin' ? <AdminLayout onLogout={async () => { await supabase.auth.signOut(); }}><EditProduct /></AdminLayout> : <Navigate to="/login" />} />

        {/* Distributor Portal Routes - Using children pattern */}
        <Route 
          path="/portal" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><WhatsNew /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/portal/products" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><ProductCatalog /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/portal/products/:id" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><ProductDetail /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/portal/marketing" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><MarketingAssets /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/portal/docs" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><TechnicalDocs /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/portal/training" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><TrainingCenter /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/portal/account" 
          element={
            user?.role === 'distributor' ? 
            <DashboardLayout onLogout={async () => { await supabase.auth.signOut(); }}><MyAccount /></DashboardLayout> : 
            <Navigate to="/login" />
          } 
        />

        {/* Shortcut Routes - Redirect /products to /portal/products */}
        <Route 
          path="/products" 
          element={
            user?.role === 'distributor' ? 
            <Navigate to="/portal/products" replace /> : 
            <Navigate to="/login" />
          } 
        />
        <Route 
          path="/products/:id" 
          element={
            user?.role === 'distributor' ? 
            <Navigate to={`/portal/products/${window.location.pathname.split('/').pop()}`} replace /> : 
            <Navigate to="/login" />
          } 
        />

        {/* Default Redirect */}
        <Route
          path="/"
          element={
            <Navigate
              to={user ? (user.role === 'admin' ? '/admin' : '/portal') : '/login'}
            />
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

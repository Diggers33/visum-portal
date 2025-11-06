import React, { useState, useTransition, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Bell,
  Shield,
  Languages,
  Save,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function MyAccount() {
  const { t } = useTranslation('account');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Change Password Dialog State
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  
  // Profile data from user_profiles table
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    full_name: '',
    email: '',
    phone_number: '',
    website: '',
    business_address: '',
    country: ''
  });
  
  const [notifications, setNotifications] = useState({
    productUpdates: true,
    newsAnnouncements: true,
    trainingReminders: true,
    marketingMaterials: false,
  });
  
  const [emailFrequency, setEmailFrequency] = useState('instant');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('cet');

  // Set document title
  useEffect(() => {
    document.title = 'My Account - Visum Portal';
    loadAccountData();
    return () => {
      document.title = 'Visum Portal';
    };
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Load profile from user_profiles table by EMAIL (not auth.uid)
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (!profileData) {
        toast.error('No profile found. Please contact support.');
        return;
      }
      
      setProfile(profileData);
      setFormData({
        company_name: profileData.company_name || '',
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        phone_number: profileData.phone_number || '',
        website: profileData.website || '',
        business_address: profileData.business_address || '',
        country: profileData.country || ''
      });

      // Load notifications using profile.id
      const { data: notifData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profileData.id)
        .maybeSingle();
      
      if (notifData) {
        setNotifications({
          productUpdates: notifData.product_updates,
          newsAnnouncements: notifData.news_announcements,
          trainingReminders: notifData.training_reminders,
          marketingMaterials: notifData.marketing_materials,
        });
        setEmailFrequency(notifData.email_frequency || 'instant');
      }

      // Load regional settings using profile.id
      const { data: settingsData } = await supabase
        .from('regional_settings')
        .select('*')
        .eq('user_id', profileData.id)
        .maybeSingle();
      
      if (settingsData) {
        setLanguage(settingsData.preferred_language);
        setTimezone(settingsData.timezone);
      }
    } catch (error) {
      console.error('Error loading account:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaved(true);
    startTransition(async () => {
      try {
        if (!profile?.id) throw new Error('No profile loaded');

        // Update user_profiles using profile.id
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', profile.id);
        
        if (profileError) throw profileError;

        // Update regional settings using profile.id
        const { error: settingsError } = await supabase
          .from('regional_settings')
          .upsert({ 
            user_id: profile.id, 
            preferred_language: language, 
            timezone,
            updated_at: new Date().toISOString()
          });
        
        if (settingsError) throw settingsError;

        toast.success('Settings saved successfully', {
          description: 'Your account settings have been updated.',
        });
        
        setTimeout(() => setSaved(false), 2000);
      } catch (error) {
        console.error('Error saving:', error);
        toast.error('Failed to save settings');
        setSaved(false);
      }
    });
  };

  const handleNotificationToggle = async (key: keyof typeof notifications, checked: boolean) => {
    // Optimistic update
    setNotifications(prev => ({ ...prev, [key]: checked }));
    
    startTransition(async () => {
      try {
        if (!profile?.id) {
          throw new Error('No profile loaded');
        }

        console.log('🔔 Toggling notification:', { key, checked, userId: profile.id });

        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        
        // First, check if record exists
        const { data: existing, error: fetchError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (fetchError) {
          console.error('❌ Error fetching preferences:', fetchError);
          throw fetchError;
        }

        console.log('📋 Existing preferences:', existing);

        let result;
        if (existing) {
          // Update existing record
          console.log('🔄 Updating existing record...');
          result = await supabase
            .from('notification_preferences')
            .update({ 
              [dbKey]: checked,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', profile.id);
        } else {
          // Insert new record with all values
          console.log('➕ Creating new record...');
          result = await supabase
            .from('notification_preferences')
            .insert({ 
              user_id: profile.id,
              product_updates: key === 'productUpdates' ? checked : true,
              news_announcements: key === 'newsAnnouncements' ? checked : true,
              training_reminders: key === 'trainingReminders' ? checked : true,
              marketing_materials: key === 'marketingMaterials' ? checked : false,
              email_frequency: emailFrequency || 'instant'
            });
        }
        
        if (result.error) {
          console.error('❌ Error saving:', result.error);
          throw result.error;
        }
        
        console.log('✅ Notification preference saved successfully');
        
        toast.success('Preference updated', {
          description: `${key.replace(/([A-Z])/g, ' $1').trim()} ${checked ? 'enabled' : 'disabled'}.`,
        });
      } catch (error: any) {
        console.error('❌ Error updating notification:', error);
        toast.error('Failed to update preference', {
          description: error.message || 'Please try again'
        });
        // Revert on error
        setNotifications(prev => ({ ...prev, [key]: !checked }));
      }
    });
  };

  const handleEmailFrequencyChange = async (value: string) => {
    const oldValue = emailFrequency;
    setEmailFrequency(value);
    
    startTransition(async () => {
      try {
        if (!profile?.id) throw new Error('No profile loaded');

        const { error } = await supabase
          .from('notification_preferences')
          .upsert({ 
            user_id: profile.id,
            email_frequency: value,
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        toast.success('Email frequency updated', {
          description: `You will now receive ${value} email notifications.`,
        });
      } catch (error) {
        console.error('Error updating email frequency:', error);
        toast.error('Failed to update email frequency');
        setEmailFrequency(oldValue);
      }
    });
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setPasswordChanging(true);
    
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('Password changed successfully', {
        description: 'Your password has been updated.',
      });

      // Reset form and close dialog
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordDialog(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setPasswordChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-slate-600 mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Your company details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input 
                    id="country" 
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Enter country"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input 
                  id="address" 
                  value={formData.business_address}
                  onChange={(e) => setFormData({...formData, business_address: e.target.value})}
                  placeholder="Enter business address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input 
                    id="website" 
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    placeholder="www.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Person
              </CardTitle>
              <CardDescription>Primary contact for this account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what updates you want to receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Frequency Selector */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Label htmlFor="emailFrequency" className="text-sm font-medium mb-2 block">
                  Email Notification Frequency
                </Label>
                <Select value={emailFrequency} onValueChange={handleEmailFrequencyChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant - Get notified immediately</SelectItem>
                    <SelectItem value="daily">Daily Digest - Once per day summary</SelectItem>
                    <SelectItem value="weekly">Weekly Digest - Once per week summary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  Choose how often you want to receive email notifications
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="productUpdates">Product Updates</Label>
                  <p className="text-sm text-slate-500">New product launches and updates</p>
                </div>
                <Switch
                  id="productUpdates"
                  checked={notifications.productUpdates}
                  onCheckedChange={(checked) => handleNotificationToggle('productUpdates', checked)}
                  disabled={isPending}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newsAnnouncements">News & Announcements</Label>
                  <p className="text-sm text-slate-500">Company news and industry insights</p>
                </div>
                <Switch
                  id="newsAnnouncements"
                  checked={notifications.newsAnnouncements}
                  onCheckedChange={(checked) => handleNotificationToggle('newsAnnouncements', checked)}
                  disabled={isPending}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="trainingReminders">Training Reminders</Label>
                  <p className="text-sm text-slate-500">Upcoming training sessions and deadlines</p>
                </div>
                <Switch
                  id="trainingReminders"
                  checked={notifications.trainingReminders}
                  onCheckedChange={(checked) => handleNotificationToggle('trainingReminders', checked)}
                  disabled={isPending}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketingMaterials">Marketing Materials</Label>
                  <p className="text-sm text-slate-500">New marketing assets and campaigns</p>
                </div>
                <Switch
                  id="marketingMaterials"
                  checked={notifications.marketingMaterials}
                  onCheckedChange={(checked) => handleNotificationToggle('marketingMaterials', checked)}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Language & Regional Settings */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Language & Regional Settings
              </CardTitle>
              <CardDescription>Customize your portal experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Preferred Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch (German)</SelectItem>
                      <SelectItem value="fr">Français (French)</SelectItem>
                      <SelectItem value="es">Español (Spanish)</SelectItem>
                      <SelectItem value="it">Italiano (Italian)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Time Zone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cet">Central European Time (CET)</SelectItem>
                      <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                      <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                      <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                      <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                      <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSave} 
              className="bg-blue-900 hover:bg-blue-800"
              disabled={isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              variant="outline" 
              disabled={isPending}
              onClick={loadAccountData}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account status */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  {profile?.status === 'active' ? 'Active' : profile?.status || 'Active'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Partnership Level</span>
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                  {profile?.account_type || 'Gold'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Member Since</span>
                <span className="text-sm text-slate-900">
                  {profile?.member_since 
                    ? new Date(profile.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : 'N/A'}
                </span>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Account Manager</p>
                <p className="text-sm text-slate-900">{profile?.account_manager_name || 'N/A'}</p>
                <p className="text-xs text-slate-500">{profile?.account_manager_email || ''}</p>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Support Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-slate-600 mb-1">Email Support</p>
                <a href="mailto:support@iris-tech.eu" className="text-sm text-blue-700 hover:text-blue-800">
                  support@iris-tech.eu
                </a>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Phone Support</p>
                <a href="tel:+498912345678" className="text-sm text-blue-700 hover:text-blue-800">
                  +49 89 1234 5678
                </a>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Support Hours</p>
                <p className="text-sm text-slate-900">Mon-Fri: 8:00 - 18:00 CET</p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Enter your new password below. Password must be at least 8 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
            {passwordForm.newPassword && passwordForm.confirmPassword && 
             passwordForm.newPassword !== passwordForm.confirmPassword && (
              <Alert variant="destructive">
                <AlertDescription>Passwords do not match</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              disabled={passwordChanging}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange}
              disabled={passwordChanging || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="bg-blue-900 hover:bg-blue-800"
            >
              {passwordChanging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useTransition, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Eye, EyeOff, User, Lock, Upload, X, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { supabase } from '../../lib/supabase';

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'super-admin' | 'admin' | 'content-manager' | 'viewer';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
  avatarUrl?: string;
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'admin-users'>('profile');
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Admin Users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'admin' as AdminUser['role'],
    password: '',
    confirmPassword: '',
  });

  const [editUserData, setEditUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'admin' as AdminUser['role'],
    status: 'active' as AdminUser['status'],
  });

  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});

  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    initials: '',
    photoUrl: '',
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  // Security state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Load current user profile and admin users on mount
  useEffect(() => {
    loadCurrentUserProfile();
    loadAdminUsers();
  }, []);

  const loadCurrentUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      setCurrentUserId(user.id);

      // Load from admin_users table
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      if (adminUser) {
        const nameParts = adminUser.full_name.split(' ');
        const initials = nameParts.map(n => n[0]).join('').toUpperCase();

        setProfileData({
          fullName: adminUser.full_name,
          email: adminUser.email,
          phone: adminUser.phone || '',
          initials,
          photoUrl: adminUser.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: AdminUser[] = (data || []).map(user => ({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        createdAt: new Date(user.created_at).toISOString().split('T')[0],
        lastLogin: 'N/A',
        avatarUrl: user.avatar_url || undefined,
      }));

      setAdminUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading admin users:', error);
      toast.error('Failed to load admin users');
    }
  };

  // Profile handlers
  const handleProfileFieldChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    setHasProfileChanges(true);
    if (profileErrors[field]) {
      setProfileErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!profileData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('admin_users')
          .update({
            full_name: profileData.fullName,
            email: profileData.email,
            phone: profileData.phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUserId);

        if (error) throw error;

        toast.success('Profile updated successfully');
        setHasProfileChanges(false);
        
        // Reload to get fresh data
        loadCurrentUserProfile();
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      }
    });
  };

  const handleCancelProfile = () => {
    loadCurrentUserProfile();
    setProfileErrors({});
    setHasProfileChanges(false);
  };

  const handleChangePhoto = async () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB');
        return;
      }

      startTransition(async () => {
        try {
          // Upload to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
          const filePath = `avatars/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('admin-assets')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('admin-assets')
            .getPublicUrl(filePath);

          // Update admin_users table
          const { error: updateError } = await supabase
            .from('admin_users')
            .update({ avatar_url: publicUrl })
            .eq('id', currentUserId);

          if (updateError) throw updateError;

          setProfileData(prev => ({ ...prev, photoUrl: publicUrl }));
          toast.success('Photo uploaded successfully');
          setHasProfileChanges(true);
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error('Failed to upload photo');
        }
      });
    };

    input.click();
  };

  const handleRemovePhoto = async () => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ avatar_url: null })
        .eq('id', currentUserId);

      if (error) throw error;

      setProfileData((prev) => ({ ...prev, photoUrl: '' }));
      setHasProfileChanges(true);
      toast.success('Photo removed');
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo');
    }
  };

  // Password handlers
  const handlePasswordFieldChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (!password) return { strength: '', color: '', width: '0%' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 4) return { strength: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { strength: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    startTransition(async () => {
      try {
        // Verify current password by attempting to sign in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          toast.error('User not found');
          return;
        }

        // Use Supabase's updateUser method to change password
        const { error } = await supabase.auth.updateUser({
          password: passwordData.newPassword
        });

        if (error) throw error;

        toast.success('Password updated successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordErrors({});
      } catch (error) {
        console.error('Error updating password:', error);
        toast.error('Failed to update password. Please check your current password.');
      }
    });
  };

  const handleCancelPassword = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({});
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  // Admin Users handlers
  const getRoleBadge = (role: AdminUser['role']) => {
    const roleConfig = {
      'super-admin': { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      'admin': { label: 'Admin', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      'content-manager': { label: 'Content Manager', color: 'bg-green-100 text-green-700 border-green-200' },
      'viewer': { label: 'Viewer', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    };
    return roleConfig[role];
  };

  const getRoleDescription = (role: AdminUser['role']) => {
    const descriptions = {
      'super-admin': 'Full system access including user management',
      'admin': 'Manage distributors, products, and content',
      'content-manager': 'Manage products, documentation, and marketing',
      'viewer': 'Read-only access to all sections',
    };
    return descriptions[role];
  };

  const handleAddUserClick = () => {
    setNewUserData({
      fullName: '',
      email: '',
      phone: '',
      role: 'admin',
      password: '',
      confirmPassword: '',
    });
    setUserFormErrors({});
    setShowAddUserDialog(true);
  };

  const handleEditUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    setEditUserData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    setUserFormErrors({});
    setShowEditUserDialog(true);
  };

  const handleDeleteUserClick = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const validateNewUser = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newUserData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!newUserData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserData.email)) {
      errors.email = 'Invalid email address';
    } else if (adminUsers.some(u => u.email === newUserData.email)) {
      errors.email = 'Email already exists';
    }

    if (!newUserData.password) {
      errors.password = 'Password is required';
    } else if (newUserData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!newUserData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password';
    } else if (newUserData.password !== newUserData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditUser = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editUserData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!editUserData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserData.email)) {
      errors.email = 'Invalid email address';
    } else if (selectedUser && adminUsers.some(u => u.email === editUserData.email && u.id !== selectedUser.id)) {
      errors.email = 'Email already exists';
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateNewUser()) return;

    startTransition(async () => {
      try {
        // Get current session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Not authenticated');
          return;
        }

        // Call Edge Function to create user (requires service role)
        const { data, error } = await supabase.functions.invoke('create-admin-user', {
          body: {
            email: newUserData.email,
            password: newUserData.password,
            fullName: newUserData.fullName,
            phone: newUserData.phone || null,
            role: newUserData.role,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success(`Admin user "${newUserData.fullName}" created successfully`);
        setShowAddUserDialog(false);
        loadAdminUsers();
      } catch (error) {
        console.error('Error creating user:', error);
        toast.error(error.message || 'Failed to create admin user');
      }
    });
  };

  const handleUpdateUser = async () => {
    if (!validateEditUser() || !selectedUser) return;

    startTransition(async () => {
      try {
        const { error } = await supabase
          .from('admin_users')
          .update({
            full_name: editUserData.fullName,
            email: editUserData.email,
            phone: editUserData.phone || null,
            role: editUserData.role,
            status: editUserData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedUser.id);

        if (error) throw error;

        toast.success('Admin user updated successfully');
        setShowEditUserDialog(false);
        loadAdminUsers();
      } catch (error) {
        console.error('Error updating user:', error);
        toast.error('Failed to update admin user');
      }
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    startTransition(async () => {
      try {
        // Delete from admin_users table
        const { error } = await supabase
          .from('admin_users')
          .delete()
          .eq('id', selectedUser.id);

        if (error) throw error;

        // Optionally delete auth user (requires admin privileges)
        // await supabase.auth.admin.deleteUser(selectedUser.id);

        toast.success(`Admin user "${selectedUser.fullName}" deleted`);
        setShowDeleteDialog(false);
        loadAdminUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete admin user');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Settings</h1>
        <p className="text-[16px] text-[#6b7280]">Manage your account</p>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <div className="w-64 shrink-0">
          <Card className="border-slate-200 overflow-hidden">
            <CardContent className="p-0">
              <nav className="flex flex-col">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-[#00a8b5] text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="text-[15px] font-medium">Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                    activeTab === 'security'
                      ? 'bg-[#00a8b5] text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Lock className="h-5 w-5" />
                  <span className="text-[15px] font-medium">Security</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-users')}
                  className={`flex items-center gap-3 px-4 py-4 text-left transition-colors ${
                    activeTab === 'admin-users'
                      ? 'bg-[#00a8b5] text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-[15px] font-medium">Admin Users</span>
                </button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="border-slate-200">
            <CardContent className="p-8">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[20px] font-semibold text-slate-900 mb-1">Profile Information</h2>
                    <p className="text-[14px] text-[#6b7280]">Update your account profile information</p>
                  </div>

                  {/* Profile Photo */}
                  <div className="space-y-3">
                    <Label className="text-[14px] font-medium">Profile Photo</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        {profileData.photoUrl ? (
                          <AvatarImage src={profileData.photoUrl} alt={profileData.fullName} />
                        ) : (
                          <AvatarFallback className="bg-[#00a8b5] text-white text-[24px]">
                            {profileData.initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleChangePhoto}
                          disabled={isPending}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Change Photo
                        </Button>
                        {profileData.photoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemovePhoto}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[14px]">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      onChange={(e) => handleProfileFieldChange('fullName', e.target.value)}
                      className={profileErrors.fullName ? 'border-red-500' : ''}
                    />
                    {profileErrors.fullName && (
                      <p className="text-[13px] text-red-500">{profileErrors.fullName}</p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[14px]">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                      className={profileErrors.email ? 'border-red-500' : ''}
                    />
                    {profileErrors.email ? (
                      <p className="text-[13px] text-red-500">{profileErrors.email}</p>
                    ) : (
                      <p className="text-[13px] text-[#6b7280]">This is your login email</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[14px]">
                      Phone Number <span className="text-[#6b7280]">(optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelProfile}
                      disabled={!hasProfileChanges || isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
                      onClick={handleSaveProfile}
                      disabled={!hasProfileChanges || isPending}
                    >
                      {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[20px] font-semibold text-slate-900 mb-1">Change Password</h2>
                    <p className="text-[14px] text-[#6b7280]">Update your password to keep your account secure</p>
                  </div>

                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-[14px]">
                      Current Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)}
                        className={`pr-10 ${passwordErrors.currentPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="text-[13px] text-red-500">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[14px]">
                      New Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
                        className={`pr-10 ${passwordErrors.newPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword ? (
                      <p className="text-[13px] text-red-500">{passwordErrors.newPassword}</p>
                    ) : (
                      <p className="text-[13px] text-[#6b7280]">Must be at least 8 characters</p>
                    )}

                    {/* Password Strength Indicator */}
                    {passwordData.newPassword && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-[#6b7280]">Password strength:</span>
                          <span
                            className={`font-medium ${
                              passwordStrength.strength === 'Weak'
                                ? 'text-red-500'
                                : passwordStrength.strength === 'Medium'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {passwordStrength.strength}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: passwordStrength.width }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[14px]">
                      Confirm New Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
                        className={`pr-10 ${passwordErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-[13px] text-red-500">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelPassword}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
                      onClick={handleUpdatePassword}
                      disabled={isPending}
                    >
                      {isPending ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin Users Tab */}
              {activeTab === 'admin-users' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[20px] font-semibold text-slate-900 mb-1">Admin Users</h2>
                      <p className="text-[14px] text-[#6b7280]">Manage admin accounts and permissions</p>
                    </div>
                    <Button
                      onClick={handleAddUserClick}
                      className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Admin User
                    </Button>
                  </div>

                  {/* Admin Users Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminUsers.map((user) => {
                          const roleBadge = getRoleBadge(user.role);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    {user.avatarUrl ? (
                                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                                    ) : (
                                      <AvatarFallback className="bg-[#00a8b5] text-white text-sm">
                                        {user.fullName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <div className="font-medium text-slate-900">{user.fullName}</div>
                                    <div className="text-xs text-slate-500">{user.phone}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-700">{user.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`${roleBadge.color}`}>
                                  {roleBadge.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    user.status === 'active'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }
                                >
                                  {user.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">{user.lastLogin}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUserClick(user)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUserClick(user)}
                                    disabled={user.role === 'super-admin' && adminUsers.filter(u => u.role === 'super-admin').length === 1}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Role Descriptions */}
                  <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-medium text-slate-900 mb-3">Role Permissions</h3>
                      <div className="space-y-2">
                        {(['super-admin', 'admin', 'content-manager', 'viewer'] as const).map((role) => {
                          const roleBadge = getRoleBadge(role);
                          return (
                            <div key={role} className="flex items-start gap-3">
                              <Badge variant="outline" className={`${roleBadge.color} mt-0.5`}>
                                {roleBadge.label}
                              </Badge>
                              <p className="text-sm text-slate-600 flex-1">{getRoleDescription(role)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>
              Create a new admin user account with specific role permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newFullName"
                value={newUserData.fullName}
                onChange={(e) => {
                  setNewUserData({ ...newUserData, fullName: e.target.value });
                  if (userFormErrors.fullName) {
                    setUserFormErrors({ ...userFormErrors, fullName: '' });
                  }
                }}
                className={userFormErrors.fullName ? 'border-red-500' : ''}
              />
              {userFormErrors.fullName && (
                <p className="text-sm text-red-500">{userFormErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newEmail">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={newUserData.email}
                onChange={(e) => {
                  setNewUserData({ ...newUserData, email: e.target.value });
                  if (userFormErrors.email) {
                    setUserFormErrors({ ...userFormErrors, email: '' });
                  }
                }}
                className={userFormErrors.email ? 'border-red-500' : ''}
              />
              {userFormErrors.email && (
                <p className="text-sm text-red-500">{userFormErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPhone">Phone Number</Label>
              <Input
                id="newPhone"
                type="tel"
                value={newUserData.phone}
                onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newRole">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={newUserData.role}
                onValueChange={(value: AdminUser['role']) => setNewUserData({ ...newUserData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super-admin">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">Super Admin</span>
                      <span className="text-xs text-slate-500">Full system access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-slate-500">Manage distributors and content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="content-manager">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">Content Manager</span>
                      <span className="text-xs text-slate-500">Manage products and marketing</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">Viewer</span>
                      <span className="text-xs text-slate-500">Read-only access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newUserData.password}
                onChange={(e) => {
                  setNewUserData({ ...newUserData, password: e.target.value });
                  if (userFormErrors.password) {
                    setUserFormErrors({ ...userFormErrors, password: '' });
                  }
                }}
                className={userFormErrors.password ? 'border-red-500' : ''}
              />
              {userFormErrors.password && (
                <p className="text-sm text-red-500">{userFormErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newConfirmPassword">
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="newConfirmPassword"
                type="password"
                value={newUserData.confirmPassword}
                onChange={(e) => {
                  setNewUserData({ ...newUserData, confirmPassword: e.target.value });
                  if (userFormErrors.confirmPassword) {
                    setUserFormErrors({ ...userFormErrors, confirmPassword: '' });
                  }
                }}
                className={userFormErrors.confirmPassword ? 'border-red-500' : ''}
              />
              {userFormErrors.confirmPassword && (
                <p className="text-sm text-red-500">{userFormErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddUserDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={isPending}
              className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
            >
              {isPending ? 'Creating...' : 'Create Admin User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editFullName"
                value={editUserData.fullName}
                onChange={(e) => {
                  setEditUserData({ ...editUserData, fullName: e.target.value });
                  if (userFormErrors.fullName) {
                    setUserFormErrors({ ...userFormErrors, fullName: '' });
                  }
                }}
                className={userFormErrors.fullName ? 'border-red-500' : ''}
              />
              {userFormErrors.fullName && (
                <p className="text-sm text-red-500">{userFormErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editEmail"
                type="email"
                value={editUserData.email}
                onChange={(e) => {
                  setEditUserData({ ...editUserData, email: e.target.value });
                  if (userFormErrors.email) {
                    setUserFormErrors({ ...userFormErrors, email: '' });
                  }
                }}
                className={userFormErrors.email ? 'border-red-500' : ''}
              />
              {userFormErrors.email && (
                <p className="text-sm text-red-500">{userFormErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Phone Number</Label>
              <Input
                id="editPhone"
                type="tel"
                value={editUserData.phone}
                onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRole">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={editUserData.role}
                onValueChange={(value: AdminUser['role']) => setEditUserData({ ...editUserData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="content-manager">Content Manager</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select
                value={editUserData.status}
                onValueChange={(value: AdminUser['status']) => setEditUserData({ ...editUserData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditUserDialog(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={isPending}
              className="bg-[#00a8b5] hover:bg-[#008a95] text-white"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.fullName}</strong>? This action cannot be undone and the user will immediately lose access to the admin portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

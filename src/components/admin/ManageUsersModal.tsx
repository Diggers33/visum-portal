import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { UserPlus, Mail, Edit2, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Distributor,
  DistributorUser,
  getDistributorUsers,
  updateDistributorUser,
  deleteDistributorUser,
  resendInvitation,
} from '@/lib/api/distributors';
import { supabase } from '@/lib/supabase';
import InviteUserForm from './InviteUserForm';

interface ManageUsersModalProps {
  open: boolean;
  onClose: () => void;
  distributor: Distributor | null;
  onDataChange?: () => void; // Optional callback to notify parent of data changes
}

export default function ManageUsersModal({
  open,
  onClose,
  distributor,
  onDataChange,
}: ManageUsersModalProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<DistributorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [editStatus, setEditStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirmation state
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Load users when distributor changes
  useEffect(() => {
    if (distributor && open) {
      loadUsers();
    }
  }, [distributor, open]);

  const loadUsers = async () => {
    if (!distributor) return;

    setLoading(true);
    try {
      const { data, error } = await getDistributorUsers(distributor.id);

      if (error) {
        throw new Error(error.message || 'Failed to load users');
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('❌ Load users error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleEditUser = (user: DistributorUser) => {
    setEditingUserId(user.id);
    setEditRole(user.company_role);
    setEditStatus(user.status);
  };

  const handleSaveEdit = async (userId: string) => {
    setSavingEdit(true);
    try {
      const { data, error } = await updateDistributorUser(userId, {
        company_role: editRole,
        status: editStatus,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update user');
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      setEditingUserId(null);
      await loadUsers();

      // Notify parent component of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error: any) {
      console.error('❌ Update user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleResendInvite = async (userId: string, userEmail: string) => {
    try {
      console.log('📧 Resending invitation to user:', userId);

      const { success, error } = await resendInvitation(userId);

      if (!success || error) {
        throw new Error(error?.message || 'Failed to resend invitation');
      }

      toast({
        title: 'Success',
        description: `Invitation sent to ${userEmail}`,
      });

      await loadUsers();
    } catch (error: any) {
      console.error('❌ Resend invitation error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setDeletingUser(true);
    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      // Call Edge Function to delete user (uses service role to bypass RLS)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-distributor-user`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: deleteUserId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setDeleteUserId(null);
      await loadUsers();

      // Notify parent component of data change
      if (onDataChange) {
        onDataChange();
      }
    } catch (error: any) {
      console.error('❌ Delete user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    loadUsers();

    // Notify parent component of data change
    if (onDataChange) {
      onDataChange();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Users - {distributor?.company_name}
            </DialogTitle>
            <DialogDescription>
              View and manage users for this distributor company
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Actions Bar */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-[#00a8b5] hover:bg-[#008a95]"
                  disabled={loading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              <div className="text-sm text-slate-600">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </div>
            </div>

            {/* Invite User Form */}
            {showInviteForm && distributor && (
              <div className="border rounded-lg p-4 bg-slate-50">
                <InviteUserForm
                  distributorId={distributor.id}
                  distributorName={distributor.company_name}
                  onSuccess={handleInviteSuccess}
                  onCancel={() => setShowInviteForm(false)}
                />
              </div>
            )}

            {/* Users Table */}
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No users found for this company</p>
                <Button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-[#00a8b5] hover:bg-[#008a95]"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First User
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          <Select
                            value={editRole}
                            onValueChange={(value: 'admin' | 'manager' | 'user') =>
                              setEditRole(value)
                            }
                            disabled={savingEdit}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="capitalize">
                            {user.company_role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          <Select
                            value={editStatus}
                            onValueChange={(value: 'active' | 'pending' | 'inactive') =>
                              setEditStatus(value)
                            }
                            disabled={savingEdit}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              user.status === 'active'
                                ? 'default'
                                : user.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {user.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {user.invited_at
                          ? new Date(user.invited_at).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {editingUserId === user.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(user.id)}
                                disabled={savingEdit}
                                className="bg-[#00a8b5] hover:bg-[#008a95]"
                              >
                                {savingEdit ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                title="Edit role and status"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendInvite(user.id, user.email)}
                                title="Resend invitation"
                              >
                                <Mail className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteUserId(user.id)}
                                title="Remove user"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this user from the company? This will delete their account
              and they will no longer have access to the portal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

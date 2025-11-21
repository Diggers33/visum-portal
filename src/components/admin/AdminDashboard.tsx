import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Users,
  FolderOpen,
  Download,
  Megaphone,
  Plus,
  Upload,
  ArrowRight,
  Loader2,
  Building2,
  Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { getDistributorStats, getDistributorUserStats } from '@/lib/api/distributors';

interface DashboardStats {
  // Company stats
  totalCompanies: number;
  activeCompanies: number;
  pendingCompanies: number;
  inactiveCompanies: number;
  exclusiveCompanies: number;
  nonExclusiveCompanies: number;

  // User stats
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;

  // Content stats
  totalDocs: number;
  totalMarketing: number;
  totalTraining: number;
  recentDownloads: number;
  totalAnnouncements: number;
  draftAnnouncements: number;

  // Territory breakdown
  topTerritories: { territory: string; count: number }[];
}

interface Activity {
  id: string;
  action: string;
  time: string;
  type: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    inactiveCompanies: 0,
    exclusiveCompanies: 0,
    nonExclusiveCompanies: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    inactiveUsers: 0,
    totalDocs: 0,
    totalMarketing: 0,
    totalTraining: 0,
    recentDownloads: 0,
    totalAnnouncements: 0,
    draftAnnouncements: 0,
    topTerritories: [],
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch company statistics
      const { data: companyStats, error: companyError } = await getDistributorStats();
      if (companyError) {
        console.error('Error fetching company stats:', companyError);
      }

      // Fetch user statistics
      const { data: userStats, error: userError } = await getDistributorUserStats();
      if (userError) {
        console.error('Error fetching user stats:', userError);
      }

      // Fetch documentation count
      const { count: docsCount, error: docsError } = await supabase
        .from('documentation')
        .select('*', { count: 'exact', head: true });

      if (docsError) throw docsError;

      // Fetch marketing assets count
      const { count: marketingCount, error: marketingError } = await supabase
        .from('marketing_assets')
        .select('*', { count: 'exact', head: true });

      if (marketingError) throw marketingError;

      // Fetch training materials count
      const { count: trainingCount, error: trainingError } = await supabase
        .from('training_materials')
        .select('*', { count: 'exact', head: true });

      if (trainingError) throw trainingError;

      // Fetch announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, status');

      if (announcementsError) throw announcementsError;

      const totalAnnouncements = announcements?.length || 0;
      const draftAnnouncements = announcements?.filter((a) => a.status === 'draft').length || 0;

      // Calculate total recent downloads (sum from all tables)
      const { data: marketingAssets } = await supabase
        .from('marketing_assets')
        .select('downloads');

      const totalMarketingDownloads = marketingAssets?.reduce((sum, asset) => sum + (asset.downloads || 0), 0) || 0;

      // Convert territory object to sorted array
      const topTerritories = companyStats?.by_territory
        ? Object.entries(companyStats.by_territory)
            .map(([territory, count]) => ({ territory, count: count as number }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
        : [];

      setStats({
        // Company stats
        totalCompanies: companyStats?.total || 0,
        activeCompanies: companyStats?.active || 0,
        pendingCompanies: companyStats?.pending || 0,
        inactiveCompanies: companyStats?.inactive || 0,
        exclusiveCompanies: companyStats?.by_account_type?.exclusive || 0,
        nonExclusiveCompanies: companyStats?.by_account_type?.['non-exclusive'] || 0,

        // User stats
        totalUsers: userStats?.total_users || 0,
        activeUsers: userStats?.active_users || 0,
        pendingUsers: userStats?.pending_users || 0,
        inactiveUsers: userStats?.inactive_users || 0,

        // Content stats
        totalDocs: docsCount || 0,
        totalMarketing: marketingCount || 0,
        totalTraining: trainingCount || 0,
        recentDownloads: totalMarketingDownloads,
        totalAnnouncements,
        draftAnnouncements,

        // Territory breakdown
        topTerritories,
      });

      // Load recent activity
      await loadRecentActivity();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const activities: Activity[] = [];

      // Helper function to get user name from user_profiles
      const getUserName = async (userId: string): Promise<string> => {
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', userId)
            .single();
          
          if (profile) {
            return profile.full_name || profile.email?.split('@')[0] || 'Someone';
          }
        } catch (error) {
          // If user_profiles doesn't exist or query fails, fallback
          console.log('Could not fetch user profile');
        }
        return 'Someone';
      };

      // Get recent announcements with user info
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, created_at, status, created_by')
        .order('created_at', { ascending: false })
        .limit(3);

      if (announcements) {
        for (const ann of announcements) {
          const userName = ann.created_by ? await getUserName(ann.created_by) : 'Someone';
          activities.push({
            id: ann.id,
            action: `${userName} ${ann.status === 'published' ? 'published' : 'created'} announcement: ${ann.title}`,
            time: formatTimeAgo(ann.created_at),
            type: 'announcement',
          });
        }
      }

      // Get recent documentation with user info
      const { data: docs } = await supabase
        .from('documentation')
        .select('id, title, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(2);

      if (docs) {
        for (const doc of docs) {
          const userName = doc.created_by ? await getUserName(doc.created_by) : 'Someone';
          activities.push({
            id: doc.id,
            action: `${userName} uploaded documentation: ${doc.title}`,
            time: formatTimeAgo(doc.created_at),
            type: 'upload',
          });
        }
      }

      // Get recent marketing assets with user info
      const { data: marketing } = await supabase
        .from('marketing_assets')
        .select('id, name, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(2);

      if (marketing) {
        for (const asset of marketing) {
          const userName = asset.created_by ? await getUserName(asset.created_by) : 'Someone';
          activities.push({
            id: asset.id,
            action: `${userName} uploaded marketing asset: ${asset.name}`,
            time: formatTimeAgo(asset.created_at),
            type: 'upload',
          });
        }
      }

      // Sort by time
      activities.sort((a, b) => {
        const timeA = parseTimeAgo(a.time);
        const timeB = parseTimeAgo(b.time);
        return timeA - timeB;
      });

      setRecentActivity(activities.slice(0, 8));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const parseTimeAgo = (timeString: string): number => {
    const match = timeString.match(/(\d+)\s+(minute|hour|day)/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'minute') return value;
    if (unit === 'hour') return value * 60;
    if (unit === 'day') return value * 1440;
    return 0;
  };

  const quickActions = [
    {
      label: 'Add Distributor',
      icon: Plus,
      href: '/admin/distributors',
      state: { openAddDialog: true },
      color: 'bg-[#00a8b5] hover:bg-[#008a95]',
    },
    {
      label: 'Upload Content',
      icon: Upload,
      href: '/admin/documentation',
      state: { openUploadDialog: true },
      color: 'bg-[#00a8b5] hover:bg-[#008a95]',
    },
    {
      label: 'Post Announcement',
      icon: Megaphone,
      href: '/admin/announcements',
      state: { openCreateDialog: true },
      color: 'bg-[#00a8b5] hover:bg-[#008a95]',
    },
  ];

  const pendingTasks = [];
  if (stats.draftAnnouncements > 0) {
    pendingTasks.push({
      id: 1,
      task: `${stats.draftAnnouncements} draft announcement${stats.draftAnnouncements > 1 ? 's' : ''} need review`,
      priority: 'medium',
      link: '/admin/announcements',
    });
  }

  const statCards = [
    {
      title: 'Distributor Companies',
      value: stats.totalCompanies.toString(),
      subtitle: `${stats.activeCompanies} active | ${stats.pendingCompanies} pending | ${stats.inactiveCompanies} inactive`,
      icon: Building2,
      color: 'text-[#00a8b5]',
      bgColor: 'bg-[#00a8b5]/10',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      subtitle: `${stats.activeUsers} active | ${stats.pendingUsers} pending`,
      icon: Users,
      color: 'text-[#00a8b5]',
      bgColor: 'bg-[#00a8b5]/10',
    },
    {
      title: 'Account Types',
      value: `${stats.exclusiveCompanies} / ${stats.nonExclusiveCompanies}`,
      subtitle: 'Exclusive / Non-exclusive',
      icon: Globe,
      color: 'text-[#00a8b5]',
      bgColor: 'bg-[#00a8b5]/10',
    },
    {
      title: 'Total Resources',
      value: (stats.totalDocs + stats.totalMarketing + stats.totalTraining).toString(),
      subtitle: `${stats.totalDocs} docs | ${stats.totalMarketing} marketing | ${stats.totalTraining} training`,
      icon: FolderOpen,
      color: 'text-[#00a8b5]',
      bgColor: 'bg-[#00a8b5]/10',
    },
    {
      title: 'Recent Activity',
      value: stats.recentDownloads.toString(),
      subtitle: 'downloads in last 30 days',
      icon: Download,
      color: 'text-[#00a8b5]',
      bgColor: 'bg-[#00a8b5]/10',
    },
    {
      title: 'Announcements',
      value: stats.totalAnnouncements.toString(),
      subtitle: `${stats.draftAnnouncements} draft${stats.draftAnnouncements !== 1 ? 's' : ''} pending`,
      icon: Megaphone,
      color: 'text-[#00a8b5]',
      bgColor: 'bg-[#00a8b5]/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-slate-900 mb-2">Admin Dashboard</h1>
        <p className="text-[16px] text-[#6b7280]">Manage your distributor portal</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-[13px] text-[#6b7280]">{stat.title}</p>
                    <p className="text-[32px] font-semibold text-slate-900">{stat.value}</p>
                    <p className="text-[12px] text-[#9ca3af]">{stat.subtitle}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Territory Breakdown */}
      {stats.topTerritories.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-[18px]">Top Territories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topTerritories.map((territory) => (
                <div key={territory.territory} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#00a8b5]" />
                    <span className="text-[14px] text-slate-900">{territory.territory}</span>
                  </div>
                  <Badge variant="secondary" className="bg-[#00a8b5]/10 text-[#00a8b5]">
                    {territory.count} {territory.count === 1 ? 'company' : 'companies'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-[18px]">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} to={action.href} state={action.state}>
                  <Button
                    className={`w-full ${action.color} text-white justify-start gap-3`}
                  >
                    <Icon className="h-5 w-5" />
                    {action.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-[18px] text-orange-900">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex items-center gap-3">
                    {task.priority === 'high' && (
                      <Badge className="bg-red-500 text-white">High Priority</Badge>
                    )}
                    {task.priority === 'medium' && (
                      <Badge className="bg-orange-500 text-white">Medium</Badge>
                    )}
                    <span className="text-[14px] text-slate-900">{task.task}</span>
                  </div>
                  <Link to={task.link}>
                    <Button variant="ghost" size="sm" className="text-[#00a8b5] hover:text-[#008a95]">
                      Review
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-[18px]">Recent Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-0">
                    <div className="w-2 h-2 mt-2 bg-[#00a8b5] rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-slate-900">{activity.action}</p>
                      <p className="text-[12px] text-[#9ca3af] mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[14px] text-slate-500 text-center py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

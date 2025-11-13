import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
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
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Download,
  Search,
  LogIn,
  Eye,
  FileDown,
  Users,
  Activity,
  TrendingUp,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface ActivityRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  distributor_id: string;
  distributor_company: string;
  distributor_territory: string;
  distributor_country: string;
  activity_type: string;
  page_url: string | null;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  metadata: any;
  created_at: string;
}

interface Distributor {
  id: string;
  company_name: string;
  territory: string;
  country: string;
  status: string;
}

interface DistributorSummary {
  distributor_id: string;
  company_name: string;
  territory: string;
  total_users: number;
  active_users_7d: number;
  total_activities: number;
  last_activity: string;
}

const COLORS = ['#00a8b5', '#008a95', '#00c4d1', '#0090a0', '#00b8c5'];

const activityIcons: Record<string, any> = {
  login: LogIn,
  page_view: Eye,
  download: FileDown,
  search: Search,
  product_view: Eye,
};

const activityColors: Record<string, string> = {
  login: 'bg-green-100 text-green-800',
  page_view: 'bg-blue-100 text-blue-800',
  download: 'bg-purple-100 text-purple-800',
  search: 'bg-orange-100 text-orange-800',
  product_view: 'bg-cyan-100 text-cyan-800',
};

export default function ActivityReports() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [distributorSummaries, setDistributorSummaries] = useState<DistributorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedDistributor, setSelectedDistributor] = useState<string>('all');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDistributors();
    loadDistributorSummaries();
    loadActivities();
  }, [dateRange, selectedDistributor, selectedActivityType]);

  const loadDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('id, company_name, territory, country, status')
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
      toast.error('Failed to load distributors');
    }
  };

  const loadDistributorSummaries = async () => {
    try {
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const { data, error } = await supabase
        .from('distributor_activity_summary')
        .select('*');

      if (error) throw error;
      setDistributorSummaries(data || []);
    } catch (error) {
      console.error('Error loading distributor summaries:', error);
      toast.error('Failed to load distributor summaries');
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      let query = supabase
        .from('distributor_activity_detailed')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Apply distributor filter
      if (selectedDistributor !== 'all') {
        query = query.eq('distributor_id', selectedDistributor);
      }

      // Apply activity type filter
      if (selectedActivityType !== 'all') {
        query = query.eq('activity_type', selectedActivityType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  // Filter activities by search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery) return activities;

    const query = searchQuery.toLowerCase();
    return activities.filter(
      (activity) =>
        activity.user_name?.toLowerCase().includes(query) ||
        activity.user_email?.toLowerCase().includes(query) ||
        activity.distributor_company?.toLowerCase().includes(query) ||
        activity.resource_name?.toLowerCase().includes(query) ||
        activity.page_url?.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  // Get selected distributor details
  const selectedDistributorDetails = useMemo(() => {
    if (selectedDistributor === 'all') return null;

    const distributor = distributors.find((d) => d.id === selectedDistributor);
    const summary = distributorSummaries.find((s) => s.distributor_id === selectedDistributor);

    return { ...distributor, ...summary };
  }, [selectedDistributor, distributors, distributorSummaries]);

  // Summary statistics
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Count distributors with at least 1 login in last 7 days
    const activeDistributorIds = new Set(
      activities
        .filter(
          (a) => new Date(a.created_at) >= sevenDaysAgo && a.activity_type === 'login'
        )
        .map((a) => a.distributor_id)
    );

    const totalDistributors = distributors.length;
    const activeDistributors = activeDistributorIds.size;
    const engagementRate = totalDistributors > 0 ? (activeDistributors / totalDistributors) * 100 : 0;

    const downloads = activities.filter((a) => a.activity_type === 'download');
    const downloadCounts: Record<string, { count: number; distributor: string }> = {};
    downloads.forEach((d) => {
      if (d.resource_name) {
        if (!downloadCounts[d.resource_name]) {
          downloadCounts[d.resource_name] = { count: 0, distributor: d.distributor_company };
        }
        downloadCounts[d.resource_name].count++;
      }
    });

    const productViews = activities.filter((a) => a.activity_type === 'product_view');
    const productViewCounts: Record<string, { count: number; distributor: string }> = {};
    productViews.forEach((p) => {
      if (p.resource_name) {
        if (!productViewCounts[p.resource_name]) {
          productViewCounts[p.resource_name] = { count: 0, distributor: p.distributor_company };
        }
        productViewCounts[p.resource_name].count++;
      }
    });

    return {
      totalActivities: activities.length,
      activeDistributors,
      totalDistributors,
      engagementRate: engagementRate.toFixed(1),
      mostDownloaded: Object.entries(downloadCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([name, data]) => ({ name, count: data.count, distributor: data.distributor })),
      mostViewed: Object.entries(productViewCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([name, data]) => ({ name, count: data.count, distributor: data.distributor })),
    };
  }, [activities, distributors]);

  // Activity over time data
  const activityOverTime = useMemo(() => {
    const dayMap: Record<string, number> = {};

    filteredActivities.forEach((activity) => {
      const date = new Date(activity.created_at).toLocaleDateString();
      dayMap[date] = (dayMap[date] || 0) + 1;
    });

    return Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }, [filteredActivities]);

  // Activity by distributor data
  const activityByDistributor = useMemo(() => {
    const distMap: Record<string, number> = {};

    activities.forEach((activity) => {
      const company = activity.distributor_company || 'Unknown';
      distMap[company] = (distMap[company] || 0) + 1;
    });

    return Object.entries(distMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [activities]);

  // Activity type breakdown data
  const activityTypeBreakdown = useMemo(() => {
    const typeMap: Record<string, number> = {};

    filteredActivities.forEach((activity) => {
      typeMap[activity.activity_type] = (typeMap[activity.activity_type] || 0) + 1;
    });

    return Object.entries(typeMap).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
    }));
  }, [filteredActivities]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Time',
      'Distributor Company',
      'Territory',
      'User Name',
      'User Email',
      'Activity Type',
      'Resource',
      'Page',
    ];

    const rows = filteredActivities.map((activity) => [
      new Date(activity.created_at).toLocaleDateString(),
      new Date(activity.created_at).toLocaleTimeString(),
      activity.distributor_company || '',
      activity.distributor_territory || '',
      activity.user_name || '',
      activity.user_email || '',
      activity.activity_type,
      activity.resource_name || '',
      activity.page_url || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">Distributor Activity Reports</h1>
          <p className="text-[16px] text-slate-600">
            Track and analyze distributor engagement and activity
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger id="dateRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Distributor Company */}
              <div>
                <Label htmlFor="distributor">Distributor Company</Label>
                <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
                  <SelectTrigger id="distributor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distributors</SelectItem>
                    {distributors.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id}>
                        {dist.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activityType">Activity Type</Label>
                <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                  <SelectTrigger id="activityType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="login">Logins</SelectItem>
                    <SelectItem value="download">Downloads</SelectItem>
                    <SelectItem value="product_view">Product Views</SelectItem>
                    <SelectItem value="page_view">Page Views</SelectItem>
                    <SelectItem value="search">Searches</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="search"
                    type="search"
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distributor Drill-Down Summary */}
        {selectedDistributorDetails && (
          <Card className="mb-6 border-l-4 border-l-[#00a8b5]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#00a8b5]" />
                    {selectedDistributorDetails.company_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" />
                    {selectedDistributorDetails.territory} • {selectedDistributorDetails.country}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-600">Total Users</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {selectedDistributorDetails.total_users || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Active Users (7d)</div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedDistributorDetails.active_users_7d || 0}
                    <span className="text-sm text-slate-600 ml-2">
                      (
                      {selectedDistributorDetails.total_users
                        ? Math.round(
                            ((selectedDistributorDetails.active_users_7d || 0) /
                              selectedDistributorDetails.total_users) *
                              100
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Total Activities</div>
                  <div className="text-2xl font-bold text-[#00a8b5]">
                    {selectedDistributorDetails.total_activities || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">Last Activity</div>
                  <div className="text-lg font-semibold text-slate-900">
                    {selectedDistributorDetails.last_activity
                      ? new Date(selectedDistributorDetails.last_activity).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActivities.toLocaleString()}</div>
              <p className="text-xs text-slate-600 mt-1">Last {dateRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Distributors</CardTitle>
              <Building2 className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activeDistributors} / {stats.totalDistributors}
              </div>
              <p className="text-xs text-slate-600 mt-1">Logged in last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.engagementRate}%</div>
              <p className="text-xs text-slate-600 mt-1">Active / Total distributors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Downloaded</CardTitle>
              <FileDown className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold leading-tight">
                {stats.mostDownloaded[0]?.name.substring(0, 20) || 'N/A'}
                {stats.mostDownloaded[0]?.name && stats.mostDownloaded[0].name.length > 20 ? '...' : ''}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {stats.mostDownloaded[0]?.count || 0} downloads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activity Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
              <CardDescription>Daily activity for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#00a8b5" name="Activities" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Type Breakdown</CardTitle>
              <CardDescription>Distribution of activity types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {activityTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity by Distributor Company */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Distributor Companies by Activity</CardTitle>
              <CardDescription>Most active distributor companies in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityByDistributor}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#00a8b5" name="Activities" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Showing {filteredActivities.length} of {activities.length} activities
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Distributor Company</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                        No activities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActivities.map((activity) => {
                      const Icon = activityIcons[activity.activity_type] || Activity;
                      const isExpanded = expandedRows.has(activity.id);

                      return (
                        <React.Fragment key={activity.id}>
                          <TableRow>
                            <TableCell className="whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">
                                {new Date(activity.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium text-slate-900">
                                {activity.distributor_company || 'Unknown'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {activity.distributor_territory && (
                                  <>
                                    <MapPin className="inline h-3 w-3 mr-1" />
                                    {activity.distributor_territory}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium text-slate-900">
                                {activity.user_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-slate-500">{activity.user_email}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className={activityColors[activity.activity_type]}>
                                <Icon className="mr-1 h-3 w-3" />
                                {activity.activity_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-900">
                                {activity.resource_name || activity.page_url || 'N/A'}
                              </div>
                              {activity.resource_type && (
                                <div className="text-xs text-slate-500">{activity.resource_type}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(activity.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-slate-50">
                                <div className="p-4 space-y-2">
                                  {activity.page_url && (
                                    <div>
                                      <span className="font-medium text-sm">Page URL:</span>
                                      <span className="text-sm text-slate-600 ml-2">
                                        {activity.page_url}
                                      </span>
                                    </div>
                                  )}
                                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                                    <div>
                                      <span className="font-medium text-sm">Metadata:</span>
                                      <pre className="text-xs text-slate-600 mt-1 bg-white p-2 rounded">
                                        {JSON.stringify(activity.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface ActivityRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_company: string;
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
  email: string;
  full_name: string;
  company_name: string;
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
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedDistributor, setSelectedDistributor] = useState<string>('all');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDistributors();
    loadActivities();
  }, [dateRange, selectedDistributor, selectedActivityType]);

  const loadDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, company_name')
        .eq('role', 'distributor')
        .order('full_name');

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
      toast.error('Failed to load distributors');
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      let query = supabase
        .from('distributor_activity_report')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Apply filters
      if (selectedDistributor !== 'all') {
        query = query.eq('user_id', selectedDistributor);
      }

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
        activity.resource_name?.toLowerCase().includes(query) ||
        activity.page_url?.toLowerCase().includes(query)
    );
  }, [activities, searchQuery]);

  // Summary statistics
  const stats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeDistributors = new Set(
      activities
        .filter((a) => new Date(a.created_at) >= sevenDaysAgo && a.activity_type === 'login')
        .map((a) => a.user_id)
    );

    const downloads = activities.filter((a) => a.activity_type === 'download');
    const downloadCounts: Record<string, number> = {};
    downloads.forEach((d) => {
      if (d.resource_name) {
        downloadCounts[d.resource_name] = (downloadCounts[d.resource_name] || 0) + 1;
      }
    });

    const productViews = activities.filter((a) => a.activity_type === 'product_view');
    const productViewCounts: Record<string, number> = {};
    productViews.forEach((p) => {
      if (p.resource_name) {
        productViewCounts[p.resource_name] = (productViewCounts[p.resource_name] || 0) + 1;
      }
    });

    return {
      totalActivities: activities.length,
      activeDistributors: activeDistributors.size,
      mostDownloaded: Object.entries(downloadCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      mostViewed: Object.entries(productViewCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    };
  }, [activities]);

  // Activity over time data
  const activityOverTime = useMemo(() => {
    const dayMap: Record<string, number> = {};

    activities.forEach((activity) => {
      const date = new Date(activity.created_at).toLocaleDateString();
      dayMap[date] = (dayMap[date] || 0) + 1;
    });

    return Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days
  }, [activities]);

  // Activity by distributor data
  const activityByDistributor = useMemo(() => {
    const distMap: Record<string, number> = {};

    activities.forEach((activity) => {
      const name = activity.user_name || activity.user_email || 'Unknown';
      distMap[name] = (distMap[name] || 0) + 1;
    });

    return Object.entries(distMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [activities]);

  // Activity type breakdown data
  const activityTypeBreakdown = useMemo(() => {
    const typeMap: Record<string, number> = {};

    activities.forEach((activity) => {
      typeMap[activity.activity_type] = (typeMap[activity.activity_type] || 0) + 1;
    });

    return Object.entries(typeMap).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
    }));
  }, [activities]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Distributor', 'Email', 'Company', 'Activity Type', 'Resource', 'Page'];

    const rows = filteredActivities.map((activity) => [
      new Date(activity.created_at).toLocaleDateString(),
      new Date(activity.created_at).toLocaleTimeString(),
      activity.user_name || '',
      activity.user_email || '',
      activity.user_company || '',
      activity.activity_type,
      activity.resource_name || '',
      activity.page_url || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

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

              {/* Distributor */}
              <div>
                <Label htmlFor="distributor">Distributor</Label>
                <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
                  <SelectTrigger id="distributor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Distributors</SelectItem>
                    {distributors.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id}>
                        {dist.full_name || dist.email}
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
              <Users className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDistributors}</div>
              <p className="text-xs text-slate-600 mt-1">Logged in last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Downloaded</CardTitle>
              <FileDown className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mostDownloaded[0]?.name.substring(0, 15) || 'N/A'}
                {stats.mostDownloaded[0]?.name && stats.mostDownloaded[0].name.length > 15 ? '...' : ''}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {stats.mostDownloaded[0]?.count || 0} downloads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Viewed Product</CardTitle>
              <Eye className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.mostViewed[0]?.name.substring(0, 15) || 'N/A'}
                {stats.mostViewed[0]?.name && stats.mostViewed[0].name.length > 15 ? '...' : ''}
              </div>
              <p className="text-xs text-slate-600 mt-1">{stats.mostViewed[0]?.count || 0} views</p>
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

          {/* Activity by Distributor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Distributors by Activity</CardTitle>
              <CardDescription>Most active distributors in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityByDistributor}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
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
                    <TableHead>Distributor</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Resource/Page</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
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
                                {activity.user_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-slate-500">{activity.user_email}</div>
                              {activity.user_company && (
                                <div className="text-xs text-slate-500">{activity.user_company}</div>
                              )}
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
                              <TableCell colSpan={5} className="bg-slate-50">
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

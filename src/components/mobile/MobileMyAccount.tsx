import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  User,
  Mail,
  Building2,
  Globe,
  Phone,
  MapPin,
  Bell,
  Lock,
  CreditCard,
  FileText,
  ChevronRight,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useUserProfile } from '../../hooks/useData';

export default function MobileMyAccount() {
  const { profile, loading, error } = useUserProfile();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2 text-slate-900">Unable to Load Profile</h2>
          <p className="text-slate-600 mb-4">{error || 'Profile not found'}</p>
          <Button onClick={() => window.location.reload()} className="bg-[#00a8b5] hover:bg-[#008a95]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Parse JSON fields
  const countries = typeof profile.countries === 'string' 
    ? JSON.parse(profile.countries) 
    : (profile.countries || []);

  // Generate initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#00a8b5] to-[#008a95] text-white p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 text-white text-xl">
              {getInitials(profile.company_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="mb-1">{profile.company_name}</h1>
            <p className="text-white/90 text-sm">{profile.region}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
          <Globe className="h-4 w-4 text-white/90" />
          <span className="text-sm text-white/90">
            Territory: {countries.length} {countries.length === 1 ? 'country' : 'countries'} • {profile.distributor_type || 'Distributor'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Account Information */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-[#00a8b5]" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Company Name</Label>
              <div className="mt-1 text-sm text-slate-900">{profile.company_name}</div>
            </div>
            <Separator />
            {profile.contact_person && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Contact Person</Label>
                  <div className="mt-1 text-sm text-slate-900">{profile.contact_person}</div>
                </div>
                <Separator />
              </>
            )}
            <div>
              <Label className="text-xs text-slate-500">Email</Label>
              <div className="mt-1 text-sm text-slate-900">{profile.email}</div>
            </div>
            <Separator />
            {profile.phone && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Phone</Label>
                  <div className="mt-1 text-sm text-slate-900">{profile.phone}</div>
                </div>
                <Separator />
              </>
            )}
            {profile.account_id && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Account ID</Label>
                  <div className="mt-1 text-sm text-slate-900 font-mono">{profile.account_id}</div>
                </div>
              </>
            )}
            <Button variant="outline" className="w-full mt-2 h-10 rounded-lg">
              Edit Information
            </Button>
          </CardContent>
        </Card>

        {/* Territory Information */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-[#00a8b5]" />
              Territory Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Region</Label>
              <div className="mt-1 text-sm text-slate-900">{profile.region}</div>
            </div>
            <Separator />
            {countries.length > 0 && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Countries</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {countries.map((country: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{country}</Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}
            {profile.distributor_type && (
              <div>
                <Label className="text-xs text-slate-500">Distributor Type</Label>
                <div className="mt-1">
                  <Badge className="bg-[#00a8b5] text-white">{profile.distributor_type}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription & Billing */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-[#00a8b5]" />
              Subscription & Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500">Current Plan</Label>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-slate-900">Premium Distributor</span>
                <Badge className="bg-green-100 text-green-800 border-0">Active</Badge>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-slate-500">Renewal Date</Label>
              <div className="mt-1 text-sm text-slate-900">March 15, 2026</div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-slate-500">Payment Terms</Label>
              <div className="mt-1 text-sm text-slate-900">Net 30 Days</div>
            </div>
            <Button variant="outline" className="w-full mt-2 h-10 rounded-lg">
              View Billing History
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-[#00a8b5]" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-slate-900 mb-0.5">Email Notifications</div>
                <div className="text-xs text-slate-500">Receive updates via email</div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-slate-900 mb-0.5">Push Notifications</div>
                <div className="text-xs text-slate-500">Get instant alerts on mobile</div>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-slate-900 mb-0.5">Weekly Digest</div>
                <div className="text-xs text-slate-500">Summary of weekly updates</div>
              </div>
              <Switch
                checked={weeklyDigest}
                onCheckedChange={setWeeklyDigest}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-900">Change Password</div>
                  <div className="text-xs text-slate-500">Update your password</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-900">Download Agreement</div>
                  <div className="text-xs text-slate-500">View distributor contract</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-slate-600" />
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-900">Advanced Settings</div>
                  <div className="text-xs text-slate-500">Configure portal preferences</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="border-slate-200 bg-gradient-to-br from-[#00a8b5]/5 to-[#008a95]/5">
          <CardContent className="p-6 text-center">
            <h3 className="mb-2 text-slate-900">Need Help?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Our support team is here to assist you
            </p>
            <Button className="bg-[#00a8b5] hover:bg-[#008a95] h-10 rounded-lg">
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

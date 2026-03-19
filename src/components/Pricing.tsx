import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Link } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  Search,
  Download,
  FileText,
  Loader2,
  Euro,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchAccessibleContent } from '../lib/api/distributor-content';
import { supabase } from '../lib/supabase';
import type { PriceList } from '../lib/api/price-lists';

export default function Pricing() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await fetchAccessibleContent<PriceList>(
      'price_lists',
      'price_lists',
      { status: 'published' }
    );
    setPriceLists(data);
    setLoading(false);
  };

  const handleDownload = async (pl: PriceList) => {
    if (!pl.file_url) {
      toast.error('No file available for this price list');
      return;
    }
    // Track download
    await supabase
      .from('price_lists')
      .update({ downloads: (pl.downloads || 0) + 1 })
      .eq('id', pl.id);

    window.open(pl.file_url, '_blank');
  };

  const filtered = priceLists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const eur = filtered.filter(pl => pl.currency === 'EUR');
  const usd = filtered.filter(pl => pl.currency === 'USD');

  const formatBytes = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const PriceListCard = ({ pl }: { pl: PriceList }) => (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                pl.currency === 'EUR' ? 'bg-blue-100' : 'bg-green-100'
              }`}
            >
              {pl.currency === 'EUR' ? (
                <Euro className="h-5 w-5 text-blue-700" />
              ) : (
                <DollarSign className="h-5 w-5 text-green-700" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-[15px] leading-tight mb-1">
                {pl.name}
              </h3>
              {pl.description && (
                <p className="text-[13px] text-slate-500 line-clamp-2 mb-2">{pl.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
                {pl.valid_from && pl.valid_until && (
                  <span>
                    Valid {new Date(pl.valid_from).toLocaleDateString()} –{' '}
                    {new Date(pl.valid_until).toLocaleDateString()}
                  </span>
                )}
                {pl.valid_until && !pl.valid_from && (
                  <span>Valid until {new Date(pl.valid_until).toLocaleDateString()}</span>
                )}
                {pl.file_url && formatBytes(pl.file_size) && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {formatBytes(pl.file_size)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={() => handleDownload(pl)}
            disabled={!pl.file_url}
            className="flex-shrink-0 bg-[#01B8D1] hover:bg-[#00a0bb] text-white gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <nav className="flex items-center text-[14px] text-slate-600">
            <Link to="/portal" className="hover:text-[#01B8D1] flex items-center gap-1">
              <Home className="h-4 w-4" />
              Home
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-slate-900 font-medium">Pricing</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">Price Lists</h1>
          <p className="text-[16px] text-slate-600">
            Download the latest price lists for your region.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search price lists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-10 w-10 animate-spin text-[#01B8D1]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FileText className="h-14 w-14 text-slate-300 mx-auto mb-4" />
            <p className="text-[16px] font-medium mb-1">No price lists available</p>
            <p className="text-[14px]">
              {searchQuery
                ? 'No results match your search.'
                : 'Price lists will appear here once they are published.'}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* EUR section */}
            {eur.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Euro className="h-5 w-5 text-blue-600" />
                  <h2 className="text-[18px] font-semibold text-slate-900">Euro Price Lists</h2>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs" variant="outline">
                    {eur.length} {eur.length === 1 ? 'list' : 'lists'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {eur.map(pl => <PriceListCard key={pl.id} pl={pl} />)}
                </div>
              </section>
            )}

            {/* USD section */}
            {usd.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h2 className="text-[18px] font-semibold text-slate-900">US Dollar Price Lists</h2>
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs" variant="outline">
                    {usd.length} {usd.length === 1 ? 'list' : 'lists'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {usd.map(pl => <PriceListCard key={pl.id} pl={pl} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

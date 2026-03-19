import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Download, FileText, Loader2, Euro, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAccessibleContent } from '../../lib/api/distributor-content';
import { supabase } from '../../lib/supabase';
import type { PriceList } from '../../lib/api/price-lists';

export default function MobilePricing() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      const data = await fetchAccessibleContent<PriceList>(
        'price_lists',
        'price_lists',
        { status: 'published' }
      );
      setPriceLists(data);
      setLoading(false);
    })();
  }, []);

  const handleDownload = async (pl: PriceList) => {
    if (!pl.file_url) { toast.error('No file available'); return; }
    await supabase
      .from('price_lists')
      .update({ downloads: (pl.downloads || 0) + 1 })
      .eq('id', pl.id);
    window.open(pl.file_url, '_blank');
  };

  const filtered = priceLists.filter(pl =>
    pl.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#01B8D1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#01B8D1] to-[#00a0bb] text-white p-6">
        <h1 className="mb-1">Price Lists</h1>
        <p className="text-white/90 text-sm">{filtered.length} available</p>
      </div>

      {/* Search */}
      <div className="p-4 bg-white border-b border-slate-200 sticky top-14 z-30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search price lists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-medium">No price lists available</p>
          </div>
        ) : (
          filtered.map(pl => (
            <Card key={pl.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      pl.currency === 'EUR' ? 'bg-blue-100' : 'bg-green-100'
                    }`}
                  >
                    {pl.currency === 'EUR'
                      ? <Euro className="h-4 w-4 text-blue-700" />
                      : <DollarSign className="h-4 w-4 text-green-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-[14px] leading-tight mb-1">
                      {pl.name}
                    </p>
                    {pl.description && (
                      <p className="text-[12px] text-slate-500 line-clamp-1 mb-2">{pl.description}</p>
                    )}
                    <Badge
                      className={`text-[11px] ${pl.currency === 'EUR' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-green-100 text-green-800 border-green-200'}`}
                      variant="outline"
                    >
                      {pl.currency}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(pl)}
                    disabled={!pl.file_url}
                    className="flex-shrink-0 bg-[#01B8D1] hover:bg-[#00a0bb] h-9 px-3"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

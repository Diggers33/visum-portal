import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Download, 
  FileText, 
  Video, 
  ChevronLeft,
  FileCheck,
  BookOpen,
  PlayCircle,
  Share2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useProduct } from '../../hooks/useData';

export default function MobileProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00a8b5] mx-auto mb-4" />
          <p className="text-slate-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="mb-2">Product not found</h2>
          <p className="text-slate-600 mb-4">{error || 'This product does not exist'}</p>
          <Button onClick={() => navigate('/mobile/products')} className="bg-[#00a8b5] hover:bg-[#008a95]">
            Back to catalog
          </Button>
        </div>
      </div>
    );
  }

  // Parse JSON fields
  const specifications = typeof product.specifications === 'string' 
    ? JSON.parse(product.specifications) 
    : (product.specifications || {});
  
  const features = typeof product.features === 'string'
    ? JSON.parse(product.features)
    : (product.features || []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/mobile/products')}
          className="gap-1 -ml-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Share2 className="h-5 w-5 text-slate-600" />
        </Button>
      </div>

      {/* Product Image */}
      <div className="bg-white p-6 border-b border-slate-200">
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
          <ImageWithFallback
            src={product.image_url || ''}
            alt={product.name}
            className="w-full h-48 object-contain"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white p-6 border-b border-slate-200">
        <Badge variant="outline" className="mb-2">
          {product.category}
        </Badge>
        <h1 className="mb-2 text-slate-900">{product.name}</h1>
        <p className="text-slate-600 mb-4">{product.tagline || product.description}</p>
        <div className="text-2xl text-[#00a8b5]">{product.price || 'Contact for pricing'}</div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="bg-white">
        <TabsList className="w-full grid grid-cols-3 h-12 bg-slate-50 p-1 mx-0 rounded-none border-b border-slate-200">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="specs" className="rounded-lg">Specs</TabsTrigger>
          <TabsTrigger value="resources" className="rounded-lg">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-4 space-y-4 mt-0">
          <div>
            <h3 className="mb-2 text-slate-900">Product Overview</h3>
            <p className="text-slate-600 leading-relaxed">{product.overview || product.description}</p>
          </div>

          {features.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="mb-3 text-slate-900">Key Features</h3>
                <div className="space-y-2">
                  {features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#00a8b5] mt-2" />
                      <p className="text-sm text-slate-600 flex-1">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="specs" className="p-4 mt-0">
          <div className="space-y-1">
            {Object.entries(specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between py-3 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{key}</span>
                <span className="text-slate-900">{value as string}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="p-4 space-y-3 mt-0">
          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">Product Datasheet</div>
                <div className="text-xs text-slate-500">PDF • 2.4 MB</div>
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">User Manual</div>
                <div className="text-xs text-slate-500">PDF • 5.1 MB</div>
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">Product Demo Video</div>
                <div className="text-xs text-slate-500">Video • 12:30</div>
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <PlayCircle className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">Application Notes</div>
                <div className="text-xs text-slate-500">PDF • 3.2 MB</div>
              </div>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-12 rounded-xl">
            Contact Sales
          </Button>
          <Button className="flex-1 h-12 rounded-xl bg-[#00a8b5] hover:bg-[#008a95]">
            Request Quote
          </Button>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}

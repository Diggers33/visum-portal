import { FolderOpen, FileImage, FileText, Video, Megaphone } from 'lucide-react';
import { Card } from '../ui/card';

export default function MobileMarketingAssets() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#00a8b5] to-[#008a95] flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Marketing Assets</h1>
            <p className="text-sm text-slate-500">Sales & promotional materials</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="p-6">
        <Card className="p-8 text-center border-dashed border-2 border-slate-300">
          <div className="mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Megaphone className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Marketing Library Coming Soon
            </h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              We're building a comprehensive library of marketing materials to help 
              you promote our products effectively.
            </p>
          </div>

          {/* Preview Features */}
          <div className="grid gap-4 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <FileImage className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">Product Images</div>
                <div className="text-xs text-slate-600">High-resolution photos and graphics</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <FileText className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">Brochures & Flyers</div>
                <div className="text-xs text-slate-600">Ready-to-print marketing materials</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <Video className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">Promotional Videos</div>
                <div className="text-xs text-slate-600">Product demos and commercials</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <FileText className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">Case Studies</div>
                <div className="text-xs text-slate-600">Success stories and testimonials</div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            Expected launch: Q1 2026
          </p>
        </Card>
      </div>
    </div>
  );
}

import { GraduationCap, BookOpen, PlayCircle, FileText } from 'lucide-react';
import { Card } from '../ui/card';

export default function MobileTrainingCenter() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#00a8b5] to-[#008a95] flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Training Center</h1>
            <p className="text-sm text-slate-500">Product education & resources</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="p-6">
        <Card className="p-8 text-center border-dashed border-2 border-slate-300">
          <div className="mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <GraduationCap className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Training Content Coming Soon
            </h2>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              We're preparing comprehensive training materials including video tutorials, 
              product guides, and certification courses.
            </p>
          </div>

          {/* Preview Features */}
          <div className="grid gap-4 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <PlayCircle className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">Video Tutorials</div>
                <div className="text-xs text-slate-600">Step-by-step product demonstrations</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <BookOpen className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">User Guides</div>
                <div className="text-xs text-slate-600">Detailed product documentation</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <FileText className="h-5 w-5 text-[#00a8b5] mt-0.5" />
              <div>
                <div className="font-medium text-sm text-slate-900">Certification</div>
                <div className="text-xs text-slate-600">Become a certified partner</div>
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

import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { 
  Search, 
  BookOpen,
  FileText,
  Wrench,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Shield
} from 'lucide-react';
import MobileTechnicalDocsCategoryView from './MobileTechnicalDocsCategoryView';

const categories = [
  {
    id: 'installation-guide',
    name: 'Installation Guide',
    description: '6 documents',
    icon: BookOpen,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    count: 6,
  },
  {
    id: 'maintenance-procedure',
    name: 'Maintenance Procedure',
    description: '8 documents',
    icon: Wrench,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    count: 8,
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: '10 documents',
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    count: 10,
  },
  {
    id: 'software-update',
    name: 'Software Update',
    description: '5 documents',
    icon: RefreshCw,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    count: 5,
  },
  {
    id: 'compliance-document',
    name: 'Compliance Document',
    description: '7 documents',
    icon: Shield,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    count: 7,
  },
];

export default function MobileTechnicalDocsWithCategories() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // If a category is selected, show the category view
  if (selectedCategory) {
    return (
      <MobileTechnicalDocsCategoryView 
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  // Filter categories based on search
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <h1 className="text-slate-900 mb-1">Technical Documentation</h1>
        <p className="text-sm text-slate-600">Product manuals, datasheets, and technical guides</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200 h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="p-4 space-y-3 pb-20">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          
          return (
            <Card 
              key={category.id} 
              className="border-slate-200 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              onClick={() => setSelectedCategory(category.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-xl ${category.iconBg} ${category.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-900 mb-0.5 leading-tight">
                      {category.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {category.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <div className="rounded-full bg-slate-100 p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 mb-2">No categories found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Search, 
  Download,
  FileText,
  BookOpen,
  Wrench,
  ArrowLeft,
  Eye,
  Share2,
  Filter,
  X,
  AlertCircle,
  RefreshCw,
  Shield
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

// Document data
const allDocuments = [
  // Installation Guide (6 documents)
  {
    id: 1,
    title: 'Visum Palm - Installation Guide',
    category: 'Installation Guide',
    product: 'Visum Palm',
    fileType: 'PDF',
    size: '3.1 MB',
    version: 'v2.2',
    date: 'Nov 2, 2025',
    pages: 42,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1684907110935-dcb64eba6add?w=400',
    description: 'Step-by-step installation procedures, site requirements, and setup guidelines.',
  },
  {
    id: 2,
    title: 'Raman RXN5 - Installation Manual',
    category: 'Installation Guide',
    product: 'Raman RXN5',
    fileType: 'PDF',
    size: '3.8 MB',
    version: 'v1.7',
    date: 'Oct 29, 2025',
    pages: 56,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1684907110935-dcb64eba6add?w=400',
    description: 'Complete installation instructions including laser safety protocols.',
  },
  {
    id: 3,
    title: 'HyperSpec HS400 - Setup Guide',
    category: 'Installation Guide',
    product: 'HyperSpec HS400',
    fileType: 'PDF',
    size: '4.2 MB',
    version: 'v2.0',
    date: 'Oct 26, 2025',
    pages: 64,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1684907110935-dcb64eba6add?w=400',
    description: 'Installation and setup procedures for hyperspectral imaging systems.',
  },
  {
    id: 4,
    title: 'Software Installation Guide',
    category: 'Installation Guide',
    product: 'Software',
    fileType: 'PDF',
    size: '2.4 MB',
    version: 'v4.0',
    date: 'Oct 23, 2025',
    pages: 32,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1684907110935-dcb64eba6add?w=400',
    description: 'IRIS software installation, configuration, and initial setup procedures.',
  },
  {
    id: 5,
    title: 'Network Configuration Guide',
    category: 'Installation Guide',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.9 MB',
    version: 'v2.5',
    date: 'Oct 20, 2025',
    pages: 28,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1684907110935-dcb64eba6add?w=400',
    description: 'Network setup, firewall configuration, and remote access guidelines.',
  },
  {
    id: 6,
    title: 'Site Preparation Checklist',
    category: 'Installation Guide',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.2 MB',
    version: 'v1.9',
    date: 'Oct 17, 2025',
    pages: 18,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1684907110935-dcb64eba6add?w=400',
    description: 'Pre-installation checklist covering space, power, and environmental requirements.',
  },

  // Maintenance Procedure (8 documents)
  {
    id: 7,
    title: 'Visum Palm - Maintenance Schedule',
    category: 'Maintenance Procedure',
    product: 'Visum Palm',
    fileType: 'PDF',
    size: '2.1 MB',
    version: 'v2.1',
    date: 'Nov 4, 2025',
    pages: 36,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Scheduled maintenance procedures and preventive care guidelines.',
  },
  {
    id: 8,
    title: 'Calibration Procedures - NIR Systems',
    category: 'Maintenance Procedure',
    product: 'All NIR',
    fileType: 'PDF',
    size: '2.4 MB',
    version: 'v3.1',
    date: 'Oct 25, 2025',
    pages: 44,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Detailed calibration procedures for NIR analyzer systems.',
  },
  {
    id: 9,
    title: 'Optical Component Cleaning Guide',
    category: 'Maintenance Procedure',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.5 MB',
    version: 'v1.8',
    date: 'Oct 22, 2025',
    pages: 24,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Proper cleaning and care procedures for optical components.',
  },
  {
    id: 10,
    title: 'Raman RXN5 - Maintenance Manual',
    category: 'Maintenance Procedure',
    product: 'Raman RXN5',
    fileType: 'PDF',
    size: '2.8 MB',
    version: 'v1.6',
    date: 'Oct 19, 2025',
    pages: 48,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Comprehensive maintenance guide for Raman spectroscopy systems.',
  },
  {
    id: 11,
    title: 'Preventive Maintenance Checklist',
    category: 'Maintenance Procedure',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.1 MB',
    version: 'v2.3',
    date: 'Oct 16, 2025',
    pages: 16,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Monthly and quarterly preventive maintenance checklists.',
  },
  {
    id: 12,
    title: 'Detector Care and Maintenance',
    category: 'Maintenance Procedure',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.7 MB',
    version: 'v1.4',
    date: 'Oct 13, 2025',
    pages: 28,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Maintenance procedures for detector systems and sensors.',
  },
  {
    id: 13,
    title: 'Annual Service Requirements',
    category: 'Maintenance Procedure',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.3 MB',
    version: 'v2.0',
    date: 'Oct 10, 2025',
    pages: 20,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Annual maintenance and certification requirements for all systems.',
  },
  {
    id: 14,
    title: 'Laser System Maintenance Guide',
    category: 'Maintenance Procedure',
    product: 'Raman RXN5',
    fileType: 'PDF',
    size: '2.2 MB',
    version: 'v1.5',
    date: 'Oct 8, 2025',
    pages: 38,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1606206848010-83949917a080?w=400',
    description: 'Laser maintenance procedures and safety guidelines.',
  },

  // Troubleshooting (10 documents)
  {
    id: 15,
    title: 'HyperSpec HS400 - Troubleshooting Guide',
    category: 'Troubleshooting',
    product: 'HyperSpec HS400',
    fileType: 'PDF',
    size: '1.9 MB',
    version: 'v2.0',
    date: 'Oct 22, 2025',
    pages: 52,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Common issues and solutions for hyperspectral imaging systems.',
  },
  {
    id: 16,
    title: 'Visum Palm - Error Code Reference',
    category: 'Troubleshooting',
    product: 'Visum Palm',
    fileType: 'PDF',
    size: '1.4 MB',
    version: 'v2.2',
    date: 'Oct 20, 2025',
    pages: 38,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Complete error code reference with troubleshooting steps.',
  },
  {
    id: 17,
    title: 'Network Connectivity Issues',
    category: 'Troubleshooting',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.1 MB',
    version: 'v1.7',
    date: 'Oct 18, 2025',
    pages: 24,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Resolving network and connectivity problems.',
  },
  {
    id: 18,
    title: 'Calibration Failure Diagnostics',
    category: 'Troubleshooting',
    product: 'All NIR',
    fileType: 'PDF',
    size: '1.6 MB',
    version: 'v2.1',
    date: 'Oct 15, 2025',
    pages: 32,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Diagnosing and resolving calibration failures.',
  },
  {
    id: 19,
    title: 'Raman RXN5 - Common Problems',
    category: 'Troubleshooting',
    product: 'Raman RXN5',
    fileType: 'PDF',
    size: '1.8 MB',
    version: 'v1.5',
    date: 'Oct 12, 2025',
    pages: 44,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Troubleshooting common Raman spectroscopy issues.',
  },
  {
    id: 20,
    title: 'Software Crash Recovery',
    category: 'Troubleshooting',
    product: 'Software',
    fileType: 'PDF',
    size: '1.2 MB',
    version: 'v4.0',
    date: 'Oct 10, 2025',
    pages: 20,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Recovering from software crashes and data loss.',
  },
  {
    id: 21,
    title: 'Power Supply Issues',
    category: 'Troubleshooting',
    product: 'All Products',
    fileType: 'PDF',
    size: '0.9 MB',
    version: 'v1.3',
    date: 'Oct 8, 2025',
    pages: 16,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Diagnosing and resolving power-related problems.',
  },
  {
    id: 22,
    title: 'Data Quality Problems',
    category: 'Troubleshooting',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.5 MB',
    version: 'v2.4',
    date: 'Oct 6, 2025',
    pages: 36,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Identifying and resolving data quality issues.',
  },
  {
    id: 23,
    title: 'Temperature Control Issues',
    category: 'Troubleshooting',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.0 MB',
    version: 'v1.6',
    date: 'Oct 4, 2025',
    pages: 22,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Troubleshooting temperature regulation problems.',
  },
  {
    id: 24,
    title: 'Communication Protocol Errors',
    category: 'Troubleshooting',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.3 MB',
    version: 'v2.0',
    date: 'Oct 2, 2025',
    pages: 28,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1611176682835-871a38ddc9d3?w=400',
    description: 'Resolving communication and protocol errors.',
  },

  // Software Update (5 documents)
  {
    id: 25,
    title: 'Firmware Update Guide v4.5',
    category: 'Software Update',
    product: 'All Products',
    fileType: 'PDF',
    size: '2.8 MB',
    version: 'v4.5',
    date: 'Nov 8, 2025',
    pages: 24,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1599576219848-222b20473611?w=400',
    description: 'Instructions for updating to firmware version 4.5 with new features.',
  },
  {
    id: 26,
    title: 'Software Release Notes - Q4 2025',
    category: 'Software Update',
    product: 'Software',
    fileType: 'PDF',
    size: '1.2 MB',
    version: 'v4.4',
    date: 'Nov 5, 2025',
    pages: 16,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1599576219848-222b20473611?w=400',
    description: 'Complete release notes for Q4 2025 software updates.',
  },
  {
    id: 27,
    title: 'Visum Palm - Firmware Update Procedure',
    category: 'Software Update',
    product: 'Visum Palm',
    fileType: 'PDF',
    size: '1.8 MB',
    version: 'v2.3',
    date: 'Nov 1, 2025',
    pages: 20,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1599576219848-222b20473611?w=400',
    description: 'Step-by-step firmware update procedures for Visum Palm.',
  },
  {
    id: 28,
    title: 'Driver Update Package',
    category: 'Software Update',
    product: 'All Products',
    fileType: 'PDF',
    size: '0.9 MB',
    version: 'v3.8',
    date: 'Oct 28, 2025',
    pages: 12,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1599576219848-222b20473611?w=400',
    description: 'Latest driver updates and installation instructions.',
  },
  {
    id: 29,
    title: 'Rollback Procedures',
    category: 'Software Update',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.1 MB',
    version: 'v1.2',
    date: 'Oct 25, 2025',
    pages: 14,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1599576219848-222b20473611?w=400',
    description: 'How to rollback software updates if issues occur.',
  },

  // Compliance Document (7 documents)
  {
    id: 30,
    title: 'CE Certification Documents',
    category: 'Compliance Document',
    product: 'All Products',
    fileType: 'PDF',
    size: '2.5 MB',
    version: 'v5.0',
    date: 'Nov 6, 2025',
    pages: 48,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'Complete CE certification documentation for all IRIS products.',
  },
  {
    id: 31,
    title: 'FDA 21 CFR Part 11 Compliance',
    category: 'Compliance Document',
    product: 'Software',
    fileType: 'PDF',
    size: '3.2 MB',
    version: 'v2.1',
    date: 'Nov 3, 2025',
    pages: 64,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'FDA compliance documentation for pharmaceutical applications.',
  },
  {
    id: 32,
    title: 'ISO 9001 Quality Certificate',
    category: 'Compliance Document',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.8 MB',
    version: 'v4.2',
    date: 'Oct 30, 2025',
    pages: 32,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'ISO 9001 quality management system certification.',
  },
  {
    id: 33,
    title: 'RoHS Compliance Statement',
    category: 'Compliance Document',
    product: 'All Products',
    fileType: 'PDF',
    size: '0.8 MB',
    version: 'v3.0',
    date: 'Oct 27, 2025',
    pages: 12,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'RoHS compliance statement and material declarations.',
  },
  {
    id: 34,
    title: 'Laser Safety Compliance',
    category: 'Compliance Document',
    product: 'Raman RXN5',
    fileType: 'PDF',
    size: '1.5 MB',
    version: 'v1.8',
    date: 'Oct 24, 2025',
    pages: 28,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'Laser safety classification and compliance documentation.',
  },
  {
    id: 35,
    title: 'REACH Compliance Documentation',
    category: 'Compliance Document',
    product: 'All Products',
    fileType: 'PDF',
    size: '1.2 MB',
    version: 'v2.4',
    date: 'Oct 21, 2025',
    pages: 20,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'REACH regulation compliance and substance declarations.',
  },
  {
    id: 36,
    title: 'GMP Compliance Guide',
    category: 'Compliance Document',
    product: 'All Products',
    fileType: 'PDF',
    size: '2.1 MB',
    version: 'v3.5',
    date: 'Oct 18, 2025',
    pages: 42,
    language: 'EN',
    thumbnail: 'https://images.unsplash.com/photo-1590649849991-e9af438ea77d?w=400',
    description: 'Good Manufacturing Practice compliance guidelines.',
  },
];

const products = ['All Products', 'Visum Palm', 'Raman RXN5', 'HyperSpec HS400', 'All NIR', 'Software'];
const languages = ['EN'];

// File type configuration
const getFileTypeConfig = (fileType: string) => {
  const configs: Record<string, { bgColor: string; textColor: string }> = {
    'PDF': { bgColor: 'bg-red-600', textColor: 'text-white' },
    'DOCX': { bgColor: 'bg-blue-600', textColor: 'text-white' },
    'XLSX': { bgColor: 'bg-green-600', textColor: 'text-white' },
  };
  return configs[fileType] || { bgColor: 'bg-slate-600', textColor: 'text-white' };
};

interface MobileTechnicalDocsCategoryViewProps {
  category: string;
  onBack: () => void;
}

export default function MobileTechnicalDocsCategoryView({ category, onBack }: MobileTechnicalDocsCategoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Get category info
  const categoryInfo = {
    'Installation Guide': {
      icon: Wrench,
      color: 'purple',
      description: 'Setup and installation instructions',
      count: allDocuments.filter(d => d.category === 'Installation Guide').length,
    },
    'Maintenance Procedure': {
      icon: RefreshCw,
      color: 'orange',
      description: 'Scheduled maintenance and care procedures',
      count: allDocuments.filter(d => d.category === 'Maintenance Procedure').length,
    },
    'Troubleshooting': {
      icon: AlertCircle,
      color: 'red',
      description: 'Common issues and solutions',
      count: allDocuments.filter(d => d.category === 'Troubleshooting').length,
    },
    'Software Update': {
      icon: RefreshCw,
      color: 'blue',
      description: 'Instructions for updating software and firmware',
      count: allDocuments.filter(d => d.category === 'Software Update').length,
    },
    'Compliance Document': {
      icon: Shield,
      color: 'green',
      description: 'Certifications and compliance documentation',
      count: allDocuments.filter(d => d.category === 'Compliance Document').length,
    },
  }[category] || { icon: FileText, color: 'blue', description: '', count: 0 };

  const Icon = categoryInfo.icon;

  // Check if any filters are active
  const hasActiveFilters = selectedProducts.length > 0 || selectedLanguages.length > 0;
  const activeFiltersCount = selectedProducts.length + selectedLanguages.length;

  const clearAllFilters = () => {
    setSelectedProducts([]);
    setSelectedLanguages([]);
  };

  // Filter documents
  const categoryDocuments = allDocuments.filter(doc => doc.category === category);
  
  const filteredDocuments = categoryDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProduct = selectedProducts.length === 0 || selectedProducts.includes(doc.product);
    const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(doc.language);
    
    return matchesSearch && matchesProduct && matchesLanguage;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={`h-10 w-10 rounded-xl bg-${categoryInfo.color}-50 text-${categoryInfo.color}-600 flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-slate-900 leading-tight truncate">{category}</h1>
            <p className="text-xs text-slate-600">{categoryInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="sticky top-14 z-30 bg-white border-b border-slate-200 p-4 space-y-3">
        {/* Search */}
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

        {/* Filter Button */}
        <div className="flex items-center gap-2">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 justify-center gap-2 h-10 rounded-xl">
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-auto bg-[#00a8b5] text-white h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0">
              <SheetHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <SheetTitle>Filters</SheetTitle>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-[#00a8b5] h-8"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetHeader>
              
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 py-4">
                  {/* Product filter */}
                  <div>
                    <h4 className="text-sm text-slate-900 mb-3">Product</h4>
                    <div className="space-y-3">
                      {products.map(product => (
                        <div key={product} className="flex items-center space-x-2">
                          <Checkbox
                            id={`product-${product}`}
                            checked={selectedProducts.includes(product)}
                            onCheckedChange={() => {
                              setSelectedProducts(prev =>
                                prev.includes(product) 
                                  ? prev.filter(p => p !== product) 
                                  : [...prev, product]
                              );
                            }}
                          />
                          <Label htmlFor={`product-${product}`} className="text-sm">
                            {product}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Language filter */}
                  <div>
                    <h4 className="text-sm text-slate-900 mb-3">Language</h4>
                    <div className="space-y-3">
                      {languages.map(language => (
                        <div key={language} className="flex items-center space-x-2">
                          <Checkbox
                            id={`language-${language}`}
                            checked={selectedLanguages.includes(language)}
                            onCheckedChange={() => {
                              setSelectedLanguages(prev =>
                                prev.includes(language) 
                                  ? prev.filter(l => l !== language) 
                                  : [...prev, language]
                              );
                            }}
                          />
                          <Label htmlFor={`language-${language}`} className="text-sm">
                            {language === 'EN' ? 'English' : language}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extra padding at bottom for scrolling */}
                  <div className="h-20" />
                </div>
              </ScrollArea>

              <div className="p-4 bg-white border-t border-slate-200">
                <Button 
                  className="w-full bg-[#00a8b5] hover:bg-[#008a95] h-12 rounded-xl"
                  onClick={() => setFilterOpen(false)}
                >
                  View {filteredDocuments.length} documents
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAllFilters}
              className="h-10 w-10 rounded-xl shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-600">
          Showing {filteredDocuments.length} of {categoryDocuments.length} documents
        </p>
      </div>

      {/* Documents List */}
      <div className="p-4 space-y-4 pb-20">
        {filteredDocuments.map(doc => {
          const fileConfig = getFileTypeConfig(doc.fileType);
          
          return (
            <Card key={doc.id} className="overflow-hidden border-slate-200 shadow-sm">
              {/* File Type Header Stripe */}
              <div className={`h-1.5 ${fileConfig.bgColor}`} />
              
              {/* Thumbnail Section */}
              <div 
                className="relative h-40 bg-slate-100"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(51, 65, 85, 0.6)), url(${doc.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                  <Badge className="bg-white/95 text-slate-900 text-[10px] px-2 py-0.5 shrink-0">
                    {doc.product}
                  </Badge>
                  <Badge className="bg-cyan-500 text-white text-[10px] px-2 py-0.5 shrink-0">
                    {doc.language === 'EN' ? 'English' : doc.language}
                  </Badge>
                </div>
                
                {/* Centered File Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`${fileConfig.bgColor} ${fileConfig.textColor} rounded-2xl p-5 shadow-xl`}>
                    <FileText className="h-14 w-14" strokeWidth={1.5} />
                  </div>
                </div>
                
                {/* File Type Badge */}
                <div className="absolute bottom-3 left-3">
                  <Badge className={`${fileConfig.bgColor} ${fileConfig.textColor} text-[10px] px-2 py-1 flex items-center gap-1`}>
                    <FileText className="h-3 w-3" />
                    {doc.fileType}
                  </Badge>
                </div>
              </div>
              
              {/* Content */}
              <CardContent className="p-4">
                <h3 className="text-slate-900 mb-1.5 line-clamp-2 leading-snug">
                  {doc.title}
                </h3>
                <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                  {doc.description}
                </p>
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-3 pb-3 border-b border-slate-200">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {doc.version}
                  </Badge>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{doc.size}</span>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{doc.pages} pages</span>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{doc.date}</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-xl border-slate-300 gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button className="flex-1 bg-[#00a8b5] hover:bg-[#008a95] h-10 rounded-xl gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl border-slate-300"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-16">
            <div className="rounded-full bg-slate-100 p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-slate-900 mb-2">No documents found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
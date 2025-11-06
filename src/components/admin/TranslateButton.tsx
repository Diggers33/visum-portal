// src/components/admin/TranslateButton.tsx

import { useState } from 'react';
import { Button } from '../ui/button';
import { Languages, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface TranslateButtonProps {
  contentType: 'product' | 'announcement' | 'document';
  contentId: string;
  sourceData: {
    name?: string;
    description?: string;
    short_description?: string;
    features?: string[];
    [key: string]: any;
  };
  onTranslationComplete?: () => void;
}

export function TranslateButton({ 
  contentType, 
  contentId, 
  sourceData,
  onTranslationComplete 
}: TranslateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['de', 'fr', 'es', 'it']);
  const [translationStatus, setTranslationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const languages = [
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'it', name: 'Italian (Italiano)' },
  ];

  const handleTranslate = async () => {
    if (selectedLanguages.length === 0) {
      toast.error('Please select at least one language');
      return;
    }

    setIsTranslating(true);
    setTranslationStatus('idle');

    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          contentType,
          contentId,
          sourceLanguage: 'en',
          targetLanguages: selectedLanguages,
          fields: {
            name: sourceData.name,
            description: sourceData.description,
            short_description: sourceData.short_description,
            features: sourceData.features,
          }
        }
      });

      if (error) throw error;

      setTranslationStatus('success');
      toast.success(`Successfully translated to ${selectedLanguages.length} languages!`);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setTranslationStatus('idle');
        onTranslationComplete?.();
      }, 2000);

    } catch (error: any) {
      console.error('Translation error:', error);
      setTranslationStatus('error');
      toast.error('Translation failed: ' + error.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev => 
      prev.includes(code) 
        ? prev.filter(l => l !== code)
        : [...prev, code]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Languages className="mr-2 h-4 w-4" />
          Auto-Translate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Auto-Translate Content</DialogTitle>
          <DialogDescription>
            Automatically translate this {contentType} to multiple languages using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source content preview */}
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-700">Source Content (English):</h4>
            {sourceData.name && (
              <p className="text-sm text-slate-600"><strong>Name:</strong> {sourceData.name}</p>
            )}
            {sourceData.short_description && (
              <p className="text-sm text-slate-600 line-clamp-2">
                <strong>Description:</strong> {sourceData.short_description}
              </p>
            )}
            {sourceData.features && sourceData.features.length > 0 && (
              <p className="text-sm text-slate-600">
                <strong>Features:</strong> {sourceData.features.length} items
              </p>
            )}
          </div>

          {/* Language selection */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Target Languages:</h4>
            <div className="space-y-2">
              {languages.map(lang => (
                <div key={lang.code} className="flex items-center space-x-2">
                  <Checkbox
                    id={lang.code}
                    checked={selectedLanguages.includes(lang.code)}
                    onCheckedChange={() => toggleLanguage(lang.code)}
                    disabled={isTranslating}
                  />
                  <Label 
                    htmlFor={lang.code} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {lang.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status message */}
          {translationStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Translation completed successfully!</span>
            </div>
          )}
          {translationStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Translation failed. Please try again.</span>
            </div>
          )}

          {/* Cost estimate */}
          <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded">
            <strong>Note:</strong> This will use your translation API quota. 
            Estimated cost: ~${(0.01 * selectedLanguages.length).toFixed(3)} per product.
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isTranslating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleTranslate}
            disabled={isTranslating || selectedLanguages.length === 0}
            className="bg-[#00a8b5] hover:bg-[#008a95]"
          >
            {isTranslating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="mr-2 h-4 w-4" />
                Translate to {selectedLanguages.length} {selectedLanguages.length === 1 ? 'Language' : 'Languages'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Languages, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface TranslateButtonProps {
  contentType: 'product' | 'announcement' | 'document' | 'marketing_asset';
  contentId: string;
  sourceData: {
    name?: string;
    description?: string;
    short_description?: string;
    features?: string;
    title?: string;
    content?: string;
  };
  onTranslationComplete?: () => void;
}

const LANGUAGES = [
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
];

interface TranslationStatus {
  [key: string]: 'pending' | 'translating' | 'success' | 'error';
}

export default function TranslateButton({
  contentType,
  contentId,
  sourceData,
  onTranslationComplete,
}: TranslateButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['de', 'fr', 'es', 'it']);
  const [translating, setTranslating] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>({});
  const [error, setError] = useState<string>('');

  const handleOpen = () => {
    setOpen(true);
    setError('');
    setTranslationStatus({});
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleAutoTranslate = async () => {
    if (selectedLanguages.length === 0) {
      toast.error('Please select at least one language');
      return;
    }

    setTranslating(true);
    setError('');

    const initialStatus: TranslationStatus = {};
    selectedLanguages.forEach((lang) => {
      initialStatus[lang] = 'translating';
    });
    setTranslationStatus(initialStatus);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('translate-content', {
        body: {
          contentType,
          contentId,
          sourceLanguage: 'en',
          targetLanguages: selectedLanguages,
          fields: sourceData,
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Translation failed');
      }

      const finalStatus: TranslationStatus = {};
      selectedLanguages.forEach((lang) => {
        const langResult = data.results?.find((r: any) => r.language === lang);
        finalStatus[lang] = langResult?.success ? 'success' : 'error';
      });
      setTranslationStatus(finalStatus);

      const successCount = Object.values(finalStatus).filter((s) => s === 'success').length;
      toast.success(`Successfully translated to ${successCount} language${successCount > 1 ? 's' : ''}!`);

      if (onTranslationComplete) {
        onTranslationComplete();
      }

      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || 'Failed to translate content. Please try again.');
      
      const errorStatus: TranslationStatus = {};
      selectedLanguages.forEach((lang) => {
        errorStatus[lang] = 'error';
      });
      setTranslationStatus(errorStatus);
      
      toast.error('Translation failed. Check if Edge Function is deployed.');
    } finally {
      setTranslating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'translating':
        return <Loader2 className="h-4 w-4 animate-spin text-[#00a8b5]" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Languages className="h-4 w-4" />
        Translate
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Auto-Translate {
                contentType === 'marketing_asset' ? 'Marketing Asset' :
                contentType === 'product' ? 'Product' :
                contentType === 'announcement' ? 'Announcement' :
                'Document'
              }
            </DialogTitle>
            <DialogDescription>
              Automatically translate this {contentType === 'marketing_asset' ? 'marketing asset' : contentType} using AI. Select target languages and click translate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg space-y-1">
              <div className="text-sm font-medium text-slate-700">Original Content (English):</div>
              <div className="text-sm text-slate-600 truncate">
                {sourceData.name || sourceData.title || 'Unnamed content'}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Languages:</Label>
              <div className="space-y-2">
                {LANGUAGES.map((lang) => (
                  <div key={lang.code} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`lang-${lang.code}`}
                        checked={selectedLanguages.includes(lang.code)}
                        onCheckedChange={() => toggleLanguage(lang.code)}
                        disabled={translating}
                      />
                      <label
                        htmlFor={`lang-${lang.code}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </label>
                    </div>
                    {translationStatus[lang.code] && (
                      <div className="ml-auto">
                        {getStatusIcon(translationStatus[lang.code])}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              </div>
            )}

            {!translating && !error && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-700">
                  <strong>AI Translation:</strong> Content will be automatically translated using DeepL API.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={translating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAutoTranslate}
              disabled={translating || selectedLanguages.length === 0}
              className="bg-[#00a8b5] hover:bg-[#00a8b5]/90"
            >
              {translating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Translating...
                </>
              ) : (
                <>
                  <Languages className="mr-2 h-4 w-4" />
                  Auto-Translate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { supabase } from '../lib/supabase';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = async (langCode: string) => {
    // Change i18n language
    await i18n.changeLanguage(langCode);
    
    // Update user preference in database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('regional_settings')
          .upsert({
            user_id: user.id,
            preferred_language: langCode,
          }, {
            onConflict: 'user_id'
          });
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-slate-100">
          <Globe className="h-5 w-5 text-slate-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={i18n.language === language.code ? 'bg-slate-100' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

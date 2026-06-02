import React from 'react';
import { Check, ChevronDown, Globe, Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircularFlag } from '@/components/ui/circular-flag';
import { getLanguageByCode, SUPPORTED_LANGUAGES } from '@/lib/languageConfig';
import { cn } from '@/lib/utils';

interface Translation {
  id: string;
  language: string;
  slug: string;
  status: string;
}

interface PostLanguageDropdownProps {
  currentLanguage: string;
  translations: Translation[];
  onSelectTranslation: (postId: string) => void;
  onViewAll?: () => void;
}

export const PostLanguageDropdown: React.FC<PostLanguageDropdownProps> = ({
  currentLanguage,
  translations,
  onSelectTranslation,
  onViewAll,
}) => {
  const currentLang = getLanguageByCode(currentLanguage) || getLanguageByCode('en')!;
  const translationCount = translations.length;
  
  // Create a map of available translations
  const translationMap = new Map(translations.map(t => [t.language, t]));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2">
          <CircularFlag countryCode={currentLang.countryCode} size={14} />
          <span className="uppercase text-xs font-medium">{currentLanguage}</span>
          {translationCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              +{translationCount}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-popover border shadow-lg z-50">
        {/* Current language */}
        <DropdownMenuItem disabled className="opacity-100">
          <div className="flex items-center gap-2 w-full">
            <CircularFlag countryCode={currentLang.countryCode} size={16} />
            <span className="flex-1 text-sm">{currentLang.nativeName}</span>
            <Check className="h-4 w-4 text-primary" />
          </div>
        </DropdownMenuItem>

        {translationCount > 0 && <DropdownMenuSeparator />}

        {/* Available translations */}
        {SUPPORTED_LANGUAGES.filter(lang => lang.code !== currentLanguage).map((lang) => {
          const translation = translationMap.get(lang.code);
          const isAvailable = !!translation;
          
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => translation && onSelectTranslation(translation.id)}
              disabled={!isAvailable}
              className={cn(
                "cursor-pointer",
                !isAvailable && "opacity-40"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <CircularFlag countryCode={lang.countryCode} size={16} />
                <span className="flex-1 text-sm">{lang.nativeName}</span>
                {isAvailable && (
                  <Badge 
                    variant={translation.status === 'published' ? 'default' : 'secondary'}
                    className="h-4 px-1 text-[10px]"
                  >
                    {translation.status === 'published' ? '✓' : 'draft'}
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}

        {onViewAll && translationCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onViewAll} className="cursor-pointer">
              <div className="flex items-center gap-2 text-primary">
                <Languages className="h-4 w-4" />
                <span className="text-sm">View All Translations</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Simple badge component for the table when no translations exist
export const LanguageBadge: React.FC<{ language: string }> = ({ language }) => {
  const lang = getLanguageByCode(language) || getLanguageByCode('en')!;
  
  return (
    <div className="flex items-center gap-1.5">
      <CircularFlag countryCode={lang.countryCode} size={14} />
      <span className="uppercase text-xs font-medium text-muted-foreground">{language}</span>
    </div>
  );
};

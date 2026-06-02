import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Translation {
  language: string;
  slug: string;
}

interface LanguageSwitcherProps {
  currentLang: string;
  currentSlug: string;
  parentPostId?: string | null;
  postId?: string;
}

const LANGUAGE_NAMES: Record<string, { name: string; native: string }> = {
  en: { name: 'English', native: 'English' },
  es: { name: 'Spanish', native: 'Español' },
  pt: { name: 'Portuguese', native: 'Português' },
  zh: { name: 'Chinese', native: '中文' },
  vi: { name: 'Vietnamese', native: 'Tiếng Việt' },
  ko: { name: 'Korean', native: '한국어' },
  hi: { name: 'Hindi', native: 'हिन्दी' },
  ar: { name: 'Arabic', native: 'العربية' },
  fr: { name: 'French', native: 'Français' },
  de: { name: 'German', native: 'Deutsch' },
  it: { name: 'Italian', native: 'Italiano' },
  ja: { name: 'Japanese', native: '日本語' },
  ru: { name: 'Russian', native: 'Русский' },
};

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLang,
  currentSlug,
  parentPostId,
  postId,
}) => {
  const navigate = useNavigate();

  // Get all translations for this post
  const { data: translations = [] } = useQuery({
    queryKey: ['blog-translations', parentPostId, postId],
    queryFn: async () => {
      // If this is the English original, get translations
      // If this is a translation, get siblings + parent
      const results: Translation[] = [];

      if (currentLang === 'en' && postId) {
        // This is the original - get all translations
        const { data: children } = await supabase
          .from('blog_posts')
          .select('language, slug')
          .eq('parent_post_id', postId)
          .eq('status', 'published');

        if (children) {
          results.push({ language: 'en', slug: currentSlug });
          results.push(...children.map(c => ({ language: c.language || 'en', slug: c.slug })));
        }
      } else if (parentPostId) {
        // This is a translation - get parent + siblings
        const { data: parent } = await supabase
          .from('blog_posts')
          .select('language, slug')
          .eq('id', parentPostId)
          .eq('status', 'published')
          .single();

        if (parent) {
          results.push({ language: parent.language || 'en', slug: parent.slug });
        }

        const { data: siblings } = await supabase
          .from('blog_posts')
          .select('language, slug')
          .eq('parent_post_id', parentPostId)
          .eq('status', 'published');

        if (siblings) {
          results.push(...siblings.map(s => ({ language: s.language || 'en', slug: s.slug })));
        }
      }

      return results;
    },
    enabled: !!postId || !!parentPostId,
  });

  // Don't show if only one language available
  if (translations.length <= 1) {
    return null;
  }

  const handleLanguageChange = (translation: Translation) => {
    navigate(`/blog/${translation.slug}`);
  };

  const currentLanguageInfo = LANGUAGE_NAMES[currentLang] || { name: currentLang, native: currentLang };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {currentLanguageInfo.native}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {translations.map((translation) => {
          const langInfo = LANGUAGE_NAMES[translation.language] || { 
            name: translation.language, 
            native: translation.language 
          };
          const isActive = translation.language === currentLang;

          return (
            <DropdownMenuItem
              key={translation.language}
              onClick={() => handleLanguageChange(translation)}
              className={isActive ? 'bg-muted' : ''}
            >
              <span className="font-medium">{langInfo.native}</span>
              <span className="ml-2 text-muted-foreground text-sm">
                ({langInfo.name})
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

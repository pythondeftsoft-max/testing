import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircularFlag } from '@/components/ui/circular-flag';
import { SUPPORTED_LANGUAGES } from '@/lib/languageConfig';
import { cn } from '@/lib/utils';

interface BlogLanguageSelectorProps {
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
  disabled?: boolean;
}

export const BlogLanguageSelector: React.FC<BlogLanguageSelectorProps> = ({
  selectedLanguages,
  onLanguagesChange,
  disabled = false,
}) => {
  const handleToggle = (code: string) => {
    if (code === 'en') return; // English is always selected
    
    if (selectedLanguages.includes(code)) {
      onLanguagesChange(selectedLanguages.filter(l => l !== code));
    } else {
      onLanguagesChange([...selectedLanguages, code]);
    }
  };

  const selectAll = () => {
    onLanguagesChange(SUPPORTED_LANGUAGES.map(l => l.code));
  };

  const clearAll = () => {
    onLanguagesChange(['en']); // Keep English
  };

  const nonEnglishLanguages = SUPPORTED_LANGUAGES.filter(l => l.code !== 'en');
  const selectedCount = selectedLanguages.filter(l => l !== 'en').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Publish Languages</Label>
        {selectedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedCount} translation{selectedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <ScrollArea className="h-48 rounded-md border p-2">
        <div className="space-y-2">
          {/* English - always checked */}
          <div className="flex items-center gap-2 p-1.5 rounded bg-primary/5 border border-primary/20">
            <Checkbox 
              checked={true} 
              disabled 
              className="opacity-70"
            />
            <CircularFlag countryCode="GB" size={16} />
            <span className="text-sm flex-1">English</span>
            <span className="text-[10px] text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
              primary
            </span>
          </div>

          {/* Other languages */}
          {nonEnglishLanguages.map((language) => (
            <div 
              key={language.code}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors",
                selectedLanguages.includes(language.code) && "bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && handleToggle(language.code)}
            >
              <Checkbox 
                checked={selectedLanguages.includes(language.code)}
                disabled={disabled}
                onCheckedChange={() => handleToggle(language.code)}
              />
              <CircularFlag countryCode={language.countryCode} size={16} />
              <span className="text-sm flex-1">{language.nativeName}</span>
              <span className="text-[10px] text-muted-foreground uppercase">
                {language.code}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={selectAll}
          disabled={disabled}
          className="flex-1 text-xs"
        >
          Select All
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={clearAll}
          disabled={disabled || selectedCount === 0}
          className="flex-1 text-xs"
        >
          Clear All
        </Button>
      </div>

      {selectedCount > 0 && (
        <p className="text-[10px] text-muted-foreground">
          ℹ️ Translations will be auto-generated using AI when you publish
        </p>
      )}
    </div>
  );
};

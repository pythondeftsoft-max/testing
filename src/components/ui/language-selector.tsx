import React from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CircularFlag } from '@/components/ui/circular-flag';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '@/lib/languageConfig';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  value?: string;
  onValueChange?: (code: string) => void;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onValueChange,
  className,
  showIcon = true,
  compact = false,
}) => {
  const { language, setLanguage } = useLanguage();

  const currentValue = value ?? language;
  const currentLanguage = getLanguageByCode(currentValue) || getLanguageByCode('en')!;

  // Switch language directly without confirmation dialog
  const handleSelect = (code: string) => {
    if (code === currentValue) return;
    setLanguage(code);
    if (onValueChange) {
      onValueChange(code);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "gap-2 border-border/50 hover:bg-accent/50",
            compact && "h-8 px-2",
            className
          )}
        >
          {showIcon && <Globe className="h-4 w-4 text-muted-foreground" />}
          <CircularFlag countryCode={currentLanguage.countryCode} size={compact ? 16 : 20} />
          <span className="font-medium uppercase text-xs">{currentLanguage.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 max-h-80 overflow-y-auto bg-popover border border-border shadow-lg z-[100]"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleSelect(language.code)}
            className={cn(
              "flex items-center gap-3 cursor-pointer py-2.5",
              currentValue === language.code && "bg-accent"
            )}
          >
            <CircularFlag countryCode={language.countryCode} size={20} />
            <span className="flex-1 font-medium">{language.nativeName}</span>
            <span className="text-xs text-muted-foreground uppercase">{language.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;

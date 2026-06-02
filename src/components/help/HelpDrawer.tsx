import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { resolveHelpEntry, HELP_ENTRIES } from './helpContent';

interface HelpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Renders a markdown-lite body: bold via **text**, bullets via "- " */
function renderBody(body: string) {
  return body.split('\n').map((line, i) => {
    if (line.trim().startsWith('- ')) {
      return (
        <li key={i} className="text-sm text-muted-foreground ml-4 list-disc">
          {renderInline(line.trim().slice(2))}
        </li>
      );
    }
    if (!line.trim()) return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-sm text-foreground/90">
        {renderInline(line)}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const HelpDrawer: React.FC<HelpDrawerProps> = ({ open, onOpenChange }) => {
  const { pathname } = useLocation();
  const primary = resolveHelpEntry(pathname);
  const others = HELP_ENTRIES.filter((e) => e !== primary && e.match !== '*');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{primary.title}</SheetTitle>
            <Badge variant="secondary" className="capitalize">
              {primary.role}
            </Badge>
          </div>
          <SheetDescription>
            Quick guide for the screen you're on.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-10rem)] mt-6 pr-4">
          <div className="space-y-2">{renderBody(primary.body)}</div>

          {others.length > 0 && (
            <div className="mt-8 border-t pt-4">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                Other modules
              </h4>
              <div className="space-y-4">
                {others.map((entry) => (
                  <details key={entry.match} className="group">
                    <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary">
                      {entry.title}
                    </summary>
                    <div className="mt-2 pl-2 space-y-1">
                      {renderBody(entry.body)}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default HelpDrawer;

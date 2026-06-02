import React from 'react';
import { MoreVertical, Star, Trash2, RefreshCw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface WidgetActionsMenuProps {
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onRegenerate?: () => void;
  className?: string;
}

export const WidgetActionsMenu: React.FC<WidgetActionsMenuProps> = ({
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
  className = '',
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Star Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`h-6 w-6 p-0 transition-all duration-200 hover:bg-transparent ${
          isFavorited 
            ? 'text-openkey-gold hover:text-openkey-gold/80' 
            : 'text-muted-foreground hover:text-openkey-gold'
        }`}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
      </Button>

      {/* 3-Dot Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="flex items-center gap-2"
          >
            <Star className={`h-4 w-4 ${isFavorited ? 'fill-current text-openkey-gold' : ''}`} />
            {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {onRegenerate && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate with New Data
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Remove from Dashboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
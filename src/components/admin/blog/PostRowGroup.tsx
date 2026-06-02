import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TableRow, TableCell } from '@/components/ui/table';
import { PostRowActions } from './PostRowActions';
import { CircularFlag } from '@/components/ui/circular-flag';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Language to country code mapping for CircularFlag
const languageToCountry: Record<string, string> = {
  en: 'GB',
  es: 'ES',
  pt: 'BR',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  vi: 'VN',
  zh: 'CN',
  ja: 'JP',
  ko: 'KR',
  hi: 'IN',
  ru: 'RU',
  ar: 'SA',
};

interface Translation {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: string;
  view_count: number | null;
  created_at: string;
  scheduled_publish_at?: string | null;
}

interface PostWithTranslations {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: string;
  view_count: number | null;
  created_at: string;
  translations: Translation[];
  totalViews: number;
}

interface PostRowGroupProps {
  post: PostWithTranslations;
  isExpanded: boolean;
  onToggle: () => void;
  onView: (slug: string) => void;
  onAnalytics: (post: any) => void;
  onEdit: (post: any) => void;
  onDelete: (postId: string) => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    published: 'bg-success/10 text-success border-success/20',
    draft: 'bg-muted text-muted-foreground border-muted',
    scheduled: 'bg-info/10 text-info border-info/20',
  };
  return variants[status] || 'bg-muted text-muted-foreground';
};

export const PostRowGroup = ({
  post,
  isExpanded,
  onToggle,
  onView,
  onAnalytics,
  onEdit,
  onDelete,
}: PostRowGroupProps) => {
  const hasTranslations = post.translations.length > 0;
  const totalLanguages = 1 + post.translations.length;

  if (!hasTranslations) {
    return (
      <TableRow className="hover:bg-muted/30">
        <TableCell />
        <TableCell>
          <div className="flex items-center gap-2">
            <CircularFlag countryCode={languageToCountry[post.language || 'en']} size={18} />
            <span className="font-medium truncate">{post.title}</span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-xs text-muted-foreground uppercase">{post.language || 'en'}</span>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('text-xs', getStatusBadge(post.status))}>
            {post.status}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </TableCell>
        <TableCell className="text-sm">{post.view_count || 0}</TableCell>
        <TableCell>
          <PostRowActions
            post={post}
            onView={() => onView(post.slug)}
            onAnalytics={() => onAnalytics(post)}
            onEdit={() => onEdit(post)}
            onDelete={() => onDelete(post.id)}
          />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      {/* Parent Row */}
      <TableRow className="hover:bg-muted/30 bg-card">
        <TableCell>
          <CollapsibleTrigger asChild>
            <button className="p-1 hover:bg-muted rounded transition-colors">
              <ChevronRight 
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} 
              />
            </button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <CircularFlag countryCode={languageToCountry[post.language || 'en']} size={18} />
            <span className="font-semibold truncate">{post.title}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {totalLanguages} langs
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('text-xs', getStatusBadge(post.status))}>
            {post.status}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </TableCell>
        <TableCell>
          <span className="text-sm font-medium">{post.totalViews}</span>
        </TableCell>
        <TableCell>
          <PostRowActions
            post={post}
            onView={() => onView(post.slug)}
            onAnalytics={() => onAnalytics(post)}
            onEdit={() => onEdit(post)}
            onDelete={() => onDelete(post.id)}
            isParentWithTranslations={hasTranslations}
          />
        </TableCell>
      </TableRow>

      {/* Expanded Child Rows - translations only, parent already shown above */}
      <CollapsibleContent asChild>
        <>
          {post.translations.map((translation) => (
            <TableRow 
              key={translation.id} 
              className="bg-muted/20 hover:bg-muted/40"
            >
              <TableCell />
              <TableCell>
                <div className="flex items-center gap-2 pl-4">
                  <CircularFlag 
                    countryCode={languageToCountry[translation.language] || 'GB'} 
                    size={16} 
                  />
                  <span className="text-sm truncate">{translation.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground uppercase">
                  {translation.language || 'en'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('text-xs', getStatusBadge(translation.status))}>
                  {translation.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(translation.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-sm">{translation.view_count || 0}</TableCell>
              <TableCell>
                <PostRowActions
                  post={translation}
                  onView={() => onView(translation.slug)}
                  onEdit={() => onEdit(translation)}
                  onDelete={() => onDelete(translation.id)}
                  showAnalytics={false}
                />
              </TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
};

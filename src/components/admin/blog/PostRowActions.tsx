import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, BarChart3, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PostRowActionsProps {
  post: {
    id: string;
    title: string;
    slug: string;
    language?: string;
  };
  onView: () => void;
  onAnalytics?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showAnalytics?: boolean;
  isParentWithTranslations?: boolean;
}

export const PostRowActions = ({
  post,
  onView,
  onAnalytics,
  onEdit,
  onDelete,
  showAnalytics = true,
  isParentWithTranslations = false,
}: PostRowActionsProps) => {
  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onView}
        title="View Post"
        className="h-8 w-8 p-0"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {showAnalytics && onAnalytics && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAnalytics}
          title="View Analytics"
          className="h-8 w-8 p-0"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        title="Edit Post"
        className="h-8 w-8 p-0"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" title="Delete Post" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              {isParentWithTranslations ? (
                <>
                  Are you sure you want to delete "{post.title}"? 
                  <span className="block mt-2 text-destructive font-medium">
                    ⚠️ This will also delete all translations of this post.
                  </span>
                </>
              ) : (
                <>Are you sure you want to delete "{post.title}"? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              {isParentWithTranslations ? 'Delete All' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

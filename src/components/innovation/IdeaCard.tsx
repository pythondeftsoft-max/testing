import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  ExternalLink, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles,
  TrendingUp,
  Wrench,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InnovationIdea, CATEGORY_OPTIONS, STATUS_OPTIONS, PLATFORM_OPTIONS } from '@/types/innovation';

interface IdeaCardProps {
  idea: InnovationIdea;
  onApprove: (idea: InnovationIdea) => void;
  onReject: (idea: InnovationIdea) => void;
  onDelete: (idea: InnovationIdea) => void;
  onViewDetails: (idea: InnovationIdea) => void;
}

export function IdeaCard({ idea, onApprove, onReject, onDelete, onViewDetails }: IdeaCardProps) {
  const categoryConfig = CATEGORY_OPTIONS.find(c => c.value === idea.category);
  const statusConfig = STATUS_OPTIONS.find(s => s.value === idea.status);
  const platformConfig = PLATFORM_OPTIONS.find(p => p.value === idea.source_platform);

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400';
    if (score >= 8) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {platformConfig && (
                <span className="text-lg" title={platformConfig.label}>
                  {platformConfig.icon}
                </span>
              )}
              <h3 className="font-semibold text-lg">
                {idea.tool_name || 'Pending Analysis'}
              </h3>
              {statusConfig && (
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(idea)}>
                View Details
              </DropdownMenuItem>
              {idea.source_url && (
                <DropdownMenuItem asChild>
                  <a href={idea.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Source
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(idea)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description or Applicability */}
        <p className="text-sm text-gray-600 line-clamp-2">
          {idea.applicability || idea.raw_description || 'No description available'}
        </p>

        {/* Category */}
        {categoryConfig && (
          <Badge variant="outline" className={categoryConfig.color}>
            {categoryConfig.label}
          </Badge>
        )}

        {/* Scores */}
        {(idea.impact_score || idea.effort_score) && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className={`h-4 w-4 ${getScoreColor(idea.impact_score)}`} />
              <span className="text-muted-foreground">Impact:</span>
              <span className={`font-semibold ${getScoreColor(idea.impact_score)}`}>
                {idea.impact_score}/10
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Wrench className={`h-4 w-4 ${getScoreColor(idea.effort_score ? 11 - idea.effort_score : null)}`} />
              <span className="text-muted-foreground">Effort:</span>
              <span className={`font-semibold ${getScoreColor(idea.effort_score ? 11 - idea.effort_score : null)}`}>
                {idea.effort_score}/10
              </span>
            </div>
          </div>
        )}

        {/* AI Analysis Preview */}
        {idea.ai_analysis?.summary && (
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-700 text-sm font-medium mb-1">
              <Sparkles className="h-4 w-4" />
              AI Analysis
            </div>
            <p className="text-sm text-purple-900 line-clamp-2">
              {idea.ai_analysis.summary}
            </p>
          </div>
        )}

        {/* Actions */}
        {idea.status === 'analyzed' && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              onClick={() => onApprove(idea)}
              className="flex-1 gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Approve & Create Task
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onReject(idea)}
              className="gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}

        {idea.status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Waiting for n8n to process...
          </div>
        )}

        {idea.status === 'analyzing' && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            <Sparkles className="h-4 w-4 animate-spin" />
            AI is analyzing...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

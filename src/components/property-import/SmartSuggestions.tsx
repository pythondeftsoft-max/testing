import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, ChevronDown, ChevronUp, Wand2, CheckCircle, AlertCircle } from 'lucide-react';
import { AddressProcessingResult, PropertyImportData } from '@/types/propertyImport';

interface SmartSuggestionsProps {
  addressProcessingResult: AddressProcessingResult;
  importData: PropertyImportData[];
  onApplyBulkSuggestion: (suggestionType: string, rowIndices: number[]) => void;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  addressProcessingResult,
  importData,
  onApplyBulkSuggestion
}) => {
  const [expanded, setExpanded] = useState(false);
  const { row_results } = addressProcessingResult;

  const getActionForSuggestion = (improvement: string): string => {
    if (improvement.includes('property type')) return 'Apply AI-detected property types';
    if (improvement.includes('duplicate')) return 'Review and merge duplicates';
    if (improvement.includes('address')) return 'Standardize addresses';
    if (improvement.includes('rent')) return 'Validate rent amounts';
    return 'Apply suggestion';
  };

  // Group suggestions by type and priority
  const groupedSuggestions = React.useMemo(() => {
    const suggestions: Record<string, {
      type: string;
      rows: number[];
      priority: 'low' | 'medium' | 'high';
      description: string;
      action: string;
    }> = {};

    row_results.forEach((result, index) => {
      if (result.ai_suggestions?.improvements) {
        result.ai_suggestions.improvements.forEach(improvement => {
          const suggestionKey = improvement.toLowerCase().replace(/\s+/g, '_');
          
          if (!suggestions[suggestionKey]) {
            suggestions[suggestionKey] = {
              type: suggestionKey,
              rows: [],
              priority: result.ai_suggestions!.priority,
              description: improvement,
              action: getActionForSuggestion(improvement)
            };
          }
          
          suggestions[suggestionKey].rows.push(index);
        });
      }
    });

    return Object.values(suggestions).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [row_results]);


  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getPriorityIcon = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Lightbulb className="h-3 w-3" />;
      case 'low': return <CheckCircle className="h-3 w-3" />;
    }
  };

  if (groupedSuggestions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Great! No improvement suggestions needed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-primary" />
                Smart Suggestions
                <Badge variant="secondary" className="ml-2">
                  {groupedSuggestions.length}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  AI-powered improvements
                </span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <Card>
          <CardContent className="pt-4 space-y-3">
            {groupedSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getPriorityColor(suggestion.priority)} className="gap-1">
                      {getPriorityIcon(suggestion.priority)}
                      {suggestion.priority.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {suggestion.rows.length} row{suggestion.rows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{suggestion.description}</p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 ml-4"
                  onClick={() => onApplyBulkSuggestion(suggestion.type, suggestion.rows)}
                >
                  <Wand2 className="h-3 w-3" />
                  {suggestion.action}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SmartSuggestions;
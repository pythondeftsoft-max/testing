import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Target
} from 'lucide-react';
import type { ProcessingRowResult, FieldConfidence } from '@/types/propertyImport';
import { cn } from '@/lib/utils';

interface EnhancedMappingTabProps {
  row: ProcessingRowResult;
  onFieldMap?: (originalField: string, targetField: string) => void;
  onBulkMap?: (mappings: Record<string, string>) => void;
}

const SCHEMA_FIELDS = [
  'street_address',
  'city', 
  'state',
  'zipcode',
  'property_type',
  'bedrooms',
  'bathrooms',
  'square_feet',
  'lot_size',
  'year_built',
  'price',
  'mls_number'
];

export function EnhancedMappingTab({ row, onFieldMap, onBulkMap }: EnhancedMappingTabProps) {
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  
  const fieldConfidences = (row as any).schema_map?.field_confidences || [];
  const unmappedFields = (row as any).schema_map?.unmapped_fields || [];
  
  const confidenceByField = fieldConfidences.reduce((acc, conf) => {
    acc[conf.field] = conf;
    return acc;
  }, {} as Record<string, FieldConfidence>);

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.9) return { level: 'high', color: 'default' };
    if (confidence >= 0.6) return { level: 'medium', color: 'secondary' };
    return { level: 'low', color: 'destructive' };
  };

  const handleFieldMapping = (originalField: string, targetField: string) => {
    setPendingMappings(prev => ({ ...prev, [originalField]: targetField }));
  };

  const applyPendingMappings = () => {
    onBulkMap?.(pendingMappings);
    setPendingMappings({});
  };

  const getSuggestedMappings = () => {
    const suggestions: Record<string, string> = {};
    unmappedFields.forEach(field => {
      const suggestion = getSuggestedMapping(field);
      if (suggestion) {
        suggestions[field] = suggestion;
      }
    });
    return suggestions;
  };

  const applyAllSuggestions = () => {
    const suggestions = getSuggestedMappings();
    onBulkMap?.(suggestions);
  };

  const mappedFieldsCount = fieldConfidences.length;
  const totalFields = mappedFieldsCount + unmappedFields.length;
  const mappingProgress = totalFields > 0 ? (mappedFieldsCount / totalFields) * 100 : 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="text-sm font-medium">Field Mapping</span>
        </div>
        {Object.keys(getSuggestedMappings()).length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={applyAllSuggestions}
            className="h-7 text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Map All Similar
          </Button>
        )}
      </div>

      {/* Mapping Progress */}
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Mapping Progress</span>
          <span className="text-xs text-muted-foreground">
            {mappedFieldsCount}/{totalFields} fields
          </span>
        </div>
        <Progress value={mappingProgress} className="h-2" />
      </Card>

      {/* Mapped Fields */}
      {fieldConfidences.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Mapped Fields ({fieldConfidences.length})
          </div>
          
          {fieldConfidences.map((confidence, index) => {
            const { level, color } = getConfidenceLevel(confidence.confidence);
            
            return (
              <MappedFieldCard
                key={`mapped-${index}`}
                confidence={confidence}
                level={level}
                color={color}
              />
            );
          })}
        </div>
      )}

      {/* Unmapped Fields */}
      {unmappedFields.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Unmapped Fields ({unmappedFields.length})
          </div>
          
          {unmappedFields.map((field, index) => (
            <UnmappedFieldCard
              key={`unmapped-${index}`}
              field={field}
              suggestion={getSuggestedMapping(field)}
              pendingMapping={pendingMappings[field]}
              onMap={handleFieldMapping}
            />
          ))}
        </div>
      )}

      {/* Apply Pending Mappings */}
      {Object.keys(pendingMappings).length > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {Object.keys(pendingMappings).length} pending mappings
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={applyPendingMappings}
              className="h-7 text-xs"
            >
              Apply All
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function MappedFieldCard({ 
  confidence, 
  level, 
  color 
}: { 
  confidence: any; 
  level: string; 
  color: string; 
}) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-sm font-medium">{confidence.field}</span>
        </div>
        <Badge variant={color as any} className="text-xs">
          {Math.round(confidence.confidence * 100)}%
        </Badge>
      </div>
      
      {confidence.mapped_to && (
        <div className="text-xs text-muted-foreground">
          → {confidence.mapped_to}
        </div>
      )}
      
      <Progress value={confidence.confidence * 100} className="h-1" />
      
      {confidence.rationale && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          {confidence.rationale}
        </div>
      )}
    </Card>
  );
}

function UnmappedFieldCard({ 
  field, 
  suggestion, 
  pendingMapping, 
  onMap 
}: {
  field: string;
  suggestion?: string;
  pendingMapping?: string;
  onMap: (field: string, target: string) => void;
}) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">{field}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          Unmapped
        </Badge>
      </div>

      {suggestion && (
        <div className="flex items-center gap-2 text-xs text-primary">
          <Target className="h-3 w-3" />
          Suggested: {suggestion}
        </div>
      )}

      <Select
        value={pendingMapping || ''}
        onValueChange={(value) => onMap(field, value)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select target field..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">-- Select Field --</SelectItem>
          {SCHEMA_FIELDS.map(schemaField => (
            <SelectItem key={schemaField} value={schemaField}>
              {schemaField.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {suggestion && !pendingMapping && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMap(field, suggestion)}
          className="h-6 text-xs w-full"
        >
          Use Suggestion
        </Button>
      )}
    </Card>
  );
}

function getSuggestedMapping(field: string): string | undefined {
  const fieldLower = field.toLowerCase();
  
  const mappings: Record<string, string> = {
    'addr': 'street_address',
    'address': 'street_address',
    'street': 'street_address',
    'zip': 'zipcode',
    'postal': 'zipcode',
    'postal_code': 'zipcode',
    'beds': 'bedrooms',
    'bed': 'bedrooms',
    'baths': 'bathrooms',
    'bath': 'bathrooms',
    'sqft': 'square_feet',
    'sq_ft': 'square_feet',
    'size': 'square_feet',
    'lot': 'lot_size',
    'built': 'year_built',
    'year': 'year_built',
    'type': 'property_type',
    'mls': 'mls_number'
  };

  for (const [pattern, target] of Object.entries(mappings)) {
    if (fieldLower.includes(pattern)) {
      return target;
    }
  }

  return undefined;
}
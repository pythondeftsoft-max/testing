import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, AlertTriangle, Edit, Save, X, Brain, TrendingUp } from 'lucide-react';
import { ProcessingRowResult, PropertyImportData } from '@/types/propertyImport';

interface ProcessingResultsTableProps {
  results: ProcessingRowResult[];
  onUpdateRow: (rowNumber: number, updatedData: PropertyImportData) => void;
  onReprocessRow: (rowNumber: number) => void;
}

const ProcessingResultsTable = ({ results, onUpdateRow, onReprocessRow }: ProcessingResultsTableProps) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<PropertyImportData | null>(null);

  const handleEdit = (row: ProcessingRowResult) => {
    setEditingRow(row.row_number);
    setEditData({ ...row.original_data });
  };

  const handleSave = () => {
    if (editingRow && editData) {
      onUpdateRow(editingRow, editData);
      setEditingRow(null);
      setEditData(null);
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditData(null);
  };

  const updateField = (field: keyof PropertyImportData, value: string) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      failed: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>AI Insights</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.row_number} className={result.status === 'failed' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                  <TableCell>{result.row_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      {getStatusBadge(result.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingRow === result.row_number ? (
                      <div className="space-y-2">
                        <Input
                          value={editData?.street_address || ''}
                          onChange={(e) => updateField('street_address', e.target.value)}
                          placeholder="Street Address"
                          className="text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            value={editData?.city || ''}
                            onChange={(e) => updateField('city', e.target.value)}
                            placeholder="City"
                            className="text-sm"
                          />
                          <Input
                            value={editData?.state || ''}
                            onChange={(e) => updateField('state', e.target.value)}
                            placeholder="State"
                            className="text-sm"
                            maxLength={2}
                          />
                          <Input
                            value={editData?.zipcode || ''}
                            onChange={(e) => updateField('zipcode', e.target.value)}
                            placeholder="ZIP"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <div className="font-medium">{result.original_data.street_address}</div>
                        <div className="text-muted-foreground">
                          {result.original_data.city}, {result.original_data.state} {result.original_data.zipcode}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      {result.processed_data?.ai_insights?.property_type_detection && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs">
                              <Brain className="h-3 w-3 text-primary" />
                              <span className="font-medium">
                                {result.processed_data.ai_insights.property_type_detection.detected_type}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(result.processed_data.ai_insights.property_type_detection.confidence * 100)}%
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{result.processed_data.ai_insights.property_type_detection.reasoning}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {result.processed_data?.ai_insights?.data_quality_assessment && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs">
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              <span>Quality:</span>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(result.processed_data.ai_insights.data_quality_assessment.accuracy_score * 100)}%
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p>Completeness: {Math.round(result.processed_data.ai_insights.data_quality_assessment.completeness_score * 100)}%</p>
                              <p>Accuracy: {Math.round(result.processed_data.ai_insights.data_quality_assessment.accuracy_score * 100)}%</p>
                              <p>Consistency: {Math.round(result.processed_data.ai_insights.data_quality_assessment.consistency_score * 100)}%</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {result.processed_data?.ai_insights?.duplicate_analysis?.is_likely_duplicate && (
                        <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                          Possible Duplicate
                        </Badge>
                      )}
                      
                      {result.ai_suggestions && result.ai_suggestions.improvements.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                result.ai_suggestions.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                result.ai_suggestions.priority === 'medium' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {result.ai_suggestions.improvements.length} suggestions
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {result.ai_suggestions.improvements.slice(0, 3).map((suggestion, index) => (
                                <p key={index} className="text-xs">• {suggestion}</p>
                              ))}
                              {result.ai_suggestions.improvements.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{result.ai_suggestions.improvements.length - 3} more...
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {result.errors?.map((error, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {error}
                        </Badge>
                      ))}
                      {result.warnings?.map((warning, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {warning}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingRow === result.row_number ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={handleSave}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : result.status === 'failed' ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(result)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProcessingResultsTable;
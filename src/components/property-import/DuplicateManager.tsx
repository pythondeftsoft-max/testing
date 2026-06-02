
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Copy, ArrowRight, Merge, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { AddressProcessingResult, PropertyImportData } from '@/types/propertyImport';

interface DuplicateManagerProps {
  addressProcessingResult: AddressProcessingResult;
  importData: PropertyImportData[];
  onMergeDuplicates: (groupKey: string, keepIndex: number, removeIndices: number[]) => void;
  onSeparateDuplicates: (groupKey: string, rowIndex: number) => void;
}

const DuplicateManager: React.FC<DuplicateManagerProps> = ({
  addressProcessingResult,
  importData,
  onMergeDuplicates,
  onSeparateDuplicates
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { address_groups, row_results } = addressProcessingResult;

  // Filter groups that have more than one row (potential duplicates)
  const duplicateGroups = Object.entries(address_groups).filter(([_, rowIndices]) => rowIndices.length > 1);

  if (duplicateGroups.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Copy className="h-5 w-5" />
            No Duplicates Found
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              ✓ Clean import
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600 dark:text-green-400">
            All properties have unique addresses. Your import is ready to proceed.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDuplicateProbability = (groupKey: string): number => {
    const rowIndices = address_groups[groupKey];
    const aiResults = rowIndices.map(index => row_results[index]).filter(Boolean);
    
    // Calculate probability based on AI insights
    const duplicateCount = aiResults.reduce((count, result) => {
      if (result.ai_suggestions?.improvements.some(imp => imp.includes('duplicate'))) {
        return count + 1;
      }
      return count;
    }, 0);
    
    return duplicateCount > 0 ? Math.min(95, 60 + (duplicateCount * 15)) : 85; // Higher default for imports
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 85) return 'text-red-600';
    if (probability >= 70) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getProbabilityBadge = (probability: number) => {
    if (probability >= 85) return <Badge variant="destructive">Very Likely</Badge>;
    if (probability >= 70) return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Likely</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Possible</Badge>;
  };

  const hasUnitNumbers = (rowIndices: number[]) => {
    return rowIndices.some(index => importData[index]?.unit_number);
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5" />
            Duplicate Detection - Action Required
            <Badge variant="destructive">{duplicateGroups.length} groups found</Badge>
          </CardTitle>
        </div>
        <p className="text-sm text-orange-600 dark:text-orange-400">
          We found potential duplicates in your import. Please review and resolve them before proceeding.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {duplicateGroups.map(([groupKey, rowIndices]) => {
          const probability = getDuplicateProbability(groupKey);
          const firstRow = importData[rowIndices[0]];
          const isMultiUnit = hasUnitNumbers(rowIndices);
          
          return (
            <div key={groupKey} className="border border-orange-200 rounded-lg p-3 bg-white dark:bg-gray-900 dark:border-orange-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {firstRow?.street_address || 'Unknown Address'}
                  </span>
                  {getProbabilityBadge(probability)}
                  <span className={`text-xs ${getProbabilityColor(probability)}`}>
                    {probability}% match
                  </span>
                  {isMultiUnit && (
                    <Badge variant="outline" className="text-xs">
                      Multi-Unit
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {rowIndices.length} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Review Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Duplicate Group Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        {rowIndices.map((rowIndex, index) => {
                          const row = importData[rowIndex];
                          const aiResult = row_results[rowIndex];
                          
                          return (
                            <div key={rowIndex} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Row {rowIndex + 1}</span>
                                {aiResult?.ai_suggestions && (
                                  <Badge variant="outline">
                                    {Math.round(aiResult.ai_suggestions.confidence * 100)}% confidence
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><strong>Address:</strong> {row?.street_address}</div>
                                <div><strong>City:</strong> {row?.city}</div>
                                <div><strong>Type:</strong> {row?.property_type || 'Not specified'}</div>
                                <div><strong>Rent:</strong> ${row?.monthly_rent || 'N/A'}</div>
                                {row?.unit_number && (
                                  <>
                                    <div><strong>Unit:</strong> {row.unit_number}</div>
                                    <div><strong>Bedrooms:</strong> {row?.bedrooms || 'N/A'}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
                        <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                          Resolution Options
                        </h4>
                        <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">
                          {isMultiUnit ? (
                            'This appears to be a multi-unit property. If these are separate units at the same address, merge them into one property with multiple units.'
                          ) : (
                            'These entries have the same address. For single-family properties, this is likely a duplicate that should be merged.'
                          )}
                        </p>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => onSeparateDuplicates(groupKey, rowIndices[0])}
                            className="flex-1"
                          >
                            Mark as Separate Properties
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="gap-2 flex-1">
                                <Merge className="h-4 w-4" />
                                Merge as {isMultiUnit ? 'Multi-Unit Property' : 'Single Property'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Merge {isMultiUnit ? 'Multi-Unit Property' : 'Duplicate Properties'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {isMultiUnit ? (
                                    <>This will create one property with {rowIndices.length} units. Each row will become a separate unit within the property.</>
                                  ) : (
                                    <>This will keep the first entry and remove {rowIndices.length - 1} duplicate{rowIndices.length > 2 ? 's' : ''}. This action cannot be undone.</>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onMergeDuplicates(groupKey, rowIndices[0], rowIndices.slice(1))}
                                >
                                  Merge {isMultiUnit ? 'Units' : 'Properties'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => onSeparateDuplicates(groupKey, rowIndices[0])}
                >
                  <ArrowRight className="h-3 w-3" />
                  Separate
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Merge className="h-3 w-3" />
                      Merge
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Merge Properties/Units</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isMultiUnit ? (
                          <>This will create one property with {rowIndices.length} units at {firstRow?.street_address}.</>
                        ) : (
                          <>This will keep the first property and remove {rowIndices.length - 1} duplicate{rowIndices.length > 2 ? 's' : ''}. This action cannot be undone.</>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onMergeDuplicates(groupKey, rowIndices[0], rowIndices.slice(1))}
                      >
                        Merge {isMultiUnit ? 'as Multi-Unit' : 'Duplicates'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
        
        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                Import Blocked - Duplicates Must Be Resolved
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                To maintain data quality, all duplicate groups must be resolved before the import can proceed. 
                Please merge related entries or mark them as separate properties.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DuplicateManager;

import React, { useState, useMemo } from 'react';
import { PropertyImportData, ImportValidationError, AddressProcessingResult } from '@/types/propertyImport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, Plus, AlertCircle, CheckCircle, Filter, Search, Brain, Wand2, TrendingUp } from 'lucide-react';

interface ImportDataTableProps {
  data: PropertyImportData[];
  validationErrors: ImportValidationError[];
  onDataChange: (newData: PropertyImportData[]) => void;
  addressGroups?: Record<string, number[]>;
  addressProcessingResult?: AddressProcessingResult;
}

const ImportDataTable: React.FC<ImportDataTableProps> = ({
  data,
  validationErrors,
  onDataChange,
  addressGroups = {},
  addressProcessingResult
}) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');

  const getRowErrors = (rowIndex: number) => {
    return validationErrors.filter(error => error.row === rowIndex + 1);
  };

  const getRowAIInsights = (rowIndex: number) => {
    return addressProcessingResult?.row_results[rowIndex];
  };

  const getQualityScore = (rowIndex: number): number => {
    const aiResult = getRowAIInsights(rowIndex);
    if (!aiResult?.ai_suggestions) return 75; // Default score
    
    const confidence = aiResult.ai_suggestions.confidence;
    const priority = aiResult.ai_suggestions.priority;
    
    // Calculate quality score based on confidence and priority
    let score = confidence * 100;
    if (priority === 'high') score -= 20;
    else if (priority === 'medium') score -= 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 85) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">High</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const filteredData = useMemo(() => {
    return data.filter((row, index) => {
      const errors = getRowErrors(index);
      const qualityScore = getQualityScore(index);
      
      // Filter by validation status
      if (filterType === 'errors' && errors.length === 0) return false;
      if (filterType === 'valid' && errors.length > 0) return false;
      if (filterType === 'low_quality' && qualityScore >= 70) return false;
      if (filterType === 'high_quality' && qualityScore < 85) return false;
      
      // Search filter
      if (searchTerm) {
        const searchFields = [
          row.street_address,
          row.city,
          row.state,
          row.property_name,
          row.unit_number
        ].filter(Boolean);
        
        const matchesSearch = searchFields.some(field => 
          field?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [data, validationErrors, filterType, searchTerm]);

  const getPropertyGroup = (rowIndex: number) => {
    for (const [address, indices] of Object.entries(addressGroups)) {
      if (indices.includes(rowIndex)) {
        return {
          address,
          totalUnits: indices.length,
          isMultiUnit: indices.length > 1
        };
      }
    }
    return null;
  };

  const handleEditRow = (rowIndex: number, field: keyof PropertyImportData, value: string) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    onDataChange(newData);
  };

  const handleBulkEdit = () => {
    if (!bulkEditField || !bulkEditValue || selectedRows.size === 0) return;
    
    const newData = [...data];
    selectedRows.forEach(rowIndex => {
      newData[rowIndex] = { ...newData[rowIndex], [bulkEditField]: bulkEditValue };
    });
    
    onDataChange(newData);
    setSelectedRows(new Set());
    setBulkEditField('');
    setBulkEditValue('');
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, index) => index !== rowIndex);
    onDataChange(newData);
  };

  const handleAddRow = () => {
    const newRow: PropertyImportData = {
      street_address: '',
      city: '',
      state: '',
      zipcode: '',
      property_type: 'residential',
      monthly_rent: 0
    };
    
    onDataChange([...data, newRow]);
  };

  const toggleRowSelection = (rowIndex: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      const allIndices = new Set(filteredData.map((_, index) => index));
      setSelectedRows(allIndices);
    }
  };

  const propertyTypes = ['residential', 'commercial', 'single_family', 'apartment', 'townhouse', 'condo'];

  return (
    <TooltipProvider>
      <div className="space-y-3">
      {/* Compact header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {filteredData.length} of {data.length} records
          </Badge>
          <Button onClick={handleAddRow} size="sm" variant="outline" className="gap-1 h-8">
            <Plus className="h-3 w-3" />
            Add Row
          </Button>
        </div>
        
        {/* Compact filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-32 h-8 text-xs"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="errors">Errors</SelectItem>
                <SelectItem value="high_quality">High Quality</SelectItem>
                <SelectItem value="low_quality">Low Quality</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Compact bulk edit controls */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
          <span className="font-medium">{selectedRows.size} selected</span>
          <Select value={bulkEditField} onValueChange={setBulkEditField}>
            <SelectTrigger className="w-32 h-7">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="property_type">Property Type</SelectItem>
              <SelectItem value="pet_friendly">Pet Friendly</SelectItem>
              <SelectItem value="parking_spots">Parking Spots</SelectItem>
              <SelectItem value="lease_terms">Lease Terms</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Value"
            value={bulkEditValue}
            onChange={(e) => setBulkEditValue(e.target.value)}
            className="w-24 h-7"
          />
          <Button onClick={handleBulkEdit} size="sm" className="h-7 px-2">
            Apply
          </Button>
        </div>
      )}

      {/* Main table with optimized height */}
      <ScrollArea className="h-[500px] w-full border rounded-lg">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-16">Quality</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-16">Unit #</TableHead>
              <TableHead className="w-16">Beds</TableHead>
              <TableHead className="w-16">Baths</TableHead>
              <TableHead className="w-20">Rent</TableHead>
              <TableHead className="w-16">Group</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, filteredIndex) => {
              const originalIndex = data.indexOf(row);
              const errors = getRowErrors(originalIndex);
              const propertyGroup = getPropertyGroup(originalIndex);
              const isEditing = editingRow === originalIndex;
              const qualityScore = getQualityScore(originalIndex);
              const aiInsights = getRowAIInsights(originalIndex);

              return (
                <TableRow key={originalIndex} className={errors.length > 0 ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(originalIndex)}
                      onCheckedChange={() => toggleRowSelection(originalIndex)}
                    />
                  </TableCell>
                  
                  <TableCell>
                    {errors.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <Badge variant="destructive" className="text-xs px-1">
                          {errors.length}
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <Badge variant="secondary" className="text-xs px-1">✓</Badge>
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3 text-primary" />
                          <span className={`text-xs font-medium ${getQualityColor(qualityScore)}`}>
                            {qualityScore}%
                          </span>
                          {getQualityBadge(qualityScore)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">AI Quality Assessment</p>
                          <div className="text-xs space-y-1">
                            {aiInsights?.ai_suggestions && (
                              <>
                                <div>Confidence: {Math.round(aiInsights.ai_suggestions.confidence * 100)}%</div>
                                <div>Priority: {aiInsights.ai_suggestions.priority}</div>
                                {aiInsights.ai_suggestions.improvements.length > 0 && (
                                  <div>Suggestions: {aiInsights.ai_suggestions.improvements.length}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {isEditing ? (
                        <Input
                          value={row.street_address}
                          onChange={(e) => handleEditRow(originalIndex, 'street_address', e.target.value)}
                          className="h-7 text-xs"
                        />
                      ) : (
                        <div className="font-medium text-xs">{row.street_address}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {row.city}, {row.state} {row.zipcode}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={row.property_type || ''}
                        onValueChange={(value) => handleEditRow(originalIndex, 'property_type', value)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {row.property_type?.replace('_', ' ') || 'Not set'}
                        </Badge>
                        {aiInsights?.processed_data?.ai_insights?.property_type_detection && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Wand2 className="h-3 w-3 text-primary" />
                                <span className="text-xs text-primary">
                                  AI: {aiInsights.processed_data.ai_insights.property_type_detection.detected_type}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">AI Property Type Detection</p>
                                <div className="text-xs">
                                  Confidence: {Math.round(aiInsights.processed_data.ai_insights.property_type_detection.confidence * 100)}%
                                </div>
                                <div className="text-xs">
                                  Click to apply AI suggestion
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={row.unit_number || ''}
                        onChange={(e) => handleEditRow(originalIndex, 'unit_number', e.target.value)}
                        className="h-7 text-xs"
                      />
                    ) : (
                      <span className="text-xs">{row.unit_number || '-'}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={row.bedrooms || ''}
                        onChange={(e) => handleEditRow(originalIndex, 'bedrooms', e.target.value)}
                        className="h-7 w-14 text-xs"
                      />
                    ) : (
                      <span className="text-xs">{row.bedrooms || '-'}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.5"
                        value={row.bathrooms || ''}
                        onChange={(e) => handleEditRow(originalIndex, 'bathrooms', e.target.value)}
                        className="h-7 w-14 text-xs"
                      />
                    ) : (
                      <span className="text-xs">{row.bathrooms || '-'}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={row.monthly_rent || ''}
                        onChange={(e) => handleEditRow(originalIndex, 'monthly_rent', e.target.value)}
                        className="h-7 w-18 text-xs"
                      />
                    ) : (
                      <span className="text-xs">{row.monthly_rent ? `$${row.monthly_rent}` : '-'}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {propertyGroup && (
                      <Badge variant={propertyGroup.isMultiUnit ? "default" : "secondary"} className="text-xs px-1">
                        {propertyGroup.isMultiUnit ? propertyGroup.totalUnits : '1'}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <Button
                          onClick={() => setEditingRow(null)}
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setEditingRow(originalIndex)}
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteRow(originalIndex)}
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Compact validation errors summary */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-destructive/10 rounded-lg">
          <h4 className="font-medium text-destructive text-sm mb-2">Validation Errors</h4>
          <div className="space-y-1 text-xs">
            {validationErrors.slice(0, 5).map((error, index) => (
              <div key={index} className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs px-1">Row {error.row}</Badge>
                <span>{error.field}: {error.message}</span>
              </div>
            ))}
            {validationErrors.length > 5 && (
              <div className="text-muted-foreground">
                ... and {validationErrors.length - 5} more errors
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
};

export default ImportDataTable;

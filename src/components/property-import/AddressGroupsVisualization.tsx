import React from 'react';
import { PropertyImportData } from '@/types/propertyImport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building, MapPin, Users, Home } from 'lucide-react';

interface AddressGroupsVisualizationProps {
  addressGroups: Record<string, number[]>;
  importData: PropertyImportData[];
}

const AddressGroupsVisualization: React.FC<AddressGroupsVisualizationProps> = ({
  addressGroups,
  importData
}) => {
  // Calculate statistics
  const totalAddresses = Object.values(addressGroups).flat().length;
  const uniqueProperties = Object.keys(addressGroups).length;
  const multiUnitProperties = Object.values(addressGroups).filter(group => group.length > 1).length;
  const singleUnitProperties = uniqueProperties - multiUnitProperties;
  
  // Get property type distribution
  const propertyTypeStats = Object.entries(addressGroups).reduce((acc, [address, indices]) => {
    const firstRow = importData[indices[0]];
    const type = firstRow?.property_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get rent statistics
  const rentStats = Object.entries(addressGroups).reduce((acc, [address, indices]) => {
    const rents = indices
      .map(i => parseFloat(importData[i]?.monthly_rent?.toString() || '0'))
      .filter(rent => rent > 0);
    
    if (rents.length > 0) {
      acc.total += rents.reduce((sum, rent) => sum + rent, 0);
      acc.count += rents.length;
      acc.min = Math.min(acc.min, ...rents);
      acc.max = Math.max(acc.max, ...rents);
    }
    
    return acc;
  }, { total: 0, count: 0, min: Infinity, max: 0 });

  const averageRent = rentStats.count > 0 ? rentStats.total / rentStats.count : 0;

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalAddresses}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{uniqueProperties}</div>
                <div className="text-sm text-muted-foreground">Unique Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{multiUnitProperties}</div>
                <div className="text-sm text-muted-foreground">Multi-Unit Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Home className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{singleUnitProperties}</div>
                <div className="text-sm text-muted-foreground">Single Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(propertyTypeStats).map(([type, count]) => {
              const percentage = (count / uniqueProperties) * 100;
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">
                      {type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {count} properties
                      </span>
                      <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rent Analysis */}
      {averageRent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rent Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${averageRent.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Average Rent</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  ${rentStats.min < Infinity ? rentStats.min.toLocaleString() : '0'}
                </div>
                <div className="text-sm text-muted-foreground">Minimum Rent</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  ${rentStats.max.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Maximum Rent</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address Groups Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Property Groupings Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Properties with the same address are automatically grouped for multi-unit management
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {Object.entries(addressGroups)
              .sort(([, a], [, b]) => b.length - a.length)
              .slice(0, 10)
              .map(([address, indices], index) => {
                const firstRow = importData[indices[0]];
                const isMultiUnit = indices.length > 1;
                const units = indices.map(i => importData[i]?.unit_number).filter(Boolean);
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{firstRow?.street_address}</div>
                      <div className="text-sm text-muted-foreground">
                        {firstRow?.city}, {firstRow?.state} {firstRow?.zipcode}
                      </div>
                      {isMultiUnit && units.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Units: {units.join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isMultiUnit ? "default" : "secondary"}>
                        {indices.length} unit{indices.length > 1 ? 's' : ''}
                      </Badge>
                      {firstRow?.property_type && (
                        <Badge variant="outline">
                          {firstRow.property_type.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            
            {Object.keys(addressGroups).length > 10 && (
              <div className="text-center text-sm text-muted-foreground py-2">
                ... and {Object.keys(addressGroups).length - 10} more properties
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddressGroupsVisualization;
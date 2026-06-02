import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin } from 'lucide-react';
import { PropertyImportData } from '@/types/propertyImport';

interface AddressGroupsPreviewProps {
  addressGroups: Record<string, number[]>;
  importData: PropertyImportData[];
}

const AddressGroupsPreview = ({ addressGroups, importData }: AddressGroupsPreviewProps) => {
  const groupEntries = Object.entries(addressGroups);

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {groupEntries.map(([address, rowIndexes], groupIndex) => (
        <Card key={groupIndex} className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                <Home className="h-4 w-4 text-primary" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">{address}</h4>
                  <Badge variant="secondary">
                    {rowIndexes.length} unit{rowIndexes.length > 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {rowIndexes.map((rowIndex, unitIndex) => {
                    const unit = importData[rowIndex];
                    return (
                      <div 
                        key={unitIndex}
                        className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded"
                      >
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">
                          {unit.unit_number ? `Unit ${unit.unit_number}` : 'Main Unit'}
                        </span>
                        {unit.unit_type && (
                          <Badge variant="outline" className="text-xs">
                            {unit.unit_type}
                          </Badge>
                        )}
                        {unit.bedrooms && (
                          <span className="text-muted-foreground">
                            {unit.bedrooms} bed
                          </span>
                        )}
                        {unit.bathrooms && (
                          <span className="text-muted-foreground">
                            {unit.bathrooms} bath
                          </span>
                        )}
                        {unit.monthly_rent && (
                          <span className="text-muted-foreground">
                            ${unit.monthly_rent}/mo
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {groupEntries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No address groups available
        </div>
      )}
    </div>
  );
};

export default AddressGroupsPreview;
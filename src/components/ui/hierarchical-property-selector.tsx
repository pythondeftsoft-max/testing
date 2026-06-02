import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Building2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyUnit {
  id: string;
  unit_number: string | null;
  monthly_rent?: number;
  status?: string;
}

interface PropertyWithUnits {
  id: string;
  address: string;
  portfolio_id?: string;
  property_units: PropertyUnit[];
}

interface HierarchicalPropertySelectorProps {
  properties: PropertyWithUnits[];
  selectedPropertyIds: string[];
  selectedUnitIds: string[];
  onSelectionChange: (propertyIds: string[], unitIds: string[]) => void;
  onAllPropertiesModeChange?: (isAllMode: boolean) => void;
  isAllPropertiesMode?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const HierarchicalPropertySelector: React.FC<HierarchicalPropertySelectorProps> = ({
  properties,
  selectedPropertyIds,
  selectedUnitIds,
  onSelectionChange,
  onAllPropertiesModeChange,
  isAllPropertiesMode: externalAllPropertiesMode,
  disabled = false,
  placeholder = "Select properties/units",
  className
}) => {
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [internalAllPropertiesMode, setInternalAllPropertiesMode] = useState<boolean>(false);
  
  // Use external prop if provided, otherwise use internal state
  const isAllPropertiesMode = externalAllPropertiesMode !== undefined ? externalAllPropertiesMode : internalAllPropertiesMode;

  const togglePropertyExpansion = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

  const handlePropertySelect = (propertyId: string, hasUnits: boolean) => {
    // Clear "All Properties" mode when making individual selections
    setInternalAllPropertiesMode(false);
    onAllPropertiesModeChange?.(false);
    
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    let newPropertyIds = [...selectedPropertyIds];
    let newUnitIds = [...selectedUnitIds];

    if (hasUnits) {
      // Property has units - toggle all units
      const propertyUnitIds = property.property_units.map(u => u.id);
      const allUnitsSelected = propertyUnitIds.every(unitId => selectedUnitIds.includes(unitId));
      
      if (allUnitsSelected) {
        // Deselect all units
        newUnitIds = newUnitIds.filter(id => !propertyUnitIds.includes(id));
      } else {
        // Select all units
        propertyUnitIds.forEach(unitId => {
          if (!newUnitIds.includes(unitId)) {
            newUnitIds.push(unitId);
          }
        });
      }
    } else {
      // Property has no units - toggle property itself
      if (selectedPropertyIds.includes(propertyId)) {
        newPropertyIds = newPropertyIds.filter(id => id !== propertyId);
      } else {
        newPropertyIds.push(propertyId);
      }
    }

    onSelectionChange(newPropertyIds, newUnitIds);
  };

  const handleUnitSelect = (unitId: string) => {
    // Clear "All Properties" mode when making individual selections
    setInternalAllPropertiesMode(false);
    onAllPropertiesModeChange?.(false);
    
    let newUnitIds = [...selectedUnitIds];
    
    if (selectedUnitIds.includes(unitId)) {
      newUnitIds = newUnitIds.filter(id => id !== unitId);
    } else {
      newUnitIds.push(unitId);
    }

    onSelectionChange(selectedPropertyIds, newUnitIds);
  };

  // Helper functions for "All Properties" functionality
  const areAllPropertiesSelected = () => {
    // If we're explicitly in "All Properties" mode, return true
    if (isAllPropertiesMode) return true;
    
    // Otherwise, check if ALL properties/units are explicitly selected
    if (properties.length === 0) return false;
    
    for (const property of properties) {
      const hasUnits = property.property_units.length > 0;
      if (hasUnits) {
        // Check if all units are selected for this property
        const propertyUnitIds = property.property_units.map(u => u.id);
        if (!propertyUnitIds.every(unitId => selectedUnitIds.includes(unitId))) {
          return false;
        }
      } else {
        // Check if the property itself is selected
        if (!selectedPropertyIds.includes(property.id)) {
          return false;
        }
      }
    }
    return true;
  };

  const areSomePropertiesSelected = () => {
    return selectedPropertyIds.length > 0 || selectedUnitIds.length > 0;
  };

  const handleSelectAll = () => {
    const allPropertyIds: string[] = [];
    const allUnitIds: string[] = [];

    properties.forEach(property => {
      const hasUnits = property.property_units.length > 0;
      if (hasUnits) {
        // Add all units for properties with units
        property.property_units.forEach(unit => {
          allUnitIds.push(unit.id);
        });
      } else {
        // Add the property itself for properties without units
        allPropertyIds.push(property.id);
      }
    });

    onSelectionChange(allPropertyIds, allUnitIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([], []);
  };

  const handleAllPropertiesToggle = () => {
    if (isAllPropertiesMode) {
      // We're in "All Properties" mode, switch to "Nothing selected"
      setInternalAllPropertiesMode(false);
      onAllPropertiesModeChange?.(false);
      handleDeselectAll();
    } else {
      // Switch to "All Properties" mode
      setInternalAllPropertiesMode(true);
      onAllPropertiesModeChange?.(true);
      handleDeselectAll(); // Clear individual selections and rely on the mode
    }
  };

  const getSelectionDisplay = () => {
    // If we're in "All Properties" mode, show that
    if (isAllPropertiesMode) return "All Properties";
    
    const totalSelected = selectedPropertyIds.length + selectedUnitIds.length;
    
    // Check if all properties are selected individually
    if (!isAllPropertiesMode && areAllPropertiesSelected()) return "All Properties";
    
    // Special case: empty arrays without "All Properties" mode should show default message
    if (totalSelected === 0) return properties.length > 0 ? "Select properties/units" : "Select properties/units";
    
    if (totalSelected === 1) {
      if (selectedPropertyIds.length === 1) {
        const property = properties.find(p => p.id === selectedPropertyIds[0]);
        return property?.address || "1 selected";
      } else {
        const property = properties.find(p => 
          p.property_units.some(u => u.id === selectedUnitIds[0])
        );
        const unit = property?.property_units.find(u => u.id === selectedUnitIds[0]);
        return unit ? `${property?.address} - Unit ${unit.unit_number || 'N/A'}` : "1 selected";
      }
    }
    return `${totalSelected} selected`;
  };

  const isPropertySelected = (property: PropertyWithUnits) => {
    // If we're in "All Properties" mode, everything is selected
    if (isAllPropertiesMode) return true;
    
    const hasUnits = property.property_units.length > 0;
    if (hasUnits) {
      const propertyUnitIds = property.property_units.map(u => u.id);
      return propertyUnitIds.every(unitId => selectedUnitIds.includes(unitId));
    } else {
      return selectedPropertyIds.includes(property.id);
    }
  };

  const isPropertyPartiallySelected = (property: PropertyWithUnits) => {
    // No partial selection when in "All Properties" mode
    if (isAllPropertiesMode) return false;
    
    const hasUnits = property.property_units.length > 0;
    if (hasUnits) {
      const propertyUnitIds = property.property_units.map(u => u.id);
      const selectedCount = propertyUnitIds.filter(unitId => selectedUnitIds.includes(unitId)).length;
      return selectedCount > 0 && selectedCount < propertyUnitIds.length;
    }
    return false;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("w-full justify-start", className)} 
          disabled={disabled}
        >
          {disabled ? "Loading properties..." : getSelectionDisplay()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="bottom">
        <div className="space-y-2 max-h-96 overflow-y-auto p-1">
          {/* All Properties Option */}
          <div className="flex items-center space-x-2 pb-2">
            <Checkbox
              id="all-properties"
              checked={areAllPropertiesSelected()}
              ref={(el) => {
                if (el && 'indeterminate' in el) {
                  (el as any).indeterminate = !areAllPropertiesSelected() && areSomePropertiesSelected();
                }
              }}
              onCheckedChange={handleAllPropertiesToggle}
              className="flex-shrink-0"
            />
            <label 
              htmlFor="all-properties" 
              className="text-sm font-medium cursor-pointer flex-1"
            >
              All Properties
            </label>
          </div>
          
          {properties.length > 0 && <Separator />}
          
          {properties.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No properties found
            </div>
          ) : (
            properties.map((property) => {
              const hasUnits = property.property_units.length > 0;
              const isExpanded = expandedProperties.has(property.id);
              const isSelected = isPropertySelected(property);
              const isPartiallySelected = isPropertyPartiallySelected(property);

              return (
                <div key={property.id} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {hasUnits ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 flex-shrink-0"
                        onClick={() => togglePropertyExpansion(property.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    ) : (
                      <div className="h-4 w-4 flex-shrink-0" />
                    )}
                    <Checkbox
                      id={property.id}
                      checked={isSelected}
                      ref={(el) => {
                        if (el && 'indeterminate' in el) {
                          (el as any).indeterminate = isPartiallySelected;
                        }
                      }}
                      onCheckedChange={() => handlePropertySelect(property.id, hasUnits)}
                      className="flex-shrink-0"
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      {hasUnits ? (
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <label 
                        htmlFor={property.id} 
                        className="text-sm flex-1 cursor-pointer font-medium"
                      >
                        {property.address}
                      </label>
                      {hasUnits && (
                        <span className="text-xs text-muted-foreground">
                          {property.property_units.length} units
                        </span>
                      )}
                    </div>
                  </div>

                  {hasUnits && isExpanded && (
                    <div className="ml-6 space-y-1">
                      {property.property_units.map((unit) => {
                        const isUnitSelected = isAllPropertiesMode || selectedUnitIds.includes(unit.id);
                        
                        return (
                          <div key={unit.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={unit.id}
                              checked={isUnitSelected}
                              onCheckedChange={() => handleUnitSelect(unit.id)}
                            />
                            <label htmlFor={unit.id} className="text-sm flex-1 cursor-pointer">
                              Unit {unit.unit_number || 'N/A'}
                              {unit.monthly_rent && (
                                <span className="text-muted-foreground ml-2">
                                  (${unit.monthly_rent}/mo)
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
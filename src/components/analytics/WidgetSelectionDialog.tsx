import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Check, Search, BarChart3, TrendingUp, DollarSign, Settings, Info, Database, Target, Calculator, ChevronDown, AlertTriangle, ChevronRight, FileText, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WidgetSelectionDialogProps, WidgetSelectionState, WidgetDefinition } from '@/types/widgetTypes';
import { getWidgetGroups, getCoreWidgets } from '@/utils/widgetCatalog';
import { MockDataSection } from '@/utils/mockFinancialReports';
import { getWidgetTooltip, getDataSourceInfo } from '@/utils/metricTooltips';
import { ProductionErrorBoundary } from '@/components/ProductionErrorBoundary';
import { UserAsset } from '@/hooks/useUserAssets';
import { Briefcase, Coins, TrendingUp as TrendingUpIcon, Building2, Wallet } from 'lucide-react';

const getGroupIcon = (groupId: string) => {
  switch (groupId) {
    case 'core-metrics':
      return DollarSign;
    case 'charts-trends':
      return TrendingUp;
    case 'analysis-tools':
      return BarChart3;
    case 'comparative-analysis':
      return Settings;
    default:
      return BarChart3;
  }
};

const getCategoryDisplayName = (category: MockDataSection): string => {
  switch (category) {
    case 'income':
      return 'Income & Cash Flow';
    case 'expenses':
      return 'Expenses & Profitability';
    case 'investment':
      return 'Investment & Portfolio';
    case 'leasing':
      return 'Leasing & Tenant Performance';
    case 'tenant-performance':
      return 'Tenant Performance';
    case 'maintenance':
      return 'Maintenance & Vendor Operations';
    case 'vendor-operations':
      return 'Vendor Operations';
    case 'risk-management':
      return 'Risk Management & Compliance';
    case 'lease-rent-optimization':
      return 'Lease Management & Rent Optimization';
    case 'tenant-lifecycle':
      return 'Tenant Intelligence Dashboard';
    case 'predictive-analytics':
      return 'AI Forecast and Health';
    default:
      return category;
  }
};

// Error Boundary Wrapper Component
const SafeWidgetDialog: React.FC<WidgetSelectionDialogProps> = (props) => {
  return (
    <ProductionErrorBoundary>
      <WidgetSelectionDialogContent {...props} />
    </ProductionErrorBoundary>
  );
};

const WidgetSelectionDialogContent: React.FC<WidgetSelectionDialogProps & { userAssets?: UserAsset[]; userId?: string }> = ({
  isOpen,
  onOpenChange,
  category,
  onApplySelection,
  currentVisibleWidgets = [],
  userAssets = [],
  userId
}) => {
  const [selectionState, setSelectionState] = useState<WidgetSelectionState>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  
  // Safely get widget data with error handling
  const widgetGroups = useMemo(() => {
    try {
      const categories = Array.isArray(category) ? category : [category];
      const allGroups: any[] = [];
      
      categories.forEach(cat => {
        const groups = getWidgetGroups(cat as MockDataSection) || [];
        allGroups.push(...groups);
      });
      
      // Merge groups with the same ID
      const mergedGroups = allGroups.reduce((acc, group) => {
        const existing = acc.find((g: any) => g.id === group.id);
        if (existing) {
          existing.widgets = [...existing.widgets, ...group.widgets];
        } else {
          acc.push({ ...group, widgets: [...group.widgets] });
        }
        return acc;
      }, []);
      
      return mergedGroups;
    } catch (err) {
      console.error('Error loading widget groups:', err);
      setError('Failed to load widget groups');
      return [];
    }
  }, [category]);

  const coreWidgets = useMemo(() => {
    try {
      const categories = Array.isArray(category) ? category : [category];
      const allCoreWidgets: any[] = [];
      
      categories.forEach(cat => {
        const core = getCoreWidgets(cat as MockDataSection) || [];
        allCoreWidgets.push(...core);
      });
      
      return allCoreWidgets;
    } catch (err) {
      console.error('Error loading core widgets:', err);
      return [];
    }
  }, [category]);
  
  // Initialize selection state when dialog opens (only once)
  useEffect(() => {
    // Only initialize when dialog opens, not when other props change
    if (isOpen && widgetGroups.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      try {
        console.log('🟢 Initializing widget selection state for category:', category);
        console.log('🟢 Number of widget groups:', widgetGroups.length);
        const initialState: WidgetSelectionState = {};
        
        // Initialize group expansion state - All groups start collapsed
        const initialGroupState: Record<string, boolean> = {};
        widgetGroups.forEach(group => {
          initialGroupState[group.id] = false;
        });
        setExpandedGroups(initialGroupState);
        
        // Add individual asset widgets to state
        if (userAssets && Array.isArray(userAssets)) {
          userAssets.forEach(asset => {
            const assetWidgetId = `individual-asset-${asset.id}`;
            initialState[assetWidgetId] = {
              selected: currentVisibleWidgets.includes(assetWidgetId),
              currentlyVisible: currentVisibleWidgets.includes(assetWidgetId)
            };
          });
        }
        
        widgetGroups.forEach(group => {
          if (group?.widgets && Array.isArray(group.widgets)) {
            group.widgets.forEach(widget => {
              if (widget?.id) {
                initialState[widget.id] = {
                  selected: currentVisibleWidgets.includes(widget.id),
                  currentlyVisible: currentVisibleWidgets.includes(widget.id)
                };
              }
            });
          }
        });
        
        const totalWidgetsInitialized = Object.keys(initialState).length;
        console.log('🟢 Total widgets initialized:', totalWidgetsInitialized);
        console.log('🟢 Current visible widgets count:', currentVisibleWidgets.length);
        console.log('🟢 Initialized widget IDs:', Object.keys(initialState));
        setSelectionState(initialState);
        setError(null);
      } catch (err) {
        console.error('Error initializing selection state:', err);
        setError('Failed to initialize widget selection');
      }
    }
    
    // Reset the flag when dialog closes
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, widgetGroups]);

  const handleWidgetToggle = useCallback((widgetId: string, checked: boolean) => {
    try {
      setSelectionState(prev => ({
        ...prev,
        [widgetId]: {
          ...prev[widgetId],
          selected: checked
        }
      }));
    } catch (err) {
      console.error('Error toggling widget:', err);
      setError('Failed to update widget selection');
    }
  }, []);

  const handleGroupToggle = useCallback((groupWidgets: WidgetDefinition[], allSelected: boolean) => {
    try {
      setSelectionState(prev => {
        const newState = { ...prev };
        groupWidgets.forEach(widget => {
          if (widget?.id) {
            newState[widget.id] = {
              ...newState[widget.id],
              selected: !allSelected
            };
          }
        });
        return newState;
      });
    } catch (err) {
      console.error('Error toggling group:', err);
      setError('Failed to update group selection');
    }
  }, []);

  const handleApply = useCallback(() => {
    try {
      const selectedWidgets = Object.entries(selectionState)
        .filter(([_, state]) => state?.selected)
        .map(([widgetId, _]) => widgetId);
      
      console.log('Applying widget selection:', selectedWidgets);
      onApplySelection(selectedWidgets);
      onOpenChange(false);
    } catch (err) {
      console.error('Error applying selection:', err);
      setError('Failed to apply widget selection');
    }
  }, [selectionState, onApplySelection, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setSearchTerm('');
    setError(null);
  }, [onOpenChange]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);

  const toggleSection = useCallback((widgetId: string, sectionType: string) => {
    try {
      console.log(`Toggling ${sectionType} for widget ${widgetId}`);
      setExpandedSections(prev => ({
        ...prev,
        [widgetId]: {
          ...prev[widgetId],
          [sectionType]: !prev[widgetId]?.[sectionType]
        }
      }));
    } catch (err) {
      console.error('Error toggling section:', err);
    }
  }, []);

  const CollapsibleSection = React.memo(({ 
    widgetId, 
    sectionType, 
    title, 
    icon: Icon, 
    children 
  }: {
    widgetId: string;
    sectionType: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections[widgetId]?.[sectionType] || false;
    
    const handleToggle = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSection(widgetId, sectionType);
    }, [widgetId, sectionType]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleToggle(e);
      }
    }, [handleToggle]);
    
    return (
      <div className="mb-2">
        <button
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`flex items-center gap-2 w-full text-left rounded px-3 py-2 -mx-3 transition-all duration-200 border border-transparent ${
            isExpanded 
              ? 'bg-primary/10 border-primary/20 shadow-sm' 
              : 'hover:bg-muted/50 hover:border-muted-foreground/20'
          } focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30`}
          aria-expanded={isExpanded}
          aria-controls={`${widgetId}-${sectionType}-content`}
          tabIndex={0}
        >
          <Icon className={`h-3 w-3 flex-shrink-0 transition-colors duration-200 ${
            isExpanded ? 'text-primary' : 'text-muted-foreground'
          }`} />
          <span className={`text-xs font-medium transition-colors duration-200 ${
            isExpanded ? 'text-primary' : 'text-foreground'
          }`}>
            {title}
          </span>
          <ChevronDown 
            className={`h-3 w-3 ml-auto transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            } ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`} 
          />
        </button>
        {isExpanded && (
          <div 
            id={`${widgetId}-${sectionType}-content`}
            className="mt-2 ml-6 transition-all duration-200 ease-in-out"
          >
            <div className="bg-background border border-border/50 rounded-md p-3 shadow-sm">
              {children}
            </div>
          </div>
        )}
      </div>
    );
  });

  // Filter widgets based on search term with error handling
  const filteredGroups = useMemo(() => {
    try {
      if (!searchTerm.trim() || !widgetGroups.length) return widgetGroups;
      
      const filtered = widgetGroups.map(group => ({
        ...group,
        widgets: (group?.widgets || []).filter(widget =>
          widget?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          widget?.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.widgets.length > 0);
      
      // Auto-expand groups that have matching widgets when searching
      if (searchTerm.trim()) {
        const newExpandedGroups = { ...expandedGroups };
        filtered.forEach(group => {
          newExpandedGroups[group.id] = true;
        });
        setExpandedGroups(newExpandedGroups);
      }
      
      return filtered;
    } catch (err) {
      console.error('Error filtering groups:', err);
      return widgetGroups;
    }
  }, [searchTerm, widgetGroups, expandedGroups]);
  
  const totalSelected = useMemo(() => {
    try {
      return Object.values(selectionState).filter(state => state?.selected).length;
    } catch (err) {
      console.error('Error calculating selected widgets:', err);
      return 0;
    }
  }, [selectionState]);
  
  const totalAvailable = useMemo(() => {
    try {
      return Object.keys(selectionState).length;
    } catch (err) {
      console.error('Error calculating available widgets:', err);
      return 0;
    }
  }, [selectionState]);

  // Show error state if there's an error
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Widgets
            </DialogTitle>
            <DialogDescription>
              {error}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setError(null)} variant="outline">
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Manage {Array.isArray(category) 
              ? category.map(getCategoryDisplayName).join(' & ') 
              : getCategoryDisplayName(category)} Widgets
          </DialogTitle>
          <DialogDescription>
            Select which widgets to display on your {Array.isArray(category) 
              ? category.map(c => getCategoryDisplayName(c).toLowerCase()).join(' and ') 
              : getCategoryDisplayName(category).toLowerCase()} dashboard.
            You can add new widgets or hide existing ones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
            <span className="text-sm font-medium">
              {totalSelected} of {totalAvailable} widgets selected
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectionState(prev => {
                    console.log('🟡 Select All clicked. Current state keys:', Object.keys(prev).length);
                    const newState: WidgetSelectionState = {};
                    Object.keys(prev).forEach(key => {
                      newState[key] = { 
                        selected: true,
                        currentlyVisible: prev[key]?.currentlyVisible || false
                      };
                    });
                    console.log('🟡 After Select All, new state keys:', Object.keys(newState).length);
                    return newState;
                  });
                }}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectionState(prev => {
                    console.log('🔴 Clear All clicked. Current state keys:', Object.keys(prev).length);
                    const newState: WidgetSelectionState = {};
                    Object.keys(prev).forEach(key => {
                      newState[key] = { 
                        selected: false,
                        currentlyVisible: prev[key]?.currentlyVisible || false
                      };
                    });
                    console.log('🔴 After Clear All, new state keys:', Object.keys(newState).length);
                    return newState;
                  });
                }}
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Widget Groups */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="space-y-6 p-4 pr-8">
              {/* My Assets Section - Only show for asset-related categories */}
              {(category === 'assets' || (Array.isArray(category) && category.includes('assets'))) && (
                <Collapsible
                  open={expandedGroups['user-assets'] || false}
                  onOpenChange={() => toggleGroup('user-assets')}
                >
                  <div className="space-y-3">
                    {/* My Assets Header */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {expandedGroups['user-assets'] ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Briefcase className="h-4 w-4 text-primary" />
                            <h3 className="font-medium">My Assets</h3>
                            <Badge variant="secondary" className="text-xs">
                              {userAssets?.length ? (
                                `${userAssets.filter(asset => 
                                  selectionState[`individual-asset-${asset.id}`]?.selected
                                ).length}/${userAssets.length}`
                              ) : '0/0'}
                            </Badge>
                          </div>
                        </div>
                        {userAssets && userAssets.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectionState(prev => {
                                const newState = { ...prev };
                                const allSelected = userAssets.every(asset => 
                                  newState[`individual-asset-${asset.id}`]?.selected
                                );
                                userAssets.forEach(asset => {
                                  const assetWidgetId = `individual-asset-${asset.id}`;
                                  newState[assetWidgetId] = {
                                    ...newState[assetWidgetId],
                                    selected: !allSelected
                                  };
                                });
                                return newState;
                              });
                            }}
                            className="text-xs"
                          >
                            {userAssets.every(asset => 
                              selectionState[`individual-asset-${asset.id}`]?.selected
                            ) ? 'Deselect All' : 'Select All'}
                          </Button>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="space-y-3">
                      <p className="text-sm text-muted-foreground px-3">
                        Add individual asset cards to track specific holdings with detailed metrics and performance data.
                      </p>
                      
                      {!userAssets || userAssets.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-8 px-6 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/5">
                          <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-3" />
                          <h4 className="font-semibold text-base mb-2">No assets in your portfolio yet</h4>
                          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                            Add assets to your portfolio first, then come back here to add them as individual widgets to track their performance.
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Debug: userAssets = {userAssets ? `array with ${userAssets.length} items` : 'null/undefined'}
                          </p>
                        </div>
                      ) : (
                        /* Asset List - Grouped by Type */
                        <>
                          {(() => {
                            // Group assets by type
                            const assetsByType: Record<string, UserAsset[]> = {};
                            userAssets.forEach(asset => {
                              const assetType = asset.metadata?.asset_type || 'other';
                              if (!assetsByType[assetType]) {
                                assetsByType[assetType] = [];
                              }
                              assetsByType[assetType].push(asset);
                            });

                            // Define asset type configurations
                            const assetTypeConfigs: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
                              'stock': { name: 'Stocks', icon: TrendingUpIcon },
                              'crypto': { name: 'Cryptocurrency', icon: Coins },
                              'etf': { name: 'ETFs', icon: Briefcase },
                              'bond': { name: 'Bonds', icon: FileText },
                              'commodity': { name: 'Commodities', icon: Package },
                              'other': { name: 'Other Assets', icon: Wallet }
                            };

                            // Sort types to show in order
                            const orderedTypes = ['stock', 'crypto', 'etf', 'bond', 'commodity', 'other'];
                            const availableTypes = orderedTypes.filter(type => assetsByType[type] && assetsByType[type].length > 0);

                            return (
                              <div className="space-y-4 px-3">
                                {availableTypes.map(assetType => {
                                  const assets = assetsByType[assetType];
                                  const config = assetTypeConfigs[assetType];
                                  const TypeIcon = config.icon;
                                  
                                  const selectedInType = assets.filter(asset => 
                                    selectionState[`individual-asset-${asset.id}`]?.selected
                                  ).length;

                                  const allTypeSelected = selectedInType === assets.length;

                                  return (
                                    <Collapsible
                                      key={assetType}
                                      defaultOpen={false}
                                    >
                                      <div className="space-y-2">
                                        <CollapsibleTrigger asChild>
                                          <div className="flex items-center justify-between p-2.5 rounded-md border border-border/30 hover:bg-muted/20 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-2">
                                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-90" />
                                              <TypeIcon className="h-3.5 w-3.5 text-primary" />
                                              <span className="text-sm font-medium">{config.name}</span>
                                              <Badge variant="outline" className="text-xs">
                                                {selectedInType}/{assets.length}
                                              </Badge>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectionState(prev => {
                                                  const newState = { ...prev };
                                                  assets.forEach(asset => {
                                                    const assetWidgetId = `individual-asset-${asset.id}`;
                                                    newState[assetWidgetId] = {
                                                      ...newState[assetWidgetId],
                                                      selected: !allTypeSelected
                                                    };
                                                  });
                                                  return newState;
                                                });
                                              }}
                                              className="text-xs h-7"
                                            >
                                              {allTypeSelected ? 'Deselect All' : 'Select All'}
                                            </Button>
                                          </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                                            {assets.map((asset) => {
                                              const assetWidgetId = `individual-asset-${asset.id}`;
                                              const isSelected = selectionState[assetWidgetId]?.selected || false;
                                              const isCurrentlyVisible = selectionState[assetWidgetId]?.currentlyVisible || false;
                                              
                                              return (
                                                <div
                                                  key={assetWidgetId}
                                                  className={`flex flex-col p-3 rounded-lg border transition-colors cursor-pointer ${
                                                    isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                                                  }`}
                                                  onClick={() => handleWidgetToggle(assetWidgetId, !isSelected)}
                                                >
                                                  <div className="flex items-start gap-3">
                                                    <Checkbox
                                                      id={assetWidgetId}
                                                      checked={isSelected}
                                                      onCheckedChange={(checked) => 
                                                        handleWidgetToggle(assetWidgetId, checked as boolean)
                                                      }
                                                      className="mt-0.5"
                                                      onClick={(e) => e.stopPropagation()}
                                                    />
                                                    
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-start justify-between gap-2 mb-2">
                                                        <label 
                                                          htmlFor={assetWidgetId}
                                                          className="text-sm font-semibold cursor-pointer leading-tight"
                                                        >
                                                          {asset.asset_name}
                                                        </label>
                                                        
                                                        {isCurrentlyVisible && (
                                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5">
                                                            Active
                                                          </Badge>
                                                        )}
                                                      </div>
                                                      
                                                      <div className="space-y-1">
                                                        <Badge 
                                                          variant="secondary" 
                                                          className="text-[10px] px-1.5 py-0.5"
                                                          style={{ backgroundColor: `${asset.category_color_theme}20` }}
                                                        >
                                                          {asset.category_display_name}
                                                        </Badge>
                                                        {asset.current_value && (
                                                          <p className="text-xs text-muted-foreground">
                                                            ${asset.current_value.toLocaleString()}
                                                          </p>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
              
              {filteredGroups.map((group) => {
                const GroupIcon = getGroupIcon(group.id);
                const selectedCount = group.widgets.filter(widget => 
                  selectionState[widget.id]?.selected
                ).length;
                const allSelected = selectedCount === group.widgets.length;
                const someSelected = selectedCount > 0 && selectedCount < group.widgets.length;
                
                return (
                  <Collapsible
                    key={group.id}
                    open={expandedGroups[group.id] || false}
                    onOpenChange={() => toggleGroup(group.id)}
                  >
                    <div className="space-y-3">
                      {/* Group Header */}
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {expandedGroups[group.id] ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <GroupIcon className="h-4 w-4 text-primary" />
                              <h3 className="font-medium">{group.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {selectedCount}/{group.widgets.length}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGroupToggle(group.widgets, allSelected);
                            }}
                            className="text-xs"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-3">
                        <p className="text-sm text-muted-foreground px-3">{group.description}</p>
                        
                        {/* Widget List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-3">
                      {group.widgets.map((widget) => {
                        const isSelected = selectionState[widget.id]?.selected || false;
                        const isCurrentlyVisible = selectionState[widget.id]?.currentlyVisible || false;
                        const isCore = coreWidgets.includes(widget.id);
                        const tooltipData = (() => {
                          try {
                            return getWidgetTooltip(widget.id);
                          } catch (err) {
                            console.error(`Error getting tooltip for widget ${widget.id}:`, err);
                            return null;
                          }
                        })();
                        
                        const dataSourceInfo = (() => {
                          try {
                            return getDataSourceInfo(widget.id);
                          } catch (err) {
                            console.error(`Error getting data source for widget ${widget.id}:`, err);
                            return 'Data source information unavailable';
                          }
                        })();
                        
                        return (
                          <div
                            key={widget.id}
                            className={`flex flex-col p-4 rounded-lg border transition-colors cursor-pointer ${
                              isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleWidgetToggle(widget.id, !isSelected)}
                          >
                            {/* Header with Checkbox and Title */}
                            <div className="flex items-start gap-3 mb-3">
                              <Checkbox
                                id={widget.id}
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  handleWidgetToggle(widget.id, checked as boolean)
                                }
                                className="mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <label 
                                    htmlFor={widget.id}
                                    className="text-sm font-semibold cursor-pointer leading-tight"
                                  >
                                    {widget.name}
                                  </label>
                                  
                                  <div className="flex gap-1 flex-shrink-0">
                                    {isCurrentlyVisible && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5">
                                        Active
                                      </Badge>
                                    )}
                                    {isCore && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-5">
                                        Core
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {tooltipData?.description || widget.description}
                              </p>
                            </div>
                            
                            {/* Formula (collapsible) */}
                            {tooltipData?.formula && (
                              <CollapsibleSection
                                widgetId={widget.id}
                                sectionType="formula"
                                title="Formula"
                                icon={Calculator}
                              >
                                <p className="text-xs font-mono bg-muted/50 p-2 rounded border text-muted-foreground">
                                  {tooltipData.formula}
                                </p>
                              </CollapsibleSection>
                            )}
                            
                            {/* Data Requirements (collapsible) */}
                            {tooltipData?.dataRequired && tooltipData.dataRequired.length > 0 && (
                              <CollapsibleSection
                                widgetId={widget.id}
                                sectionType="dataRequired"
                                title="Data Required"
                                icon={Database}
                              >
                                <ul className="text-xs space-y-0.5">
                                  {tooltipData.dataRequired.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span className="text-primary mt-1 text-[8px]">•</span>
                                      <span className="text-muted-foreground leading-tight">{req}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CollapsibleSection>
                            )}
                            
                            {/* Benchmark (collapsible) */}
                            {tooltipData?.benchmark && (
                              <CollapsibleSection
                                widgetId={widget.id}
                                sectionType="benchmark"
                                title="Benchmark"
                                icon={Target}
                              >
                                <p className="text-xs bg-accent/30 p-2 rounded border text-muted-foreground leading-tight">
                                  {tooltipData.benchmark}
                                </p>
                              </CollapsibleSection>
                            )}
                            
                            {/* Data Source Footer */}
                            <div className="pt-2 mt-auto border-t border-border/50">
                              <div className="flex items-center gap-2">
                                <Database className="h-3 w-3 text-muted-foreground/70" />
                                <span className="text-[10px] text-muted-foreground/70 italic leading-tight">
                                  {dataSourceInfo}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                        })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Changes will be applied immediately to your dashboard
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Changes
            </Button>
          </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export const WidgetSelectionDialog = SafeWidgetDialog;
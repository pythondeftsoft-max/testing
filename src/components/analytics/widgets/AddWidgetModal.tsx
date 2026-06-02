import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WidgetTypeToggle, ViewMode } from '@/components/ui/widget-type-toggle';
import { 
  Activity, 
  Gauge, 
  BarChart3, 
  TrendingUp, 
  Home, 
  DollarSign, 
  Wrench, 
  Users, 
  Building, 
  AlertCircle, 
  Brain,
  Plus,
  Eye,
  ArrowUpDown,
  Target,
  Calculator,
  Zap,
  PieChart,
  LineChart,
  Calendar,
  Clock,
  ArrowUp,
  Receipt,
  Percent,
  FileText,
  Shield,
  BarChart2,
  Building2,
  PiggyBank,
  Square,
  TrendingDown,
  Map,
  ChevronDown,
  ChevronRight,
  Settings,
  CheckCircle,
  RefreshCw,
  Coins,
  Briefcase,
  Package,
  Wallet
} from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES, type WidgetConfig } from './WidgetRegistry';
import { CustomWidgetRenderer } from './CustomWidgetRenderer';

const iconMap = {
  Activity,
  Gauge,
  BarChart3,
  TrendingUp,
  Home,
  DollarSign,
  Wrench,
  Users,
  Building,
  AlertCircle,
  Brain,
  Plus,
  Eye,
  ArrowUpDown,
  Target,
  Calculator,
  Zap,
  PieChart,
  LineChart,
  Calendar,
  Clock,
  ArrowUp,
  Receipt,
  Percent,
  FileText,
  Shield,
  BarChart2,
  Building2,
  PiggyBank,
  Square,
  TrendingDown,
  Map,
  ChevronDown,
  ChevronRight,
  Settings,
  CheckCircle,
  RefreshCw,
  Briefcase
};

export interface CustomWidget {
  id: string;
  widgetId: string;
  name: string;
  description: string;
  config: WidgetConfig;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full-width';
}

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: CustomWidget) => void;
  existingWidgets: CustomWidget[];
  userAssets?: any[];
  userId?: string;
}

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({
  isOpen,
  onClose,
  onAddWidget,
  existingWidgets,
  userAssets = [],
  userId
}) => {
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  
  const [currentCategoryPage, setCurrentCategoryPage] = useState<Record<string, number>>({});
  const [viewModeByCategory, setViewModeByCategory] = useState<Record<string, ViewMode>>({});

  const handleWidgetSelect = (widget: WidgetConfig) => {
    setSelectedWidget(widget);
    setCustomName(widget.name);
    setCustomDescription(widget.description);
    setShowPreview(true);
  };

  const handleAddWidget = () => {
    if (!selectedWidget) return;

    const newWidget: CustomWidget = {
      id: `custom-${Date.now()}`,
      widgetId: selectedWidget.id,
      name: customName || selectedWidget.name,
      description: customDescription || selectedWidget.description,
      config: selectedWidget,
      order: existingWidgets.length,
      size: 'medium'
    };

    onAddWidget(newWidget);
    handleClose();
  };

  const handleClose = () => {
    setSelectedWidget(null);
    setCustomName('');
    setCustomDescription('');
    setShowPreview(false);
    setCurrentCategoryPage({});
    setViewModeByCategory({});
    onClose();
  };

  const getCategoryIcon = (category: keyof typeof WIDGET_CATEGORIES) => {
    const iconName = WIDGET_CATEGORIES[category].icon as keyof typeof iconMap;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const getWidgetIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  const categories = Object.keys(WIDGET_CATEGORIES) as Array<keyof typeof WIDGET_CATEGORIES>;

  const createCategorySections = (category: string, viewMode: ViewMode = 'all') => {
    const widgets = WIDGET_REGISTRY.filter(widget => widget.category === category);
    
    // Special handling for Financial Performance and Operational Performance categories
    if (category === 'health-metrics') {
      console.log('🔍 Debugging health-metrics widgets:', widgets);
      const metricWidgets = widgets.filter(w => w.component === 'ModernMetricCard' || w.component === 'InteractiveMetricCard');
      const chartWidgets = widgets.filter(w => w.component !== 'ModernMetricCard' && w.component !== 'InteractiveMetricCard');
      console.log('📊 Metric widgets:', metricWidgets);
      console.log('📈 Chart widgets:', chartWidgets);
      
      const sections = [];
      
      // Filter based on view mode
      if (viewMode === 'all' || viewMode === 'metrics') {
        if (metricWidgets.length > 0) {
          sections.push({
            title: 'Metrics',
            description: 'Key financial performance indicators',
            widgets: metricWidgets,
            icon: 'Activity'
          });
        }
      }
      
      if (viewMode === 'all' || viewMode === 'charts') {
        if (chartWidgets.length > 0) {
          sections.push({
            title: 'Charts',
            description: 'Visual analytics and trend analysis',
            widgets: chartWidgets,
            icon: 'BarChart3'
          });
        }
      }
      
      console.log('🎯 Final sections for health-metrics:', sections);
      return sections;
    }
    
    // Special handling for Operational Performance category
    if (category === 'gauge-charts') {
      const metricWidgets = widgets.filter(w => w.component === 'ModernMetricCard');
      const chartWidgets = widgets.filter(w => w.component !== 'ModernMetricCard');
      
      const sections = [];
      
      // Filter based on view mode
      if (viewMode === 'all' || viewMode === 'metrics') {
        if (metricWidgets.length > 0) {
          sections.push({
            title: 'Metrics',
            description: 'Key operational performance indicators',
            widgets: metricWidgets,
            icon: 'Activity'
          });
        }
      }
      
      if (viewMode === 'all' || viewMode === 'charts') {
        if (chartWidgets.length > 0) {
          sections.push({
            title: 'Charts',
            description: 'Visual operational analytics and gauges',
            widgets: chartWidgets,
            icon: 'Gauge'
          });
        }
      }
      
      return sections;
    }
    
    // Group all other categories by component type consistently
    const metricWidgets = widgets.filter(w => 
      w.component === 'ModernMetricCard' || 
      w.component === 'InteractiveMetricCard' || 
      w.component.endsWith('Card')
    );
    const chartWidgets = widgets.filter(w => 
      w.component !== 'ModernMetricCard' && 
      w.component !== 'InteractiveMetricCard' && 
      !w.component.endsWith('Card')
    );
    
    const sections = [];
    
    // Filter based on view mode
    if (viewMode === 'all' || viewMode === 'metrics') {
      if (metricWidgets.length > 0) {
        sections.push({
          title: 'Widgets',
          description: 'Key metric indicators and dashboards',
          widgets: metricWidgets,
          icon: 'Activity'
        });
      }
    }
    
    if (viewMode === 'all' || viewMode === 'charts') {
      if (chartWidgets.length > 0) {
        sections.push({
          title: 'Charts',
          description: 'Visual analytics and data representations',
          widgets: chartWidgets,
          icon: 'BarChart3'
        });
      }
    }
    
    return sections;
  };

  const createGallerySections = (category: string) => {
    const widgets = WIDGET_REGISTRY.filter(widget => widget.category === category);
    
    // Group all widgets by component type for consolidated view
    const metricWidgets = widgets.filter(w => 
      w.component === 'ModernMetricCard' || 
      w.component === 'InteractiveMetricCard' || 
      w.component.endsWith('Card')
    );
    const chartWidgets = widgets.filter(w => 
      w.component !== 'ModernMetricCard' && 
      w.component !== 'InteractiveMetricCard' && 
      !w.component.endsWith('Card')
    );
    
    const subSections = [];
    if (metricWidgets.length > 0) {
      subSections.push({
        title: 'Metrics',
        widgets: metricWidgets
      });
    }
    if (chartWidgets.length > 0) {
      subSections.push({
        title: 'Charts',
        widgets: chartWidgets
      });
    }
    
    return [{
      title: 'Widget Gallery',
      subSections: subSections
    }];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-openkey-blue">
            <Plus className="h-5 w-5" />
            Add Widget to Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
            {!showPreview ? (
              <Tabs defaultValue={categories[0]} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-6 mb-4">
                  {categories.map((category) => (
                    <TabsTrigger 
                      key={category} 
                      value={category}
                      className="flex items-center gap-2 text-xs"
                    >
                      {getCategoryIcon(category)}
                      {WIDGET_CATEGORIES[category].name}
                    </TabsTrigger>
                  ))}
                </TabsList>

              {categories.map((category) => {
                const currentViewMode = viewModeByCategory[category] || 'all';
                const allWidgets = WIDGET_REGISTRY.filter(widget => widget.category === category);
                const metricCount = allWidgets.filter(w => 
                  w.component === 'ModernMetricCard' || 
                  w.component === 'InteractiveMetricCard' || 
                  w.component.endsWith('Card')
                ).length;
                const chartCount = allWidgets.filter(w => 
                  w.component !== 'ModernMetricCard' && 
                  w.component !== 'InteractiveMetricCard' && 
                  !w.component.endsWith('Card')
                ).length;
                const sections = createCategorySections(category, currentViewMode);
                
                return (
                  <TabsContent 
                    key={category} 
                    value={category} 
                    className="flex-1"
                  >
                    <ScrollArea className="h-[60vh]">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-openkey-blue mb-2">
                              {WIDGET_CATEGORIES[category].name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {WIDGET_CATEGORIES[category].description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Widget Type Toggle */}
                        <WidgetTypeToggle
                          viewMode={currentViewMode}
                          onViewModeChange={(mode) => setViewModeByCategory(prev => ({ ...prev, [category]: mode }))}
                          metricCount={metricCount}
                          chartCount={chartCount}
                          assetCount={category === 'properties' && userAssets ? userAssets.length : 0}
                          className="mb-6"
                        />
                      </div>

                      {/* My Assets Section - Only for 'properties' (Assets) category */}
                      {category === 'properties' && userAssets && userAssets.length > 0 && (
                        <div className="mb-8">
                          <Collapsible defaultOpen={true}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-accent/30 hover:bg-accent/50 rounded-lg transition-colors mb-3">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-openkey-blue" />
                                <h4 className="text-lg font-semibold text-openkey-blue">
                                  My Assets
                                </h4>
                                <Badge variant="secondary" className="bg-openkey-blue/10 text-openkey-blue">
                                  {userAssets.length}
                                </Badge>
                              </div>
                              <ChevronDown className="h-4 w-4" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 p-3">
                                {userAssets.map((asset) => {
                                  const assetWidgetId = `individual-asset-${asset.id}`;
                                  const isAlreadyAdded = existingWidgets.some(w => w.widgetId === assetWidgetId);
                                  const type = asset.metadata?.asset_type || 'other';
                                  
                                  return (
                                    <div
                                      key={asset.id}
                                      className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                        isAlreadyAdded 
                                          ? 'opacity-60 border-muted cursor-not-allowed bg-muted/20' 
                                          : 'hover:border-openkey-blue hover:bg-accent/50 border-border'
                                      }`}
                                      onClick={() => {
                                        if (!isAlreadyAdded) {
                                          const assetWidget: CustomWidget = {
                                            id: `custom-${Date.now()}`,
                                            widgetId: assetWidgetId,
                                            name: asset.asset_name,
                                            description: asset.asset_description || `${asset.metadata?.symbol || ''} - ${type.toUpperCase()}`,
                                            config: {
                                              id: assetWidgetId,
                                              name: asset.asset_name,
                                              description: asset.asset_description || '',
                                              category: 'properties',
                                              component: 'IndividualAssetCard',
                                              icon: 'DollarSign',
                                              assetData: asset
                                            } as any,
                                            order: existingWidgets.length,
                                            size: 'medium'
                                          };
                                          onAddWidget(assetWidget);
                                          handleClose();
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <DollarSign className="h-4 w-4 text-openkey-blue" />
                                        <span className="text-xs font-medium truncate">{asset.asset_name}</span>
                                        {isAlreadyAdded && (
                                          <Badge variant="secondary" className="text-xs ml-auto">
                                            Added
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {asset.metadata?.symbol || 'N/A'}
                                      </p>
                                      {!isAlreadyAdded && (
                                        <div className="flex items-center gap-2 mt-2 text-xs text-openkey-blue">
                                          <Plus className="h-3 w-3" />
                                          Click to add
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      )}

                      {/* Render all sections */}
                      {sections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-8">
                          {/* Section Header */}
                          <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                            {getWidgetIcon(section.icon)}
                            <div>
                              <h4 className="text-lg font-semibold text-foreground">
                                {section.title === 'Charts' ? '📈' : '📊'} {section.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {section.description}
                              </p>
                            </div>
                          </div>

                          {/* Widget Grid */}
                          <div className={`grid gap-3 ${
                            section.title === 'Widgets' 
                              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
                              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                          }`}>
                            {section.widgets.map((widget) => {
                              const isAlreadyAdded = existingWidgets.some(w => w.widgetId === widget.id);
                              
                              return (
                                <div
                                  key={widget.id}
                                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                    isAlreadyAdded 
                                      ? 'opacity-60 border-muted cursor-not-allowed bg-muted/20' 
                                      : 'hover:border-openkey-blue hover:bg-accent/50 border-border'
                                  }`}
                                  onClick={() => !isAlreadyAdded && handleWidgetSelect(widget)}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {getWidgetIcon(widget.icon)}
                                    <span className="text-xs font-medium truncate">{widget.name}</span>
                                    {isAlreadyAdded && (
                                      <Badge variant="secondary" className="text-xs ml-auto">
                                        Added
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                                    {widget.description}
                                  </p>
                                  {!isAlreadyAdded && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-openkey-blue">
                                      <Eye className="h-3 w-3" />
                                      Click to preview
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : (
            <div className="h-full flex flex-col gap-4">
              {/* Main Content Area */}
              <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Widget Gallery Panel */}
                <div className="w-80 border-r pr-4 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium">Widget Gallery</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShowPreview(false);
                      }}
                    >
                      ← All Categories
                    </Button>
                  </div>
                  
                  {(() => {
                    if (!selectedWidget) return null;
                    const gallerySections = createGallerySections(selectedWidget.category);
                    
                    return (
                      <div className="flex flex-col flex-1">
                         {/* All Sections - Scrollable */}
                         <div className="flex-1 overflow-y-auto max-h-[500px]">
                           <div className="space-y-6">
                             {gallerySections.map((section, sectionIndex) => (
                               <div key={sectionIndex}>
                                 {/* Render sub-sections within the main section */}
                                 {section.subSections?.map((subSection, subIndex) => (
                                   <div key={`${sectionIndex}-${subIndex}`} className="mb-6">
                                     {/* Sub-section Header */}
                                     <div className="mb-3">
                                       <h4 className="text-sm font-semibold text-openkey-blue">{subSection.title}</h4>
                                     </div>
                                     
                                     {/* Widget Grid for this sub-section */}
                                     <div className="grid grid-cols-1 gap-2 mb-4">
                                       {subSection.widgets.map((widget) => {
                                         const isAlreadyAdded = existingWidgets.some(w => w.widgetId === widget.id);
                                         const isSelected = selectedWidget?.id === widget.id;
                                         
                                         return (
                                           <div
                                             key={widget.id}
                                             className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                               isSelected 
                                                 ? 'border-openkey-blue bg-accent/50' 
                                                 : isAlreadyAdded 
                                                   ? 'opacity-60 border-muted cursor-not-allowed bg-muted/20' 
                                                   : 'hover:border-openkey-blue hover:bg-accent/30 border-border'
                                             }`}
                                             onClick={() => !isAlreadyAdded && handleWidgetSelect(widget)}
                                           >
                                             <div className="flex items-center gap-2 mb-1">
                                               {getWidgetIcon(widget.icon)}
                                               <span className="text-xs font-medium truncate flex-1">{widget.name}</span>
                                               {isAlreadyAdded && (
                                                 <Badge variant="secondary" className="text-xs">Added</Badge>
                                               )}
                                             </div>
                                             <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                                               {widget.description}
                                             </p>
                                           </div>
                                         );
                                       })}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             ))}
                           </div>
                         </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Preview Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-openkey-blue">Widget Preview</h3>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddWidget}
                        variant="blue"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Dashboard
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleClose}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 border rounded-lg p-6 bg-muted/20 overflow-y-auto">
                    {selectedWidget && (
                      <CustomWidgetRenderer 
                        widget={{
                          id: 'preview',
                          widgetId: selectedWidget.id,
                          name: customName || selectedWidget.name,
                          description: customDescription || selectedWidget.description,
                          config: selectedWidget,
                          order: 0,
                          size: 'medium'
                        }}
                        isPreview={true}
                      />
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
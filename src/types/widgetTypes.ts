import { MockScenarioType, MockDataSection } from '@/utils/mockFinancialReports';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: MockDataSection;
  widgetType: string;
  componentType: 'metric' | 'chart' | 'panel';
  isCore?: boolean; // Whether this is a default/core widget
  group: 'core-metrics' | 'charts-trends' | 'analysis-tools' | 'comparative-analysis';
}

export interface WidgetSelectionState {
  [widgetId: string]: {
    selected: boolean;
    currentlyVisible: boolean;
  };
}

export interface WidgetSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  category: MockDataSection | MockDataSection[];
  onApplySelection: (selectedWidgets: string[]) => void;
  currentVisibleWidgets: string[];
  userAssets?: any[];
  userId?: string;
}

export interface WidgetGroup {
  id: string;
  name: string;
  description: string;
  widgets: WidgetDefinition[];
}
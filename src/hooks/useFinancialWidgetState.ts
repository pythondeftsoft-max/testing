import { useState, useEffect, useCallback } from 'react';
import { getCoreWidgets, getWidgetsForCategory } from '@/utils/widgetCatalog';
import { MockDataSection } from '@/utils/mockFinancialReports';

export interface WidgetState {
  visible: boolean;
  deletedAt?: Date;
  regenerationCount: number;
  isDynamic?: boolean;
  widgetType?: string;
  scenario?: string;
  category?: string;
}

export const useFinancialWidgetState = (userId: string) => {
  const [widgetStates, setWidgetStates] = useState<Record<string, WidgetState>>({});
  
  const storageKey = `financial-widget-states-${userId}`;

  // Load widget states from localStorage
  useEffect(() => {
    const savedStates = localStorage.getItem(storageKey);
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        // Convert date strings back to Date objects
        const processed = Object.entries(parsed).reduce((acc, [key, state]) => {
          acc[key] = {
            ...state as WidgetState,
            deletedAt: (state as any).deletedAt ? new Date((state as any).deletedAt) : undefined,
          };
          return acc;
        }, {} as Record<string, WidgetState>);
        setWidgetStates(processed);
      } catch (error) {
        console.error('Failed to parse widget states:', error);
      }
    }
  }, [storageKey]);

  // Save widget states to localStorage
  const saveWidgetStates = useCallback((newStates: Record<string, WidgetState>) => {
    setWidgetStates(newStates);
    localStorage.setItem(storageKey, JSON.stringify(newStates));
  }, [storageKey]);

  // Get widget state (defaults to NOT visible for unknown widgets)
  const getWidgetState = useCallback((widgetId: string): WidgetState => {
    // Always return the stored state if it exists
    if (widgetStates[widgetId]) {
      return widgetStates[widgetId];
    }
    
    // For widgets not in state, default to NOT visible
    // This ensures only explicitly selected widgets are shown
    return {
      visible: false,
      regenerationCount: 0,
    };
  }, [widgetStates]);

  // Check if widget is visible
  const isWidgetVisible = useCallback((widgetId: string): boolean => {
    return getWidgetState(widgetId).visible;
  }, [getWidgetState]);

  // Delete/hide a widget
  const deleteWidget = useCallback((widgetId: string) => {
    const newStates = {
      ...widgetStates,
      [widgetId]: {
        ...getWidgetState(widgetId),
        visible: false,
        deletedAt: new Date(),
      }
    };
    saveWidgetStates(newStates);
  }, [widgetStates, getWidgetState, saveWidgetStates]);

  // Regenerate/restore a widget
  const regenerateWidget = useCallback((widgetId: string) => {
    const currentState = getWidgetState(widgetId);
    const newStates = {
      ...widgetStates,
      [widgetId]: {
        visible: true,
        regenerationCount: currentState.regenerationCount + 1,
        deletedAt: undefined,
      }
    };
    saveWidgetStates(newStates);
  }, [widgetStates, getWidgetState, saveWidgetStates]);

  // Get regeneration count for cycling through mock data scenarios
  const getRegenerationCount = useCallback((widgetId: string): number => {
    return getWidgetState(widgetId).regenerationCount;
  }, [getWidgetState]);

  // Add a new dynamic widget
  const addDynamicWidget = useCallback((
    category: string,
    widgetType: string,
    scenario: string
  ) => {
    const widgetId = `${category}-${widgetType}-${Date.now()}`;
    const newStates = {
      ...widgetStates,
      [widgetId]: {
        visible: true,
        regenerationCount: 0,
        isDynamic: true,
        widgetType,
        scenario,
        category,
      }
    };
    saveWidgetStates(newStates);
    return widgetId;
  }, [widgetStates, saveWidgetStates]);

  // Get all dynamic widgets for a category
  const getDynamicWidgets = useCallback((category: string): Array<{
    id: string;
    state: WidgetState;
  }> => {
    return Object.entries(widgetStates)
      .filter(([_, state]) => state.isDynamic && state.category === category && state.visible)
      .map(([id, state]) => ({ id, state }));
  }, [widgetStates]);

  // Reset all widgets to visible
  const resetAllWidgets = useCallback(() => {
    saveWidgetStates({});
  }, [saveWidgetStates]);

  // Get deleted widgets (for showing regenerate options)
  const getDeletedWidgets = useCallback((): string[] => {
    return Object.entries(widgetStates)
      .filter(([_, state]) => !state.visible)
      .map(([widgetId]) => widgetId);
  }, [widgetStates]);

  return {
    isWidgetVisible,
    deleteWidget,
    regenerateWidget,
    getRegenerationCount,
    addDynamicWidget,
    getDynamicWidgets,
    resetAllWidgets,
    getDeletedWidgets,
    getWidgetState,
    
    // Batch operations for widget selection
    applyWidgetSelection: useCallback((selectedWidgetIds: string[], category: string) => {
      console.log('🔵 applyWidgetSelection called with:', {
        category,
        selectedCount: selectedWidgetIds.length,
        selectedIds: selectedWidgetIds
      });
      
      // Get ALL widgets for this category from the widget catalog
      const allCategoryWidgets = getWidgetsForCategory(category as MockDataSection);
      console.log('🔵 Total widgets in catalog for', category, ':', allCategoryWidgets.length);
      
      // Create new state object - start fresh to avoid stale data
      const newStates = { ...widgetStates };
      
      // Process every widget from the catalog
      allCategoryWidgets.forEach(widget => {
        const widgetId = widget.id;
        const isSelected = selectedWidgetIds.includes(widgetId);
        
        // Always create/update the state for this widget
        newStates[widgetId] = {
          visible: isSelected,
          regenerationCount: newStates[widgetId]?.regenerationCount || 0,
          deletedAt: isSelected ? undefined : new Date(),
          isDynamic: newStates[widgetId]?.isDynamic,
          widgetType: widget.widgetType,
          scenario: newStates[widgetId]?.scenario,
          category: category
        };
      });
      
      console.log('🔵 Saving widget states. Total widgets processed:', allCategoryWidgets.length);
      console.log('🔵 Selected widgets saved:', selectedWidgetIds.length);
      console.log('🔵 New state keys:', Object.keys(newStates).filter(k => 
        newStates[k].category === category
      ).length, 'for category', category);
      
      // Save both to state and localStorage
      saveWidgetStates(newStates);
    }, [widgetStates, saveWidgetStates]),
    
    getVisibleWidgets: useCallback((category: string): string[] => {
      // Get all widgets for the category
      const allWidgets = getWidgetsForCategory(category as MockDataSection);
      
      // Return only the widgets that are currently visible (checking actual state)
      return allWidgets.filter(widget => {
        const state = getWidgetState(widget.id);
        return state.visible;
      }).map(widget => widget.id);
    }, [getWidgetState])
  };
};
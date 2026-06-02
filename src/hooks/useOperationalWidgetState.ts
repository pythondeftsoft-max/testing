import { useState, useEffect, useCallback } from 'react';
import { getWidgetsForCategory } from '@/utils/widgetCatalog';
import { MockDataSection } from '@/utils/mockFinancialReports';

export interface OperationalWidgetState {
  visible: boolean;
  deletedAt?: Date;
  regenerationCount: number;
  isDynamic?: boolean;
  widgetType?: string;
  scenario?: string;
  category?: string;
}

export const useOperationalWidgetState = (userId: string) => {
  const [widgetStates, setWidgetStates] = useState<Record<string, OperationalWidgetState>>({});
  
  const storageKey = `operational-widget-states-${userId}`;

  useEffect(() => {
    const savedStates = localStorage.getItem(storageKey);
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        const processed = Object.entries(parsed).reduce((acc, [key, state]) => {
          acc[key] = {
            ...state as OperationalWidgetState,
            deletedAt: (state as any).deletedAt ? new Date((state as any).deletedAt) : undefined,
          };
          return acc;
        }, {} as Record<string, OperationalWidgetState>);
        setWidgetStates(processed);
      } catch (error) {
        console.error('Failed to parse operational widget states:', error);
      }
    }
  }, [storageKey]);

  const saveWidgetStates = useCallback((newStates: Record<string, OperationalWidgetState>) => {
    setWidgetStates(newStates);
    localStorage.setItem(storageKey, JSON.stringify(newStates));
  }, [storageKey]);

  const getWidgetState = useCallback((widgetId: string): OperationalWidgetState => {
    return widgetStates[widgetId] || {
      visible: true,
      regenerationCount: 0,
    };
  }, [widgetStates]);

  const isWidgetVisible = useCallback((widgetId: string): boolean => {
    const state = widgetStates[widgetId];
    // If no state exists, widget is visible by default
    if (!state) return true;
    return state.visible;
  }, [widgetStates]);

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

  const applyWidgetSelection = useCallback((selectedWidgetIds: string[], category: string | string[]) => {
    const categories = Array.isArray(category) ? category : [category];
    const newStates = { ...widgetStates };
    
    categories.forEach(cat => {
      // Get all catalog widgets for this category
      const catalogWidgetIds = getWidgetsForCategory(cat as MockDataSection).map(w => w.id);
      
      // Process all catalog widgets
      catalogWidgetIds.forEach(widgetId => {
        const isSelected = selectedWidgetIds.includes(widgetId);
        const currentState = newStates[widgetId];
        
        if (currentState) {
          // Update existing state
          newStates[widgetId] = {
            ...currentState,
            visible: isSelected,
            deletedAt: isSelected ? undefined : new Date(),
            category: cat
          };
        } else {
          // Create new state entry only if being deselected (selected is default)
          if (!isSelected) {
            newStates[widgetId] = {
              visible: false,
              regenerationCount: 0,
              deletedAt: new Date(),
              category: cat
            };
          }
        }
      });
      
      // Process widgets that are in state but not in catalog (dynamic widgets)
      Object.keys(newStates).forEach(widgetId => {
        if (newStates[widgetId]?.category === cat && !catalogWidgetIds.includes(widgetId)) {
          const isSelected = selectedWidgetIds.includes(widgetId);
          newStates[widgetId] = {
            ...newStates[widgetId],
            visible: isSelected,
            deletedAt: isSelected ? undefined : new Date(),
          };
        }
      });
      
      // Add any newly selected widgets that don't exist yet
      selectedWidgetIds.forEach(widgetId => {
        if (!newStates[widgetId] && !catalogWidgetIds.includes(widgetId)) {
          newStates[widgetId] = {
            visible: true,
            regenerationCount: 0,
            category: cat
          };
        }
      });
    });
    
    saveWidgetStates(newStates);
  }, [widgetStates, saveWidgetStates]);

  const getVisibleWidgets = useCallback((category: string | string[]): string[] => {
    const categories = Array.isArray(category) ? category : [category];
    
    // Collect all visible widgets across all specified categories
    const visibleWidgetIds = new Set<string>();
    
    categories.forEach(cat => {
      // Get all widgets from catalog for this category
      const catalogWidgetIds = getWidgetsForCategory(cat as MockDataSection).map(w => w.id);
      
      // Add catalog widgets that either don't have state (default visible) or are visible
      catalogWidgetIds.forEach(widgetId => {
        const state = widgetStates[widgetId];
        if (!state || state.visible) {
          visibleWidgetIds.add(widgetId);
        }
      });
      
      // Add any additional widgets from state that are visible and match category
      Object.keys(widgetStates).forEach(widgetId => {
        const state = widgetStates[widgetId];
        if (state?.visible && state.category === cat) {
          visibleWidgetIds.add(widgetId);
        }
      });
    });
    
    return Array.from(visibleWidgetIds);
  }, [widgetStates]);

  return {
    isWidgetVisible,
    deleteWidget,
    regenerateWidget,
    addDynamicWidget,
    applyWidgetSelection,
    getVisibleWidgets,
    getWidgetState,
  };
};
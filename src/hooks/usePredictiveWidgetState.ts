import { useState, useEffect, useCallback } from 'react';

export interface PredictiveWidgetState {
  visible: boolean;
  deletedAt?: Date;
  regenerationCount: number;
  isDynamic?: boolean;
  widgetType?: string;
  scenario?: string;
  category?: string;
}

export const usePredictiveWidgetState = (userId: string) => {
  const [widgetStates, setWidgetStates] = useState<Record<string, PredictiveWidgetState>>({});
  
  const storageKey = `predictive-widget-states-${userId}`;

  useEffect(() => {
    const savedStates = localStorage.getItem(storageKey);
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        const processed = Object.entries(parsed).reduce((acc, [key, state]) => {
          acc[key] = {
            ...state as PredictiveWidgetState,
            deletedAt: (state as any).deletedAt ? new Date((state as any).deletedAt) : undefined,
          };
          return acc;
        }, {} as Record<string, PredictiveWidgetState>);
        setWidgetStates(processed);
      } catch (error) {
        console.error('Failed to parse predictive widget states:', error);
      }
    }
  }, [storageKey]);

  const saveWidgetStates = useCallback((newStates: Record<string, PredictiveWidgetState>) => {
    setWidgetStates(newStates);
    localStorage.setItem(storageKey, JSON.stringify(newStates));
  }, [storageKey]);

  const getWidgetState = useCallback((widgetId: string, defaultVisible: boolean = true): PredictiveWidgetState => {
    return widgetStates[widgetId] || {
      visible: defaultVisible,
      regenerationCount: 0,
    };
  }, [widgetStates]);

  const isWidgetVisible = useCallback((widgetId: string, defaultVisible: boolean = true): boolean => {
    return getWidgetState(widgetId, defaultVisible).visible;
  }, [getWidgetState]);

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

  const applyWidgetSelection = useCallback((
    selectedWidgetIds: string[], 
    category: string,
    allPossibleWidgetIds: string[] = []
  ) => {
    const newStates = { ...widgetStates };
    
    // Use allPossibleWidgetIds if provided, otherwise fall back to stored category widgets
    const widgetsToUpdate = allPossibleWidgetIds.length > 0 
      ? allPossibleWidgetIds
      : Object.keys(newStates).filter(id => newStates[id]?.category === category);
    
    // Update all widgets in the category
    widgetsToUpdate.forEach(widgetId => {
      const isSelected = selectedWidgetIds.includes(widgetId);
      const currentState = newStates[widgetId];
      
      if (currentState) {
        newStates[widgetId] = {
          ...currentState,
          visible: isSelected,
          deletedAt: isSelected ? undefined : new Date(),
          category: category
        };
      } else {
        // Initialize state for widgets that don't have state yet
        newStates[widgetId] = {
          visible: isSelected,
          regenerationCount: 0,
          category: category,
          deletedAt: isSelected ? undefined : new Date()
        };
      }
    });
    
    saveWidgetStates(newStates);
  }, [widgetStates, saveWidgetStates]);

  const getVisibleWidgets = useCallback((possibleWidgetIds: string[], defaultVisible: boolean = true): string[] => {
    return possibleWidgetIds.filter(id => isWidgetVisible(id, defaultVisible));
  }, [isWidgetVisible]);

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
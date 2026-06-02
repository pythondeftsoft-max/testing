import { useState, useEffect, useCallback } from 'react';

export interface TenantWidgetState {
  isVisible: boolean;
  regenerationCount: number;
  isDynamic?: boolean;
  widgetType?: string;
  scenario?: string;
  category?: string;
}

// Default visible widgets for different categories
const DEFAULT_VISIBLE_WIDGETS = {
  'tenant-lifecycle': [
    'total-tenants',
    'tenant-retention-rate',
    'average-tenancy',
    'tenant-acquisition-cost',
    'satisfaction-score',
    'response-time',
    'complaint-resolution',
    'at-risk-count',
    'new-tenants',
    'tenants-leaving',
    'communication-score',
    'maintenance-score',
    'tenant-turnover-rate',
    'payment-delinquency-rate',
    'tenant-lifetime-value',
    'tenant-profitability-score',
    'lease-violation-rate',
    'satisfaction-breakdown',
    'tenant-turnover-trends',
    'risk-level-distribution',
    'retention-rate-timeline',
    'tenant-satisfaction-trends',
    'lease-expiration-calendar',
    'risk-assessment',
    'retention-strategy-recommendations',
    'tenant-communication-log',
    'tenant-profitability-analysis',
    'property-retention-comparison',
    'tenant-age-distribution'
  ],
  'lease-rent-optimization': [
    'renewal-rate',
    'market-rent-comparison',
    'rent-optimization-potential',
    'lease-performance-timeline',
    'lease-expiration-tracker',
    'rent-increase-opportunities',
    'pricing-strategy',
    'average-lease-term',
    'total-leases',
    'current-average-rent',
    'market-rent-gap',
    'lease-renewal-success',
    'rent-collection-efficiency',
    'lease-compliance-score',
    'rent-trends-over-time',
    'lease-renewal-pipeline',
    'rent-distribution-analysis',
    'seasonal-renewal-patterns',
    'lease-length-distribution',
    'market-rent-analyzer',
    'lease-negotiation-insights',
    'rent-increase-impact-simulator',
    'tenant-rent-affordability',
    'pricing-strategy-recommendations',
    'property-lease-performance',
    'portfolio-rent-benchmarks',
    'year-over-year-lease-metrics',
    'competitive-rent-positioning'
  ]
};

export const useTenantWidgetState = (userId: string) => {
  const [widgetStates, setWidgetStates] = useState<Record<string, TenantWidgetState>>({});
  
  const storageKey = `tenant-widget-states-${userId}`;

  // Load widget states from localStorage
  useEffect(() => {
    const savedStates = localStorage.getItem(storageKey);
    if (savedStates) {
      try {
        setWidgetStates(JSON.parse(savedStates));
      } catch (error) {
        console.error('Failed to parse tenant widget states from localStorage:', error);
      }
    }
  }, [storageKey]);

  // Save to localStorage whenever states change
  const saveStates = useCallback((newStates: Record<string, TenantWidgetState>) => {
    setWidgetStates(newStates);
    localStorage.setItem(storageKey, JSON.stringify(newStates));
  }, [storageKey]);

  const updateWidgetVisibility = useCallback((widgetId: string, isVisible: boolean) => {
    const newStates = {
      ...widgetStates,
      [widgetId]: {
        ...widgetStates[widgetId],
        isVisible,
        regenerationCount: widgetStates[widgetId]?.regenerationCount || 0,
      }
    };
    saveStates(newStates);
  }, [widgetStates, saveStates]);

  const deleteWidget = useCallback((widgetId: string) => {
    const newStates = { ...widgetStates };
    delete newStates[widgetId];
    saveStates(newStates);
  }, [widgetStates, saveStates]);

  const regenerateWidget = useCallback((widgetId: string) => {
    const currentState = widgetStates[widgetId] || { isVisible: true, regenerationCount: 0 };
    const newStates = {
      ...widgetStates,
      [widgetId]: {
        ...currentState,
        regenerationCount: currentState.regenerationCount + 1,
      }
    };
    saveStates(newStates);
  }, [widgetStates, saveStates]);

  const getRegenerationCount = useCallback((widgetId: string): number => {
    return widgetStates[widgetId]?.regenerationCount || 0;
  }, [widgetStates]);

  const isWidgetVisible = useCallback((widgetId: string): boolean => {
    // If we have a saved state, use it
    if (widgetStates[widgetId] !== undefined) {
      return widgetStates[widgetId].isVisible !== false;
    }
    
    // For new widgets, check if they're in the default visible list
    // Determine category by checking which default list contains the widget
    let category = 'tenant-lifecycle'; // default fallback
    
    for (const [categoryKey, widgets] of Object.entries(DEFAULT_VISIBLE_WIDGETS)) {
      if (widgets.includes(widgetId)) {
        category = categoryKey;
        break;
      }
    }
    
    const defaultVisible = DEFAULT_VISIBLE_WIDGETS[category] || [];
    return defaultVisible.includes(widgetId);
  }, [widgetStates]);

  const addDynamicWidget = useCallback((
    widgetId: string, 
    widgetType: string, 
    scenario: string, 
    category: string
  ) => {
    const newStates = {
      ...widgetStates,
      [widgetId]: {
        isVisible: true,
        regenerationCount: 0,
        isDynamic: true,
        widgetType,
        scenario,
        category,
      }
    };
    saveStates(newStates);
  }, [widgetStates, saveStates]);

  const getDynamicWidgets = useCallback((category: string) => {
    return Object.entries(widgetStates)
      .filter(([_, state]) => state.isDynamic && state.category === category)
      .map(([widgetId, state]) => ({
        widgetId,
        widgetType: state.widgetType || '',
        scenario: state.scenario || '',
        isVisible: state.isVisible,
        regenerationCount: state.regenerationCount,
      }));
  }, [widgetStates]);

  const applyWidgetSelection = useCallback((category: string, selectedWidgetIds: string[]) => {
    const newStates = { ...widgetStates };
    
    // Get ALL widgets for this category:
    // 1. Widgets already in state
    const stateWidgets = Object.keys(newStates).filter(widgetId => 
      newStates[widgetId].category === category || widgetId.includes(category)
    );
    
    // 2. Default visible widgets for this category
    const defaultWidgets = DEFAULT_VISIBLE_WIDGETS[category] || [];
    
    // Combine and deduplicate
    const allCategoryWidgets = [...new Set([...stateWidgets, ...defaultWidgets])];
    
    // Update visibility for ALL widgets (including defaults not yet in state)
    allCategoryWidgets.forEach(widgetId => {
      const isSelected = selectedWidgetIds.includes(widgetId);
      if (newStates[widgetId]) {
        // Update existing widget - ALWAYS set category
        newStates[widgetId] = {
          ...newStates[widgetId],
          isVisible: isSelected,
          category, // Always set category
        };
      } else {
        // Create new entry for default widgets not yet in state
        newStates[widgetId] = {
          isVisible: isSelected,
          regenerationCount: 0,
          category,
        };
      }
    });

    saveStates(newStates);
  }, [widgetStates, saveStates]);

  const getVisibleWidgets = useCallback((category: string) => {
    const visibleWidgets: string[] = [];
    
    // Get default widgets for this category
    const defaultWidgets = DEFAULT_VISIBLE_WIDGETS[category] || [];
    
    // Check each default widget's visibility
    defaultWidgets.forEach(widgetId => {
      if (isWidgetVisible(widgetId)) {
        visibleWidgets.push(widgetId);
      }
    });
    
    // Also check for any dynamic/custom widgets in the state for this category
    Object.entries(widgetStates).forEach(([widgetId, state]) => {
      if (state.isVisible && 
          state.category === category && 
          !defaultWidgets.includes(widgetId)) {
        visibleWidgets.push(widgetId);
      }
    });
    
    return visibleWidgets;
  }, [widgetStates, isWidgetVisible]);

  return {
    updateWidgetVisibility,
    deleteWidget,
    regenerateWidget,
    getRegenerationCount,
    isWidgetVisible,
    addDynamicWidget,
    getDynamicWidgets,
    applyWidgetSelection,
    getVisibleWidgets,
  };
};
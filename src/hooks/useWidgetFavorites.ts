import { useState, useEffect } from 'react';

export interface FavoriteWidget {
  id: string;
  tab: 'custom-overview' | 'analytics' | 'properties' | 'assets' | 'financial' | 'hap' | 'operational' | 'performance' | 'tenants';
  category: string;
  title: string;
  componentType: 'metric' | 'chart' | 'panel';
  // Widget definition for re-rendering predictive analytics widgets
  widgetDefinition?: any; // WidgetDefinition type from widgetTypes.ts
  // Enhanced data for full widget rendering
  widgetProps?: {
    value?: string | number;
    subtitle?: string;
    icon?: string; // icon name as string
    iconColor?: string;
    badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
    trend?: { value: number; isPositive: boolean; period?: string };
    formatValue?: 'currency' | 'percentage' | 'number';
    variant?: 'default' | 'gradient' | 'compact';
    description?: string;
    infoText?: string;
    className?: string;
  };
  // Chart-specific configuration for complex widgets
  chartConfig?: {
    chartType?: 'speedometer' | 'bar' | 'line' | 'pie';
    maxValue?: number;
    zones?: {
      min: number;
      max: number;
      color: string;
      label: string;
    }[];
    data?: any[];
    additionalProps?: Record<string, any>;
  };
}

export const useWidgetFavorites = (currentUserId: string) => {
  const [favoriteWidgets, setFavoriteWidgets] = useState<string[]>([]);
  const [favoriteWidgetData, setFavoriteWidgetData] = useState<FavoriteWidget[]>([]);

  const storageKey = `portfolio-widget-favorites-${currentUserId}`;
  const dataStorageKey = `portfolio-widget-data-${currentUserId}`;

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(storageKey);
    const savedData = localStorage.getItem(dataStorageKey);
    
    if (savedFavorites) {
      setFavoriteWidgets(JSON.parse(savedFavorites));
    }
    
    if (savedData) {
      setFavoriteWidgetData(JSON.parse(savedData));
    }
  }, [currentUserId, storageKey, dataStorageKey]);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[], newData?: FavoriteWidget[]) => {
    console.log('saveFavorites - newFavorites:', newFavorites);
    console.log('saveFavorites - newData:', newData);
    
    setFavoriteWidgets(newFavorites);
    localStorage.setItem(storageKey, JSON.stringify(newFavorites));
    
    if (newData) {
      setFavoriteWidgetData(newData);
      const stringifiedData = JSON.stringify(newData);
      localStorage.setItem(dataStorageKey, stringifiedData);
      console.log('saveFavorites - Saved to localStorage, stringified length:', stringifiedData.length);
      
      // Verify what was actually saved
      const retrieved = localStorage.getItem(dataStorageKey);
      const parsed = retrieved ? JSON.parse(retrieved) : null;
      console.log('saveFavorites - Verification: retrieved from localStorage:', parsed);
      console.log('saveFavorites - Verification: widgetDefinition in storage:', parsed?.[parsed.length - 1]?.widgetDefinition);
    }
  };

  const isFavorited = (widgetId: string) => {
    return favoriteWidgets.includes(widgetId);
  };

  const toggleFavorite = (widgetId: string, widgetData?: FavoriteWidget) => {
    console.log('toggleFavorite - widgetId:', widgetId);
    console.log('toggleFavorite - widgetData:', widgetData);
    console.log('toggleFavorite - widgetData.widgetDefinition:', widgetData?.widgetDefinition);
    
    const isCurrentlyFavorited = favoriteWidgets.includes(widgetId);
    
    let newFavorites: string[];
    let newData = [...favoriteWidgetData];
    
    if (isCurrentlyFavorited) {
      // Remove from favorites
      newFavorites = favoriteWidgets.filter(id => id !== widgetId);
      newData = favoriteWidgetData.filter(widget => widget.id !== widgetId);
      console.log('toggleFavorite - Removing from favorites');
    } else {
      // Add to favorites
      newFavorites = [...favoriteWidgets, widgetId];
      if (widgetData) {
        // Remove existing data for this widget (if any) and add new data
        newData = favoriteWidgetData.filter(widget => widget.id !== widgetId);
        newData.push(widgetData);
        console.log('toggleFavorite - Adding to favorites, newData:', newData);
        console.log('toggleFavorite - newData last item widgetDefinition:', newData[newData.length - 1]?.widgetDefinition);
      }
    }
    
    saveFavorites(newFavorites, newData);
  };

  const getFavoritesByTab = (tab: string) => {
    return favoriteWidgetData.filter(widget => widget.tab === tab);
  };

  const getFavoritesByCategory = (category: string) => {
    return favoriteWidgetData.filter(widget => widget.category === category);
  };

  const clearAllFavorites = () => {
    saveFavorites([], []);
  };

  return {
    favoriteWidgets,
    favoriteWidgetData,
    isFavorited,
    toggleFavorite,
    getFavoritesByTab,
    getFavoritesByCategory,
    clearAllFavorites,
    totalFavorites: favoriteWidgets.length,
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemConfigItem {
  id: string;
  config_key: string;
  config_value: any;
  description: string | null;
  config_type: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export const useSystemConfig = () => {
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('config_key');

      if (error) throw error;
      
      // Process the config values for display
      const processedConfigs = (data || []).map(config => ({
        ...config,
        config_value: typeof config.config_value === 'string' 
          ? config.config_value 
          : JSON.stringify(config.config_value)
      }));
      
      setConfigs(processedConfigs);
      setError(null);
    } catch (err) {
      console.error('Error fetching system config:', err);
      setError('Failed to fetch system configuration');
      toast({
        title: "Error",
        description: "Failed to load system configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (configKey: string, newValue: any) => {
    try {
      // Process the value for storage
      let processedValue = newValue;
      if (typeof newValue === 'string') {
        // Try to parse boolean and number strings
        if (newValue === 'true') processedValue = true;
        else if (newValue === 'false') processedValue = false;
        else if (!isNaN(Number(newValue)) && newValue.trim() !== '') {
          processedValue = Number(newValue);
        }
        // Try to parse JSON strings
        else if ((newValue.startsWith('[') || newValue.startsWith('{')) && newValue.endsWith(']') || newValue.endsWith('}')) {
          try {
            processedValue = JSON.parse(newValue);
          } catch {
            // Keep as string if JSON parsing fails
          }
        }
      }

      const { error } = await supabase
        .from('system_config')
        .update({ 
          config_value: processedValue,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', configKey);

      if (error) throw error;

      // Update local state
      setConfigs(prev => prev.map(config => 
        config.config_key === configKey 
          ? { 
              ...config, 
              config_value: typeof processedValue === 'string' 
                ? processedValue 
                : JSON.stringify(processedValue),
              updated_at: new Date().toISOString() 
            }
          : config
      ));

      toast({
        title: "Success",
        description: `Updated ${configKey} successfully`,
      });

      return true;
    } catch (err) {
      console.error('Error updating config:', err);
      toast({
        title: "Error",
        description: `Failed to update ${configKey}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const getConfigValue = (key: string, fallback: any = null) => {
    const config = configs.find(c => c.config_key === key);
    if (!config) return fallback;
    
    let value = config.config_value;
    // Parse string values back to their appropriate types
    if (typeof value === 'string') {
      try {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(Number(value)) && value.trim() !== '') return Number(value);
        if ((value.startsWith('[') || value.startsWith('{')) && (value.endsWith(']') || value.endsWith('}'))) {
          return JSON.parse(value);
        }
      } catch {
        // Return as string if parsing fails
      }
    }
    return value;
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    updateConfig,
    getConfigValue,
    refetch: fetchConfigs
  };
};

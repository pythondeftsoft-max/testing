
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SavedProperty {
  id: string;
  property_id: string;
  user_id: string;
  created_at: string;
}

export const useSavedProperties = (userId: string | undefined) => {
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchSavedProperties();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchSavedProperties = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_properties')
        .select('property_id')
        .eq('user_id', userId);

      if (error) throw error;
      
      setSavedPropertyIds(new Set(data?.map(item => item.property_id) || []));
    } catch (error) {
      console.error('Error fetching saved properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProperty = async (propertyId: string) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please log in to save properties",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_properties')
        .insert({ user_id: userId, property_id: propertyId });

      if (error) throw error;
      
      setSavedPropertyIds(prev => new Set(prev).add(propertyId));
      
      toast({
        title: "Property Saved",
        description: "You can find this property in your saved list",
      });
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Already Saved",
          description: "This property is already in your saved list",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save property. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const unsaveProperty = async (propertyId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);

      if (error) throw error;
      
      setSavedPropertyIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
      
      toast({
        title: "Property Removed",
        description: "Property removed from your saved list",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove property. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleSaveProperty = (propertyId: string) => {
    if (savedPropertyIds.has(propertyId)) {
      unsaveProperty(propertyId);
    } else {
      saveProperty(propertyId);
    }
  };

  return {
    savedPropertyIds,
    loading,
    saveProperty,
    unsaveProperty,
    toggleSaveProperty,
    isSaved: (propertyId: string) => savedPropertyIds.has(propertyId)
  };
};

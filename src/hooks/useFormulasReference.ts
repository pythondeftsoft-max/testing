import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface FormulaVariable {
  name: string;
  description: string;
}

export interface FormulaMockExample {
  inputs: Record<string, number>;
  calculation: string;
  result: string;
}

export interface PlatformFormula {
  id: string;
  name: string;
  description: string;
  formula: string;
  category: 'financial' | 'performance' | 'occupancy' | 'investment' | 'health';
  variables: FormulaVariable[];
  mock_example: FormulaMockExample;
  used_in: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateFormulaInput {
  name: string;
  description: string;
  formula: string;
  category: PlatformFormula['category'];
  variables: FormulaVariable[];
  mock_example: FormulaMockExample;
  used_in: string[];
}

export interface UpdateFormulaInput extends Partial<CreateFormulaInput> {
  id: string;
}

const parseVariables = (raw: Json | null): FormulaVariable[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((v: any) => ({
    name: v?.name || '',
    description: v?.description || '',
  }));
};

const parseMockExample = (raw: Json | null): FormulaMockExample => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { inputs: {}, calculation: '', result: '' };
  }
  const obj = raw as Record<string, any>;
  return {
    inputs: obj.inputs || {},
    calculation: obj.calculation || '',
    result: obj.result || '',
  };
};

export const useFormulas = (category?: string) => {
  return useQuery({
    queryKey: ['platform-formulas', category],
    queryFn: async () => {
      let query = supabase
        .from('platform_formulas')
        .select('*')
        .order('category')
        .order('name');

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(formula => ({
        id: formula.id,
        name: formula.name,
        description: formula.description,
        formula: formula.formula,
        category: formula.category as PlatformFormula['category'],
        variables: parseVariables(formula.variables),
        mock_example: parseMockExample(formula.mock_example),
        used_in: Array.isArray(formula.used_in) ? formula.used_in : [],
        is_system: formula.is_system,
        created_at: formula.created_at,
        updated_at: formula.updated_at,
        created_by: formula.created_by,
      })) as PlatformFormula[];
    },
  });
};

export const useCreateFormula = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFormulaInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('platform_formulas')
        .insert({
          name: input.name,
          description: input.description,
          formula: input.formula,
          category: input.category,
          variables: input.variables as unknown as Json,
          mock_example: input.mock_example as unknown as Json,
          used_in: input.used_in,
          created_by: user?.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-formulas'] });
      toast.success('Formula created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create formula', { description: error.message });
    },
  });
};

export const useUpdateFormula = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateFormulaInput) => {
      const updateData: Record<string, any> = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.formula !== undefined) updateData.formula = input.formula;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.variables !== undefined) updateData.variables = input.variables as unknown as Json;
      if (input.mock_example !== undefined) updateData.mock_example = input.mock_example as unknown as Json;
      if (input.used_in !== undefined) updateData.used_in = input.used_in;

      const { data, error } = await supabase
        .from('platform_formulas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-formulas'] });
      toast.success('Formula updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update formula', { description: error.message });
    },
  });
};

export const useDeleteFormula = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_formulas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-formulas'] });
      toast.success('Formula deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete formula', { description: error.message });
    },
  });
};

import { Database } from '@/integrations/supabase/types';

export type ImplementationTask = Database['public']['Tables']['implementation_tasks']['Row'];

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
  notes?: string;
}

export interface TaskWithProgress {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string | null;
  previous_status: string | null;
  estimated_time: string | null;
  actual_time: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  source: string;
  ai_reasoning: string | null;
  order_index: number;
  dependencies: string[];
  subtasks: Subtask[];
  completedSubtasks: number;
  totalSubtasks: number;
  completionPercentage: number;
}

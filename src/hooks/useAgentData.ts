import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface AgentTask {
  id: string;
  agent_id: string;
  title: string;
  status: string;
  priority: string;
  detail: string | null;
  requires_approval: boolean;
  approved_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentActivityLog {
  id: string;
  agent_id: string;
  action: string;
  detail: string | null;
  related_agent_id: string | null;
  log_type: string;
  created_at: string;
}

export interface AgentMemoryEntry {
  id: string;
  agent_id: string;
  key: string;
  value: string;
  ttl_hours: number;
  expires_at: string;
  created_at: string;
}

// Hooks
export const useAgentTasks = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent-tasks', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (agentId) query = query.eq('agent_id', agentId);
      const { data, error } = await query;
      if (error) throw error;
      return data as AgentTask[];
    },
  });
};

export const useAgentApprovals = () => {
  return useQuery({
    queryKey: ['agent-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('requires_approval', true)
        .is('approved_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AgentTask[];
    },
  });
};

export const useAgentActivityLogs = (agentId?: string, logType?: string) => {
  return useQuery({
    queryKey: ['agent-activity-logs', agentId, logType],
    queryFn: async () => {
      let query = supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (agentId) query = query.eq('agent_id', agentId);
      if (logType) query = query.eq('log_type', logType);
      const { data, error } = await query;
      if (error) throw error;
      return data as AgentActivityLog[];
    },
  });
};

export const useAgentMemory = (agentId?: string) => {
  return useQuery({
    queryKey: ['agent-memory', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (agentId) query = query.eq('agent_id', agentId);
      const { data, error } = await query;
      if (error) throw error;
      return data as AgentMemoryEntry[];
    },
  });
};

// Mutations
export const useApproveTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('agent_tasks')
        .update({ approved_at: new Date().toISOString(), status: 'in_progress' })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approvals'] });
    },
  });
};

export const useRejectTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('agent_tasks')
        .update({ status: 'failed' })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['agent-approvals'] });
    },
  });
};

// Run Scout
export const useRunScout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('agent-scout');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scout-findings'] });
      queryClient.invalidateQueries({ queryKey: ['agent-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['agent-memory'] });
    },
  });
};

// Run Briefing
export const useRunBriefing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('agent-briefing');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-activity-logs'] });
      queryClient.invalidateQueries({ queryKey: ['agent-memory'] });
    },
  });
};

// Stats
export const useAgentStats = () => {
  return useQuery({
    queryKey: ['agent-stats'],
    queryFn: async () => {
      const [tasksRes, approvalsRes, memoryRes, logsRes] = await Promise.all([
        supabase.from('agent_tasks').select('id, status, agent_id', { count: 'exact' }),
        supabase.from('agent_tasks').select('id', { count: 'exact' }).eq('requires_approval', true).is('approved_at', null),
        supabase.from('agent_memory').select('id', { count: 'exact' }),
        supabase.from('agent_activity_logs').select('agent_id, created_at').order('created_at', { ascending: false }).limit(100),
      ]);

      const tasks = tasksRes.data || [];
      const activeAgents = new Set(
        (logsRes.data || [])
          .filter(l => {
            const age = (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
            return age < 24;
          })
          .map(l => l.agent_id)
      ).size;

      return {
        totalTasks: tasksRes.count || 0,
        activeAgents,
        matchesPushed: 0, // will be computed later
        approvalsPending: approvalsRes.count || 0,
      };
    },
  });
};

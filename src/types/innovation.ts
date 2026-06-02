export interface InnovationIdea {
  id: string;
  user_id: string | null;
  source_url: string | null;
  source_platform: 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'linkedin' | 'other' | null;
  video_transcript: string | null;
  raw_description: string | null;
  ai_analysis: {
    summary?: string;
    key_features?: string[];
    implementation_suggestions?: string[];
    potential_challenges?: string[];
  } | null;
  tool_name: string | null;
  applicability: string | null;
  category: 'ai_sales' | 'ai_tools' | 'seo' | 'automation' | 'ui_ux' | 'marketing' | 'analytics' | 'integration' | 'other' | null;
  impact_score: number | null;
  effort_score: number | null;
  suggested_tasks: {
    title: string;
    description?: string;
    priority?: string;
  }[] | null;
  status: 'pending' | 'analyzing' | 'analyzed' | 'approved' | 'rejected' | 'implemented';
  implementation_task_id: string | null;
  n8n_workflow_run_id: string | null;
  created_at: string;
  updated_at: string;
}

export type InnovationIdeaInsert = Omit<InnovationIdea, 'id' | 'created_at' | 'updated_at'>;
export type InnovationIdeaUpdate = Partial<InnovationIdeaInsert>;

export const PLATFORM_OPTIONS = [
  { value: 'tiktok', label: 'TikTok', icon: '📱' },
  { value: 'instagram', label: 'Instagram', icon: '📷' },
  { value: 'youtube', label: 'YouTube', icon: '▶️' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'other', label: 'Other', icon: '🔗' },
] as const;

export const CATEGORY_OPTIONS = [
  { value: 'ai_sales', label: 'AI Sales', color: 'bg-purple-100 text-purple-800' },
  { value: 'ai_tools', label: 'AI Tools', color: 'bg-blue-100 text-blue-800' },
  { value: 'seo', label: 'SEO', color: 'bg-green-100 text-green-800' },
  { value: 'automation', label: 'Automation', color: 'bg-orange-100 text-orange-800' },
  { value: 'ui_ux', label: 'UI/UX', color: 'bg-pink-100 text-pink-800' },
  { value: 'marketing', label: 'Marketing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'analytics', label: 'Analytics', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'integration', label: 'Integration', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
] as const;

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'analyzing', label: 'Analyzing', color: 'bg-blue-100 text-blue-800' },
  { value: 'analyzed', label: 'Analyzed', color: 'bg-green-100 text-green-800' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'implemented', label: 'Implemented', color: 'bg-purple-100 text-purple-800' },
] as const;

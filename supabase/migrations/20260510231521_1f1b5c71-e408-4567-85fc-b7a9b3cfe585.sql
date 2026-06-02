
CREATE TABLE public.qa_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_mix JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_pct INTEGER NOT NULL DEFAULT 0,
  summary JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qa_pipeline_runs"
  ON public.qa_pipeline_runs
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.qa_pipeline_stage_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.qa_pipeline_runs(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  passed BOOLEAN,
  duration_ms INTEGER,
  manual_flag BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_pipeline_stage_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qa_pipeline_stage_results"
  ON public.qa_pipeline_stage_results
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.qa_manual_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL,
  passed BOOLEAN,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.qa_manual_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage qa_manual_runs"
  ON public.qa_manual_runs
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_qa_pipeline_runs_status ON public.qa_pipeline_runs(status);
CREATE INDEX idx_qa_pipeline_stage_results_run ON public.qa_pipeline_stage_results(run_id);
CREATE INDEX idx_qa_manual_runs_item ON public.qa_manual_runs(item_key);

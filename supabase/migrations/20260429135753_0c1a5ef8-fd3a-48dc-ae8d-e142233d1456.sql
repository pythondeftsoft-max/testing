update public.pha_enrichment_jobs
set status = 'stalled',
    finished_at = coalesce(finished_at, now())
where id = '852ce398-a7aa-49ea-8d92-8eafac3beb5b'
  and status = 'running';
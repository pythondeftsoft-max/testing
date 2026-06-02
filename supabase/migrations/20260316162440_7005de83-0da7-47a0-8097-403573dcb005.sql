CREATE POLICY "Authenticated users can insert into compute queue"
ON public.match_compute_queue
FOR INSERT
TO authenticated
WITH CHECK (true);
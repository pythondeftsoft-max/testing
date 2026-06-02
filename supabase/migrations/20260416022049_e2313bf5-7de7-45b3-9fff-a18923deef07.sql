
-- Storage bucket only (policies already exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('agency-documents', 'agency-documents', false)
ON CONFLICT (id) DO NOTHING;

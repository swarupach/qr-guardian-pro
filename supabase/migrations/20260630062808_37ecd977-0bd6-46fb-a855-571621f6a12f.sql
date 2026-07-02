CREATE TABLE public.scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  qr_content TEXT NOT NULL,
  qr_type TEXT NOT NULL,
  security_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  decoded_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_history TO authenticated;
GRANT ALL ON public.scan_history TO service_role;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own_scans" ON public.scan_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_scans" ON public.scan_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_scans" ON public.scan_history FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX scan_history_user_created_idx ON public.scan_history(user_id, created_at DESC);
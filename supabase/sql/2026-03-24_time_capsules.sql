-- Time capsules: sealed memory containers that open after a defined time window
-- Part of the "extensiones estratégicas" block

CREATE TABLE IF NOT EXISTS public.time_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Capsula del tiempo',
  sealed_at timestamptz NOT NULL DEFAULT now(),
  opens_at date NOT NULL,
  opened_at timestamptz,
  status text NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'ready', 'opened')),
  window_code text NOT NULL DEFAULT '1y' CHECK (window_code IN ('1y', '3y', '5y', '10y', 'custom')),
  content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sealed_by uuid NOT NULL REFERENCES auth.users(id),
  flower_family text,
  location_lat double precision,
  location_lng double precision,
  location_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient garden-scoped queries
CREATE INDEX IF NOT EXISTS idx_time_capsules_garden_id ON public.time_capsules(garden_id);
CREATE INDEX IF NOT EXISTS idx_time_capsules_status ON public.time_capsules(status);
CREATE INDEX IF NOT EXISTS idx_time_capsules_opens_at ON public.time_capsules(opens_at);

-- RLS policies: garden members can read/write their garden's capsules
ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "time_capsules_select_garden_member"
  ON public.time_capsules FOR SELECT
  USING (
    garden_id IN (
      SELECT gm.garden_id FROM public.garden_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "time_capsules_insert_garden_member"
  ON public.time_capsules FOR INSERT
  WITH CHECK (
    garden_id IN (
      SELECT gm.garden_id FROM public.garden_members gm
      WHERE gm.user_id = auth.uid()
    )
    AND sealed_by = auth.uid()
  );

CREATE POLICY "time_capsules_update_garden_member"
  ON public.time_capsules FOR UPDATE
  USING (
    garden_id IN (
      SELECT gm.garden_id FROM public.garden_members gm
      WHERE gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    garden_id IN (
      SELECT gm.garden_id FROM public.garden_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

-- No DELETE policy: capsules should not be deleted, only opened

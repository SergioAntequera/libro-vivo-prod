-- Annual tree ritual: tracks the symbolic/physical act of planting a tree each year
-- Integrates with map (ritual_tree place kind) and activity feed

CREATE TABLE IF NOT EXISTS public.annual_tree_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id uuid NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planted', 'confirmed')),
  planted_at timestamptz,
  planted_by uuid REFERENCES auth.users(id),
  location_lat double precision,
  location_lng double precision,
  location_label text,
  map_place_id uuid REFERENCES public.map_places(id),
  notes text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (garden_id, year)
);

CREATE INDEX IF NOT EXISTS idx_annual_tree_rituals_garden_id ON public.annual_tree_rituals(garden_id);

ALTER TABLE public.annual_tree_rituals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "annual_tree_rituals_select_garden_member"
  ON public.annual_tree_rituals FOR SELECT
  USING (
    garden_id IN (
      SELECT gm.garden_id FROM public.garden_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "annual_tree_rituals_insert_garden_member"
  ON public.annual_tree_rituals FOR INSERT
  WITH CHECK (
    garden_id IN (
      SELECT gm.garden_id FROM public.garden_members gm
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "annual_tree_rituals_update_garden_member"
  ON public.annual_tree_rituals FOR UPDATE
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

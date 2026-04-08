-- Libro Vivo - Progression tree visual semantics
-- Adds canonical visual fields for milestone trees.

alter table public.progression_tree_nodes
  add column if not exists rank text not null default 'bronze'
    check (rank in ('bronze','silver','gold','diamond','mythic','celestial','eternal'));

alter table public.progression_tree_nodes
  add column if not exists rarity text not null default 'common'
    check (rarity in ('common','uncommon','rare','epic','legendary','mythic'));

alter table public.progression_tree_nodes
  add column if not exists leaf_variant smallint not null default 0
    check (leaf_variant >= 0 and leaf_variant <= 99);

update public.progression_tree_nodes
set
  rank = case
    when coalesce(rank, '') = '' and coalesce(accent_color, '') ilike '%f4d5%' then 'gold'
    when coalesce(rank, '') = '' and coalesce(accent_color, '') ilike '%d6da%' then 'diamond'
    when coalesce(rank, '') = '' then 'bronze'
    else rank
  end,
  rarity = case
    when coalesce(rarity, '') = '' then 'common'
    else rarity
  end,
  leaf_variant = case
    when leaf_variant is null then abs(mod(('x' || substr(md5(code), 1, 8))::bit(32)::int, 100))
    else leaf_variant
  end;

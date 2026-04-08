# SQL Runtime Linkage

Fecha: 2026-04-08

Cruce entre SQL candidato y entidades realmente usadas por el runtime.

## Resumen

- Candidatos analizados: 76
- Con enlace runtime: 66
- Sin enlace runtime: 10

## Detalle

- `LINKED` [supabase/sql/2026-03-05_canvas_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_canvas_config.sql)
  Tablas SQL: canvas_templates, sticker_pack_items, sticker_packs, sticker_unlock_rules, stickers, template_objects
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: canvas_templates, sticker_pack_items, sticker_packs, sticker_unlock_rules, stickers, template_objects
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_care_catalog_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_care_catalog_config.sql)
  Tablas SQL: catalog_items, catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_config_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_config_foundation.sql)
  Tablas SQL: catalog_items, catalogs, ui_module_items, ui_modules, ui_strings
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_forest_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_forest_config.sql)
  Tablas SQL: forest_assets, forest_narrative_templates, forest_theme
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: forest_assets, forest_narrative_templates, forest_theme
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_mood_thresholds_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_mood_thresholds_config.sql)
  Tablas SQL: catalog_items, catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_pages_care_fields.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_pages_care_fields.sql)
  Tablas SQL: pages
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_pdf_theme_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_pdf_theme_config.sql)
  Tablas SQL: pdf_layout_presets, pdf_text_templates, pdf_theme_assets, pdf_themes
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: pdf_layout_presets, pdf_text_templates, pdf_theme_assets, pdf_themes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_seed_calendar_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_seed_calendar_config.sql)
  Tablas SQL: calendar_rules, seed_defaults, seed_status_flow
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: calendar_rules, seed_defaults, seed_status_flow
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-05_timeline_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_timeline_config.sql)
  Tablas SQL: timeline_milestone_rules, timeline_view_config
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: timeline_milestone_rules, timeline_view_config
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_achievements_profiles_rls_hardening.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_achievements_profiles_rls_hardening.sql)
  Tablas SQL: achievement_rules, achievements_unlocked, profiles, rewards
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: profiles
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_core_tables_rls_hardening.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_core_tables_rls_hardening.sql)
  Tablas SQL: pages, season_notes, seeds, year_notes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages, season_notes, seeds, year_notes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_home_art_packs.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_home_art_packs.sql)
  Tablas SQL: catalog_items, catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_home_scene_theme_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_home_scene_theme_config.sql)
  Tablas SQL: catalog_items, catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_home_visual_species_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_home_visual_species_config.sql)
  Tablas SQL: catalog_items, catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_page_audio_support.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_page_audio_support.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: page-audio
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: page-audio
- `LINKED` [supabase/sql/2026-03-06_page_video_support.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_page_video_support.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: page-videos
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: page-videos
- `LINKED` [supabase/sql/2026-03-06_pages_location_fields.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_pages_location_fields.sql)
  Tablas SQL: pages
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-06_storage_page_assets_hardening.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_storage_page_assets_hardening.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: page-photos, page-thumbs
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: page-photos, page-thumbs
- `LINKED` [supabase/sql/2026-03-10_profiles_superadmin_management.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-10_profiles_superadmin_management.sql)
  Tablas SQL: profiles
  Funciones SQL: is_superadmin_auth
  Buckets SQL: -
  Runtime tables: profiles
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_core_garden_rls_lockdown.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_rls_lockdown.sql)
  Tablas SQL: achievements_unlocked, pages, season_notes, seeds, year_notes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages, season_notes, seeds, year_notes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_core_garden_rls_transition.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_rls_transition.sql)
  Tablas SQL: achievements_unlocked, pages, season_notes, seeds, year_notes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages, season_notes, seeds, year_notes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_notes_per_garden_uniqueness.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_notes_per_garden_uniqueness.sql)
  Tablas SQL: season_notes, year_notes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: season_notes, year_notes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_private_bond_invitation_functions_hotfix_ambiguous_refs.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_bond_invitation_functions_hotfix_ambiguous_refs.sql)
  Tablas SQL: bond_members, bonds, garden_invitations, garden_members, gardens, profiles
  Funciones SQL: accept_private_garden_invitation, create_private_personal_garden
  Buckets SQL: -
  Runtime tables: bond_members, bonds, garden_invitations, garden_members, gardens, profiles
  Runtime RPC: accept_private_garden_invitation, create_private_personal_garden
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql)
  Tablas SQL: garden_invitations
  Funciones SQL: create_private_garden_invitation
  Buckets SQL: -
  Runtime tables: garden_invitations
  Runtime RPC: create_private_garden_invitation
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_private_bond_invitation_functions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_bond_invitation_functions.sql)
  Tablas SQL: bond_members, bonds, garden_invitations, garden_members, gardens, profiles
  Funciones SQL: accept_private_garden_invitation, create_private_garden_invitation, create_private_personal_garden, find_profile_by_invite_code, generate_profile_invite_code
  Buckets SQL: -
  Runtime tables: bond_members, bonds, garden_invitations, garden_members, gardens, profiles
  Runtime RPC: accept_private_garden_invitation, create_private_garden_invitation, create_private_personal_garden, find_profile_by_invite_code
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-11_private_multigarden_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_multigarden_foundation.sql)
  Tablas SQL: achievements_unlocked, bond_members, bonds, garden_invitations, garden_members, gardens, memory_reflections, pages, profiles, season_notes, seeds, year_notes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: bond_members, bonds, garden_invitations, garden_members, gardens, memory_reflections, pages, profiles, season_notes, seeds, year_notes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-12_ui_theme_tokens_catalog.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-12_ui_theme_tokens_catalog.sql)
  Tablas SQL: catalog_items, catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-15_map_domain_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-15_map_domain_foundation.sql)
  Tablas SQL: map_places, map_routes, map_zones
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: map_places, map_routes, map_zones
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-16_garden_plan_types.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_garden_plan_types.sql)
  Tablas SQL: garden_plan_types, seeds
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: garden_plan_types, seeds
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-16_map_place_kind_refine.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_map_place_kind_refine.sql)
  Tablas SQL: map_places
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: map_places
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-16_page_plan_summary.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_page_plan_summary.sql)
  Tablas SQL: pages
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-16_page_plan_type_link.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_page_plan_type_link.sql)
  Tablas SQL: pages
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: pages
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-16_seed_map_links.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_seed_map_links.sql)
  Tablas SQL: seeds
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: seeds
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-19_garden_plan_type_flower_family.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-19_garden_plan_type_flower_family.sql)
  Tablas SQL: garden_plan_types
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: garden_plan_types
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-19_seed_joint_watering.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-19_seed_joint_watering.sql)
  Tablas SQL: seed_watering_confirmations
  Funciones SQL: get_active_garden_member_count, seed_watering_confirmations_sync_garden_id
  Buckets SQL: -
  Runtime tables: seed_watering_confirmations
  Runtime RPC: get_active_garden_member_count
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-20_map_semantic_catalogs.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-20_map_semantic_catalogs.sql)
  Tablas SQL: catalog_items, catalogs, map_places
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, catalogs, map_places
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-20_year_notes_highlight_page_ids.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-20_year_notes_highlight_page_ids.sql)
  Tablas SQL: year_notes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: year_notes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-22_progression_graph_state.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-22_progression_graph_state.sql)
  Tablas SQL: progression_graph_state
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: progression_graph_state
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-23_garden_plan_types_flower_builder_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_garden_plan_types_flower_builder_config.sql)
  Tablas SQL: garden_plan_types
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: garden_plan_types
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-23_garden_plan_types_visual_builder_templates.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_garden_plan_types_visual_builder_templates.sql)
  Tablas SQL: garden_plan_types
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: garden_plan_types
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-23_plan_type_flower_assets_catalog.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_plan_type_flower_assets_catalog.sql)
  Tablas SQL: catalogs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalogs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-23_progression_domain_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_progression_domain_foundation.sql)
  Tablas SQL: progression_conditions, progression_rewards, progression_tree_nodes
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: progression_conditions, progression_rewards, progression_tree_nodes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-23_progression_tree_visual_semantics.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_progression_tree_visual_semantics.sql)
  Tablas SQL: progression_tree_nodes
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: progression_tree_nodes
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-23_progression_unlocks_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_progression_unlocks_foundation.sql)
  Tablas SQL: progression_condition_unlocks, progression_reward_unlocks, progression_tree_unlocks
  Funciones SQL: touch_updated_at
  Buckets SQL: -
  Runtime tables: progression_condition_unlocks, progression_reward_unlocks, progression_tree_unlocks
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-24_annual_tree_rituals.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-24_annual_tree_rituals.sql)
  Tablas SQL: annual_tree_rituals
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: annual_tree_rituals
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-24_time_capsules.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-24_time_capsules.sql)
  Tablas SQL: time_capsules
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: time_capsules
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_annual_tree_check_ins.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_annual_tree_check_ins.sql)
  Tablas SQL: annual_tree_check_ins
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: annual_tree_check_ins
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_flower_birth_ritual_ratings.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_flower_birth_ritual_ratings.sql)
  Tablas SQL: flower_birth_ritual_ratings
  Funciones SQL: flower_birth_ritual_ratings_sync_garden_id
  Buckets SQL: -
  Runtime tables: flower_birth_ritual_ratings
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_flower_birth_rituals.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_flower_birth_rituals.sql)
  Tablas SQL: flower_birth_rituals
  Funciones SQL: flower_birth_rituals_sync_garden_id
  Buckets SQL: -
  Runtime tables: flower_birth_rituals
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_flower_page_revisions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_flower_page_revisions.sql)
  Tablas SQL: flower_page_revisions
  Funciones SQL: flower_page_revisions_sync_garden_id
  Buckets SQL: -
  Runtime tables: flower_page_revisions
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_page_delete_member_rpc.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_page_delete_member_rpc.sql)
  Tablas SQL: pages, seeds
  Funciones SQL: delete_garden_page
  Buckets SQL: -
  Runtime tables: pages, seeds
  Runtime RPC: delete_garden_page
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_time_capsule_draft_revisions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_time_capsule_draft_revisions.sql)
  Tablas SQL: time_capsule_draft_revisions
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: time_capsule_draft_revisions
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_time_capsule_drafts.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_time_capsule_drafts.sql)
  Tablas SQL: time_capsule_drafts
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: time_capsule_drafts
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-25_year_cycle_states.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_year_cycle_states.sql)
  Tablas SQL: year_cycle_states
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: year_cycle_states
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-26_garden_chat_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_garden_chat_foundation.sql)
  Tablas SQL: garden_audio_session_participants, garden_audio_sessions, garden_chat_message_attachments, garden_chat_messages, garden_chat_read_states, garden_chat_rooms
  Funciones SQL: garden_audio_session_participants_sync_garden_id, garden_audio_sessions_sync_garden_id, garden_chat_attachments_sync_garden_id, garden_chat_messages_sync_garden_id, garden_chat_read_states_sync_garden_id, seed_main_chat_room_for_garden
  Buckets SQL: -
  Runtime tables: garden_chat_message_attachments, garden_chat_messages, garden_chat_read_states, garden_chat_rooms
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-26_garden_chat_reactions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_garden_chat_reactions.sql)
  Tablas SQL: garden_chat_message_reactions
  Funciones SQL: garden_chat_reactions_sync_room_garden
  Buckets SQL: -
  Runtime tables: garden_chat_message_reactions
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-26_seed_preparation_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_seed_preparation_foundation.sql)
  Tablas SQL: catalog_items, seed_preparation_checklist_items, seed_preparation_itinerary_items, seed_preparation_place_links, seed_preparation_profiles, seed_preparation_reservations, seed_preparation_stays, seed_preparation_transport_legs, seed_status_flow
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: catalog_items, seed_preparation_checklist_items, seed_preparation_itinerary_items, seed_preparation_place_links, seed_preparation_profiles, seed_preparation_reservations, seed_preparation_stays, seed_preparation_transport_legs, seed_status_flow
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-27_seed_event_reminder_deliveries.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_event_reminder_deliveries.sql)
  Tablas SQL: seed_event_reminder_deliveries
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: seed_event_reminder_deliveries
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-27_seed_planning_draft_status_check.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_planning_draft_status_check.sql)
  Tablas SQL: seeds
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: seeds
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-27_seed_preparation_collaboration_mode.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_preparation_collaboration_mode.sql)
  Tablas SQL: seed_preparation_profiles
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: seed_preparation_profiles
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-03-27_seed_preparation_trip_sections.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_preparation_trip_sections.sql)
  Tablas SQL: seed_preparation_attachments, seed_preparation_itinerary_items, seed_preparation_place_links, seed_preparation_profiles, seed_preparation_reservations, seed_preparation_stays, seed_preparation_stops, seed_preparation_transport_legs
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: seed_preparation_attachments, seed_preparation_itinerary_items, seed_preparation_place_links, seed_preparation_profiles, seed_preparation_reservations, seed_preparation_stays, seed_preparation_stops, seed_preparation_transport_legs
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-04-07_user_notices.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-07_user_notices.sql)
  Tablas SQL: user_notices
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: user_notices
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-04-08_garden_year_tree_states.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_garden_year_tree_states.sql)
  Tablas SQL: garden_year_tree_states
  Funciones SQL: annual_tree_phase_from_stage, rebuild_all_garden_year_tree_states, recompute_garden_year_tree_state, tg_recompute_garden_year_tree_state_from_pages, tg_recompute_garden_year_tree_state_from_unlocks
  Buckets SQL: -
  Runtime tables: garden_year_tree_states
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-04-08_page_plan_type_canonical_sync.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_page_plan_type_canonical_sync.sql)
  Tablas SQL: pages
  Funciones SQL: pages_fill_plan_type_from_linked_seed, sync_bloomed_page_plan_type_from_seed
  Buckets SQL: -
  Runtime tables: pages
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-04-08_page_visual_states.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_page_visual_states.sql)
  Tablas SQL: page_visual_states
  Funciones SQL: rebuild_all_page_visual_states, recompute_page_visual_state, recompute_page_visual_states_for_plan_type, tg_recompute_page_visual_state_from_pages, tg_recompute_page_visual_state_from_plan_types
  Buckets SQL: -
  Runtime tables: page_visual_states
  Runtime RPC: -
  Runtime buckets: -
- `LINKED` [supabase/sql/2026-04-08_settings_garden_name.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_settings_garden_name.sql)
  Tablas SQL: settings
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: settings
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-05_storage_stickers_assets.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_storage_stickers_assets.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: stickers-assets
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-07_annual_tree_engine_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-07_annual_tree_engine_foundation.sql)
  Tablas SQL: annual_tree_growth_profiles, annual_tree_snapshots
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-11_core_garden_not_null_enforcement.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_not_null_enforcement.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-23_storage_plan_type_assets.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_storage_plan_type_assets.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: plan-type-assets
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-24_custom_flower_families.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-24_custom_flower_families.sql)
  Tablas SQL: catalog_config
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-26_profiles_identity_fields.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_profiles_identity_fields.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-26_storage_garden_chat_media.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_storage_garden_chat_media.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: garden-chat-media
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-03-26_year_cycle_states_realtime.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_year_cycle_states_realtime.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-04-06_garden_invitations_garden_title.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-06_garden_invitations_garden_title.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -
- `UNLINKED` [supabase/sql/2026-04-07_core_garden_delete_fk_alignment.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-07_core_garden_delete_fk_alignment.sql)
  Tablas SQL: -
  Funciones SQL: -
  Buckets SQL: -
  Runtime tables: -
  Runtime RPC: -
  Runtime buckets: -

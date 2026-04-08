# Production SQL Allowlist

Fecha: 2026-04-08

Allowlist provisional para reconstruir el schema productivo de `libro-vivo-prod`.

## Resumen

- SQL totales inventariados: 177
- INCLUDE: 75
- EXCLUDE: 102

## Criterios

- Se incluye por defecto todo `KEEP_CANDIDATE` enlazado al runtime.
- Se incluyen manualmente buckets, paridad de schema y hotfixes vivos.
- Se excluyen `DROP`, `META` y el SQL documental/no-op.

## INCLUDE

- `linked_runtime` [supabase/sql/2026-03-05_canvas_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_canvas_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_care_catalog_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_care_catalog_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_config_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_config_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_forest_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_forest_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_mood_thresholds_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_mood_thresholds_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_pages_care_fields.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_pages_care_fields.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_pdf_theme_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_pdf_theme_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-05_seed_calendar_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_seed_calendar_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `support_bucket` [supabase/sql/2026-03-05_storage_stickers_assets.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_storage_stickers_assets.sql)
  Motivo: bucket de stickers usado por admin/uploadStickerAsset; existe en el proyecto actual aunque el parser de runtime no lo detecte por usar constante
- `linked_runtime` [supabase/sql/2026-03-05_timeline_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-05_timeline_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_achievements_profiles_rls_hardening.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_achievements_profiles_rls_hardening.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_core_tables_rls_hardening.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_core_tables_rls_hardening.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_home_art_packs.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_home_art_packs.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_home_scene_theme_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_home_scene_theme_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_home_visual_species_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_home_visual_species_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_page_audio_support.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_page_audio_support.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_page_video_support.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_page_video_support.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_pages_location_fields.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_pages_location_fields.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-06_storage_page_assets_hardening.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_storage_page_assets_hardening.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `schema_parity` [supabase/sql/2026-03-07_annual_tree_engine_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-07_annual_tree_engine_foundation.sql)
  Motivo: crea tablas que siguen existiendo en el proyecto actual (annual_tree_growth_profiles, annual_tree_snapshots); mantener paridad aunque la ruta viva principal hoy sea garden_year_tree_states
- `linked_runtime` [supabase/sql/2026-03-10_profiles_superadmin_management.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-10_profiles_superadmin_management.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `structural` [supabase/sql/2026-03-11_core_garden_not_null_enforcement.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_not_null_enforcement.sql)
  Motivo: cierra la compatibilidad y fija garden_id NOT NULL en contenido core; requisito de integridad del modelo multi-jardin
- `linked_runtime` [supabase/sql/2026-03-11_core_garden_rls_lockdown.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_rls_lockdown.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-11_core_garden_rls_transition.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_rls_transition.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-11_notes_per_garden_uniqueness.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_notes_per_garden_uniqueness.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `patch` [supabase/sql/2026-03-11_private_bond_invitation_functions_hotfix_ambiguous_refs.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_bond_invitation_functions_hotfix_ambiguous_refs.sql)
  Motivo: hotfix vivo para RPCs accept_private_garden_invitation y create_private_personal_garden que el runtime usa hoy
- `patch` [supabase/sql/2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_bond_invitation_functions_hotfix_pgcrypto_search_path.sql)
  Motivo: hotfix vivo para create_private_garden_invitation, RPC usada por runtime y e2e
- `linked_runtime` [supabase/sql/2026-03-11_private_bond_invitation_functions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_bond_invitation_functions.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-11_private_multigarden_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_private_multigarden_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-12_ui_theme_tokens_catalog.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-12_ui_theme_tokens_catalog.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-15_map_domain_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-15_map_domain_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-16_garden_plan_types.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_garden_plan_types.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-16_map_place_kind_refine.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_map_place_kind_refine.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-16_page_plan_summary.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_page_plan_summary.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-16_page_plan_type_link.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_page_plan_type_link.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-16_seed_map_links.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-16_seed_map_links.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-19_garden_plan_type_flower_family.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-19_garden_plan_type_flower_family.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-19_seed_joint_watering.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-19_seed_joint_watering.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-20_map_semantic_catalogs.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-20_map_semantic_catalogs.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-20_year_notes_highlight_page_ids.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-20_year_notes_highlight_page_ids.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-22_progression_graph_state.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-22_progression_graph_state.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-23_garden_plan_types_flower_builder_config.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_garden_plan_types_flower_builder_config.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-23_garden_plan_types_visual_builder_templates.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_garden_plan_types_visual_builder_templates.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-23_plan_type_flower_assets_catalog.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_plan_type_flower_assets_catalog.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-23_progression_domain_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_progression_domain_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-23_progression_tree_visual_semantics.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_progression_tree_visual_semantics.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-23_progression_unlocks_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_progression_unlocks_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `support_bucket` [supabase/sql/2026-03-23_storage_plan_type_assets.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-23_storage_plan_type_assets.sql)
  Motivo: bucket de assets de plan types usado por admin/uploadPlanTypeAsset; existe en el proyecto actual
- `linked_runtime` [supabase/sql/2026-03-24_annual_tree_rituals.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-24_annual_tree_rituals.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-24_time_capsules.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-24_time_capsules.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_annual_tree_check_ins.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_annual_tree_check_ins.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_flower_birth_ritual_ratings.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_flower_birth_ritual_ratings.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_flower_birth_rituals.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_flower_birth_rituals.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_flower_page_revisions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_flower_page_revisions.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_page_delete_member_rpc.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_page_delete_member_rpc.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_time_capsule_draft_revisions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_time_capsule_draft_revisions.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_time_capsule_drafts.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_time_capsule_drafts.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-25_year_cycle_states.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-25_year_cycle_states.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-26_garden_chat_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_garden_chat_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-26_garden_chat_reactions.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_garden_chat_reactions.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `structural` [supabase/sql/2026-03-26_profiles_identity_fields.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_profiles_identity_fields.sql)
  Motivo: last_name y pronoun se usan hoy en home/chat/profileBootstrap; columna necesaria aunque no salga como tabla nueva
- `linked_runtime` [supabase/sql/2026-03-26_seed_preparation_foundation.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_seed_preparation_foundation.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `support_bucket` [supabase/sql/2026-03-26_storage_garden_chat_media.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_storage_garden_chat_media.sql)
  Motivo: bucket privado de chat media usado por upload de adjuntos/voz; existe en el proyecto actual
- `realtime_support` [supabase/sql/2026-03-26_year_cycle_states_realtime.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-26_year_cycle_states_realtime.sql)
  Motivo: publica year_cycle_states en supabase_realtime; soporte necesario para suscripciones en la vista anual
- `linked_runtime` [supabase/sql/2026-03-27_seed_event_reminder_deliveries.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_event_reminder_deliveries.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-27_seed_planning_draft_status_check.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_planning_draft_status_check.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-27_seed_preparation_collaboration_mode.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_preparation_collaboration_mode.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-03-27_seed_preparation_trip_sections.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-27_seed_preparation_trip_sections.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `structural` [supabase/sql/2026-04-06_garden_invitations_garden_title.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-06_garden_invitations_garden_title.sql)
  Motivo: garden_title se usa hoy en APIs de invitaciones y creacion de jardin personal
- `structural` [supabase/sql/2026-04-07_core_garden_delete_fk_alignment.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-07_core_garden_delete_fk_alignment.sql)
  Motivo: alinea FKs a on delete cascade con garden_id NOT NULL; evita inconsistencias al borrar jardines
- `linked_runtime` [supabase/sql/2026-04-07_user_notices.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-07_user_notices.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-04-08_garden_year_tree_states.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_garden_year_tree_states.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-04-08_page_plan_type_canonical_sync.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_page_plan_type_canonical_sync.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-04-08_page_visual_states.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_page_visual_states.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual
- `linked_runtime` [supabase/sql/2026-04-08_settings_garden_name.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-08_settings_garden_name.sql)
  Motivo: enlaza con tablas/RPC/buckets usados por el runtime actual

## EXCLUDE

- `non_candidate` [supabase/sql/2026-03-06_core_rls_audit.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-06_core_rls_audit.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/2026-03-11_core_garden_release_gate.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_release_gate.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/2026-03-11_core_garden_rls_audit.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-11_core_garden_rls_audit.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/2026-03-12_core_security_release_gate_extended.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-12_core_security_release_gate_extended.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/2026-03-12_core_security_rls_audit_extended.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-12_core_security_rls_audit_extended.sql)
  Motivo: fuera de candidatos productivos
- `noop_doc` [supabase/sql/2026-03-24_custom_flower_families.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-03-24_custom_flower_families.sql)
  Motivo: archivo documental/no-op; no crea ni modifica schema y solo deja comentarios sobre un catalogo ya soportado por catalog_items
- `non_candidate` [supabase/sql/2026-04-07_progression_test_seed_100.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\2026-04-07_progression_test_seed_100.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_clamp_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_clamp_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_clamp_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_clamp_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_click_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_click_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_click_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_click_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_crown_balance_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_crown_balance_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_crown_balance_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_crown_balance_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_fine_tune_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_fine_tune_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_fine_tune_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_fine_tune_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_labels_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_labels_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_labels_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_labels_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_layout_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_layout_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_layout_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_layout_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_long_trunk_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_long_trunk_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_long_trunk_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_long_trunk_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_navigation_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_navigation_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_navigation_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_navigation_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_overlap_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_overlap_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_overlap_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_overlap_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_phase_progression_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_phase_progression_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_phase_progression_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_phase_progression_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_polish_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_polish_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_polish_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_polish_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_trunk_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_trunk_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_trunk_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_trunk_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_ux_polish_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_ux_polish_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_ux_polish_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_ux_polish_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_visual_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_visual_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-07_forest_visual_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-07_forest_visual_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_forest_focus_mode_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_forest_focus_mode_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_forest_focus_mode_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_forest_focus_mode_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_forest_header_filters_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_forest_header_filters_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_forest_header_filters_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_forest_header_filters_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_forest_secondary_panels_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_forest_secondary_panels_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_forest_secondary_panels_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_forest_secondary_panels_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_bloom_system_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_bloom_system_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_bloom_system_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_bloom_system_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_daily_points_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_daily_points_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_daily_points_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_daily_points_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_inline_icons_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_inline_icons_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_inline_icons_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_inline_icons_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_more_turns_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_more_turns_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_more_turns_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_more_turns_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_overlap_fix_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_overlap_fix_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_overlap_fix_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_overlap_fix_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_polish_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_polish_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_polish_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_polish_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_trail_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_trail_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_trail_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_trail_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_visual_polish_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_visual_polish_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_hill_visual_polish_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_hill_visual_polish_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_trail_semantics_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_trail_semantics_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_trail_semantics_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_trail_semantics_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_trail_visual_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_trail_visual_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_home_trail_visual_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_home_trail_visual_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_chapters_polish_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_chapters_polish_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_chapters_polish_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_chapters_polish_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_chapters_simplify_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_chapters_simplify_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_chapters_simplify_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_chapters_simplify_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_page_visual_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_page_visual_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_page_visual_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_page_visual_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_tree_alignment_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_tree_alignment_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-08_year_tree_alignment_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-08_year_tree_alignment_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_depth_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_depth_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_depth_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_depth_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_design_reset_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_design_reset_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_design_reset_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_design_reset_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_in_canvas_card_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_in_canvas_card_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_in_canvas_card_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_in_canvas_card_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_mountain_perspective_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_mountain_perspective_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_mountain_perspective_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_mountain_perspective_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_path_rework_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_path_rework_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_path_rework_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_path_rework_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_scene_rebase_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_scene_rebase_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_scene_rebase_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_scene_rebase_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step1_card_avatar_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step1_card_avatar_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step1_card_avatar_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step1_card_avatar_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step10_less_turns_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step10_less_turns_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step10_less_turns_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step10_less_turns_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step2_hill_path_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step2_hill_path_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step2_hill_path_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step2_hill_path_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step3_curve_alignment_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step3_curve_alignment_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step3_curve_alignment_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step3_curve_alignment_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step4_hill_perspective_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step4_hill_perspective_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step4_hill_perspective_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step4_hill_perspective_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step5_wide_hill_long_path_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step5_wide_hill_long_path_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step5_wide_hill_long_path_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step5_wide_hill_long_path_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step6_wider_hill_longer_path_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step6_wider_hill_longer_path_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step6_wider_hill_longer_path_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step6_wider_hill_longer_path_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step7_natural_switchbacks_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step7_natural_switchbacks_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step7_natural_switchbacks_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step7_natural_switchbacks_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step8_computed_switchbacks_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step8_computed_switchbacks_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step8_computed_switchbacks_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step8_computed_switchbacks_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step9_geometry_engine_cleanup.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step9_geometry_engine_cleanup.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/archive/dev/2026-03-09_home_hill_step9_geometry_engine_fixture.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\archive\dev\2026-03-09_home_hill_step9_geometry_engine_fixture.sql)
  Motivo: fuera de candidatos productivos
- `non_candidate` [supabase/sql/WIPE_PUBLIC_PROJECT_DATA_2026_03_17.sql](C:\Users\santequera\Documents\Proyecto\libro-vivo\supabase\sql\WIPE_PUBLIC_PROJECT_DATA_2026_03_17.sql)
  Motivo: fuera de candidatos productivos

## Siguiente paso

- Aplicar esta allowlist en el Supabase nuevo.
- Correr gates de seguridad al final.
- Si algo falla, revisar primero los excluidos de tipo `noop_doc` o `META` antes de tocar candidatos incluidos.

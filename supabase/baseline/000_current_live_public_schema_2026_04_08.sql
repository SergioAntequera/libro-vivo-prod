-- Libro Vivo - baseline vivo del schema public
-- Fuente: proyecto Supabase actual en funcionamiento
-- Generado automaticamente el 2026-04-08

begin;

-- Required extensions
-- -------------------
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- Tables
-- ------
create table if not exists "public"."achievement_rules" (
  "id" uuid not null,
  "kind" text not null,
  "threshold" integer not null,
  "tier" text not null,
  "title" text not null,
  "description" text,
  "created_at" timestamp with time zone,
  "default_reward_id" uuid
);

create table if not exists "public"."achievements_unlocked" (
  "id" uuid not null,
  "rule_id" uuid not null,
  "unlocked_at" timestamp with time zone not null,
  "claimed_at" timestamp with time zone,
  "claimed_by" uuid,
  "reward_id" uuid,
  "garden_id" uuid not null
);

create table if not exists "public"."annual_tree_check_ins" (
  "id" uuid not null,
  "ritual_id" uuid not null,
  "garden_id" uuid not null,
  "milestone_year" integer not null,
  "observed_at" timestamp with time zone not null,
  "status" text not null,
  "location_lat" double precision,
  "location_lng" double precision,
  "location_label" text,
  "notes" text,
  "photo_url" text,
  "created_by" uuid,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."annual_tree_growth_profiles" (
  "key" text not null,
  "label" text not null,
  "is_active" boolean not null,
  "targets" jsonb not null,
  "weights" jsonb not null,
  "visual" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."annual_tree_rituals" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "year" integer not null,
  "status" text not null,
  "planted_at" timestamp with time zone,
  "planted_by" uuid,
  "location_lat" double precision,
  "location_lng" double precision,
  "location_label" text,
  "map_place_id" uuid,
  "notes" text,
  "photo_url" text,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."annual_tree_snapshots" (
  "year" integer not null,
  "profile_key" text not null,
  "stage" integer not null,
  "growth_score" numeric(6,3) not null,
  "phase" text not null,
  "metrics" jsonb not null,
  "frame" jsonb not null,
  "source_hash" text,
  "generated_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."bond_members" (
  "id" uuid not null,
  "bond_id" uuid not null,
  "user_id" uuid not null,
  "member_role" text not null,
  "joined_at" timestamp with time zone not null,
  "left_at" timestamp with time zone
);

create table if not exists "public"."bonds" (
  "id" uuid not null,
  "type" text not null,
  "status" text not null,
  "title" text,
  "created_by_user_id" uuid not null,
  "system_key" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."calendar_rules" (
  "key" text not null,
  "allow_past_schedule" boolean not null,
  "max_seeds_per_day" integer not null,
  "bloom_only_scheduled" boolean not null,
  "show_unscheduled_in_calendar" boolean not null,
  "days_ahead_limit" integer not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."canvas_templates" (
  "id" uuid not null,
  "key" text not null,
  "label" text not null,
  "description" text,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."catalog_items" (
  "id" uuid not null,
  "catalog_key" text not null,
  "code" text not null,
  "label" text not null,
  "sort_order" integer not null,
  "enabled" boolean not null,
  "color" text,
  "icon" text,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."catalogs" (
  "key" text not null,
  "label" text not null,
  "description" text,
  "is_active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."flower_birth_ritual_ratings" (
  "page_id" uuid not null,
  "garden_id" uuid not null,
  "user_id" uuid not null,
  "rating" integer not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."flower_birth_rituals" (
  "page_id" uuid not null,
  "garden_id" uuid not null,
  "seed_id" uuid,
  "activated_at" timestamp with time zone not null,
  "completed_at" timestamp with time zone,
  "completed_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."flower_page_revisions" (
  "id" uuid not null,
  "page_id" uuid not null,
  "garden_id" uuid not null,
  "snapshot" jsonb not null,
  "summary" jsonb not null,
  "actor_user_id" uuid,
  "actor_name" text,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."forest_assets" (
  "id" uuid not null,
  "theme_key" text not null,
  "asset_key" text not null,
  "asset_type" text not null,
  "value" text not null,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."forest_narrative_templates" (
  "id" uuid not null,
  "theme_key" text not null,
  "template_key" text not null,
  "body" text not null,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."forest_theme" (
  "key" text not null,
  "label" text not null,
  "description" text,
  "is_active" boolean not null,
  "priority" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."garden_audio_session_participants" (
  "session_id" uuid not null,
  "garden_id" uuid not null,
  "user_id" uuid not null,
  "role" text not null,
  "invited_at" timestamp with time zone,
  "joined_at" timestamp with time zone,
  "left_at" timestamp with time zone,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."garden_audio_sessions" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "room_id" uuid,
  "started_by_user_id" uuid not null,
  "provider" text not null,
  "provider_room_name" text not null,
  "status" text not null,
  "started_at" timestamp with time zone not null,
  "joined_at" timestamp with time zone,
  "ended_at" timestamp with time zone,
  "ended_reason" text,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."garden_chat_message_attachments" (
  "id" uuid not null,
  "message_id" uuid not null,
  "garden_id" uuid not null,
  "uploaded_by_user_id" uuid,
  "storage_bucket" text not null,
  "storage_path" text not null,
  "attachment_kind" text not null,
  "mime_type" text not null,
  "size_bytes" bigint not null,
  "duration_ms" integer,
  "waveform_json" jsonb,
  "preview_text" text,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."garden_chat_message_reactions" (
  "message_id" uuid not null,
  "room_id" uuid not null,
  "garden_id" uuid not null,
  "user_id" uuid not null,
  "emoji" text not null,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."garden_chat_messages" (
  "id" uuid not null,
  "room_id" uuid not null,
  "garden_id" uuid not null,
  "author_user_id" uuid not null,
  "client_message_id" text not null,
  "kind" text not null,
  "body_text" text,
  "reply_to_message_id" uuid,
  "metadata" jsonb not null,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."garden_chat_read_states" (
  "room_id" uuid not null,
  "garden_id" uuid not null,
  "user_id" uuid not null,
  "last_read_message_id" uuid,
  "last_read_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."garden_chat_rooms" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "slug" text not null,
  "title" text not null,
  "room_kind" text not null,
  "sort_order" integer not null,
  "archived_at" timestamp with time zone,
  "created_by" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."garden_invitations" (
  "id" uuid not null,
  "bond_type" text not null,
  "invited_email" text,
  "invited_user_id" uuid,
  "invited_by_user_id" uuid not null,
  "token_hash" text not null,
  "status" text not null,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone not null,
  "accepted_at" timestamp with time zone,
  "garden_title" text
);

create table if not exists "public"."garden_members" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "user_id" uuid not null,
  "member_role" text not null,
  "joined_at" timestamp with time zone not null,
  "left_at" timestamp with time zone
);

create table if not exists "public"."garden_plan_types" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "code" text not null,
  "label" text not null,
  "category" text not null,
  "description" text,
  "suggested_element" text not null,
  "icon_emoji" text,
  "flower_asset_path" text,
  "seed_asset_path" text,
  "is_custom" boolean not null,
  "sort_order" integer not null,
  "created_by_user_id" uuid not null,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "archived_at" timestamp with time zone,
  "flower_family" text not null,
  "flower_builder_config" jsonb not null
);

create table if not exists "public"."garden_year_tree_states" (
  "garden_id" uuid not null,
  "year" integer not null,
  "total_events" integer not null,
  "active_days" integer not null,
  "bloomed_events" integer not null,
  "shiny_events" integer not null,
  "favorite_events" integer not null,
  "avg_rating" numeric(6,3) not null,
  "milestones_unlocked" integer not null,
  "growth_score" numeric(8,3) not null,
  "stage" integer not null,
  "phase" text not null,
  "generated_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."gardens" (
  "id" uuid not null,
  "bond_id" uuid not null,
  "title" text not null,
  "theme" text,
  "status" text not null,
  "is_private" boolean not null,
  "created_by_user_id" uuid not null,
  "system_key" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."map_places" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "kind" text not null,
  "state" text not null,
  "title" text not null,
  "subtitle" text,
  "notes" text,
  "address_label" text,
  "lat" double precision not null,
  "lng" double precision not null,
  "rating" numeric(3,1),
  "icon_code" text,
  "color_token" text,
  "tags" text[] not null,
  "metadata" jsonb not null,
  "source_page_id" uuid,
  "source_seed_id" uuid,
  "created_by_user_id" uuid not null,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "archived_at" timestamp with time zone
);

create table if not exists "public"."map_routes" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "kind" text not null,
  "status" text not null,
  "travel_mode" text not null,
  "title" text not null,
  "subtitle" text,
  "notes" text,
  "origin_label" text,
  "origin_lat" double precision,
  "origin_lng" double precision,
  "destination_label" text,
  "destination_lat" double precision,
  "destination_lng" double precision,
  "waypoints" jsonb not null,
  "geometry" jsonb not null,
  "distance_meters" numeric(12,2),
  "duration_seconds" integer,
  "icon_code" text,
  "color_token" text,
  "tags" text[] not null,
  "metadata" jsonb not null,
  "source_page_id" uuid,
  "source_seed_id" uuid,
  "created_by_user_id" uuid not null,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "archived_at" timestamp with time zone
);

create table if not exists "public"."map_zones" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "kind" text not null,
  "status" text not null,
  "title" text not null,
  "subtitle" text,
  "description" text,
  "geojson" jsonb not null,
  "centroid_lat" double precision,
  "centroid_lng" double precision,
  "icon_code" text,
  "color_token" text,
  "tags" text[] not null,
  "metadata" jsonb not null,
  "source_page_id" uuid,
  "source_seed_id" uuid,
  "created_by_user_id" uuid not null,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "archived_at" timestamp with time zone
);

create table if not exists "public"."memory_reflections" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "page_id" uuid not null,
  "user_id" uuid not null,
  "favorite_part" text,
  "remembered_moment" text,
  "what_i_felt" text,
  "what_it_meant_to_me" text,
  "what_i_discovered_about_you" text,
  "small_promise" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."page_visual_states" (
  "page_id" uuid not null,
  "garden_id" uuid not null,
  "plan_type_id" uuid,
  "plan_type_code" text,
  "plan_type_label" text,
  "plan_category" text,
  "flower_family" text,
  "flower_asset_path" text,
  "flower_builder_config" jsonb not null,
  "suggested_element" text,
  "page_element" text not null,
  "rating" numeric(6,3) not null,
  "cover_photo_url" text,
  "thumbnail_url" text,
  "secondary_photo_url" text,
  "has_secondary_photo" boolean not null,
  "generated_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."pages" (
  "id" uuid not null,
  "date" date not null,
  "title" text,
  "element" text not null,
  "rating" integer,
  "tags" text[],
  "canvas_objects" jsonb,
  "created_by" uuid,
  "created_at" timestamp with time zone,
  "mood_state" text not null,
  "care_log" jsonb,
  "planned_from_seed_id" uuid,
  "thumbnail_url" text,
  "cover_photo_url" text,
  "is_favorite" boolean not null,
  "care_score" integer,
  "care_needs" jsonb,
  "location_lat" double precision,
  "location_lng" double precision,
  "location_label" text,
  "audio_url" text,
  "audio_label" text,
  "garden_id" uuid not null,
  "plan_type_id" uuid,
  "plan_summary" text
);

create table if not exists "public"."pdf_layout_presets" (
  "id" uuid not null,
  "theme_key" text not null,
  "preset_key" text not null,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."pdf_text_templates" (
  "id" uuid not null,
  "theme_key" text not null,
  "template_key" text not null,
  "body" text not null,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."pdf_theme_assets" (
  "id" uuid not null,
  "theme_key" text not null,
  "asset_key" text not null,
  "asset_type" text not null,
  "value" text not null,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."pdf_themes" (
  "key" text not null,
  "label" text not null,
  "description" text,
  "is_active" boolean not null,
  "priority" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."profiles" (
  "id" uuid not null,
  "name" text not null,
  "role" text not null,
  "avatar_url" text,
  "created_at" timestamp with time zone,
  "active_garden_id" uuid,
  "invite_code" text,
  "last_name" text,
  "pronoun" text
);

create table if not exists "public"."progression_condition_unlocks" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "condition_id" uuid not null,
  "unlocked_at" timestamp with time zone not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."progression_conditions" (
  "id" uuid not null,
  "code" text not null,
  "title" text not null,
  "description" text not null,
  "template_id" text,
  "narrative_seed" text,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."progression_graph_state" (
  "key" text not null,
  "positions" jsonb not null,
  "links" jsonb not null,
  "relation_modes" jsonb not null,
  "tree_settings" jsonb not null,
  "condition_settings" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."progression_reward_unlocks" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "reward_id" uuid not null,
  "source_tree_id" uuid,
  "unlocked_at" timestamp with time zone not null,
  "claimed_at" timestamp with time zone,
  "claimed_by" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."progression_rewards" (
  "id" uuid not null,
  "code" text not null,
  "kind" text not null,
  "title" text not null,
  "description" text not null,
  "preset_id" text,
  "reference_key" text,
  "payload" jsonb not null,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."progression_tree_nodes" (
  "id" uuid not null,
  "code" text not null,
  "title" text not null,
  "description" text not null,
  "preset_id" text,
  "asset_key" text,
  "accent_color" text,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "rank" text not null,
  "rarity" text not null,
  "leaf_variant" smallint not null
);

create table if not exists "public"."progression_tree_unlocks" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "tree_id" uuid not null,
  "unlocked_at" timestamp with time zone not null,
  "claimed_at" timestamp with time zone,
  "claimed_by" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."rewards" (
  "id" uuid not null,
  "kind" text not null,
  "title" text not null,
  "payload" jsonb not null,
  "created_at" timestamp with time zone
);

create table if not exists "public"."season_notes" (
  "id" uuid not null,
  "year" integer not null,
  "season" text not null,
  "note" text not null,
  "updated_at" timestamp with time zone not null,
  "garden_id" uuid not null
);

create table if not exists "public"."seed_defaults" (
  "key" text not null,
  "default_seed_status" text not null,
  "scheduled_status" text not null,
  "bloomed_status" text not null,
  "fallback_element" text not null,
  "default_mood_state" text not null,
  "default_canvas_objects" jsonb not null,
  "auto_open_created_page" boolean not null,
  "create_page_on_bloom" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seed_event_reminder_deliveries" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "reminder_kind" text not null,
  "delivery_window_key" text not null,
  "scheduled_for" timestamp with time zone not null,
  "sent_at" timestamp with time zone,
  "status" text not null,
  "provider_message_id" text,
  "recipient_emails" text[] not null,
  "seed_snapshot_hash" text,
  "calendar_uid" text,
  "error_message" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seed_preparation_attachments" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "linked_kind" text not null,
  "linked_record_id" uuid,
  "attachment_kind" text not null,
  "title" text not null,
  "file_name" text,
  "mime_type" text,
  "storage_provider" text,
  "file_url" text not null,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seed_preparation_checklist_items" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "category" text not null,
  "label" text not null,
  "owner" text not null,
  "is_required" boolean not null,
  "completed_at" timestamp with time zone,
  "completed_by_user_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seed_preparation_itinerary_items" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "day_date" date,
  "time_label" text,
  "title" text not null,
  "description" text,
  "map_place_id" uuid,
  "map_route_id" uuid,
  "transport_leg_id" uuid,
  "status" text not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "stop_id" uuid,
  "duration_minutes" integer
);

create table if not exists "public"."seed_preparation_place_links" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "map_place_id" uuid,
  "manual_title" text,
  "priority" text not null,
  "planning_state" text not null,
  "linked_transport_leg_id" uuid,
  "linked_route_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "stop_id" uuid,
  "day_date" date
);

create table if not exists "public"."seed_preparation_profiles" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "planner_mode" text not null,
  "preparation_progress" integer not null,
  "enabled_blocks" text[] not null,
  "summary" text,
  "date_mode" text not null,
  "starts_on" date,
  "ends_on" date,
  "budget_amount" numeric(12,2),
  "budget_currency" text,
  "budget_notes" text,
  "goal_tags" text[] not null,
  "primary_map_place_id" uuid,
  "primary_map_route_id" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "collaboration_mode" text not null,
  "destination_label" text,
  "destination_kind" text,
  "shared_intention" text,
  "why_this_trip" text,
  "climate_context" text
);

create table if not exists "public"."seed_preparation_reservations" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "reservation_kind" text not null,
  "title" text not null,
  "provider_name" text,
  "reservation_url" text,
  "reference_code" text,
  "status" text not null,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "stop_id" uuid,
  "amount" numeric(12,2),
  "currency" text,
  "starts_at" timestamp with time zone,
  "map_place_id" uuid
);

create table if not exists "public"."seed_preparation_stays" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "stay_kind" text not null,
  "name" text not null,
  "provider_name" text,
  "booking_url" text,
  "check_in_date" date,
  "check_out_date" date,
  "address_label" text,
  "map_place_id" uuid,
  "confirmation_code" text,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "stop_id" uuid
);

create table if not exists "public"."seed_preparation_stops" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "title" text not null,
  "base_place_id" uuid,
  "starts_on" date,
  "ends_on" date,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seed_preparation_transport_legs" (
  "id" uuid not null,
  "seed_id" uuid not null,
  "garden_id" uuid not null,
  "order_index" integer not null,
  "title" text,
  "from_label" text,
  "to_label" text,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "transport_kind" text not null,
  "provider_name" text,
  "booking_url" text,
  "reference_code" text,
  "map_route_id" uuid,
  "origin_place_id" uuid,
  "destination_place_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null,
  "origin_stop_id" uuid,
  "destination_stop_id" uuid
);

create table if not exists "public"."seed_status_flow" (
  "id" uuid not null,
  "from_status" text not null,
  "to_status" text not null,
  "action_key" text not null,
  "requires_scheduled_date" boolean not null,
  "clear_scheduled_date" boolean not null,
  "create_page_on_transition" boolean not null,
  "enabled" boolean not null,
  "sort_order" integer not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seed_watering_confirmations" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "seed_id" uuid not null,
  "user_id" uuid not null,
  "watered_at" timestamp with time zone not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."seeds" (
  "id" uuid not null,
  "title" text not null,
  "notes" text,
  "element" text,
  "tags" text[],
  "status" text not null,
  "scheduled_date" date,
  "bloomed_page_id" uuid,
  "created_by" uuid,
  "created_at" timestamp with time zone,
  "garden_id" uuid not null,
  "map_place_id" uuid,
  "map_route_id" uuid,
  "plan_type_id" uuid
);

create table if not exists "public"."settings" (
  "id" integer not null,
  "welcome_text" text,
  "narrator_tone" text,
  "season_mode" text,
  "garden_name" text
);

create table if not exists "public"."sticker_pack_items" (
  "id" uuid not null,
  "pack_id" uuid not null,
  "sticker_id" uuid not null,
  "sort_order" integer not null,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."sticker_packs" (
  "id" uuid not null,
  "key" text not null,
  "label" text not null,
  "description" text,
  "is_active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."sticker_unlock_rules" (
  "id" uuid not null,
  "pack_id" uuid not null,
  "rule_type" text not null,
  "rule_value" text,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."stickers" (
  "id" uuid not null,
  "key" text not null,
  "label" text not null,
  "src" text not null,
  "category" text,
  "is_active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."template_objects" (
  "id" uuid not null,
  "template_id" uuid not null,
  "object_order" integer not null,
  "object_json" jsonb not null,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."time_capsule_draft_revisions" (
  "id" uuid not null,
  "draft_id" uuid not null,
  "garden_id" uuid not null,
  "capsule_year" integer not null,
  "snapshot" jsonb not null,
  "summary" jsonb not null,
  "actor_user_id" uuid,
  "actor_name" text,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."time_capsule_drafts" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "capsule_year" integer not null,
  "title" text not null,
  "window_code" text not null,
  "content_blocks" jsonb not null,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."time_capsules" (
  "id" uuid not null,
  "garden_id" uuid not null,
  "title" text not null,
  "sealed_at" timestamp with time zone not null,
  "opens_at" date not null,
  "opened_at" timestamp with time zone,
  "status" text not null,
  "window_code" text not null,
  "content_blocks" jsonb not null,
  "sealed_by" uuid not null,
  "flower_family" text,
  "location_lat" double precision,
  "location_lng" double precision,
  "location_label" text,
  "created_at" timestamp with time zone not null
);

create table if not exists "public"."timeline_milestone_rules" (
  "id" uuid not null,
  "milestone_number" integer not null,
  "title" text not null,
  "message" text not null,
  "icon" text,
  "accent_color" text,
  "enabled" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."timeline_view_config" (
  "key" text not null,
  "default_view" text not null,
  "milestone_mode" text not null,
  "milestone_every" integer not null,
  "milestone_choices" integer[] not null,
  "milestone_message" text not null,
  "season_hemisphere" text not null,
  "spring_start_mmdd" integer not null,
  "summer_start_mmdd" integer not null,
  "autumn_start_mmdd" integer not null,
  "winter_start_mmdd" integer not null,
  "is_active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."ui_module_items" (
  "id" uuid not null,
  "module_key" text not null,
  "item_key" text not null,
  "label" text not null,
  "route" text,
  "icon" text,
  "sort_order" integer not null,
  "is_active" boolean not null,
  "metadata" jsonb not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."ui_modules" (
  "key" text not null,
  "label" text not null,
  "description" text,
  "is_active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."ui_strings" (
  "id" uuid not null,
  "namespace" text not null,
  "key" text not null,
  "locale" text not null,
  "value" text not null,
  "metadata" jsonb not null,
  "is_active" boolean not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."user_notices" (
  "id" uuid not null,
  "user_id" uuid not null,
  "kind" text not null,
  "garden_id" uuid,
  "title" text not null,
  "message" text not null,
  "created_at" timestamp with time zone not null,
  "read_at" timestamp with time zone,
  "metadata" jsonb not null
);

create table if not exists "public"."year_cycle_states" (
  "garden_id" uuid not null,
  "year" integer not null,
  "closed_at" timestamp with time zone,
  "closed_by_user_id" uuid,
  "acknowledged_user_ids" uuid[] not null,
  "created_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone not null
);

create table if not exists "public"."year_notes" (
  "year" integer not null,
  "note" text not null,
  "cover_url" text,
  "updated_at" timestamp with time zone not null,
  "garden_id" uuid not null,
  "highlight_page_ids" jsonb not null
);


-- Functions
-- ---------
CREATE OR REPLACE FUNCTION public.accept_private_garden_invitation(p_invitation_id uuid, p_garden_title text DEFAULT NULL::text, p_garden_theme text DEFAULT NULL::text)
 RETURNS TABLE(out_invitation_id uuid, out_bond_id uuid, out_garden_id uuid, out_bond_type text, out_garden_title text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_actor_email text;
  v_invitation public.garden_invitations%rowtype;
  v_bond_id uuid;
  v_garden_id uuid;
  v_garden_title text;
  v_garden_theme text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_actor_email := lower(trim(coalesce(auth.jwt()->>'email', '')));
  v_garden_theme := nullif(trim(coalesce(p_garden_theme, '')), '');

  select *
  into v_invitation
  from public.garden_invitations gi
  where gi.id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitacion no encontrada.' using errcode = '22023';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'La invitacion ya no esta pendiente.' using errcode = '22023';
  end if;

  if v_invitation.expires_at < timezone('utc', now()) then
    update public.garden_invitations
    set status = 'expired'
    where id = v_invitation.id;
    raise exception 'La invitacion ha expirado.' using errcode = '22023';
  end if;

  if v_invitation.invited_user_id is not null then
    if v_invitation.invited_user_id <> v_actor_id then
      raise exception 'No autorizado para aceptar esta invitacion.' using errcode = '42501';
    end if;
  else
    if v_actor_email = '' then
      raise exception 'No se pudo validar tu email de sesion.' using errcode = '42501';
    end if;
    if lower(coalesce(v_invitation.invited_email, '')) <> v_actor_email then
      raise exception 'No autorizado para aceptar esta invitacion.' using errcode = '42501';
    end if;
  end if;

  if exists (
    select 1
    from public.bonds b
    join public.bond_members bm_owner
      on bm_owner.bond_id = b.id
     and bm_owner.user_id = v_invitation.invited_by_user_id
     and bm_owner.left_at is null
    join public.bond_members bm_actor
      on bm_actor.bond_id = b.id
     and bm_actor.user_id = v_actor_id
     and bm_actor.left_at is null
    where b.status = 'active'
      and b.type = v_invitation.bond_type
  ) then
    raise exception 'Ya existe un vinculo activo para ese tipo.' using errcode = '23505';
  end if;

  insert into public.bonds (
    type,
    status,
    title,
    created_by_user_id
  )
  values (
    v_invitation.bond_type,
    'active',
    null,
    v_invitation.invited_by_user_id
  )
  returning id into v_bond_id;

  insert into public.bond_members (bond_id, user_id, member_role)
  values
    (v_bond_id, v_invitation.invited_by_user_id, 'owner'),
    (v_bond_id, v_actor_id, 'member')
  on conflict do nothing;

  v_garden_title := nullif(trim(coalesce(p_garden_title, '')), '');
  if v_garden_title is null then
    v_garden_title := case v_invitation.bond_type
      when 'pareja' then 'Jardin de pareja'
      when 'amistad' then 'Jardin de amistad'
      when 'familia' then 'Jardin de familia'
      else 'Jardin compartido'
    end;
  end if;

  insert into public.gardens (
    bond_id,
    title,
    theme,
    status,
    is_private,
    created_by_user_id
  )
  values (
    v_bond_id,
    v_garden_title,
    v_garden_theme,
    'active',
    true,
    v_invitation.invited_by_user_id
  )
  returning id into v_garden_id;

  insert into public.garden_members (garden_id, user_id, member_role)
  values
    (v_garden_id, v_invitation.invited_by_user_id, 'owner'),
    (v_garden_id, v_actor_id, 'editor')
  on conflict do nothing;

  update public.garden_invitations
  set
    status = 'accepted',
    accepted_at = timezone('utc', now()),
    invited_user_id = coalesce(v_invitation.invited_user_id, v_actor_id)
  where id = v_invitation.id;

  update public.profiles
  set active_garden_id = coalesce(active_garden_id, v_garden_id)
  where id in (v_invitation.invited_by_user_id, v_actor_id);

  return query
  select
    v_invitation.id,
    v_bond_id,
    v_garden_id,
    v_invitation.bond_type,
    v_garden_title;
end;
$function$;

CREATE OR REPLACE FUNCTION public.annual_tree_phase_from_stage(stage_value integer)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  safe_stage integer := greatest(0, least(100, coalesce(stage_value, 0)));
begin
  if safe_stage <= 0 then return 'seed'; end if;
  if safe_stage <= 8 then return 'germination'; end if;
  if safe_stage <= 22 then return 'sprout'; end if;
  if safe_stage <= 38 then return 'sapling'; end if;
  if safe_stage <= 56 then return 'young'; end if;
  if safe_stage <= 74 then return 'mature'; end if;
  if safe_stage <= 90 then return 'blooming'; end if;
  return 'legacy';
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_private_garden_invitation(p_bond_type text, p_target_invite_code text DEFAULT NULL::text, p_target_email text DEFAULT NULL::text)
 RETURNS TABLE(invitation_id uuid, bond_type text, status text, invited_user_id uuid, invited_email text, expires_at timestamp with time zone, target_name text, target_avatar_url text, target_invite_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_actor_id uuid;
  v_bond_type text;
  v_target_code text;
  v_target_user_id uuid;
  v_target_name text;
  v_target_avatar_url text;
  v_target_invite_code text;
  v_target_email text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_bond_type := lower(trim(coalesce(p_bond_type, '')));
  if v_bond_type not in ('pareja', 'amistad', 'familia', 'personal') then
    raise exception 'Tipo de vinculo invalido.' using errcode = '22023';
  end if;

  v_target_code := upper(regexp_replace(coalesce(p_target_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_target_code) = 8 then
    select
      p.id,
      p.name,
      p.avatar_url,
      p.invite_code
    into
      v_target_user_id,
      v_target_name,
      v_target_avatar_url,
      v_target_invite_code
    from public.profiles p
    where p.invite_code = v_target_code
    limit 1;
  end if;

  v_target_email := lower(trim(coalesce(p_target_email, '')));
  if v_target_email = '' then
    v_target_email := null;
  end if;

  if v_target_user_id is null and v_target_email is null then
    raise exception 'Debes indicar codigo exacto o email.' using errcode = '22023';
  end if;

  if v_target_user_id = v_actor_id then
    raise exception 'No puedes invitarte a ti mismo.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.garden_invitations gi
    where gi.invited_by_user_id = v_actor_id
      and gi.status = 'pending'
      and gi.bond_type = v_bond_type
      and (
        (v_target_user_id is not null and gi.invited_user_id = v_target_user_id)
        or (
          v_target_user_id is null
          and v_target_email is not null
          and lower(coalesce(gi.invited_email, '')) = v_target_email
        )
      )
  ) then
    raise exception 'Ya existe una invitacion pendiente para ese destino.' using errcode = '23505';
  end if;

  insert into public.garden_invitations as gi (
    bond_type,
    invited_email,
    invited_user_id,
    invited_by_user_id,
    token_hash,
    status,
    expires_at
  )
  values (
    v_bond_type,
    v_target_email,
    v_target_user_id,
    v_actor_id,
    encode(
      digest(
        gen_random_uuid()::text || ':' || coalesce(v_target_email, '') || ':' || clock_timestamp()::text,
        'sha256'
      ),
      'hex'
    ),
    'pending',
    timezone('utc', now()) + interval '14 days'
  )
  returning gi.id, gi.expires_at
  into v_invitation_id, v_expires_at;

  return query
  select
    v_invitation_id,
    v_bond_type,
    'pending'::text,
    v_target_user_id,
    v_target_email,
    v_expires_at,
    v_target_name,
    v_target_avatar_url,
    v_target_invite_code;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_private_personal_garden(p_garden_title text DEFAULT NULL::text, p_garden_theme text DEFAULT NULL::text)
 RETURNS TABLE(out_bond_id uuid, out_garden_id uuid, out_garden_title text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_bond_id uuid;
  v_garden_id uuid;
  v_garden_title text;
  v_garden_theme text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_garden_title := nullif(trim(coalesce(p_garden_title, '')), '');
  if v_garden_title is null then
    v_garden_title := 'Jardin personal';
  end if;
  v_garden_theme := nullif(trim(coalesce(p_garden_theme, '')), '');

  insert into public.bonds (
    type,
    status,
    title,
    created_by_user_id
  )
  values (
    'personal',
    'active',
    v_garden_title,
    v_actor_id
  )
  returning id into v_bond_id;

  insert into public.bond_members (bond_id, user_id, member_role)
  values (v_bond_id, v_actor_id, 'owner')
  on conflict do nothing;

  insert into public.gardens (
    bond_id,
    title,
    theme,
    status,
    is_private,
    created_by_user_id
  )
  values (
    v_bond_id,
    v_garden_title,
    v_garden_theme,
    'active',
    true,
    v_actor_id
  )
  returning id into v_garden_id;

  insert into public.garden_members (garden_id, user_id, member_role)
  values (v_garden_id, v_actor_id, 'owner')
  on conflict do nothing;

  update public.profiles
  set active_garden_id = coalesce(active_garden_id, v_garden_id)
  where id = v_actor_id;

  return query
  select
    v_bond_id,
    v_garden_id,
    v_garden_title;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_garden_page(p_page_id uuid)
 RETURNS TABLE(out_page_id uuid, out_seed_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_page public.pages%rowtype;
  v_allowed boolean := false;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  select *
  into v_page
  from public.pages p
  where p.id = p_page_id
  for update;

  if not found then
    raise exception 'La pagina no existe o ya fue borrada.' using errcode = 'P0002';
  end if;

  select
    exists (
      select 1
      from public.profiles profile_row
      where profile_row.id = v_actor_id
        and profile_row.role = 'superadmin'
    )
    or exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = v_page.garden_id
        and gm.user_id = v_actor_id
        and gm.left_at is null
        and gm.member_role in ('owner', 'editor')
    )
  into v_allowed;

  if not coalesce(v_allowed, false) then
    raise exception 'No autorizado para borrar esta pagina.' using errcode = '42501';
  end if;

  if v_page.planned_from_seed_id is not null then
    update public.seeds
    set bloomed_page_id = null
    where id = v_page.planned_from_seed_id
      and bloomed_page_id = v_page.id;
  end if;

  delete from public.pages
  where id = v_page.id;

  return query
  select
    v_page.id,
    v_page.planned_from_seed_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.find_profile_by_invite_code(p_invite_code text)
 RETURNS TABLE(id uuid, name text, avatar_url text, invite_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_code text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'No autenticado.' using errcode = '28000';
  end if;

  v_code := upper(regexp_replace(coalesce(p_invite_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_code) <> 8 then
    return;
  end if;

  return query
  select
    p.id,
    p.name,
    p.avatar_url,
    p.invite_code
  from public.profiles p
  where p.invite_code = v_code
    and p.id <> v_actor_id
  limit 1;
end;
$function$;

CREATE OR REPLACE FUNCTION public.flower_birth_ritual_ratings_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_page_garden_id uuid;
begin
  select p.garden_id
  into v_page_garden_id
  from public.pages p
  where p.id = new.page_id;

  if v_page_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La pagina indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_page_garden_id;
  elsif new.garden_id <> v_page_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la valoracion no coincide con la pagina.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.flower_birth_rituals_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_page_garden_id uuid;
begin
  select p.garden_id
  into v_page_garden_id
  from public.pages p
  where p.id = new.page_id;

  if v_page_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La pagina indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_page_garden_id;
  elsif new.garden_id <> v_page_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del ritual no coincide con la pagina.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.flower_page_revisions_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_page_garden_id uuid;
begin
  select p.garden_id
  into v_page_garden_id
  from public.pages p
  where p.id = new.page_id;

  if v_page_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La pagina indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_page_garden_id;
  elsif new.garden_id <> v_page_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la revision no coincide con la pagina.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.garden_audio_session_participants_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_session_garden_id uuid;
begin
  select s.garden_id
  into v_session_garden_id
  from public.garden_audio_sessions s
  where s.id = new.session_id;

  if v_session_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sesion de audio indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_session_garden_id;
  elsif new.garden_id <> v_session_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del participante no coincide con la sesion de audio.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.garden_audio_sessions_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_room_garden_id uuid;
begin
  if new.room_id is null then
    return new;
  end if;

  select r.garden_id
  into v_room_garden_id
  from public.garden_chat_rooms r
  where r.id = new.room_id;

  if v_room_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sala de audio no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_room_garden_id;
  elsif new.garden_id <> v_room_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la sesion de audio no coincide con la sala.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.garden_chat_attachments_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_message_garden_id uuid;
begin
  select m.garden_id
  into v_message_garden_id
  from public.garden_chat_messages m
  where m.id = new.message_id;

  if v_message_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'El mensaje indicado no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_message_garden_id;
  elsif new.garden_id <> v_message_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del adjunto no coincide con el mensaje.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.garden_chat_messages_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_room_garden_id uuid;
  v_reply_room_id uuid;
begin
  select r.garden_id
  into v_room_garden_id
  from public.garden_chat_rooms r
  where r.id = new.room_id;

  if v_room_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sala indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_room_garden_id;
  elsif new.garden_id <> v_room_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del mensaje no coincide con la sala.';
  end if;

  if new.reply_to_message_id is not null then
    select m.room_id
    into v_reply_room_id
    from public.garden_chat_messages m
    where m.id = new.reply_to_message_id;

    if v_reply_room_id is null or v_reply_room_id <> new.room_id then
      raise exception using
        errcode = '23514',
        message = 'El mensaje respondido debe pertenecer a la misma sala.';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.garden_chat_reactions_sync_room_garden()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_room_id uuid;
  v_garden_id uuid;
begin
  select m.room_id, m.garden_id
  into v_room_id, v_garden_id
  from public.garden_chat_messages m
  where m.id = new.message_id;

  if v_room_id is null or v_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La reaccion apunta a un mensaje de chat invalido.';
  end if;

  if new.room_id is null then
    new.room_id = v_room_id;
  elsif new.room_id <> v_room_id then
    raise exception using
      errcode = '23514',
      message = 'room_id de la reaccion no coincide con el mensaje.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_garden_id;
  elsif new.garden_id <> v_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la reaccion no coincide con el mensaje.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.garden_chat_read_states_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_room_garden_id uuid;
  v_message_room_id uuid;
begin
  select r.garden_id
  into v_room_garden_id
  from public.garden_chat_rooms r
  where r.id = new.room_id;

  if v_room_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La sala de lectura no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = v_room_garden_id;
  elsif new.garden_id <> v_room_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id del cursor de lectura no coincide con la sala.';
  end if;

  if new.last_read_message_id is not null then
    select m.room_id
    into v_message_room_id
    from public.garden_chat_messages m
    where m.id = new.last_read_message_id;

    if v_message_room_id is null or v_message_room_id <> new.room_id then
      raise exception using
        errcode = '23514',
        message = 'El ultimo mensaje leido debe pertenecer a la misma sala.';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_profile_invite_code()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_candidate text;
begin
  loop
    v_candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1
      from public.profiles p
      where p.invite_code = v_candidate
    );
  end loop;
  return v_candidate;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_garden_member_count(target_garden_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  is_allowed boolean := false;
  member_count integer := 0;
begin
  if target_garden_id is null then
    return 0;
  end if;

  select
    exists (
      select 1
      from public.garden_members gm
      where gm.garden_id = target_garden_id
        and gm.user_id = auth.uid()
        and gm.left_at is null
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'superadmin'
    )
  into is_allowed;

  if not coalesce(is_allowed, false) then
    return 0;
  end if;

  select greatest(count(*), 1)::int
  into member_count
  from public.garden_members gm
  where gm.garden_id = target_garden_id
    and gm.left_at is null;

  return coalesce(member_count, 1);
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, name, role, avatar_url)
  values (
    new.id,
    case
      when lower(new.email) = 'sergioantequera@hotmail.es' then 'Sergio'
      when lower(new.email) = 'carmeen.gutierrez.98@hotmail.com' then 'Carmen'
      else coalesce(split_part(new.email, '@', 1), 'Jardinero')
    end,
    case
      when lower(new.email) = 'sergioantequera@hotmail.es' then 'superadmin'
      when lower(new.email) = 'carmeen.gutierrez.98@hotmail.com' then 'gardener_b'
      else 'gardener_a'
    end,
    null
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_superadmin_auth()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.pages_fill_plan_type_from_linked_seed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.plan_type_id is not null or new.planned_from_seed_id is null then
    return new;
  end if;

  select s.plan_type_id
  into new.plan_type_id
  from public.seeds s
  where s.id = new.planned_from_seed_id;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rebuild_all_garden_year_tree_states()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target record;
begin
  delete from public.garden_year_tree_states;

  for target in (
    select distinct
      p.garden_id,
      extract(year from p.date)::integer as year
    from public.pages p
    where p.garden_id is not null
      and p.date is not null

    union

    select distinct
      u.garden_id,
      extract(year from timezone('utc', u.claimed_at))::integer as year
    from public.progression_tree_unlocks u
    where u.garden_id is not null
      and u.claimed_at is not null
  )
  loop
    perform public.recompute_garden_year_tree_state(target.garden_id, target.year);
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rebuild_all_page_visual_states()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target record;
begin
  delete from public.page_visual_states;

  for target in (
    select p.id
    from public.pages p
    where p.garden_id is not null
  )
  loop
    perform public.recompute_page_visual_state(target.id);
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_garden_year_tree_state(target_garden_id uuid, target_year integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  year_start date;
  year_end date;
  year_start_ts timestamptz;
  year_end_ts timestamptz;
  v_total_events integer := 0;
  v_active_days integer := 0;
  v_bloomed_events integer := 0;
  v_shiny_events integer := 0;
  v_favorite_events integer := 0;
  v_avg_rating numeric(6,3) := 0;
  v_milestones_unlocked integer := 0;
  v_growth_score numeric(8,3) := 0;
  v_stage integer := 0;
  v_phase text := 'seed';
begin
  if target_garden_id is null or target_year is null or target_year < 1900 or target_year > 2200 then
    return;
  end if;

  year_start := make_date(target_year, 1, 1);
  year_end := make_date(target_year + 1, 1, 1);
  year_start_ts := make_timestamptz(target_year, 1, 1, 0, 0, 0, 'UTC');
  year_end_ts := make_timestamptz(target_year + 1, 1, 1, 0, 0, 0, 'UTC');

  select
    count(*)::integer as total_events,
    count(distinct p.date)::integer as active_days,
    count(*)::integer as bloomed_events,
    count(*) filter (where p.mood_state = 'shiny')::integer as shiny_events,
    count(*) filter (where coalesce(p.is_favorite, false))::integer as favorite_events,
    coalesce(avg(p.rating), 0)::numeric(6,3) as avg_rating
  into
    v_total_events,
    v_active_days,
    v_bloomed_events,
    v_shiny_events,
    v_favorite_events,
    v_avg_rating
  from public.pages p
  where p.garden_id = target_garden_id
    and p.date is not null
    and p.date >= year_start
    and p.date < year_end;

  select
    count(*)::integer
  into v_milestones_unlocked
  from public.progression_tree_unlocks u
  where u.garden_id = target_garden_id
    and u.claimed_at is not null
    and u.claimed_at >= year_start_ts
    and u.claimed_at < year_end_ts;

  if coalesce(v_total_events, 0) = 0 and coalesce(v_milestones_unlocked, 0) = 0 then
    delete from public.garden_year_tree_states
    where garden_id = target_garden_id
      and year = target_year;
    return;
  end if;

  v_growth_score :=
      least(coalesce(v_total_events, 0)::numeric / 72.0, 1) * 28
    + least(coalesce(v_active_days, 0)::numeric / 120.0, 1) * 20
    + least(coalesce(v_bloomed_events, 0)::numeric / 36.0, 1) * 16
    + least(coalesce(v_shiny_events, 0)::numeric / 24.0, 1) * 12
    + least(coalesce(v_favorite_events, 0)::numeric / 14.0, 1) * 8
    + least(coalesce(v_avg_rating, 0)::numeric / 4.5, 1) * 10
    + least(coalesce(v_milestones_unlocked, 0)::numeric / 8.0, 1) * 6;

  v_stage := greatest(0, least(100, round(v_growth_score)::integer));
  v_phase := public.annual_tree_phase_from_stage(v_stage);

  insert into public.garden_year_tree_states (
    garden_id,
    year,
    total_events,
    active_days,
    bloomed_events,
    shiny_events,
    favorite_events,
    avg_rating,
    milestones_unlocked,
    growth_score,
    stage,
    phase,
    generated_at
  )
  values (
    target_garden_id,
    target_year,
    coalesce(v_total_events, 0),
    coalesce(v_active_days, 0),
    coalesce(v_bloomed_events, 0),
    coalesce(v_shiny_events, 0),
    coalesce(v_favorite_events, 0),
    coalesce(v_avg_rating, 0),
    coalesce(v_milestones_unlocked, 0),
    coalesce(v_growth_score, 0),
    v_stage,
    v_phase,
    timezone('utc', now())
  )
  on conflict (garden_id, year) do update
  set
    total_events = excluded.total_events,
    active_days = excluded.active_days,
    bloomed_events = excluded.bloomed_events,
    shiny_events = excluded.shiny_events,
    favorite_events = excluded.favorite_events,
    avg_rating = excluded.avg_rating,
    milestones_unlocked = excluded.milestones_unlocked,
    growth_score = excluded.growth_score,
    stage = excluded.stage,
    phase = excluded.phase,
    generated_at = excluded.generated_at,
    updated_at = timezone('utc', now());
end;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_page_visual_state(target_page_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_page record;
  v_cover_photo_url text;
  v_thumbnail_url text;
  v_secondary_photo_url text;
begin
  if target_page_id is null then
    return;
  end if;

  select
    p.id as page_id,
    p.garden_id,
    p.plan_type_id,
    p.element as page_element,
    p.rating,
    p.cover_photo_url,
    p.thumbnail_url,
    pt.code as plan_type_code,
    pt.label as plan_type_label,
    pt.category as plan_category,
    pt.flower_family,
    pt.flower_asset_path,
    pt.flower_builder_config,
    pt.suggested_element
  into v_page
  from public.pages p
  left join public.garden_plan_types pt
    on pt.id = p.plan_type_id
  where p.id = target_page_id;

  if not found or v_page.garden_id is null then
    delete from public.page_visual_states
    where page_id = target_page_id;
    return;
  end if;

  v_cover_photo_url := nullif(btrim(coalesce(v_page.cover_photo_url, '')), '');
  v_thumbnail_url := nullif(btrim(coalesce(v_page.thumbnail_url, '')), '');
  v_secondary_photo_url := coalesce(v_cover_photo_url, v_thumbnail_url);

  insert into public.page_visual_states (
    page_id,
    garden_id,
    plan_type_id,
    plan_type_code,
    plan_type_label,
    plan_category,
    flower_family,
    flower_asset_path,
    flower_builder_config,
    suggested_element,
    page_element,
    rating,
    cover_photo_url,
    thumbnail_url,
    secondary_photo_url,
    has_secondary_photo,
    generated_at
  )
  values (
    v_page.page_id,
    v_page.garden_id,
    v_page.plan_type_id,
    nullif(btrim(coalesce(v_page.plan_type_code, '')), ''),
    nullif(btrim(coalesce(v_page.plan_type_label, '')), ''),
    nullif(btrim(coalesce(v_page.plan_category, '')), ''),
    nullif(btrim(coalesce(v_page.flower_family, '')), ''),
    nullif(btrim(coalesce(v_page.flower_asset_path, '')), ''),
    coalesce(v_page.flower_builder_config, '{}'::jsonb),
    nullif(btrim(coalesce(v_page.suggested_element, '')), ''),
    coalesce(nullif(btrim(coalesce(v_page.page_element, '')), ''), 'aether'),
    coalesce(v_page.rating, 0),
    v_cover_photo_url,
    v_thumbnail_url,
    v_secondary_photo_url,
    v_secondary_photo_url is not null,
    timezone('utc', now())
  )
  on conflict (page_id) do update
  set
    garden_id = excluded.garden_id,
    plan_type_id = excluded.plan_type_id,
    plan_type_code = excluded.plan_type_code,
    plan_type_label = excluded.plan_type_label,
    plan_category = excluded.plan_category,
    flower_family = excluded.flower_family,
    flower_asset_path = excluded.flower_asset_path,
    flower_builder_config = excluded.flower_builder_config,
    suggested_element = excluded.suggested_element,
    page_element = excluded.page_element,
    rating = excluded.rating,
    cover_photo_url = excluded.cover_photo_url,
    thumbnail_url = excluded.thumbnail_url,
    secondary_photo_url = excluded.secondary_photo_url,
    has_secondary_photo = excluded.has_secondary_photo,
    generated_at = excluded.generated_at,
    updated_at = timezone('utc', now());
end;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_page_visual_states_for_plan_type(target_plan_type_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target record;
begin
  if target_plan_type_id is null then
    return;
  end if;

  for target in (
    select p.id
    from public.pages p
    where p.plan_type_id = target_plan_type_id
  )
  loop
    perform public.recompute_page_visual_state(target.id);
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seed_main_chat_room_for_garden()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.garden_chat_rooms (
    garden_id,
    slug,
    title,
    room_kind,
    sort_order,
    created_by
  )
  values (
    new.id,
    'main',
    'Chat',
    'main',
    0,
    null
  )
  on conflict (garden_id, slug) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seed_watering_confirmations_sync_garden_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  seed_garden_id uuid;
begin
  select s.garden_id
  into seed_garden_id
  from public.seeds s
  where s.id = new.seed_id;

  if seed_garden_id is null then
    raise exception using
      errcode = '23514',
      message = 'La semilla indicada no existe o no tiene garden_id.';
  end if;

  if new.garden_id is null then
    new.garden_id = seed_garden_id;
  elsif new.garden_id <> seed_garden_id then
    raise exception using
      errcode = '23514',
      message = 'garden_id de la confirmacion no coincide con la semilla.';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_bloomed_page_plan_type_from_seed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.bloomed_page_id is null then
    return null;
  end if;

  update public.pages p
  set plan_type_id = new.plan_type_id
  where p.id = new.bloomed_page_id
    and p.planned_from_seed_id = new.id
    and p.garden_id = new.garden_id
    and p.plan_type_id is distinct from new.plan_type_id;

  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tg_recompute_garden_year_tree_state_from_pages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_year integer := case when tg_op in ('UPDATE', 'DELETE') and old.date is not null then extract(year from old.date)::integer else null end;
  new_year integer := case when tg_op in ('INSERT', 'UPDATE') and new.date is not null then extract(year from new.date)::integer else null end;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.garden_id is not null and old_year is not null then
    perform public.recompute_garden_year_tree_state(old.garden_id, old_year);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.garden_id is not null and new_year is not null then
    if tg_op <> 'UPDATE'
       or old.garden_id is distinct from new.garden_id
       or old_year is distinct from new_year then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    elsif tg_op = 'UPDATE' then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    end if;
  end if;

  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tg_recompute_garden_year_tree_state_from_unlocks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_year integer := case when tg_op in ('UPDATE', 'DELETE') and old.claimed_at is not null then extract(year from timezone('utc', old.claimed_at))::integer else null end;
  new_year integer := case when tg_op in ('INSERT', 'UPDATE') and new.claimed_at is not null then extract(year from timezone('utc', new.claimed_at))::integer else null end;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.garden_id is not null and old_year is not null then
    perform public.recompute_garden_year_tree_state(old.garden_id, old_year);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.garden_id is not null and new_year is not null then
    if tg_op <> 'UPDATE'
       or old.garden_id is distinct from new.garden_id
       or old_year is distinct from new_year then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    elsif tg_op = 'UPDATE' then
      perform public.recompute_garden_year_tree_state(new.garden_id, new_year);
    end if;
  end if;

  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tg_recompute_page_visual_state_from_pages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    delete from public.page_visual_states
    where page_id = old.id;
    return null;
  end if;

  perform public.recompute_page_visual_state(new.id);
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tg_recompute_page_visual_state_from_plan_types()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_page_visual_states_for_plan_type(old.id);
    return null;
  end if;

  perform public.recompute_page_visual_states_for_plan_type(new.id);
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;


-- Column defaults
-- ---------------
alter table "public"."achievement_rules" alter column "id" set default gen_random_uuid();
alter table "public"."achievement_rules" alter column "created_at" set default now();
alter table "public"."achievements_unlocked" alter column "id" set default gen_random_uuid();
alter table "public"."achievements_unlocked" alter column "unlocked_at" set default now();
alter table "public"."annual_tree_check_ins" alter column "id" set default gen_random_uuid();
alter table "public"."annual_tree_check_ins" alter column "observed_at" set default now();
alter table "public"."annual_tree_check_ins" alter column "status" set default 'growing'::text;
alter table "public"."annual_tree_check_ins" alter column "created_at" set default now();
alter table "public"."annual_tree_growth_profiles" alter column "is_active" set default true;
alter table "public"."annual_tree_growth_profiles" alter column "targets" set default '{}'::jsonb;
alter table "public"."annual_tree_growth_profiles" alter column "weights" set default '{}'::jsonb;
alter table "public"."annual_tree_growth_profiles" alter column "visual" set default '{}'::jsonb;
alter table "public"."annual_tree_growth_profiles" alter column "created_at" set default now();
alter table "public"."annual_tree_growth_profiles" alter column "updated_at" set default now();
alter table "public"."annual_tree_rituals" alter column "id" set default gen_random_uuid();
alter table "public"."annual_tree_rituals" alter column "status" set default 'pending'::text;
alter table "public"."annual_tree_rituals" alter column "created_at" set default now();
alter table "public"."annual_tree_snapshots" alter column "growth_score" set default 0;
alter table "public"."annual_tree_snapshots" alter column "phase" set default 'seed'::text;
alter table "public"."annual_tree_snapshots" alter column "metrics" set default '{}'::jsonb;
alter table "public"."annual_tree_snapshots" alter column "frame" set default '{}'::jsonb;
alter table "public"."annual_tree_snapshots" alter column "generated_at" set default now();
alter table "public"."annual_tree_snapshots" alter column "updated_at" set default now();
alter table "public"."bond_members" alter column "id" set default gen_random_uuid();
alter table "public"."bond_members" alter column "member_role" set default 'member'::text;
alter table "public"."bond_members" alter column "joined_at" set default timezone('utc'::text, now());
alter table "public"."bonds" alter column "id" set default gen_random_uuid();
alter table "public"."bonds" alter column "status" set default 'pending'::text;
alter table "public"."bonds" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."bonds" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."calendar_rules" alter column "allow_past_schedule" set default true;
alter table "public"."calendar_rules" alter column "max_seeds_per_day" set default 0;
alter table "public"."calendar_rules" alter column "bloom_only_scheduled" set default true;
alter table "public"."calendar_rules" alter column "show_unscheduled_in_calendar" set default false;
alter table "public"."calendar_rules" alter column "days_ahead_limit" set default 0;
alter table "public"."calendar_rules" alter column "created_at" set default now();
alter table "public"."calendar_rules" alter column "updated_at" set default now();
alter table "public"."canvas_templates" alter column "id" set default gen_random_uuid();
alter table "public"."canvas_templates" alter column "enabled" set default true;
alter table "public"."canvas_templates" alter column "sort_order" set default 100;
alter table "public"."canvas_templates" alter column "created_at" set default now();
alter table "public"."canvas_templates" alter column "updated_at" set default now();
alter table "public"."catalog_items" alter column "id" set default gen_random_uuid();
alter table "public"."catalog_items" alter column "sort_order" set default 100;
alter table "public"."catalog_items" alter column "enabled" set default true;
alter table "public"."catalog_items" alter column "metadata" set default '{}'::jsonb;
alter table "public"."catalog_items" alter column "created_at" set default now();
alter table "public"."catalog_items" alter column "updated_at" set default now();
alter table "public"."catalogs" alter column "is_active" set default true;
alter table "public"."catalogs" alter column "created_at" set default now();
alter table "public"."catalogs" alter column "updated_at" set default now();
alter table "public"."flower_birth_ritual_ratings" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."flower_birth_ritual_ratings" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."flower_birth_rituals" alter column "activated_at" set default timezone('utc'::text, now());
alter table "public"."flower_birth_rituals" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."flower_birth_rituals" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."flower_page_revisions" alter column "id" set default gen_random_uuid();
alter table "public"."flower_page_revisions" alter column "snapshot" set default '{}'::jsonb;
alter table "public"."flower_page_revisions" alter column "summary" set default '{}'::jsonb;
alter table "public"."flower_page_revisions" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."forest_assets" alter column "id" set default gen_random_uuid();
alter table "public"."forest_assets" alter column "asset_type" set default 'token'::text;
alter table "public"."forest_assets" alter column "enabled" set default true;
alter table "public"."forest_assets" alter column "sort_order" set default 100;
alter table "public"."forest_assets" alter column "metadata" set default '{}'::jsonb;
alter table "public"."forest_assets" alter column "created_at" set default now();
alter table "public"."forest_assets" alter column "updated_at" set default now();
alter table "public"."forest_narrative_templates" alter column "id" set default gen_random_uuid();
alter table "public"."forest_narrative_templates" alter column "enabled" set default true;
alter table "public"."forest_narrative_templates" alter column "sort_order" set default 100;
alter table "public"."forest_narrative_templates" alter column "metadata" set default '{}'::jsonb;
alter table "public"."forest_narrative_templates" alter column "created_at" set default now();
alter table "public"."forest_narrative_templates" alter column "updated_at" set default now();
alter table "public"."forest_theme" alter column "is_active" set default true;
alter table "public"."forest_theme" alter column "priority" set default 100;
alter table "public"."forest_theme" alter column "metadata" set default '{}'::jsonb;
alter table "public"."forest_theme" alter column "created_at" set default now();
alter table "public"."forest_theme" alter column "updated_at" set default now();
alter table "public"."garden_audio_session_participants" alter column "role" set default 'guest'::text;
alter table "public"."garden_audio_session_participants" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_audio_session_participants" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."garden_audio_sessions" alter column "id" set default gen_random_uuid();
alter table "public"."garden_audio_sessions" alter column "provider" set default 'livekit'::text;
alter table "public"."garden_audio_sessions" alter column "started_at" set default timezone('utc'::text, now());
alter table "public"."garden_audio_sessions" alter column "metadata" set default '{}'::jsonb;
alter table "public"."garden_audio_sessions" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_audio_sessions" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_message_attachments" alter column "id" set default gen_random_uuid();
alter table "public"."garden_chat_message_attachments" alter column "size_bytes" set default 0;
alter table "public"."garden_chat_message_attachments" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_message_reactions" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_messages" alter column "id" set default gen_random_uuid();
alter table "public"."garden_chat_messages" alter column "client_message_id" set default (gen_random_uuid())::text;
alter table "public"."garden_chat_messages" alter column "metadata" set default '{}'::jsonb;
alter table "public"."garden_chat_messages" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_messages" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_read_states" alter column "last_read_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_read_states" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_rooms" alter column "id" set default gen_random_uuid();
alter table "public"."garden_chat_rooms" alter column "title" set default 'Chat'::text;
alter table "public"."garden_chat_rooms" alter column "room_kind" set default 'main'::text;
alter table "public"."garden_chat_rooms" alter column "sort_order" set default 0;
alter table "public"."garden_chat_rooms" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_chat_rooms" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."garden_invitations" alter column "id" set default gen_random_uuid();
alter table "public"."garden_invitations" alter column "status" set default 'pending'::text;
alter table "public"."garden_invitations" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_members" alter column "id" set default gen_random_uuid();
alter table "public"."garden_members" alter column "member_role" set default 'editor'::text;
alter table "public"."garden_members" alter column "joined_at" set default timezone('utc'::text, now());
alter table "public"."garden_plan_types" alter column "id" set default gen_random_uuid();
alter table "public"."garden_plan_types" alter column "category" set default 'custom'::text;
alter table "public"."garden_plan_types" alter column "suggested_element" set default 'aether'::text;
alter table "public"."garden_plan_types" alter column "is_custom" set default false;
alter table "public"."garden_plan_types" alter column "sort_order" set default 100;
alter table "public"."garden_plan_types" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."garden_plan_types" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."garden_plan_types" alter column "flower_family" set default 'estrella'::text;
alter table "public"."garden_plan_types" alter column "flower_builder_config" set default '{}'::jsonb;
alter table "public"."garden_year_tree_states" alter column "total_events" set default 0;
alter table "public"."garden_year_tree_states" alter column "active_days" set default 0;
alter table "public"."garden_year_tree_states" alter column "bloomed_events" set default 0;
alter table "public"."garden_year_tree_states" alter column "shiny_events" set default 0;
alter table "public"."garden_year_tree_states" alter column "favorite_events" set default 0;
alter table "public"."garden_year_tree_states" alter column "avg_rating" set default 0;
alter table "public"."garden_year_tree_states" alter column "milestones_unlocked" set default 0;
alter table "public"."garden_year_tree_states" alter column "growth_score" set default 0;
alter table "public"."garden_year_tree_states" alter column "stage" set default 0;
alter table "public"."garden_year_tree_states" alter column "phase" set default 'seed'::text;
alter table "public"."garden_year_tree_states" alter column "generated_at" set default timezone('utc'::text, now());
alter table "public"."garden_year_tree_states" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."gardens" alter column "id" set default gen_random_uuid();
alter table "public"."gardens" alter column "status" set default 'active'::text;
alter table "public"."gardens" alter column "is_private" set default true;
alter table "public"."gardens" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."gardens" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."map_places" alter column "id" set default gen_random_uuid();
alter table "public"."map_places" alter column "state" set default 'saved'::text;
alter table "public"."map_places" alter column "tags" set default '{}'::text[];
alter table "public"."map_places" alter column "metadata" set default '{}'::jsonb;
alter table "public"."map_places" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."map_places" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."map_routes" alter column "id" set default gen_random_uuid();
alter table "public"."map_routes" alter column "status" set default 'draft'::text;
alter table "public"."map_routes" alter column "travel_mode" set default 'walking'::text;
alter table "public"."map_routes" alter column "waypoints" set default '[]'::jsonb;
alter table "public"."map_routes" alter column "geometry" set default '{}'::jsonb;
alter table "public"."map_routes" alter column "tags" set default '{}'::text[];
alter table "public"."map_routes" alter column "metadata" set default '{}'::jsonb;
alter table "public"."map_routes" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."map_routes" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."map_zones" alter column "id" set default gen_random_uuid();
alter table "public"."map_zones" alter column "status" set default 'active'::text;
alter table "public"."map_zones" alter column "geojson" set default '{}'::jsonb;
alter table "public"."map_zones" alter column "tags" set default '{}'::text[];
alter table "public"."map_zones" alter column "metadata" set default '{}'::jsonb;
alter table "public"."map_zones" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."map_zones" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."memory_reflections" alter column "id" set default gen_random_uuid();
alter table "public"."memory_reflections" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."memory_reflections" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."page_visual_states" alter column "flower_builder_config" set default '{}'::jsonb;
alter table "public"."page_visual_states" alter column "page_element" set default 'aether'::text;
alter table "public"."page_visual_states" alter column "rating" set default 0;
alter table "public"."page_visual_states" alter column "has_secondary_photo" set default false;
alter table "public"."page_visual_states" alter column "generated_at" set default timezone('utc'::text, now());
alter table "public"."page_visual_states" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."pages" alter column "id" set default gen_random_uuid();
alter table "public"."pages" alter column "tags" set default '{}'::text[];
alter table "public"."pages" alter column "canvas_objects" set default '[]'::jsonb;
alter table "public"."pages" alter column "created_at" set default now();
alter table "public"."pages" alter column "mood_state" set default 'healthy'::text;
alter table "public"."pages" alter column "care_log" set default '[]'::jsonb;
alter table "public"."pages" alter column "is_favorite" set default false;
alter table "public"."pages" alter column "care_score" set default 55;
alter table "public"."pages" alter column "care_needs" set default jsonb_build_object('water', 55, 'light', 55, 'soil', 55, 'air', 55);
alter table "public"."pdf_layout_presets" alter column "id" set default gen_random_uuid();
alter table "public"."pdf_layout_presets" alter column "enabled" set default true;
alter table "public"."pdf_layout_presets" alter column "sort_order" set default 100;
alter table "public"."pdf_layout_presets" alter column "metadata" set default '{}'::jsonb;
alter table "public"."pdf_layout_presets" alter column "created_at" set default now();
alter table "public"."pdf_layout_presets" alter column "updated_at" set default now();
alter table "public"."pdf_text_templates" alter column "id" set default gen_random_uuid();
alter table "public"."pdf_text_templates" alter column "enabled" set default true;
alter table "public"."pdf_text_templates" alter column "sort_order" set default 100;
alter table "public"."pdf_text_templates" alter column "metadata" set default '{}'::jsonb;
alter table "public"."pdf_text_templates" alter column "created_at" set default now();
alter table "public"."pdf_text_templates" alter column "updated_at" set default now();
alter table "public"."pdf_theme_assets" alter column "id" set default gen_random_uuid();
alter table "public"."pdf_theme_assets" alter column "asset_type" set default 'token'::text;
alter table "public"."pdf_theme_assets" alter column "enabled" set default true;
alter table "public"."pdf_theme_assets" alter column "sort_order" set default 100;
alter table "public"."pdf_theme_assets" alter column "metadata" set default '{}'::jsonb;
alter table "public"."pdf_theme_assets" alter column "created_at" set default now();
alter table "public"."pdf_theme_assets" alter column "updated_at" set default now();
alter table "public"."pdf_themes" alter column "is_active" set default true;
alter table "public"."pdf_themes" alter column "priority" set default 100;
alter table "public"."pdf_themes" alter column "metadata" set default '{}'::jsonb;
alter table "public"."pdf_themes" alter column "created_at" set default now();
alter table "public"."pdf_themes" alter column "updated_at" set default now();
alter table "public"."profiles" alter column "created_at" set default now();
alter table "public"."profiles" alter column "invite_code" set default generate_profile_invite_code();
alter table "public"."progression_condition_unlocks" alter column "id" set default gen_random_uuid();
alter table "public"."progression_condition_unlocks" alter column "unlocked_at" set default now();
alter table "public"."progression_condition_unlocks" alter column "created_at" set default now();
alter table "public"."progression_condition_unlocks" alter column "updated_at" set default now();
alter table "public"."progression_conditions" alter column "id" set default gen_random_uuid();
alter table "public"."progression_conditions" alter column "description" set default ''::text;
alter table "public"."progression_conditions" alter column "enabled" set default true;
alter table "public"."progression_conditions" alter column "created_at" set default now();
alter table "public"."progression_conditions" alter column "updated_at" set default now();
alter table "public"."progression_graph_state" alter column "key" set default 'default'::text;
alter table "public"."progression_graph_state" alter column "positions" set default '{}'::jsonb;
alter table "public"."progression_graph_state" alter column "links" set default '[]'::jsonb;
alter table "public"."progression_graph_state" alter column "relation_modes" set default '{}'::jsonb;
alter table "public"."progression_graph_state" alter column "tree_settings" set default '{}'::jsonb;
alter table "public"."progression_graph_state" alter column "condition_settings" set default '{}'::jsonb;
alter table "public"."progression_graph_state" alter column "created_at" set default now();
alter table "public"."progression_graph_state" alter column "updated_at" set default now();
alter table "public"."progression_reward_unlocks" alter column "id" set default gen_random_uuid();
alter table "public"."progression_reward_unlocks" alter column "unlocked_at" set default now();
alter table "public"."progression_reward_unlocks" alter column "created_at" set default now();
alter table "public"."progression_reward_unlocks" alter column "updated_at" set default now();
alter table "public"."progression_rewards" alter column "id" set default gen_random_uuid();
alter table "public"."progression_rewards" alter column "description" set default ''::text;
alter table "public"."progression_rewards" alter column "payload" set default '{}'::jsonb;
alter table "public"."progression_rewards" alter column "enabled" set default true;
alter table "public"."progression_rewards" alter column "created_at" set default now();
alter table "public"."progression_rewards" alter column "updated_at" set default now();
alter table "public"."progression_tree_nodes" alter column "id" set default gen_random_uuid();
alter table "public"."progression_tree_nodes" alter column "description" set default ''::text;
alter table "public"."progression_tree_nodes" alter column "enabled" set default true;
alter table "public"."progression_tree_nodes" alter column "created_at" set default now();
alter table "public"."progression_tree_nodes" alter column "updated_at" set default now();
alter table "public"."progression_tree_nodes" alter column "rank" set default 'bronze'::text;
alter table "public"."progression_tree_nodes" alter column "rarity" set default 'common'::text;
alter table "public"."progression_tree_nodes" alter column "leaf_variant" set default 0;
alter table "public"."progression_tree_unlocks" alter column "id" set default gen_random_uuid();
alter table "public"."progression_tree_unlocks" alter column "unlocked_at" set default now();
alter table "public"."progression_tree_unlocks" alter column "created_at" set default now();
alter table "public"."progression_tree_unlocks" alter column "updated_at" set default now();
alter table "public"."rewards" alter column "id" set default gen_random_uuid();
alter table "public"."rewards" alter column "payload" set default '{}'::jsonb;
alter table "public"."rewards" alter column "created_at" set default now();
alter table "public"."season_notes" alter column "id" set default gen_random_uuid();
alter table "public"."season_notes" alter column "note" set default ''::text;
alter table "public"."season_notes" alter column "updated_at" set default now();
alter table "public"."seed_defaults" alter column "default_seed_status" set default 'seed'::text;
alter table "public"."seed_defaults" alter column "scheduled_status" set default 'scheduled'::text;
alter table "public"."seed_defaults" alter column "bloomed_status" set default 'bloomed'::text;
alter table "public"."seed_defaults" alter column "fallback_element" set default 'earth'::text;
alter table "public"."seed_defaults" alter column "default_mood_state" set default 'healthy'::text;
alter table "public"."seed_defaults" alter column "default_canvas_objects" set default '[]'::jsonb;
alter table "public"."seed_defaults" alter column "auto_open_created_page" set default true;
alter table "public"."seed_defaults" alter column "create_page_on_bloom" set default true;
alter table "public"."seed_defaults" alter column "created_at" set default now();
alter table "public"."seed_defaults" alter column "updated_at" set default now();
alter table "public"."seed_event_reminder_deliveries" alter column "id" set default gen_random_uuid();
alter table "public"."seed_event_reminder_deliveries" alter column "reminder_kind" set default 'seed_event_email'::text;
alter table "public"."seed_event_reminder_deliveries" alter column "status" set default 'pending'::text;
alter table "public"."seed_event_reminder_deliveries" alter column "recipient_emails" set default '{}'::text[];
alter table "public"."seed_event_reminder_deliveries" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_event_reminder_deliveries" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_attachments" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_attachments" alter column "order_index" set default 0;
alter table "public"."seed_preparation_attachments" alter column "linked_kind" set default 'seed'::text;
alter table "public"."seed_preparation_attachments" alter column "attachment_kind" set default 'other'::text;
alter table "public"."seed_preparation_attachments" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_attachments" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_checklist_items" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_checklist_items" alter column "order_index" set default 0;
alter table "public"."seed_preparation_checklist_items" alter column "category" set default 'misc'::text;
alter table "public"."seed_preparation_checklist_items" alter column "owner" set default 'shared'::text;
alter table "public"."seed_preparation_checklist_items" alter column "is_required" set default false;
alter table "public"."seed_preparation_checklist_items" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_checklist_items" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_itinerary_items" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_itinerary_items" alter column "order_index" set default 0;
alter table "public"."seed_preparation_itinerary_items" alter column "status" set default 'planned'::text;
alter table "public"."seed_preparation_itinerary_items" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_itinerary_items" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_place_links" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_place_links" alter column "order_index" set default 0;
alter table "public"."seed_preparation_place_links" alter column "priority" set default 'would_like'::text;
alter table "public"."seed_preparation_place_links" alter column "planning_state" set default 'idea'::text;
alter table "public"."seed_preparation_place_links" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_place_links" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_profiles" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_profiles" alter column "planner_mode" set default 'general'::text;
alter table "public"."seed_preparation_profiles" alter column "preparation_progress" set default 0;
alter table "public"."seed_preparation_profiles" alter column "enabled_blocks" set default '{}'::text[];
alter table "public"."seed_preparation_profiles" alter column "date_mode" set default 'single_day'::text;
alter table "public"."seed_preparation_profiles" alter column "goal_tags" set default '{}'::text[];
alter table "public"."seed_preparation_profiles" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_profiles" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_profiles" alter column "collaboration_mode" set default 'solo_for_now'::text;
alter table "public"."seed_preparation_reservations" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_reservations" alter column "order_index" set default 0;
alter table "public"."seed_preparation_reservations" alter column "reservation_kind" set default 'other'::text;
alter table "public"."seed_preparation_reservations" alter column "status" set default 'pending'::text;
alter table "public"."seed_preparation_reservations" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_reservations" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_stays" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_stays" alter column "order_index" set default 0;
alter table "public"."seed_preparation_stays" alter column "stay_kind" set default 'other'::text;
alter table "public"."seed_preparation_stays" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_stays" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_stops" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_stops" alter column "order_index" set default 0;
alter table "public"."seed_preparation_stops" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_stops" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_transport_legs" alter column "id" set default gen_random_uuid();
alter table "public"."seed_preparation_transport_legs" alter column "order_index" set default 0;
alter table "public"."seed_preparation_transport_legs" alter column "transport_kind" set default 'other'::text;
alter table "public"."seed_preparation_transport_legs" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_preparation_transport_legs" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seed_status_flow" alter column "id" set default gen_random_uuid();
alter table "public"."seed_status_flow" alter column "action_key" set default 'manual'::text;
alter table "public"."seed_status_flow" alter column "requires_scheduled_date" set default false;
alter table "public"."seed_status_flow" alter column "clear_scheduled_date" set default false;
alter table "public"."seed_status_flow" alter column "create_page_on_transition" set default false;
alter table "public"."seed_status_flow" alter column "enabled" set default true;
alter table "public"."seed_status_flow" alter column "sort_order" set default 100;
alter table "public"."seed_status_flow" alter column "metadata" set default '{}'::jsonb;
alter table "public"."seed_status_flow" alter column "created_at" set default now();
alter table "public"."seed_status_flow" alter column "updated_at" set default now();
alter table "public"."seed_watering_confirmations" alter column "id" set default gen_random_uuid();
alter table "public"."seed_watering_confirmations" alter column "watered_at" set default timezone('utc'::text, now());
alter table "public"."seed_watering_confirmations" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."seed_watering_confirmations" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."seeds" alter column "id" set default gen_random_uuid();
alter table "public"."seeds" alter column "tags" set default '{}'::text[];
alter table "public"."seeds" alter column "status" set default 'seed'::text;
alter table "public"."seeds" alter column "created_at" set default now();
alter table "public"."settings" alter column "id" set default 1;
alter table "public"."settings" alter column "welcome_text" set default 'Bienvenidos al jardín de Sergio y Carmen.'::text;
alter table "public"."settings" alter column "narrator_tone" set default 'cuento'::text;
alter table "public"."settings" alter column "season_mode" set default 'auto'::text;
alter table "public"."sticker_pack_items" alter column "id" set default gen_random_uuid();
alter table "public"."sticker_pack_items" alter column "sort_order" set default 100;
alter table "public"."sticker_pack_items" alter column "enabled" set default true;
alter table "public"."sticker_pack_items" alter column "created_at" set default now();
alter table "public"."sticker_pack_items" alter column "updated_at" set default now();
alter table "public"."sticker_packs" alter column "id" set default gen_random_uuid();
alter table "public"."sticker_packs" alter column "is_active" set default true;
alter table "public"."sticker_packs" alter column "created_at" set default now();
alter table "public"."sticker_packs" alter column "updated_at" set default now();
alter table "public"."sticker_unlock_rules" alter column "id" set default gen_random_uuid();
alter table "public"."sticker_unlock_rules" alter column "rule_type" set default 'always'::text;
alter table "public"."sticker_unlock_rules" alter column "enabled" set default true;
alter table "public"."sticker_unlock_rules" alter column "created_at" set default now();
alter table "public"."sticker_unlock_rules" alter column "updated_at" set default now();
alter table "public"."stickers" alter column "id" set default gen_random_uuid();
alter table "public"."stickers" alter column "is_active" set default true;
alter table "public"."stickers" alter column "created_at" set default now();
alter table "public"."stickers" alter column "updated_at" set default now();
alter table "public"."template_objects" alter column "id" set default gen_random_uuid();
alter table "public"."template_objects" alter column "object_order" set default 100;
alter table "public"."template_objects" alter column "enabled" set default true;
alter table "public"."template_objects" alter column "created_at" set default now();
alter table "public"."template_objects" alter column "updated_at" set default now();
alter table "public"."time_capsule_draft_revisions" alter column "id" set default gen_random_uuid();
alter table "public"."time_capsule_draft_revisions" alter column "snapshot" set default '{}'::jsonb;
alter table "public"."time_capsule_draft_revisions" alter column "summary" set default '{}'::jsonb;
alter table "public"."time_capsule_draft_revisions" alter column "created_at" set default now();
alter table "public"."time_capsule_drafts" alter column "id" set default gen_random_uuid();
alter table "public"."time_capsule_drafts" alter column "title" set default ''::text;
alter table "public"."time_capsule_drafts" alter column "window_code" set default '1y'::text;
alter table "public"."time_capsule_drafts" alter column "content_blocks" set default '[]'::jsonb;
alter table "public"."time_capsule_drafts" alter column "created_at" set default now();
alter table "public"."time_capsule_drafts" alter column "updated_at" set default now();
alter table "public"."time_capsules" alter column "id" set default gen_random_uuid();
alter table "public"."time_capsules" alter column "title" set default 'Capsula del tiempo'::text;
alter table "public"."time_capsules" alter column "sealed_at" set default now();
alter table "public"."time_capsules" alter column "status" set default 'sealed'::text;
alter table "public"."time_capsules" alter column "window_code" set default '1y'::text;
alter table "public"."time_capsules" alter column "content_blocks" set default '[]'::jsonb;
alter table "public"."time_capsules" alter column "created_at" set default now();
alter table "public"."timeline_milestone_rules" alter column "id" set default gen_random_uuid();
alter table "public"."timeline_milestone_rules" alter column "enabled" set default true;
alter table "public"."timeline_milestone_rules" alter column "created_at" set default now();
alter table "public"."timeline_milestone_rules" alter column "updated_at" set default now();
alter table "public"."timeline_view_config" alter column "default_view" set default 'path'::text;
alter table "public"."timeline_view_config" alter column "milestone_mode" set default 'every'::text;
alter table "public"."timeline_view_config" alter column "milestone_every" set default 10;
alter table "public"."timeline_view_config" alter column "milestone_choices" set default ARRAY[5, 10, 15];
alter table "public"."timeline_view_config" alter column "milestone_message" set default 'Habeis llegado a un numero redondo. Este tramo del sendero ya tiene historia propia.'::text;
alter table "public"."timeline_view_config" alter column "season_hemisphere" set default 'north'::text;
alter table "public"."timeline_view_config" alter column "spring_start_mmdd" set default 321;
alter table "public"."timeline_view_config" alter column "summer_start_mmdd" set default 621;
alter table "public"."timeline_view_config" alter column "autumn_start_mmdd" set default 923;
alter table "public"."timeline_view_config" alter column "winter_start_mmdd" set default 1221;
alter table "public"."timeline_view_config" alter column "is_active" set default true;
alter table "public"."timeline_view_config" alter column "created_at" set default now();
alter table "public"."timeline_view_config" alter column "updated_at" set default now();
alter table "public"."ui_module_items" alter column "id" set default gen_random_uuid();
alter table "public"."ui_module_items" alter column "sort_order" set default 100;
alter table "public"."ui_module_items" alter column "is_active" set default true;
alter table "public"."ui_module_items" alter column "metadata" set default '{}'::jsonb;
alter table "public"."ui_module_items" alter column "created_at" set default now();
alter table "public"."ui_module_items" alter column "updated_at" set default now();
alter table "public"."ui_modules" alter column "is_active" set default true;
alter table "public"."ui_modules" alter column "created_at" set default now();
alter table "public"."ui_modules" alter column "updated_at" set default now();
alter table "public"."ui_strings" alter column "id" set default gen_random_uuid();
alter table "public"."ui_strings" alter column "locale" set default 'es'::text;
alter table "public"."ui_strings" alter column "metadata" set default '{}'::jsonb;
alter table "public"."ui_strings" alter column "is_active" set default true;
alter table "public"."ui_strings" alter column "created_at" set default now();
alter table "public"."ui_strings" alter column "updated_at" set default now();
alter table "public"."user_notices" alter column "id" set default gen_random_uuid();
alter table "public"."user_notices" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."user_notices" alter column "metadata" set default '{}'::jsonb;
alter table "public"."year_cycle_states" alter column "acknowledged_user_ids" set default '{}'::uuid[];
alter table "public"."year_cycle_states" alter column "created_at" set default timezone('utc'::text, now());
alter table "public"."year_cycle_states" alter column "updated_at" set default timezone('utc'::text, now());
alter table "public"."year_notes" alter column "note" set default ''::text;
alter table "public"."year_notes" alter column "updated_at" set default now();
alter table "public"."year_notes" alter column "highlight_page_ids" set default '[]'::jsonb;

-- Views
-- -----
create or replace view "public"."annual_tree_year_metrics" as
 SELECT EXTRACT(year FROM date)::integer AS year,
    count(*)::integer AS total_events,
    count(DISTINCT date)::integer AS active_days,
    count(*) FILTER (WHERE planned_from_seed_id IS NOT NULL)::integer AS bloomed_events,
    count(*) FILTER (WHERE mood_state = 'shiny'::text)::integer AS shiny_events,
    count(*) FILTER (WHERE COALESCE(is_favorite, false))::integer AS favorite_events,
    COALESCE(avg(rating), 0::numeric)::numeric(6,3) AS avg_rating
   FROM pages p
  WHERE date IS NOT NULL
  GROUP BY (EXTRACT(year FROM date)::integer);;

-- Constraints
-- -----------
alter table "public"."achievement_rules" add constraint "achievement_rules_pkey" PRIMARY KEY (id);
alter table "public"."achievement_rules" add constraint "achievement_rules_kind_threshold_key" UNIQUE (kind, threshold);
alter table "public"."achievement_rules" add constraint "achievement_rules_kind_check" CHECK (kind = ANY (ARRAY['pages_completed'::text, 'seeds_bloomed'::text]));
alter table "public"."achievement_rules" add constraint "achievement_rules_tier_check" CHECK (tier = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'diamond'::text]));
alter table "public"."achievements_unlocked" add constraint "achievements_unlocked_pkey" PRIMARY KEY (id);
alter table "public"."achievements_unlocked" add constraint "achievements_unlocked_rule_id_key" UNIQUE (rule_id);
alter table "public"."annual_tree_check_ins" add constraint "annual_tree_check_ins_pkey" PRIMARY KEY (id);
alter table "public"."annual_tree_check_ins" add constraint "annual_tree_check_ins_milestone_year_check" CHECK (milestone_year = ANY (ARRAY[1, 3, 5, 7, 10]));
alter table "public"."annual_tree_check_ins" add constraint "annual_tree_check_ins_status_check" CHECK (status = ANY (ARRAY['growing'::text, 'stable'::text, 'delicate'::text, 'lost'::text, 'dead'::text, 'replanted'::text]));
alter table "public"."annual_tree_growth_profiles" add constraint "annual_tree_growth_profiles_pkey" PRIMARY KEY (key);
alter table "public"."annual_tree_rituals" add constraint "annual_tree_rituals_pkey" PRIMARY KEY (id);
alter table "public"."annual_tree_rituals" add constraint "annual_tree_rituals_garden_id_year_key" UNIQUE (garden_id, year);
alter table "public"."annual_tree_rituals" add constraint "annual_tree_rituals_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'planted'::text, 'confirmed'::text]));
alter table "public"."annual_tree_snapshots" add constraint "annual_tree_snapshots_pkey" PRIMARY KEY (year);
alter table "public"."annual_tree_snapshots" add constraint "annual_tree_snapshots_stage_check" CHECK (stage >= 0 AND stage <= 100);
alter table "public"."bond_members" add constraint "bond_members_pkey" PRIMARY KEY (id);
alter table "public"."bond_members" add constraint "bond_members_bond_id_user_id_key" UNIQUE (bond_id, user_id);
alter table "public"."bond_members" add constraint "bond_members_member_role_check" CHECK (member_role = ANY (ARRAY['owner'::text, 'member'::text]));
alter table "public"."bonds" add constraint "bonds_pkey" PRIMARY KEY (id);
alter table "public"."bonds" add constraint "bonds_system_key_key" UNIQUE (system_key);
alter table "public"."bonds" add constraint "bonds_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text, 'archived'::text]));
alter table "public"."bonds" add constraint "bonds_type_check" CHECK (type = ANY (ARRAY['pareja'::text, 'amistad'::text, 'familia'::text, 'personal'::text]));
alter table "public"."calendar_rules" add constraint "calendar_rules_pkey" PRIMARY KEY (key);
alter table "public"."calendar_rules" add constraint "calendar_rules_days_ahead_limit_check" CHECK (days_ahead_limit >= 0 AND days_ahead_limit <= 3650);
alter table "public"."calendar_rules" add constraint "calendar_rules_max_seeds_per_day_check" CHECK (max_seeds_per_day >= 0 AND max_seeds_per_day <= 1000);
alter table "public"."canvas_templates" add constraint "canvas_templates_pkey" PRIMARY KEY (id);
alter table "public"."canvas_templates" add constraint "canvas_templates_key_key" UNIQUE (key);
alter table "public"."catalog_items" add constraint "catalog_items_pkey" PRIMARY KEY (id);
alter table "public"."catalog_items" add constraint "catalog_items_catalog_key_code_key" UNIQUE (catalog_key, code);
alter table "public"."catalogs" add constraint "catalogs_pkey" PRIMARY KEY (key);
alter table "public"."flower_birth_ritual_ratings" add constraint "flower_birth_ritual_ratings_pkey" PRIMARY KEY (page_id, user_id);
alter table "public"."flower_birth_ritual_ratings" add constraint "flower_birth_ritual_ratings_rating_check" CHECK (rating >= 1 AND rating <= 5);
alter table "public"."flower_birth_rituals" add constraint "flower_birth_rituals_pkey" PRIMARY KEY (page_id);
alter table "public"."flower_page_revisions" add constraint "flower_page_revisions_pkey" PRIMARY KEY (id);
alter table "public"."forest_assets" add constraint "forest_assets_pkey" PRIMARY KEY (id);
alter table "public"."forest_assets" add constraint "forest_assets_theme_key_asset_key_key" UNIQUE (theme_key, asset_key);
alter table "public"."forest_assets" add constraint "forest_assets_asset_type_check" CHECK (asset_type = ANY (ARRAY['token'::text, 'emoji'::text, 'image_url'::text, 'color'::text]));
alter table "public"."forest_narrative_templates" add constraint "forest_narrative_templates_pkey" PRIMARY KEY (id);
alter table "public"."forest_narrative_templates" add constraint "forest_narrative_templates_theme_key_template_key_key" UNIQUE (theme_key, template_key);
alter table "public"."forest_theme" add constraint "forest_theme_pkey" PRIMARY KEY (key);
alter table "public"."garden_audio_session_participants" add constraint "garden_audio_session_participants_pkey" PRIMARY KEY (session_id, user_id);
alter table "public"."garden_audio_session_participants" add constraint "garden_audio_session_participants_role_check" CHECK (role = ANY (ARRAY['host'::text, 'guest'::text]));
alter table "public"."garden_audio_sessions" add constraint "garden_audio_sessions_pkey" PRIMARY KEY (id);
alter table "public"."garden_audio_sessions" add constraint "garden_audio_sessions_status_check" CHECK (status = ANY (ARRAY['invited'::text, 'active'::text, 'ended'::text, 'missed'::text, 'cancelled'::text, 'failed'::text]));
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_pkey" PRIMARY KEY (id);
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_attachment_kind_check" CHECK (attachment_kind = ANY (ARRAY['image'::text, 'audio'::text, 'video'::text, 'file'::text]));
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_duration_ms_check" CHECK (duration_ms IS NULL OR duration_ms >= 0);
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_size_bytes_check" CHECK (size_bytes >= 0);
alter table "public"."garden_chat_message_reactions" add constraint "garden_chat_message_reactions_pkey" PRIMARY KEY (message_id, user_id, emoji);
alter table "public"."garden_chat_message_reactions" add constraint "garden_chat_message_reactions_emoji_check" CHECK (char_length(TRIM(BOTH FROM emoji)) >= 1 AND char_length(TRIM(BOTH FROM emoji)) <= 24);
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_pkey" PRIMARY KEY (id);
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_room_id_author_user_id_client_message__key" UNIQUE (room_id, author_user_id, client_message_id);
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_kind_check" CHECK (kind = ANY (ARRAY['text'::text, 'voice_note'::text, 'attachment'::text, 'reference'::text, 'system'::text, 'audio_session_event'::text]));
alter table "public"."garden_chat_read_states" add constraint "garden_chat_read_states_pkey" PRIMARY KEY (room_id, user_id);
alter table "public"."garden_chat_rooms" add constraint "garden_chat_rooms_pkey" PRIMARY KEY (id);
alter table "public"."garden_chat_rooms" add constraint "garden_chat_rooms_garden_id_slug_key" UNIQUE (garden_id, slug);
alter table "public"."garden_chat_rooms" add constraint "garden_chat_rooms_room_kind_check" CHECK (room_kind = ANY (ARRAY['main'::text, 'topic'::text, 'system'::text]));
alter table "public"."garden_chat_rooms" add constraint "garden_chat_rooms_slug_check" CHECK (char_length(TRIM(BOTH FROM slug)) > 0);
alter table "public"."garden_invitations" add constraint "garden_invitations_pkey" PRIMARY KEY (id);
alter table "public"."garden_invitations" add constraint "garden_invitations_bond_type_check" CHECK (bond_type = ANY (ARRAY['pareja'::text, 'amistad'::text, 'familia'::text, 'personal'::text]));
alter table "public"."garden_invitations" add constraint "garden_invitations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'revoked'::text]));
alter table "public"."garden_invitations" add constraint "garden_invitations_target_check" CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL AND length(TRIM(BOTH FROM invited_email)) > 0);
alter table "public"."garden_members" add constraint "garden_members_pkey" PRIMARY KEY (id);
alter table "public"."garden_members" add constraint "garden_members_garden_id_user_id_key" UNIQUE (garden_id, user_id);
alter table "public"."garden_members" add constraint "garden_members_member_role_check" CHECK (member_role = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text]));
alter table "public"."garden_plan_types" add constraint "garden_plan_types_pkey" PRIMARY KEY (id);
alter table "public"."garden_plan_types" add constraint "garden_plan_types_garden_id_code_key" UNIQUE (garden_id, code);
alter table "public"."garden_plan_types" add constraint "garden_plan_types_flower_family_check" CHECK (flower_family = ANY (ARRAY['agua'::text, 'fuego'::text, 'tierra'::text, 'aire'::text, 'luz'::text, 'luna'::text, 'estrella'::text]));
alter table "public"."garden_plan_types" add constraint "garden_plan_types_suggested_element_check" CHECK (suggested_element = ANY (ARRAY['fire'::text, 'water'::text, 'air'::text, 'earth'::text, 'aether'::text]));
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_pkey" PRIMARY KEY (garden_id, year);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_active_days_check" CHECK (active_days >= 0);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_bloomed_events_check" CHECK (bloomed_events >= 0);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_favorite_events_check" CHECK (favorite_events >= 0);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_milestones_unlocked_check" CHECK (milestones_unlocked >= 0);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_phase_check" CHECK (phase = ANY (ARRAY['seed'::text, 'germination'::text, 'sprout'::text, 'sapling'::text, 'young'::text, 'mature'::text, 'blooming'::text, 'legacy'::text]));
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_shiny_events_check" CHECK (shiny_events >= 0);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_stage_check" CHECK (stage >= 0 AND stage <= 100);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_total_events_check" CHECK (total_events >= 0);
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_year_check" CHECK (year >= 1900 AND year <= 2200);
alter table "public"."gardens" add constraint "gardens_pkey" PRIMARY KEY (id);
alter table "public"."gardens" add constraint "gardens_system_key_key" UNIQUE (system_key);
alter table "public"."gardens" add constraint "gardens_status_check" CHECK (status = ANY (ARRAY['active'::text, 'archived'::text]));
alter table "public"."map_places" add constraint "map_places_pkey" PRIMARY KEY (id);
alter table "public"."map_places" add constraint "map_places_kind_check" CHECK (NULLIF(btrim(kind), ''::text) IS NOT NULL);
alter table "public"."map_places" add constraint "map_places_lat_check" CHECK (lat >= '-90'::integer::double precision AND lat <= 90::double precision);
alter table "public"."map_places" add constraint "map_places_lng_check" CHECK (lng >= '-180'::integer::double precision AND lng <= 180::double precision);
alter table "public"."map_places" add constraint "map_places_rating_check" CHECK (rating >= 0::numeric AND rating <= 5::numeric);
alter table "public"."map_places" add constraint "map_places_state_check" CHECK (NULLIF(btrim(state), ''::text) IS NOT NULL);
alter table "public"."map_routes" add constraint "map_routes_pkey" PRIMARY KEY (id);
alter table "public"."map_routes" add constraint "map_routes_destination_lat_check" CHECK (destination_lat >= '-90'::integer::double precision AND destination_lat <= 90::double precision);
alter table "public"."map_routes" add constraint "map_routes_destination_lng_check" CHECK (destination_lng >= '-180'::integer::double precision AND destination_lng <= 180::double precision);
alter table "public"."map_routes" add constraint "map_routes_distance_meters_check" CHECK (distance_meters >= 0::numeric);
alter table "public"."map_routes" add constraint "map_routes_duration_seconds_check" CHECK (duration_seconds >= 0);
alter table "public"."map_routes" add constraint "map_routes_geometry_check" CHECK (jsonb_typeof(geometry) = 'object'::text);
alter table "public"."map_routes" add constraint "map_routes_kind_check" CHECK (kind = ANY (ARRAY['walk'::text, 'drive'::text, 'date_route'::text, 'trip'::text, 'ritual'::text, 'custom'::text]));
alter table "public"."map_routes" add constraint "map_routes_origin_lat_check" CHECK (origin_lat >= '-90'::integer::double precision AND origin_lat <= 90::double precision);
alter table "public"."map_routes" add constraint "map_routes_origin_lng_check" CHECK (origin_lng >= '-180'::integer::double precision AND origin_lng <= 180::double precision);
alter table "public"."map_routes" add constraint "map_routes_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'saved'::text, 'archived'::text]));
alter table "public"."map_routes" add constraint "map_routes_travel_mode_check" CHECK (travel_mode = ANY (ARRAY['walking'::text, 'driving'::text, 'cycling'::text, 'transit'::text, 'mixed'::text]));
alter table "public"."map_routes" add constraint "map_routes_waypoints_check" CHECK (jsonb_typeof(waypoints) = 'array'::text);
alter table "public"."map_zones" add constraint "map_zones_pkey" PRIMARY KEY (id);
alter table "public"."map_zones" add constraint "map_zones_centroid_lat_check" CHECK (centroid_lat >= '-90'::integer::double precision AND centroid_lat <= 90::double precision);
alter table "public"."map_zones" add constraint "map_zones_centroid_lng_check" CHECK (centroid_lng >= '-180'::integer::double precision AND centroid_lng <= 180::double precision);
alter table "public"."map_zones" add constraint "map_zones_geojson_check" CHECK (jsonb_typeof(geojson) = 'object'::text);
alter table "public"."map_zones" add constraint "map_zones_kind_check" CHECK (kind = ANY (ARRAY['symbolic'::text, 'favorite_area'::text, 'memory_area'::text, 'meeting_area'::text, 'avoid_area'::text, 'custom'::text]));
alter table "public"."map_zones" add constraint "map_zones_status_check" CHECK (status = ANY (ARRAY['active'::text, 'archived'::text]));
alter table "public"."memory_reflections" add constraint "memory_reflections_pkey" PRIMARY KEY (id);
alter table "public"."memory_reflections" add constraint "memory_reflections_page_id_user_id_key" UNIQUE (page_id, user_id);
alter table "public"."page_visual_states" add constraint "page_visual_states_pkey" PRIMARY KEY (page_id);
alter table "public"."pages" add constraint "pages_pkey" PRIMARY KEY (id);
alter table "public"."pages" add constraint "pages_care_score_range" CHECK (care_score IS NULL OR care_score >= 0 AND care_score <= 100);
alter table "public"."pages" add constraint "pages_element_check" CHECK (element = ANY (ARRAY['fire'::text, 'water'::text, 'air'::text, 'earth'::text, 'aether'::text]));
alter table "public"."pages" add constraint "pages_location_lat_range" CHECK (location_lat IS NULL OR location_lat >= '-90'::integer::double precision AND location_lat <= 90::double precision);
alter table "public"."pages" add constraint "pages_location_lng_range" CHECK (location_lng IS NULL OR location_lng >= '-180'::integer::double precision AND location_lng <= 180::double precision);
alter table "public"."pages" add constraint "pages_mood_state_check" CHECK (mood_state = ANY (ARRAY['wilted'::text, 'healthy'::text, 'shiny'::text]));
alter table "public"."pages" add constraint "pages_rating_check" CHECK (rating >= 1 AND rating <= 5);
alter table "public"."pdf_layout_presets" add constraint "pdf_layout_presets_pkey" PRIMARY KEY (id);
alter table "public"."pdf_layout_presets" add constraint "pdf_layout_presets_theme_key_preset_key_key" UNIQUE (theme_key, preset_key);
alter table "public"."pdf_text_templates" add constraint "pdf_text_templates_pkey" PRIMARY KEY (id);
alter table "public"."pdf_text_templates" add constraint "pdf_text_templates_theme_key_template_key_key" UNIQUE (theme_key, template_key);
alter table "public"."pdf_theme_assets" add constraint "pdf_theme_assets_pkey" PRIMARY KEY (id);
alter table "public"."pdf_theme_assets" add constraint "pdf_theme_assets_theme_key_asset_key_key" UNIQUE (theme_key, asset_key);
alter table "public"."pdf_theme_assets" add constraint "pdf_theme_assets_asset_type_check" CHECK (asset_type = ANY (ARRAY['token'::text, 'color'::text, 'image_url'::text, 'font'::text, 'numeric'::text]));
alter table "public"."pdf_themes" add constraint "pdf_themes_pkey" PRIMARY KEY (key);
alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table "public"."profiles" add constraint "profiles_invite_code_format_check" CHECK (invite_code ~ '^[A-Z0-9]{8}$'::text);
alter table "public"."profiles" add constraint "profiles_role_check" CHECK (role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]));
alter table "public"."progression_condition_unlocks" add constraint "progression_condition_unlocks_pkey" PRIMARY KEY (id);
alter table "public"."progression_condition_unlocks" add constraint "progression_condition_unlocks_garden_id_condition_id_key" UNIQUE (garden_id, condition_id);
alter table "public"."progression_conditions" add constraint "progression_conditions_pkey" PRIMARY KEY (id);
alter table "public"."progression_conditions" add constraint "progression_conditions_code_key" UNIQUE (code);
alter table "public"."progression_graph_state" add constraint "progression_graph_state_pkey" PRIMARY KEY (key);
alter table "public"."progression_reward_unlocks" add constraint "progression_reward_unlocks_pkey" PRIMARY KEY (id);
alter table "public"."progression_reward_unlocks" add constraint "progression_reward_unlocks_garden_id_reward_id_key" UNIQUE (garden_id, reward_id);
alter table "public"."progression_rewards" add constraint "progression_rewards_pkey" PRIMARY KEY (id);
alter table "public"."progression_rewards" add constraint "progression_rewards_code_key" UNIQUE (code);
alter table "public"."progression_rewards" add constraint "progression_rewards_kind_check" CHECK (kind = ANY (ARRAY['message'::text, 'gift'::text, 'sticker_pack'::text, 'canvas_tool'::text, 'canvas_template'::text, 'canvas_effect'::text, 'page_frame'::text, 'page_background'::text, 'year_chapter'::text, 'pdf_detail'::text]));
alter table "public"."progression_tree_nodes" add constraint "progression_tree_nodes_pkey" PRIMARY KEY (id);
alter table "public"."progression_tree_nodes" add constraint "progression_tree_nodes_code_key" UNIQUE (code);
alter table "public"."progression_tree_nodes" add constraint "progression_tree_nodes_leaf_variant_check" CHECK (leaf_variant >= 0 AND leaf_variant <= 99);
alter table "public"."progression_tree_nodes" add constraint "progression_tree_nodes_rank_check" CHECK (rank = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'diamond'::text, 'mythic'::text, 'celestial'::text, 'eternal'::text]));
alter table "public"."progression_tree_nodes" add constraint "progression_tree_nodes_rarity_check" CHECK (rarity = ANY (ARRAY['common'::text, 'uncommon'::text, 'rare'::text, 'epic'::text, 'legendary'::text, 'mythic'::text]));
alter table "public"."progression_tree_unlocks" add constraint "progression_tree_unlocks_pkey" PRIMARY KEY (id);
alter table "public"."progression_tree_unlocks" add constraint "progression_tree_unlocks_garden_id_tree_id_key" UNIQUE (garden_id, tree_id);
alter table "public"."rewards" add constraint "rewards_pkey" PRIMARY KEY (id);
alter table "public"."rewards" add constraint "rewards_kind_check" CHECK (kind = ANY (ARRAY['message'::text, 'gift'::text, 'sticker_pack'::text]));
alter table "public"."season_notes" add constraint "season_notes_pkey" PRIMARY KEY (id);
alter table "public"."season_notes" add constraint "season_notes_season_check" CHECK (season = ANY (ARRAY['spring'::text, 'summer'::text, 'autumn'::text, 'winter'::text]));
alter table "public"."seed_defaults" add constraint "seed_defaults_pkey" PRIMARY KEY (key);
alter table "public"."seed_event_reminder_deliveries" add constraint "seed_event_reminder_deliveries_pkey" PRIMARY KEY (id);
alter table "public"."seed_event_reminder_deliveries" add constraint "seed_event_reminder_deliveries_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'skipped'::text, 'failed'::text]));
alter table "public"."seed_preparation_attachments" add constraint "seed_preparation_attachments_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_attachments" add constraint "seed_preparation_attachments_attachment_kind_check" CHECK (attachment_kind = ANY (ARRAY['passport'::text, 'dni'::text, 'ticket'::text, 'reservation'::text, 'insurance'::text, 'medical'::text, 'other'::text]));
alter table "public"."seed_preparation_attachments" add constraint "seed_preparation_attachments_linked_kind_check" CHECK (linked_kind = ANY (ARRAY['seed'::text, 'transport_leg'::text, 'stay'::text, 'reservation'::text, 'generic_document'::text]));
alter table "public"."seed_preparation_checklist_items" add constraint "seed_preparation_checklist_items_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_checklist_items" add constraint "seed_preparation_checklist_items_category_check" CHECK (category = ANY (ARRAY['documents'::text, 'health'::text, 'clothes'::text, 'tech'::text, 'money'::text, 'insurance'::text, 'misc'::text]));
alter table "public"."seed_preparation_checklist_items" add constraint "seed_preparation_checklist_items_owner_check" CHECK (owner = ANY (ARRAY['me'::text, 'partner'::text, 'shared'::text]));
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_duration_minutes_check" CHECK (duration_minutes IS NULL OR duration_minutes >= 0);
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_status_check" CHECK (status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'flexible'::text, 'done'::text, 'dropped'::text]));
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_planning_state_check" CHECK (planning_state = ANY (ARRAY['idea'::text, 'booked'::text, 'visited'::text, 'skipped'::text]));
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_priority_check" CHECK (priority = ANY (ARRAY['must'::text, 'would_like'::text, 'if_time'::text]));
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_seed_id_key" UNIQUE (seed_id);
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_collaboration_mode_check" CHECK (collaboration_mode = ANY (ARRAY['solo_for_now'::text, 'shared'::text]));
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_date_mode_check" CHECK (date_mode = ANY (ARRAY['single_day'::text, 'date_range'::text, 'flexible'::text]));
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_destination_kind_check" CHECK (destination_kind IS NULL OR (destination_kind = ANY (ARRAY['city'::text, 'beach'::text, 'mountain'::text, 'international'::text, 'road_trip'::text, 'other'::text])));
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_preparation_progress_check" CHECK (preparation_progress >= 0 AND preparation_progress <= 100);
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_reservation_kind_check" CHECK (reservation_kind = ANY (ARRAY['ticket'::text, 'booking'::text, 'insurance'::text, 'restaurant'::text, 'activity'::text, 'other'::text]));
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text]));
alter table "public"."seed_preparation_stays" add constraint "seed_preparation_stays_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_stays" add constraint "seed_preparation_stays_stay_kind_check" CHECK (stay_kind = ANY (ARRAY['hotel'::text, 'hostel'::text, 'apartment'::text, 'house'::text, 'camping'::text, 'other'::text]));
alter table "public"."seed_preparation_stops" add constraint "seed_preparation_stops_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_pkey" PRIMARY KEY (id);
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_transport_kind_check" CHECK (transport_kind = ANY (ARRAY['walking'::text, 'car'::text, 'train'::text, 'plane'::text, 'bus'::text, 'boat'::text, 'metro'::text, 'mixed'::text, 'other'::text]));
alter table "public"."seed_status_flow" add constraint "seed_status_flow_pkey" PRIMARY KEY (id);
alter table "public"."seed_status_flow" add constraint "seed_status_flow_from_status_to_status_action_key_key" UNIQUE (from_status, to_status, action_key);
alter table "public"."seed_watering_confirmations" add constraint "seed_watering_confirmations_pkey" PRIMARY KEY (id);
alter table "public"."seed_watering_confirmations" add constraint "seed_watering_confirmations_seed_id_user_id_key" UNIQUE (seed_id, user_id);
alter table "public"."seeds" add constraint "seeds_pkey" PRIMARY KEY (id);
alter table "public"."seeds" add constraint "seeds_element_check" CHECK (element = ANY (ARRAY['fire'::text, 'water'::text, 'air'::text, 'earth'::text, 'aether'::text]));
alter table "public"."seeds" add constraint "seeds_status_check" CHECK (status = ANY (ARRAY['planning_draft'::text, 'seed'::text, 'scheduled'::text, 'bloomed'::text]));
alter table "public"."settings" add constraint "settings_pkey" PRIMARY KEY (id);
alter table "public"."settings" add constraint "settings_season_mode_check" CHECK (season_mode = ANY (ARRAY['auto'::text, 'manual'::text]));
alter table "public"."sticker_pack_items" add constraint "sticker_pack_items_pkey" PRIMARY KEY (id);
alter table "public"."sticker_pack_items" add constraint "sticker_pack_items_pack_id_sticker_id_key" UNIQUE (pack_id, sticker_id);
alter table "public"."sticker_packs" add constraint "sticker_packs_pkey" PRIMARY KEY (id);
alter table "public"."sticker_packs" add constraint "sticker_packs_key_key" UNIQUE (key);
alter table "public"."sticker_unlock_rules" add constraint "sticker_unlock_rules_pkey" PRIMARY KEY (id);
alter table "public"."sticker_unlock_rules" add constraint "sticker_unlock_rules_rule_type_check" CHECK (rule_type = ANY (ARRAY['always'::text, 'achievement_rule'::text, 'achievement_tier'::text, 'manual'::text]));
alter table "public"."stickers" add constraint "stickers_pkey" PRIMARY KEY (id);
alter table "public"."stickers" add constraint "stickers_key_key" UNIQUE (key);
alter table "public"."template_objects" add constraint "template_objects_pkey" PRIMARY KEY (id);
alter table "public"."time_capsule_draft_revisions" add constraint "time_capsule_draft_revisions_pkey" PRIMARY KEY (id);
alter table "public"."time_capsule_draft_revisions" add constraint "time_capsule_draft_revisions_capsule_year_check" CHECK (capsule_year >= 2000);
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_pkey" PRIMARY KEY (id);
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_garden_id_capsule_year_key" UNIQUE (garden_id, capsule_year);
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_capsule_year_check" CHECK (capsule_year >= 2000);
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_window_code_check" CHECK (window_code = ANY (ARRAY['1y'::text, '3y'::text, '5y'::text, '10y'::text, 'custom'::text]));
alter table "public"."time_capsules" add constraint "time_capsules_pkey" PRIMARY KEY (id);
alter table "public"."time_capsules" add constraint "time_capsules_status_check" CHECK (status = ANY (ARRAY['sealed'::text, 'ready'::text, 'opened'::text]));
alter table "public"."time_capsules" add constraint "time_capsules_window_code_check" CHECK (window_code = ANY (ARRAY['1y'::text, '3y'::text, '5y'::text, '10y'::text, 'custom'::text]));
alter table "public"."timeline_milestone_rules" add constraint "timeline_milestone_rules_pkey" PRIMARY KEY (id);
alter table "public"."timeline_milestone_rules" add constraint "timeline_milestone_rules_milestone_number_key" UNIQUE (milestone_number);
alter table "public"."timeline_milestone_rules" add constraint "timeline_milestone_rules_milestone_number_check" CHECK (milestone_number > 0 AND milestone_number <= 5000);
alter table "public"."timeline_view_config" add constraint "timeline_view_config_pkey" PRIMARY KEY (key);
alter table "public"."timeline_view_config" add constraint "timeline_view_config_default_view_check" CHECK (default_view = ANY (ARRAY['path'::text, 'album'::text]));
alter table "public"."timeline_view_config" add constraint "timeline_view_config_milestone_every_check" CHECK (milestone_every > 0 AND milestone_every <= 500);
alter table "public"."timeline_view_config" add constraint "timeline_view_config_milestone_mode_check" CHECK (milestone_mode = ANY (ARRAY['every'::text, 'rules'::text, 'hybrid'::text]));
alter table "public"."timeline_view_config" add constraint "timeline_view_config_season_hemisphere_check" CHECK (season_hemisphere = ANY (ARRAY['north'::text, 'south'::text]));
alter table "public"."ui_module_items" add constraint "ui_module_items_pkey" PRIMARY KEY (id);
alter table "public"."ui_module_items" add constraint "ui_module_items_module_key_item_key_key" UNIQUE (module_key, item_key);
alter table "public"."ui_modules" add constraint "ui_modules_pkey" PRIMARY KEY (key);
alter table "public"."ui_strings" add constraint "ui_strings_pkey" PRIMARY KEY (id);
alter table "public"."ui_strings" add constraint "ui_strings_namespace_key_locale_key" UNIQUE (namespace, key, locale);
alter table "public"."user_notices" add constraint "user_notices_pkey" PRIMARY KEY (id);
alter table "public"."user_notices" add constraint "user_notices_kind_check" CHECK (kind = 'shared_garden_archived'::text);
alter table "public"."year_cycle_states" add constraint "year_cycle_states_pkey" PRIMARY KEY (garden_id, year);
alter table "public"."year_cycle_states" add constraint "year_cycle_states_year_check" CHECK (year >= 2000);
alter table "public"."year_notes" add constraint "year_notes_pkey" PRIMARY KEY (year);
alter table "public"."year_notes" add constraint "year_notes_highlight_page_ids_is_array" CHECK (jsonb_typeof(highlight_page_ids) = 'array'::text);
alter table "public"."year_notes" add constraint "year_notes_highlight_page_ids_limit" CHECK (jsonb_array_length(highlight_page_ids) <= 3);

-- Foreign keys
-- ------------
alter table "public"."achievement_rules" add constraint "achievement_rules_default_reward_id_fkey" FOREIGN KEY (default_reward_id) REFERENCES rewards(id);
alter table "public"."achievements_unlocked" add constraint "achievements_unlocked_claimed_by_fkey" FOREIGN KEY (claimed_by) REFERENCES profiles(id);
alter table "public"."achievements_unlocked" add constraint "achievements_unlocked_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."achievements_unlocked" add constraint "achievements_unlocked_reward_id_fkey" FOREIGN KEY (reward_id) REFERENCES rewards(id);
alter table "public"."achievements_unlocked" add constraint "achievements_unlocked_rule_id_fkey" FOREIGN KEY (rule_id) REFERENCES achievement_rules(id) ON DELETE CASCADE;
alter table "public"."annual_tree_check_ins" add constraint "annual_tree_check_ins_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table "public"."annual_tree_check_ins" add constraint "annual_tree_check_ins_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."annual_tree_check_ins" add constraint "annual_tree_check_ins_ritual_id_fkey" FOREIGN KEY (ritual_id) REFERENCES annual_tree_rituals(id) ON DELETE CASCADE;
alter table "public"."annual_tree_rituals" add constraint "annual_tree_rituals_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."annual_tree_rituals" add constraint "annual_tree_rituals_map_place_id_fkey" FOREIGN KEY (map_place_id) REFERENCES map_places(id);
alter table "public"."annual_tree_rituals" add constraint "annual_tree_rituals_planted_by_fkey" FOREIGN KEY (planted_by) REFERENCES auth.users(id);
alter table "public"."annual_tree_snapshots" add constraint "annual_tree_snapshots_profile_key_fkey" FOREIGN KEY (profile_key) REFERENCES annual_tree_growth_profiles(key);
alter table "public"."bond_members" add constraint "bond_members_bond_id_fkey" FOREIGN KEY (bond_id) REFERENCES bonds(id) ON DELETE CASCADE;
alter table "public"."bond_members" add constraint "bond_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."bonds" add constraint "bonds_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."catalog_items" add constraint "catalog_items_catalog_key_fkey" FOREIGN KEY (catalog_key) REFERENCES catalogs(key) ON DELETE CASCADE;
alter table "public"."flower_birth_ritual_ratings" add constraint "flower_birth_ritual_ratings_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."flower_birth_ritual_ratings" add constraint "flower_birth_ritual_ratings_page_id_fkey" FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;
alter table "public"."flower_birth_ritual_ratings" add constraint "flower_birth_ritual_ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."flower_birth_rituals" add constraint "flower_birth_rituals_completed_by_user_id_fkey" FOREIGN KEY (completed_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."flower_birth_rituals" add constraint "flower_birth_rituals_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."flower_birth_rituals" add constraint "flower_birth_rituals_page_id_fkey" FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;
alter table "public"."flower_birth_rituals" add constraint "flower_birth_rituals_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE SET NULL;
alter table "public"."flower_page_revisions" add constraint "flower_page_revisions_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."flower_page_revisions" add constraint "flower_page_revisions_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."flower_page_revisions" add constraint "flower_page_revisions_page_id_fkey" FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;
alter table "public"."forest_assets" add constraint "forest_assets_theme_key_fkey" FOREIGN KEY (theme_key) REFERENCES forest_theme(key) ON DELETE CASCADE;
alter table "public"."forest_narrative_templates" add constraint "forest_narrative_templates_theme_key_fkey" FOREIGN KEY (theme_key) REFERENCES forest_theme(key) ON DELETE CASCADE;
alter table "public"."garden_audio_session_participants" add constraint "garden_audio_session_participants_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_audio_session_participants" add constraint "garden_audio_session_participants_session_id_fkey" FOREIGN KEY (session_id) REFERENCES garden_audio_sessions(id) ON DELETE CASCADE;
alter table "public"."garden_audio_session_participants" add constraint "garden_audio_session_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."garden_audio_sessions" add constraint "garden_audio_sessions_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_audio_sessions" add constraint "garden_audio_sessions_room_id_fkey" FOREIGN KEY (room_id) REFERENCES garden_chat_rooms(id) ON DELETE SET NULL;
alter table "public"."garden_audio_sessions" add constraint "garden_audio_sessions_started_by_user_id_fkey" FOREIGN KEY (started_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_message_id_fkey" FOREIGN KEY (message_id) REFERENCES garden_chat_messages(id) ON DELETE CASCADE;
alter table "public"."garden_chat_message_attachments" add constraint "garden_chat_message_attachments_uploaded_by_user_id_fkey" FOREIGN KEY (uploaded_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."garden_chat_message_reactions" add constraint "garden_chat_message_reactions_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_chat_message_reactions" add constraint "garden_chat_message_reactions_message_id_fkey" FOREIGN KEY (message_id) REFERENCES garden_chat_messages(id) ON DELETE CASCADE;
alter table "public"."garden_chat_message_reactions" add constraint "garden_chat_message_reactions_room_id_fkey" FOREIGN KEY (room_id) REFERENCES garden_chat_rooms(id) ON DELETE CASCADE;
alter table "public"."garden_chat_message_reactions" add constraint "garden_chat_message_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_author_user_id_fkey" FOREIGN KEY (author_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_deleted_by_user_id_fkey" FOREIGN KEY (deleted_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_reply_to_message_id_fkey" FOREIGN KEY (reply_to_message_id) REFERENCES garden_chat_messages(id) ON DELETE SET NULL;
alter table "public"."garden_chat_messages" add constraint "garden_chat_messages_room_id_fkey" FOREIGN KEY (room_id) REFERENCES garden_chat_rooms(id) ON DELETE CASCADE;
alter table "public"."garden_chat_read_states" add constraint "garden_chat_read_states_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_chat_read_states" add constraint "garden_chat_read_states_last_read_message_id_fkey" FOREIGN KEY (last_read_message_id) REFERENCES garden_chat_messages(id) ON DELETE SET NULL;
alter table "public"."garden_chat_read_states" add constraint "garden_chat_read_states_room_id_fkey" FOREIGN KEY (room_id) REFERENCES garden_chat_rooms(id) ON DELETE CASCADE;
alter table "public"."garden_chat_read_states" add constraint "garden_chat_read_states_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."garden_chat_rooms" add constraint "garden_chat_rooms_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."garden_chat_rooms" add constraint "garden_chat_rooms_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_invitations" add constraint "garden_invitations_invited_by_user_id_fkey" FOREIGN KEY (invited_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."garden_invitations" add constraint "garden_invitations_invited_user_id_fkey" FOREIGN KEY (invited_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."garden_members" add constraint "garden_members_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_members" add constraint "garden_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."garden_plan_types" add constraint "garden_plan_types_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."garden_plan_types" add constraint "garden_plan_types_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."garden_plan_types" add constraint "garden_plan_types_updated_by_user_id_fkey" FOREIGN KEY (updated_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."garden_year_tree_states" add constraint "garden_year_tree_states_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."gardens" add constraint "gardens_bond_id_fkey" FOREIGN KEY (bond_id) REFERENCES bonds(id) ON DELETE CASCADE;
alter table "public"."gardens" add constraint "gardens_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."map_places" add constraint "map_places_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."map_places" add constraint "map_places_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."map_places" add constraint "map_places_source_page_id_fkey" FOREIGN KEY (source_page_id) REFERENCES pages(id) ON DELETE SET NULL;
alter table "public"."map_places" add constraint "map_places_source_seed_id_fkey" FOREIGN KEY (source_seed_id) REFERENCES seeds(id) ON DELETE SET NULL;
alter table "public"."map_places" add constraint "map_places_updated_by_user_id_fkey" FOREIGN KEY (updated_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."map_routes" add constraint "map_routes_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."map_routes" add constraint "map_routes_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."map_routes" add constraint "map_routes_source_page_id_fkey" FOREIGN KEY (source_page_id) REFERENCES pages(id) ON DELETE SET NULL;
alter table "public"."map_routes" add constraint "map_routes_source_seed_id_fkey" FOREIGN KEY (source_seed_id) REFERENCES seeds(id) ON DELETE SET NULL;
alter table "public"."map_routes" add constraint "map_routes_updated_by_user_id_fkey" FOREIGN KEY (updated_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."map_zones" add constraint "map_zones_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table "public"."map_zones" add constraint "map_zones_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."map_zones" add constraint "map_zones_source_page_id_fkey" FOREIGN KEY (source_page_id) REFERENCES pages(id) ON DELETE SET NULL;
alter table "public"."map_zones" add constraint "map_zones_source_seed_id_fkey" FOREIGN KEY (source_seed_id) REFERENCES seeds(id) ON DELETE SET NULL;
alter table "public"."map_zones" add constraint "map_zones_updated_by_user_id_fkey" FOREIGN KEY (updated_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."memory_reflections" add constraint "memory_reflections_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."memory_reflections" add constraint "memory_reflections_page_id_fkey" FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;
alter table "public"."memory_reflections" add constraint "memory_reflections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."page_visual_states" add constraint "page_visual_states_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."page_visual_states" add constraint "page_visual_states_page_id_fkey" FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;
alter table "public"."pages" add constraint "pages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."pages" add constraint "pages_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."pages" add constraint "pages_plan_type_id_fkey" FOREIGN KEY (plan_type_id) REFERENCES garden_plan_types(id) ON DELETE SET NULL;
alter table "public"."pages" add constraint "pages_planned_from_seed_id_fkey" FOREIGN KEY (planned_from_seed_id) REFERENCES seeds(id);
alter table "public"."pdf_layout_presets" add constraint "pdf_layout_presets_theme_key_fkey" FOREIGN KEY (theme_key) REFERENCES pdf_themes(key) ON DELETE CASCADE;
alter table "public"."pdf_text_templates" add constraint "pdf_text_templates_theme_key_fkey" FOREIGN KEY (theme_key) REFERENCES pdf_themes(key) ON DELETE CASCADE;
alter table "public"."pdf_theme_assets" add constraint "pdf_theme_assets_theme_key_fkey" FOREIGN KEY (theme_key) REFERENCES pdf_themes(key) ON DELETE CASCADE;
alter table "public"."profiles" add constraint "profiles_active_garden_id_fkey" FOREIGN KEY (active_garden_id) REFERENCES gardens(id) ON DELETE SET NULL;
alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table "public"."progression_condition_unlocks" add constraint "progression_condition_unlocks_condition_id_fkey" FOREIGN KEY (condition_id) REFERENCES progression_conditions(id) ON DELETE CASCADE;
alter table "public"."progression_condition_unlocks" add constraint "progression_condition_unlocks_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."progression_reward_unlocks" add constraint "progression_reward_unlocks_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."progression_reward_unlocks" add constraint "progression_reward_unlocks_reward_id_fkey" FOREIGN KEY (reward_id) REFERENCES progression_rewards(id) ON DELETE CASCADE;
alter table "public"."progression_reward_unlocks" add constraint "progression_reward_unlocks_source_tree_id_fkey" FOREIGN KEY (source_tree_id) REFERENCES progression_tree_nodes(id) ON DELETE SET NULL;
alter table "public"."progression_tree_unlocks" add constraint "progression_tree_unlocks_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."progression_tree_unlocks" add constraint "progression_tree_unlocks_tree_id_fkey" FOREIGN KEY (tree_id) REFERENCES progression_tree_nodes(id) ON DELETE CASCADE;
alter table "public"."season_notes" add constraint "season_notes_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_event_reminder_deliveries" add constraint "seed_event_reminder_deliveries_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_event_reminder_deliveries" add constraint "seed_event_reminder_deliveries_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_attachments" add constraint "seed_preparation_attachments_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_attachments" add constraint "seed_preparation_attachments_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_checklist_items" add constraint "seed_preparation_checklist_items_completed_by_user_id_fkey" FOREIGN KEY (completed_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_checklist_items" add constraint "seed_preparation_checklist_items_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_checklist_items" add constraint "seed_preparation_checklist_items_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_map_place_id_fkey" FOREIGN KEY (map_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_map_route_id_fkey" FOREIGN KEY (map_route_id) REFERENCES map_routes(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_stop_id_fkey" FOREIGN KEY (stop_id) REFERENCES seed_preparation_stops(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_itinerary_items" add constraint "seed_preparation_itinerary_items_transport_leg_id_fkey" FOREIGN KEY (transport_leg_id) REFERENCES seed_preparation_transport_legs(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_linked_route_id_fkey" FOREIGN KEY (linked_route_id) REFERENCES map_routes(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_linked_transport_leg_id_fkey" FOREIGN KEY (linked_transport_leg_id) REFERENCES seed_preparation_transport_legs(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_map_place_id_fkey" FOREIGN KEY (map_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_place_links" add constraint "seed_preparation_place_links_stop_id_fkey" FOREIGN KEY (stop_id) REFERENCES seed_preparation_stops(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_primary_map_place_id_fkey" FOREIGN KEY (primary_map_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_primary_map_route_id_fkey" FOREIGN KEY (primary_map_route_id) REFERENCES map_routes(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_profiles" add constraint "seed_preparation_profiles_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_map_place_id_fkey" FOREIGN KEY (map_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_reservations" add constraint "seed_preparation_reservations_stop_id_fkey" FOREIGN KEY (stop_id) REFERENCES seed_preparation_stops(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_stays" add constraint "seed_preparation_stays_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_stays" add constraint "seed_preparation_stays_map_place_id_fkey" FOREIGN KEY (map_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_stays" add constraint "seed_preparation_stays_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_stays" add constraint "seed_preparation_stays_stop_id_fkey" FOREIGN KEY (stop_id) REFERENCES seed_preparation_stops(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_stops" add constraint "seed_preparation_stops_base_place_id_fkey" FOREIGN KEY (base_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_stops" add constraint "seed_preparation_stops_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_stops" add constraint "seed_preparation_stops_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_destination_place_id_fkey" FOREIGN KEY (destination_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_destination_stop_id_fkey" FOREIGN KEY (destination_stop_id) REFERENCES seed_preparation_stops(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_map_route_id_fkey" FOREIGN KEY (map_route_id) REFERENCES map_routes(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_origin_place_id_fkey" FOREIGN KEY (origin_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_origin_stop_id_fkey" FOREIGN KEY (origin_stop_id) REFERENCES seed_preparation_stops(id) ON DELETE SET NULL;
alter table "public"."seed_preparation_transport_legs" add constraint "seed_preparation_transport_legs_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_watering_confirmations" add constraint "seed_watering_confirmations_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seed_watering_confirmations" add constraint "seed_watering_confirmations_seed_id_fkey" FOREIGN KEY (seed_id) REFERENCES seeds(id) ON DELETE CASCADE;
alter table "public"."seed_watering_confirmations" add constraint "seed_watering_confirmations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."seeds" add constraint "seeds_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."seeds" add constraint "seeds_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."seeds" add constraint "seeds_map_place_id_fkey" FOREIGN KEY (map_place_id) REFERENCES map_places(id) ON DELETE SET NULL;
alter table "public"."seeds" add constraint "seeds_map_route_id_fkey" FOREIGN KEY (map_route_id) REFERENCES map_routes(id) ON DELETE SET NULL;
alter table "public"."seeds" add constraint "seeds_plan_type_id_fkey" FOREIGN KEY (plan_type_id) REFERENCES garden_plan_types(id) ON DELETE SET NULL;
alter table "public"."sticker_pack_items" add constraint "sticker_pack_items_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES sticker_packs(id) ON DELETE CASCADE;
alter table "public"."sticker_pack_items" add constraint "sticker_pack_items_sticker_id_fkey" FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE;
alter table "public"."sticker_unlock_rules" add constraint "sticker_unlock_rules_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES sticker_packs(id) ON DELETE CASCADE;
alter table "public"."template_objects" add constraint "template_objects_template_id_fkey" FOREIGN KEY (template_id) REFERENCES canvas_templates(id) ON DELETE CASCADE;
alter table "public"."time_capsule_draft_revisions" add constraint "time_capsule_draft_revisions_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);
alter table "public"."time_capsule_draft_revisions" add constraint "time_capsule_draft_revisions_draft_id_fkey" FOREIGN KEY (draft_id) REFERENCES time_capsule_drafts(id) ON DELETE CASCADE;
alter table "public"."time_capsule_draft_revisions" add constraint "time_capsule_draft_revisions_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."time_capsule_drafts" add constraint "time_capsule_drafts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table "public"."time_capsules" add constraint "time_capsules_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."time_capsules" add constraint "time_capsules_sealed_by_fkey" FOREIGN KEY (sealed_by) REFERENCES auth.users(id);
alter table "public"."ui_module_items" add constraint "ui_module_items_module_key_fkey" FOREIGN KEY (module_key) REFERENCES ui_modules(key) ON DELETE CASCADE;
alter table "public"."user_notices" add constraint "user_notices_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE SET NULL;
alter table "public"."user_notices" add constraint "user_notices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."year_cycle_states" add constraint "year_cycle_states_closed_by_user_id_fkey" FOREIGN KEY (closed_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."year_cycle_states" add constraint "year_cycle_states_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;
alter table "public"."year_notes" add constraint "year_notes_garden_id_fkey" FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE;

-- Indexes
-- -------
CREATE INDEX idx_achievements_unlocked_garden_rule ON public.achievements_unlocked USING btree (garden_id, rule_id);
CREATE INDEX idx_annual_tree_check_ins_garden_id ON public.annual_tree_check_ins USING btree (garden_id);
CREATE UNIQUE INDEX idx_annual_tree_check_ins_unique_milestone ON public.annual_tree_check_ins USING btree (ritual_id, milestone_year);
CREATE INDEX idx_annual_tree_rituals_garden_id ON public.annual_tree_rituals USING btree (garden_id);
CREATE INDEX idx_annual_tree_snapshots_profile ON public.annual_tree_snapshots USING btree (profile_key);
CREATE INDEX idx_bond_members_user_active ON public.bond_members USING btree (user_id, joined_at DESC) WHERE (left_at IS NULL);
CREATE INDEX idx_bonds_status_created_at ON public.bonds USING btree (status, created_at DESC);
CREATE INDEX idx_catalog_items_catalog_key ON public.catalog_items USING btree (catalog_key);
CREATE INDEX idx_catalog_items_enabled ON public.catalog_items USING btree (enabled);
CREATE INDEX idx_flower_birth_ritual_ratings_garden_page ON public.flower_birth_ritual_ratings USING btree (garden_id, page_id, updated_at DESC);
CREATE INDEX idx_flower_birth_rituals_garden_id ON public.flower_birth_rituals USING btree (garden_id, activated_at DESC);
CREATE INDEX idx_flower_birth_rituals_seed_id ON public.flower_birth_rituals USING btree (seed_id);
CREATE INDEX idx_flower_page_revisions_garden_id ON public.flower_page_revisions USING btree (garden_id, created_at DESC);
CREATE INDEX idx_flower_page_revisions_page_id ON public.flower_page_revisions USING btree (page_id, created_at DESC);
CREATE INDEX idx_forest_assets_enabled ON public.forest_assets USING btree (enabled);
CREATE INDEX idx_forest_assets_theme ON public.forest_assets USING btree (theme_key);
CREATE INDEX idx_forest_narrative_enabled ON public.forest_narrative_templates USING btree (enabled);
CREATE INDEX idx_forest_narrative_theme ON public.forest_narrative_templates USING btree (theme_key);
CREATE INDEX idx_garden_audio_session_participants_garden_user ON public.garden_audio_session_participants USING btree (garden_id, user_id, updated_at DESC);
CREATE INDEX idx_garden_audio_sessions_garden_status ON public.garden_audio_sessions USING btree (garden_id, status, started_at DESC);
CREATE INDEX idx_garden_audio_sessions_room_id ON public.garden_audio_sessions USING btree (room_id, started_at DESC);
CREATE INDEX idx_garden_chat_message_attachments_garden_id ON public.garden_chat_message_attachments USING btree (garden_id, created_at DESC);
CREATE INDEX idx_garden_chat_message_attachments_message_id ON public.garden_chat_message_attachments USING btree (message_id, created_at);
CREATE INDEX idx_garden_chat_message_reactions_garden_id ON public.garden_chat_message_reactions USING btree (garden_id, created_at DESC);
CREATE INDEX idx_garden_chat_message_reactions_room_id ON public.garden_chat_message_reactions USING btree (room_id, created_at);
CREATE INDEX idx_garden_chat_messages_garden_id ON public.garden_chat_messages USING btree (garden_id, created_at DESC);
CREATE INDEX idx_garden_chat_messages_reply_to ON public.garden_chat_messages USING btree (reply_to_message_id);
CREATE INDEX idx_garden_chat_messages_room_id ON public.garden_chat_messages USING btree (room_id, created_at DESC);
CREATE INDEX idx_garden_chat_read_states_garden_user ON public.garden_chat_read_states USING btree (garden_id, user_id, updated_at DESC);
CREATE INDEX idx_garden_chat_rooms_garden_id ON public.garden_chat_rooms USING btree (garden_id, sort_order, created_at DESC);
CREATE UNIQUE INDEX idx_garden_chat_rooms_one_main_per_garden ON public.garden_chat_rooms USING btree (garden_id) WHERE ((room_kind = 'main'::text) AND (archived_at IS NULL));
CREATE INDEX idx_garden_invitations_invited_email_status ON public.garden_invitations USING btree (lower(invited_email), status);
CREATE INDEX idx_garden_members_user_active ON public.garden_members USING btree (user_id, joined_at DESC) WHERE (left_at IS NULL);
CREATE INDEX idx_garden_plan_types_garden_sort ON public.garden_plan_types USING btree (garden_id, archived_at, sort_order, created_at DESC);
CREATE INDEX idx_garden_year_tree_states_garden_year ON public.garden_year_tree_states USING btree (garden_id, year DESC);
CREATE INDEX idx_gardens_bond_status ON public.gardens USING btree (bond_id, status);
CREATE INDEX idx_map_places_garden_kind ON public.map_places USING btree (garden_id, kind, created_at DESC);
CREATE INDEX idx_map_places_garden_page ON public.map_places USING btree (garden_id, source_page_id);
CREATE INDEX idx_map_places_garden_seed ON public.map_places USING btree (garden_id, source_seed_id);
CREATE INDEX idx_map_places_garden_state ON public.map_places USING btree (garden_id, state, created_at DESC);
CREATE INDEX idx_map_routes_garden_kind ON public.map_routes USING btree (garden_id, kind, created_at DESC);
CREATE INDEX idx_map_routes_garden_page ON public.map_routes USING btree (garden_id, source_page_id);
CREATE INDEX idx_map_routes_garden_seed ON public.map_routes USING btree (garden_id, source_seed_id);
CREATE INDEX idx_map_routes_garden_status ON public.map_routes USING btree (garden_id, status, created_at DESC);
CREATE INDEX idx_map_zones_garden_kind ON public.map_zones USING btree (garden_id, kind, created_at DESC);
CREATE INDEX idx_map_zones_garden_page ON public.map_zones USING btree (garden_id, source_page_id);
CREATE INDEX idx_map_zones_garden_seed ON public.map_zones USING btree (garden_id, source_seed_id);
CREATE INDEX idx_map_zones_garden_status ON public.map_zones USING btree (garden_id, status, created_at DESC);
CREATE INDEX idx_memory_reflections_garden_page ON public.memory_reflections USING btree (garden_id, page_id);
CREATE INDEX idx_page_visual_states_garden_id ON public.page_visual_states USING btree (garden_id, page_id);
CREATE INDEX idx_pages_garden_date ON public.pages USING btree (garden_id, date DESC);
CREATE INDEX idx_pages_location_lat_lng ON public.pages USING btree (location_lat, location_lng) WHERE ((location_lat IS NOT NULL) AND (location_lng IS NOT NULL));
CREATE UNIQUE INDEX idx_pages_unique_planned_from_seed ON public.pages USING btree (planned_from_seed_id) WHERE (planned_from_seed_id IS NOT NULL);
CREATE INDEX pages_plan_type_id_idx ON public.pages USING btree (plan_type_id);
CREATE INDEX idx_pdf_layout_presets_theme ON public.pdf_layout_presets USING btree (theme_key);
CREATE INDEX idx_pdf_text_templates_theme ON public.pdf_text_templates USING btree (theme_key);
CREATE INDEX idx_pdf_theme_assets_theme ON public.pdf_theme_assets USING btree (theme_key);
CREATE UNIQUE INDEX idx_profiles_invite_code_unique ON public.profiles USING btree (invite_code);
CREATE INDEX idx_progression_condition_unlocks_condition ON public.progression_condition_unlocks USING btree (condition_id);
CREATE INDEX idx_progression_condition_unlocks_garden_unlocked_at ON public.progression_condition_unlocks USING btree (garden_id, unlocked_at DESC);
CREATE INDEX idx_progression_conditions_enabled ON public.progression_conditions USING btree (enabled);
CREATE INDEX idx_progression_graph_state_updated_at ON public.progression_graph_state USING btree (updated_at DESC);
CREATE INDEX idx_progression_reward_unlocks_garden_unlocked_at ON public.progression_reward_unlocks USING btree (garden_id, unlocked_at DESC);
CREATE INDEX idx_progression_reward_unlocks_reward ON public.progression_reward_unlocks USING btree (reward_id);
CREATE INDEX idx_progression_rewards_enabled ON public.progression_rewards USING btree (enabled);
CREATE INDEX idx_progression_tree_nodes_enabled ON public.progression_tree_nodes USING btree (enabled);
CREATE INDEX idx_progression_tree_unlocks_garden_unlocked_at ON public.progression_tree_unlocks USING btree (garden_id, unlocked_at DESC);
CREATE INDEX idx_progression_tree_unlocks_tree ON public.progression_tree_unlocks USING btree (tree_id);
CREATE INDEX idx_season_notes_garden_year ON public.season_notes USING btree (garden_id, year);
CREATE UNIQUE INDEX uq_season_notes_garden_year_season ON public.season_notes USING btree (garden_id, year, season) WHERE (garden_id IS NOT NULL);
CREATE INDEX idx_seed_event_reminder_deliveries_garden_scheduled ON public.seed_event_reminder_deliveries USING btree (garden_id, scheduled_for DESC);
CREATE UNIQUE INDEX idx_seed_event_reminder_deliveries_seed_window ON public.seed_event_reminder_deliveries USING btree (seed_id, delivery_window_key);
CREATE INDEX idx_seed_preparation_attachments_garden_seed ON public.seed_preparation_attachments USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_checklist_garden_seed ON public.seed_preparation_checklist_items USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_itinerary_garden_seed ON public.seed_preparation_itinerary_items USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_places_garden_seed ON public.seed_preparation_place_links USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_profiles_garden_seed ON public.seed_preparation_profiles USING btree (garden_id, seed_id);
CREATE INDEX idx_seed_preparation_reservations_garden_seed ON public.seed_preparation_reservations USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_stays_garden_seed ON public.seed_preparation_stays USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_stops_garden_seed ON public.seed_preparation_stops USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_preparation_transport_garden_seed ON public.seed_preparation_transport_legs USING btree (garden_id, seed_id, order_index);
CREATE INDEX idx_seed_status_flow_enabled_sort ON public.seed_status_flow USING btree (enabled, sort_order);
CREATE INDEX idx_seed_status_flow_from_to ON public.seed_status_flow USING btree (from_status, to_status);
CREATE INDEX idx_seed_watering_confirmations_garden_seed ON public.seed_watering_confirmations USING btree (garden_id, seed_id, watered_at DESC);
CREATE INDEX idx_seeds_garden_status_date ON public.seeds USING btree (garden_id, status, scheduled_date);
CREATE INDEX idx_seeds_map_place_id ON public.seeds USING btree (map_place_id);
CREATE INDEX idx_seeds_map_route_id ON public.seeds USING btree (map_route_id);
CREATE INDEX idx_seeds_plan_type_id ON public.seeds USING btree (plan_type_id);
CREATE INDEX idx_sticker_pack_items_enabled ON public.sticker_pack_items USING btree (enabled);
CREATE INDEX idx_sticker_pack_items_pack ON public.sticker_pack_items USING btree (pack_id);
CREATE INDEX idx_sticker_unlock_rules_pack ON public.sticker_unlock_rules USING btree (pack_id);
CREATE INDEX idx_template_objects_enabled ON public.template_objects USING btree (enabled);
CREATE INDEX idx_template_objects_template ON public.template_objects USING btree (template_id);
CREATE INDEX idx_time_capsule_draft_revisions_capsule_year ON public.time_capsule_draft_revisions USING btree (capsule_year, created_at DESC);
CREATE INDEX idx_time_capsule_draft_revisions_draft_id ON public.time_capsule_draft_revisions USING btree (draft_id, created_at DESC);
CREATE INDEX idx_time_capsule_draft_revisions_garden_id ON public.time_capsule_draft_revisions USING btree (garden_id, created_at DESC);
CREATE INDEX idx_time_capsule_drafts_capsule_year ON public.time_capsule_drafts USING btree (capsule_year);
CREATE INDEX idx_time_capsule_drafts_garden_id ON public.time_capsule_drafts USING btree (garden_id);
CREATE INDEX idx_time_capsules_garden_id ON public.time_capsules USING btree (garden_id);
CREATE INDEX idx_time_capsules_opens_at ON public.time_capsules USING btree (opens_at);
CREATE INDEX idx_time_capsules_status ON public.time_capsules USING btree (status);
CREATE INDEX idx_timeline_milestone_rules_enabled ON public.timeline_milestone_rules USING btree (enabled);
CREATE INDEX idx_timeline_milestone_rules_number ON public.timeline_milestone_rules USING btree (milestone_number);
CREATE INDEX idx_ui_module_items_module_key ON public.ui_module_items USING btree (module_key);
CREATE INDEX idx_user_notices_user_created ON public.user_notices USING btree (user_id, created_at DESC);
CREATE INDEX idx_user_notices_user_unread ON public.user_notices USING btree (user_id, read_at, created_at DESC);
CREATE INDEX idx_year_cycle_states_garden_year ON public.year_cycle_states USING btree (garden_id, year DESC);
CREATE INDEX idx_year_notes_garden_year ON public.year_notes USING btree (garden_id, year);
CREATE UNIQUE INDEX uq_year_notes_garden_year ON public.year_notes USING btree (garden_id, year) WHERE (garden_id IS NOT NULL);

-- Row level security
-- ------------------
alter table "public"."achievement_rules" enable row level security;
alter table "public"."achievements_unlocked" enable row level security;
alter table "public"."annual_tree_check_ins" enable row level security;
alter table "public"."annual_tree_growth_profiles" enable row level security;
alter table "public"."annual_tree_rituals" enable row level security;
alter table "public"."annual_tree_snapshots" enable row level security;
alter table "public"."bond_members" enable row level security;
alter table "public"."bonds" enable row level security;
alter table "public"."calendar_rules" enable row level security;
alter table "public"."canvas_templates" enable row level security;
alter table "public"."catalog_items" enable row level security;
alter table "public"."catalogs" enable row level security;
alter table "public"."flower_birth_ritual_ratings" enable row level security;
alter table "public"."flower_birth_rituals" enable row level security;
alter table "public"."flower_page_revisions" enable row level security;
alter table "public"."forest_assets" enable row level security;
alter table "public"."forest_narrative_templates" enable row level security;
alter table "public"."forest_theme" enable row level security;
alter table "public"."garden_audio_session_participants" enable row level security;
alter table "public"."garden_audio_sessions" enable row level security;
alter table "public"."garden_chat_message_attachments" enable row level security;
alter table "public"."garden_chat_message_reactions" enable row level security;
alter table "public"."garden_chat_messages" enable row level security;
alter table "public"."garden_chat_read_states" enable row level security;
alter table "public"."garden_chat_rooms" enable row level security;
alter table "public"."garden_invitations" enable row level security;
alter table "public"."garden_members" enable row level security;
alter table "public"."garden_plan_types" enable row level security;
alter table "public"."garden_year_tree_states" enable row level security;
alter table "public"."gardens" enable row level security;
alter table "public"."map_places" enable row level security;
alter table "public"."map_routes" enable row level security;
alter table "public"."map_zones" enable row level security;
alter table "public"."memory_reflections" enable row level security;
alter table "public"."page_visual_states" enable row level security;
alter table "public"."pages" enable row level security;
alter table "public"."pdf_layout_presets" enable row level security;
alter table "public"."pdf_text_templates" enable row level security;
alter table "public"."pdf_theme_assets" enable row level security;
alter table "public"."pdf_themes" enable row level security;
alter table "public"."profiles" enable row level security;
alter table "public"."progression_condition_unlocks" enable row level security;
alter table "public"."progression_conditions" enable row level security;
alter table "public"."progression_graph_state" enable row level security;
alter table "public"."progression_reward_unlocks" enable row level security;
alter table "public"."progression_rewards" enable row level security;
alter table "public"."progression_tree_nodes" enable row level security;
alter table "public"."progression_tree_unlocks" enable row level security;
alter table "public"."rewards" enable row level security;
alter table "public"."season_notes" enable row level security;
alter table "public"."seed_defaults" enable row level security;
alter table "public"."seed_event_reminder_deliveries" enable row level security;
alter table "public"."seed_preparation_attachments" enable row level security;
alter table "public"."seed_preparation_checklist_items" enable row level security;
alter table "public"."seed_preparation_itinerary_items" enable row level security;
alter table "public"."seed_preparation_place_links" enable row level security;
alter table "public"."seed_preparation_profiles" enable row level security;
alter table "public"."seed_preparation_reservations" enable row level security;
alter table "public"."seed_preparation_stays" enable row level security;
alter table "public"."seed_preparation_stops" enable row level security;
alter table "public"."seed_preparation_transport_legs" enable row level security;
alter table "public"."seed_status_flow" enable row level security;
alter table "public"."seed_watering_confirmations" enable row level security;
alter table "public"."seeds" enable row level security;
alter table "public"."sticker_pack_items" enable row level security;
alter table "public"."sticker_packs" enable row level security;
alter table "public"."sticker_unlock_rules" enable row level security;
alter table "public"."stickers" enable row level security;
alter table "public"."template_objects" enable row level security;
alter table "public"."time_capsule_draft_revisions" enable row level security;
alter table "public"."time_capsule_drafts" enable row level security;
alter table "public"."time_capsules" enable row level security;
alter table "public"."timeline_milestone_rules" enable row level security;
alter table "public"."timeline_view_config" enable row level security;
alter table "public"."ui_module_items" enable row level security;
alter table "public"."ui_modules" enable row level security;
alter table "public"."ui_strings" enable row level security;
alter table "public"."user_notices" enable row level security;
alter table "public"."year_cycle_states" enable row level security;
alter table "public"."year_notes" enable row level security;

-- Policies
-- --------
create policy "achievement_rules_delete_superadmin" on "public"."achievement_rules" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "achievement_rules_insert_superadmin" on "public"."achievement_rules" as PERMISSIVE for insert with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "achievement_rules_read_app" on "public"."achievement_rules" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))));
create policy "achievement_rules_update_superadmin" on "public"."achievement_rules" as PERMISSIVE for update using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "achievements_unlocked_delete_superadmin_strict" on "public"."achievements_unlocked" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "achievements_unlocked_insert_garden_member_strict" on "public"."achievements_unlocked" as PERMISSIVE for insert with check ((((claimed_by IS NULL) OR (claimed_by = auth.uid())) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = achievements_unlocked.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))));
create policy "achievements_unlocked_read_garden_member_strict" on "public"."achievements_unlocked" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = achievements_unlocked.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "achievements_unlocked_update_garden_member_strict" on "public"."achievements_unlocked" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = achievements_unlocked.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))) with check ((((claimed_by IS NULL) OR (claimed_by = auth.uid())) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = achievements_unlocked.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))));
create policy "annual_tree_check_ins_insert_garden_member" on "public"."annual_tree_check_ins" as PERMISSIVE for insert with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "annual_tree_check_ins_select_garden_member" on "public"."annual_tree_check_ins" as PERMISSIVE for select using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "annual_tree_check_ins_update_garden_member" on "public"."annual_tree_check_ins" as PERMISSIVE for update using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid())))) with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "annual_tree_profiles_read_app" on "public"."annual_tree_growth_profiles" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))));
create policy "annual_tree_profiles_write_superadmin" on "public"."annual_tree_growth_profiles" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "annual_tree_rituals_insert_garden_member" on "public"."annual_tree_rituals" as PERMISSIVE for insert with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "annual_tree_rituals_select_garden_member" on "public"."annual_tree_rituals" as PERMISSIVE for select using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "annual_tree_rituals_update_garden_member" on "public"."annual_tree_rituals" as PERMISSIVE for update using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid())))) with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "annual_tree_snapshots_read_app" on "public"."annual_tree_snapshots" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))));
create policy "annual_tree_snapshots_write_superadmin" on "public"."annual_tree_snapshots" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "bond_members_read_self_or_superadmin" on "public"."bond_members" as PERMISSIVE for select using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "bond_members_write_superadmin" on "public"."bond_members" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "bonds_read_member" on "public"."bonds" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM bond_members bm
  WHERE ((bm.bond_id = bonds.id) AND (bm.user_id = auth.uid()) AND (bm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "bonds_write_superadmin" on "public"."bonds" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "calendar_rules_read" on "public"."calendar_rules" as PERMISSIVE for select using (true);
create policy "calendar_rules_write" on "public"."calendar_rules" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "canvas_templates_read" on "public"."canvas_templates" as PERMISSIVE for select using (true);
create policy "canvas_templates_write" on "public"."canvas_templates" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "catalog_items_read" on "public"."catalog_items" as PERMISSIVE for select using (true);
create policy "catalog_items_write" on "public"."catalog_items" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "catalogs_read" on "public"."catalogs" as PERMISSIVE for select using (true);
create policy "catalogs_write" on "public"."catalogs" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "flower_birth_ritual_ratings_insert_self" on "public"."flower_birth_ritual_ratings" as PERMISSIVE for insert with check (((user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_birth_ritual_ratings.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))));
create policy "flower_birth_ritual_ratings_read_member" on "public"."flower_birth_ritual_ratings" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_birth_ritual_ratings.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "flower_birth_ritual_ratings_update_self" on "public"."flower_birth_ritual_ratings" as PERMISSIVE for update using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "flower_birth_rituals_insert_member" on "public"."flower_birth_rituals" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_birth_rituals.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "flower_birth_rituals_read_member" on "public"."flower_birth_rituals" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_birth_rituals.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "flower_birth_rituals_update_member" on "public"."flower_birth_rituals" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_birth_rituals.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_birth_rituals.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "flower_page_revisions_insert_member" on "public"."flower_page_revisions" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_page_revisions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "flower_page_revisions_read_member" on "public"."flower_page_revisions" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = flower_page_revisions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "forest_assets_read" on "public"."forest_assets" as PERMISSIVE for select using (true);
create policy "forest_assets_write" on "public"."forest_assets" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "forest_narrative_read" on "public"."forest_narrative_templates" as PERMISSIVE for select using (true);
create policy "forest_narrative_write" on "public"."forest_narrative_templates" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "forest_theme_read" on "public"."forest_theme" as PERMISSIVE for select using (true);
create policy "forest_theme_write" on "public"."forest_theme" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "garden_audio_session_participants_insert_member" on "public"."garden_audio_session_participants" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_session_participants.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_audio_session_participants_read_member" on "public"."garden_audio_session_participants" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_session_participants.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_audio_session_participants_update_member" on "public"."garden_audio_session_participants" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_session_participants.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_session_participants.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_audio_sessions_insert_member" on "public"."garden_audio_sessions" as PERMISSIVE for insert with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_sessions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (started_by_user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_audio_sessions_read_member" on "public"."garden_audio_sessions" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_sessions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_audio_sessions_update_member" on "public"."garden_audio_sessions" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_sessions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_audio_sessions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_attachments_insert_member" on "public"."garden_chat_message_attachments" as PERMISSIVE for insert with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_message_attachments.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (COALESCE(uploaded_by_user_id, auth.uid()) = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_attachments_read_member" on "public"."garden_chat_message_attachments" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_message_attachments.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_reactions_delete_self" on "public"."garden_chat_message_reactions" as PERMISSIVE for delete using ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_message_reactions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_reactions_insert_self" on "public"."garden_chat_message_reactions" as PERMISSIVE for insert with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_message_reactions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_reactions_read_member" on "public"."garden_chat_message_reactions" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_message_reactions.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_messages_insert_member" on "public"."garden_chat_messages" as PERMISSIVE for insert with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_messages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (author_user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_messages_read_member" on "public"."garden_chat_messages" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_messages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_messages_update_member" on "public"."garden_chat_messages" as PERMISSIVE for update using ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_messages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (author_user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_messages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (author_user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_reads_insert_self" on "public"."garden_chat_read_states" as PERMISSIVE for insert with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_read_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_reads_read_member" on "public"."garden_chat_read_states" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_read_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_reads_update_self" on "public"."garden_chat_read_states" as PERMISSIVE for update using ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_read_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check ((((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_read_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) AND (user_id = auth.uid())) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_rooms_insert_member" on "public"."garden_chat_rooms" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_rooms.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_rooms_read_member" on "public"."garden_chat_rooms" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_rooms.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_chat_rooms_update_member" on "public"."garden_chat_rooms" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_rooms.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_chat_rooms.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_invitations_read_self_or_superadmin" on "public"."garden_invitations" as PERMISSIVE for select using (((invited_by_user_id = auth.uid()) OR (invited_user_id = auth.uid()) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_invitations_write_superadmin" on "public"."garden_invitations" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "garden_members_read_self_or_superadmin" on "public"."garden_members" as PERMISSIVE for select using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_members_write_superadmin" on "public"."garden_members" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "garden_plan_types_delete_editor" on "public"."garden_plan_types" as PERMISSIVE for delete using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_plan_types.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text])))))));
create policy "garden_plan_types_insert_editor" on "public"."garden_plan_types" as PERMISSIVE for insert with check (((created_by_user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_plan_types.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "garden_plan_types_read_member" on "public"."garden_plan_types" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_plan_types.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_plan_types_update_editor" on "public"."garden_plan_types" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_plan_types.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))) with check ((((updated_by_user_id IS NULL) OR (updated_by_user_id = auth.uid())) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_plan_types.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "garden_year_tree_states_read_member" on "public"."garden_year_tree_states" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = garden_year_tree_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "garden_year_tree_states_write_superadmin" on "public"."garden_year_tree_states" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "gardens_read_member" on "public"."gardens" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = gardens.id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "gardens_write_superadmin" on "public"."gardens" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "map_places_delete_garden_editor" on "public"."map_places" as PERMISSIVE for delete using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_places.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text])))))));
create policy "map_places_insert_garden_editor" on "public"."map_places" as PERMISSIVE for insert with check (((created_by_user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_places.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "map_places_read_garden_member" on "public"."map_places" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_places.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "map_places_update_garden_editor" on "public"."map_places" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_places.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))) with check ((((updated_by_user_id IS NULL) OR (updated_by_user_id = auth.uid())) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_places.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "map_routes_delete_garden_editor" on "public"."map_routes" as PERMISSIVE for delete using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_routes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text])))))));
create policy "map_routes_insert_garden_editor" on "public"."map_routes" as PERMISSIVE for insert with check (((created_by_user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_routes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "map_routes_read_garden_member" on "public"."map_routes" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_routes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "map_routes_update_garden_editor" on "public"."map_routes" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_routes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))) with check ((((updated_by_user_id IS NULL) OR (updated_by_user_id = auth.uid())) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_routes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "map_zones_delete_garden_editor" on "public"."map_zones" as PERMISSIVE for delete using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_zones.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text])))))));
create policy "map_zones_insert_garden_editor" on "public"."map_zones" as PERMISSIVE for insert with check (((created_by_user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_zones.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "map_zones_read_garden_member" on "public"."map_zones" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_zones.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "map_zones_update_garden_editor" on "public"."map_zones" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_zones.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))) with check ((((updated_by_user_id IS NULL) OR (updated_by_user_id = auth.uid())) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = map_zones.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))))));
create policy "memory_reflections_delete_member" on "public"."memory_reflections" as PERMISSIVE for delete using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "memory_reflections_read_member" on "public"."memory_reflections" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = memory_reflections.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "memory_reflections_update_member" on "public"."memory_reflections" as PERMISSIVE for update using (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = memory_reflections.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))) with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = memory_reflections.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))));
create policy "memory_reflections_write_member" on "public"."memory_reflections" as PERMISSIVE for insert with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = memory_reflections.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))));
create policy "page_visual_states_read_member" on "public"."page_visual_states" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = page_visual_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "page_visual_states_write_superadmin" on "public"."page_visual_states" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "pages_delete_superadmin_strict" on "public"."pages" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "pages_insert_garden_member_strict" on "public"."pages" as PERMISSIVE for insert with check (((COALESCE(created_by, auth.uid()) = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = pages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))));
create policy "pages_read_garden_member_strict" on "public"."pages" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = pages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "pages_update_garden_member_strict" on "public"."pages" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = pages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))) with check (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = pages.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "pdf_layout_presets_read" on "public"."pdf_layout_presets" as PERMISSIVE for select using (true);
create policy "pdf_layout_presets_write" on "public"."pdf_layout_presets" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "pdf_text_templates_read" on "public"."pdf_text_templates" as PERMISSIVE for select using (true);
create policy "pdf_text_templates_write" on "public"."pdf_text_templates" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "pdf_theme_assets_read" on "public"."pdf_theme_assets" as PERMISSIVE for select using (true);
create policy "pdf_theme_assets_write" on "public"."pdf_theme_assets" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "pdf_themes_read" on "public"."pdf_themes" as PERMISSIVE for select using (true);
create policy "pdf_themes_write" on "public"."pdf_themes" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "profiles_insert_self" on "public"."profiles" as PERMISSIVE for insert with check (((id = auth.uid()) AND (role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text]))));
create policy "profiles_read_self_or_superadmin" on "public"."profiles" as PERMISSIVE for select using (((id = auth.uid()) OR is_superadmin_auth()));
create policy "profiles_update_self_non_admin" on "public"."profiles" as PERMISSIVE for update using (((id = auth.uid()) AND (role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text])))) with check (((id = auth.uid()) AND (role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text]))));
create policy "profiles_update_superadmin" on "public"."profiles" as PERMISSIVE for update using (is_superadmin_auth()) with check ((role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text])));
create policy "progression_condition_unlocks_read" on "public"."progression_condition_unlocks" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_condition_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "progression_condition_unlocks_write" on "public"."progression_condition_unlocks" as PERMISSIVE for all using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_condition_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_condition_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "progression_conditions_read" on "public"."progression_conditions" as PERMISSIVE for select using (true);
create policy "progression_conditions_write" on "public"."progression_conditions" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "progression_graph_state_delete_superadmin" on "public"."progression_graph_state" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "progression_graph_state_insert_superadmin" on "public"."progression_graph_state" as PERMISSIVE for insert with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "progression_graph_state_read_app" on "public"."progression_graph_state" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))));
create policy "progression_graph_state_update_superadmin" on "public"."progression_graph_state" as PERMISSIVE for update using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "progression_reward_unlocks_read" on "public"."progression_reward_unlocks" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_reward_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "progression_reward_unlocks_write" on "public"."progression_reward_unlocks" as PERMISSIVE for all using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_reward_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_reward_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "progression_rewards_read" on "public"."progression_rewards" as PERMISSIVE for select using (true);
create policy "progression_rewards_write" on "public"."progression_rewards" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "progression_tree_nodes_read" on "public"."progression_tree_nodes" as PERMISSIVE for select using (true);
create policy "progression_tree_nodes_write" on "public"."progression_tree_nodes" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "progression_tree_unlocks_read" on "public"."progression_tree_unlocks" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_tree_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "progression_tree_unlocks_write" on "public"."progression_tree_unlocks" as PERMISSIVE for all using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_tree_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = progression_tree_unlocks.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "rewards_delete_superadmin" on "public"."rewards" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "rewards_insert_superadmin" on "public"."rewards" as PERMISSIVE for insert with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "rewards_read_app" on "public"."rewards" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['gardener_a'::text, 'gardener_b'::text, 'superadmin'::text]))))));
create policy "rewards_update_superadmin" on "public"."rewards" as PERMISSIVE for update using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "season_notes_delete_superadmin_strict" on "public"."season_notes" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "season_notes_insert_garden_member_strict" on "public"."season_notes" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = season_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "season_notes_read_garden_member_strict" on "public"."season_notes" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = season_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "season_notes_update_garden_member_strict" on "public"."season_notes" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = season_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))) with check (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = season_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "seed_defaults_read" on "public"."seed_defaults" as PERMISSIVE for select using (true);
create policy "seed_defaults_write" on "public"."seed_defaults" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "seed_event_reminder_deliveries_read_member" on "public"."seed_event_reminder_deliveries" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_event_reminder_deliveries.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_event_reminder_deliveries_write_member" on "public"."seed_event_reminder_deliveries" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_event_reminder_deliveries.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_event_reminder_deliveries.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_attachments_read_member" on "public"."seed_preparation_attachments" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_attachments.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_attachments_write_member" on "public"."seed_preparation_attachments" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_attachments.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_attachments.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_checklist_read_member" on "public"."seed_preparation_checklist_items" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_checklist_items.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_checklist_write_member" on "public"."seed_preparation_checklist_items" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_checklist_items.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_checklist_items.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_itinerary_read_member" on "public"."seed_preparation_itinerary_items" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_itinerary_items.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_itinerary_write_member" on "public"."seed_preparation_itinerary_items" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_itinerary_items.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_itinerary_items.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_places_read_member" on "public"."seed_preparation_place_links" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_place_links.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_places_write_member" on "public"."seed_preparation_place_links" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_place_links.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_place_links.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_profiles_read_member" on "public"."seed_preparation_profiles" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_profiles.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_profiles_write_member" on "public"."seed_preparation_profiles" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_profiles.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_profiles.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_reservations_read_member" on "public"."seed_preparation_reservations" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_reservations.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_reservations_write_member" on "public"."seed_preparation_reservations" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_reservations.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_reservations.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_stays_read_member" on "public"."seed_preparation_stays" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_stays.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_stays_write_member" on "public"."seed_preparation_stays" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_stays.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_stays.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_stops_read_member" on "public"."seed_preparation_stops" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_stops.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_stops_write_member" on "public"."seed_preparation_stops" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_stops.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_stops.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_transport_read_member" on "public"."seed_preparation_transport_legs" as PERMISSIVE for select using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_transport_legs.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_preparation_transport_write_member" on "public"."seed_preparation_transport_legs" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_transport_legs.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))) with check ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_preparation_transport_legs.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))));
create policy "seed_status_flow_read" on "public"."seed_status_flow" as PERMISSIVE for select using (true);
create policy "seed_status_flow_write" on "public"."seed_status_flow" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "seed_watering_confirmations_delete_member" on "public"."seed_watering_confirmations" as PERMISSIVE for delete using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_watering_confirmations.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL) AND (gm.member_role = ANY (ARRAY['owner'::text, 'editor'::text]))))) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "seed_watering_confirmations_insert_self" on "public"."seed_watering_confirmations" as PERMISSIVE for insert with check (((user_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_watering_confirmations.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))));
create policy "seed_watering_confirmations_read_member" on "public"."seed_watering_confirmations" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seed_watering_confirmations.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "seed_watering_confirmations_update_member" on "public"."seed_watering_confirmations" as PERMISSIVE for update using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "seeds_delete_superadmin_strict" on "public"."seeds" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "seeds_insert_garden_member_strict" on "public"."seeds" as PERMISSIVE for insert with check (((COALESCE(created_by, auth.uid()) = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seeds.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))));
create policy "seeds_read_garden_member_strict" on "public"."seeds" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seeds.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "seeds_update_garden_member_strict" on "public"."seeds" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seeds.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))) with check (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = seeds.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "sticker_pack_items_read" on "public"."sticker_pack_items" as PERMISSIVE for select using (true);
create policy "sticker_pack_items_write" on "public"."sticker_pack_items" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "sticker_packs_read" on "public"."sticker_packs" as PERMISSIVE for select using (true);
create policy "sticker_packs_write" on "public"."sticker_packs" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "sticker_unlock_rules_read" on "public"."sticker_unlock_rules" as PERMISSIVE for select using (true);
create policy "sticker_unlock_rules_write" on "public"."sticker_unlock_rules" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "stickers_read" on "public"."stickers" as PERMISSIVE for select using (true);
create policy "stickers_write" on "public"."stickers" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "template_objects_read" on "public"."template_objects" as PERMISSIVE for select using (true);
create policy "template_objects_write" on "public"."template_objects" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "time_capsule_draft_revisions_insert_garden_member" on "public"."time_capsule_draft_revisions" as PERMISSIVE for insert with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsule_draft_revisions_select_garden_member" on "public"."time_capsule_draft_revisions" as PERMISSIVE for select using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsule_drafts_delete_garden_member" on "public"."time_capsule_drafts" as PERMISSIVE for delete using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsule_drafts_insert_garden_member" on "public"."time_capsule_drafts" as PERMISSIVE for insert with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsule_drafts_select_garden_member" on "public"."time_capsule_drafts" as PERMISSIVE for select using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsule_drafts_update_garden_member" on "public"."time_capsule_drafts" as PERMISSIVE for update using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid())))) with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsules_insert_garden_member" on "public"."time_capsules" as PERMISSIVE for insert with check (((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))) AND (sealed_by = auth.uid())));
create policy "time_capsules_select_garden_member" on "public"."time_capsules" as PERMISSIVE for select using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "time_capsules_update_garden_member" on "public"."time_capsules" as PERMISSIVE for update using ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid())))) with check ((garden_id IN ( SELECT gm.garden_id
   FROM garden_members gm
  WHERE (gm.user_id = auth.uid()))));
create policy "timeline_milestone_rules_read" on "public"."timeline_milestone_rules" as PERMISSIVE for select using (true);
create policy "timeline_milestone_rules_write" on "public"."timeline_milestone_rules" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "timeline_view_config_read" on "public"."timeline_view_config" as PERMISSIVE for select using (true);
create policy "timeline_view_config_write" on "public"."timeline_view_config" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "ui_module_items_read" on "public"."ui_module_items" as PERMISSIVE for select using (true);
create policy "ui_module_items_write" on "public"."ui_module_items" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "ui_modules_read" on "public"."ui_modules" as PERMISSIVE for select using (true);
create policy "ui_modules_write" on "public"."ui_modules" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "ui_strings_read" on "public"."ui_strings" as PERMISSIVE for select using (true);
create policy "ui_strings_write" on "public"."ui_strings" as PERMISSIVE for all using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "user_notices_read_self" on "public"."user_notices" as PERMISSIVE for select using ((user_id = auth.uid()));
create policy "user_notices_update_self" on "public"."user_notices" as PERMISSIVE for update using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
create policy "year_cycle_states_insert_member" on "public"."year_cycle_states" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_cycle_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "year_cycle_states_read_member" on "public"."year_cycle_states" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_cycle_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "year_cycle_states_update_member" on "public"."year_cycle_states" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_cycle_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))))) with check (((EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_cycle_states.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text))))));
create policy "year_notes_delete_superadmin_strict" on "public"."year_notes" as PERMISSIVE for delete using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))));
create policy "year_notes_insert_garden_member_strict" on "public"."year_notes" as PERMISSIVE for insert with check (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "year_notes_read_garden_member_strict" on "public"."year_notes" as PERMISSIVE for select using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));
create policy "year_notes_update_garden_member_strict" on "public"."year_notes" as PERMISSIVE for update using (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL))))))) with check (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'superadmin'::text)))) OR ((garden_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM garden_members gm
  WHERE ((gm.garden_id = year_notes.garden_id) AND (gm.user_id = auth.uid()) AND (gm.left_at IS NULL)))))));

-- Triggers
-- --------
CREATE TRIGGER trg_annual_tree_growth_profiles_touch BEFORE UPDATE ON annual_tree_growth_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_annual_tree_snapshots_touch BEFORE UPDATE ON annual_tree_snapshots FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_calendar_rules_touch BEFORE UPDATE ON calendar_rules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_canvas_templates_touch BEFORE UPDATE ON canvas_templates FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_catalog_items_touch BEFORE UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_catalogs_touch BEFORE UPDATE ON catalogs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_flower_birth_ritual_ratings_sync_garden BEFORE INSERT OR UPDATE ON flower_birth_ritual_ratings FOR EACH ROW EXECUTE FUNCTION flower_birth_ritual_ratings_sync_garden_id();
CREATE TRIGGER trg_flower_birth_ritual_ratings_touch_updated_at BEFORE UPDATE ON flower_birth_ritual_ratings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_flower_birth_rituals_sync_garden BEFORE INSERT OR UPDATE ON flower_birth_rituals FOR EACH ROW EXECUTE FUNCTION flower_birth_rituals_sync_garden_id();
CREATE TRIGGER trg_flower_birth_rituals_touch_updated_at BEFORE UPDATE ON flower_birth_rituals FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_flower_page_revisions_sync_garden BEFORE INSERT OR UPDATE ON flower_page_revisions FOR EACH ROW EXECUTE FUNCTION flower_page_revisions_sync_garden_id();
CREATE TRIGGER trg_forest_assets_touch BEFORE UPDATE ON forest_assets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_forest_narrative_touch BEFORE UPDATE ON forest_narrative_templates FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_forest_theme_touch BEFORE UPDATE ON forest_theme FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_audio_session_participants_sync_garden BEFORE INSERT OR UPDATE ON garden_audio_session_participants FOR EACH ROW EXECUTE FUNCTION garden_audio_session_participants_sync_garden_id();
CREATE TRIGGER trg_garden_audio_session_participants_touch_updated_at BEFORE UPDATE ON garden_audio_session_participants FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_audio_sessions_sync_garden BEFORE INSERT OR UPDATE ON garden_audio_sessions FOR EACH ROW EXECUTE FUNCTION garden_audio_sessions_sync_garden_id();
CREATE TRIGGER trg_garden_audio_sessions_touch_updated_at BEFORE UPDATE ON garden_audio_sessions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_chat_attachments_sync_garden BEFORE INSERT OR UPDATE ON garden_chat_message_attachments FOR EACH ROW EXECUTE FUNCTION garden_chat_attachments_sync_garden_id();
CREATE TRIGGER trg_garden_chat_reactions_sync_room_garden BEFORE INSERT OR UPDATE ON garden_chat_message_reactions FOR EACH ROW EXECUTE FUNCTION garden_chat_reactions_sync_room_garden();
CREATE TRIGGER trg_garden_chat_messages_sync_garden BEFORE INSERT OR UPDATE ON garden_chat_messages FOR EACH ROW EXECUTE FUNCTION garden_chat_messages_sync_garden_id();
CREATE TRIGGER trg_garden_chat_messages_touch_updated_at BEFORE UPDATE ON garden_chat_messages FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_chat_read_states_sync_garden BEFORE INSERT OR UPDATE ON garden_chat_read_states FOR EACH ROW EXECUTE FUNCTION garden_chat_read_states_sync_garden_id();
CREATE TRIGGER trg_garden_chat_read_states_touch_updated_at BEFORE UPDATE ON garden_chat_read_states FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_chat_rooms_touch_updated_at BEFORE UPDATE ON garden_chat_rooms FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_plan_types_recompute_page_visual_state_delete AFTER DELETE ON garden_plan_types FOR EACH ROW EXECUTE FUNCTION tg_recompute_page_visual_state_from_plan_types();
CREATE TRIGGER trg_garden_plan_types_recompute_page_visual_state_write AFTER INSERT OR UPDATE OF code, label, category, flower_family, flower_asset_path, flower_builder_config, suggested_element, archived_at ON garden_plan_types FOR EACH ROW EXECUTE FUNCTION tg_recompute_page_visual_state_from_plan_types();
CREATE TRIGGER trg_garden_plan_types_touch_updated_at BEFORE UPDATE ON garden_plan_types FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_garden_year_tree_states_touch_updated_at BEFORE UPDATE ON garden_year_tree_states FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_gardens_seed_main_chat_room AFTER INSERT ON gardens FOR EACH ROW EXECUTE FUNCTION seed_main_chat_room_for_garden();
CREATE TRIGGER trg_map_places_touch_updated_at BEFORE UPDATE ON map_places FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_map_routes_touch_updated_at BEFORE UPDATE ON map_routes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_map_zones_touch_updated_at BEFORE UPDATE ON map_zones FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_page_visual_states_touch_updated_at BEFORE UPDATE ON page_visual_states FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_pages_fill_plan_type_from_linked_seed BEFORE INSERT OR UPDATE OF planned_from_seed_id ON pages FOR EACH ROW EXECUTE FUNCTION pages_fill_plan_type_from_linked_seed();
CREATE TRIGGER trg_pages_recompute_garden_year_tree_state_delete AFTER DELETE ON pages FOR EACH ROW EXECUTE FUNCTION tg_recompute_garden_year_tree_state_from_pages();
CREATE TRIGGER trg_pages_recompute_garden_year_tree_state_write AFTER INSERT OR UPDATE OF garden_id, date, rating, mood_state, is_favorite ON pages FOR EACH ROW EXECUTE FUNCTION tg_recompute_garden_year_tree_state_from_pages();
CREATE TRIGGER trg_pages_recompute_page_visual_state_delete AFTER DELETE ON pages FOR EACH ROW EXECUTE FUNCTION tg_recompute_page_visual_state_from_pages();
CREATE TRIGGER trg_pages_recompute_page_visual_state_write AFTER INSERT OR UPDATE OF garden_id, plan_type_id, element, rating, cover_photo_url, thumbnail_url ON pages FOR EACH ROW EXECUTE FUNCTION tg_recompute_page_visual_state_from_pages();
CREATE TRIGGER trg_pdf_layout_presets_touch BEFORE UPDATE ON pdf_layout_presets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_pdf_text_templates_touch BEFORE UPDATE ON pdf_text_templates FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_pdf_theme_assets_touch BEFORE UPDATE ON pdf_theme_assets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_pdf_themes_touch BEFORE UPDATE ON pdf_themes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_condition_unlocks_touch BEFORE UPDATE ON progression_condition_unlocks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_conditions_touch BEFORE UPDATE ON progression_conditions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_graph_state_touch BEFORE UPDATE ON progression_graph_state FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_reward_unlocks_touch BEFORE UPDATE ON progression_reward_unlocks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_rewards_touch BEFORE UPDATE ON progression_rewards FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_tree_nodes_touch BEFORE UPDATE ON progression_tree_nodes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_progression_tree_unlocks_recompute_garden_year_tree_state_d AFTER DELETE ON progression_tree_unlocks FOR EACH ROW EXECUTE FUNCTION tg_recompute_garden_year_tree_state_from_unlocks();
CREATE TRIGGER trg_progression_tree_unlocks_recompute_garden_year_tree_state_w AFTER INSERT OR UPDATE OF garden_id, claimed_at ON progression_tree_unlocks FOR EACH ROW EXECUTE FUNCTION tg_recompute_garden_year_tree_state_from_unlocks();
CREATE TRIGGER trg_progression_tree_unlocks_touch BEFORE UPDATE ON progression_tree_unlocks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_defaults_touch BEFORE UPDATE ON seed_defaults FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_event_reminder_deliveries_touch_updated_at BEFORE UPDATE ON seed_event_reminder_deliveries FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_attachments_touch_updated_at BEFORE UPDATE ON seed_preparation_attachments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_checklist_touch_updated_at BEFORE UPDATE ON seed_preparation_checklist_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_itinerary_touch_updated_at BEFORE UPDATE ON seed_preparation_itinerary_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_places_touch_updated_at BEFORE UPDATE ON seed_preparation_place_links FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_profiles_touch_updated_at BEFORE UPDATE ON seed_preparation_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_reservations_touch_updated_at BEFORE UPDATE ON seed_preparation_reservations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_stays_touch_updated_at BEFORE UPDATE ON seed_preparation_stays FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_stops_touch_updated_at BEFORE UPDATE ON seed_preparation_stops FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_preparation_transport_touch_updated_at BEFORE UPDATE ON seed_preparation_transport_legs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_status_flow_touch BEFORE UPDATE ON seed_status_flow FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seed_watering_confirmations_sync_garden BEFORE INSERT OR UPDATE ON seed_watering_confirmations FOR EACH ROW EXECUTE FUNCTION seed_watering_confirmations_sync_garden_id();
CREATE TRIGGER trg_seed_watering_confirmations_touch_updated_at BEFORE UPDATE ON seed_watering_confirmations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_seeds_sync_bloomed_page_plan_type AFTER INSERT OR UPDATE OF plan_type_id, bloomed_page_id ON seeds FOR EACH ROW EXECUTE FUNCTION sync_bloomed_page_plan_type_from_seed();
CREATE TRIGGER trg_sticker_pack_items_touch BEFORE UPDATE ON sticker_pack_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_sticker_packs_touch BEFORE UPDATE ON sticker_packs FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_sticker_unlock_rules_touch BEFORE UPDATE ON sticker_unlock_rules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_stickers_touch BEFORE UPDATE ON stickers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_template_objects_touch BEFORE UPDATE ON template_objects FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_timeline_milestone_rules_touch BEFORE UPDATE ON timeline_milestone_rules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_timeline_view_config_touch BEFORE UPDATE ON timeline_view_config FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_ui_module_items_touch BEFORE UPDATE ON ui_module_items FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_ui_modules_touch BEFORE UPDATE ON ui_modules FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_ui_strings_touch BEFORE UPDATE ON ui_strings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_year_cycle_states_touch_updated_at BEFORE UPDATE ON year_cycle_states FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

commit;


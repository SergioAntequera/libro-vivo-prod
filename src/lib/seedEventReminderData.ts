import type { SupabaseClient } from "@supabase/supabase-js";
import { toErrorMessage } from "@/lib/errorMessage";
import { withGardenScope } from "@/lib/gardens";
import type {
  SeedEventReminderRecipient,
  SeedEventSummaryAttachment,
  SeedEventSummaryModel,
  SeedEventSummaryPlaceRef,
  SeedEventSummaryRouteRef,
} from "@/lib/seedEventReminderTypes";
import type {
  SeedPreparationAttachmentKind,
  SeedPreparationDestinationKind,
} from "@/lib/seedPreparationTypes";

type SupabaseLikeClient = Pick<SupabaseClient, "from">;

type SeedRow = {
  id: string;
  garden_id: string;
  title: string | null;
  status: string | null;
  scheduled_date: string | null;
  element: string | null;
  notes: string | null;
  map_place_id: string | null;
  map_route_id: string | null;
  plan_type_id: string | null;
  created_by: string | null;
  created_at: string | null;
};

function asText(value: unknown) {
  return String(value ?? "").trim();
}

function asNullableText(value: unknown) {
  const next = asText(value);
  return next || null;
}

function asNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => asText(entry)).filter(Boolean)
    : [];
}

function formatPlaceLabel(place: { title?: unknown; subtitle?: unknown; address_label?: unknown }) {
  const title = asText(place.title);
  const subtitle = asNullableText(place.subtitle) ?? asNullableText(place.address_label);
  return subtitle ? `${title} - ${subtitle}` : title;
}

function formatRouteLabel(route: {
  title?: unknown;
  subtitle?: unknown;
  origin_label?: unknown;
  destination_label?: unknown;
}) {
  const title = asText(route.title);
  const subtitle =
    asNullableText(route.subtitle) ??
    [asNullableText(route.origin_label), asNullableText(route.destination_label)]
      .filter(Boolean)
      .join(" -> ");
  return subtitle ? `${title} - ${subtitle}` : title;
}

function maskTail(value: string | null | undefined, visibleEnd = 4) {
  const raw = asText(value);
  if (!raw) return null;
  if (raw.length <= visibleEnd) return "*".repeat(raw.length);
  return `${"*".repeat(Math.max(3, raw.length - visibleEnd))}${raw.slice(-visibleEnd)}`;
}

function attachmentKindLabel(kind: SeedPreparationAttachmentKind) {
  switch (kind) {
    case "passport":
      return "Pasaporte";
    case "dni":
      return "DNI";
    case "ticket":
      return "Billete";
    case "reservation":
      return "Reserva";
    case "insurance":
      return "Seguro";
    case "medical":
      return "Documento medico";
    default:
      return "Documento";
  }
}

function buildAttachmentSummary(input: {
  kind: SeedPreparationAttachmentKind;
  title: string | null;
  fileName: string | null;
  linkedKind: string | null;
  linkedRecordId: string | null;
  notes: string | null;
  id: string;
}): SeedEventSummaryAttachment {
  const sensitive = new Set<SeedPreparationAttachmentKind>([
    "passport",
    "dni",
    "insurance",
    "medical",
  ]);
  const title = input.title ?? input.fileName ?? attachmentKindLabel(input.kind);
  const titleMasked = sensitive.has(input.kind)
    ? `${attachmentKindLabel(input.kind)} ${maskTail(title, 4) ?? "****"}`
    : title;

  return {
    id: input.id,
    kind: input.kind,
    title,
    titleMasked,
    fileName: input.fileName,
    linkedKind: input.linkedKind ?? "seed",
    linkedRecordId: input.linkedRecordId,
    notes: input.notes,
  };
}

async function fetchRows(
  client: SupabaseLikeClient,
  table: string,
  columns: string,
  seedId: string,
  gardenId: string,
) {
  const { data, error } = await withGardenScope(
    client.from(table).select(columns).eq("seed_id", seedId),
    gardenId,
  );
  if (error) {
    throw new Error(toErrorMessage(error, `No se pudo leer ${table}.`));
  }
  return ((data as unknown as Record<string, unknown>[] | null) ?? []);
}

async function loadPlaceMap(
  client: SupabaseLikeClient,
  gardenId: string,
  placeIds: string[],
) {
  if (!placeIds.length) return new Map<string, SeedEventSummaryPlaceRef>();
  const { data, error } = await withGardenScope(
    client
      .from("map_places")
      .select("id,title,subtitle,address_label")
      .in("id", placeIds),
    gardenId,
  );
  if (error) {
    throw new Error(toErrorMessage(error, "No se pudieron leer lugares del recordatorio."));
  }
  return new Map(
    ((((data as unknown as Record<string, unknown>[] | null) ?? []))).map((row) => [
      asText(row.id),
      {
        id: asText(row.id),
        label: formatPlaceLabel(row),
      } satisfies SeedEventSummaryPlaceRef,
    ]),
  );
}

async function loadRouteMap(
  client: SupabaseLikeClient,
  gardenId: string,
  routeIds: string[],
) {
  if (!routeIds.length) return new Map<string, SeedEventSummaryRouteRef>();
  const { data, error } = await withGardenScope(
    client
      .from("map_routes")
      .select("id,title,subtitle,origin_label,destination_label")
      .in("id", routeIds),
    gardenId,
  );
  if (error) {
    throw new Error(toErrorMessage(error, "No se pudieron leer rutas del recordatorio."));
  }
  return new Map(
    ((((data as unknown as Record<string, unknown>[] | null) ?? []))).map((row) => [
      asText(row.id),
      {
        id: asText(row.id),
        label: formatRouteLabel(row),
      } satisfies SeedEventSummaryRouteRef,
    ]),
  );
}

export async function loadSeedEventSummaryModel(params: {
  client: SupabaseLikeClient;
  seedId: string;
  gardenId?: string | null;
}): Promise<SeedEventSummaryModel | null> {
  const { client, seedId, gardenId } = params;
  const { data: seedRow, error: seedError } = await withGardenScope(
    client
      .from("seeds")
      .select(
        "id,garden_id,title,status,scheduled_date,element,notes,map_place_id,map_route_id,plan_type_id,created_by,created_at",
      )
      .eq("id", seedId)
      .maybeSingle(),
    gardenId,
  );

  if (seedError) {
    throw new Error(toErrorMessage(seedError, "No se pudo leer la semilla del recordatorio."));
  }
  if (!seedRow) return null;

  const seed = seedRow as unknown as SeedRow;
  const scopedGardenId = asText(seed.garden_id);
  if (!scopedGardenId) return null;

  const [
    planTypeRes,
    profileRes,
    checklistRows,
    stopRows,
    transportRows,
    stayRows,
    placeLinkRows,
    itineraryRows,
    reservationRows,
    attachmentRows,
  ] = await Promise.all([
    seed.plan_type_id
      ? withGardenScope(
          client
            .from("garden_plan_types")
            .select("id,label,category")
            .eq("id", seed.plan_type_id)
            .maybeSingle(),
          scopedGardenId,
        )
      : Promise.resolve({ data: null, error: null }),
    withGardenScope(
      client
        .from("seed_preparation_profiles")
        .select(
          "seed_id,collaboration_mode,summary,destination_label,destination_kind,date_mode,starts_on,ends_on,budget_amount,budget_currency,budget_notes,goal_tags,shared_intention,why_this_trip,climate_context,primary_map_place_id,primary_map_route_id",
        )
        .eq("seed_id", seed.id)
        .maybeSingle(),
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_checklist_items",
      "id,category,label,owner,is_required,completed_at",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_stops",
      "id,title,base_place_id,starts_on,ends_on,notes,order_index",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_transport_legs",
      "id,title,from_label,to_label,starts_at,ends_at,transport_kind,provider_name,booking_url,reference_code,map_route_id,origin_place_id,destination_place_id,origin_stop_id,destination_stop_id,notes,order_index",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_stays",
      "id,stop_id,stay_kind,name,provider_name,booking_url,check_in_date,check_out_date,address_label,map_place_id,confirmation_code,notes,order_index",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_place_links",
      "id,stop_id,day_date,map_place_id,manual_title,priority,planning_state,linked_transport_leg_id,linked_route_id,notes,order_index",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_itinerary_items",
      "id,stop_id,day_date,time_label,duration_minutes,title,description,map_place_id,map_route_id,transport_leg_id,status,order_index",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_reservations",
      "id,stop_id,reservation_kind,title,provider_name,reservation_url,reference_code,amount,currency,starts_at,map_place_id,status,notes,order_index",
      seed.id,
      scopedGardenId,
    ),
    fetchRows(
      client,
      "seed_preparation_attachments",
      "id,attachment_kind,title,file_name,linked_kind,linked_record_id,notes,order_index",
      seed.id,
      scopedGardenId,
    ),
  ]);

  if (planTypeRes.error) {
    throw new Error(toErrorMessage(planTypeRes.error, "No se pudo leer el tipo de plan."));
  }
  if (profileRes.error) {
    throw new Error(toErrorMessage(profileRes.error, "No se pudo leer el resumen de preparacion."));
  }

  const profile = (profileRes.data as Record<string, unknown> | null) ?? null;
  const placeIds = new Set<string>();
  const routeIds = new Set<string>();

  [seed.map_place_id, profile?.primary_map_place_id]
    .map((value) => asNullableText(value))
    .filter(Boolean)
    .forEach((value) => placeIds.add(value as string));
  [seed.map_route_id, profile?.primary_map_route_id]
    .map((value) => asNullableText(value))
    .filter(Boolean)
    .forEach((value) => routeIds.add(value as string));

  for (const row of stopRows) {
    const placeId = asNullableText(row.base_place_id);
    if (placeId) placeIds.add(placeId);
  }
  for (const row of transportRows) {
    const routeId = asNullableText(row.map_route_id);
    const originPlaceId = asNullableText(row.origin_place_id);
    const destinationPlaceId = asNullableText(row.destination_place_id);
    if (routeId) routeIds.add(routeId);
    if (originPlaceId) placeIds.add(originPlaceId);
    if (destinationPlaceId) placeIds.add(destinationPlaceId);
  }
  for (const row of stayRows) {
    const placeId = asNullableText(row.map_place_id);
    if (placeId) placeIds.add(placeId);
  }
  for (const row of placeLinkRows) {
    const placeId = asNullableText(row.map_place_id);
    const routeId = asNullableText(row.linked_route_id);
    if (placeId) placeIds.add(placeId);
    if (routeId) routeIds.add(routeId);
  }
  for (const row of itineraryRows) {
    const placeId = asNullableText(row.map_place_id);
    const routeId = asNullableText(row.map_route_id);
    if (placeId) placeIds.add(placeId);
    if (routeId) routeIds.add(routeId);
  }
  for (const row of reservationRows) {
    const placeId = asNullableText(row.map_place_id);
    if (placeId) placeIds.add(placeId);
  }

  const [placeMap, routeMap] = await Promise.all([
    loadPlaceMap(client, scopedGardenId, [...placeIds]),
    loadRouteMap(client, scopedGardenId, [...routeIds]),
  ]);

  const stopTitleById = new Map(stopRows.map((row) => [asText(row.id), asText(row.title)]));
  const transportTitleById = new Map(
    transportRows.map((row) => [asText(row.id), asNullableText(row.title) ?? asNullableText(row.from_label) ?? "Trayecto"]),
  );

  const tripSignals =
    Boolean(profile) &&
    (
      Boolean(asNullableText(profile?.destination_label)) ||
      stopRows.length > 0 ||
      transportRows.length > 0 ||
      stayRows.length > 0 ||
      placeLinkRows.length > 0 ||
      itineraryRows.length > 0 ||
      reservationRows.length > 0
    );

  return {
    seed: {
      id: seed.id,
      gardenId: scopedGardenId,
      title: asNullableText(seed.title) ?? "Semilla",
      status: asNullableText(seed.status) ?? "",
      scheduledDate: asNullableText(seed.scheduled_date),
      element: asNullableText(seed.element),
      notes: asNullableText(seed.notes),
      mapPlaceId: asNullableText(seed.map_place_id),
      mapRouteId: asNullableText(seed.map_route_id),
      planTypeId: asNullableText(seed.plan_type_id),
      createdBy: asNullableText(seed.created_by),
      createdAt: asNullableText(seed.created_at) ?? new Date(0).toISOString(),
    },
    planTypeLabel: asNullableText((planTypeRes.data as Record<string, unknown> | null)?.label),
    linkedPlace: seed.map_place_id ? placeMap.get(seed.map_place_id) ?? null : null,
    linkedRoute: seed.map_route_id ? routeMap.get(seed.map_route_id) ?? null : null,
    isTripPreparation: tripSignals,
    tripBrief: profile
      ? {
          collaborationMode: asText(profile.collaboration_mode) === "shared" ? "shared" : "solo_for_now",
          summary: asNullableText(profile.summary),
          destinationLabel: asNullableText(profile.destination_label),
          destinationKind: asNullableText(profile.destination_kind) as SeedPreparationDestinationKind | null,
          dateMode:
            asText(profile.date_mode) === "date_range" || asText(profile.date_mode) === "flexible"
              ? (asText(profile.date_mode) as "date_range" | "flexible")
              : "single_day",
          startsOn: asNullableText(profile.starts_on),
          endsOn: asNullableText(profile.ends_on),
          budgetAmount: asNumberOrNull(profile.budget_amount),
          budgetCurrency: asNullableText(profile.budget_currency),
          budgetNotes: asNullableText(profile.budget_notes),
          goalTags: asStringArray(profile.goal_tags),
          sharedIntention: asNullableText(profile.shared_intention),
          whyThisTrip: asNullableText(profile.why_this_trip),
          climateContext: asNullableText(profile.climate_context),
          primaryPlace: profile.primary_map_place_id
            ? placeMap.get(asText(profile.primary_map_place_id)) ?? null
            : null,
          primaryRoute: profile.primary_map_route_id
            ? routeMap.get(asText(profile.primary_map_route_id)) ?? null
            : null,
        }
      : null,
    stops: stopRows.map((row) => ({
      id: asText(row.id),
      title: asText(row.title),
      startsOn: asNullableText(row.starts_on),
      endsOn: asNullableText(row.ends_on),
      notes: asNullableText(row.notes),
      basePlace: asNullableText(row.base_place_id)
        ? placeMap.get(asText(row.base_place_id)) ?? null
        : null,
    })),
    transportLegs: transportRows.map((row) => ({
      id: asText(row.id),
      title: asNullableText(row.title),
      fromLabel: asNullableText(row.from_label),
      toLabel: asNullableText(row.to_label),
      startsAt: asNullableText(row.starts_at),
      endsAt: asNullableText(row.ends_at),
      transportKind: asText(row.transport_kind) as SeedEventSummaryModel["transportLegs"][number]["transportKind"],
      providerName: asNullableText(row.provider_name),
      bookingUrl: asNullableText(row.booking_url),
      referenceCode: asNullableText(row.reference_code),
      referenceCodeMasked: maskTail(asNullableText(row.reference_code)),
      route: asNullableText(row.map_route_id)
        ? routeMap.get(asText(row.map_route_id)) ?? null
        : null,
      originPlace: asNullableText(row.origin_place_id)
        ? placeMap.get(asText(row.origin_place_id)) ?? null
        : null,
      destinationPlace: asNullableText(row.destination_place_id)
        ? placeMap.get(asText(row.destination_place_id)) ?? null
        : null,
      originStopTitle: asNullableText(row.origin_stop_id)
        ? stopTitleById.get(asText(row.origin_stop_id)) ?? null
        : null,
      destinationStopTitle: asNullableText(row.destination_stop_id)
        ? stopTitleById.get(asText(row.destination_stop_id)) ?? null
        : null,
      notes: asNullableText(row.notes),
    })),
    stays: stayRows.map((row) => ({
      id: asText(row.id),
      stayKind: asText(row.stay_kind) as SeedEventSummaryModel["stays"][number]["stayKind"],
      name: asText(row.name),
      providerName: asNullableText(row.provider_name),
      bookingUrl: asNullableText(row.booking_url),
      checkInDate: asNullableText(row.check_in_date),
      checkOutDate: asNullableText(row.check_out_date),
      addressLabel: asNullableText(row.address_label),
      place: asNullableText(row.map_place_id)
        ? placeMap.get(asText(row.map_place_id)) ?? null
        : null,
      confirmationCode: asNullableText(row.confirmation_code),
      confirmationCodeMasked: maskTail(asNullableText(row.confirmation_code)),
      stopTitle: asNullableText(row.stop_id) ? stopTitleById.get(asText(row.stop_id)) ?? null : null,
      notes: asNullableText(row.notes),
    })),
    placeLinks: placeLinkRows.map((row) => ({
      id: asText(row.id),
      dayDate: asNullableText(row.day_date),
      title:
        (asNullableText(row.map_place_id)
          ? placeMap.get(asText(row.map_place_id))?.label ?? null
          : null) ??
        asNullableText(row.manual_title) ??
        "Lugar",
      priority: asText(row.priority) as SeedEventSummaryModel["placeLinks"][number]["priority"],
      planningState: asText(row.planning_state) as SeedEventSummaryModel["placeLinks"][number]["planningState"],
      stopTitle: asNullableText(row.stop_id) ? stopTitleById.get(asText(row.stop_id)) ?? null : null,
      place: asNullableText(row.map_place_id)
        ? placeMap.get(asText(row.map_place_id)) ?? null
        : null,
      route: asNullableText(row.linked_route_id)
        ? routeMap.get(asText(row.linked_route_id)) ?? null
        : null,
      linkedTransportTitle: asNullableText(row.linked_transport_leg_id)
        ? transportTitleById.get(asText(row.linked_transport_leg_id)) ?? null
        : null,
      notes: asNullableText(row.notes),
    })),
    itineraryItems: itineraryRows.map((row) => ({
      id: asText(row.id),
      dayDate: asNullableText(row.day_date),
      timeLabel: asNullableText(row.time_label),
      durationMinutes: asNumberOrNull(row.duration_minutes),
      title: asText(row.title),
      description: asNullableText(row.description),
      status: asText(row.status) as SeedEventSummaryModel["itineraryItems"][number]["status"],
      stopTitle: asNullableText(row.stop_id) ? stopTitleById.get(asText(row.stop_id)) ?? null : null,
      place: asNullableText(row.map_place_id)
        ? placeMap.get(asText(row.map_place_id)) ?? null
        : null,
      route: asNullableText(row.map_route_id)
        ? routeMap.get(asText(row.map_route_id)) ?? null
        : null,
      transportTitle: asNullableText(row.transport_leg_id)
        ? transportTitleById.get(asText(row.transport_leg_id)) ?? null
        : null,
    })),
    reservations: reservationRows.map((row) => ({
      id: asText(row.id),
      reservationKind: asText(row.reservation_kind) as SeedEventSummaryModel["reservations"][number]["reservationKind"],
      title: asText(row.title),
      providerName: asNullableText(row.provider_name),
      reservationUrl: asNullableText(row.reservation_url),
      referenceCode: asNullableText(row.reference_code),
      referenceCodeMasked: maskTail(asNullableText(row.reference_code)),
      amount: asNumberOrNull(row.amount),
      currency: asNullableText(row.currency),
      startsAt: asNullableText(row.starts_at),
      status: asText(row.status) as SeedEventSummaryModel["reservations"][number]["status"],
      stopTitle: asNullableText(row.stop_id) ? stopTitleById.get(asText(row.stop_id)) ?? null : null,
      place: asNullableText(row.map_place_id)
        ? placeMap.get(asText(row.map_place_id)) ?? null
        : null,
      notes: asNullableText(row.notes),
    })),
    checklistItems: checklistRows.map((row) => ({
      id: asText(row.id),
      category: asText(row.category) as SeedEventSummaryModel["checklistItems"][number]["category"],
      label: asText(row.label),
      owner: asText(row.owner) as SeedEventSummaryModel["checklistItems"][number]["owner"],
      isRequired: row.is_required === true,
      completedAt: asNullableText(row.completed_at),
    })),
    attachments: attachmentRows.map((row) =>
      buildAttachmentSummary({
        id: asText(row.id),
        kind: asText(row.attachment_kind) as SeedPreparationAttachmentKind,
        title: asNullableText(row.title),
        fileName: asNullableText(row.file_name),
        linkedKind: asNullableText(row.linked_kind),
        linkedRecordId: asNullableText(row.linked_record_id),
        notes: asNullableText(row.notes),
      }),
    ),
  };
}

export async function loadSeedEventReminderRecipients(params: {
  client: SupabaseClient;
  gardenId: string;
}) {
  const { client, gardenId } = params;
  const { data: memberRows, error: memberError } = await client
    .from("garden_members")
    .select("user_id")
    .eq("garden_id", gardenId)
    .is("left_at", null);

  if (memberError) {
    throw new Error(
      toErrorMessage(memberError, "No se pudieron leer las personas del jardin para el recordatorio."),
    );
  }

  const userIds = (((memberRows as Array<{ user_id?: unknown }> | null) ?? []))
    .map((row) => asText(row.user_id))
    .filter(Boolean);

  if (!userIds.length) return [] as SeedEventReminderRecipient[];

  const { data: profileRows, error: profileError } = await client
    .from("profiles")
    .select("id,name,last_name")
    .in("id", userIds);

  if (profileError) {
    throw new Error(
      toErrorMessage(profileError, "No se pudieron leer los perfiles del recordatorio."),
    );
  }

  const profileById = new Map(
    (((profileRows as Array<Record<string, unknown>> | null) ?? [])).map((row) => [
      asText(row.id),
      [asNullableText(row.name), asNullableText(row.last_name)].filter(Boolean).join(" ") || null,
    ]),
  );

  const users = await Promise.all(
    userIds.map(async (userId) => {
      const { data, error } = await client.auth.admin.getUserById(userId);
      if (error) {
        throw new Error(
          toErrorMessage(error, `No se pudo leer el usuario ${userId} para el recordatorio.`),
        );
      }
      const email = asNullableText(data.user?.email);
      if (!email) return null;
      return {
        userId,
        email,
        name: profileById.get(userId) ?? null,
      } satisfies SeedEventReminderRecipient;
    }),
  );

  return users.filter((user): user is SeedEventReminderRecipient => user !== null);
}

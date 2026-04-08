import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import {
  isSchemaNotReadyError,
  resolveActiveGardenIdForUser,
  withGardenIdOnInsert,
  withGardenScope,
} from "@/lib/gardens";
import { toErrorMessage } from "@/lib/errorMessage";
import {
  getTimeCapsuleContentBlockDefinition,
  normalizeTimeCapsuleDraftBlocks,
  normalizeTimeCapsuleDraftRevisionRow,
  normalizeTimeCapsuleDraftRow,
  TIME_CAPSULE_WINDOWS,
  type TimeCapsuleDraftBlock,
  type TimeCapsuleDraftPersistedSnapshot,
  type TimeCapsuleDraftRevisionChangeField,
  type TimeCapsuleDraftRevisionRow,
  type TimeCapsuleDraftRow,
  type TimeCapsuleWindow,
} from "@/lib/timeCapsuleModel";

type DraftApiResponse = {
  draft: TimeCapsuleDraftRow | null;
  revisions: TimeCapsuleDraftRevisionRow[];
  revisionsEnabled: boolean;
};

function parseCapsuleYear(req: Request) {
  const value = new URL(req.url).searchParams.get("year");
  const parsed = Number(value);
  const fallback = new Date().getUTCFullYear();
  if (!Number.isFinite(parsed) || parsed < 2000) return fallback;
  return Math.round(parsed);
}

function yearBounds(year: number) {
  return {
    yearStart: `${year}-01-01T00:00:00.000Z`,
    nextYearStart: `${year + 1}-01-01T00:00:00.000Z`,
  };
}

function buildSnapshot(input: {
  title: string;
  windowCode: TimeCapsuleWindow;
  blocks: TimeCapsuleDraftBlock[];
}): TimeCapsuleDraftPersistedSnapshot {
  return {
    title: input.title,
    windowCode: input.windowCode,
    blocks: normalizeTimeCapsuleDraftBlocks(input.blocks),
  };
}

function serializeSnapshot(snapshot: TimeCapsuleDraftPersistedSnapshot) {
  return JSON.stringify({
    title: snapshot.title,
    windowCode: snapshot.windowCode,
    blocks: snapshot.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      value: block.value,
      caption: block.caption,
      mediaUrl: block.mediaUrl,
      canvasObjects: block.canvasObjects,
    })),
  });
}

function buildChangeFields(previous: TimeCapsuleDraftBlock, next: TimeCapsuleDraftBlock) {
  const fields: TimeCapsuleDraftRevisionChangeField[] = [];
  if (previous.kind !== next.kind) fields.push("kind");
  if (previous.value !== next.value) fields.push("value");
  if (previous.caption !== next.caption) fields.push("caption");
  if ((previous.mediaUrl ?? "") !== (next.mediaUrl ?? "")) fields.push("media");
  if (JSON.stringify(previous.canvasObjects) !== JSON.stringify(next.canvasObjects)) {
    fields.push("canvas");
  }
  return fields;
}

function buildRevisionSummary(
  previous: TimeCapsuleDraftPersistedSnapshot | null,
  next: TimeCapsuleDraftPersistedSnapshot,
) {
  const previousBlocks = previous?.blocks ?? [];
  const previousById = new Map(previousBlocks.map((block, index) => [block.id, { block, index }]));
  const nextById = new Map(next.blocks.map((block, index) => [block.id, { block, index }]));

  const added = next.blocks
    .filter((block) => !previousById.has(block.id))
    .map((block) => ({
      id: block.id,
      kind: block.kind,
      label: getTimeCapsuleContentBlockDefinition(block.kind).label,
      fields: [] satisfies TimeCapsuleDraftRevisionChangeField[],
    }));

  const removed = previousBlocks
    .filter((block) => !nextById.has(block.id))
    .map((block) => ({
      id: block.id,
      kind: block.kind,
      label: getTimeCapsuleContentBlockDefinition(block.kind).label,
      fields: [] satisfies TimeCapsuleDraftRevisionChangeField[],
    }));

  const changed = next.blocks.flatMap((block, index) => {
    const previousMatch = previousById.get(block.id);
    if (!previousMatch) return [];
    const fields = buildChangeFields(previousMatch.block, block);
    if (previousMatch.index !== index) fields.push("order");
    if (!fields.length) return [];
    return [
      {
        id: block.id,
        kind: block.kind,
        label: getTimeCapsuleContentBlockDefinition(block.kind).label,
        fields,
      },
    ];
  });

  return {
    titleChanged: previous ? previous.title !== next.title : false,
    windowChanged: previous ? previous.windowCode !== next.windowCode : false,
    added,
    removed,
    changed,
  };
}

function revisionHasChanges(summary: ReturnType<typeof buildRevisionSummary>) {
  return (
    summary.titleChanged ||
    summary.windowChanged ||
    summary.added.length > 0 ||
    summary.removed.length > 0 ||
    summary.changed.length > 0
  );
}

async function resolveActorName(input: {
  client: ReturnType<typeof requireAuthenticatedRoute> extends Promise<infer T>
    ? T extends { ok: true; client: infer C }
      ? C
      : never
    : never;
  userId: string;
}) {
  const { data, error } = await input.client
    .from("profiles")
    .select("name")
    .eq("id", input.userId)
    .maybeSingle();

  if (error) return null;
  const name = String((data as { name?: string | null } | null)?.name ?? "").trim();
  return name || null;
}

async function queryRecentRevisions(input: {
  client: ReturnType<typeof requireAuthenticatedRoute> extends Promise<infer T>
    ? T extends { ok: true; client: infer C }
      ? C
      : never
    : never;
  gardenId: string;
  year: number;
}) {
  const { data, error } = await withGardenScope(
    input.client
      .from("time_capsule_draft_revisions")
      .select("*")
      .eq("capsule_year", input.year)
      .order("created_at", { ascending: false })
      .limit(10),
    input.gardenId,
  );

  if (error) {
    if (isSchemaNotReadyError(error)) {
      return {
        enabled: false,
        revisions: [] as TimeCapsuleDraftRevisionRow[],
      };
    }
    throw new Error(toErrorMessage(error, "No se pudo cargar la actividad del borrador."));
  }

  return {
    enabled: true,
    revisions: (((data as TimeCapsuleDraftRevisionRow[] | null) ?? [])).map((row) =>
      normalizeTimeCapsuleDraftRevisionRow(
        row as Partial<TimeCapsuleDraftRevisionRow> & Record<string, unknown>,
        row.id,
      ),
    ),
  };
}

async function hasSealedCapsuleForYear(input: {
  client: ReturnType<typeof requireAuthenticatedRoute> extends Promise<infer T>
    ? T extends { ok: true; client: infer C }
      ? C
      : never
    : never;
  gardenId: string;
  year: number;
}) {
  const { yearStart, nextYearStart } = yearBounds(input.year);
  const res = await withGardenScope(
    input.client
      .from("time_capsules")
      .select("id")
      .gte("sealed_at", yearStart)
      .lt("sealed_at", nextYearStart)
      .limit(1),
    input.gardenId,
  );

  if (res.error && !isSchemaNotReadyError(res.error)) {
    throw new Error(toErrorMessage(res.error, "No se pudo comprobar la capsula anual."));
  }

  return (((res.data as Array<{ id: string }> | null) ?? []).length ?? 0) > 0;
}

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const year = parseCapsuleYear(req);
    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json(
        {
          draft: null,
          revisions: [] satisfies TimeCapsuleDraftRevisionRow[],
          revisionsEnabled: false,
        },
        { status: 200 },
      );
    }

    if (await hasSealedCapsuleForYear({ client: auth.client, gardenId, year })) {
      return NextResponse.json(
        {
          draft: null,
          revisions: [] satisfies TimeCapsuleDraftRevisionRow[],
          revisionsEnabled: true,
        },
        { status: 200 },
      );
    }

    const { data, error } = await withGardenScope(
      auth.client
        .from("time_capsule_drafts")
        .select("*")
        .eq("capsule_year", year)
        .maybeSingle(),
      gardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json(
          {
            draft: null,
            revisions: [] satisfies TimeCapsuleDraftRevisionRow[],
            revisionsEnabled: false,
          },
          { status: 200 },
        );
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo cargar el borrador de la capsula.") },
        { status: 500 },
      );
    }

    const revisionResult = await queryRecentRevisions({
      client: auth.client,
      gardenId,
      year,
    }).catch((error) => {
      if (isSchemaNotReadyError(error)) {
        return {
          enabled: false,
          revisions: [] as TimeCapsuleDraftRevisionRow[],
        };
      }
      throw error;
    });

    if (!data) {
      return NextResponse.json(
        {
          draft: null,
          revisions: revisionResult.revisions,
          revisionsEnabled: revisionResult.enabled,
        } satisfies DraftApiResponse,
        { status: 200 },
      );
    }

    return NextResponse.json({
      draft: normalizeTimeCapsuleDraftRow(
        data as Partial<TimeCapsuleDraftRow> & Record<string, unknown>,
        (data as { id?: string } | null)?.id ?? crypto.randomUUID(),
      ),
      revisions: revisionResult.revisions,
      revisionsEnabled: revisionResult.enabled,
    } satisfies DraftApiResponse);
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo cargar el borrador de la capsula.") },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json(
        { error: "No hay jardin activo. Crea o unete a un jardin primero." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const year = Number(body.year);
    const capsuleYear =
      Number.isFinite(year) && year >= 2000 ? Math.round(year) : new Date().getUTCFullYear();

    if (await hasSealedCapsuleForYear({ client: auth.client, gardenId, year: capsuleYear })) {
      return NextResponse.json(
        { error: "La capsula anual de este año ya esta sellada." },
        { status: 409 },
      );
    }

    const title = typeof body.title === "string" ? body.title : "";
    const windowCode: TimeCapsuleWindow =
      typeof body.windowCode === "string" &&
      TIME_CAPSULE_WINDOWS.some((window) => window.code === body.windowCode)
        ? (body.windowCode as TimeCapsuleWindow)
        : "1y";
    const contentBlocks = normalizeTimeCapsuleDraftBlocks(body.contentBlocks);
    const nextSnapshot = buildSnapshot({ title, windowCode, blocks: contentBlocks });

    const existing = await withGardenScope(
      auth.client
        .from("time_capsule_drafts")
        .select("*")
        .eq("capsule_year", capsuleYear)
        .maybeSingle(),
      gardenId,
    );

    if (existing.error && !isSchemaNotReadyError(existing.error)) {
      return NextResponse.json(
        { error: toErrorMessage(existing.error, "No se pudo preparar el borrador.") },
        { status: 500 },
      );
    }

    const previousDraft = existing.data
      ? normalizeTimeCapsuleDraftRow(
          existing.data as Partial<TimeCapsuleDraftRow> & Record<string, unknown>,
          (existing.data as { id?: string } | null)?.id ?? crypto.randomUUID(),
        )
      : null;
    const previousSnapshot = previousDraft
      ? buildSnapshot({
          title: previousDraft.title,
          windowCode: previousDraft.window_code,
          blocks: previousDraft.content_blocks,
        })
      : null;

    const timestamp = new Date().toISOString();
    let persistedDraft: TimeCapsuleDraftRow;

    if (previousDraft?.id) {
      const { data, error } = await withGardenScope(
        auth.client
          .from("time_capsule_drafts")
          .update({
            title,
            window_code: windowCode,
            content_blocks: contentBlocks,
            updated_by: auth.userId,
            updated_at: timestamp,
          })
          .eq("id", previousDraft.id)
          .select("*")
          .single(),
        gardenId,
      );

      if (error) {
        if (isSchemaNotReadyError(error)) {
          return NextResponse.json(
            { error: "Falta aplicar la tabla canonica de borradores de capsula." },
            { status: 503 },
          );
        }
        return NextResponse.json(
          { error: toErrorMessage(error, "No se pudo guardar el borrador de la capsula.") },
          { status: 500 },
        );
      }

      persistedDraft = normalizeTimeCapsuleDraftRow(
        data as Partial<TimeCapsuleDraftRow> & Record<string, unknown>,
        (data as { id?: string } | null)?.id ?? crypto.randomUUID(),
      );
    } else {
      const insertPayload = withGardenIdOnInsert(
        {
          capsule_year: capsuleYear,
          title,
          window_code: windowCode,
          content_blocks: contentBlocks,
          created_by: auth.userId,
          updated_by: auth.userId,
          updated_at: timestamp,
        },
        gardenId,
      );

      const { data, error } = await auth.client
        .from("time_capsule_drafts")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) {
        if (isSchemaNotReadyError(error)) {
          return NextResponse.json(
            { error: "Falta aplicar la tabla canonica de borradores de capsula." },
            { status: 503 },
          );
        }
        return NextResponse.json(
          { error: toErrorMessage(error, "No se pudo guardar el borrador de la capsula.") },
          { status: 500 },
        );
      }

      persistedDraft = normalizeTimeCapsuleDraftRow(
        data as Partial<TimeCapsuleDraftRow> & Record<string, unknown>,
        (data as { id?: string } | null)?.id ?? crypto.randomUUID(),
      );
    }

    const shouldWriteRevision =
      serializeSnapshot(nextSnapshot) !== serializeSnapshot(previousSnapshot ?? buildSnapshot({
        title: "",
        windowCode: "1y",
        blocks: [],
      }));

    if (shouldWriteRevision) {
      const summary = buildRevisionSummary(previousSnapshot, nextSnapshot);
      if (revisionHasChanges(summary)) {
        const actorName = await resolveActorName({ client: auth.client, userId: auth.userId });
        const revisionPayload = withGardenIdOnInsert(
          {
            draft_id: persistedDraft.id,
            capsule_year: capsuleYear,
            snapshot: nextSnapshot,
            summary,
            actor_user_id: auth.userId,
            actor_name: actorName,
          },
          gardenId,
        );

        const { error } = await auth.client
          .from("time_capsule_draft_revisions")
          .insert(revisionPayload);

        if (error && !isSchemaNotReadyError(error)) {
          console.warn("[capsules:draft] no se pudo registrar revision:", error);
        }
      }
    }

    const revisionResult = await queryRecentRevisions({
      client: auth.client,
      gardenId,
      year: capsuleYear,
    }).catch((error) => {
      if (isSchemaNotReadyError(error)) {
        return {
          enabled: false,
          revisions: [] as TimeCapsuleDraftRevisionRow[],
        };
      }
      throw error;
    });

    return NextResponse.json({
      draft: persistedDraft,
      revisions: revisionResult.revisions,
      revisionsEnabled: revisionResult.enabled,
    } satisfies DraftApiResponse);
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo guardar el borrador de la capsula.") },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  try {
    const year = parseCapsuleYear(req);
    const gardenId = await resolveActiveGardenIdForUser({
      userId: auth.userId,
      client: auth.client,
    });
    if (!gardenId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { error } = await withGardenScope(
      auth.client.from("time_capsule_drafts").delete().eq("capsule_year", year),
      gardenId,
    );

    if (error) {
      if (isSchemaNotReadyError(error)) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      return NextResponse.json(
        { error: toErrorMessage(error, "No se pudo limpiar el borrador de la capsula.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudo limpiar el borrador de la capsula.") },
      { status: 500 },
    );
  }
}

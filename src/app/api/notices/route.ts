import { NextResponse } from "next/server";
import { requireAuthenticatedRoute } from "@/lib/serverRouteAuth";
import { toErrorMessage } from "@/lib/errorMessage";
import { normalizeUserNoticeRow, type UserNotice } from "@/lib/userNotices";

type NoticeRow = {
  id?: unknown;
  user_id?: unknown;
  kind?: unknown;
  garden_id?: unknown;
  title?: unknown;
  message?: unknown;
  created_at?: unknown;
  read_at?: unknown;
  metadata?: unknown;
};

type UpdateBody = {
  noticeIds?: unknown;
};

export async function GET(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.client
    .from("user_notices")
    .select("id,user_id,kind,garden_id,title,message,created_at,read_at,metadata")
    .eq("user_id", auth.userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudieron cargar los avisos.") },
      { status: 500 },
    );
  }

  const notices = ((data as NoticeRow[] | null) ?? [])
    .map((row) => normalizeUserNoticeRow(row))
    .filter((row): row is UserNotice => row !== null);

  return NextResponse.json({ notices });
}

export async function PATCH(req: Request) {
  const auth = await requireAuthenticatedRoute(req);
  if (!auth.ok) return auth.response;

  let body: UpdateBody = {};
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const noticeIds = Array.isArray(body.noticeIds)
    ? body.noticeIds
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    : [];

  if (!noticeIds.length) {
    return NextResponse.json(
      { error: "Indica al menos un aviso para marcarlo como leido." },
      { status: 400 },
    );
  }

  const { error } = await auth.client
    .from("user_notices")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.userId)
    .in("id", noticeIds)
    .is("read_at", null);

  if (error) {
    return NextResponse.json(
      { error: toErrorMessage(error, "No se pudieron actualizar los avisos.") },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, noticeIds });
}

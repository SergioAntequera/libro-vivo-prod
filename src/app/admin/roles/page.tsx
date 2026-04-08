"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSuperadminOrRedirect, getSessionAccessToken } from "@/lib/auth";
import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { isAppRole, roleLabel, type AppRole } from "@/lib/roles";
import { StatusNotice } from "@/components/ui/StatusNotice";

type AdminProfile = {
  id: string;
  name: string | null;
  role: AppRole;
  avatar_url: string | null;
};

type RoleOption = {
  role: AppRole;
  label: string;
};

type RolesResponse = {
  error?: string;
  profiles?: AdminProfile[];
  roles?: RoleOption[];
};

type PatchRoleResponse = {
  error?: string;
  profile?: AdminProfile;
  unchanged?: boolean;
};

function rolePillClass(role: AppRole) {
  if (role === "superadmin") return "bg-[#fff4dc] text-[#7a4e00] border-[#e8c16c]";
  if (role === "gardener_b") return "bg-[#edf4ff] text-[#15417a] border-[#a7c0e7]";
  return "bg-[#eef8ed] text-[#205b2e] border-[#a8d4a0]";
}

function buildRoleCounts(profiles: AdminProfile[]) {
  return {
    superadmin: profiles.filter((row) => row.role === "superadmin").length,
    gardenerA: profiles.filter((row) => row.role === "gardener_a").length,
    gardenerB: profiles.filter((row) => row.role === "gardener_b").length,
  };
}

export default function AdminRolesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [draftById, setDraftById] = useState<Record<string, AppRole>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");

  useEffect(() => {
    (async () => {
      const session = await ensureSuperadminOrRedirect(router);
      if (!session) {
        setLoading(false);
        return;
      }

      const token = await getSessionAccessToken();
      if (!token) {
        setMsg("Sesión sin access token. Cierra y vuelve a entrar.");
        setLoading(false);
        return;
      }

      setAccessToken(token);
      await refresh(token);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh(token: string | null = accessToken) {
    if (!token) return;
    setMsg(null);

    const response = await fetch("/api/admin/roles", {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await response.json()) as RolesResponse;
    if (!response.ok) {
      setMsg(payload.error ?? "No se pudieron cargar los roles.");
      setProfiles([]);
      return;
    }

    const nextProfiles = (payload.profiles ?? []).slice();
    nextProfiles.sort((a, b) => {
      const an = (a.name ?? "").toLowerCase();
      const bn = (b.name ?? "").toLowerCase();
      if (an && bn) return an.localeCompare(bn, "es");
      if (an) return -1;
      if (bn) return 1;
      return a.id.localeCompare(b.id, "es");
    });

    const roleOptions = (payload.roles ?? []).filter((row) => isAppRole(row.role));
    const nextDrafts: Record<string, AppRole> = {};
    for (const row of nextProfiles) {
      nextDrafts[row.id] = row.role;
    }

    setProfiles(nextProfiles);
    setRoles(roleOptions);
    setDraftById(nextDrafts);
  }

  async function saveRole(profileId: string) {
    if (!accessToken) return;
    const current = profiles.find((row) => row.id === profileId);
    const nextRole = draftById[profileId];
    if (!current || !nextRole || current.role === nextRole) return;

    setSavingId(profileId);
    setMsg(null);

    try {
      const response = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ profileId, role: nextRole }),
      });

      const payload = (await response.json()) as PatchRoleResponse;
      if (!response.ok) {
        setMsg(payload.error ?? "No se pudo actualizar el rol.");
        return;
      }

      const updatedProfile = payload.profile;
      if (updatedProfile) {
        setProfiles((prev) =>
          prev.map((row) => (row.id === updatedProfile.id ? updatedProfile : row)),
        );
        setDraftById((prev) => ({
          ...prev,
          [updatedProfile.id]: updatedProfile.role,
        }));
      }

      if (!payload.unchanged) {
        setMsg("Rol actualizado correctamente.");
      }
    } finally {
      setSavingId((currentId) => (currentId === profileId ? null : currentId));
    }
  }

  const roleCounts = useMemo(() => buildRoleCounts(profiles), [profiles]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (!q) return true;
      const bag = `${row.name ?? ""} ${row.id} ${row.role}`.toLowerCase();
      return bag.includes(q);
    });
  }, [profiles, roleFilter, search]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 text-slate-900 bg-[#f6f6f6]">
        <div className="max-w-5xl mx-auto rounded-3xl border bg-white p-5 shadow-sm">
          Cargando roles...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-slate-900 bg-[#f6f6f6]">
      <div className="max-w-5xl mx-auto space-y-4">
        <AdminPageHero
          title="Admin: Roles y acceso"
          description="Gestiona los perfiles base del jardín y quien tiene cada rol. Esta pantalla es operativa y sensible: conviene cambiar permisos con criterio y validar el resultado al momento."
          actions={
            <>
              <button
                className="rounded-2xl border px-4 py-2"
                onClick={() => void refresh()}
              >
                Recargar
              </button>
              <button
                className="rounded-2xl border px-4 py-2"
                onClick={() => router.push("/admin")}
              >
                Volver al indice
              </button>
            </>
          }
          stats={[
            { label: "Superadmin", value: String(roleCounts.superadmin) },
            { label: "Gardener A", value: String(roleCounts.gardenerA) },
            { label: "Gardener B", value: String(roleCounts.gardenerB) },
            { label: "Perfiles", value: String(profiles.length) },
          ]}
          noticeTitle="Qué toca aquí"
          noticeBody="Cambia quien puede administrar el sistema y quien participa como miembro del jardín. No toca semillas, mapas o visuals; solo acceso y permisos."
        />

        <div className="rounded-3xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="rounded-2xl border p-3 md:col-span-2"
              placeholder="Buscar por nombre, id o rol..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-2xl border p-3"
              value={roleFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "all" || isAppRole(value)) {
                  setRoleFilter(value);
                }
              }}
            >
              <option value="all">Todos los roles</option>
              {roles.map((row) => (
                <option key={row.role} value={row.role}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>
          {msg && <StatusNotice message={msg} className="mt-3" />}
        </div>

        <div className="rounded-3xl border bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b text-xs uppercase tracking-wide opacity-70">
            <div className="col-span-4 md:col-span-5">Perfil</div>
            <div className="col-span-3 md:col-span-2">Rol actual</div>
            <div className="col-span-3 md:col-span-3">Nuevo rol</div>
            <div className="col-span-2">Accion</div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="p-5 text-sm">No hay perfiles para este filtro.</div>
          ) : (
            <div className="divide-y">
              {filteredProfiles.map((profile) => {
                const draft = draftById[profile.id] ?? profile.role;
                const dirty = draft !== profile.role;
                const isSaving = savingId === profile.id;

                return (
                  <div
                    key={profile.id}
                    className="grid grid-cols-12 gap-2 items-center px-4 py-3"
                  >
                    <div className="col-span-4 md:col-span-5">
                      <p className="font-medium">{profile.name ?? "Sin nombre"}</p>
                      <p className="text-xs opacity-60 break-all">{profile.id}</p>
                    </div>

                    <div className="col-span-3 md:col-span-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs ${rolePillClass(profile.role)}`}
                      >
                        {roleLabel(profile.role)}
                      </span>
                    </div>

                    <div className="col-span-3 md:col-span-3">
                      <select
                        className="w-full rounded-xl border p-2 text-sm"
                        value={draft}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!isAppRole(value)) return;
                          setDraftById((prev) => ({
                            ...prev,
                            [profile.id]: value,
                          }));
                        }}
                        disabled={isSaving}
                      >
                        {roles.map((option) => (
                          <option key={option.role} value={option.role}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <button
                        className="w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
                        onClick={() => void saveRole(profile.id)}
                        disabled={!dirty || isSaving}
                      >
                        {isSaving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

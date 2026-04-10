import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./_load-env.mjs";

const EXPECTED_DEV_REF = "guvqsuyhdqrsbhwxwzjd";
const PROD_REF = "wmmaxlykngeszwvvifqj";

const QA_USERS = [
  {
    email: "qa.sergio@libro-vivo.dev",
    password: "LibroVivoQA2026!",
    name: "Sergio QA",
    role: "gardener_a",
  },
  {
    email: "qa.carmen@libro-vivo.dev",
    password: "LibroVivoQA2026!",
    name: "Carmen QA",
    role: "gardener_b",
  },
];

const RESET_ROOT_TABLES = [
  "public.profiles",
  "public.gardens",
  "public.bonds",
  "public.user_notices",
  "public.calendar_rules",
];

function getProjectRef(url) {
  return /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(String(url ?? ""))?.[1] ?? "";
}

function buildPoolerConnectionString(dbUrl, projectRef) {
  const parsed = new URL(dbUrl);
  return `postgresql://postgres.${projectRef}:${parsed.password}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
}

async function listAllUsers(admin) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;

    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }

  return users;
}

function compactCounts(rows) {
  return Object.fromEntries(rows.map((row) => [row.table_name, Number(row.row_count)]));
}

async function countUserData(client) {
  const { rows } = await client.query(`
    with target(table_name) as (
      values
        ('profiles'),
        ('gardens'),
        ('garden_members'),
        ('garden_invitations'),
        ('bonds'),
        ('bond_members'),
        ('pages'),
        ('seeds'),
        ('garden_chat_rooms'),
        ('garden_chat_messages'),
        ('time_capsules'),
        ('user_notices')
    )
    select
      target.table_name,
      (
        select count(*)
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = target.table_name
      ) as table_exists,
      case target.table_name
        when 'profiles' then (select count(*) from public.profiles)
        when 'gardens' then (select count(*) from public.gardens)
        when 'garden_members' then (select count(*) from public.garden_members)
        when 'garden_invitations' then (select count(*) from public.garden_invitations)
        when 'bonds' then (select count(*) from public.bonds)
        when 'bond_members' then (select count(*) from public.bond_members)
        when 'pages' then (select count(*) from public.pages)
        when 'seeds' then (select count(*) from public.seeds)
        when 'garden_chat_rooms' then (select count(*) from public.garden_chat_rooms)
        when 'garden_chat_messages' then (select count(*) from public.garden_chat_messages)
        when 'time_capsules' then (select count(*) from public.time_capsules)
        when 'user_notices' then (select count(*) from public.user_notices)
      end as row_count
    from target
    order by target.table_name;
  `);
  return compactCounts(rows);
}

function makeInviteCode(seed) {
  return seed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8)
    .padEnd(8, "X");
}

async function ensureProfiles(client, createdUsers) {
  for (const qaUser of QA_USERS) {
    const created = createdUsers.find((user) => user.email === qaUser.email);
    if (!created?.id) {
      throw new Error(`No se encontro user id para ${qaUser.email}`);
    }

    await client.query(
      `
        insert into public.profiles (id, name, role, created_at, active_garden_id, invite_code)
        values ($1::uuid, $2, $3, now(), null, $4)
        on conflict (id) do update
        set
          name = excluded.name,
          role = excluded.role,
          active_garden_id = null,
          invite_code = coalesce(public.profiles.invite_code, excluded.invite_code)
      `,
      [created.id, qaUser.name, qaUser.role, makeInviteCode(qaUser.name)],
    );
  }
}

async function run() {
  await loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const dbUrl = process.env.SUPABASE_DB_URL ?? "";
  const projectRef = getProjectRef(supabaseUrl);

  if (projectRef !== EXPECTED_DEV_REF) {
    throw new Error(
      `Guardia de seguridad: esperaba dev ref ${EXPECTED_DEV_REF}, recibido ${projectRef || "(vacio)"}. No borro nada.`,
    );
  }
  if (projectRef === PROD_REF) {
    throw new Error("Guardia de seguridad: esto apunta a produccion. No borro nada.");
  }
  if (!serviceRoleKey || !dbUrl) {
    throw new Error("Faltan SUPABASE_SERVICE_ROLE_KEY o SUPABASE_DB_URL.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const db = new Client({
    connectionString: buildPoolerConnectionString(dbUrl, projectRef),
    ssl: { rejectUnauthorized: false },
  });

  await db.connect();

  const before = await countUserData(db);
  const existingUsers = await listAllUsers(admin);

  await db.query("begin");
  try {
    await db.query(`truncate table ${RESET_ROOT_TABLES.join(", ")} cascade`);
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  }

  let deletedAuthUsers = 0;
  for (const user of existingUsers) {
    if (!user.id) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    deletedAuthUsers += 1;
  }

  const createdUsers = [];
  for (const qaUser of QA_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: qaUser.email,
      password: qaUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: qaUser.name,
        name: qaUser.name,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error(`Supabase no devolvio user para ${qaUser.email}`);
    createdUsers.push(data.user);
  }

  await ensureProfiles(db, createdUsers);

  const after = await countUserData(db);
  await db.end();

  console.log("dev reset couple QA OK");
  console.log(`- project ref: ${projectRef}`);
  console.log(`- auth users removed: ${deletedAuthUsers}`);
  console.log("- before:", JSON.stringify(before));
  console.log("- after:", JSON.stringify(after));
  console.log("- QA credentials:");
  for (const qaUser of QA_USERS) {
    console.log(`  ${qaUser.name}: ${qaUser.email} / ${qaUser.password}`);
  }
}

run().catch((error) => {
  console.error("dev reset couple QA FAILED");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

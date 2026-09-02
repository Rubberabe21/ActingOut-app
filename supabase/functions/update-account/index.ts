import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const characters = new Set([
  "tommi.png", "giampa.png", "bretto.png", "dave.png", "tobi.png", "rabe.png",
  "giulia.png", "laura.png", "guido.png", "iris.png", "tosatto.png", "rache.png",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const auth = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await auth.auth.getUser(token);
    if (!user) return reply({ error: "Sessione non valida" }, 401);

    const body = await req.json();
    const changes: Record<string, string> = {};
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLocaleLowerCase("it");
      if (!email || email.length > 180) return reply({ error: "Mail non valida" }, 400);
      changes.login_email = email;
    }
    if (body.username !== undefined) {
      const username = String(body.username).trim();
      if (!username || username.length > 18) return reply({ error: "Nickname non valido" }, 400);
      changes.username = username;
    }
    if (body.avatar !== undefined) {
      const avatar = String(body.avatar);
      if (!/^assets\/avatars\/testa(?:[1-9]|[1-9][0-9]|10[0-2])\.png$/.test(avatar)) {
        return reply({ error: "Avatar non valido" }, 400);
      }
      changes.avatar = avatar;
    }
    for (const field of ["role", "activity"]) {
      if (body[field] !== undefined) {
        const value = String(body[field]).trim();
        if (value.length > 180) return reply({ error: `${field} non valido` }, 400);
        changes[field] = value;
      }
    }
    if (body.character !== undefined) {
      const character = String(body.character);
      if (!characters.has(character)) return reply({ error: "Personaggio non valido" }, 400);
      changes.character = character;
    }
    if (!Object.keys(changes).length) return reply({ error: "Nessuna modifica" }, 400);

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { error } = await admin.from("profiles").update(changes).eq("user_id", user.id);
    if (error?.code === "23505") return reply({ error: "Nickname o mail già utilizzati" }, 409);
    if (error) throw error;
    return reply({ success: true, ...changes });
  } catch (error) {
    console.error(error);
    return reply({ error: "Modifica non riuscita" }, 500);
  }
});

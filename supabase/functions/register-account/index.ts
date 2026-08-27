import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_STATS = {
  gamesPlayed: 0,
  feedbackInvaders: 0,
  cyberRun: 0,
  pixelPunch: 0,
  deadlineDrive: 0,
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo non consentito" }, 405);
  }

  let createdUserId: string | null = null;
  let profileCreated = false;

  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const avatar = String(body.avatar || "").trim();
    const activity = String(body.activity || "").trim();
    const role = String(body.role || "").trim();

    if (!username || !password || !avatar || !activity || !role) {
      return jsonResponse({ error: "Dati di registrazione mancanti" }, 400);
    }
    if (username.length > 12) {
      return jsonResponse({ error: "Nome utente non valido" }, 400);
    }
    if (password.length < 8 || password.length > 100) {
      return jsonResponse(
        { error: "La password deve contenere da 8 a 100 caratteri" },
        400,
      );
    }
    if (!/^assets\/avatars\/testa(?:[1-9]|[1-9][0-9]|10[0-2])\.png$/.test(avatar)) {
      return jsonResponse({ error: "Avatar non valido" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Configurazione server mancante");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: existingProfile, error: profileCheckError } = await admin
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();
    if (profileCheckError) throw profileCheckError;
    if (existingProfile) {
      return jsonResponse({ error: "Nome utente già registrato" }, 409);
    }

    const internalEmail = `${crypto.randomUUID()}@auth.arcade.internal`;
    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: { username },
      });
    if (authError) return jsonResponse({ error: authError.message }, 400);
    if (!authUser.user) throw new Error("Utente Auth non creato");
    createdUserId = authUser.user.id;

    const { error: insertError } = await admin.from("profiles").insert({
      username,
      user_id: createdUserId,
      password: null,
      avatar,
      activity,
      role,
      stats: DEFAULT_STATS,
      migration_status: "claimed",
      claimed_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;
    profileCreated = true;

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: loginData, error: loginError } =
      await authClient.auth.signInWithPassword({
        email: internalEmail,
        password,
      });
    if (loginError || !loginData.session) {
      throw loginError || new Error("Sessione non creata");
    }

    return jsonResponse({
      success: true,
      session: loginData.session,
      user: {
        id: createdUserId,
        username,
        avatar,
        activity,
        role,
        stats: DEFAULT_STATS,
      },
    }, 201);
  } catch (error) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (createdUserId && supabaseUrl && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      if (profileCreated) {
        await admin.from("profiles").delete().eq("user_id", createdUserId);
      }
      await admin.auth.admin.deleteUser(createdUserId);
    }
    console.error(
      "register-account:",
      error instanceof Error ? error.message : "Errore sconosciuto",
    );
    return jsonResponse({ error: "Errore interno durante la registrazione" }, 500);
  }
});

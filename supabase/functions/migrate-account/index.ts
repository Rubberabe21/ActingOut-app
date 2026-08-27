import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Metodo non consentito" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const body = await req.json();

    const username = String(body.username || "").trim();
    const code = String(body.code || "").trim();
    const password = String(body.password || "");

    if (!username || !code || !password) {
      return new Response(
        JSON.stringify({ error: "Dati mancanti" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          error: "La nuova password deve avere almeno 8 caratteri",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configurazione server mancante");
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data: migration, error: migrationError } = await admin
      .from("account_migrations")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (migrationError) {
      throw migrationError;
    }

    if (!migration) {
      return new Response(
        JSON.stringify({
          error: "Account non disponibile per la migrazione",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (migration.claimed_at) {
      return new Response(
        JSON.stringify({
          error: "Account già migrato",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (
      new Date(migration.expires_at).getTime() < Date.now()
    ) {
      return new Response(
        JSON.stringify({
          error: "Codice scaduto",
        }),
        {
          status: 410,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (migration.attempts >= 5) {
      return new Response(
        JSON.stringify({
          error: "Troppi tentativi",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Verifica codice
    const encoder = new TextEncoder();

    const digest = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(code),
    );

    const codeHash = Array.from(
      new Uint8Array(digest),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (codeHash !== migration.code_hash) {
      await admin
        .from("account_migrations")
        .update({
          attempts: migration.attempts + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", migration.id);

      return new Response(
        JSON.stringify({
          error: "Codice non valido",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Recupera profilo legacy
    const { data: profile, error: profileError } =
      await admin
        .from("profiles")
        .select(
          "username, avatar, activity, role, stats, user_id",
        )
        .eq("username", username)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: "Profilo legacy non trovato",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (profile.user_id) {
      return new Response(
        JSON.stringify({
          error: "Profilo già collegato",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
      Supabase Auth richiede un identificatore per
      l'autenticazione password.

      L'utente NON vedrà mai questa email.
      Serve solamente internamente ad Auth.

      Il login username + password verrà gestito
      successivamente dalla nostra Edge Function.
    */

    const safeUsername = username
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const internalEmail =
      `${safeUsername}.${crypto.randomUUID()}@auth.arcade.internal`;

    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username,
        },
      });

    if (authError) {
      return new Response(
        JSON.stringify({
          error: authError.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!authUser.user) {
      throw new Error("Utente Auth non creato");
    }

    // Collega il profilo legacy all'utente Auth
    const { error: linkError } = await admin
      .from("profiles")
      .update({
        user_id: authUser.user.id,
        migration_status: "claimed",
        claimed_at: new Date().toISOString(),
        password: null,
      })
      .eq("username", username)
      .is("user_id", null);

    if (linkError) {
      await admin.auth.admin.deleteUser(
        authUser.user.id,
      );

      throw linkError;
    }

    // Marca la migrazione come completata
    const { error: migrationUpdateError } =
      await admin
        .from("account_migrations")
        .update({
          claimed_at: new Date().toISOString(),
        })
        .eq("id", migration.id);

    if (migrationUpdateError) {
      throw migrationUpdateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        username,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("migrate-account:", error);

    return new Response(
      JSON.stringify({
        error: "Errore interno durante la migrazione",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
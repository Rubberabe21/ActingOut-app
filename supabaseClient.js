const SUPABASE_URL = "https://bcitueadxwwwouhxawdw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GsvCkWy0AtlMpejqT7nsew_Ivhd7hxq";

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

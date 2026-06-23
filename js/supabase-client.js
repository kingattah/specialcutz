(function () {
  "use strict";

  const config = window.SUPABASE_CONFIG;

  if (!config?.url || !config?.anonKey) {
    console.error("Supabase config missing. Edit js/supabase-config.js");
    window.supabaseClient = null;
    return;
  }

  if (
    config.url.includes("YOUR_PROJECT") ||
    config.anonKey.includes("YOUR_SUPABASE")
  ) {
    console.warn(
      "Supabase is not configured yet. Add your URL and anon key in js/supabase-config.js"
    );
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    config.url,
    config.anonKey
  );
})();

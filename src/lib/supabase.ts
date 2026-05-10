import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kjsjnertdcqgwbvmpqnx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_BatshFsSyck_CB2WLKtQGQ_POI9nFuB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export type AppRole = "admin" | "empleado";

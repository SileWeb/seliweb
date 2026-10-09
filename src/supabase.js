import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

const REAL = { "ai-post": "smooth-handler", "check-updates": "quick-function" };
const invoke = supabase.functions.invoke.bind(supabase.functions);
supabase.functions.invoke = (name, opts) => invoke(REAL[name] || name, opts);
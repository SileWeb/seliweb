import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const DEFAULTS = {
  site_name: "SoftHub", tagline: "", logo_url: "", favicon_url: "", primary_color: "#0a8f6b",
  meta_title: "", meta_description: "", show_categories_btn: true,
  cta_enabled: false, cta_label: "Add to chrome", cta_url: "",
  home_items: 8, sidebar_items: 6, footer_text: "", footer_links: "", wm_enabled: true, wm_text: "", contact_email: "", social: "",
};
let cache = null;
const subs = new Set();
export const setSettings = (d) => { cache = { ...DEFAULTS, ...d }; subs.forEach((f) => f(cache)); };

export function useSettings() {
  const [s, setS] = useState(cache || DEFAULTS);
  useEffect(() => {
    subs.add(setS);
    if (!cache) supabase.from("site_settings").select("data").eq("id", 1).maybeSingle().then(({ data }) => setSettings(data?.data || {}));
    return () => subs.delete(setS);
  }, []);
  return s;
}

// Schema.org JSON-LD head me daalta hai (Google ke liye)
export function JsonLd({ id, data }) {
  const json = JSON.stringify(data);
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json"; el.id = "ld-" + id; el.text = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [id, json]);
  return null;
}
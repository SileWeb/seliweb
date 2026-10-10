import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const DEFAULTS = {
  site_name: "Filecr", tagline: "", logo_url: "", favicon_url: "", primary_color: "#0a8f6b",
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
      document.getElementById("ld-" + id)?.remove();   // ← ye nayi line

    const el = document.createElement("script");
    el.type = "application/ld+json"; el.id = "ld-" + id; el.text = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [id, json]);
  return null;
}

// Page ko Google index na kare. follow=true: links follow hon, page index na ho
export function Noindex({ follow = false }) {
  useEffect(() => {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = follow ? "noindex, follow" : "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, [follow]);
  return null;
}

const upsert = (tag, key, name, val) => {
  let el = document.head.querySelector(`${tag}[${key}="${name}"]`);
  if (!el) { el = document.createElement(tag); el.setAttribute(key, name); document.head.appendChild(el); }
  el.setAttribute(tag === "link" ? "href" : "content", val || "");
};

// Title, description, canonical, Open Graph, Twitter, sab ek jagah
export function setMeta({ title, description, canonical, image, type = "website", siteName }) {
  if (title) {
    document.title = title;
    upsert("meta", "property", "og:title", title);
    upsert("meta", "name", "twitter:title", title);
  }
  if (description != null) {
    upsert("meta", "name", "description", description);
    upsert("meta", "property", "og:description", description);
    upsert("meta", "name", "twitter:description", description);
  }
  if (canonical) {
    const url = location.origin + canonical;
    upsert("link", "rel", "canonical", url);
    upsert("meta", "property", "og:url", url);
  }
  upsert("meta", "property", "og:type", type);
  if (siteName) upsert("meta", "property", "og:site_name", siteName);
  upsert("meta", "name", "twitter:card", image ? "summary_large_image" : "summary");
  if (image) {
    upsert("meta", "property", "og:image", image);
    upsert("meta", "name", "twitter:image", image);
  } else {
    document.head.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach((e) => e.remove());
  }
}


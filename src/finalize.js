import { FN } from "./fn.js";

// Final step: post mukammal hone ke baad
//  1) article body ka content AI se behtar/unique (headings bilkul wahi rehti hain)
//  2) article ke end me usi category ke pichle downloads ka interlinking
// Status ko ye chhota nahi chhedta (draft wali draft hi rehti hai, scheduled wali scheduled).
const HEAD = /(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)/gi;
const IS_HEAD = /^<h[1-6][\s>]/i;
const MARK = "<!--enh-->";
const LINKS_RE = /<div data-interlinks="1">[\s\S]*?<\/div>\s*$/i;
const textOf = (h) => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();

// Sirf headings ke darmiyan ka content AI ko jata hai; headings client par wapas jur jati hain, is liye badal hi nahi sakti
async function rewriteBody(supabase, post, category, version) {
  const parts = post.content.replace(MARK, "").replace(LINKS_RE, "").split(HEAD);   // [body, heading, body, heading, ...]
  const idx = [];
  parts.forEach((p, i) => { if (!IS_HEAD.test(p) && textOf(p).length > 40) idx.push(i); });
  if (!idx.length) return { html: null, note: "content me badalne layak text nahi mila" };
  const { data, error } = await supabase.functions.invoke(FN.rewrite, { body: { name: post.name, version, category, segments: idx.map((i) => parts[i]) } });
  if (error || data?.error) throw new Error(error?.message || data.error);
  const out = data?.segments;
  if (!Array.isArray(out) || out.length !== idx.length || out.some((s) => typeof s !== "string" || textOf(s).length < 20)) throw new Error("AI ka jawab adhoora tha");
  idx.forEach((i, k) => { parts[i] = out[k]; });
  return { html: parts.join("") };
}

async function interlinks(supabase, post) {
  const { data } = await supabase.from("software").select("id,name,slug,versions(version,is_latest)")
    .eq("category_id", post.category_id).eq("status", "published").neq("id", post.id).order("created_at", { ascending: false }).limit(6);
  if (!data?.length) return "";
  const li = data.map((p) => { const v = (p.versions || []).find((x) => x.is_latest) || (p.versions || [])[0]; return `<li><a href="/software/${p.slug}">${p.name}${v?.version && v.version !== "pending" ? " " + v.version : ""} Free Download</a></li>`; }).join("");
  return `<div data-interlinks="1"><h3>More Downloads You May Like</h3><ul>${li}</ul></div>`;
}

export async function finalizePost(supabase, id, step = () => {}) {
  const notes = [];
  const { data: post } = await supabase.from("software").select("id,name,content,category_id,categories(name),versions(version,is_latest)").eq("id", id).single();
  if (!post) return ["final step: post nahi mili"];
  let html = post.content || "";
  if (html && !html.includes(MARK)) {
    step("content AI se behtar ho raha hai...");
    const ver = (post.versions || []).find((v) => v.is_latest)?.version || "";
    for (let a = 0; a < 2; a++) {   // 2 koshish
      try {
        const r = await rewriteBody(supabase, post, post.categories?.name || "", ver);
        if (r.html) html = MARK + r.html; else notes.push(r.note);
        break;
      } catch (e) { if (a) notes.push("content update nahi hua (purana rakha): " + (e.message || e)); }
    }
  }
  step("interlinking lag rahi hai...");
  const links = await interlinks(supabase, post);
  const base = html.replace(LINKS_RE, "");
  const final = base + (links ? "\n" + links : "");
  if (final && final !== post.content) await supabase.from("software").update({ content: final }).eq("id", id);
  notes.push(links ? "final step: content + interlinking ✓" : "final step: content ✓ (is category me abhi koi published post nahi, interlinking nahi lagi)");
  return notes;
}
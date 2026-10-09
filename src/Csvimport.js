// CSV se bohat saari posts ek saath. Download link aur images "importer" bharta hai, baqi sab CSV se.
import { getDataRetry, report, imgToStorage, pool } from "./importer.js";
import { finalizePost } from "./finalize.js";

export const CSV_HEADERS = ["category", "subcategory", "title", "seo_title", "slug", "short_desc", "content", "sys_req", "developer", "license_type", "languages", "platform", "tags", "official_site", "version", "release_date", "file_size_mb", "arch", "os", "min_ram", "min_cpu", "min_storage", "file_name", "download_url", "previous_versions", "icon_url", "image_urls", "source_url", "source", "publish_date"];

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const norm = (s) => String(s || "").trim().replace(/^v/i, "");
const cmpVer = (a, b) => { const n = (v) => (String(v).match(/\d+/g) || []).map(Number); const x = n(a), y = n(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };

// ---------- CSV parser (quotes, comma/semicolon/tab, Excel BOM) ----------
export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const first = text.split(/\r?\n/)[0] || "";
  const d = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some((x) => x.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// ---------- chhote helpers ----------
const toMB = (s) => { const m = String(s || "").replace(/,/g, "").match(/([\d.]+)\s*(GB|MB|KB)?/i); if (!m) return null; const n = parseFloat(m[1]), u = (m[2] || "MB").toUpperCase(); return u === "GB" ? Math.round(n * 1024 * 100) / 100 : u === "KB" ? Math.round((n / 1024) * 100) / 100 : n; };
const toDate = (s) => {
  s = String(s || "").trim(); if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;   // DD/MM/YYYY
  const t = Date.parse(s + " UTC"); return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
};
const list = (s) => String(s || "").split(/[;,\n]/).map((x) => x.trim()).filter(Boolean);
const html = (s) => !s ? null : /<[a-z][\s\S]*>/i.test(s) ? s : "<p>" + s.split(/\n+/).map((x) => x.trim()).filter(Boolean).join("</p><p>") + "</p>";
const reqHtml = (s) => !s ? null : /<[a-z]/i.test(s) ? s : "<ul>" + s.split(/[;\n]/).map((x) => x.trim()).filter(Boolean).map((x) => `<li>${x.replace(/</g, "&lt;")}</li>`).join("") + "</ul>";
const archOf = (n) => /x86|32-?bit/i.test(n || "") && !/64/.test(n || "") ? "32-bit" : "64-bit";
// previous_versions: version|date|size|link|file_name   (ek se zyada ko ~ se alag karen)
const prevList = (s) => String(s || "").split("~").map((x) => x.trim()).filter(Boolean).map((e) => {
  const [version, date, size, url, file] = e.split("|").map((x) => x.trim());
  return { version, release_date: toDate(date), file_size_mb: toMB(size), download_url: url || "", file_name: file || null };
}).filter((p) => p.version);

// ---------- schedule: roz N posts, ek ke baad gap minute ----------
export function scheduleTimes(count, { perDay, start, time, gap }) {
  const [hh, mm] = String(time || "09:00").split(":").map(Number), [y, mo, d] = String(start).split("-").map(Number);
  const per = Math.max(1, +perDay || 1);
  return Array.from({ length: count }, (_, i) => new Date(y, mo - 1, d + Math.floor(i / per), hh, mm + (i % per) * (+gap || 0)).toISOString());
}

function findCat(cats, r) {
  const key = String(r.category || "").trim().toLowerCase();
  return cats.find((c) => (c.name || "").toLowerCase() === key || c.slug === key)
    || cats.find((c) => c.icon === (/^mac/i.test(key + " " + (r.platform || "")) ? "apple" : "windows")) || cats[0];
}

// ---------- CSV rows -> posts (Draft ya Scheduled) ----------
export async function createPosts(supabase, rows, cats, o, step = () => {}) {
  const { data: ex } = await supabase.from("software").select("slug").limit(5000);
  const used = new Set((ex || []).map((x) => x.slug));
  const errors = [], warnings = [], items = [];
  const times = o.schedule ? scheduleTimes(rows.length, o) : []; let ti = 0;

  rows.forEach((r, i) => {
    const name = r.title || r.name, line = `Row ${i + 2}`;
    if (!name) { errors.push(`${line}: title khali hai`); return; }
    const cat = findCat(cats, r), mac = cat?.icon === "apple" || /^mac/i.test(r.platform || "");
    const platform = r.platform ? (/^mac/i.test(r.platform) ? "Mac" : "Windows") : (mac ? "Mac" : "Windows");
    let slug = r.slug ? slugify(r.slug) : slugify(name), base = slug, k = 2;
    while (used.has(slug)) slug = `${base}-${k++}`; used.add(slug);

    const src = /^(winget|github):/i.test(r.source || "") ? r.source.trim() : ghOf(r.source_url);
    if (ghOf(r.source_url)) r = { ...r, source_url: "" };
    const needLink = !r.download_url;
    const needImg = true;
    const needFill = true;

    let at = null;
    if (r.publish_date) { const m = String(r.publish_date).match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/); if (m) at = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 9), +(m[5] ?? 0)).toISOString(); }
    else if (o.schedule) at = times[ti++];

    const post = {
      category_id: cat?.id, name, slug, subcategory: r.subcategory || null, short_desc: r.short_desc || null, seo_title: r.seo_title || null,
      content: html(r.content), sys_req: reqHtml(r.sys_req), developer: r.developer || null, license_type: r.license_type || "full_version",
      languages: r.languages || "Multilingual", platform, tags: list(r.tags), official_site: r.official_site || null, file_name: r.file_name || null,
      images: [], image_alts: [], status: at ? "scheduled" : "draft", publish_at: at, import_ready: !needFill,
      source_type: src ? src.split(":")[0].toLowerCase() : "none", source_id: src ? src.slice(src.indexOf(":") + 1) : null, auto_update: !!src,
    };
    const common = { os: r.os || (platform === "Mac" ? "macOS" : "Windows 10/11"), min_ram: r.min_ram || null, min_cpu: r.min_cpu || null, min_storage: r.min_storage || null };
    const versions = [{ ...common, version: r.version || "pending", release_date: toDate(r.release_date), file_size_mb: toMB(r.file_size_mb), arch: r.arch || archOf(r.file_name), download_url: r.download_url || "#", file_name: r.file_name || null, is_latest: true },
      ...prevList(r.previous_versions).map((p) => ({ ...common, ...p, download_url: p.download_url || "#", arch: archOf(p.file_name), is_latest: false }))];
    items.push({ post, versions, fill: needFill ? { source_url: r.source_url || null, source: src || null, image_urls: r.image_urls || null, icon_url: r.icon_url || null, need_link: needLink, need_images: needImg } : null });
  });

  let created = 0, queued = 0;
  for (let b = 0; b < items.length; b += 40) {
    const batch = items.slice(b, b + 40);
    step(`posts ban rahi hain ${b + 1}-${b + batch.length} / ${items.length}...`);
    const { data, error } = await supabase.from("software").insert(batch.map((x) => x.post)).select("id,slug");
    if (error) { errors.push(`Posts ${b + 1}-${b + batch.length}: ${error.message}`); continue; }
    const id = Object.fromEntries((data || []).map((x) => [x.slug, x.id]));
    const vrows = [], qrows = [];
    for (const it of batch) {
      const pid = id[it.post.slug]; if (!pid) continue;
      it.versions.forEach((v) => vrows.push({ ...v, software_id: pid }));
      if (it.fill) qrows.push({ ...it.fill, post_id: pid });
      created++;
    }
    const { error: e2 } = await supabase.from("versions").insert(vrows);
    if (e2) errors.push(`Versions: ${e2.message}`);
    if (qrows.length) { const { error: e3 } = await supabase.from("csv_queue").insert(qrows); if (e3) errors.push(`Queue: ${e3.message}`); else queued += qrows.length; }
  }
  return { created, queued, errors, warnings };
}

// ---------- official links: winget aur GitHub (browser se, free) ----------
const tf = (u, ms = 15000) => { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); return fetch(u, { signal: c.signal }).finally(() => clearTimeout(t)); };
async function wingetLinks(id) {
  const p = id.trim().split("."); if (p.length < 2) throw new Error("Winget ID: Publisher.Package");
  const base = `https://api.github.com/repos/microsoft/winget-pkgs/contents/manifests/${p[0][0].toLowerCase()}/${p.join("/")}`;
  const list = await (await tf(base)).json(); if (!Array.isArray(list)) throw new Error("Winget me nahi mila (ya GitHub ki limit)");
  const vers = list.filter((x) => x.type === "dir").map((x) => x.name).sort(cmpVer).reverse().slice(0, 4), out = [];
  for (const v of vers) {
    try {
      const files = await (await tf(`${base}/${v}`)).json(), f = files.find((x) => x.name.endsWith(".installer.yaml"));
      const y = await (await tf(f.download_url)).text();
      const m = y.match(/Architecture:\s*x64[\s\S]*?InstallerUrl:\s*(\S+)/) || y.match(/InstallerUrl:\s*(\S+)/);
      if (m) { const url = m[1].replace(/^["']|["']$/g, ""); out.push({ version: v, url, size: null, file: decodeURIComponent(url.split("?")[0].split("/").pop() || "") }); }
    } catch { /* is version ko chhor do */ }
  }
  return out;
}
async function githubLinks(src) {
  const [repo, pat] = src.trim().split("|");
  const r = await tf(`https://api.github.com/repos/${repo}/releases?per_page=15`); if (!r.ok) throw new Error("GitHub release nahi mili (ya limit)");
  const ext = /\.(exe|msi|msix|zip|dmg|pkg)$/i, out = [];
  for (const rel of (await r.json()).filter((x) => !x.draft && !x.prerelease)) {
    const as = rel.assets || [];
    const a = (pat && as.find((x) => new RegExp(pat, "i").test(x.name))) || as.find((x) => ext.test(x.name) && /x64|win64|amd64|universal/i.test(x.name)) || as.find((x) => ext.test(x.name));
    if (a) out.push({ version: norm(rel.tag_name), url: a.browser_download_url, size: Math.round((a.size / 1048576) * 100) / 100, file: a.name });
  }
  return out;
}

// GitHub ka repo/release link ho to page parhne ki bajaye seedha GitHub API (2-3 second, bharosemand)
const ghOf = (u) => { const m = String(u || "").match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/#?\s]+)/i); return m ? `github:${m[1]}/${m[2]}` : ""; };

// ---------- importer ka kaam: download link + images ----------
// Tarteeb: 1) CSV ka download_url  2) aap ki doosri website  3) GitHub / winget
export async function fillItem(supabase, q, wm, step = () => {}, pre = null) {
  const gh = ghOf(q.source_url);
  if (gh) q = { ...q, source: q.source || gh, source_url: null };
  const { data: post } = await supabase.from("software").select("id,name,images").eq("id", q.post_id).single();
  const { data: vrows } = await supabase.from("versions").select("*").eq("software_id", q.post_id);
  const notes = [];
  let site = null, official = [];
  if (q.source_url && pre) site = pre;
  else if (q.source_url) { step("doosri website ka page parha ja raha hai..."); try { site = await getDataRetry(q.source_url); } catch (e) { notes.push("doosri site: " + (e.message || e)); } }
  if (q.source && (q.need_link || vrows.some((v) => v.version === "pending"))) {
    step("official source (GitHub/winget) dekha ja raha hai...");
    try { official = /^winget:/i.test(q.source) ? await wingetLinks(q.source.slice(7)) : await githubLinks(q.source.slice(7)); } catch (e) { notes.push("official: " + (e.message || e)); }
  }

  const pick = (v) => {
    const pending = v.version === "pending";
    if (site) {
      if (v.is_latest && site.url) return { mismatch: !(pending || norm(site.version) === norm(v.version)), url: site.url, version: site.version, size: site.size, file: site.fileName, date: site.release_date };
      const p = (site.prev || []).find((x) => x.url && norm(x.version) === norm(v.version));
      if (p) return { url: p.url, version: p.version, size: p.size, file: p.file_name, date: p.release_date };
    }
    const o = official.find((x) => norm(x.version) === norm(v.version)) || (v.is_latest && pending ? official[0] : null);
    return o ? { url: o.url, version: o.version, size: o.size, file: o.file } : null;
  };
  for (const v of vrows) {
    if (v.download_url && v.download_url !== "#" && v.version !== "pending") continue;
    const h = pick(v); if (!h) continue;
    if (h.mismatch) notes.push(`version alag: CSV ${v.version}, doosri site ${h.version || "?"}`);
    const upd = { download_url: h.url };
    if (v.version === "pending" && h.version) upd.version = norm(h.version);
    if (!v.file_size_mb && h.size) upd.file_size_mb = h.size;
    if (!v.release_date && h.date) upd.release_date = h.date;
    if (!v.file_name && h.file) upd.file_name = h.file;
    await supabase.from("versions").update(upd).eq("id", v.id);
  }

  if (q.need_images && !(post.images || []).length) {
    let imgs = String(q.image_urls || "").split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!imgs.length && site) imgs = site.images || [];
    const iconSrc = q.icon_url || site?.icon || imgs[0] || "";
    if (imgs.length || iconSrc) {
      step(`images upload ho rahi hain (${Math.min(imgs.length, 12)})...`);
      const [res, icon] = await Promise.all([
        pool(imgs.slice(0, 12), 2, (s) => imgToStorage(supabase, s, 1600, false, wm)),
        iconSrc ? imgToStorage(supabase, iconSrc, 256, true).catch(() => null) : null,
      ]);
      for (let k = 0; k < res.length; k++) if (!res[k]) { await new Promise((r) => setTimeout(r, 1500)); res[k] = await imgToStorage(supabase, imgs[k], 1600, false, wm).catch(() => null); }
      const ok = res.filter(Boolean), upd = {};
      if (ok.length) { upd.images = ok; upd.image_alts = ok.map((_, k) => `${post.name} screenshot ${k + 1}`); }
      if (icon) upd.icon_url = icon;
      if (Object.keys(upd).length) await supabase.from("software").update(upd).eq("id", post.id); else notes.push("images nahi mili");
    } else notes.push("images ka koi link nahi mila");
  }

  // doosri website par jo purane versions (aur unke links) hain, wo bhi add karo
  let { data: vv } = await supabase.from("versions").select("*").eq("software_id", q.post_id);
  if (site && (site.prev || []).length) {
    const have = new Set((vv || []).map((v) => norm(v.version))), lr = (vv || []).find((v) => v.is_latest) || (vv || [])[0] || {};
    const add = site.prev.filter((p) => p.version && p.url && !have.has(norm(p.version))).map((p) => ({
      software_id: q.post_id, version: norm(p.version), release_date: p.release_date, file_size_mb: p.size, download_url: p.url, file_name: p.file_name || null,
      os: lr.os, arch: /x86|32-?bit/i.test(p.file_name || "") && !/64/.test(p.file_name || "") ? "32-bit" : "64-bit",
      min_ram: lr.min_ram, min_cpu: lr.min_cpu, min_storage: lr.min_storage, is_latest: false }));
    if (add.length) { const { error } = await supabase.from("versions").insert(add); if (!error) { notes.push(`${add.length} purane versions add hue`); vv = [...(vv || []), ...add]; } }
  }
  if (site) { const r = report(site); notes.unshift(`doosri site: link ${r.link ? "✓" : "✗"}, purane versions ${r.prev} (links ${r.prevLinks}), images ${r.images}`); }
  const missing = (vv || []).filter((v) => !v.is_latest && (!v.download_url || v.download_url === "#")).length;
  if (missing) notes.push(`${missing} purane versions ka link nahi mila`);
  const latest = (vv || []).find((v) => v.is_latest);
  const linkOk = latest && latest.download_url && latest.download_url !== "#" && latest.version !== "pending";
  if (q.need_link && !linkOk) return { ok: false, msg: ["Download link / version nahi mila", ...notes].join(" | ") };
  await supabase.from("software").update({ import_ready: true }).eq("id", q.post_id);
  try { notes.push(...(await finalizePost(supabase, q.post_id, step))); } catch (e) { notes.push("final step error: " + (e.message || e)); }   // content + interlinking
  return { ok: true, msg: notes.join(" | ") || null };
}

// ---------- Aik post: naam se doosri website ki post dhoondho, images + link bharo ----------
export async function fillFromPattern(supabase, q, pattern, wm, step = () => {}) {
  const { data: post } = await supabase.from("software").select("name").eq("id", q.post_id).single();
  const name = post?.name || "", cands = [];
  if (q.source_url) cands.push(q.source_url);
  if (pattern) {
    const clean = name.replace(/\([^)]*\)/g, "").replace(/\s+v?\d+(\.\d+)+\s*$/i, "");
    for (const s of [slugify(name), slugify(clean)]) { const u = pattern.replace("{slug}", s).replace("{name}", encodeURIComponent(name)); if (!cands.includes(u)) cands.push(u); }
  }
  const isGh = !!ghOf(q.source_url);
  if (!cands.length && !q.source) return { ok: false, msg: "Doosri website ka link pattern likhen" };
  let used = null, pre = null;
  if (!isGh) for (const u of cands) {
    step("doosri website par post dhoondhi ja rahi hai...");
    try { const d = await getDataRetry(u, 2); if (d.version || d.url || d.images.length) { used = u; pre = d; break; } } catch { /* agla link */ }
  }
  if (!used && !isGh && !q.source) return { ok: false, msg: "Is naam ki post doosri website par nahi mili (dekhe: " + cands.join(" , ") + ")" };
  return fillItem(supabase, { ...q, source_url: used || q.source_url }, wm, step, pre);
}
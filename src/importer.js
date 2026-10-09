import { addWatermark } from "./wm.js";
// ==== PARSER START ====
const MONTHS_S = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
const PREV_RE = /^(?:previous|older|old|other|archived|earlier)\s+versions?\b|^version history\b|^all versions\b/i;
const DATE_RE = new RegExp(`^(?:(?:${MONTHS_S})[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}\\s+(?:${MONTHS_S})[a-z]*\\.?,?\\s+\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{4})$`, "i");
const DATE_CORE = DATE_RE.source.replace(/^\^/, "").replace(/\$$/, "");
// sirf date, ya "Release Date: <date>" / "Released <date>" / "Updated <date>" jaisi line
const DATE_ANY = new RegExp(`^(?:(?:release\\s*date|released|date|last\\s*updated|updated|published)\\s*:?\\s*)?(${DATE_CORE})$`, "i");
const dateText = (l) => { const m = strip(l).match(DATE_ANY); return m ? m[1] : ""; };
const isDateLine = (l) => DATE_ANY.test(strip(l));
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const SIZE = /^(\d+(?:\.\d+)?)\s*(GB|MB|KB)$/i;
const strip = (s) => s.replace(/⟦[^⟧]*⟧/g, "").replace(/\s+/g, " ").trim();
const linkOf = (s) => (s.match(/⟦([^⟧]+)⟧/) || [])[1];
const toMB = (s) => { const m = strip(s).match(SIZE); if (!m)
    return null; const n = Number(m[1]), u = m[2].toUpperCase(); return u === "GB" ? Math.round(n * 1024 * 100) / 100 : u === "KB" ? Math.round((n / 1024) * 100) / 100 : n; };
const toMBany = (s) => { const x = strip(s); const e = x.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)\s*$/i); return toMB(x) ?? (e ? toMB(e[1] + " " + e[2]) : null); };
const isoDate = (s) => { const dm = strip(s).match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); if (dm) return `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;  const t = Date.parse(strip(s) + " UTC"); return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10); };
function toLines(html) {
    let h = html.replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ");
    h = h.replace(/<a\b[^>]*?href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, inner) => `${inner} ⟦${href}⟧ `);
    h = h.replace(/<(button|div|span|li|td)\b[^>]*?\bdata-(?:href|url|link|download|file)=["']([^"']+)["'][^>]*>/gi, (m, _t, u) => /^(javascript|#)/i.test(u) ? m : `${m} ⟦${u}⟧ `);
    h = h.replace(/<(button|div|span|li|td)\b[^>]*?\bonclick=["'][^"']*?(?:location(?:\.href)?\s*=\s*|window\.open\()\s*\\?['"]([^'"\\]+)\\?['"][^>]*>/gi, (m, _t, u) => `${m} ⟦${u}⟧ `);
    h = h.replace(/<\/(p|div|li|h\d|tr|td|th|section|ul|ol|table|label|button)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
    h = h.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
    const raw = h.split("\n").map((s) => s.replace(/\s+/g, " ").replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi, "$1").trim()).filter(Boolean);
    const out = [];
    for (let i = 0; i < raw.length; i++) {
        if (new RegExp(`^(?:${MONTHS_S})[a-z]*\\.?\\s+\\d{1,2},?$`, "i").test(raw[i]) && /^\d{4}$/.test(raw[i + 1] || "")) {
            out.push(raw[i] + " " + raw[i + 1]);
            i++;
        }
        else
            out.push(raw[i]);
    }
    return out;
}
const clean = (x) => /^[—–-]+$|^n\/?a$|^none$|^null$/i.test(String(x || "").trim()) ? "" : String(x || "").trim();
function val(lines, label, from = 0, to = lines.length) {
    const a = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i"), b = new RegExp(`^${label}\\s*:?$`, "i");
    const c = label.toLowerCase() === "version" ? new RegExp(`^${label}\\s+(v?\\d.*)$`, "i") : new RegExp(`^${label}\\s+(.+)$`, "i");
    for (let i = from; i < to; i++) {
        const l = strip(lines[i]);
        let m = l.match(a);
        if (m)
            return clean(m[1].trim());
        if (b.test(l))
            return clean(strip(lines[i + 1] || ""));
        if ((m = l.match(c)))
            return clean(m[1].trim());
    }
    return "";
}

// ---------- Images / icon / tags / breadcrumb ----------
const attr = (tag, n) => (tag.match(new RegExp(`\\b${n}=["']([^"']*)["']`, "i")) || [])[1] || "";
const absUrl = (s, base) => { try { return new URL(s, base).href; } catch { return ""; } };
const unwrapNext = (u) => { if (/_next\/image/.test(u || "")) { const m = u.match(/[?&]url=([^&]+)/); if (m) { try { return decodeURIComponent(m[1]); } catch { /* ignore */ } } } return u; };
// srcset me se sab se BARI image (aur Next.js ki chhoti optimized copy ki jagah asli file)
const imgSrc = (tag) => {
  const c = [];
  for (const k of ["srcset", "data-srcset"]) {
    const s = attr(tag, k);
    if (s) for (const part of s.split(/,\s+(?=\S)/)) { const [u, d] = part.trim().split(/\s+/); if (u) c.push({ u, n: d ? (parseFloat(d) || 0) * (/x$/i.test(d) ? 1000 : 1) : 0 }); }
  }
  if (c.length) { c.sort((a, b) => b.n - a.n); return unwrapNext(c[0].u); }
  return unwrapNext(attr(tag, "data-original") || attr(tag, "data-src") || attr(tag, "data-lazy-src") || attr(tag, "src"));
};

const SIZE_PARAMS = ["w", "h", "q", "width", "height", "quality", "fit", "size", "resize"];
const normKey = (u) => { try { const x = new URL(u); SIZE_PARAMS.forEach((p) => x.searchParams.delete(p)); return x.origin + x.pathname + x.search; } catch { return u; } };
const imgKey = (u) => normKey(u).replace(/[-_]\d{2,4}x\d{2,4}(?=\.\w+(?:\?|$))/, "");
const stripSize = (u) => { try { const x = new URL(u); let ch = false; SIZE_PARAMS.forEach((p) => { if (x.searchParams.has(p)) { x.searchParams.delete(p); ch = true; } }); return ch ? x.href : u; } catch { return u; } };

function parseImages(html, url) {
  const all = [...html.matchAll(/<img\b[^>]*>/gi)];
  const pick = (tag, minW) => {
    const src = imgSrc(tag); if (!src || /^data:|\.svg(\?|$)/i.test(src)) return "";
    const w = +attr(tag, "width") || 0, h = +attr(tag, "height") || 0;
    if ((w && w < minW) || (h && h < minW * 0.7)) return "";
    if (/logo|avatar|favicon|sprite|spinner|flag|banner-ad|preloader/i.test(src + " " + attr(tag, "class"))) return "";
    return absUrl(src, url);
  };
  const has = (list, u) => list.some((x) => imgKey(x) === imgKey(u));
  const cut = html.search(/Related Products|Previous version|Leave a comment/i);
  const opens = [...html.matchAll(/class=["'](?:[^"']*\s)?swiper(?:-container)?(?:\s[^"']*)?["']/g)].map((m) => m.index);
  const groups = new Map();
  for (const m of all) {
    const ctx = html.slice(Math.max(0, m.index - 1000), m.index) + m[0];
    if (!/swiper|slick|carousel|owl-|glide|splide|flickity|keen-slider|embla|slider|gallery|screenshot/i.test(ctx)) continue;
    const ld = ctx.lastIndexOf("<div"), slideTag = ld >= 0 ? ctx.slice(ld, ld + 300) : "";
    if (/swiper-slide-duplicate/.test(slideTag)) continue;
    const u = pick(m[0], 40); if (!u) continue;
    const g = opens.filter((o) => o < m.index).length, e = groups.get(g) || { n: [], first: m.index };
    if (!has(e.n, u)) e.n.push(u);
    groups.set(g, e);
  }
  let list = [];
  const cand = [...groups.values()].filter((g) => cut < 0 || g.first < cut).sort((a, b) => b.n.length - a.n.length);
  if (cand.length) {
    list = [...cand[0].n];
    if (list.length <= 2) for (const g of cand.slice(1)) for (const u of g.n) if (!has(list, u)) list.push(u);   // adhoori ho to doosre slider se bhi
  }
  if (list.length <= 1) {   // abhi bhi 0 ya 1: page ki bari images (pehli image ke host par)
    const part = cut > 0 && /<img\b/i.test(html.slice(0, cut)) ? html.slice(0, cut) : html;
    let host = ""; try { host = list[0] ? new URL(list[0]).host : ""; } catch { /* ignore */ }
    for (const m of part.matchAll(/<img\b[^>]*>/gi)) { const u = pick(m[0], 200); if (u && !has(list, u)) { try { if (host && new URL(u).host !== host) continue; } catch { continue; } list.push(u); } }
  }
  const sure = list.length >= 2 && cand.length > 0;
  const out = list.length ? list.slice(0, 12) : parseImagesBasic(html, url);
  out.sure = sure;
  return out;
}
function parseImagesBasic(html, url) {
  const cut = html.search(/Previous version|Related Products|Leave a comment/i);
  const part = cut > 0 && /<img\b/i.test(html.slice(0, cut)) ? html.slice(0, cut) : html;
  const out = [];
  for (const m of part.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0]; let src = imgSrc(tag);
    if (!src || /^data:|\.svg(\?|$)/i.test(src)) continue;
    const w = +attr(tag, "width") || 0, h = +attr(tag, "height") || 0;
    if ((w && w < 150) || (h && h < 100)) continue;
    if (/logo|avatar|favicon|sprite|placeholder|spinner|flag|banner-ad/i.test(src + " " + attr(tag, "class"))) continue;
    src = absUrl(src, url); if (src && !out.includes(src)) out.push(src);
  }
  for (const m of part.matchAll(/<[a-z]+\b[^>]*background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)[^>]*>/gi)) {
    if (!/slide|gallery|carousel|screenshot|swiper|slick/i.test(m[0])) continue;
    const s = absUrl(m[1], url); if (s && !/\.svg(\?|$)/i.test(s) && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 8);
}
function pickIcon(html, url, name, ld) {
  const word = (name || "").split(/\s+/)[0].toLowerCase();
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0], src = imgSrc(tag), alt = attr(tag, "alt").toLowerCase(), w = +attr(tag, "width") || 0;
    if (!src || /^data:|\.svg(\?|$)/i.test(src) || !word || !alt.includes(word)) continue;
    if ((w >= 40 && w <= 220) || /icon/i.test(src + " " + attr(tag, "class"))) return absUrl(src, url);
  }
  const li = ld?.image; const s = typeof li === "string" ? li : Array.isArray(li) ? (li[0]?.url || li[0]) : li?.url;
  return s ? absUrl(String(s), url) : "";
}

function bestDownload(lines, base) {
  let best = null;
  for (const l of lines) for (const m of l.matchAll(/⟦([^⟧]+)⟧/g)) {
    const h = m[1]; if (/^(javascript|mailto|#|tel)/i.test(h)) continue;
    const text = strip(l).toLowerCase(); let s = 0;
    if (/direct download/.test(text)) s += 6; else if (/download/.test(text)) s += 3;
    if (/\.(exe|msi|msix|zip|rar|7z|dmg|pkg|iso|apk)(\?|$)/i.test(h)) s += 5;
    if (/download|\/dl\/|\/get\//i.test(h)) s += 2;
    if (/version history|previous|#versions|categor|\/tag|login|register|favorite/i.test(text + " " + h)) s -= 8;
    if (s > 0 && (!best || s > best[0])) best = [s, h];
  }
  return best ? absUrl(best[1], base) : "";
}
const firstLink = (lines, base) => { const h = lines.map(linkOf).find((x) => x && !/^(javascript|#|mailto)/i.test(x)); return h ? absUrl(h, base) : ""; };

function anyDl(lines, base) {
  for (const l of lines) for (const m of l.matchAll(/⟦([^⟧]+)⟧/g)) {
    const h = m[1]; if (/^(javascript|mailto|#)/i.test(h)) continue;
    if (/\.(exe|msi|msix|zip|rar|7z|dmg|pkg|iso|apk)(\?|$)/i.test(h) || (/download/i.test(h) && /download/i.test(l))) return absUrl(h, base);
  }
  return "";
}

// Overview / article ka text (headings, paragraphs, lists) saaf HTML me
function extractContent(html) {
  const stopRe = /<h[1-6][^>]*>\s*(?:System Requirements|Previous versions?|Older versions?|Version history|Related Products|Comments|Leave a comment|Product Information)\b/i;
  const startRe = /<h[1-6][^>]*>\s*(?:Overview|About|Description|Introduction|What is|Features?)\b/i;
  const body = html.replace(/<(script|style|noscript|svg|head|iframe|form|nav|footer)[\s\S]*?<\/\1>/gi, " ");
  let s = body.search(startRe);
  if (s < 0) { const m = body.match(/<p[^>]*>[^<]{120,}/i); s = m ? body.indexOf(m[0]) : -1; }
  if (s < 0) return null;
  const rest = body.slice(s), e = rest.slice(10).search(stopRe);
  let seg = e >= 0 ? rest.slice(0, e + 10) : rest.slice(0, 60000);
  seg = seg.replace(/<div\b[^>]*>/gi, "<p>").replace(/<\/div>/gi, "</p>")
    .replace(/<(?!\/?(?:h[1-6]|p|ul|ol|li|strong|b|em|i|br)\b)[^>]*>/gi, "")
    .replace(/<(\/?)(h[1-6]|p|ul|ol|li|strong|b|em|i|br)\b[^>]*>/gi, "<$1$2>")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/<p>\s*<\/p>/gi, "").replace(/\s+/g, " ").trim();
  return seg.replace(/<[^>]+>/g, "").trim().length >= 250 ? seg : null;
}

// "Previous versions" ka asli heading (jis ke baad date aati ho). Sidebar ke "Version history" link par nahi rukta
function prevHead(lines) {
    const isHead = (l) => PREV_RE.test(strip(l)) && !linkOf(l);
    const real = lines.findIndex((l, i) => isHead(l) && lines.slice(i + 1, i + 6).some(isDateLine));
    return real >= 0 ? real : lines.findIndex(isHead);
}
function parsePage(html, url) {
    const lines = toLines(html);
    const top0 = (() => { const i = prevHead(lines); return i >= 0 ? i : lines.length; })();
    // Details (File Name, Created By, Release Date...) aksar "Previous version" ke BAAD sidebar me hoti hain: is liye sirf purane versions wala hissa nikal kar poora page parhte hain
    const END_RE = /^(show more|comments|leave a comment|related|product information)/i;
    const pHead = prevHead(lines);
    let pEnd = pHead >= 0 ? lines.findIndex((l, i) => i > pHead && END_RE.test(strip(l))) : -1;
    if (pEnd < 0) pEnd = lines.length;
    const det = pHead >= 0 ? [...lines.slice(0, pHead), ...lines.slice(pEnd)] : lines;
    let ld = null;
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const j = JSON.parse(m[1]);
            const arr = Array.isArray(j) ? j : j["@graph"] || [j];
            const f = arr.find((x) => /SoftwareApplication/.test(String(x["@type"])));
            if (f)
                ld = f;
        }
        catch { /* skip */ }
    }
    const meta = (n) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`, "i")) || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`, "i")) || [])[1] || "";
    const h1 = strip(((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "").replace(/<[^>]+>/g, " "));
    let version = val(det, "Version") || ld?.softwareVersion || "";
    let name = String(ld?.name || h1 || meta("og:title") || "")
        .replace(/\s+[-|–]\s+[^-|–]+$/, "").replace(/\s+Download\b.*$/i, "").replace(/\s*\(.*?\)\s*/g, " ").trim();
    if (!version) {
        const m = name.match(/(\d+(?:\.\d+)+)\s*$/);
        if (m)
            version = m[1];
    }
    if (!version) {
        const m = lines.join("\n").match(/\bVersion\b[^\d\n]{0,15}(v?\d+(?:\.\d+)+)/i);
        if (m)
            version = m[1];
    }
    if (version && name.endsWith(version))
        name = name.slice(0, -version.length).trim();
    // System requirements
    const si = lines.findIndex((l) => /^system requirements\b/i.test(strip(l)));
    const req = {}, reqLi = [];
    if (si >= 0)
        for (let i = si + 1; i < Math.min(lines.length, si + 16); i++) {
            const l = strip(lines[i]);
            if (/^(previous version|related|comments|leave a comment|overview of)/i.test(l))
                break;
            const m = l.match(/^([A-Za-z /]+?)\s*:\s*(.+)$/);
            if (m) {
                reqLi.push(`${m[1]}: ${m[2]}`);
                const k = m[1].toLowerCase();
                if (/operating|^os/.test(k))
                    req.os = m[2];
                else if (/processor|cpu/.test(k))
                    req.cpu = m[2];
                else if (/ram|memory/.test(k))
                    req.ram = m[2];
                else if (/hard|disk|storage|space/.test(k))
                    req.disk = m[2];
            }
        }
    // Previous versions
    const prev = [];
    const pi = prevHead(lines);
    if (pi >= 0) {
        const DATE = DATE_RE;
        let end = lines.findIndex((l, i) => i > pi && /^(show more|comments|leave a comment|related|product information)/i.test(strip(l)));
        if (end < 0)
            end = lines.length;
        const idx = [];
        lines.forEach((l, i) => { if (i > pi && i < end && isDateLine(l))
            idx.push(i); });
        idx.forEach((s, k) => {
            const e = idx[k + 1] ?? end, seg = lines.slice(s, e);
            const href = seg.map(linkOf).find((x) => x && !/^javascript/i.test(x));
            prev.push({
                release_date: isoDate(dateText(seg[0])),
                version: (val(seg, "Version") || (seg.map(strip).join(" ").match(/\bVersion\s*:?\s*(v?\d+(?:\.\d+)+)/i) || [])[1] || (seg.slice(1).map(strip).join(" ").match(/\b(\d+(?:\.\d+){1,3})\b/) || [])[1] || "").replace(/^v/i, ""),
                file_name: val(seg, "File Name") || (seg.map(strip).join(" ").match(/File Name\s*:?\s*(.+?)(?:\s+Version\b|$)/i) || [])[1] || "",
                size: seg.map(toMBany).find((x) => x != null) ?? null,
                url: bestDownload(seg, url) || (href ? new URL(href, url).href : ""),
            });
        });
    }
    if (!prev.length) {
        const dIdx = [];
        lines.forEach((l, i) => { if (isDateLine(l)) dIdx.push(i); });
        dIdx.forEach((s, k) => {
            const seg = lines.slice(s, Math.min(dIdx[k + 1] ?? lines.length, s + 12)), txt = seg.map(strip).join(" ");
            const ver = (val(seg, "Version") || (txt.match(/\bVersion\s*:?\s*(v?\d+(?:\.\d+)+)/i) || [])[1] || (txt.replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/g, "").match(/\b(\d+(?:\.\d+){1,3})\b/) || [])[1] || "").replace(/^v/i, "");
            const dl = bestDownload(seg, url) || firstLink(seg, url);
            if (ver && dl && ver !== String(version).replace(/^v/i, ""))
                prev.push({ release_date: isoDate(dateText(seg[0])), version: ver, file_name: val(seg, "File Name"), size: seg.map(toMBany).find((x) => x != null) ?? null, url: dl });
        });
    }
    const dlLine = lines.find((l) => /direct download/i.test(strip(l)) && linkOf(l));
    const sizeMain = ld?.fileSize ? toMB(String(ld.fileSize).replace(/\s+/g, " ")) : null;
    const head = det;
    const first = head.map(strip).map(toMB).find((x) => x != null) ?? head.map(toMBany).find((x) => x != null) ?? null;
    const fileName = val(det, "File Name");
    const hi = lines.findIndex((l) => strip(l).toLowerCase() === "home");
    const crumbs = [];
    const hl = lines.find((l) => /^home\b/i.test(strip(l)) && (l.match(/⟦/g) || []).length >= 2);
    if (hl)
        for (const m of hl.matchAll(/([^⟦⟧]+?)\s*⟦[^⟧]+⟧/g)) { const s = m[1].replace(/^[\s>›»\/|-]+|[\s>›»\/|-]+$/g, ""); if (s && s.toLowerCase() !== "home" && s.length < 40) crumbs.push(s); }
    if (!crumbs.length && hi >= 0)
        for (let i = hi + 1; i < Math.min(lines.length, hi + 5); i++) {
            if (!linkOf(lines[i]) && crumbs.length) break;
            const s = strip(lines[i]);
            if (s && s.length < 40) crumbs.push(s);
            if (crumbs.length >= 3) break;
        }
    const ui = det.findIndex((l) => /^uploaded by\b/i.test(strip(l)));
    const tags = [];
    if (ui >= 0)
        for (const l of det.slice(ui + 1, ui + 5))
            for (const m of l.matchAll(/([^,⟦⟧]+?)\s*⟦[^⟧]+⟧/g)) { const s = m[1].trim(); if (s && s.length < 40 && !tags.includes(s) && tags.length < 8) tags.push(s); }
    if (!tags.length)
        meta("keywords").split(",").map((x) => x.trim()).filter((x) => x && x.length < 40).slice(0, 8).forEach((x) => tags.push(x));
    const images0 = parseImages(html, url), images = [...images0], imgSure = !!images0.sure;
    const og = meta("og:image");
    if (!images.length && og) images.push(absUrl(og, url));
    return {
        name, version, ld, req, reqLi, prev, crumbs, tags, images, imgSure, lines: lines.map(strip), hasPrev: pi >= 0 || prev.length > 0, content: extractContent(html), uploadedBy: val(det, "Uploaded By"), downloads: parseInt((val(det, "Total Downloads") || "").replace(/\D/g, ""), 10) || 0,
        icon: pickIcon(html, url, name, ld),
        seoTitle: String(h1 || meta("og:title") || "").replace(/\s+[-|–]\s+[^-|–]+$/, "").trim(),
        developer: val(det, "Created By") || ld?.author?.name || "",
        license: val(det, "License Type") || "",
        languages: val(det, "Languages") || "",
        fileName,
        release_date: (() => {
            for (const lb of ["Release Date", "Released", "Date Released", "Last Updated", "Updated", "Date Published", "Published", "Date"]) { const t = val(det, lb); const iso = t && isoDate(dateText(t) || t.replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi, "$1")); if (iso) return iso; }
            const j = ld?.datePublished || ld?.dateModified || meta("article:published_time") || meta("og:updated_time") || "";
            return j ? isoDate(String(j).slice(0, 10)) : null;
        })(),
        size: sizeMain ?? first,
        url: bestDownload(det, url) || (dlLine ? new URL(linkOf(dlLine), url).href : anyDl(head, url)),
        desc: (meta("og:description") || meta("description") || ld?.description || "").slice(0, 200),
    };
}
export { parsePage };

// ---------- Browser me chalne wala importer (Supabase function ki zaroorat nahi) ----------
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Jina ka markdown -> parser ke liye HTML jaisa
function mdToHtml(md) {
  const title = (md.match(/^Title:\s*(.+)$/m) || [])[1] || "";
  let body = md.split(/^Markdown Content:\s*$/m).pop();
  body = body.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2">$1</a>')
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>").replace(/^#{2,6}\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*|__/g, "").replace(/^\s*[*-]\s+/gm, "").replace(/\s*\|\s*/g, "\n");
  return `${title ? `<h1>${title}</h1>` : ""}` + body.split("\n").map((l) => `<div>${l}</div>`).join("\n");
}

// 3 tareeqe: seedha, free proxy, free renderer. Jo pehle data de wohi liya jata hai, warna sab se behtar.
const tfetch = (u, ms, init) => { const c = new AbortController(); const id = setTimeout(() => c.abort(), ms); return fetch(u, { ...init, signal: c.signal }).finally(() => clearTimeout(id)); };
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch { out[k] = null; } } }));
  return out;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let WAIT = ".swiper-slide img";   // is selector ke aane tak renderer page ka intezar karta hai
export const setWait = (s) => { WAIT = String(s || "").trim(); };
let PROXY = null;
// Apna server (Supabase function) page laata hai: sab se bharosemand tareeqa
export function configure(supabase) {
  const call = async (body) => {
    const { data, error } = await supabase.functions.invoke("ai-post", { body });
    if (error || data?.error) throw new Error(error?.message || data.error);
    if (!data?.html) throw new Error("server se html nahi aaya (ai-post function naya deploy karen)");
    return data.html;
  };
  PROXY = { fetch: (u) => call({ fetch: u }), render: (u) => call({ fetch: u, render: true, wait: WAIT }) };
}
const BASE_METHODS = [
  ["seedha", async (url) => (await tfetch(url, 6000)).text()],
  ["proxy (allorigins)", async (url) => (await tfetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url), 8000)).text()],
  ["renderer (jina)", async (url) => {
    try {   // pehle intezar wale headers ke saath (asli HTML milta hai)
      const r = await tfetch("https://r.jina.ai/" + url, 35000, { headers: { "X-Return-Format": "html", "X-Timeout": "25", ...(WAIT ? { "X-Wait-For-Selector": WAIT } : {}) } });
      if (r.ok) { const h = await r.text(); if (h.length > 500) return h; }
    } catch { /* browser ne headers roke: simple tareeqa */ }
    return mdToHtml(await (await tfetch("https://r.jina.ai/" + url, 25000)).text());
  }],
];
const methods = () => [...(PROXY ? [["server", (u) => PROXY.fetch(u)], ["server+render", (u) => PROXY.render(u)]] : []), ...BASE_METHODS];
const score = (d) => (d.version ? 3 : 0) + (d.url ? 3 : 0) + (d.prev.length ? 3 : 0) + (d.images.length ? 2 : 0) + (d.reqLi.length ? 1 : 0) + (d.tags.length ? 1 : 0) + (d.name ? 1 : 0);
// "mukammal" tab hi maana jaye jab images (3+), purane versions (links ke saath), details sab maujood hon
const isFull = (d) => d.version && d.url && d.images.length >= 3 && d.reqLi.length && d.content && (d.hasPrev ? d.prev.length && d.prev.every((p) => p.url) : true) && [d.fileName, d.developer, d.license, d.languages].filter(Boolean).length >= 3;
const blank = (v) => v == null || v === "" || v === 0 || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
// Alag alag tareeqon ke nateeje jod kar sab se mukammal data banata hai
function merge(list) {
  const s = [...list].sort((a, b) => score(b) - score(a)), out = { ...s[0] };
  for (const d of s.slice(1)) for (const k of Object.keys(d)) if (blank(out[k]) && !blank(d[k])) out[k] = d[k];
  const longest = (k) => s.map((d) => d[k] || []).sort((a, b) => b.length - a.length)[0];
  // slider se mili images: sab tareeqon ki images jod do (har tareeqa kuch alag pakadta hai). Warna sab se lambi list
  const sure = s.filter((d) => d.imgSure);
  out.images = [];
  for (const d of (sure.length ? sure : [{ images: longest("images") }])) for (const u of d.images || []) if (!out.images.some((x) => imgKey(x) === imgKey(u))) out.images.push(u);
  out.imgSure = sure.length > 0;
  if (out.images.length < 3) for (const d of s) for (const u of d.images || []) if (!out.images.some((x) => imgKey(x) === imgKey(u))) out.images.push(u);
  out.images = out.images.slice(0, 12); out.reqLi = longest("reqLi"); out.tags = longest("tags"); out.crumbs = longest("crumbs");
  const pv = new Map();
  for (const d of s) for (const p of d.prev || []) { const k = String(p.version).replace(/^v/i, ""); const c = pv.get(k); if (!c || (!c.url && p.url)) pv.set(k, p); }
  out.prev = [...pv.values()];
  out.hasPrev = s.some((d) => d.hasPrev);
  out.method = s.map((d) => d.method).join(" + ");
  return out;
}
const sample = (html) => toLines(html).slice(0, 25).map(strip).join(" · ").slice(0, 400);

export async function getData(url) {
  const errs = [], got = [];
  return new Promise((resolve, reject) => {
    let left = methods().length, done = false, hard = null;
    const finish = () => { if (done) return; done = true; clearTimeout(hard); got.length ? resolve(merge(got)) : reject(new Error("Page khul nahi saka. " + errs.join(" | "))); };
    hard = setTimeout(finish, 50000);   // koi tareeqa atak jaye to bhi 50 second me jo mila us se kaam chale
    methods().forEach(([m, f]) => {
      f(url).then((html) => {
        const d = parsePage(html, url); d.method = m; d.sample = sample(html); got.push(d);
        if (isFull(merge(got))) finish();   // sab tareeqon ka jora hua data mukammal ho to hi ruko (pehle ek adhoora result par ruk jata tha)
      })
        .catch((e) => errs.push(m + ": " + (e.message || e)))
        .finally(() => { if (--left === 0) finish(); });   // warna sab tareeqon ka intezar, phir sab jod kar
    });
  });
}

export async function inspectUrl(url) {
  const d = await getDataRetry(url);
  return {
    tareeqa: d.method, naam: d.name, version: d.version, download_link: d.url,
    size_mb: d.size, release_date: d.release_date, file_name: d.fileName, created_by: d.developer, license: d.license, languages: d.languages, uploaded_by: d.uploadedBy, downloads: d.downloads,
    purane_versions: d.prev.map((p) => `${p.version} | ${p.release_date || "date?"} | ${p.size ?? "size?"} | ${p.file_name || "file?"} | ${p.url || "link?"}`), images: d.images.length, images_list: d.images.slice(0, 12),
    page_ki_lines: (d.lines || []).filter((l) => /version|previous|older|history|download|\b20\d\d\b/i.test(l)).slice(0, 60),
  };
}

// Test: har tareeqe se kya mila (masla samajhne ke liye)
export async function debugUrl(url) {
  const out = [];
  for (const [m, f] of methods()) {
    try {
      const html = await f(url); const d = parsePage(html, url);
      out.push({ tareeqa: m, html_len: html.length, naam: d.name, version: d.version, purane_versions: d.prev.length, download_link: d.url, page_text: sample(html) });
    } catch (e) { out.push({ tareeqa: m, error: String(e.message || e) }); }
  }
  return out;
}

const toWebp = async (file, max) => { const bmp = await createImageBitmap(file); const r = Math.min(1, max / Math.max(bmp.width, bmp.height)); const c = document.createElement("canvas"); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return new Promise((res) => c.toBlob(res, "image/webp", 0.82)); };

// Image ko free image-proxy se WebP bana kar apne Supabase storage me upload karta hai.
// Asli file na khule to Next.js ki optimized copies (1920, 1080, 750, 640) bhi try karta hai.
export async function imgToStorage(supabase, src, w, square, wm) {
  const tries = [...new Set([stripSize(src), src])];
  try { const u = new URL(src); if (!/_next\/image/.test(src)) for (const n of [1920, 1080, 750, 640]) tries.push(`${u.origin}/_next/image?url=${encodeURIComponent(u.pathname + u.search)}&w=${n}&q=90`); } catch { /* ignore */ }
  let blob = null, last = "";
  for (let round = 0; round < 2 && !blob; round++) {
  if (round) await sleep(1500);
  for (const s of tries) {
    for (const host of ["https://wsrv.nl/", "https://images.weserv.nl/"]) {
      try {
        const r = await tfetch(`${host}?url=${encodeURIComponent(s)}&output=webp&q=86&w=${w}` + (square ? `&h=${w}&fit=cover` : "&we"), 30000);
        if (r.ok) { const b = await r.blob(); if (b.size >= 500 && /image/.test(b.type)) { blob = b; break; } last = `${host.split("/")[2]}: image nahi mili`; }
        else last = `${host.split("/")[2]} ${r.status}`;
      } catch (e) { last = e.name === "AbortError" ? "time out" : String(e.message || e); }
    }
    if (blob) break;
  }
  }
  if (!blob) { try { const r = await tfetch(src, 15000); if (r.ok) { const b = await r.blob(); if (/image/.test(b.type)) blob = await toWebp(b, w); } } catch { /* ignore */ } }
  if (!blob) throw new Error(last || "image download nahi hui");
  if (wm && !square) blob = await addWatermark(blob, wm);   // slider images par website ka naam
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage.from("images").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

export async function saveDraft(supabase, d, cats, opts = {}) {
  if (!d.name || (!d.version && !d.prev.length)) throw new Error(`Page me title/version nahi mila [${d.method}] naam="${d.name}" | page ka text: ${d.sample}`);
  const mac = /mac|dmg|pkg/i.test((d.req.os || "") + " " + d.fileName);
  const platform = mac ? "Mac" : "Windows";
  const byCrumb = d.crumbs && d.crumbs[0] ? cats.find((c) => (c.name || "").toLowerCase() === d.crumbs[0].toLowerCase()) : null;
  const cat = byCrumb || cats.find((c) => c.icon === (mac ? "apple" : "windows")) || cats[0];
  const sub = d.crumbs && d.crumbs[1] && d.crumbs[1].toLowerCase() !== (cat?.name || "").toLowerCase() ? d.crumbs[1] : null;
  const base = slugify(d.name); let slug = base, k = 2;
  if (opts.skipExisting && (await supabase.from("software").select("id").eq("slug", slug).maybeSingle()).data) throw new Error("pehle se maujood hai (skip)");
  while ((await supabase.from("software").select("id").eq("slug", slug).maybeSingle()).data) slug = `${base}-${k++}`;
  const { data: post, error } = await supabase.from("software").insert({
    category_id: cat?.id, name: d.name, slug, short_desc: d.desc, content: d.content || null, uploaded_by: d.uploadedBy || null, download_count: d.downloads || 0, developer: d.developer || null, license_type: d.license || "full_version",
    languages: d.languages || "Multilingual", file_name: d.fileName || null, platform, tags: d.tags || [], images: [], seo_title: d.seoTitle || null, subcategory: sub, status: "draft", source_type: "none", auto_update: false,
    sys_req: d.reqLi.length ? `<ul>${d.reqLi.map((x) => `<li>${x.replace(/</g, "&lt;")}</li>`).join("")}</ul>` : null,
  }).select("id").single();
  if (error) throw error;
  const arch = (n) => /x86|32-?bit/i.test(n) && !/64/.test(n) ? "32-bit" : "64-bit";
  const common = { software_id: post.id, os: d.req.os || (mac ? "macOS" : "Windows 10/11"), min_ram: d.req.ram || null, min_cpu: d.req.cpu || null, min_storage: d.req.disk || null };
  const rows = [];
  if (d.version) rows.push({ ...common, version: d.version, release_date: d.release_date, file_size_mb: d.size, download_url: d.url || "#", file_name: d.fileName || null, arch: arch(d.fileName), is_latest: true });
  for (const p of d.prev) if (p.version && p.version !== d.version) rows.push({ ...common, version: p.version, release_date: p.release_date, file_size_mb: p.size, download_url: p.url || "#", file_name: p.file_name || null, arch: arch(p.file_name || ""), is_latest: !rows.length });
  if (!rows.length) throw new Error("Koi version nahi mila");
  const { error: e2 } = await supabase.from("versions").insert(rows);
  if (e2) throw e2;
  const warn = [], step = opts.onStep || (() => {});
  if (opts.withImages !== false && (d.images.length || d.icon)) {
    step(`images upload ho rahi hain (${Math.min(d.images.length, 12)})...`);
    const iconSrc = d.icon || d.images[0], errs = [];
    const [res, icon] = await Promise.all([
      pool(d.images.slice(0, 12), 2, (s) => imgToStorage(supabase, s, 1600, false, opts.watermark).catch((e) => { errs.push(String(e.message || e)); return null; })),
      iconSrc ? imgToStorage(supabase, iconSrc, 256, true).catch((e) => { errs.push("icon: " + (e.message || e)); return null; }) : null,
    ]);
    for (let k = 0; k < res.length; k++) if (!res[k]) { await sleep(1500); res[k] = await imgToStorage(supabase, d.images[k], 1600, false, opts.watermark).catch((e) => { errs.push(String(e.message || e)); return null; }); }   // fail hui image dobara
    const imgs = res.filter(Boolean), upd = {};
    if (res.some((x) => !x)) warn.push(`slider image (${errs[0] || "?"})`);
    if (imgs.length) { upd.images = imgs; upd.image_alts = imgs.map((_, k) => `${d.name} screenshot ${k + 1}`); }
    if (icon) upd.icon_url = icon; else if (iconSrc) warn.push("icon");
    if (Object.keys(upd).length) await supabase.from("software").update(upd).eq("id", post.id);
  }
  return { id: post.id, warn };
}

// Kya kya abhi baqi hai (khali list = post mukammal)
export function missingParts(d, stable) {
  const m = [];
  if (!d.name) m.push("naam");
  if (!d.version) m.push("version");
  if (!d.url) m.push("download link");
  if (d.size == null) m.push("size");
  if (!d.release_date) m.push("date");
  if ([d.fileName, d.developer, d.license, d.languages].filter(Boolean).length < 3) m.push("software details");
  if (!d.reqLi.length && !Object.keys(d.req || {}).length) m.push("requirements");
  if (!d.content) m.push("content (article)");
  if (!(d.images.length >= 3 || (d.images.length >= 2 && stable))) m.push(d.images.length ? "images poori nahi" : "images");
  if (d.hasPrev) { if (!d.prev.length) m.push("purane versions"); else if (d.prev.some((p) => !p.url)) m.push("purane versions ke links"); else if (d.prev.some((p) => !p.release_date)) m.push("purane versions ki date"); }
  return m;
}
// Jab tak sab kuch na mile, bar bar page parhta hai (har koshish ka data pichle me jurta jata hai)
export async function collectComplete(url, step = () => {}, maxTries = 6, delay = 2000) {
  let acc = null, lastCount = -1, lastMissing = [];
  for (let a = 1; a <= maxTries; a++) {
    step(`koshish ${a}/${maxTries}${lastMissing.length ? " (baqi: " + lastMissing.join(", ") + ")" : ""}...`);
    try { const d = await getData(url); acc = acc ? merge([acc, d]) : d; } catch { /* agli koshish */ }
    if (acc) {
      const stable = acc.images.length > 0 && acc.images.length === lastCount;
      lastCount = acc.images.length; lastMissing = missingParts(acc, stable);
      if (!lastMissing.length) return { d: acc, missing: [], tries: a };
    }
    if (a < maxTries) await sleep(delay * a);
  }
  if (!acc) throw new Error("Page khul nahi saka");
  return { d: acc, missing: lastMissing, tries: maxTries };
}

// Kam az kam 3 koshish; jo cheez ek koshish me na mile wo agli me jur jati hai
export async function getDataRetry(url, tries = 3) {
  let acc = null, lastErr = null, lastCount = -1;
  for (let a = 0; a < tries; a++) {
    try {
      const d = await getData(url); acc = acc ? merge([acc, d]) : d;
      const stable = acc.images.length > 0 && acc.images.length === lastCount; lastCount = acc.images.length;
      if (!missingParts(acc, stable).length) break;
    } catch (e) { lastErr = e; }
    if (a < tries - 1) await new Promise((r) => setTimeout(r, 1500 * (a + 1)));
  }
  if (!acc) throw lastErr || new Error("Page khul nahi saka");
  return acc;
}
export const report = (d) => ({ link: !!d.url, prev: d.prev.length, prevLinks: d.prev.filter((p) => p.url).length, images: d.images.length });

export const importUrl = async (supabase, url, cats, opts = {}) => {
  const step = opts.onStep || (() => {});
  const { d, missing, tries } = await collectComplete(url, step, opts.maxTries || 6, opts.delay ?? 2000);
  step("post ban rahi hai...");
  const r = await saveDraft(supabase, d, cats, opts);
  return { ...r, missing, tries };
};
export const importHtml = async (supabase, html, url, cats, opts) => saveDraft(supabase, parsePage(html, url), cats, opts);
const BRAND = "Filecr"; // Post.jsx wale BRAND ke barabar hi rakhen
const SB = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_KEY;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonLd = (id, data) => `<script type="application/ld+json" id="ld-${id}">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

async function q(path) {
  try {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

const newest = (vs) => [...(vs || [])].sort((a, b) => (b.is_latest - a.is_latest) || (new Date(b.release_date) - new Date(a.release_date)))[0];

const withYear = (base) => {
  let t = String(base || "").trim(), prev;
  do {
    prev = t;
    t = t.replace(new RegExp(`[\\s\\-–|]*(?:FileCR|${BRAND})\\s*\\)?\\s*$`, "i"), "").replace(/[\s\-–|]*\(?\s*(?:Free\s+)?Download\s+Latest\s+\d{4}\s*\)?\s*$/i, "").trim();
  } while (t !== prev);
  return `${t.replace(/[\s\-–|]+$/, "")} (Download Latest ${new Date().getFullYear()}) - ${BRAND}`.trim();
};

function tags({ title, desc, url, image, type, site }) {
  const t = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${esc(site)}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
  ];
  if (image) t.push(`<meta property="og:image" content="${esc(image)}">`, `<meta name="twitter:image" content="${esc(image)}">`);
  return t.join("");
}

export default async function handler(req, res) {
  const { type, slug } = req.query;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = process.env.SITE_URL || `https://${host}`;

  let html;
  try { html = await (await fetch(`https://${host}/index.html`)).text(); }
  catch { return res.status(500).send("Server error"); }

  const send = (code, out, cache) => {
    res.status(code);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", cache || "no-store");
    return res.send(out);
  };

  const st = (await q("site_settings?id=eq.1&select=data"))?.[0]?.data || {};
  const site = st.site_name || BRAND;
  const noindex = `<meta name="robots" content="noindex, nofollow">`;
  const notFound = { status: 404, title: "404 - Page not found", head: noindex, body: `<main><h1>404 - Page not found</h1><p><a href="/">Go to homepage</a></p></main>` };
  let page = notFound;

  if (type === "post") {
    const rows = await q(`software?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*,categories(name,slug),versions(*)&limit=1`);
    if (rows === null) return send(200, html);   // database masla: normal app chalne den
    const s = rows[0];
    if (s) {
      const lv = newest(s.versions), imgs = s.images || [];
      const h1 = withYear(s.seo_title || `${s.name} ${lv?.version || ""}`);
      const desc = (s.short_desc || "").slice(0, 160);
      const url = `${origin}/software/${s.slug}`;
      const image = imgs[0] || s.icon_url;
      let custom = null;
      try { custom = s.custom_schema ? JSON.parse(s.custom_schema) : null; } catch { custom = null; }
      const app = custom || { "@context": "https://schema.org", "@type": "SoftwareApplication", name: s.name, description: s.short_desc, image: image || undefined, applicationCategory: s.categories?.name, operatingSystem: lv?.os, softwareVersion: lv?.version, fileSize: lv?.file_size_mb ? `${lv.file_size_mb} MB` : undefined, datePublished: lv?.release_date || undefined, downloadUrl: lv?.download_url, author: s.developer ? { "@type": "Organization", name: s.developer } : undefined, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, aggregateRating: s.rating_count > 0 ? { "@type": "AggregateRating", ratingValue: s.rating, ratingCount: s.rating_count } : undefined };
      const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", origin], [s.categories?.name, `${origin}/category/${s.categories?.slug}`], [s.name, url]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) };
      page = {
        status: 200, title: h1,
        head: tags({ title: h1, desc, url, image, type: "article", site }) + jsonLd("app", app) + jsonLd("crumbs", crumbs),
        body: `<main><nav><a href="/">Home</a> › <a href="/category/${esc(s.categories?.slug)}">${esc(s.categories?.name)}</a></nav><h1>${esc(h1)}</h1><p>${esc(s.short_desc)}</p>${image ? `<img src="${esc(image)}" alt="${esc(s.name)}">` : ""}<div>${s.content || ""}</div>${s.sys_req ? `<h2>System Requirements</h2><div>${s.sys_req}</div>` : ""}</main>`,
      };
    }
  } else if (type === "category") {
    const cats = await q(`categories?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
    if (cats === null) return send(200, html);
    const c = cats[0];
    if (c) {
      const list = (await q(`software?category_id=eq.${c.id}&status=eq.published&select=name,slug,short_desc&order=created_at.desc&limit=20`)) || [];
      const title = `${c.name} Software Download - ${site}`;
      const desc = c.description || `Browse and download the latest ${c.name} software with version history and direct download links.`;
      const url = `${origin}/category/${c.slug}`;
      page = {
        status: 200, title,
        head: tags({ title, desc, url, image: st.logo_url, type: "website", site }),
        body: `<main><nav><a href="/">Home</a></nav><h1>${esc(c.name)}</h1><ul>${list.map((x) => `<li><a href="/software/${esc(x.slug)}">${esc(x.name)}</a> - ${esc(x.short_desc)}</li>`).join("")}</ul></main>`,
      };
    }
  }

  // () => ... use karna zaroori hai, warna content ke "$" wale characters bigad jate hain
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, () => "")
    .replace("</head>", () => `${page.head}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${page.body}</div>`);

  return send(page.status, html, page.status === 200 ? "public, s-maxage=300, stale-while-revalidate=600" : "no-store");
}
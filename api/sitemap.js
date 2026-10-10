const SB = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_KEY;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function all(path) {
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    const r = await fetch(`${SB}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Range-Unit": "items", Range: `${from}-${from + 999}` },
    });
    if (!r.ok) break;
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = process.env.SITE_URL || `https://${host}`;
  const [cats, posts] = await Promise.all([
    all("categories?select=slug&order=sort_order"),
    all("software?status=eq.published&select=slug,created_at&order=created_at.desc"),
  ]);
  const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const url = (loc, lastmod) => `<url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    url(origin + "/") +
    cats.map((c) => url(`${origin}/category/${encodeURIComponent(c.slug)}`)).join("") +
    posts.map((p) => url(`${origin}/software/${encodeURIComponent(p.slug)}`, day(p.created_at))).join("") +
    `</urlset>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");
  res.status(200).send(xml);
}
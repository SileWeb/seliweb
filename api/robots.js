export default function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = process.env.SITE_URL || `https://${host}`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600");
  res.status(200).send(`User-agent: *\nAllow: /\n\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`);
}
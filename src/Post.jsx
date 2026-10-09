import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "./supabase";
import { Heart, Clock, Down, Chev } from "./icons.jsx";
import { JsonLd } from "./site.jsx";

const css = `
.ban{background:linear-gradient(90deg,#10c9a0,#1fc3f0);color:#fff;padding:22px 0}
.ban .in{max-width:1224px;margin:0 auto;padding:0 16px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ban h2{margin:0;font-size:26px}.ban nav{font-size:15px}
.pg{max-width:1224px;margin:24px auto;padding:0 16px;display:grid;grid-template-columns:1fr 380px;gap:24px}
.card{background:#fff;border:1px solid #eee;border-radius:14px;padding:28px;margin-bottom:24px;min-width:0}
.card h1{font-size:34px;font-weight:500;margin:0 0 16px}
.card h2{font-weight:500}
.slider{position:relative;background:#f4f4f4;border-radius:8px;overflow:hidden;margin:20px 0}
.slider img{width:100%;height:auto;max-height:520px;object-fit:contain;display:block}
.sl{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:0;background:#222;color:#fff;font-size:20px;cursor:pointer}
.body{line-height:1.8;color:#555;overflow-wrap:anywhere}.body img{max-width:100%;height:auto}
.big{text-align:center;font-size:56px}.big small{font-size:24px}
.b{display:block;width:100%;box-sizing:border-box;text-align:center;padding:16px;border-radius:6px;border:0;font-size:17px;color:#fff;cursor:pointer;margin-top:14px}
.dark{background:#2b3a42}.grn{background:var(--pc,#0a8f6b)}
.badge{background:#8a6d00;color:#fff;padding:1px 8px;border-radius:4px;font-size:13px}
.ir{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #eee;font-size:15px}.ir span:last-child{text-align:right}
.pv{display:grid;grid-template-columns:130px 1fr 100px;gap:12px;padding:16px 0;border-bottom:1px solid #eee;align-items:center;font-size:14px}
.dl{display:inline-block;background:var(--pc,#0a8f6b);color:#fff;border-radius:6px;padding:8px 10px}
.cm input,.cm textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:6px;margin:6px 0 12px;font:inherit}
.rel{display:flex;gap:12px;align-items:center;padding:10px 0}.rel img,.rel i{width:64px;height:64px;border-radius:8px;object-fit:cover;background:var(--pc,#0a8f6b);flex:none}
.ban{padding:18px 0}.ban h2{font-size:24px;font-weight:600}.ban nav{display:flex;align-items:center;gap:4px}
.card{border-radius:12px;padding:28px 32px}.card h1{font-size:32px;line-height:1.25}.card h2{margin-top:0;font-size:22px}
.body{font-size:16px}.body h2,.body h3{color:#2b3a42;font-weight:500}
.big{font-size:52px;line-height:1.1}
.b{display:flex;align-items:center;justify-content:center;gap:10px;font-size:16px;padding:15px;border-radius:6px;text-decoration:none}
.opt{display:flex;align-items:center;gap:10px;margin:18px 0 0;text-align:left}.opt i{width:18px;height:18px;border-radius:50%;border:5px solid #10c9a0;box-sizing:border-box}
.vh{display:inline-flex;align-items:center;gap:8px;color:var(--pc,#0a8f6b)}
.dl{display:inline-flex}
@media(max-width:1000px){.pg{grid-template-columns:1fr}.pside{order:-1}.card h1{font-size:26px}}
@media(max-width:600px){.pv{grid-template-columns:1fr 70px}.pv>div:first-child{grid-column:1/-1}.card{padding:18px}}
`;
const sz = (mb) => mb == null ? "—" : mb >= 1024 ? [+(mb / 1024).toFixed(2), "GB"] : [+mb, "MB"];
const dt = (d) => d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
const newest = (vs) => [...(vs || [])].sort((a, b) => (b.is_latest - a.is_latest) || new Date(b.release_date) - new Date(a.release_date))[0];
const Stars = ({ n }) => <span aria-label={`${n} stars`}>{[1, 2, 3, 4, 5].map((i) => { const p = Math.max(0, Math.min(1, n - (i - 1))) * 100; return <span key={i} style={{ background: `linear-gradient(90deg,#f5b301 ${p}%,#ddd ${p}%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>★</span>; })}</span>;
// Title ke end me hamesha "(Download Latest <is saal>) - FileCR". Saal computer ki date se khud badalta hai (2027 aate hi sab posts me 2027).
// Purani title me pehle se ye likha ho to hata kar naya laga deta hai. Alag likhna ho to sirf neeche wali line badlen.
const TITLE_END = (year) => `(Download Latest ${year}) - FileCR`;
const withYear = (base) => {
  let t = String(base || "").trim(), prev;
  do {
    prev = t;
    t = t.replace(/[\s\-–|]*FileCR\s*\)?\s*$/i, "").replace(/[\s\-–|]*\(?\s*(?:Free\s+)?Download\s+Latest\s+\d{4}\s*\)?\s*$/i, "").trim();
  } while (t !== prev);
  return `${t.replace(/[\s\-–|]+$/, "")} ${TITLE_END(new Date().getFullYear())}`.trim();
};
const meta = (t, d) => {
  document.title = t;
  let m = document.querySelector("meta[name=description]");
  if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
  m.content = d || "";
};

export default function Post() {
  const { slug } = useParams();
  const [s, setS] = useState(null), [rel, setRel] = useState([]), [cm, setCm] = useState([]);
  const [i, setI] = useState(0), [more, setMore] = useState(false), [fav, setFav] = useState(false), [sent, setSent] = useState(false);

  const [err, setErr] = useState("");

  useEffect(() => {
    let on = true;
    setS(null); setErr(""); setI(0); setMore(false); setSent(false); window.scrollTo(0, 0);
    (async () => {
      try {
        // 1 query me sab; embed fail ho to alag-alag queries
        let r = await supabase.from("software").select("*, categories(name,slug), versions(*)").eq("slug", slug).maybeSingle();
        let data = r.data;
        if (r.error) {
          const p1 = await supabase.from("software").select("*").eq("slug", slug).maybeSingle();
          if (p1.error) throw p1.error;
          data = p1.data;
          if (data) {
            const [c, v] = await Promise.all([
              supabase.from("categories").select("name,slug").eq("id", data.category_id).maybeSingle(),
              supabase.from("versions").select("*").eq("software_id", data.id),
            ]);
            data = { ...data, categories: c.data, versions: v.data || [] };
          }
        }
        if (!on) return;
        if (!data) { setErr(`Ye post nahi mili (slug: ${slug})`); return; }
        data.versions = data.versions || [];
        setS(data);
        meta(withYear(data.seo_title || `${data.name} ${newest(data.versions)?.version || ""}`), data.short_desc);
        try { setFav(JSON.parse(localStorage.getItem("fav") || "[]").includes(data.id)); } catch { /* ignore */ }
        supabase.from("software").select("id,name,slug,icon_url,platform,versions(version,file_size_mb,is_latest,release_date)").eq("category_id", data.category_id).neq("id", data.id).eq("status", "published").limit(6).then(({ data: x }) => on && setRel(x || []));
        supabase.from("comments").select("name,message,created_at").eq("software_id", data.id).eq("approved", true).order("created_at", { ascending: false }).then(({ data: x }) => on && setCm(x || []));
      } catch (e) { if (on) setErr(e.message || String(e)); }
    })();
    return () => { on = false; };
  }, [slug]);

  if (err) return <div style={{ padding: 40 }}><p><b>Post load nahi hui:</b> {err}</p><Link to="/">← Home</Link></div>;

  if (!s) return <div style={{ padding: 40 }}>Loading...</div>;
  const lv = newest(s.versions);
  const prev = [...s.versions].filter((v) => v !== lv).sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
  const imgs = s.images || [];
  const [n, u] = sz(lv?.file_size_mb);

  const toggleFav = () => {
    try {
      const a = JSON.parse(localStorage.getItem("fav") || "[]");
      const b = a.includes(s.id) ? a.filter((x) => x !== s.id) : [...a, s.id];
      localStorage.setItem("fav", JSON.stringify(b)); setFav(b.includes(s.id));
    } catch { /* ignore */ }
  };
  const submit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await supabase.from("comments").insert({ software_id: s.id, name: f.get("name"), email: f.get("email"), message: f.get("message") });
    if (!error) { setSent(true); e.target.reset(); }
  };
  const info = [["File Name", lv?.file_name || s.file_name], ["Created By", s.developer], ["Version", lv?.version], ["License Type", s.license_type], ["Release Date", dt(lv?.release_date)], ["Languages", s.languages], ["Total Downloads", s.download_count], ["Uploaded By", s.uploaded_by]];

  const origin = location.origin;
  let custom = null;
  try { custom = s.custom_schema ? JSON.parse(s.custom_schema) : null; } catch { custom = null; }
  const ld = custom || { "@context": "https://schema.org", "@type": "SoftwareApplication", name: s.name, description: s.short_desc, image: imgs[0] || s.icon_url || undefined, applicationCategory: s.categories?.name, operatingSystem: lv?.os, softwareVersion: lv?.version, fileSize: lv?.file_size_mb ? `${lv.file_size_mb} MB` : undefined, datePublished: lv?.release_date || undefined, downloadUrl: lv?.download_url, author: s.developer ? { "@type": "Organization", name: s.developer } : undefined, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, aggregateRating: s.rating_count > 0 ? { "@type": "AggregateRating", ratingValue: s.rating, ratingCount: s.rating_count } : undefined };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Home", origin], [s.categories?.name, `${origin}/category/${s.categories?.slug}`], [s.name, `${origin}/software/${s.slug}`]].map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) };

  return (<>
    <style>{css}</style>
    <JsonLd id="app" data={ld} /><JsonLd id="crumbs" data={crumbs} />
    <div className="ban"><div className="in">
      <h2>{s.name} {lv?.version}</h2>
      <nav><Link to="/">Home</Link><Chev /><Link to={`/category/${s.categories?.slug}`}>{s.categories?.name}</Link>{s.subcategory && s.subcategory !== s.categories?.name && <><Chev />{s.subcategory}</>}</nav>
    </div></div>
    <div className="pg">
      <div>
        <div className="card">
          <h1>{withYear(s.seo_title || `${s.name} ${lv?.version || ""}`)}</h1>
          <p className="body">{s.short_desc}</p>
          {imgs.length > 0 && (
            <div className="slider">
              <img src={imgs[i]} alt={s.image_alts?.[i] || `${s.name} screenshot ${i + 1}`} loading="lazy" decoding="async" />
              {imgs.length > 1 && <>
                <button className="sl" style={{ left: 10 }} onClick={() => setI((i - 1 + imgs.length) % imgs.length)} aria-label="Previous">‹</button>
                <button className="sl" style={{ right: 10 }} onClick={() => setI((i + 1) % imgs.length)} aria-label="Next">›</button>
              </>}
            </div>
          )}
          <div className="body" dangerouslySetInnerHTML={{ __html: s.content || "" }} />
          {s.sys_req && <><h2>System Requirements</h2><div className="body" dangerouslySetInnerHTML={{ __html: s.sys_req }} /></>}
        </div>

        <div className="card" id="versions" style={prev.length ? undefined : { display: "none" }}>
          <h2>Previous version</h2>
          {prev.slice(0, more ? prev.length : 4).map((v) => {
            const [a, b] = sz(v.file_size_mb);
            return (
              <div className="pv" key={v.id}>
                <div>{dt(v.release_date)}</div>
                <div><b>File Name:</b> {v.file_name || `${s.name} ${v.version}`}<br /><b>Version:</b> {v.version} · {v.arch} · {v.os}<br /><small>RAM {v.min_ram || "—"} · CPU {v.min_cpu || "—"} · Disk {v.min_storage || "—"}</small></div>
                <div style={{ textAlign: "center" }}><a className="dl" href={v.download_url} target="_blank" rel="noopener noreferrer" aria-label="Download"><Down /></a><div>{a} {b}</div></div>
              </div>
            );
          })}
          {prev.length > 4 && !more && <p style={{ textAlign: "center" }}><button className="btn" onClick={() => setMore(true)}>Show More ⌄</button></p>}
        </div>

        <div className="card cm">
          <h2>Comments</h2>
          {cm.map((c, k) => <p key={k}><b>{c.name}</b> · <small>{dt(c.created_at)}</small><br />{c.message}</p>)}
          <h3>Leave a comment</h3>
          {sent ? <p style={{ color: "var(--pc,#0a8f6b)" }}>Shukriya! Comment review ke baad nazar aaye ga.</p> : (
            <form onSubmit={submit}>
              <input name="name" placeholder="Name" required /><input name="email" type="email" placeholder="Email" required />
              <textarea name="message" rows="4" placeholder="Write your comment here..." required />
              <button className="b grn" style={{ width: "auto", padding: "14px 30px" }}>Post Comment</button>
            </form>
          )}
        </div>
      </div>

      <aside className="pside">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="big">{n}<small> {u}</small></div>
          <div><span className="badge">{s.rating}</span> {s.rating_count > 0 && <small>{s.rating_count} </small>}<Stars n={s.rating} /></div>
          <div className="opt"><i />Direct download</div>
          <a className="b dark" href={lv?.download_url} target="_blank" rel="noopener noreferrer" onClick={() => supabase.rpc("increment_download", { sid: s.id })}>Direct Download</a>
          <button className="b grn" onClick={toggleFav}><Heart /> {fav ? "Added to Favorite" : "Add to Favorite"}</button>
          <p><a href="#versions" className="vh"><Clock /> Version history</a></p>
        </div>
        <div className="card">
          <h2>Product Information</h2>
          {info.map(([k, v]) => <div className="ir" key={k}><span>{k}</span><span>{v ?? "—"}</span></div>)}
          <p style={{ color: "var(--pc,#0a8f6b)" }}>{(s.tags || []).join(", ")}</p>
        </div>
        <div className="card">
          <h2>Related Products</h2>
          {rel.map((r) => { const v = newest(r.versions); const [a, b] = sz(v?.file_size_mb); return (
            <Link to={`/software/${r.slug}`} className="rel" key={r.id}>
              {r.icon_url ? <img src={r.icon_url} alt="" loading="lazy" width="64" height="64" /> : <i />}
              <div><div>{r.name} {v?.version}</div><small style={{ color: "var(--pc,#0a8f6b)" }}>{r.platform}</small><div style={{ fontSize: 22 }}>{a}<small>{b}</small></div></div>
            </Link>); })}
        </div>
      </aside>
    </div>
  </>);
}
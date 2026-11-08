import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "./supabase";
import { useSettings } from "./site.jsx";

const css = `
.dlp{max-width:620px;margin:60px auto;padding:0 16px}
.dlp .card{background:#fff;border:1px solid #eee;border-radius:14px;padding:36px 28px;text-align:center}
.dlp h2{margin:0 0 6px;font-weight:500}
.dlp .sub{color:#666;margin:0 0 24px}
.dlp .ring{width:110px;height:110px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:600;color:var(--pc,#0a8f6b);border:6px solid #e9f6f2;border-top-color:var(--pc,#0a8f6b);animation:dlspin 1s linear infinite}
.dlp .ring span{animation:dlspin 1s linear infinite reverse}
@keyframes dlspin{to{transform:rotate(360deg)}}
.dlp .go{display:inline-block;margin-top:8px;padding:14px 34px;border-radius:8px;background:var(--pc,#0a8f6b);color:#fff;font-size:17px}
.dlp .bk{display:block;margin-top:18px;color:#666;font-size:14px}
`;

export default function Download() {
  const { slug } = useParams();
  const [q] = useSearchParams();
  const ver = q.get("v");
  const st = useSettings();
  const wait = Math.min(Math.max(parseInt(st.dl_wait, 10) || 8, 1), 60);
  const [v, setV] = useState(null), [err, setErr] = useState("");
  const [left, setLeft] = useState(wait);
  // Admin me Override URL ho to wahi, warna post ka apna URL (sirf http/https allow)
  const ov = (st.dl_url || "").trim();
  const own = v?.download_url;
  const target = /^https?:\/\//i.test(ov) ? ov : (/^https?:\/\//i.test(own || "") ? own : "");

  // 1) Version ka asal download_url database se lo
  useEffect(() => {
    let on = true;
    supabase.from("software").select("name,slug,versions(*)").eq("slug", slug).maybeSingle()
      .then(({ data, error }) => {
        if (!on) return;
        const vs = [...(data?.versions || [])].sort((a, b) => (b.is_latest - a.is_latest) || new Date(b.release_date) - new Date(a.release_date));
        const pick = (ver && vs.find((x) => String(x.version) === ver)) || vs[0];
        if (error || !pick) setErr("Download link not found.");
        else setV({ download_url: pick.download_url, software: { name: data.name, slug: data.slug } });
      });
    return () => { on = false; };
  }, [slug, ver]);

  // 2) Setting load hone ke baad timer dobara wait se start ho
  useEffect(() => { setLeft(wait); }, [wait]);

  // 3) Countdown, 0 par asal URL khul jaye
  useEffect(() => {
    if (!v) return;
    if (!target) return;
    if (left <= 0) { window.location.href = target; return; }
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [v, left, target]);

  return (
    <div className="dlp">
      <style>{css}</style>
      <div className="card">
        {err || (v && !target) ? (
          <><h2>{err || "Download link not found."}</h2><Link to="/" className="bk">← Home</Link></>
        ) : !v ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="ring"><span>{Math.max(left, 0)}</span></div>
            <h2>{v.software?.name || "Your file"}</h2>
            <p className="sub">Your download will start in {Math.max(left, 0)} second{left === 1 ? "" : "s"}...</p>
            <a className="go" href={target}>Download now</a>
            {v.software?.slug && <Link to={`/software/${v.software.slug}`} className="bk">← Back to post</Link>}
          </>
        )}
      </div>
    </div>
  );
}

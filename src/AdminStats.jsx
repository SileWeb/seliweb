import { useEffect, useState } from "react";
import { supabase } from "./supabase";

let DN = null;
try { DN = new Intl.DisplayNames(["en"], { type: "region" }); } catch { /* purana browser */ }
const cname = (c) => { if (!c || c === "XX" || c === "T1") return "Unknown"; try { return DN?.of(c) || c; } catch { return c; } };
const n0 = (x) => Number(x) || 0;
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const fmt = (x) => x.toLocaleString();

const S = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 },
  kpi: { border: "1px solid #eee", borderRadius: 12, padding: "16px 18px", background: "#fff" },
  lbl: { color: "#666", fontSize: 13, margin: "0 0 6px" },
  big: { fontSize: 32, fontWeight: 600, margin: 0, lineHeight: 1.1 },
  sm: { fontSize: 12, margin: "6px 0 0", color: "#888" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  track: { height: 8, borderRadius: 4, background: "#f0f0f0", overflow: "hidden" },
};
const Bar = ({ w, color }) => <div style={S.track}><div style={{ height: "100%", width: `${Math.min(100, w)}%`, background: color || "var(--pc,#0a8f6b)", borderRadius: 4, minWidth: w > 0 ? 3 : 0 }} /></div>;
const Delta = ({ a, b }) => {
  if (!b) return <p style={S.sm}>Kal ka data nahi</p>;
  const d = ((a - b) / b) * 100;
  return <p style={{ ...S.sm, color: d >= 0 ? "#0a8f6b" : "#e5484d" }}>{d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(0)}% kal ke muqable</p>;
};

export function Stats() {
  const [days, setDays] = useState(30), [rows, setRows] = useState(null), [cs, setCs] = useState(null), [err, setErr] = useState("");
  const load = () => {
    Promise.all([supabase.rpc("site_stats", { p_days: days }), supabase.rpc("country_stats", { p_days: days })]).then(([a, b]) => {
      const e = a.error || b.error;
      if (e) return setErr(e.message);
      setErr(""); setRows(a.data || []); setCs(b.data || []);
    });
  };
  useEffect(() => { setRows(null); load(); }, [days]);

  if (err) return <div className="a-card"><h3>Stats</h3><p className="a-sub" style={{ marginLeft: 0 }}>Stats load nahi huin: {err}</p><p className="a-sub" style={{ marginLeft: 0 }}>Supabase SQL Editor me visitor_stats.sql dobara run karen.</p></div>;
  if (!rows || !cs) return <div className="a-card"><p>Loading...</p></div>;

  const t = rows[0] || {}, y = rows[1] || {};
  const vis = n0(t.visitors), uc = n0(t.unique_clicks);
  const maxV = Math.max(1, ...rows.map((r) => n0(r.visitors)));
  const totV = rows.reduce((a, r) => a + n0(r.visitors), 0), totU = rows.reduce((a, r) => a + n0(r.unique_clicks), 0), totC = rows.reduce((a, r) => a + n0(r.total_clicks), 0);

  // Countries: top 10 + baqi "Other"
  const cv = cs.reduce((a, r) => a + n0(r.visitors), 0);
  const top = cs.slice(0, 10), rest = cs.slice(10);
  const list = rest.length ? [...top, { code: "OTHER", visitors: rest.reduce((a, r) => a + n0(r.visitors), 0), downloaders: rest.reduce((a, r) => a + n0(r.downloaders), 0) }] : top;
  const lead = cs.find((r) => r.code !== "XX") || cs[0];

  return (<>
    <div className="a-card">
      <div style={S.head}>
        <div><h3 style={{ margin: 0 }}>Overview</h3><p className="a-sub" style={{ marginLeft: 0 }}>Unique IP ke hisab se. Din Pakistan time (PKT) se badalta hai, bots shamil nahi.</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={days} onChange={(e) => setDays(+e.target.value)} style={{ width: "auto" }}>{[7, 14, 30, 90].map((d) => <option key={d} value={d}>Pichle {d} din</option>)}</select>
          <button className="a-btn" onClick={load}>Refresh</button>
        </div>
      </div>
      <div style={{ ...S.grid, marginTop: 14 }}>
        <div style={S.kpi}><p style={S.lbl}>Aaj ke unique visitors</p><p style={S.big}>{fmt(vis)}</p><Delta a={vis} b={n0(y.visitors)} /></div>
        <div style={S.kpi}><p style={S.lbl}>Aaj ke unique download clicks</p><p style={S.big}>{fmt(uc)}</p><Delta a={uc} b={n0(y.unique_clicks)} /></div>
        <div style={S.kpi}><p style={S.lbl}>Aaj ka download rate</p><p style={S.big}>{pct(uc, vis).toFixed(1)}%</p><p style={S.sm}>visitors me se kitno ne download dabaya</p></div>
        <div style={S.kpi}><p style={S.lbl}>Top country</p><p style={{ ...S.big, fontSize: 24 }}>{lead ? cname(lead.code) : "—"}</p><p style={S.sm}>{lead ? `${pct(n0(lead.visitors), cv).toFixed(1)}% visitors (${days} din)` : "Abhi data nahi"}</p></div>
      </div>
      <p className="a-sub" style={{ marginLeft: 0 }}>Pichle {days} din: <b>{fmt(totV)}</b> unique visitors · <b>{fmt(totU)}</b> unique download clicks · <b>{fmt(totC)}</b> total clicks</p>
    </div>

    <div className="a-card">
      <h3>Roz ke visitors aur downloads</h3>
      <p className="a-sub" style={{ marginLeft: 0 }}>Unique = ek IP roz sirf ek baar. Total clicks me wahi IP dobara dabaye to bhi gina jata hai.</p>
      <div style={{ overflowX: "auto" }}><table className="a-tbl"><thead><tr><th>Date</th><th>Unique visitors</th><th>Unique download clicks</th><th>Total clicks</th><th>Rate</th><th style={{ width: "26%" }}></th></tr></thead><tbody>
        {rows.map((r) => (<tr key={r.day}>
          <td>{r.day}</td><td><b>{fmt(n0(r.visitors))}</b></td><td><b>{fmt(n0(r.unique_clicks))}</b></td><td>{fmt(n0(r.total_clicks))}</td>
          <td>{pct(n0(r.unique_clicks), n0(r.visitors)).toFixed(1)}%</td>
          <td><Bar w={pct(n0(r.visitors), maxV)} /><div style={{ height: 3 }} /><Bar w={pct(n0(r.unique_clicks), maxV)} color="#f59e0b" /></td>
        </tr>))}
      </tbody></table></div>
      <p className="a-sub" style={{ marginLeft: 0, marginTop: 10 }}><span style={{ color: "var(--pc,#0a8f6b)" }}>■</span> Visitors &nbsp; <span style={{ color: "#f59e0b" }}>■</span> Download clicks</p>
    </div>

    <div className="a-card">
      <h3>Top countries</h3>
      <p className="a-sub" style={{ marginLeft: 0 }}>Pichle {days} din ke visitors ka hissa (%). Purana data jis me country save nahi thi "Unknown" me aata hai.</p>
      {cs.length === 0 ? <p>Abhi data nahi.</p> : (
        <div style={{ overflowX: "auto" }}><table className="a-tbl"><thead><tr><th>#</th><th>Country</th><th>Visitors</th><th>Share</th><th>Download clicks</th><th style={{ width: "28%" }}></th></tr></thead><tbody>
          {list.map((r, i) => { const p = pct(n0(r.visitors), cv); return (<tr key={r.code}>
            <td>{r.code === "OTHER" ? "" : i + 1}</td>
            <td>{r.code === "OTHER" ? "Other" : cname(r.code)} {r.code !== "OTHER" && r.code !== "XX" && <small style={{ color: "#999" }}>{r.code}</small>}</td>
            <td>{fmt(n0(r.visitors))}</td><td><b>{p.toFixed(1)}%</b></td><td>{fmt(n0(r.downloaders))}</td>
            <td><Bar w={p} /></td>
          </tr>); })}
        </tbody></table></div>)}
    </div>
  </>);
}

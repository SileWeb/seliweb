import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function Stats() {
  const [rows, setRows] = useState(null), [err, setErr] = useState("");
  const load = () => supabase.rpc("visitor_stats", { p_days: 30 }).then(({ data, error }) => {
    if (error) setErr(error.message); else { setErr(""); setRows(data || []); }
  });
  useEffect(() => { load(); }, []);

  if (err) return <div className="a-card"><h3>Visitors</h3><p className="a-sub" style={{ marginLeft: 0 }}>Stats load nahi huin: {err}</p><p className="a-sub" style={{ marginLeft: 0 }}>Supabase SQL Editor me visitor_stats.sql run kiya hai?</p></div>;
  if (!rows) return <div className="a-card"><p>Loading...</p></div>;

  const today = rows[0]?.visitors ?? 0, yest = rows[1]?.visitors ?? 0;
  const last7 = rows.slice(0, 7), avg7 = last7.length ? Math.round(last7.reduce((a, r) => a + Number(r.visitors), 0) / last7.length) : 0;
  const max = Math.max(1, ...rows.map((r) => Number(r.visitors)));
  const box = { flex: "1 1 150px", border: "1px solid #eee", borderRadius: 10, padding: "14px 16px" };
  const big = { fontSize: 30, fontWeight: 600, margin: 0 };
  const lbl = { color: "#666", fontSize: 13, margin: "0 0 4px" };

  return (<div className="a-card">
    <h3>Visitors (unique IP, roz ke)</h3>
    <p className="a-sub" style={{ marginLeft: 0 }}>Har din me ek IP sirf ek baar ginta hai. Din Pakistan time (PKT) ke hisab se badalta hai. Bots shamil nahi.</p>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "14px 0 20px" }}>
      <div style={box}><p style={lbl}>Aaj</p><p style={big}>{today}</p></div>
      <div style={box}><p style={lbl}>Kal</p><p style={big}>{yest}</p></div>
      <div style={box}><p style={lbl}>Pichle 7 din ka average</p><p style={big}>{avg7}</p></div>
      <button className="a-btn" style={{ alignSelf: "center" }} onClick={load}>Refresh</button>
    </div>
    <div style={{ overflowX: "auto" }}><table className="a-tbl"><thead><tr><th>Date</th><th>Unique visitors</th><th>Visits</th><th style={{ width: "40%" }}></th></tr></thead><tbody>
      {rows.map((r) => (<tr key={r.day}>
        <td>{r.day}</td><td><b>{r.visitors}</b></td><td>{r.visits}</td>
        <td><div style={{ height: 10, borderRadius: 5, background: "var(--pc,#0a8f6b)", width: `${(Number(r.visitors) / max) * 100}%`, minWidth: Number(r.visitors) ? 4 : 0 }} /></td>
      </tr>))}
    </tbody></table></div>
  </div>);
}

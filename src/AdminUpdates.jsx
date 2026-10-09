import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { FN } from "./fn.js";
import { F } from "./adminkit.jsx";

export function Updates() {
  const [cfg, setCfg] = useState({ update_interval_days: 10, auto_update_enabled: true });
  const [log, setLog] = useState([]), [tracked, setTracked] = useState([]);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
    setCfg((c) => ({ ...c, ...(data?.data || {}) }));
    supabase.from("update_log").select("*").order("created_at", { ascending: false }).limit(50).then(({ data: d }) => setLog(d || []));
    supabase.from("software").select("id,name,source_type,source_id,last_checked,last_check_msg").neq("source_type", "none").not("source_id", "is", null).then(({ data: d }) => setTracked(d || []));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
    const merged = { ...(data?.data || {}), update_interval_days: +cfg.update_interval_days || 10, auto_update_enabled: !!cfg.auto_update_enabled };
    const { error } = await supabase.from("site_settings").upsert({ id: 1, data: merged });
    setMsg(error ? error.message : "✓ Settings save ho gayin");
  };
  const run = async () => {
    setBusy(true); setMsg("Check ho raha hai... (posts zyada hon to thora time lagta hai)");
    const { data, error } = await supabase.functions.invoke(FN.updates, { body: { force: true } });
    setBusy(false);
    if (error || data?.error) return setMsg("Error: " + (error?.message || data.error));
    setMsg(`✓ ${data.checked} posts check hui, ${data.updated.length} update hui`); load();
  };
  const d = (x) => x ? new Date(x).toLocaleString() : "—";

  return (<>
    <div className="a-card"><h3>Auto updates</h3><p className="a-sub" style={{ marginLeft: 0 }}>Har post ka latest version free API se check hota hai. Naya mile to wo Latest ban jata hai aur purana "Previous version" me chala jata hai.</p>
      <div className="a-g">
        <F l="Har kitne din baad check ho"><input type="number" min="1" value={cfg.update_interval_days} onChange={(e) => setCfg({ ...cfg, update_interval_days: e.target.value })} /></F>
        <label className="a-pill" style={{ alignSelf: "end", paddingBottom: 10 }}><input type="checkbox" checked={!!cfg.auto_update_enabled} onChange={(e) => setCfg({ ...cfg, auto_update_enabled: e.target.checked })} /> Auto check on</label>
      </div>
      <p style={{ color: "#74767e", fontSize: 14 }}>Pichla check: {d(cfg.last_run)}</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="a-btn a-pri" onClick={save}>Save</button>
        <button className="a-btn" disabled={busy} onClick={run}>Abhi check karen</button><span className="a-msg">{msg}</span></div>
    </div>

    <div className="a-card"><h3>Recent updates</h3>
      {!log.length && <p>Abhi koi update nahi hui.</p>}
      <div style={{ overflowX: "auto" }}><table className="a-tbl"><tbody>{log.map((l) => <tr key={l.id}><td>{l.name}</td><td>{l.old_version || "—"} → <b>{l.new_version}</b></td><td>{d(l.created_at)}</td></tr>)}</tbody></table></div>
    </div>

    <div className="a-card"><h3>Tracked posts ({tracked.length})</h3>
      {!tracked.length && <p>Kisi post me Source nahi lagaya. Post edit karke "Auto-fill and auto-update" card me Source daalen.</p>}
      <div style={{ overflowX: "auto" }}><table className="a-tbl"><tbody>{tracked.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.source_type}: {t.source_id}</td><td>{d(t.last_checked)}</td>
        <td><span className={"a-tag" + (t.last_check_msg === "ok" ? "" : " d")}>{t.last_check_msg || "pending"}</span></td></tr>)}</tbody></table></div>
    </div>
  </>);
}
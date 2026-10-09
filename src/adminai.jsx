import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";
import { FN } from "./fn.js";
import { F } from "./adminkit.jsx";

export function AIPost({ onEdit, onDone }) {
  const [cfg, setCfg] = useState({ ai_enabled: true, ai_daily_limit: 3, ai_search_url: "" });
  const [txt, setTxt] = useState(""), [list, setList] = useState([]);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
    setCfg((c) => ({ ...c, ...(data?.data || {}) }));
    supabase.from("ai_queue").select("*, software(slug)").order("id", { ascending: false }).limit(100).then(({ data: d }) => setList(d || []));
  };
  useEffect(() => { load(); }, []);

  const saveCfg = async () => {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
    const merged = { ...(data?.data || {}), ai_enabled: !!cfg.ai_enabled, ai_daily_limit: +cfg.ai_daily_limit || 1, ai_search_url: cfg.ai_search_url || "" };
    const { error } = await supabase.from("site_settings").upsert({ id: 1, data: merged });
    setMsg(error ? error.message : "✓ Settings save ho gayin");
  };
  const add = async () => {
    const rows = txt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [keyword, version_hint, source, ref_url] = l.split("|").map((x) => x?.trim() || null);
      return { keyword, version_hint, source, ref_url };
    }).filter((r) => r.keyword);
    if (!rows.length) return setMsg("Kam az kam ek keyword likhen");
    const { error } = await supabase.from("ai_queue").insert(rows);
    if (error) return setMsg(error.message);
    setTxt(""); setMsg(`✓ ${rows.length} items queue me aa gaye`); load();
  };
  const run = async () => {
    setBusy(true); setMsg("AI draft bana raha hai... (har post me ~20-40 second lagte hain)");
    const { data, error } = await supabase.functions.invoke(FN.ai, { body: { run: true, force: true } });
    setBusy(false);
    if (error || data?.error) return setMsg("Error: " + (error?.message || data.error));
    setMsg(data.skipped ? data.skipped : `✓ ${data.made.length} draft posts ban gayin. Posts tab me Draft button se dekhen`); load(); onDone && onDone();
  };
  const retry = async (id) => { await supabase.from("ai_queue").update({ status: "pending", message: null }).eq("id", id); load(); };
  const del = async (id) => { await supabase.from("ai_queue").delete().eq("id", id); load(); };
  const tag = (s) => <span className={"a-tag" + (s === "done" ? "" : " d")}>{s}</span>;

  return (<>
    <div className="a-card"><h3>AI Post queue</h3><p className="a-sub" style={{ marginLeft: 0 }}>Har line ek software hai. AI original content likh kar <b>Draft</b> me post bana deta hai. Images aap khud lagayen.</p>
      <F l="Items (har line: Keyword | Version | Source | Reference link)" h={"Sirf Keyword zaroori hai. Misal:\nVLC Media Player | 3.0.21 | winget:VideoLAN.VLC\nNotepad++ | | github:notepad-plus-plus/notepad-plus-plus | https://competitor.com/notepad-plus-plus"}>
        <textarea rows="6" value={txt} onChange={(e) => setTxt(e.target.value)} />
      </F>
      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="a-btn a-pri" onClick={add}>Queue me daalen</button>
        <button className="a-btn" disabled={busy} onClick={run}>Abhi drafts banayen</button><span className="a-msg">{msg}</span></div>
    </div>

    <div className="a-card"><h3>Daily settings</h3>
      <div className="a-g">
        <F l="Roz kitni posts banen"><input type="number" min="1" value={cfg.ai_daily_limit} onChange={(e) => setCfg({ ...cfg, ai_daily_limit: e.target.value })} /></F>
        <label className="a-pill" style={{ alignSelf: "end", paddingBottom: 10 }}><input type="checkbox" checked={!!cfg.ai_enabled} onChange={(e) => setCfg({ ...cfg, ai_enabled: e.target.checked })} /> Roz khud chalay</label>
        <F l="Competitor search link (optional)" span h="Us site par keyword search karke address bar ka link copy karen aur keyword ki jagah {q} likh den. Misal: https://site.com/search/?q={q}"><input value={cfg.ai_search_url || ""} onChange={(e) => setCfg({ ...cfg, ai_search_url: e.target.value })} /></F>
      </div>
      <p style={{ color: "#74767e", fontSize: 14 }}>Pichla run: {cfg.ai_last_run ? new Date(cfg.ai_last_run).toLocaleString() : "—"}</p>
      <button className="a-btn a-pri" onClick={saveCfg}>Save</button>
    </div>

    <div className="a-card"><h3>Queue ({list.length})</h3>
      {!list.length && <p>Queue khali hai.</p>}
      <div style={{ overflowX: "auto" }}><table className="a-tbl"><tbody>{list.map((l) => (
        <tr key={l.id}><td><b>{l.keyword}</b><div style={{ fontSize: 13, color: "#74767e" }}>{[l.version_hint, l.source].filter(Boolean).join(" · ")}</div></td>
          <td>{tag(l.status)}{l.message && <div style={{ fontSize: 12, color: "#e5484d", maxWidth: 280 }}>{l.message}</div>}</td>
          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            {l.post_id && onEdit && <button className="a-btn a-pri" onClick={() => onEdit(l.post_id)}>Edit draft</button>} {l.software?.slug && <Link className="a-btn" to={`/software/${l.software.slug}`}>Preview</Link>} {l.status === "error" && <button className="a-btn" onClick={() => retry(l.id)}>Retry</button>} <button className="a-btn" onClick={() => del(l.id)}>✕</button></td></tr>))}
      </tbody></table></div>
    </div>
  </>);
}
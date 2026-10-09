import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { F } from "./adminkit.jsx";
import { useSettings } from "./site.jsx";
import { CSV_HEADERS, parseCSV, createPosts, fillItem } from "./csvimport.js";
import { configure } from "./importer.js";

const tomorrow = () => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export function CsvTab({ onDone }) {
  const siteSt = useSettings(), wm = siteSt.wm_enabled ? (siteSt.wm_text || location.host) : "";
  configure(supabase);
  const [rows, setRows] = useState([]), [fname, setFname] = useState("");
  const [cfg, setCfg] = useState({ schedule: true, perDay: 5, start: tomorrow(), time: "09:00", gap: 60 });
  const [msg, setMsg] = useState(""), [errs, setErrs] = useState([]), [busy, setBusy] = useState(false);
  const [q, setQ] = useState([]), [fmsg, setFmsg] = useState("");

  const load = () => supabase.from("csv_queue").select("*, software(name,slug)").order("id", { ascending: false }).limit(300).then(({ data }) => setQ(data || []));
  useEffect(() => { load(); }, []);

  const onFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = parseCSV(await f.text());
    setRows(r); setFname(`${f.name}: ${r.length} rows`); setErrs([]); setMsg("");
  };
  const template = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + CSV_HEADERS.join(",") + "\n"], { type: "text/csv" }));
    a.download = "posts_template.csv"; a.click();
  };

  const create = async () => {
    if (!rows.length) return setMsg("Pehle CSV file chunen");
    setBusy(true); setErrs([]);
    try {
      const { data: cats } = await supabase.from("categories").select("id,slug,icon,name");
      const r = await createPosts(supabase, rows, cats || [], cfg, setMsg);
      setErrs([...r.errors, ...r.warnings]);
      setMsg(`✓ ${r.created} posts ban gayin${cfg.schedule ? " (schedule ho gayin)" : " (draft)"}. ${r.queued} ko link/images chahiye: neeche "Links aur images bharen" dabayen`);
      setRows([]); setFname(""); load(); onDone && onDone();
    } catch (e) { setMsg("Error: " + (e.message || e)); } finally { setBusy(false); }
  };

  const fill = async () => {
    setBusy(true);
    try {
      const { data: todo } = await supabase.from("csv_queue").select("*").eq("status", "pending").order("id");
      const n = (todo || []).length; let done = 0;
      const one = async (it) => {
        try {
          const r = await fillItem(supabase, it, wm, (s) => setFmsg(`${done}/${n} ho chuki. ${s}`));
          await supabase.from("csv_queue").update({ status: r.ok ? "done" : "error", message: r.msg, done_at: new Date().toISOString() }).eq("id", it.id);
        } catch (e) { await supabase.from("csv_queue").update({ status: "error", message: String(e.message || e).slice(0, 500) }).eq("id", it.id); }
        done++; setFmsg(`${done}/${n} ho chuki`); load();
      };
      for (let k = 0; k < n; k += 2) await Promise.all(todo.slice(k, k + 2).map(one));   // 2 posts ek saath
      setFmsg(n ? `✓ ${n} posts ka kaam khatam. Error wali neeche dekhen` : "Koi pending post nahi");
    } finally { setBusy(false); load(); onDone && onDone(); }
  };
  const retry = async (id) => { await supabase.from("csv_queue").update({ status: "pending", message: null }).eq("id", id); load(); };
  const skip = async (it) => { await supabase.from("software").update({ import_ready: true }).eq("id", it.post_id); await supabase.from("csv_queue").update({ status: "done", message: "Bina fill ke ready kiya" }).eq("id", it.id); load(); };
  const tag = (s) => <span className={"a-tag" + (s === "done" ? "" : " d")}>{s}</span>;
  const pending = q.filter((x) => x.status === "pending").length;

  return (<>
    <div className="a-card"><h3>CSV se posts (ek saath)</h3>
      <p className="a-sub" style={{ marginLeft: 0 }}>CSV me har row ek post hai. Title, SEO, specs, versions sab CSV se aate hain. <b>Importer sirf do kaam karta hai:</b> download link aur images (aap ki doosri website se, ya GitHub / winget se).</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label className="a-btn a-pri" style={{ cursor: "pointer" }}>CSV file chunen<input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} /></label>
        <button className="a-btn" onClick={template}>Khali template download karen</button><span className="a-msg">{fname}</span></div>
      {rows.length > 0 && <div style={{ marginTop: 14, fontSize: 14, color: "#62646a" }}>Pehli posts: {rows.slice(0, 5).map((r) => r.title || r.name || "(title khali)").join(" · ")}{rows.length > 5 ? " ..." : ""}</div>}
    </div>

    <div className="a-card"><h3>Schedule (roz kitni posts publish hon)</h3>
      <div className="a-g">
        <label className="a-pill a-span"><input type="checkbox" checked={cfg.schedule} onChange={(e) => setCfg({ ...cfg, schedule: e.target.checked })} /> Posts ko schedule karen (warna sirf Draft banen gi)</label>
        <F l="Roz kitni posts"><input type="number" min="1" value={cfg.perDay} onChange={(e) => setCfg({ ...cfg, perDay: e.target.value })} /></F>
        <F l="Pehli tareekh"><input type="date" value={cfg.start} onChange={(e) => setCfg({ ...cfg, start: e.target.value })} /></F>
        <F l="Roz pehli post ka waqt"><input type="time" value={cfg.time} onChange={(e) => setCfg({ ...cfg, time: e.target.value })} /></F>
        <F l="Posts ke beech gap (minute)"><input type="number" min="0" value={cfg.gap} onChange={(e) => setCfg({ ...cfg, gap: e.target.value })} /></F>
      </div>
      <p style={{ fontSize: 13, color: "#74767e" }}>Misal: 5 posts roz, subah 9 baje, 60 minute gap = 9:00, 10:00, 11:00, 12:00, 13:00. Agar CSV me kisi row ki <code>publish_date</code> likhi ho to wohi tareekh lagti hai.</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><button className="a-btn a-pri" disabled={busy || !rows.length} onClick={create}>CSV se posts banayen</button><span className="a-msg">{msg}</span></div>
      {errs.length > 0 && <pre style={{ marginTop: 12, background: "#fff7f0", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>{errs.join("\n")}</pre>}
    </div>

    <div className="a-card"><h3>Links aur images bharen ({pending} baqi)</h3>
      <p className="a-sub" style={{ marginLeft: 0 }}>Tarteeb: 1) CSV ka <code>download_url</code>, 2) aap ki doosri website (<code>source_url</code>), 3) GitHub / winget (<code>source</code>). Jab tak ye kaam na ho, post publish nahi hoti, taake khali post live na jaye.</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><button className="a-btn a-pri" disabled={busy || !pending} onClick={fill}>Links aur images bharen</button><span className="a-msg">{fmsg}</span></div>
      {!q.length ? <p>Queue khali hai.</p> : <div style={{ overflowX: "auto", marginTop: 12 }}><table className="a-tbl"><tbody>{q.map((x) => (
        <tr key={x.id}><td>{x.software?.name || `#${x.post_id}`}<div style={{ fontSize: 12, color: "#74767e", maxWidth: 320, wordBreak: "break-all" }}>{x.source_url || x.source || ""}</div></td>
          <td>{tag(x.status)}{x.message && <div style={{ fontSize: 12, color: x.status === "error" ? "#e5484d" : "#74767e", maxWidth: 360, wordBreak: "break-word" }}>{x.message}</div>}</td>
          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{x.status === "error" && <><button className="a-btn" onClick={() => retry(x.id)}>Retry</button> <button className="a-btn" onClick={() => skip(x)}>Bina fill ke ready</button></>}</td></tr>))}</tbody></table></div>}
    </div>
  </>);
}
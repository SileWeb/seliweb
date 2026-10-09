import { useState } from "react";
import { supabase } from "./supabase";
import { useSettings } from "./site.jsx";
import { configure, importUrl, inspectUrl, setWait } from "./importer.js";
import { finalizePost } from "./finalize.js";

const ls = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function ImportTab({ onDone }) {
  const siteSt = useSettings(), wmDefault = siteSt.wm_enabled ? (siteSt.wm_text || location.host) : "";
  configure(supabase);
  const [wait, setWaitSel] = useState(ls("wait_sel", ".swiper-slide img")), [txt, setTxt] = useState(""), [wmText, setWmText] = useState(ls("wm_text", ""));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""), [log, setLog] = useState([]);
  const [testUrl, setTestUrl] = useState(""), [testOut, setTestOut] = useState("");

  const run = async () => {
    const urls = [...new Set(txt.split("\n").map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l)))];
    if (!urls.length) return setMsg("Har line me doosri website ki ek post ka poora link (https://...) likhen");
    save("wm_text", wmText); save("wait_sel", wait); setWait(wait);;
    setBusy(true); setLog([]);
    try {
      const { data: cats } = await supabase.from("categories").select("id,slug,icon,name");
      let done = 0;
      const one = async (u) => {
        let line;
        try {
          const { id, warn, missing, tries } = await importUrl(supabase, u, cats || [], { withImages: true, watermark: wmText.trim() || wmDefault, skipExisting: true, onStep: (s) => setMsg(`${done}/${urls.length} ho chuki. ${s}`) });
          const complete = !missing.length && !warn.length;
          let fin = [];
          if (complete) { await supabase.from("software").update({ import_ready: true }).eq("id", id); fin = await finalizePost(supabase, id, (s) => setMsg(`${done}/${urls.length} ho chuki. ${s}`)); }   // final step: content + interlinking, phir Draft me ready
          line = complete ? `✓ ${u}  (${tries} koshish me mukammal, Draft me ready)${fin.length ? "\n    " + fin.join(" | ") : ""}` : `⚠ ${u}  ADHOORI, Draft me rakhi (baqi: ${[...missing, ...new Set(warn)].join(", ")})`;
        } catch (e) { line = `✗ ${u}\n    ${e.message || e}`; }
        done++; setLog((l) => [...l, line]); setMsg(`${done}/${urls.length} ho chuki`);
      };
      for (let k = 0; k < urls.length; k += 2) await Promise.all(urls.slice(k, k + 2).map(one));
      setMsg(`✓ ${urls.length} links ka kaam khatam`); setTxt("");
    } finally { setBusy(false); onDone && onDone(); }
  };

  return (<>
    <div className="a-card"><h3>Doosri website se post import</h3>
      <p className="a-sub" style={{ marginLeft: 0 }}>Sirf post ka link daalen. Naam, version, size, specs, SEO, tags, category, images (slider), download link aur purane versions sab wahin se aa jate hain.</p>
      <label className="a-f"><span className="a-l">Links (har line ek post ka link)</span>
        <textarea rows="7" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={"https://aap-ki-site.com/software/keka\nhttps://aap-ki-site.com/software/krita"} /></label>
      <div className="a-g" style={{ marginTop: 14 }}>
        <label className="a-f"><span className="a-l">Images par kya likha jaye (watermark)</span>
          <input value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder={wmDefault || "khali = watermark nahi"} /></label>
        <label className="a-f a-span"><span className="a-l">Page me kaun si cheez aane tak ruka jaye (slider)</span><input value={wait} onChange={(e) => setWaitSel(e.target.value)} placeholder=".swiper-slide img" /><small>Slider ki class swiper hai to wohi rehne den. Is se page ka poora data load hone ke baad parha jata hai.</small></label>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="a-btn a-pri" disabled={busy} onClick={run}>Import karen</button><span className="a-msg">{msg}</span></div>
      {log.length > 0 && <pre style={{ marginTop: 14, background: "#f7f7f7", padding: 12, borderRadius: 8, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 320, overflow: "auto" }}>{log.join("\n")}</pre>}
    </div>

    <div className="a-card"><h3>Masla ho to: ek post ka test</h3>
      <p className="a-sub" style={{ marginLeft: 0 }}>Ek post ka link daalen, ye dikhata hai ke kya kya mila (is ka screenshot bhej den).</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><input style={{ flex: 1, minWidth: 240 }} value={testUrl} onChange={(e) => setTestUrl(e.target.value)} placeholder="https://aap-ki-site.com/software/keka" />
        <button className="a-btn" disabled={busy} onClick={async () => { setTestOut("Test ho raha hai..."); try { setTestOut(JSON.stringify(await inspectUrl(testUrl.trim()), null, 1)); } catch (e) { setTestOut("Error: " + (e.message || e)); } }}>Test karen</button></div>
      {testOut && <pre style={{ marginTop: 14, background: "#f7f7f7", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 420, overflow: "auto" }}>{testOut}</pre>}
    </div>
  </>);
}
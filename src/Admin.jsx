import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "./supabase";
import { css, F, upload, slugify } from "./adminkit.jsx";
import { Categories, Comments, Settings } from "./AdminTabs.jsx";
import { ImportTab } from "./AdminImport.jsx";
import { useSettings } from "./site.jsx";

const EMPTY = { name: "", slug: "", category_id: "", subcategory: "", short_desc: "", seo_title: "", content: "", sys_req: "", developer: "", license_type: "full_version", languages: "Multilingual", file_name: "", platform: "Windows", uploaded_by: "", tags: "", rating: 4.5, rating_count: 0, is_featured: false, icon_url: "", images: [], status: "published", custom_schema: "", source_type: "none", source_id: "", auto_update: true, official_site: "", publish_at: "", image_alts: [] };
const EV = { version: "", release_date: "", file_size_mb: "", arch: "64-bit", os: "Windows 10/11", min_ram: "", min_cpu: "", min_storage: "", download_url: "", file_name: "", is_latest: false };
const VF = [["version", "Version *"], ["release_date", "Release date", "date"], ["file_size_mb", "Size (MB)", "number"], ["arch", "Architecture"], ["os", "Operating system"], ["min_ram", "Min RAM"], ["min_cpu", "Min CPU"], ["min_storage", "Min storage"], ["file_name", "File name"], ["download_url", "Download URL *"]];
const TABS = [["posts", "Posts"], ["import", "Import"], ["cats", "Categories"], ["comments", "Comments"], ["settings", "Settings"]];

function Login() {
  const [m, setM] = useState("");
  const go = async (e) => {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await supabase.auth.signInWithPassword({ email: f.get("email"), password: f.get("password") });
    if (error) setM(error.message);
  };
  return (<div className="a"><style>{css}</style><form className="a-login" onSubmit={go}>
    <div className="a-logo">S</div><h2>Admin Login</h2>
    <F l="Email"><input name="email" type="email" required /></F><F l="Password"><input name="password" type="password" required /></F>
    <button className="a-btn a-pri" style={{ width: "100%" }}>Sign in</button><p style={{ color: "#e5484d" }}>{m}</p></form></div>);
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState("posts"), [editId, setEditId] = useState(null);
  const [cats, setCats] = useState([]), [posts, setPosts] = useState([]), [q, setQ] = useState(""), [flt, setFlt] = useState("all");
  const [f, setF] = useState(EMPTY), [vs, setVs] = useState([{ ...EV, is_latest: true }]);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const siteSt = useSettings(), wm = siteSt.wm_enabled ? (siteSt.wm_text || location.host) : "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const load = () => {
    supabase.from("categories").select("id,name").order("sort_order").then(({ data }) => setCats(data || []));
    supabase.from("software").select("id,name,slug,status,download_count,publish_at").order("created_at", { ascending: false }).limit(200).then(({ data }) => setPosts(data || []));
  };
  useEffect(() => { if (user) load(); }, [user, tab]);   // tab badalne par list dobara aati hai

  if (user === undefined) return null;
  if (!user) return <Login />;

  const openNew = () => { setF(EMPTY); setVs([{ ...EV, is_latest: true }]); setEditId(null); setMsg(""); setTab("edit"); window.scrollTo(0, 0); };
  const openEdit = async (id) => {
    const { data } = await supabase.from("software").select("*, versions(*)").eq("id", id).single();
    const base = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] ?? EMPTY[k]]));
    base.publish_at = data.publish_at ? new Date(new Date(data.publish_at).getTime() - new Date(data.publish_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setF({ ...base, tags: (data.tags || []).join(", "), images: data.images || [], image_alts: data.image_alts || [] });
    setVs(data.versions.length ? data.versions.map((v) => Object.fromEntries(Object.keys(EV).map((k) => [k, v[k] ?? EV[k]]))) : [{ ...EV, is_latest: true }]);
    setEditId(id); setMsg(""); setTab("edit"); window.scrollTo(0, 0);
  };

  const inp = (k, l, o = {}) => <F key={k} l={l} h={o.h} span={o.span}><input type={o.type || "text"} value={f[k]} placeholder={o.ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></F>;
  const area = (k, l, rows, h) => <F l={l} h={h} span><textarea rows={rows} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></F>;
  const setV = (i, k, val) => setVs(vs.map((v, j) => j === i ? { ...v, [k]: val } : k === "is_latest" ? { ...v, is_latest: false } : v));
  const onImgs = async (e) => {
    setMsg("Images WebP me convert ho kar upload ho rahi hain...");
    try { const urls = []; for (const file of e.target.files) urls.push(await upload(file, 1600, wm)); setF((p) => ({ ...p, images: [...p.images, ...urls], image_alts: [...(p.image_alts || []), ...urls.map((_, k) => `${p.name || "Software"} screenshot ${p.images.length + k + 1}`)] })); setMsg(""); } catch (er) { setMsg(er.message); }
  };
  const onIcon = async (e) => { try { const u = await upload(e.target.files[0], 256); setF((p) => ({ ...p, icon_url: u })); } catch (er) { setMsg(er.message); } };

  const save = async () => {
    if (!f.name || !f.category_id) return setMsg("Name aur Category zaroori hain");
    if (f.custom_schema.trim()) { try { JSON.parse(f.custom_schema); } catch { return setMsg("Custom schema valid JSON nahi hai"); } }
    setBusy(true); setMsg("Saving...");
    const row = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, f[k]]));
    Object.assign(row, { slug: f.slug || slugify(f.name), category_id: +f.category_id, rating: +f.rating || 0, rating_count: +f.rating_count || 0, tags: f.tags.split(",").map((x) => x.trim()).filter(Boolean) });
    row.publish_at = f.status === "scheduled" && f.publish_at ? new Date(f.publish_at).toISOString() : null;
    let id = editId, error;
    if (editId) { ({ error } = await supabase.from("software").update(row).eq("id", editId)); if (!error) await supabase.from("versions").delete().eq("software_id", editId); }
    else { const r = await supabase.from("software").insert(row).select("id").single(); error = r.error; id = r.data?.id; }
    if (error) { setBusy(false); return setMsg(error.message); }
    const rows = vs.filter((v) => v.version && v.download_url).map((v) => ({ ...v, software_id: id, file_size_mb: v.file_size_mb || null, release_date: v.release_date || null }));
    if (rows.length) { const { error: e2 } = await supabase.from("versions").insert(rows); if (e2) { setBusy(false); return setMsg(e2.message); } }
    setBusy(false); load(); setTab("posts"); setMsg("");
  };
  const wipe = async (onlyDraft) => {
    if (!posts.length) return alert("Koi post nahi hai");
    const n = onlyDraft ? posts.filter((p) => p.status !== "published").length : posts.length;
    if (!n) return alert("Koi Draft nahi hai");
    if (prompt(`${onlyDraft ? "Sirf Draft/Scheduled" : "SARI"} posts (${n}) delete ho jayengi aur wapas nahi aayengi.\nTasdeeq ke liye DELETE likhen`) !== "DELETE") return;
    const q = supabase.from("software").delete();
    const { error } = await (onlyDraft ? q.in("status", ["draft", "scheduled"]) : q.gte("id", 0));
    if (error) alert(error.message); load();
  };
  const del = async (id) => { if (confirm("Is post ko delete karen?")) { await supabase.from("software").delete().eq("id", id); load(); } };
  const shown = posts.filter((p) => (flt === "all" || p.status === flt) && p.name.toLowerCase().includes(q.toLowerCase()));
  const nDraft = posts.filter((p) => p.status === "draft").length;
  const setStatus = async (id, status) => { await supabase.from("software").update({ status }).eq("id", id); load(); };

  return (<div className="a"><style>{css}</style>
    <div className="a-top"><div className="in">
      <div className="a-logo">S</div>
      {TABS.map(([k, l]) => <button key={k} className={"a-tab" + (tab === k || (k === "posts" && tab === "edit") ? " on" : "")} onClick={() => setTab(k)}>{l}</button>)}
      <Link className="a-btn a-out" to="/">View site</Link><button className="a-btn" onClick={() => supabase.auth.signOut()}>Logout</button>
    </div></div>

    <div className="a-main">
      {tab === "posts" && <div className="a-card">
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}><h3 style={{ margin: 0 }}>Posts ({posts.length})</h3>
          <input className="a-search" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginLeft: "auto" }} />
          <button className="a-btn a-pri" onClick={openNew}>+ New Post</button></div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}><button className="a-btn" style={{ color: "#e5484d" }} onClick={() => wipe(true)}>Sirf Draft delete karen</button><button className="a-btn" style={{ color: "#e5484d" }} onClick={() => wipe(false)}>Sari posts delete karen</button></div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["all", "All"], ["published", "Published"], ["draft", `Draft (${nDraft})`], ["scheduled", "Scheduled"]].map(([k, l]) => <button key={k} className={"a-btn" + (flt === k ? " a-pri" : "")} onClick={() => setFlt(k)}>{l}</button>)}
        </div>
        <div style={{ overflowX: "auto" }}><table className="a-tbl"><thead><tr><th>Name</th><th>Status</th><th>Downloads</th><th></th></tr></thead><tbody>
          {shown.map((p) => <tr key={p.id}><td>{p.name}</td><td><span className={"a-tag" + (p.status !== "published" ? " d" : "")}>{p.status}</span>{p.status === "scheduled" && p.publish_at && <div style={{ fontSize: 12, color: "#74767e" }}>{new Date(p.publish_at).toLocaleString()}</div>}</td><td>{p.download_count}</td>
            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{p.status !== "published" ? <button className="a-btn a-pri" onClick={() => setStatus(p.id, "published")}>Publish</button> : <button className="a-btn" onClick={() => setStatus(p.id, "draft")}>Unpublish</button>} <button className="a-btn" onClick={() => openEdit(p.id)}>Edit</button> <Link className="a-btn" to={`/software/${p.slug}`}>View</Link> <button className="a-btn" style={{ color: "#e5484d" }} onClick={() => del(p.id)}>Delete</button></td></tr>)}
        </tbody></table></div></div>}

      {tab === "cats" && <Categories />}
      {tab === "comments" && <Comments />}
      {tab === "import" && <ImportTab onDone={load} />}
      {tab === "settings" && <Settings />}

      {tab === "edit" && <>
        <h2 style={{ color: "#222325" }}>{editId ? "Edit post" : "New post"}</h2>
        <div className="a-card"><h3><b>1</b>Basic information</h3><p className="a-sub">Naam, category aur details</p>
          <div className="a-g">
            {inp("name", "Name *")}{inp("slug", "URL slug", { h: "Khali ho to naam se khud ban jaye ga" })}
            <F l="Category *"><select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}><option value="">Select category</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
            {inp("subcategory", "Sub-category", { ph: "e.g. Download Managers" })}
            {inp("developer", "Created by")}{inp("uploaded_by", "Uploaded by")}
            <F l="Platform"><select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}><option>Windows</option><option>Mac</option></select></F>
            <F l="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="published">Published</option><option value="draft">Draft (website par nahi dikhe gi)</option><option value="scheduled">Scheduled (waqt par khud publish)</option></select></F>{f.status === "scheduled" && inp("publish_at", "Publish ki tareekh aur waqt", { type: "datetime-local" })}
            {inp("license_type", "License type")}{inp("languages", "Languages")}{inp("file_name", "File name")}
            {inp("rating", "Rating (0-5)", { type: "number" })}{inp("rating_count", "Rating count", { type: "number", h: "Schema me rating sirf tab jati hai jab count 0 se zyada ho" })}
            <label className="a-pill a-span"><input type="checkbox" checked={f.is_featured} onChange={(e) => setF({ ...f, is_featured: e.target.checked })} /> Featured (crown dikhe)</label>
          </div></div>

        <div className="a-card"><h3><b>2</b>Content & SEO</h3><p className="a-sub">Google aur visitors ko ye dikhta hai</p>
          <div className="a-g">
            {inp("seo_title", "SEO title (page heading)", { span: true })}{inp("tags", "Tags", { span: true, h: "Comma se alag karen" })}
            {area("short_desc", "Short description", 2)}
            {area("content", "Overview", 9, "HTML: <h2>, <h3>, <p>, <ul><li>")}
            {area("sys_req", "System requirements", 5, "Jaise: <ul><li>OS: Windows 10/11</li></ul>")}
            {area("custom_schema", "Custom schema (optional)", 5, "Khali chhor den to SoftwareApplication schema khud ban jati hai. Apna JSON-LD dena ho to yahan paste karen.")}
          </div></div>

        <div className="a-card"><h3><b>3</b>Images</h3><p className="a-sub">Koi bhi format, khud WebP me chhoti ho jaye gi</p>
          <div className="a-g">
            <div><span className="a-l">Icon</span><label className="a-drop" style={{ marginTop: 6 }}>{f.icon_url ? <img src={f.icon_url} height="64" alt="" /> : "Icon chunen (256px)"}<input type="file" accept="image/*" onChange={onIcon} /></label></div>
            <div><span className="a-l">Screenshots (slider)</span><label className="a-drop" style={{ marginTop: 6 }}>Images chunen (multiple)<input type="file" accept="image/*" multiple onChange={onImgs} /></label></div>
          </div>
          {f.images.length > 0 && <div className="a-thumbs">{f.images.map((u, i) => <div className="a-th" key={u}><img src={u} alt="" />{i === 0 && <em>Cover</em>}<button aria-label="Remove" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== u), image_alts: (f.image_alts || []).filter((_, k) => k !== i) })}>✕</button></div>)}</div>}
          {f.images.length > 0 && <div className="a-g" style={{ marginTop: 12 }}>{f.images.map((u, i) => <F key={u} l={`Alt text ${i + 1}`}><input value={f.image_alts?.[i] || ""} placeholder={`${f.name || "Software"} screenshot ${i + 1}`} onChange={(e) => { const a = [...(f.image_alts || [])]; a[i] = e.target.value; setF({ ...f, image_alts: a }); }} /></F>)}</div>}
        </div>

        <div className="a-card"><h3><b>4</b>Versions</h3><p className="a-sub">Latest aur purane versions, download link ke sath</p>
          {vs.map((v, i) => (<div className="a-ver" key={i}>
            <div className="a-vh"><span>Version {i + 1}</span><span style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <label className="a-pill"><input type="checkbox" checked={v.is_latest} onChange={() => setV(i, "is_latest", true)} /> Latest</label>
              {vs.length > 1 && <button className="a-btn" onClick={() => setVs(vs.filter((_, j) => j !== i))}>Remove</button>}</span></div>
            <div className="a-g a-g3">{VF.map(([k, l, type]) => <F key={k} l={l}><input type={type || "text"} value={v[k]} onChange={(e) => setV(i, k, e.target.value)} /></F>)}</div>
          </div>))}
          <button className="a-btn" onClick={() => setVs([...vs, { ...EV }])}>+ Add another version</button>
        </div>
      </>}
    </div>

    {tab === "edit" && <div className="a-bar"><div className="in"><span className="a-msg">{msg}</span>
      <span style={{ display: "flex", gap: 10 }}><button className="a-btn" onClick={() => setTab("posts")}>Cancel</button><button className="a-btn a-pri" disabled={busy} onClick={save}>{editId ? "Save changes" : "Publish post"}</button></span></div></div>}
  </div>);
}
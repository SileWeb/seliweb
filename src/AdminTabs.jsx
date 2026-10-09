import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { F, upload, slugify } from "./adminkit.jsx";
import { DEFAULTS, setSettings } from "./site.jsx";

const ICONS = ["windows", "apple", "android", "game", "book", "video", "folder"];
const TG = [["show_in_nav", "Nav bar"], ["show_on_home", "Home page"], ["show_in_sidebar", "Sidebar"], ["is_premium", "Crown ♛"]];

export function Categories() {
  const [cats, setCats] = useState([]), [nn, setNn] = useState("");
  const load = () => supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data || []));
  useEffect(() => { load(); }, []);
  const upd = async (id, patch) => { setCats((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c)); await supabase.from("categories").update(patch).eq("id", id); };
  const add = async () => { if (!nn.trim()) return; await supabase.from("categories").insert({ name: nn.trim(), slug: slugify(nn), sort_order: cats.length + 1, show_in_nav: true }); setNn(""); load(); };
  const del = async (c) => {
    if (!confirm(`"${c.name}" delete karen?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) alert("Is category me posts hain. Pehle unhen delete ya dusri category me bhejen."); else load();
  };
  return (<div className="a-card"><h3>Categories</h3><p className="a-sub" style={{ marginLeft: 0 }}>Nav, home page aur sidebar me kaun si category dikhe, yahan se control karen</p>
    {cats.map((c) => (<div className="a-crow" key={c.id}>
      <F l="Name"><input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && upd(c.id, { name: e.target.value })} /></F>
      <F l="Icon"><select value={c.icon || "folder"} onChange={(e) => upd(c.id, { icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></F>
      <F l="Order"><input type="number" defaultValue={c.sort_order} onBlur={(e) => upd(c.id, { sort_order: +e.target.value })} /></F>
      <button className="a-btn" style={{ color: "#e5484d" }} onClick={() => del(c)}>Delete</button>
      <div className="a-tg">{TG.map(([k, l]) => <label className="a-pill" key={k}><input type="checkbox" checked={!!c[k]} onChange={(e) => upd(c.id, { [k]: e.target.checked })} /> {l}</label>)}</div>
    </div>))}
    <div className="a-g" style={{ marginTop: 20, gridTemplateColumns: "1fr auto", alignItems: "end" }}>
      <F l="Nayi category"><input value={nn} placeholder="e.g. Android Apps" onChange={(e) => setNn(e.target.value)} /></F>
      <button className="a-btn a-pri" onClick={add}>+ Add</button></div>
  </div>);
}

export function Comments() {
  const [list, setList] = useState([]);
  const load = () => supabase.from("comments").select("*, software(name)").order("created_at", { ascending: false }).limit(100).then(({ data }) => setList(data || []));
  useEffect(() => { load(); }, []);
  const set = async (id, approved) => { await supabase.from("comments").update({ approved }).eq("id", id); load(); };
  const del = async (id) => { await supabase.from("comments").delete().eq("id", id); load(); };
  return (<div className="a-card"><h3>Comments</h3><p className="a-sub" style={{ marginLeft: 0 }}>Approve karne par hi website par nazar aate hain</p>
    {!list.length && <p>Abhi koi comment nahi.</p>}
    {list.map((c) => (<div className="a-cm" key={c.id}>
      <b>{c.name}</b> <small>{c.email}</small> <span className={"a-tag" + (c.approved ? "" : " d")}>{c.approved ? "Approved" : "Pending"}</span>
      <div style={{ color: "#74767e", fontSize: 13 }}>on {c.software?.name}</div><p>{c.message}</p>
      <button className="a-btn" onClick={() => set(c.id, !c.approved)}>{c.approved ? "Unapprove" : "Approve"}</button> <button className="a-btn" style={{ color: "#e5484d" }} onClick={() => del(c.id)}>Delete</button>
    </div>))}
  </div>);
}

export function Settings() {
  const [d, setD] = useState(DEFAULTS), [msg, setMsg] = useState("");
  useEffect(() => { supabase.from("site_settings").select("data").eq("id", 1).maybeSingle().then(({ data }) => setD({ ...DEFAULTS, ...(data?.data || {}) })); }, []);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const inp = (k, l, o = {}) => <F key={k} l={l} h={o.h} span={o.span}><input type={o.type || "text"} value={d[k] ?? ""} onChange={(e) => set(k, o.type === "number" ? +e.target.value : e.target.value)} /></F>;
  const chk = (k, l) => <label className="a-pill a-span"><input type="checkbox" checked={!!d[k]} onChange={(e) => set(k, e.target.checked)} /> {l}</label>;
  const img = async (k, max, e) => { try { set(k, await upload(e.target.files[0], max)); } catch (er) { setMsg(er.message); } };
  const save = async () => {
    const { error } = await supabase.from("site_settings").upsert({ id: 1, data: d });
    if (error) return setMsg(error.message);
    setSettings(d); setMsg("✓ Settings save ho gayin, website par lag gayin");
  };
  const Card = ({ n, t, s, children }) => <div className="a-card"><h3><b>{n}</b>{t}</h3><p className="a-sub">{s}</p><div className="a-g">{children}</div></div>;
  return (<>
    <Card n="1" t="Branding" s="Logo, naam aur website ka rang">
      {inp("site_name", "Site name")}{inp("tagline", "Tagline")}
      <div><span className="a-l">Logo</span><label className="a-drop" style={{ marginTop: 6 }}>{d.logo_url ? <img src={d.logo_url} height="46" alt="" /> : "Logo chunen"}<input type="file" accept="image/*" onChange={(e) => img("logo_url", 400, e)} /></label></div>
      <div><span className="a-l">Favicon</span><label className="a-drop" style={{ marginTop: 6 }}>{d.favicon_url ? <img src={d.favicon_url} height="32" alt="" /> : "Favicon chunen"}<input type="file" accept="image/*" onChange={(e) => img("favicon_url", 128, e)} /></label></div>
      <F l="Main color"><input type="color" value={d.primary_color} onChange={(e) => set("primary_color", e.target.value)} style={{ height: 44, padding: 4 }} /></F>
    </Card>
    <Card n="2" t="Header" s="Nav bar ke buttons">
      {chk("show_categories_btn", "\"Categories\" button dikhayen")}{chk("cta_enabled", "Right side ka button dikhayen (jaise Add to chrome)")}
      {inp("cta_label", "Button text")}{inp("cta_url", "Button link (https://...)")}
    </Card>
    <Card n="3" t="Home layout" s="Home page par kitni posts dikhen">
      {inp("home_items", "Main section me posts", { type: "number" })}{inp("sidebar_items", "Sidebar me posts", { type: "number" })}
    </Card>
    <Card n="4" t="SEO & Schema" s="Google ko site ke bare me batane wali info (JSON-LD khud ban jata hai)">
      {inp("meta_title", "Home page title", { span: true })}
      <F l="Home page description" span><textarea rows="2" value={d.meta_description} onChange={(e) => set("meta_description", e.target.value)} /></F>
      {inp("contact_email", "Contact email")}{inp("social", "Social links", { h: "Comma se alag: facebook, youtube ke URLs" })}
    </Card>
    <Card n="6" t="Image watermark" s="Slider images par aap ki website ka naam likha jata hai (import aur manual upload dono me)">
      {chk("wm_enabled", "Images par watermark lagayen")}{inp("wm_text", "Watermark text", { span: true, h: "Apna domain likhen, jaise softhub.com. Khali ho to us waqt ka address use hota hai" })}
    </Card>
    <Card n="5" t="Footer" s="Sab se neeche ka hissa">
      {inp("footer_text", "Copyright text", { span: true, h: "Khali ho to ©SiteName - All Rights Reserved 2026 dikhe ga" })}
      <F l="Footer links" span h={"Har column ka naam # se likhen, neeche Label|link. Misal:\n# Support Center\nContact Us|/contact\nFAQs|/faqs"}><textarea rows="8" value={d.footer_links ?? ""} onChange={(e) => set("footer_links", e.target.value)} /></F>
    </Card>
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}><button className="a-btn a-pri" onClick={save}>Save settings</button><span className="a-msg">{msg}</span></div>
  </>);
}
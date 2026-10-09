import { supabase } from "./supabase";
import { addWatermark } from "./wm.js";

// Koi bhi image -> WebP, max side 'max' px
async function toWebp(file, max = 1600, q = 0.82) {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/webp", q));
}
export async function upload(file, max = 1600, wm = "") {
  let blob = await toWebp(file, max);
  if (wm) blob = await addWatermark(blob, wm);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage.from("images").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}
export const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const css = `
.a{min-height:100vh;background:#f7f7f7;color:#404145;font-family:"Segoe UI",Roboto,Arial,sans-serif;padding-bottom:90px}
.a-top{background:#fff;border-bottom:1px solid #e4e5e7;position:sticky;top:0;z-index:5}
.a-top .in,.a-bar .in{max-width:980px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:20px}
.a-top .in{height:64px}
.a-logo{width:36px;height:36px;border-radius:8px;background:#1dbf73;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.a-tab{border:0;background:none;height:64px;padding:0 6px;font-size:15px;cursor:pointer;color:#62646a;border-bottom:3px solid transparent}
.a-tab.on{color:#1dbf73;border-color:#1dbf73;font-weight:600}
.a-out{margin-left:auto}
.a-main{max-width:980px;margin:24px auto;padding:0 16px}
.a-card{background:#fff;border:1px solid #e4e5e7;border-radius:10px;padding:24px;margin-bottom:20px}
.a-card h3{margin:0 0 4px;font-size:18px;color:#222325;display:flex;align-items:center;gap:10px}
.a-card h3 b{width:26px;height:26px;border-radius:50%;background:#1dbf73;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center}
.a-sub{margin:0 0 18px 36px;font-size:14px;color:#74767e}
.a-g{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.a-g3{grid-template-columns:repeat(3,1fr)}.a-span{grid-column:1/-1}
.a-f{display:flex;flex-direction:column;gap:6px;font-size:14px;min-width:0}
.a-l{font-weight:600;color:#222325}.a-f small{color:#95979d}
.a input,.a select,.a textarea{border:1px solid #dadbdd;border-radius:6px;padding:10px 12px;font:inherit;font-size:15px;color:#222325;background:#fff;width:100%;box-sizing:border-box;outline:none}
.a input:focus,.a select:focus,.a textarea:focus{border-color:#1dbf73;box-shadow:0 0 0 3px #1dbf7324}
.a textarea{resize:vertical;line-height:1.5}
.a-drop{display:block;border:2px dashed #c5c6c9;border-radius:10px;padding:26px;text-align:center;cursor:pointer;color:#62646a;background:#fafafa}
.a-drop:hover{border-color:#1dbf73;background:#f3fbf7}.a-drop input{display:none}
.a-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-top:14px}
.a-th{position:relative;border-radius:8px;overflow:hidden;border:1px solid #e4e5e7;aspect-ratio:16/10;background:#f4f4f4}
.a-th img{width:100%;height:100%;object-fit:cover}
.a-th button{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:0;background:#222325cc;color:#fff;cursor:pointer}
.a-th em{position:absolute;left:6px;bottom:6px;background:#1dbf73;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;font-style:normal}
.a-btn{border:1px solid #dadbdd;background:#fff;border-radius:6px;padding:10px 18px;font-size:15px;cursor:pointer;color:#404145}
.a-btn:hover{background:#f7f7f7}
.a-pri{background:#1dbf73;border-color:#1dbf73;color:#fff;font-weight:600}.a-pri:hover{background:#19a463}.a-pri:disabled{opacity:.6}
.a-ver{border:1px solid #e4e5e7;border-radius:8px;padding:18px;margin-bottom:14px;background:#fcfcfc}
.a-vh{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-weight:600;color:#222325}
.a-pill{display:inline-flex;align-items:center;gap:6px;font-weight:500;font-size:14px;cursor:pointer}.a .a-pill input{width:auto}
.a-bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #e4e5e7;padding:14px 0;z-index:6}
.a-bar .in{justify-content:space-between}.a-msg{font-size:14px;color:#62646a}
.a-tbl{width:100%;border-collapse:collapse}.a-tbl td,.a-tbl th{padding:12px;border-bottom:1px solid #eee;text-align:left;font-size:15px}
.a-login{max-width:380px;margin:12vh auto;background:#fff;border:1px solid #e4e5e7;border-radius:12px;padding:32px}
.a-login h2{margin:16px 0 20px;color:#222325}.a-login .a-f{margin-bottom:14px}
.a-crow{display:grid;grid-template-columns:1.4fr 1fr 80px auto;gap:10px;align-items:end;padding:16px 0;border-bottom:1px solid #eee}
.a-tg{grid-column:1/-1;display:flex;gap:18px;flex-wrap:wrap}
.a-cm{padding:14px 0;border-bottom:1px solid #eee}
.a-tag{display:inline-block;border-radius:10px;padding:2px 10px;font-size:12px;background:#e9f9f1;color:#19a463}.a-tag.d{background:#fff3e0;color:#b76e00}
.a-search{max-width:280px}
@media(max-width:800px){.a-crow{grid-template-columns:1fr 1fr}}
.a-top .in{overflow-x:auto}.a-tab{white-space:nowrap}.a-top .in>*{flex:none}
@media(max-width:800px){.a-g,.a-g3{grid-template-columns:1fr}.a-sub{margin-left:0}}
`;
export const F = ({ l, h, span, children }) => <label className={"a-f" + (span ? " a-span" : "")}><span className="a-l">{l}</span>{children}{h && <small>{h}</small>}</label>;
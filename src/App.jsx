import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, Link, NavLink, useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import { Win, Apple, Game, Search as SearchIcon, Grid, Folder, Down, Android, Book, Video, Cloud, Star, Crown, Chev, Tick, GridFill, Close } from "./icons.jsx";
import { useSettings, JsonLd, Noindex, setMeta } from "./site.jsx";
const Post = lazy(() => import("./Post.jsx"));
const Admin = lazy(() => import("./Admin.jsx"));

const COLS = "id,name,slug,subcategory,short_desc,icon_url,platform,download_count,reputation,is_featured,versions(version,file_size_mb,release_date,is_latest)";

const latest = (s) => [...(s.versions || [])].sort((a, b) => (b.is_latest - a.is_latest) || new Date(b.release_date) - new Date(a.release_date))[0];

const css = `
body{margin:0;background:#f4f4f4;font-family:system-ui,sans-serif;color:#222}
a{color:inherit;text-decoration:none}
.wrap{max-width:1224px;margin:0 auto;padding:24px 16px;display:grid;grid-template-columns:1fr 320px;gap:24px}
.head{background:#fff;border:1px solid #e5e5e5;border-left:6px solid var(--pc,#0a8f6b);padding:18px 24px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.head h2{margin:0;font-weight:500}
.btn{border:1px solid #333;border-radius:6px;padding:8px 18px;background:#fff}
.row{background:#fff;border:1px solid #e5e5e5;margin-bottom:14px;display:grid;grid-template-columns:1fr 170px 170px 130px;align-items:center;position:relative}
.row>div{padding:18px}
.info{display:flex;gap:16px;align-items:center}
.info h3{margin:0 0 4px;font-size:20px;font-weight:500}
.sub{color:var(--pc,#0a8f6b);font-size:15px}.desc{color:#666;font-size:15px}
.mid{border-left:1px solid #eee;text-align:center;font-size:15px}
.size b{font-size:32px;font-weight:500}.size small{font-size:18px}
.size{text-align:center}
.icon{width:70px;height:70px;border-radius:14px;object-fit:cover;flex:none;background:var(--pc,#0a8f6b);color:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:600}
.crown{position:absolute;top:6px;right:10px;color:#f5a800}
.side{background:#fff;border-radius:16px;border:1px solid #eee;padding:24px;margin-bottom:20px}
.side h2{margin:0 0 12px;font-weight:500;padding-bottom:12px;border-bottom:1px solid #eee}
.mini{display:flex;gap:14px;align-items:center;padding:12px 0}
.mini .icon{width:64px;height:64px;border-radius:8px;font-size:22px}
.mini h4{margin:0;font-weight:500;font-size:17px}
.mini .size b{font-size:24px}
.star{color:#f5b301}.off{color:#ccc}
.nav1{background:#fff;border-bottom:1px solid #eee}
.nav1 .in,.nav2 .in{max-width:1224px;margin:0 auto;padding:0 16px}
.nav1 .in{display:flex;align-items:center;gap:16px;height:84px}
.logo{width:56px;height:56px;border-radius:10px;background:var(--pc,#0a8f6b);color:#fff;font-size:28px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.search{display:flex;flex:1;max-width:840px;border:1px solid #eee;border-radius:8px;overflow:hidden;background:#f7f7f7}
.search button{background:var(--pc,#0a8f6b);color:#fff;border:0;padding:0 18px;font-size:18px;cursor:pointer}
.search input{flex:1;border:0;background:transparent;padding:14px;font-size:17px;outline:none;min-width:0}
.nav2{background:#fff;border-bottom:1px solid #eee}
.nav2 .in{display:flex;overflow-x:auto}
.tab{display:flex;align-items:center;gap:12px;padding:24px 30px;font-size:19px;border-left:1px solid #eee;white-space:nowrap}
.tab:last-child{border-right:1px solid #eee}
.tab.active{color:var(--pc,#0a8f6b);box-shadow:inset 0 -3px var(--pc,#0a8f6b)}
body{font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#2b3a42;-webkit-font-smoothing:antialiased}
button,input,textarea,select{font-family:inherit}
svg.i{width:1.2em;height:1.2em;flex:none}
.nav1 .in{height:68px}
.logo{width:46px;height:46px;font-size:22px}
.search{max-width:620px}.search input{padding:11px 14px;font-size:15px}.search button{padding:0 14px;display:flex;align-items:center;font-size:18px}
.tools{margin-left:auto;position:relative}
.cbtn{display:flex;align-items:center;gap:8px;border:0;background:none;font-size:16px;cursor:pointer;padding:8px 12px;color:#2b3a42}
.dd{position:absolute;right:0;top:100%;background:#fff;border:1px solid #eee;border-radius:8px;min-width:200px;z-index:9;box-shadow:0 8px 24px #0001;overflow:hidden}
.dd a{display:block;padding:10px 16px}.dd a:hover{background:#f4f4f4}
.tab{height:58px;padding:0 26px;font-size:16px;color:#2b3a42;gap:10px;box-sizing:border-box}
.tab.active{color:var(--pc,#0a8f6b)}
.wrap{padding:20px 16px;gap:20px}
.head{padding:14px 24px;border-radius:0}.head h2{font-size:24px}
.btn{font-size:14px;padding:7px 16px;cursor:pointer;color:#2b3a42}
.row{border-radius:8px}.row>div{padding:16px 18px}.info h3{font-size:18px}.size b{font-size:28px}
.side{border-radius:12px;padding:20px}
.tools{display:flex;align-items:center;gap:10px}.cta{background:#2b3a42;color:#fff;border-radius:10px;padding:11px 20px;font-size:15px}.tab{position:relative}.crn{position:absolute;top:8px;right:8px;color:#f5a800;font-size:12px}.foot{text-align:center;color:#74767e;font-size:14px;padding:28px 16px}
@media(max-width:700px){.cta{display:none}}
.cbanner{background:linear-gradient(90deg,#10c9a0,#1fc3f0);color:#fff;padding:22px 0}
.cin{max-width:1224px;margin:0 auto;padding:0 16px;display:flex;justify-content:space-between;align-items:center}.cin h2{margin:0;font-size:24px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.chips button{border:1px solid #dcdcdc;background:#fff;border-radius:20px;padding:7px 16px;font-size:14px;cursor:pointer;color:#2b3a42}
.chips button.on{background:var(--pc,#0a8f6b);border-color:var(--pc,#0a8f6b);color:#fff}
@media(max-width:700px){.cbtn span{display:none}.tab{padding:0 16px}}
@media(max-width:1000px){.wrap{grid-template-columns:1fr}}
@media(max-width:700px){.row{grid-template-columns:1fr auto}.row .mid{display:none}}

/* v4: sample site ke naap (font, card, nav, search) */
:root{--border:#ebebeb;--text:#2b373a;--light:#7b868a}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:14px;line-height:1.5;color:var(--text);text-rendering:optimizeLegibility}
img,svg{max-width:100%}
.nav1 .in{height:70px}
.search{position:relative;display:block;flex:1;max-width:480px;background:none;border:0;border-radius:0;overflow:visible}
.search button{position:absolute;left:0;top:50%;transform:translateY(-50%);width:36px;height:36px;padding:0;justify-content:center;border-radius:6px 0 0 6px;z-index:1}
.search input{background:#f9f9f9;border:1px solid var(--border);border-radius:6px;padding:8px 16px 8px 48px;font-size:14px;width:100%;height:38px}
.nav2{border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.tab{min-height:70px;height:auto;padding:0 30px;gap:16px;font-size:14px;font-weight:600;letter-spacing:.15px;line-height:1.6;color:var(--text);border-left:1px solid var(--border);transition:background-color .25s}
.tab:last-child{border-right:1px solid var(--border)}
.tab:hover,.tab.active{background:var(--pc,#0a8f6b);color:#fff;box-shadow:none}
@media(max-width:1023px){.tab{padding:0 18px;min-height:56px}}
.row{display:flex;align-items:flex-start;padding:12px 18px 12px 12px;border:1px solid var(--border);border-radius:0;margin-bottom:12px;background:#fff}
.row>div{padding:0}
.info{flex:1;min-width:0;display:flex;align-items:center;gap:12px}
.info>div{min-width:0;padding:4px 6px 0 0}
.icon{width:62px;height:62px;border-radius:8px;background-color:var(--pc,#0a8f6b);flex:none;object-fit:contain;font-size:26px}
.info h3{margin:0;font-size:16px;font-weight:600;line-height:1.5;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.desc{font-size:12px;line-height:1.5;color:var(--light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{font-size:12px;font-weight:600;line-height:1.5;color:var(--pc,#0a8f6b)}
.mid{position:relative;width:150px;flex:none;padding:7px 16px 0!important;text-align:left;font-size:12px;font-weight:600;border-left:0}
.mid::after{content:"";position:absolute;left:0;top:0;width:1px;height:70px;background:var(--border)}
.mid b{display:block;font-size:12px;margin-bottom:6px}
.size{width:90px;flex:none;text-align:right;line-height:64px;font-size:22px;font-weight:600;padding-left:24px!important;text-transform:uppercase}
.size b{font-size:22px;font-weight:600}.size small{font-size:16px}
@media(max-width:749px){.row{flex-wrap:wrap}.mid{display:none}.size{line-height:36px;margin-left:auto}}
.mini{gap:12px;padding:0;margin-bottom:22px;align-items:flex-start}
.mini:last-child{margin-bottom:0}
.mini .icon{width:62px;height:62px;border-radius:12px;padding:5px}
.mini h4{font-size:14px;font-weight:600;line-height:1.6;margin:0 0 2px}
.mini .sub{font-size:12px;line-height:1;margin-bottom:5px}
.mini .size{width:auto;text-align:left;line-height:1;padding:0!important;font-size:20px}
.mini .size b{font-size:20px}.mini .size small{font-size:13px}
.foot{background:#1e2024;color:#bbb;margin-top:4rem;padding:40px 16px;font-size:14px}

/* v5: sample jaisa card (naye class names) */
.cw{position:relative;display:flex;flex-wrap:wrap;align-items:flex-start;background:#fff;border:1px solid var(--border);padding:12px 18px 12px 12px;margin-bottom:12px}
.ci{flex:none;width:62px;height:62px;margin:auto 0;overflow:hidden;line-height:0;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#f4f4f4}
.ci img{width:100%;height:100%;object-fit:contain}
.ci b{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--pc,#0a8f6b);color:#fff;font-size:26px}
.cinfo{width:calc(100% - 62px);min-width:0;padding:4px 6px 0 12px}
.ctitle,.mt{display:block;font-size:16px;font-weight:600;line-height:1.5;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cdesc{margin:0;font-size:12px;line-height:1.5;color:var(--light);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ccat,.mcat{display:block;font-size:12px;font-weight:600;line-height:1.5;color:var(--pc,#0a8f6b)}
.cdata{display:flex;flex-direction:column;align-items:flex-start;width:50%;padding:10px 0 0;position:relative}
.cprim{display:flex;align-items:center;gap:6px;margin-bottom:6px;color:#1cbdf9}
.cprim span{font-size:12px;font-weight:600;color:var(--text);text-transform:capitalize}
.cmeta{display:flex;align-items:center;gap:6px;color:#aaa;font-size:11px;font-weight:600;line-height:1.1}
.cmeta svg{width:14px;height:14px}
.crate{display:flex;flex-direction:column;justify-content:center;width:50%;padding:10px 0 0;position:relative}
.lbl{font-size:12px;font-weight:600;line-height:1.1;margin-bottom:8px;color:var(--text)}
.stars{display:flex}
.st{position:relative;display:inline-block;width:16px;height:16px;color:#ddd;line-height:0}
.st>span{position:absolute;left:0;top:0;height:100%;overflow:hidden;color:#fbbc04}
.st svg{width:16px;height:16px;max-width:none}
.csize{display:flex;align-items:center;justify-content:flex-end;width:100%;line-height:36px;font-size:22px;font-weight:600;text-transform:uppercase;text-align:right;margin-left:auto}
.csize span{font-size:16px}
.cprem{position:absolute;right:0;top:0;width:24px;height:28px;display:flex;align-items:center;justify-content:center;color:#f5a800}
.cprem svg{width:14px;height:14px}
@media(min-width:750px){
  .cw{flex-wrap:nowrap}
  .cinfo{width:33%;max-width:460px}
  .cdata{margin-left:auto;max-width:140px;width:40%;padding:7px 20px 0}
  .crate{padding:12px 16px 0;width:auto}
  .lbl{text-align:center}
  .csize{width:90px;max-width:90px;padding-left:24px;line-height:64px;margin-left:0}
  .bd::after{content:"";position:absolute;left:0;top:0;width:1px;height:70px;background:var(--border)}
}
@media(min-width:800px){.cinfo{width:37%}}
@media(min-width:840px){.cinfo{width:40%}}
@media(min-width:870px){.cinfo{width:50%}}
.mc{display:flex;gap:12px;align-items:flex-start;margin-bottom:22px}.mc:last-child{margin-bottom:0}
.mi{flex:none;width:62px;height:62px;border-radius:12px;overflow:hidden;line-height:0;display:flex;align-items:center;justify-content:center;background:#f4f4f4}
.mi img{width:100%;height:100%;object-fit:contain}
.mi b{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--pc,#0a8f6b);color:#fff;font-size:22px}
.md{min-width:0;max-width:230px;width:72%;padding-top:2px}
.mt{font-size:14px;line-height:1.6;margin-bottom:2px}
.mcat{line-height:1;margin-bottom:5px}
.ms{display:flex;align-items:center;font-size:20px;font-weight:600;line-height:1;text-transform:uppercase}.ms span{font-size:13px}
.wrap{max-width:1224px;grid-template-columns:minmax(0,1fr) 340px;gap:30px}
@media(max-width:1000px){.wrap{grid-template-columns:minmax(0,1fr)}}

/* v6: container 1192px, header naap, category page */
.logo{width:42px;height:42px;font-size:20px}
.nav1 .in{height:66px}
.search input,.search button{height:36px}
.cbanner{padding:18px 0}.cin h2{font-size:26px;font-weight:600}
.crumb{display:flex;align-items:center;gap:4px;font-size:15px;font-weight:600}
.wrap{grid-template-columns:minmax(0,1fr) 350px}
.wrap.cat{grid-template-columns:350px minmax(0,1fr);align-items:start}
.cat .side{padding:26px 28px;margin-bottom:24px}
.cat .side h2{font-size:22px;font-weight:600;margin:0 0 16px;padding-bottom:18px;border-bottom:1px solid #eee;color:var(--text)}
.chk span{white-space:nowrap}
.chk{display:flex;align-items:center;gap:16px;width:100%;padding:8px 0;background:none;border:0;font-size:15px;font-weight:600;color:var(--text);cursor:pointer;text-align:left}
.chk i{width:28px;height:28px;border-radius:6px;border:1px solid #ebebeb;background:#f5f5f5;display:flex;align-items:center;justify-content:center;flex:none;color:#fff}
.chk i.on{background:#10c9a0;border-color:#10c9a0}
.chk i svg{width:18px;height:18px;stroke-width:3}
.priv{display:flex;align-items:center;gap:8px;margin-left:auto;background:#f4f4f4;border-radius:6px;padding:8px 12px;font-style:normal;font-size:13px;font-weight:500;white-space:nowrap}
.priv svg{color:#f5a800;width:18px;height:18px}
.subs{max-height:340px;overflow:auto}
.sortby{appearance:none;-webkit-appearance:none;border:1px solid var(--border);border-radius:6px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M0 0h12L6 8z' fill='%230a8f6b'/%3E%3C/svg%3E") no-repeat right 14px center;padding:10px 42px 10px 18px;font-size:15px;color:var(--text);min-width:160px;cursor:pointer}
.fbtn{display:none;margin-bottom:12px}
@media(max-width:1000px){.wrap,.wrap.cat{grid-template-columns:minmax(0,1fr)}.fside{display:none}.fside.open{display:block}.fbtn{display:inline-block}}

/* v7: header, menu, search, footer - sample ke naap */
:root{--primary:var(--pc,#0a8f6b)}
.hdr{position:relative;z-index:30;background:#fff}
.nav1 .in{display:flex;align-items:center;gap:16px;height:70px}
@media(min-width:768px){.nav1 .in{gap:24px}}
.logo{width:40px;height:40px;border-radius:6px}
.swrap{position:relative;flex:1;max-width:480px;z-index:2}
.swrap .search{max-width:none}
.sclose{position:absolute!important;right:0;left:auto!important;background:none!important;color:#7b868a!important;border-radius:0 6px 6px 0!important;width:36px}
.sclose svg{width:12px;height:12px}
.sugg{position:absolute;left:36px;right:0;top:calc(100% + 12px);background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 20px 40px rgba(0,0,0,.05);padding:12px 0;z-index:5}
.sugg:before{content:"";position:absolute;left:32px;top:-8px;width:12px;height:12px;background:#fff;border-left:1px solid var(--border);border-top:1px solid var(--border);transform:rotate(45deg)}
.sugt{font-size:14px;font-weight:600;color:var(--light);margin:0 0 10px;padding-left:14px}
.sgi{display:flex;align-items:center;gap:12px;padding:8px 14px;font-size:14px;font-weight:600}
.sgi:hover{background:#f6f6f6}
.sgi img,.sgi b{width:32px;height:32px;border-radius:6px;object-fit:contain;flex:none;background:var(--pc,#0a8f6b);color:#fff;display:flex;align-items:center;justify-content:center}
.sgi img{background:#f4f4f4}
.sgi small{display:block;font-size:12px;color:var(--pc,#0a8f6b);font-weight:600}
.ovl{position:fixed;inset:0;z-index:1}
.nav1,.tools{position:relative;z-index:2}
.tools{margin-left:auto;display:none;align-items:center;gap:0}
@media(min-width:768px){.tools{display:flex}}
.cbtn{font-size:14px;font-weight:500;gap:8px;padding:0 24px;line-height:1}
.cbtn svg{width:18px;height:18px}
.cta{display:flex;align-items:center;background:#2b373a;color:#fff;border-radius:8px;font-size:15px;font-weight:600;padding:10px 20px}
.burger{display:flex;margin-left:auto;width:36px;height:36px;background:none;border:0;align-items:center;justify-content:center;cursor:pointer;z-index:2}
.burger span,.burger span:before,.burger span:after{display:block;width:22px;height:2px;background:var(--text);border-radius:2px;position:relative;transition:.2s}
.burger span:before,.burger span:after{content:"";position:absolute;left:0}
.burger span:before{top:-7px}.burger span:after{top:7px}
.burger.on span{background:transparent}.burger.on span:before{top:0;transform:rotate(45deg)}.burger.on span:after{top:0;transform:rotate(-45deg)}
@media(min-width:768px){.tools+.burger{margin-left:0}}
@media(min-width:1024px){.burger{display:none}}
.nav2 .in{overflow:visible}
@media(min-width:1024px){.nav2 .in{display:flex}.tab{min-height:70px;padding:0 24px}}
@media(min-width:1280px){.tab{padding:0 30px}}
.tab{text-transform:capitalize}
.tab:hover{background:var(--pc,#0a8f6b);color:#fff}
.tab .crn{position:absolute;right:4px;top:12px;left:auto;color:#f5a800;font-size:0}
.tab .crn svg{width:14px;height:14px}
@media(max-width:1023px){
  .nav2{border:0}
  .menuwrap{display:none!important;position:absolute;left:0;right:0;top:70px;background:#fff;border-top:1px solid var(--border);box-shadow:0 20px 30px rgba(0,0,0,.08);max-width:none!important;padding:0!important;flex-direction:column}
  .menuwrap.open{display:flex!important}
  .menuwrap .tab{min-height:0;border:0;border-bottom:1px solid var(--border);padding:14px 20px}
}
.fcon{background:#1e2024;margin-top:4rem;color:#bbb}
.fin{max-width:1224px;margin:0 auto;padding:0 16px}
.fwrap{display:flex;flex-wrap:wrap;align-items:flex-start;padding:68px 0 28px}
.fmenu{width:100%}
@media(min-width:768px){.fmenu{width:50%}}
@media(min-width:1024px){.fmenu{width:22%}}
.flist{list-style:none;margin:0 0 40px;padding:0;display:flex;flex-direction:column;gap:10px}
.flist a{display:flex;align-items:center;color:#bbb;font-size:14px;line-height:1.5;text-transform:capitalize}
.flist a:hover{color:#fff}
.ftitle{color:#d9d9d9;font-size:16px;font-weight:600;line-height:1;margin-bottom:16px;text-transform:capitalize}
.fcopy{background:#21282a;padding:20px 0}
.fcopy p{margin:0;color:#bbb;font-size:13px;font-weight:600;line-height:1}
.fcopy span{color:#fff}
@media(max-width:767px){.fcopy p{text-align:center}}

/* v8: mobile card layout (sample jaisa) + chhota logo */
.logo,.logo img{height:36px}.logo{width:36px}
@media(min-width:768px){.logo,.logo img{height:40px}.logo{width:40px}}
@media(max-width:749px){
  .cw{padding:14px 16px 16px 14px}
  .cdata{width:100%;flex-direction:row;align-items:center;justify-content:space-between;padding:18px 0 0}
  .cprim{margin:0}.cprim span{font-size:14px;font-weight:500}
  .cmeta{font-size:13px;color:#777}
  .crate{width:50%;padding:20px 0 0}
  .csize{width:50%;margin-left:auto;align-self:flex-end;line-height:34px}
  .head{padding:12px 16px}.head h2{font-size:22px}
}

/* v9: screenshots ke naap se: card gap 24, header 68, sidebar padding */
.nav1 .in{height:67px}
.cw{margin-bottom:24px}
.head{margin-bottom:24px}
.head .btn{padding:4px 18px;line-height:20px}
.side{padding:20px 27px}
.side h2{padding-bottom:17px;margin-bottom:16px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;


const SizeBox = ({ s, cls }) => {
  const mb = latest(s)?.file_size_mb;
  const [n, u] = mb == null ? ["—", ""] : mb >= 1024 ? [+(mb / 1024).toFixed(2), "gb"] : [+mb, "mb"];
  return <div className={cls}>{n}{u && <span>{u}</span>}</div>;
};
const Stars = ({ n }) => <span className="stars" aria-label={`${n} stars`}>{[1, 2, 3, 4, 5].map((i) => { const p = Math.max(0, Math.min(1, n - (i - 1))) * 100; return <span key={i} className="st"><Star /><span style={{ width: p + "%" }}><Star /></span></span>; })}</span>;
const PIcon = ({ p }) => p === "Mac" ? <Apple /> : p === "Windows" ? <Win /> : <Folder />;
const titleOf = (s) => { const v = latest(s)?.version; return v && !s.name.includes(v) ? `${s.name} ${v}` : s.name; };
const Thumb = ({ s }) => s.icon_url ? <img src={s.icon_url} alt={s.name} loading="lazy" decoding="async" /> : <b>{s.name[0]}</b>;

function Row({ s }) {
  const to = `/software/${s.slug}`, title = titleOf(s);
  return (
    <div className="cw">
      {s.is_featured && <span className="cprem"><Crown /></span>}
      <Link to={to} className="ci" aria-label={s.name}><Thumb s={s} /></Link>
      <div className="cinfo"><Link to={to} className="ctitle" title={title}>{title}</Link><p className="cdesc">{s.short_desc}</p><span className="ccat">{s.subcategory}</span></div>
      <div className="cdata bd"><span className="cprim"><PIcon p={s.platform} /><span>{s.platform}</span></span><span className="cmeta"><Cloud />{s.download_count}</span></div>
      <div className="crate bd"><span className="lbl">Reputation</span><Stars n={s.reputation} /></div>
      <SizeBox s={s} cls="csize bd" />
    </div>
  );
}

function Mini({ s }) {
  const to = `/software/${s.slug}`, title = titleOf(s);
  return (
    <div className="mc">
      <Link to={to} className="mi" aria-label={s.name}><Thumb s={s} /></Link>
      <div className="md"><Link to={to} className="mt" title={title}>{title}</Link><span className="mcat">{s.subcategory}</span><SizeBox s={s} cls="ms" /></div>
    </div>
  );
}

function useList(catId, limit) {
  const [list, setList] = useState([]);
  useEffect(() => {
    supabase.from("software").select(COLS).eq("category_id", catId).eq("status", "published").order("published_at", { ascending: false, nullsFirst: false }).limit(limit).then(({ data }) => setList(data || []));
  }, [catId, limit]);
  return list;
}

function Section({ cat }) {
  const st = useSettings();
  const list = useList(cat.id, st.home_items);
  return (<>
    <div className="head"><h2>{cat.name}</h2><Link className="btn" to={`/category/${cat.slug}`}>View All</Link></div>
    {list.map((s) => <Row key={s.id} s={s} />)}
  </>);
}

function SideBlock({ cat }) {
  const st = useSettings();
  const list = useList(cat.id, st.sidebar_items);
  return (<div className="side"><h2>{cat.name}</h2>{list.map((s) => <Mini key={s.id} s={s} />)}</div>);
}

function Home() {
  const st = useSettings();
  const [cats, setCats] = useState([]);
  useEffect(() => {
  setMeta({ title: st.meta_title || st.site_name, description: st.meta_description || st.tagline, canonical: "/", image: st.logo_url, siteName: st.site_name });
}, [st]);
  useEffect(() => { supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data || [])); }, []);
  return (
    <div className="wrap">
      <JsonLd id="site" data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "WebSite", name: st.site_name, url: location.origin, potentialAction: { "@type": "SearchAction", target: `${location.origin}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
        { "@type": "Organization", name: st.site_name, url: location.origin, logo: st.logo_url || undefined, email: st.contact_email || undefined, sameAs: (st.social || "").split(",").map((x) => x.trim()).filter(Boolean) }] }} />
      <main><h1 className="sr-only">{st.meta_title || st.site_name}</h1>{cats.filter((c) => c.show_on_home).map((c) => <Section key={c.id} cat={c} />)}</main>
      
      <aside>{cats.filter((c) => c.show_in_sidebar).map((c) => <SideBlock key={c.id} cat={c} />)}</aside>
    </div>
  );
}

const SORTS = { new: ["published_at", false], dl: ["download_count", false], az: ["name", true] };
const PAGE = 20;

function Category() {
  const { slug } = useParams();
  const st = useSettings();
  const [cats, setCats] = useState([]), [subs, setSubs] = useState([]), [pick, setPick] = useState([]);
  const [sort, setSort] = useState("new"), [n, setN] = useState(PAGE), [list, setList] = useState([]);
  const [more, setMore] = useState(false), [fopen, setFopen] = useState(false);
  const cat = cats.find((c) => c.slug === slug);
  const cid = cat?.id;

  useEffect(() => { supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data || [])); }, []);
  useEffect(() => { setPick([]); setN(PAGE); setSort("new"); setFopen(false); }, [slug]);
  useEffect(() => {
    if (!cid) return;
    supabase.from("software").select("subcategory").eq("category_id", cid).eq("status", "published")
      .then(({ data }) => setSubs([...new Set((data || []).map((x) => x.subcategory).filter(Boolean))].sort()));
  }, [cid]);
  useEffect(() => {
    if (!cid) return;
    const [col, asc] = SORTS[sort];
    let q = supabase.from("software").select(COLS).eq("category_id", cid).eq("status", "published").order(col, { ascending: asc }).range(0, n);
    if (pick.length) q = q.in("subcategory", pick);
    q.then(({ data }) => { const d = data || []; setMore(d.length > n); setList(d.slice(0, n)); });
  }, [cid, sort, pick, n]);

  useEffect(() => {
  if (!cat) return;
  setMeta({
    title: `${cat.name} Software Download - ${st.site_name}`,
    description: cat.description || `Browse and download the latest ${cat.name} software with version history and direct download links.`,
    canonical: `/category/${cat.slug}`,
    image: st.logo_url,
    siteName: st.site_name,
  });
}, [cat, st]);




  if (!cats.length) return null;
  if (!cat) return <div className="wrap">Category not found.</div>;
  const tog = (x) => { setPick(pick.includes(x) ? pick.filter((y) => y !== x) : [...pick, x]); setN(PAGE); };

  return (<>
    <div className="cbanner"><div className="cin"><h2>{cat.name}</h2><nav className="crumb"><Link to="/">Home</Link><Chev /><span>{cat.name}</span></nav></div></div>
    <div className="wrap cat">
      <aside className={"fside" + (fopen ? " open" : "")}>
        <div className="side"><h2>Primary Category</h2>
          {cats.map((c) => <Link key={c.id} to={`/category/${c.slug}`} className="chk"><i className={c.id === cat.id ? "on" : ""}>{c.id === cat.id && <Tick />}</i><span>{c.name}</span>{c.is_premium && <em className="priv"><Crown /> Private Category</em>}</Link>)}
        </div>
        {subs.length > 0 && <div className="side"><h2>Sub Category</h2><div className="subs">
          {subs.map((x) => <button key={x} className="chk" onClick={() => tog(x)}><i className={pick.includes(x) ? "on" : ""}>{pick.includes(x) && <Tick />}</i><span>{x}</span></button>)}
        </div></div>}
      </aside>
      <main>
        <button className="btn fbtn" onClick={() => setFopen(!fopen)}>Filters</button>
        <div className="head"><h2>{cat.name}</h2>
          <select className="sortby" value={sort} onChange={(e) => { setSort(e.target.value); setN(PAGE); }} aria-label="Sort by">
            <option value="new">Newest</option><option value="dl">Most downloaded</option><option value="az">Name (A-Z)</option>
          </select></div>
        {list.map((s) => <Row key={s.id} s={s} />)}
        {!list.length && <p>No software in this category yet.</p>}
        {more && <p style={{ textAlign: "center" }}><button className="btn" onClick={() => setN(n + PAGE)}>Load more</button></p>}
      </main>
    </div>
  </>);
}

const ICON = { windows: <Win />, apple: <Apple />, android: <Android />, game: <Game />, book: <Book />, video: <Video />, folder: <Folder /> };

function Nav() {
  const st = useSettings();
  const logo = st.logo_url || st.favicon_url;
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [sug, setSug] = useState([]);
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);   // Categories dropdown
  const [menu, setMenu] = useState(false);   // mobile burger
  const go = useNavigate();
  const loc = useLocation();
  useEffect(() => { supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats(data || [])); }, []);
  useEffect(() => { setMenu(false); setFocus(false); }, [loc.pathname]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setSug([]); return; }
    const h = setTimeout(() => supabase.from("software").select("id,name,slug,icon_url,subcategory").eq("status", "published").ilike("name", `%${s}%`).limit(6).then(({ data }) => setSug(data || [])), 250);
    return () => clearTimeout(h);
  }, [q]);
  const submit = (e) => { e.preventDefault(); if (q.trim()) { setFocus(false); go(`/search?q=${encodeURIComponent(q.trim())}`); } };
  return (<header className="hdr">
    <div className="nav1"><div className="in">
      <Link to="/" className="logo" aria-label={st.site_name} style={logo ? { background: "none", width: "auto" } : undefined}>
        {logo ? <img src={logo} alt={st.site_name} height="40" style={{ maxWidth: 170, borderRadius: 6, objectFit: "contain" }} /> : st.site_name?.[0]}
      </Link>
      <div className="swrap">
        <form className="search" onSubmit={submit}>
          <button type="submit" aria-label="Search"><SearchIcon /></button>
          <input placeholder="Search products here..." value={q} autoComplete="off" onFocus={() => setFocus(true)} onChange={(e) => setQ(e.target.value)} />
          {q && <button type="button" className="sclose" aria-label="Clear" onClick={() => { setQ(""); setSug([]); }}><Close /></button>}
        </form>
        {focus && q.trim().length >= 2 && (<div className="sugg">
          <div className="sugt">{sug.length ? "Products" : "No results found"}</div>
          {sug.map((s) => <Link key={s.id} to={`/software/${s.slug}`} className="sgi" onClick={() => setFocus(false)}>
            {s.icon_url ? <img src={s.icon_url} alt="" width="32" height="32" /> : <b>{s.name[0]}</b>}<span>{s.name}<small>{s.subcategory}</small></span></Link>)}
        </div>)}
      </div>
      <div className="tools">
        {st.show_categories_btn && <div style={{ position: "relative" }}>
          <button className="cbtn" onClick={() => setOpen(!open)}><GridFill /><span>Categories</span></button>
          {open && <div className="dd" onClick={() => setOpen(false)}>{cats.map((c) => <Link key={c.id} to={`/category/${c.slug}`}>{c.name}</Link>)}</div>}
        </div>}
        {st.cta_enabled && st.cta_url && <a className="cta" href={st.cta_url} target="_blank" rel="noopener noreferrer">{st.cta_label}</a>}
      </div>
      <button className={"burger" + (menu ? " on" : "")} aria-label="Menu" onClick={() => setMenu(!menu)}><span /></button>
    </div></div>
    <div className="nav2"><div className={"in menuwrap" + (menu ? " open" : "")}>
      {cats.filter((c) => c.show_in_nav !== false).map((c) => (
        <NavLink key={c.id} to={`/category/${c.slug}`} className={({ isActive }) => "tab" + (isActive ? " active" : "")}>
          {ICON[c.icon] || <Folder />}<span>{c.name}</span>{c.is_premium && <span className="crn"><Crown /></span>}
        </NavLink>
      ))}
    </div></div>
    {focus && <div className="ovl" onClick={() => setFocus(false)} />}
  </header>);
}

function Search() {
  const [sp] = useSearchParams();
  const q = sp.get("q") || "";
  const [list, setList] = useState([]);

  useEffect(() => { document.title = `Search: ${q}`; }, [q]);
  useEffect(() => { supabase.from("software").select(COLS).ilike("name", `%${q}%`).eq("status", "published").limit(50).then(({ data }) => setList(data || [])); }, [q]);
return <div className="wrap" style={{ display: "block" }}><Noindex follow /><div className="head"><h2>Search: {q}</h2></div>{list.length ? list.map((s) => <Row key={s.id} s={s} />) : <p>Kuch nahi mila.</p>}</div>;}

function Footer() {
  const st = useSettings();
  const [cats, setCats] = useState([]);
  useEffect(() => { supabase.from("categories").select("name,slug").order("sort_order").then(({ data }) => setCats(data || [])); }, []);
  // Settings > Footer links: "# Title" ke neeche "Label|url" lines
  const cols = []; (st.footer_links || "").split("\n").forEach((l) => { l = l.trim(); if (!l) return; if (l.startsWith("#")) cols.push({ t: l.slice(1).trim(), a: [] }); else if (cols.length) { const [n, u] = l.split("|"); cols[cols.length - 1].a.push([n.trim(), (u || "/").trim()]); } });
  const A = ([n, u]) => /^https?:/.test(u) ? <li key={n}><a href={u} target="_blank" rel="noopener noreferrer">{n}</a></li> : <li key={n}><Link to={u}>{n}</Link></li>;
  return (<footer className="fcon"><div className="fin">
    <div className="fwrap">
      <div className="fmenu"><ul className="flist"><li className="ftitle">Download Software</li>{cats.map((c) => <li key={c.slug}><Link to={`/category/${c.slug}`}>{c.name}</Link></li>)}</ul></div>
      {cols.map((c) => <div className="fmenu" key={c.t}><ul className="flist"><li className="ftitle">{c.t}</li>{c.a.map(A)}</ul></div>)}
    </div></div>
    <div className="fcopy"><div className="fin"><p>{st.footer_text ? st.footer_text : <><span>©{st.site_name}</span> - All Rights Reserved {new Date().getFullYear()}</>}</p></div></div>
  </footer>);
}

export default function App() {
  const st = useSettings();
  const admin = useLocation().pathname.startsWith("/admin");
  useEffect(() => {
    document.documentElement.style.setProperty("--pc", st.primary_color);
    if (st.favicon_url) { let l = document.querySelector("link[rel=icon]"); if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); } l.href = st.favicon_url; }
  }, [st]);
  return (<>
    <style>{css}</style>
    {!admin && <Nav />}
    <Suspense fallback={null}>
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/search" element={<Search />} />
  <Route path="/category/:slug" element={<Category />} />
  <Route path="/software/:slug" element={<Post />} />
  <Route path="/admin" element={<><Noindex /><Admin /></>} />
  <Route path="*" element={<NotFound />} />
</Routes>
    </Suspense>
    {!admin && <Footer />}
  </>);
}

function NotFound() {
  useEffect(() => { document.title = "404 - Page not found"; }, []);
  return <div className="wrap" style={{ display: "block" }}><Noindex /><div className="head"><h2>404 - Page not found</h2></div><p>Ye page maujood nahi. <Link to="/">Home par jayen</Link></p></div>;
}
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
export { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell };

export const THEMES=[
  {id:"dark",name:"Тёмная",icon:"🌙"},{id:"light",name:"Светлая",icon:"☀️"},
];
export const C={bg:"var(--bg)",card:"var(--card)",card2:"var(--card2)",border:"var(--border)",hi:"var(--hi)",cyan:"var(--cyan)",purple:"var(--purple)",green:"var(--green)",amber:"var(--amber)",red:"var(--red)",pink:"var(--pink)",blue:"var(--blue)",text:"var(--text)",muted:"var(--muted)",dim:"var(--dim)"};
export const MON=["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
export const WEEKDAYS=["вс","пн","вт","ср","чт","пт","сб"];
export const EXP_CATS=["🍔 Еда","🚗 Транспорт","🏥 Здоровье","🎬 Развлечения","👕 Одежда","🏠 Жильё","📱 Подписки","💡 Коммуналки","🛒 Покупки","❓ Другое"];
export const INC_CATS=["💼 Зарплата","💻 Фриланс","📈 Инвестиции","🎁 Подарки","❓ Другое"];
export const MOODS=[{v:1,e:"😞",l:"Тяжело"},{v:2,e:"😐",l:"Нейтрально"},{v:3,e:"😊",l:"Хорошо"},{v:4,e:"😄",l:"Отлично"},{v:5,e:"🤩",l:"Великолепно"}];
export const ICONS=["💧","🏃","📖","🧘","💊","🍎","😴","🏋️","✍️","🎯","💻","🧴","☕","🚶","🎵","🌿","🔥","⚡","🧠","❤️"];
export const HCOLS=[C.cyan,C.green,C.purple,C.amber,C.red,C.pink,"#06b6d4","#8b5cf6"];
export const PROJ_ICONS=["📁","🚀","💡","🎯","🔧","📱","🏗️","✨","🎨","📊"];
export const PROJ_COLORS=[C.cyan,C.green,C.purple,C.amber,C.red,C.pink,"#3b82f6","#06b6d4"];
export const CAT_MAP={"Еда":"🍔 Еда","Транспорт":"🚗 Транспорт","Здоровье":"🏥 Здоровье","Развлечения":"🎬 Развлечения","Одежда":"👕 Одежда","Жильё":"🏠 Жильё","Подписки":"📱 Подписки","Коммуналки":"💡 Коммуналки","Покупки":"🛒 Покупки","Зарплата":"💼 Зарплата","Фриланс":"💻 Фриланс","Инвестиции":"📈 Инвестиции","Подарки":"🎁 Подарки","Другое":"❓ Другое","Кредит":"🏦 Кредит"};
export const DEF_WALLETS=[{id:"w1",name:"Наличка",type:"cash",icon:"💵",color:C.green},{id:"w2",name:"Банк. карта",type:"bank",icon:"🏦",color:C.cyan,feePercent:0},{id:"w3",name:"Кредитная",type:"credit",icon:"💳",color:C.purple,billingDay:10,feePercent:0,linkedWalletId:"w2"}];
export const CRYPTO_MAP={'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','BNB':'binancecoin','ADA':'cardano','XRP':'ripple','DOT':'polkadot','AVAX':'avalanche-2','MATIC':'matic-network','LINK':'chainlink','UNI':'uniswap','DOGE':'dogecoin','SHIB':'shiba-inu','LTC':'litecoin','ATOM':'cosmos','USDT':'tether','USDC':'usd-coin','TRX':'tron','TON':'the-open-network','NEAR':'near','PEPE':'pepe'};
export const DEF_WIDGETS={briefing:true,habits:true,goals:true,calendar:true,analytics:true,finance:true,resilience:true,dailyReview:true,mentalLoad:true,focus:true,tracker:true};
export const LIFE_AREAS=[{id:"health",name:"Здоровье",icon:"💪",color:C.green},{id:"career",name:"Карьера",icon:"💼",color:C.cyan},{id:"finance",name:"Финансы",icon:"💰",color:C.amber},{id:"relations",name:"Отношения",icon:"❤️",color:C.pink},{id:"growth",name:"Развитие",icon:"🧠",color:C.purple},{id:"rest",name:"Отдых",icon:"🌿",color:C.blue}];
export const MAX_ACTIVE_PROJECTS=3;
export const HABIT_WEIGHTS=[{v:1,l:"Обычная",icon:"·"},{v:2,l:"Важная",icon:"••"},{v:3,l:"Ключевая",icon:"•••"}];
export const GOAL_PRIORITIES=[{v:1,l:"Обычная"},{v:2,l:"Важная"},{v:3,l:"Ключевая"}];
export const calcHealthPatterns=(health)=>{
  const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);return d.toISOString().split("T")[0]});
  const rows=days.map(d=>health[d]).filter(Boolean);
  const insights=[];
  const withCoffee=rows.filter(r=>typeof r.coffee==="number"&&typeof r.symptom==="number");
  if(withCoffee.length>=5){const high=withCoffee.filter(r=>r.coffee>=2),low=withCoffee.filter(r=>r.coffee<2);if(high.length>=2&&low.length>=2){const avgH=high.reduce((s,r)=>s+r.symptom,0)/high.length,avgL=low.reduce((s,r)=>s+r.symptom,0)/low.length;if(avgH-avgL>=1)insights.push(`В дни с 2+ чашками кофе дискомфорт в среднем выше на ${(avgH-avgL).toFixed(1)} балла (${avgH.toFixed(1)} против ${avgL.toFixed(1)}).`);}}
  const withSleep=rows.filter(r=>typeof r.sleep==="number"&&typeof r.symptom==="number");
  if(withSleep.length>=5){const bad=withSleep.filter(r=>r.sleep<6),good=withSleep.filter(r=>r.sleep>=7);if(bad.length>=2&&good.length>=2){const avgB=bad.reduce((s,r)=>s+r.symptom,0)/bad.length,avgG=good.reduce((s,r)=>s+r.symptom,0)/good.length;if(avgB-avgG>=1)insights.push(`При сне меньше 6 часов дискомфорт в среднем выше на ${(avgB-avgG).toFixed(1)} балла.`);}}
  const withWorkout=rows.filter(r=>typeof r.workout==="boolean"&&typeof r.symptom==="number");
  if(withWorkout.length>=5){const yes=withWorkout.filter(r=>r.workout),no=withWorkout.filter(r=>!r.workout);if(yes.length>=2&&no.length>=2){const avgY=yes.reduce((s,r)=>s+r.symptom,0)/yes.length,avgN=no.reduce((s,r)=>s+r.symptom,0)/no.length;if(avgN-avgY>=1)insights.push(`В дни со спортом дискомфорт в среднем ниже на ${(avgN-avgY).toFixed(1)} балла.`);}}
  if(!insights.length)insights.push(rows.length<5?"Заполняй хотя бы 5 дней — тогда появятся закономерности.":"Явных закономерностей пока не видно — это хорошо.");
  return{insights,rows:days.map(d=>({day:d.slice(8),sleep:health[d]?.sleep||0,symptom:health[d]?.symptom||0}))};
};
export const calcMentalLoad=(goals,projects,TD,TM,WS)=>{
  const openTasks=(projects||[]).filter(p=>p.status!=="done").reduce((s,p)=>s+(p.tasks||[]).filter(t=>!t.done).length,0);
  const unfinishedProjects=(projects||[]).filter(p=>p.status!=="done").length;
  const overdueDaily=(goals.daily||[]).filter(g=>!g.done&&g.date<TD).length;
  const delayed=(goals.weekly||[]).filter(g=>!g.done&&g.weekStart<WS).length+(goals.monthly||[]).filter(g=>!g.done&&g.month<TM).length;
  const score=Math.min(100,openTasks+unfinishedProjects+delayed+overdueDaily);
  const level=score<15?"Низкая":score<35?"Средняя":score<60?"Высокая":"Критическая";
  const levelColor=score<15?C.green:score<35?C.cyan:score<60?C.amber:C.red;
  const parts=[{l:"Открытые задачи",v:openTasks},{l:"Незавершённые проекты",v:unfinishedProjects},{l:"Отложенные дела",v:delayed},{l:"Просроченные",v:overdueDaily}];
  const top=parts.reduce((a,b)=>b.v>a.v?b:a,parts[0]);
  const tip=top.v===0?"Система разгружена, можно брать новое.":`Больше всего давит: «${top.l.toLowerCase()}» (${top.v}). С этого и стоит начать разгрузку.`;
  return{score,level,levelColor,parts,tip};
};
export const calcResilience=(habits,goals,journal,TD)=>{
  const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);return d.toISOString().split("T")[0]});
  const totalW=habits.reduce((s,h)=>s+(h.weight||1),0)||1;
  const habPct=days.map(d=>Math.round(habits.reduce((s,h)=>s+(h.done[d]?(h.weight||1):0),0)/totalW*100));
  const avgHab=habPct.reduce((a,b)=>a+b,0)/habPct.length;
  const volatility=habPct.slice(1).reduce((s,v,i)=>s+Math.abs(v-habPct[i]),0)/(habPct.length-1||1);
  const last7=days.slice(-7);
  const dGoals=(goals?.daily||[]).filter(g=>last7.includes(g.date));
  const goalConsistency=dGoals.length?Math.round(dGoals.filter(g=>g.done).length/dGoals.length*100):60;
  const moodRows=(journal||[]).filter(j=>last7.includes(j.date));
  const moodNorm=moodRows.length?Math.round(moodRows.reduce((s,j)=>s+j.mood,0)/moodRows.length/5*100):60;
  const score=Math.max(0,Math.min(100,Math.round(avgHab*0.4+goalConsistency*0.25+moodNorm*0.2+Math.max(0,100-volatility*2.2)*0.15)));
  const factors=[];
  if(avgHab<50)factors.push("низкая регулярность привычек");
  if(volatility>25)factors.push("нестабильный ритм (частые срывы)");
  if(goalConsistency<50)factors.push("низкое выполнение целей дня");
  if(moodNorm<50)factors.push("настроение ниже среднего");
  if(!factors.length)factors.push("всё стабильно");
  return{score,trend:days.map((d,i)=>({day:d.slice(8),pct:habPct[i]})),factors,avgHab:Math.round(avgHab),goalConsistency,moodNorm};
};
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
export const getToday=()=>new Date().toISOString().split("T")[0];
export const getMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
const logicalDate=()=>{const d=new Date();if(d.getHours()<5)d.setDate(d.getDate()-1);return d;};
export const getLogicalToday=()=>logicalDate().toISOString().split("T")[0];
export const getWeekStart=()=>{const d=logicalDate();d.setDate(d.getDate()-d.getDay());return d.toISOString().split("T")[0];};
export const getCurWeek=()=>{const d=logicalDate();const sun=new Date(d);sun.setDate(d.getDate()-d.getDay());return Array.from({length:7},(_,i)=>{const x=new Date(sun);x.setDate(sun.getDate()+i);return x.toISOString().split("T")[0];});};
export const getBillDate=(bd,n=1)=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth()+n,bd).toISOString().split("T")[0];};
export const fmtDate=(s)=>{if(!s)return"";const d=new Date(s+"T12:00:00");return `${d.getDate()} ${MON[d.getMonth()]}`;};
export const db={get:async(k,fb)=>{try{if(typeof window==="undefined")return fb;const raw=window.localStorage.getItem(k);return raw?JSON.parse(raw):fb;}catch{return fb;}},set:async(k,v)=>{try{if(typeof window!=="undefined")window.localStorage.setItem(k,JSON.stringify(v));}catch{}}};
export const executeCmd=async(cmd,{sg,st,sm_mem,sproj})=>{const TD=getToday(),TM=getMonth(),WS=getWeekStart();try{switch(cmd.type){case"add_goal":{const cur=await db.get("nx_g",{yearly:[],monthly:[],weekly:[],daily:[]});const sec=cmd.section||"daily";const TY=TM.slice(0,4);const base={id:uid(),text:cmd.text,done:false,parentId:cmd.parent_id||null};const extra=sec==="daily"?{date:TD}:sec==="weekly"?{weekStart:WS}:sec==="monthly"?{month:TM}:{year:TY};const upd={...cur,[sec]:[...(cur[sec]||[]),{...base,...extra}]};await db.set("nx_g",upd);sg(upd);return `Задача: "${cmd.text}"`;}case"complete_goal":{const cur=await db.get("nx_g",{yearly:[],monthly:[],weekly:[],daily:[]});const sec=cmd.section||"daily";const g=(cur[sec]||[]).find(g=>g.id===cmd.goal_id);const upd={...cur,[sec]:(cur[sec]||[]).map(g=>g.id===cmd.goal_id?{...g,done:true}:g)};await db.set("nx_g",upd);sg(upd);return `Выполнено: "${g?.text||cmd.goal_id}"`;}case"add_transaction":{const cur=await db.get("nx_t",[]);const cat=CAT_MAP[cmd.category]||`❓ ${cmd.category}`;const tx={id:uid(),type:cmd.tx_type||"expense",amount:Number(cmd.amount),category:cat,description:cmd.description,date:TD,walletId:cmd.walletId||null,status:"charged"};const upd=[...cur,tx];await db.set("nx_t",upd);st(upd);return `Транзакция: ${tx.type==="income"?"+":"-"}₪${cmd.amount}`;}case"add_project_task":{const cur=await db.get("nx_projects",[]);const proj=cur.find(p=>p.id===cmd.project_id||p.name.toLowerCase().includes((cmd.project_name||"").toLowerCase()));if(!proj)return"Проект не найден";const task={id:uid(),text:cmd.text,done:false,createdAt:Date.now()};const upd=cur.map(p=>p.id===proj.id?{...p,tasks:[...(p.tasks||[]),task]}:p);await db.set("nx_projects",upd);sproj(upd);return `Задача в "${proj.name}"`;}case"save_memory":{const cur=await db.get("nx_mem",[]);const upd=[...cur,{text:cmd.memory,ts:Date.now()}].slice(-30);await db.set("nx_mem",upd);sm_mem(upd);return `Запомнил: "${cmd.memory}"`;}default:return null;}}catch{return null;}};
export const Card=({children,s,glow,onClick,className})=><div onClick={onClick} className={className} style={{background:C.card,borderRadius:18,padding:16,border:`1px solid ${glow?C.hi:C.border}`,boxShadow:glow?"0 0 0 1px var(--hi)":"none",cursor:onClick?"pointer":undefined,transition:"background .2s",...s}}>{children}</div>;
export const Lbl=({children,color,mb=8})=><div style={{fontSize:12,fontWeight:600,letterSpacing:0.2,color:color||C.muted,marginBottom:mb}}>{children}</div>;
export const PBtn=({children,onClick,disabled,s,color})=><button onClick={onClick} disabled={disabled} style={{background:disabled?C.dim:color||C.cyan,color:disabled?C.muted:"#fff",border:"none",padding:"10px 18px",borderRadius:14,fontWeight:600,fontSize:15,cursor:disabled?"default":"pointer",fontFamily:"inherit",transition:"opacity 0.15s",...s}}>{children}</button>;
export const GBtn=({children,onClick,s,active,color})=><button onClick={onClick} style={{background:active?(color||C.cyan):C.card2,border:"none",color:active?"#fff":C.text,padding:"8px 14px",borderRadius:12,fontSize:13,fontWeight:active?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",...s}}>{children}</button>;
export const Inp=({val,set,ph,type="text",onKD,s,rows})=>rows?<textarea value={val} onChange={e=>set(e.target.value)} placeholder={ph} onKeyDown={onKD} rows={rows} style={{background:C.card2,border:"none",color:C.text,borderRadius:12,padding:"10px 13px",fontFamily:"inherit",fontSize:15,outline:"none",width:"100%",resize:"none",lineHeight:1.5,...s}}/>:<input value={val} onChange={e=>set(e.target.value)} placeholder={ph} type={type} onKeyDown={onKD} style={{background:C.card2,border:"none",color:C.text,borderRadius:12,padding:"10px 13px",fontFamily:"inherit",fontSize:15,outline:"none",width:"100%",...s}}/>;
export const Sel=({val,set,children,s})=><select value={val} onChange={e=>set(e.target.value)} style={{background:C.card2,border:"none",color:C.text,borderRadius:12,padding:"10px 13px",fontFamily:"inherit",fontSize:15,outline:"none",width:"100%",...s}}>{children}</select>;
export const Chip=({children,active,onClick,color=C.cyan})=><button onClick={onClick} style={{padding:"6px 12px",borderRadius:20,border:"none",background:active?color:C.card2,color:active?"#fff":C.text,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:active?600:400}}>{children}</button>;
export function Confetti({onDone}){const pieces=Array.from({length:40},(_,i)=>({id:i,x:Math.random()*100,delay:Math.random()*.8,dur:1+Math.random()*1.5,color:["#00d4ff","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899"][i%6],shape:i%3===0?"circle":i%3===1?"rect":"tri"}));useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[]);return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>{pieces.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:-20,width:p.shape==="circle"?8:7,height:p.shape==="circle"?8:p.shape==="rect"?12:8,background:p.color,borderRadius:p.shape==="circle"?"50%":2,animation:`cffall ${p.dur}s ${p.delay}s forwards ease-in`,clipPath:p.shape==="tri"?"polygon(50% 0%,0% 100%,100% 100%)":"none"}}/>)}</div>;}
export const Skel=({w="100%",h=14,r=6,mb=0})=><div style={{width:w,height:h,borderRadius:r,background:C.dim,marginBottom:mb,animation:"shimmer 1.5s infinite linear"}}/>;
export function GStyles(){return <style>{`
:root{--bg:#09090d;--card:#15151c;--card2:#1c1c25;--border:rgba(255,255,255,0.08);--hi:rgba(109,106,247,0.35);--cyan:#6d6af7;--purple:#c77dff;--green:#4fd1a5;--amber:#f2a154;--red:#f2617a;--pink:#f2617a;--blue:#6d6af7;--text:#f3f2ee;--muted:#8d8d99;--dim:#26262f;--header:rgba(9,9,13,.78)}
[data-theme="light"]{--bg:#f5f5f7;--card:#ffffff;--card2:#eeeef2;--border:rgba(15,15,20,0.08);--hi:rgba(93,90,224,0.2);--cyan:#5d5ae0;--purple:#9b4fd1;--green:#1f9c74;--amber:#c97a2e;--red:#d9425c;--pink:#d9425c;--blue:#5d5ae0;--text:#101014;--muted:#6b6b76;--dim:#e7e7ec;--header:rgba(245,245,247,.78)}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif}button{outline:none;-webkit-tap-highlight-color:transparent}
.app-atmosphere{position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse 900px 500px at 10% -10%, rgba(109,106,247,.14), transparent 60%),radial-gradient(ellipse 700px 500px at 100% 0%, rgba(199,125,255,.09), transparent 60%)}
[data-theme="light"] .app-atmosphere{background:radial-gradient(ellipse 900px 500px at 10% -10%, rgba(93,90,224,.08), transparent 60%),radial-gradient(ellipse 700px 500px at 100% 0%, rgba(155,79,209,.06), transparent 60%)}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace}body{background:var(--bg)}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:color-mix(in srgb, var(--cyan) 30%, transparent);border-radius:2px}select option{background:var(--card);color:var(--text)}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}@keyframes slideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}@keyframes cffall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}@keyframes shimmer{0%{opacity:.45}50%{opacity:.9}100%{opacity:.45}}@keyframes glow-ring{0%,100%{filter:drop-shadow(0 0 2px #10b981)}50%{filter:drop-shadow(0 0 8px #10b981)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes tada{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes spinRev{from{transform:rotate(360deg)}to{transform:rotate(0)}}.fu{animation:fadeUp .25s ease}.pop{animation:pop .4s ease}.si{animation:slideIn .2s ease}.sidebar{display:none}.bottom-nav{display:flex}.dash-grid{display:flex;flex-direction:column;gap:12px}.hgrid{display:grid;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden}.hgrid>*{background:var(--card)}@media(min-width:860px){.sidebar{display:flex !important}.bottom-nav{display:none !important}.app-col{max-width:1180px !important}.dash-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;align-items:start}.dash-grid>.span2{grid-column:1/-1}}`}</style>}
export function Sidebar({tab,setTab}){const nav=[{id:"dash",icon:"◈",label:"Панель управления",color:"#0a84ff"},{id:"habits",icon:"◉",label:"Привычки",color:"#30d158"},{id:"life",icon:"✦",label:"Цели и проекты",color:"#ff9f0a"},{id:"health",icon:"♥",label:"Здоровье",color:"#ff375f"},{id:"finance",icon:"▣",label:"Финансы",color:"#bf5af2"},{id:"analytics",icon:"▤",label:"Аналитика",color:"#5e5ce6"},{id:"ai",icon:"⬡",label:"NEXUS AI",color:"#64d2ff"},{id:"settings",icon:"⚙",label:"Настройки",color:"#8e8e93"}];return <aside className="sidebar" style={{flexDirection:"column",width:230,flexShrink:0,background:C.card,borderRight:`1px solid ${C.border}`,padding:"18px 12px",gap:2}}><div style={{display:"flex",alignItems:"center",gap:10,padding:"0 8px",marginBottom:24}}><div style={{width:32,height:32,background:"linear-gradient(135deg,var(--cyan),var(--purple))",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontWeight:600,fontSize:15,color:"#fff",fontFamily:"'JetBrains Mono',monospace"}}>N</span></div><div style={{fontSize:15,fontWeight:700,letterSpacing:-0.2,color:C.text}}>NEXUS OS</div></div>{nav.map(it=><button key={it.id} onClick={()=>setTab(it.id)} style={{display:"flex",alignItems:"center",gap:11,padding:"7px 10px",borderRadius:11,background:tab===it.id?"color-mix(in srgb, var(--cyan) 12%, transparent)":"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",marginBottom:1}}><div style={{width:28,height:28,borderRadius:8,background:it.color,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:14,color:"#fff",lineHeight:1}}>{it.icon}</span></div><span style={{fontSize:14,fontWeight:tab===it.id?600:400,color:tab===it.id?C.cyan:C.text}}>{it.label}</span></button>)}</aside>}
export function TopBar({now,theme,setTheme}){const curTheme=THEMES.find(x=>x.id===theme)||THEMES[0];const nextTheme=()=>{const i=THEMES.findIndex(x=>x.id===theme);setTheme(THEMES[(i+1)%THEMES.length].id)};return <header style={{background:"var(--header)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,background:"linear-gradient(135deg,var(--cyan),var(--purple))",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontWeight:600,fontSize:15,color:"#fff",fontFamily:"'JetBrains Mono',monospace"}}>N</span></div><div><div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>NEXUS</div><div style={{fontSize:12,color:C.muted}}>{now.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"})}</div></div></div><button onClick={nextTheme} title={curTheme.name} style={{background:C.card2,border:"none",borderRadius:20,padding:"6px 12px",fontSize:15}}>{curTheme.icon}</button></header>}
export function NavBar({tab,setTab}){const nav=[{id:"dash",icon:"◈",label:"Главная"},{id:"finance",icon:"▣",label:"Финансы"},{id:"ai",icon:"⬡",label:"NEXUS AI"}];return <nav className="bottom-nav" style={{flexShrink:0,background:"var(--header)",backdropFilter:"blur(20px)",borderTop:`1px solid ${C.border}`,display:"flex"}}>{nav.map(it=><button key={it.id} onClick={()=>setTab(it.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 0 8px",background:"none",border:"none",color:tab===it.id?C.cyan:C.muted,fontSize:10,cursor:"pointer",position:"relative"}}><span style={{fontSize:19}}>{it.icon}</span><span>{it.label}</span></button>)}</nav>}
export function DrillBlock({icon,label,value,sub,color,onClick,pulse}){return <div onClick={onClick} style={{background:C.card,borderRadius:16,padding:"12px 14px",cursor:"pointer"}}><div style={{width:30,height:30,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><span style={{fontSize:15,animation:pulse?"tada .8s":"none"}}>{icon}</span></div><div style={{fontSize:19,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",color:C.text,letterSpacing:-0.3}}>{value}</div><div style={{fontSize:11,color:C.muted}}>{label}</div><div style={{fontSize:10,color}}>{sub}</div></div>}
export function OrbitCompass({data,size=320}){
  const cx=size/2,cy=size/2,radius=size*0.34;
  const max=Math.max(1,...data.map(d=>d.value));
  const avg=data.length?Math.round(data.reduce((s,d)=>s+d.value,0)/data.length/max*100):0;
  const weakest=data.reduce((a,b)=>b.value<a.value?b:a,data[0]||{value:0});
  return <div style={{position:"relative",width:size,height:size,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{position:"absolute",width:size*0.5,height:size*0.5,borderRadius:"50%",border:`1px solid ${C.border}`,animation:"spin 40s linear infinite"}}/>
    <div style={{position:"absolute",width:size*0.8,height:size*0.8,borderRadius:"50%",border:`1px solid ${C.border}`,animation:"spinRev 70s linear infinite"}}/>
    <div style={{position:"absolute",width:size,height:size,borderRadius:"50%",border:`1px solid ${C.border}`,animation:"spin 100s linear infinite"}}/>
    <div style={{position:"absolute",width:size*0.3,height:size*0.3,borderRadius:"50%",background:`radial-gradient(circle at 35% 30%, ${C.card2}, ${C.card} 70%)`,border:`1px solid ${C.border}`,boxShadow:`0 0 ${size*0.15}px var(--hi)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:3}}>
      <b style={{fontSize:9,letterSpacing:0.5,color:C.muted,fontWeight:500}}>БАЛАНС</b>
      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:size*0.068,color:C.text}}>{avg}%</span>
    </div>
    {data.map((d,i)=>{const angle=(i*(360/data.length)-90)*Math.PI/180;const x=cx+radius*Math.cos(angle),y=cy+radius*Math.sin(angle);const isWeak=d.id===weakest.id;const ns=size*0.115;return <div key={d.id||i}>
      <div style={{position:"absolute",left:x-ns/2,top:y-ns/2,width:ns,height:ns,borderRadius:"50%",background:isWeak?"linear-gradient(135deg,var(--amber),#e0863f)":C.card2,border:isWeak?"none":`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:ns*0.42,boxShadow:isWeak?`0 0 ${size*0.08}px color-mix(in srgb, var(--amber) 55%, transparent)`:"0 4px 12px rgba(0,0,0,.3)",zIndex:2}}>{d.icon}</div>
      <div style={{position:"absolute",left:x,top:y+ns*0.62,transform:"translateX(-50%)",fontSize:size*0.032,color:C.muted,whiteSpace:"nowrap",textAlign:"center"}}>{d.area}</div>
    </div>})}
  </div>;
}

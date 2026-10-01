// Objetos HMI/SCADA y controlador de zoom/pan/pinch para lienzos SVG.
import {ISA,ins} from './isa.js';
const C1='#36f0a0',OFF='#22313f',x=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
 f=(o,v)=>Math.max(0,Math.min(1,(v-o.min)/((o.max-o.min)||1))),u=(o,v)=>`${(+v).toFixed(o.type=='val'?1:0)} ${x(o.unit)}`;
// k: 'bit' (digital), 'an' (analógico), '' (sin variable); wr: puede escribir en el PLC en modo Ejecución
export const WID={
 lamp:{n:'Indicador luminoso',k:'bit',w:60,h:60,r:(o,v)=>`<circle cx="30" cy="22" r="16" fill="${v?C1:OFF}" stroke="var(--cy)" stroke-width="2"/><text x="30" y="56" text-anchor="middle">${x(o.label)}</text>`},
 motor:{n:'Motor / bomba',k:'bit',w:60,h:60,r:(o,v)=>`<circle cx="30" cy="22" r="18" fill="${v?C1:OFF}" stroke="var(--cy)" stroke-width="2"/><text x="30" y="28" text-anchor="middle" style="font-size:16px;fill:${v?'#04140d':'var(--tx)'}">M</text><text x="30" y="56" text-anchor="middle">${x(o.label)}</text>`},
 btn:{n:'Pulsador',k:'bit',wr:1,w:100,h:40,r:(o,v)=>`<rect width="100" height="36" rx="4" fill="${v?'#0c3a58':'#0a1a2b'}" stroke="var(--cy)" stroke-width="2"/><text x="50" y="22" text-anchor="middle">${x(o.label)}</text>`},
 sw:{n:'Interruptor',k:'bit',wr:1,w:70,h:50,r:(o,v)=>`<rect x="5" y="4" width="60" height="26" rx="13" fill="${v?'#0c3a58':OFF}" stroke="var(--cy)" stroke-width="2"/><circle cx="${v?52:18}" cy="17" r="10" fill="${v?C1:'#7f97ad'}"/><text x="35" y="46" text-anchor="middle">${x(o.label)}</text>`},
 val:{n:'Valor numérico',k:'an',w:120,h:46,r:(o,v)=>`<text y="10">${x(o.label)}</text><rect y="14" width="120" height="30" fill="#07111d" stroke="var(--cy)" stroke-width="2"/><text x="112" y="35" text-anchor="end" style="font-size:16px;fill:var(--am)">${u(o,v)}</text>`},
 bar:{n:'Barra',k:'an',w:60,h:150,r:(o,v)=>{const p=f(o,v);return `<rect x="10" y="4" width="30" height="120" fill="#07111d" stroke="var(--cy)" stroke-width="2"/><rect x="10" y="${124-120*p}" width="30" height="${120*p}" fill="#27e0ff88"/><text x="25" y="136" text-anchor="middle">${u(o,v)}</text><text x="25" y="147" text-anchor="middle">${x(o.label)}</text>`}},
 gauge:{n:'Medidor',k:'an',w:120,h:90,r:(o,v)=>{const a=Math.PI*(1-f(o,v));return `<path d="M10 60A50 50 0 0 1 110 60" fill="none" stroke="var(--cy)" stroke-width="3"/><line x1="60" y1="60" x2="${60+44*Math.cos(a)}" y2="${60-44*Math.sin(a)}" stroke="var(--am)" stroke-width="3"/><text x="60" y="74" text-anchor="middle">${u(o,v)}</text><text x="60" y="87" text-anchor="middle">${x(o.label)}</text>`}},
 tank:{n:'Tanque con nivel',k:'an',w:80,h:116,r:(o,v)=>{const p=f(o,v);return `<rect x="10" y="${100-90*p}" width="60" height="${90*p}" fill="#27e0ff66"/><path d="M10 10V100H70V10" fill="none" stroke="var(--cy)" stroke-width="3"/><text x="40" y="58" text-anchor="middle">${u(o,v)}</text><text x="40" y="113" text-anchor="middle">${x(o.label)}</text>`}},
 txt:{n:'Texto',k:'',w:120,h:20,r:o=>`<text y="14" style="font-size:14px">${x(o.label)}</text>`},
 sym:{n:'Símbolo ISA 5.1',k:'bit',w:60,h:70,r:(o,v)=>{const d=ISA[o.sym];return d?`<g fill="none" stroke="${v?C1:'var(--cy)'}" stroke-width="2">${d.inst?ins({tag:d.inst,loc:'F'}):d.s}</g><text x="30" y="68" text-anchor="middle">${x(o.label)}</text>`:''}}};
export function zoomer(svg,W,H,redraw){const vw={x:0,y:0,z:1},ptr=new Map();let pin=1,pan=null;
 const pt=(cx,cy)=>{const p=svg.createSVGPoint();p.x=cx;p.y=cy;return p.matrixTransform(svg.getScreenCTM().inverse())},
 apply=()=>svg.setAttribute('viewBox',`${vw.x} ${vw.y} ${W/vw.z} ${H/vw.z}`),
 zoom=(k,q)=>{const n=Math.max(.3,Math.min(4,vw.z*k)),w0=W/vw.z,w1=W/n;q=q||{x:vw.x+w0/2,y:vw.y+H/2/vw.z};vw.x=q.x-(q.x-vw.x)*(w1/w0);vw.y=q.y-(q.y-vw.y)*(w1/w0);vw.z=n;apply();redraw&&redraw()},
 d=()=>{const[a,b]=[...ptr.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])||1};
 svg.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size==2){pin=d();pan=null}else if(e.target===svg||e.target.classList.contains('bg'))pan={cx:e.clientX,cy:e.clientY,vx:vw.x,vy:vw.y}});
 svg.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId))return;ptr.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptr.size==2){const n=d(),[a,b]=[...ptr.values()];zoom(n/pin,pt((a[0]+b[0])/2,(a[1]+b[1])/2));pin=n}
  else if(pan){const k=(W/vw.z)/svg.getBoundingClientRect().width;vw.x=pan.vx-(e.clientX-pan.cx)*k;vw.y=pan.vy-(e.clientY-pan.cy)*k;apply()}});
 ['pointerup','pointercancel'].forEach(t=>addEventListener(t,e=>{ptr.delete(e.pointerId);pan=null}));
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15,pt(e.clientX,e.clientY))},{passive:false});
 return{vw,zoom,pt,n:()=>ptr.size,fit:()=>{vw.x=vw.y=0;vw.z=1;apply();redraw&&redraw()}}}

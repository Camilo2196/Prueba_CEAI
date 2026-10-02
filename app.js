import {PLCS,MODS,layout} from './js/hardware.js';
import {parse,run,acts,parseLadder,compile} from './js/compiler.js';
import {ISA,CATS,KINDS,LET1,LET2,ins} from './js/isa.js';
import {WID,zoomer} from './js/hmi.js';
import {newRT,rung,grafcet,power,tv} from './js/engine.js';
import {stParse,stCheck,stRun,ilParse,ilCheck,ilRun,toST,toIL} from './js/text.js';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
let model='S7-1200 CPU 1215C AC/DC/RLY',extra=[],HW=layout(model,extra),plc={st:'STOP',loaded:null},act=0,gT=0,level=30,M={},sel=null,selL=null,cres=null,edited=0,evs=[],G=[],P=[],LN=[],uid=1,rt=newRT(),VT=[],lsel=null,V={tag:1,addr:1,desc:0,type:0},dmode=0;
const get=a=>a=='T'?gT:(M[a]||0),set=(a,v)=>{M[a]=v},addrs=k=>HW.A[k],hwKey=()=>model+'|'+extra.join(),mode=()=>$('#mode').value;
const reset=()=>{M={};act=0;gT=0;level=30;rt=newRT()};
const log=(s,m)=>{evs.unshift({t:new Date().toLocaleTimeString('es-CO'),s,m});renderDiag()};
/* ---------- Curso ---------- */
const CARDS=[
 ['Clase 1 · Introducción','Del proceso industrial a la automatización: la pirámide de niveles 0 a 4 y el paso de la lógica cableada a la programada.',['Dinámica, variables y perturbaciones','Objetivos: calidad, productividad, flexibilidad'],'plc'],
 ['Clase 2 · Arquitectura de PLC','CPU, memoria, fuente y módulos de entradas y salidas, digitales o analógicas. Compactos frente a modulares.',['Salidas a relé y a transistor','Gama por número de E/S'],'plc'],
 ['Clase 3 · Ladder (LD)','Lenguaje gráfico de contactos NA y NC, bobinas OUT, SET y RESET, ordenado por peldaños (IEC 61131-3).',['Arranque directo de motor','Inversión de giro y estrella-triángulo'],'ladder'],
 ['Clase 4 · GRAFCET','Modelo secuencial con etapas, transiciones, receptividades y acciones, con saltos y ramas paralelas.',['Etapa inicial, normal, fuente y sumidero','Acciones condicionales, set y reset'],'grafcet'],
 ['Clase 5 · HMI y SCADA','La HMI supervisa el proceso en tiempo real; el SCADA adquiere, registra y controla la planta completa.',['Ejemplos en CodeSys y TIA Portal'],'proceso'],
 ['Clase 6 · Subrutinas','Bloques FC sin memoria propia y FB con DB de instancia para encapsular código reutilizable.',['Variables Input, Output, InOut, Temp, Static'],'ladder']];
$('#cards').innerHTML=CARDS.map(c=>`<article class="card"><h3>${c[0]}</h3><p>${c[1]}</p><ul>${c[2].map(x=>`<li>${x}</li>`).join('')}</ul><button data-go="${c[3]}">Abrir simulador</button></article>`).join('');
/* ---------- Navegación ---------- */
function go(t){$$('section').forEach(s=>s.classList.toggle('act',s.id==t));$$('#tree button').forEach(b=>b.classList.toggle('act',b.dataset.t==t));location.hash=t;refresh()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-t],[data-go]');if(b)go(b.dataset.t||b.dataset.go)});
/* ---------- PLC, hardware, compilación y estados ---------- */
$('#model').innerHTML=Object.keys(PLCS).map(k=>`<option ${k==model?'selected':''}>${k}</option>`).join('');
const v4=s=>/^(\d{1,3}\.){3}\d{1,3}$/.test(s)&&s.split('.').every(n=>+n<=255),n32=s=>s.split('.').reduce((a,b)=>a*256+ +b,0);
function chkIP(){const ip=$('#ip').value.trim(),mk=$('#mask').value.trim(),gw=$('#gw').value.trim(),m=$('#ipmsg');let e='';
 if(!v4(ip))e='La IP no es válida (formato 0-255.0-255.0-255.0-255).';
 else if(!v4(mk)||((~n32(mk))>>>0&(((~n32(mk))>>>0)+1))!==0)e='La máscara debe ser contigua, por ejemplo 255.255.255.0.';
 else if(!v4(gw))e='La puerta de enlace no es válida.';
 else if((n32(ip)&n32(mk))!==(n32(gw)&n32(mk)))e='La puerta de enlace está fuera de la subred del PLC.';
 else if(((n32(ip)&~n32(mk))>>>0)===0||((n32(ip)|n32(mk))>>>0)===0xFFFFFFFF)e='La IP coincide con la dirección de red o de difusión.';
 m.className=e?'err':'ok';m.textContent=e||'Parámetros de red válidos.';return !e}
function setModel(){const p=PLCS[model];HW=layout(model,extra);
 $('#spec').textContent=`${p.brand} · ${p.fam} · memoria ${p.mem} · ${HW.A.DI.length} DI · ${HW.A.DO.length} DO · ${HW.A.AI.length} AI · ${HW.A.AO.length} AO`;
 $('#addm').innerHTML=Object.keys(MODS).map(k=>`<option>${k}</option>`).join('');$('#addb').disabled=$('#delm').disabled=!p.slots;
 $('#mt').innerHTML='<tr><th>Slot</th><th>Módulo</th><th>Direcciones</th></tr>'+HW.rows.map(r=>`<tr><td>${r.slot}</td><td>${r.n}</td><td>${r.rng.join(' &nbsp; ')}</td></tr>`).join('');
 $('#adl').innerHTML=[...HW.all].map(a=>`<option value="${a}">`).join('');dev();buildIO();
 if(plc.loaded&&plc.loaded.key!=hwKey()){log('err','La configuración de hardware cambió después de cargar el programa. Compile y cargue de nuevo.');setSt('ERROR')}}
$('#model').onchange=e=>{model=e.target.value;extra=[];const p=PLCS[model];$('#ip').value=p.ip;$('#gw').value=p.ip.replace(/\d+$/,'254');chkIP();setModel();if(!edited)sample()};
$('#addb').onclick=()=>{if(extra.length<PLCS[model].slots){extra.push($('#addm').value);setModel()}};
$('#delm').onclick=()=>{extra.pop();setModel()};
['#ip','#mask','#gw'].forEach(i=>$(i).oninput=()=>{chkIP();dev()});
function dev(){const s=plc.st,led=(y,c,on,t)=>`<circle cx="20" cy="${y}" r="5" fill="${on?c:'#22313f'}"/><text x="29" y="${y+3}">${t}</text>`,w=140+HW.rows.length*92;
 $('#dev').innerHTML=`<svg viewBox="0 0 ${w} 210" width="${w}"><rect class="gs" x="8" y="20" width="110" height="170"/><text x="16" y="40" style="font-size:11px">${model.split(' ').slice(0,3).join(' ')}</text><text x="16" y="56">${$('#ip').value}</text>`+
 led(80,'#36f0a0',s=='RUN','RUN')+led(100,'#ffb224',s=='STOP','STOP')+led(120,'#ff5470',s=='ERROR','ERROR')+led(140,'#ffd24a',s=='MNT','MAINT')+
 HW.rows.map((r,i)=>`<g transform="translate(${128+i*92},20)"><rect class="gs" width="84" height="170"/><text x="6" y="16" style="font-size:11px">${r.slot}</text><text x="6" y="32" style="font-size:8px">${r.n.slice(0,16)}</text>${r.rng.map((t,j)=>`<text x="6" y="${56+j*26}" style="font-size:9px;fill:#27e0ff">${t.split(' ')[0]}</text><text x="6" y="${67+j*26}" style="font-size:7px">${t.split(' ')[1]}</text>`).join('')}</g>`).join('')+'</svg>'}
function buildIO(){const g=(t,l)=>`<h3>${t}</h3><div class="ios">${l||'<span class="mut">Sin canales</span>'}</div>`;
 $('#io').innerHTML=g('Entradas digitales',addrs('DI').map(a=>`<button class="di" data-a="${a}"></button>`).join(''))+g('Salidas digitales',addrs('DO').map(a=>`<span class="do" data-a="${a}"></span>`).join(''))+
 g('Entradas analógicas',addrs('AI').map(a=>`<label class="ai">${a}<input type="range" data-a="${a}" min="0" max="100"><output></output></label>`).join(''))+g('Salidas analógicas',addrs('AO').map(a=>`<span class="aq" data-a="${a}"><i></i>${a}</span>`).join(''));refreshIO()}
function refreshIO(){$$('#io .di,#io .do').forEach(b=>{const v=get(b.dataset.a);b.classList.toggle('on',!!v);b.textContent=`${b.dataset.a}  ${v?'ON':'OFF'}`});
 $$('#io input').forEach(i=>{if(document.activeElement!==i)i.value=get(i.dataset.a);i.nextElementSibling.textContent=Math.round(get(i.dataset.a))});
 $$('#io .aq').forEach(b=>{$('i',b).style.width=get(b.dataset.a)+'%'})}
$('#io').addEventListener('click',e=>{const b=e.target.closest('.di');if(b){set(b.dataset.a,get(b.dataset.a)^1);refresh()}});
$('#io').addEventListener('input',e=>{if(e.target.dataset.a){set(e.target.dataset.a,+e.target.value);refresh()}});
const ST={RUN:['PLC: RUN','Programa ejecutándose'],STOP:['PLC: STOP','Programa detenido'],ERROR:['PLC: ERROR','Revise diagnóstico'],MNT:['PLC: MANTENIMIENTO','Salidas inhibidas']};
function setSt(s){plc.st=s;$('#badge').className='st '+s;$('#badge').innerHTML=`<b>${ST[s][0]}</b><small>${ST[s][1]}</small>`;
 if(s!='RUN')HW.A.DO.concat(HW.A.AO).forEach(a=>{M[a]=0});log(s=='ERROR'?'err':'info',ST[s][0]+' · '+ST[s][1]);refresh()}
$('#bRun').onclick=()=>{if(!plc.loaded){log('warn','Programa no cargado. Compile y cargue el programa antes de pasar a RUN.');return dockTo('diag')}
 if(plc.loaded.key!=hwKey()){log('err','El hardware configurado no coincide con el programa cargado.');return setSt('ERROR')}act=0;gT=0;rt=newRT();setSt('RUN')};
$('#bStop').onclick=()=>setSt('STOP');$('#bMnt').onclick=()=>setSt('MNT');
const sig=()=>JSON.stringify([$('#ltxt').value,G,model,extra,mode(),P.map(o=>[o.tag,o.bind]),VT,$('#ttxt').value,$('#tlang').value]);
const snap=()=>({key:hwKey(),mode:mode(),rungs:parseLadder(rs($('#ltxt').value)).filter(r=>!r.e),g:G.map(s=>({a:rs(s.a),c:rs(s.c),n:s.n}))});
$('#compile').onclick=()=>{const r=compile({ladder:rs($('#ltxt').value),g:G.map(s=>({a:rs(s.a),c:rs(s.c),n:s.n})),HW,ip:chkIP()?'':$('#ipmsg').textContent,mode:mode(),pid:P.map(o=>({tag:o.tag,bind:o.bind,io:o.io})),vt:VT,hmi:H.flatMap(s=>s.items).map(o=>({tag:o.label,bind:o.bind})).concat(AL.map(a=>({tag:'Alarma: '+a.msg,bind:a.addr})))});
 txCompile(r);r.sig=sig();cres=r;renderCmp();dockTo('cmp');log(r.err?'err':'ok',r.err?`Error de compilación (${r.err} errores)`:'Compilación correcta')};
$('#load').onclick=()=>{
 if(!cres){log('warn','Compile el programa antes de cargarlo al PLC.');return dockTo('diag')}
 if(cres.err){log('err','No se puede cargar el programa. Corrija primero los errores de compilación.');return dockTo('diag')}
 if(cres.sig!=sig()){log('warn','El programa cambió desde la última compilación. Compile de nuevo.');return dockTo('diag')}
 if(plc.st=='RUN')setSt('STOP');
 const s=snap();s.gp=s.g.map(x=>{try{return parse(x.c)}catch(_){return null}});{const lg=$('#tlang').value,src=rs($('#ttxt').value);s.txt=lg=='off'?null:{lg,p:lg=='ST'?stParse(src):ilParse(src).prog}}plc.loaded=s;act=0;gT=0;rt=newRT();setSt('STOP');
 log('ok','Programa cargado en '+model+'. PLC listo para RUN.');dockTo('diag')};
function renderCmp(){const r=cres,el=$('#cmp');if(!r){el.innerHTML='<p class="mut">Aún no se ha compilado.</p>';return}
 $('#ncmp').textContent=r.err?`(${r.err})`:'';
 el.innerHTML=(r.err?`<p class="err"><b>✕ Error de compilación</b><br>${r.err} errores · ${r.warn} advertencias</p>`:`<p class="okc"><b>✓ Compilación correcta</b><br>${r.err} errores<br>${r.warn} advertencias</p>`)+
 r.list.map(x=>`<div class="m ${x.sev}"${x.line!=null||['P&ID','HMI','Variables','ST','IL'].includes(x.where)?` data-g="${x.where.startsWith('Network')?'ladder':({'P&ID':'proceso',HMI:'hmi',Variables:'vars',ST:'texto',IL:'texto'})[x.where]||'grafcet'}" data-line="${x.line??''}"`:x.where.startsWith('Etapa')?' data-g="grafcet"':''}><b>${{err:'Error',warn:'Advertencia',info:'Información'}[x.sev]}</b> ${x.where} · Elemento: ${x.el} · Descripción: ${x.msg}</div>`).join('')}
$('#cmp').onclick=e=>{const m=e.target.closest('.m[data-g]');if(!m)return;go(m.dataset.g);
 if(m.dataset.line!==''&&(m.dataset.g=='ladder'||m.dataset.g=='texto')){const ta=m.dataset.g=='texto'?$('#ttxt'):$('#ltxt'),ls=ta.value.split('\n'),i=+m.dataset.line,s=ls.slice(0,i).join('\n').length+(i?1:0);ta.focus();ta.setSelectionRange(s,s+(ls[i]||'').length)}};
function dockTo(d){$$('#dock .dp').forEach(x=>x.classList.toggle('act',x.id==d));$$('#dock [data-d]').forEach(b=>b.classList.toggle('act',b.dataset.d==d))}
$('#dock').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b)dockTo(b.dataset.d)});
function renderDiag(){$('#diag').innerHTML=evs.length?evs.map(x=>`<div class="m ${x.s}"><b>${x.t}</b> ${x.m}</div>`).join(''):'<p class="mut">Sin eventos en esta sesión.</p>'}
/* ---------- Planta · P&ID (ISA 5.1) con conexiones libres ---------- */
let tool='sel',from=null,vw={x:0,y:0,z:1},drag=null;
const cv=$('#cv'),SV=o=>o.type=='inst'?ins(o):o.type=='img'?`<image href="${o.href}" width="60" height="60" preserveAspectRatio="xMidYMid meet"/>`:ISA[o.type].s,isV=o=>ISA[o.type]&&ISA[o.type].c=='Válvulas'&&o.type!='check',man=o=>o.bind&&o.io=='DI'&&(o.type=='pb'||/^HS/.test(o.tag));
const add=(type,x,y,tag,bind='',o={})=>{const d=ISA[type]||{},it={id:uid++,type,x,y,tag,bind,r:0,sz:1.6,io:d.io||'',loc:'F',...o};P.push(it);return it};
const ctr=o=>[o.x+30*o.sz,o.y+30*o.sz],cen=ep=>ep.id?ctr(P.find(q=>q.id==ep.id)):[ep.x,ep.y];
const anc=(ep,to)=>{if(!ep.id)return[ep.x,ep.y];const o=P.find(q=>q.id==ep.id),s=30*o.sz,c=ctr(o);return[[c[0],o.y],[c[0],o.y+2*s],[o.x,c[1]],[o.x+2*s,c[1]]].sort((a,b)=>Math.hypot(a[0]-to[0],a[1]-to[1])-Math.hypot(b[0]-to[0],b[1]-to[1]))[0]};
const pts=l=>{const a=anc(l.a,cen(l.b)),b=anc(l.b,cen(l.a));return Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?[a,[b[0],a[1]],b]:[a,[a[0],b[1]],b]};
const libHTML=()=>CATS.map(c=>`<details open><summary>${c}</summary><div class="lg">${Object.entries(ISA).filter(([k,d])=>d.c==c).map(([k,d])=>`<button draggable="true" data-add="${k}" title="${d.n}"><svg viewBox="0 0 60 60">${d.inst?ins({tag:d.inst,loc:'F'}):d.s}</svg><span>${d.n}</span></button>`).join('')}</div></details>`).join('');
$('#lk').innerHTML=Object.entries(KINDS).map(([k,v])=>`<option value="${k}">${v[0]}</option>`).join('');
function drawCV(){cv.setAttribute('viewBox',`${vw.x} ${vw.y} ${900/vw.z} ${420/vw.z}`);$('#zp').textContent=Math.round(vw.z*100)+'%';
 cv.innerHTML=LN.map(l=>{const k=KINDS[l.k],p=pts(l).map(q=>q.join(',')).join(' ');return `<polyline class="ln${l===selL?' sel':''}" points="${p}" stroke="${k[1]}" stroke-width="${k[2]}" stroke-dasharray="${k[3]}" fill="none"/><polyline data-l="${l.id}" points="${p}" stroke="transparent" stroke-width="14" fill="none" style="cursor:pointer"/>`}).join('')+
 P.map(o=>{const s=o.sz,c=30*s;return `<g class="it${o===sel?' sel':''}${o.bind&&get(o.bind)&&(o.io=='DO'||o.type=='img')?' on':''}" data-id="${o.id}"><g class="s" transform="translate(${o.x},${o.y}) rotate(${o.r} ${c} ${c}) scale(${s})">${o.type=='tank'?`<rect class="liq" x="16" y="${46-level*.36}" width="28" height="${level*.36}"/>`:''}${SV(o)}</g>${lab(o).map((l,k)=>`<text class="tag" x="${o.x+c}" y="${o.y+2*c+10+k*10}" text-anchor="middle">${l}</text>`).join('')}</g>`}).join('')}
const pt=e=>{const p=cv.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(cv.getScreenCTM().inverse())};
function setTool(t){tool=t;from=null;$('#tsel').classList.toggle('on',t=='sel');$('#tlin').classList.toggle('on',t=='line');cv.style.cursor=t=='line'?'crosshair':'default'}
$('#tsel').onclick=()=>setTool('sel');$('#tlin').onclick=()=>setTool('line');
addEventListener('keydown',e=>{if(e.key=='Escape'){from=null;setTool('sel')}});
cv.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size>1){drag=null;pin=pd();return}const q=pt(e),g=e.target.closest('.it'),ln=e.target.dataset.l;
 if(tool=='line'){const ep=g?{id:+g.dataset.id}:{x:Math.round(q.x/10)*10,y:Math.round(q.y/10)*10};
  if(!from)from=ep;else if(!(ep.id&&ep.id==from.id)){LN.push({id:uid++,a:from,b:ep,k:$('#lk').value});edited=1;from=ep}return drawCV()}
 if(ln){selL=LN.find(l=>l.id==ln);sel=null;insp();return drawCV()}
 if(g){sel=P.find(o=>o.id==g.dataset.id);selL=null;drag={m:1,dx:q.x-sel.x,dy:q.y-sel.y};if(man(sel))set(sel.bind,1)}
 else{sel=selL=null;drag={cx:e.clientX,cy:e.clientY,vx:vw.x,vy:vw.y}}
 insp();refresh()});
cv.addEventListener('pointermove',e=>{if(ptr.has(e.pointerId))ptr.set(e.pointerId,[e.clientX,e.clientY]);if(ptr.size==2){const d=pd(),m=mid();zoom(d/pin,pt({clientX:m[0],clientY:m[1]}));pin=d;return}if(!drag)return;if(drag.m){const q=pt(e);sel.x=q.x-drag.dx;sel.y=q.y-drag.dy;edited=1}
 else{const k=(900/vw.z)/cv.getBoundingClientRect().width;vw.x=drag.vx-(e.clientX-drag.cx)*k;vw.y=drag.vy-(e.clientY-drag.cy)*k}drawCV()});
['pointerup','pointercancel'].forEach(t=>addEventListener(t,e=>{ptr.delete(e.pointerId);if(!drag)return;if(drag.m&&sel&&man(sel))set(sel.bind,0);drag=null;refresh()}));
function zoom(f,q){const n=cl(vw.z*f,.3,4),w0=900/vw.z,w1=900/n;q=q||{x:vw.x+w0/2,y:vw.y+210/vw.z};vw.x=q.x-(q.x-vw.x)*(w1/w0);vw.y=q.y-(q.y-vw.y)*(w1/w0);vw.z=n;drawCV()}
cv.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.15:1/1.15,pt(e))},{passive:false});
$('#zin').onclick=()=>zoom(1.25);$('#zout').onclick=()=>zoom(.8);$('#zfit').onclick=()=>{vw={x:0,y:0,z:1};drawCV()};
function place(k,x,y){const d=ISA[k];sel=d.inst?add('inst',x,y,d.inst+'-'+(100+uid),'',{io:d.io}):add(k,x,y,d.p+'-'+(100+uid));selL=null;edited=1;insp();drawCV()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;place(b.dataset.add,80+(uid%8)*40,60+(uid%5)*30);if($('section.act').id!='proceso')go('proceso')});
document.addEventListener('dragstart',e=>{const b=e.target.closest&&e.target.closest('[data-add]');if(b)e.dataTransfer.setData('text',b.dataset.add)});
cv.addEventListener('dragover',e=>e.preventDefault());
cv.addEventListener('drop',e=>{e.preventDefault();const k=e.dataTransfer.getData('text');if(ISA[k]){const q=pt(e);place(k,q.x-48,q.y-48)}});
$('#q').oninput=e=>{const v=e.target.value.toLowerCase();$$('#libp [data-add]').forEach(b=>{b.hidden=!b.title.toLowerCase().includes(v)})};
function insp(){const o=sel,l=selL,el=$('#insp');tagTable();
 if(l){el.innerHTML=`<h3>Línea</h3><label>Tipo<select id="lk2">${Object.entries(KINDS).map(([k,v])=>`<option value="${k}" ${k==l.k?'selected':''}>${v[0]}</option>`).join('')}</select></label><button id="idel">Eliminar</button>`;
  $('#lk2').onchange=e=>{l.k=e.target.value;drawCV()};$('#idel').onclick=()=>{LN=LN.filter(x=>x!==l);selL=null;insp();drawCV()};return}
 if(!o){el.innerHTML='<p class="mut">Seleccione un símbolo o una línea. Con la herramienta Línea, haga clic en un elemento o en un punto libre del lienzo; cada clic continúa la línea y Esc termina.</p>';return}
 const opts=o.io?['<option value="">Sin asignar</option>'].concat(addrs(o.io).map(a=>`<option ${a==o.bind?'selected':''}>${a}</option>`)):[];
 el.innerHTML=`<h3>${o.type=='inst'?'Instrumento ISA 5.1':ISA[o.type].n}</h3><label>TAG<input id="itag" value="${o.tag}"></label><label>Descripción<input id="idesc" value="${qe(o.desc||'')}"></label><p class="mut">Tipo: ${IOT[o.io]||'Sin E/S'}. Estado: ${o.bind?(o.io=='AI'||o.io=='AO'?Math.round(get(o.bind))+' %':get(o.bind)?'ON':'OFF'):'—'}</p>`+
 (o.type=='inst'?`<label>Ubicación<select id="iloc">${[['F','Campo'],['P','Panel local'],['D','DCS / SCADA'],['C','PLC']].map(([k,v])=>`<option value="${k}" ${k==o.loc?'selected':''}>${v}</option>`).join('')}</select></label>`:'')+
 (o.type=='img'?`<label>Tipo de variable<select id="iio">${['','DI','DO','AI','AO'].map(k=>`<option value="${k}" ${k==o.io?'selected':''}>${k||'Sin variable'}</option>`).join('')}</select></label>`:'')+(o.io?`<label>Dirección en el PLC (${o.io})<select id="ibind">${opts.join('')}</select></label>`:'<p class="mut">Sin E/S asociada.</p>')+
 `<label><input type="checkbox" id="ivt" ${(o.vt??V.tag)?'checked':''}> Mostrar TAG</label><label><input type="checkbox" id="iva" ${(o.va??V.addr)?'checked':''}> Mostrar dirección</label><label>Rotación<select id="irot">${[0,90,180,270].map(r=>`<option ${r==o.r?'selected':''}>${r}</option>`).join('')}</select></label><label>Tamaño<input id="isz" type="range" min="0.8" max="3" step="0.2" value="${o.sz}"></label><button id="idup">Duplicar</button> <button id="idel">Eliminar</button>`;
 $('#itag').oninput=e=>{o.tag=e.target.value;drawCV();tagTable()};if(o.type=='inst')$('#iloc').onchange=e=>{o.loc=e.target.value;drawCV()};
 if(o.io)$('#ibind').onchange=e=>{o.bind=e.target.value;drawCV();tagTable()};if(o.type=='img')$('#iio').onchange=e=>{o.io=e.target.value;o.bind='';insp();drawCV()};
 $('#irot').onchange=e=>{o.r=+e.target.value;drawCV()};$('#idesc').oninput=e=>{o.desc=e.target.value;drawCV()};$('#ivt').onchange=e=>{o.vt=e.target.checked;drawCV()};$('#iva').onchange=e=>{o.va=e.target.checked;drawCV()};$('#isz').oninput=e=>{o.sz=+e.target.value;drawCV()};
 $('#idup').onclick=()=>{sel=add(o.type,o.x+30,o.y+30,o.tag,'',{io:o.io,loc:o.loc,r:o.r,sz:o.sz});edited=1;insp();drawCV()};
 $('#idel').onclick=()=>{P=P.filter(x=>x!==o);LN=LN.filter(l=>l.a.id!=o.id&&l.b.id!=o.id);sel=null;edited=1;insp();drawCV()}}
function demo(){P=[];LN=[];uid=1;const D=HW.A.DI,O=HW.A.DO,I=HW.A.AI;
 const tk=add('tank',350,110,'TK-101'),pu=add('pump',110,250,'P-101',O[0]),vv=add('globe',590,250,'V-101',O[1]);
 add('inst',500,50,'LSH-101',D[1],{io:'DI'});add('inst',500,190,'LSL-101',D[2],{io:'DI'});add('inst',230,110,'LT-101',I[0]||'',{io:'AI'});
 add('pb',30,30,'HS-101',D[0]);add('lamp',150,30,'XL-101',O[2]);
 LN.push({id:uid++,a:{id:pu.id},b:{id:tk.id},k:'p'},{id:uid++,a:{id:tk.id},b:{id:vv.id},k:'p'})}
/* ---------- Pinch, importación de gráficos y lista de TAG ---------- */
ISA.img={n:'Gráfico importado',c:'Importado',p:'IMG',s:'',io:''};
const ptr=new Map();let pin=1;
const pd=()=>{const[a,b]=[...ptr.values()];return Math.hypot(a[0]-b[0],a[1]-b[1])||1},mid=()=>{const[a,b]=[...ptr.values()];return[(a[0]+b[0])/2,(a[1]+b[1])/2]};
$('#impb').onclick=()=>$('#imp').click();
$('#imp').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 if(!/^image\/(svg\+xml|png|jpeg|webp)$/.test(f.type)||f.size>2e6){log('warn','Gráfico no válido. Use SVG, PNG, JPG o WebP de máximo 2 MB.');return dockTo('diag')}
 const r=new FileReader();r.onload=()=>{sel=add('img',120+(uid%6)*30,80+(uid%5)*30,'IMG-'+(100+uid),'',{href:r.result,io:''});selL=null;edited=1;insp();drawCV();log('ok','Gráfico importado: '+f.name)};r.readAsDataURL(f)};
function tagTable(){const cnt={};P.forEach(o=>{if(o.bind)cnt[o.bind]=(cnt[o.bind]||0)+1});
 $('#tagt').innerHTML='<tr><th>TAG</th><th>Elemento</th><th>E/S</th><th>Dirección</th></tr>'+P.map(o=>`<tr><td>${o.tag}</td><td>${o.type=='inst'?'Instrumento ISA 5.1':ISA[o.type].n}</td><td>${o.io||'—'}</td><td>${o.io?`<select data-id="${o.id}" class="${cnt[o.bind]>1?'dup':''}"><option value="">Sin asignar</option>${addrs(o.io).map(a=>`<option ${a==o.bind?'selected':''}>${a}</option>`).join('')}</select>`:'—'}</td></tr>`).join('')}
$('#tagt').addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;const o=P.find(x=>x.id==s.dataset.id);o.bind=s.value;edited=1;insp();drawCV()});
/* ---------- HMI / SCADA ---------- */
let H=[],hs=0,AL=[],alst={},alh=[],alch=1,hrun=0,hsel=null,hdrag=null,hpress=null,TR=['','','',''],trd=[[],[],[],[]],tick=0,hid=1;
const hz=zoomer($('#hcv'),900,420,()=>{$('#hzp').textContent=Math.round(hz.vw.z*100)+'%'}),cur=()=>H[hs],qe=s=>String(s).replace(/"/g,'&quot;'),
 opts=o=>{const w=WID[o.type];return w.k=='an'?[...addrs('AI'),...addrs('AO')]:w.k=='bit'?(w.wr?[...addrs('DI'),...addrs('M')]:[...addrs('DI'),...addrs('DO'),...addrs('M')]):[]};
$('#hpal').innerHTML=Object.entries(WID).filter(([k])=>k!='sym').map(([k,w])=>`<button data-hw="${k}">${w.n}</button>`).join('');
$('#hsym').innerHTML=Object.entries(ISA).filter(([k,d])=>CATS.includes(d.c)).map(([k,d])=>`<option value="${k}">${d.n}</option>`).join('');
const hadd=(type,o={})=>{const w=WID[type],it={id:hid++,type,x:60+(hid%6)*40,y:50+(hid%5)*30,s:1,label:w.n,bind:'',min:0,max:100,unit:w.k=='an'?'%':'',sym:'',...o};cur().items.push(it);return it};
function drawH(){const s=cur();if(!s)return;const act=new Set(AL.filter(a=>alst[a.id]&&alst[a.id].act).map(a=>a.addr));
 $('#hcv').innerHTML='<rect class="bg" x="-2000" y="-2000" width="5000" height="5000" fill="transparent"/>'+s.items.map(o=>{const w=WID[o.type],v=o.bind?get(o.bind):0,box=(c,d)=>`<rect x="-4" y="-4" width="${w.w+8}" height="${w.h+8}" fill="none" stroke="${c}" stroke-dasharray="${d}"/>`;
  return `<g class="hi" data-id="${o.id}" transform="translate(${o.x},${o.y}) scale(${o.s})">${o.bind&&act.has(o.bind)?box('var(--rd)','4 3'):''}${o===hsel&&!hrun?box('var(--am)','2 2'):''}${w.r(o,v)}<rect width="${w.w}" height="${w.h}" fill="transparent"/></g>`}).join('');
 const A=AL.filter(a=>alst[a.id]&&alst[a.id].act),un=A.some(a=>!alst[a.id].ack),b=$('#albn');
 b.className='bn'+(A.length?' on':'')+(un?' blink':'');b.textContent=A.length?`ALARMA: ${A.length} activa(s). ${A.map(a=>a.msg).join(' | ')}`:'Sin alarmas activas'}
const hcv=$('#hcv');
hcv.addEventListener('pointerdown',e=>{if(hz.n()>1)return;const g=e.target.closest('.hi');
 if(!g){hsel=null;hinsp();drawH();return}
 const o=cur().items.find(q=>q.id==g.dataset.id);
 if(hrun){if(WID[o.type].wr&&o.bind){if(o.type=='btn'){set(o.bind,1);hpress=o}else set(o.bind,get(o.bind)^1);refresh()}return}
 hsel=o;const q=hz.pt(e.clientX,e.clientY);hdrag={dx:q.x-o.x,dy:q.y-o.y};hinsp();drawH()});
hcv.addEventListener('pointermove',e=>{if(!hdrag||hz.n()>1)return;const q=hz.pt(e.clientX,e.clientY);hsel.x=q.x-hdrag.dx;hsel.y=q.y-hdrag.dy;edited=1;drawH()});
addEventListener('pointerup',()=>{hdrag=null;if(hpress){set(hpress.bind,0);hpress=null;refresh()}});
function hinsp(){const o=hsel,el=$('#hinsp');if(!o){el.innerHTML='<p class="mut">Seleccione un objeto. En modo Ejecución, los pulsadores e interruptores escriben en el PLC virtual.</p>';return}
 const w=WID[o.type];
 el.innerHTML=`<h3>${w.n}</h3><label>Texto<input id="hl" value="${qe(o.label)}"></label>`+(w.k?`<label>Variable (${w.k=='an'?'analógica':'digital'})<select id="hb"><option value="">Sin asignar</option>${opts(o).map(a=>`<option ${a==o.bind?'selected':''}>${a}</option>`).join('')}</select></label>`:'')+
 (w.k=='an'?`<label>Mínimo<input id="hmin" type="number" value="${o.min}"></label><label>Máximo<input id="hmax" type="number" value="${o.max}"></label><label>Unidad<input id="hu" value="${qe(o.unit)}"></label>`:'')+
 `<label>Tamaño<input id="hs2" type="range" min="0.6" max="3" step="0.2" value="${o.s}"></label><button id="hdup">Duplicar</button> <button id="hdel">Eliminar</button>`;
 $('#hl').oninput=e=>{o.label=e.target.value;drawH()};
 if(w.k)$('#hb').onchange=e=>{o.bind=e.target.value;edited=1;drawH()};
 if(w.k=='an'){$('#hmin').oninput=e=>{o.min=+e.target.value;drawH()};$('#hmax').oninput=e=>{o.max=+e.target.value;drawH()};$('#hu').oninput=e=>{o.unit=e.target.value;drawH()}}
 $('#hs2').oninput=e=>{o.s=+e.target.value;drawH()};
 $('#hdup').onclick=()=>{const c=hadd(o.type,{label:o.label,bind:o.bind,min:o.min,max:o.max,unit:o.unit,sym:o.sym,s:o.s});c.x=o.x+30;c.y=o.y+30;hsel=c;edited=1;hinsp();drawH()};
 $('#hdel').onclick=()=>{cur().items=cur().items.filter(q=>q!==o);hsel=null;edited=1;hinsp();drawH()}}
function hscr(){$('#hscr').innerHTML=H.map((s,i)=>`<option value="${i}" ${i==hs?'selected':''}>${s.name}</option>`).join('')}
$('#hscr').onchange=e=>{hs=+e.target.value;hsel=null;hinsp();drawH()};
$('#hsnew').onclick=()=>{H.push({name:'Pantalla '+(H.length+1),items:[]});hs=H.length-1;hsel=null;edited=1;hscr();hinsp();drawH()};
$('#hsren').onclick=()=>{const n=prompt('Nombre de la pantalla',cur().name);if(n){cur().name=n.slice(0,30);hscr()}};
$('#hsdel').onclick=()=>{if(H.length<2)return;H.splice(hs,1);hs=0;hsel=null;edited=1;hscr();hinsp();drawH()};
$('#hmode').onclick=()=>{hrun=!hrun;hsel=null;$('#hmode').textContent='Modo: '+(hrun?'Ejecución':'Edición');hinsp();drawH()};
$('#hpal').onclick=e=>{const b=e.target.closest('[data-hw]');if(b){hsel=hadd(b.dataset.hw);edited=1;hinsp();drawH()}};
$('#hsadd').onclick=()=>{const k=$('#hsym').value,d=ISA[k];hsel=hadd('sym',{sym:k,label:d.inst||d.n.slice(0,16)});edited=1;hinsp();drawH()};
$('#hzin').onclick=()=>hz.zoom(1.25);$('#hzout').onclick=()=>hz.zoom(.8);$('#hzfit').onclick=hz.fit;
/* alarmas */
function alarms(){const t=new Date().toLocaleTimeString('es-CO');AL.forEach(a=>{const v=get(a.addr),on=a.op=='>='?v>=a.lim:a.op=='<='?v<=a.lim:v==a.lim,s=alst[a.id];
 if(on&&!(s&&s.act)){alst[a.id]={act:1,ack:0};alh.unshift(`${t} · ALARMA ${a.pri}: ${a.msg} (${a.addr})`);log('warn','Alarma HMI ('+a.pri+'): '+a.msg);alch=1}
 else if(!on&&s&&s.act){s.act=0;alh.unshift(`${t} · Normalizada: ${a.msg}`);alch=1}});if(alh.length>30)alh.length=30}
function alPanel(){const A=AL.filter(a=>alst[a.id]&&alst[a.id].act);
 $('#alp').innerHTML=(A.length?A.map(a=>`<div class="m err"><b>${a.pri}</b> ${a.msg} (${a.addr}) ${alst[a.id].ack?'<span class="mut">reconocida</span>':`<button data-ack="${a.id}">Reconocer</button>`}</div>`).join(''):'<p class="mut">Sin alarmas activas.</p>')+'<h3>Historial</h3>'+(alh.map(q=>`<div class="m info">${q}</div>`).join('')||'<p class="mut">Sin eventos.</p>');alch=0}
$('#alp').addEventListener('click',e=>{const k=e.target.dataset.ack;if(k){alst[k].ack=1;alPanel();drawH()}});
function alTable(){const ad=[...addrs('AI'),...addrs('AO'),...addrs('DI'),...addrs('DO'),...addrs('M')],sl=(f,l,v)=>`<select data-f="${f}">${l.map(q=>`<option ${q==v?'selected':''}>${q}</option>`).join('')}</select>`;
 $('#ald').innerHTML='<tr><th>Variable</th><th>Condición</th><th>Límite</th><th>Prioridad</th><th>Mensaje</th><th></th></tr>'+AL.map(a=>`<tr data-id="${a.id}"><td>${sl('addr',ad.includes(a.addr)?ad:[a.addr,...ad],a.addr)}</td><td>${sl('op',['>=','<=','=='],a.op)}</td><td><input data-f="lim" type="number" value="${a.lim}" style="width:70px"></td><td>${sl('pri',['Alta','Media','Baja'],a.pri)}</td><td><input data-f="msg" value="${qe(a.msg)}"></td><td><button data-x="${a.id}">Quitar</button></td></tr>`).join('')}
$('#ald').addEventListener('input',e=>{const t=e.target,f=t.dataset.f;if(!f)return;const a=AL.find(q=>q.id==t.closest('tr').dataset.id);a[f]=f=='lim'?+t.value:t.value;edited=1});
$('#ald').addEventListener('click',e=>{const k=e.target.dataset.x;if(k){AL=AL.filter(a=>a.id!=k);delete alst[k];alTable();alch=1}});
$('#alb').onclick=()=>{AL.push({id:hid++,addr:addrs('AI')[0]||addrs('DI')[0],op:'>=',lim:80,pri:'Media',msg:'Nueva alarma'});edited=1;alTable()};
/* tendencias: las variables digitales se grafican como 0 o 100 */
const TC=['#27e0ff','#36f0a0','#ffb224','#ff5470'];
function trSel(){const ad=[...addrs('AI'),...addrs('AO'),...addrs('DI'),...addrs('DO')];$('#trsel').innerHTML=TR.map((p,i)=>`<label>Pluma ${i+1}<select data-i="${i}"><option value="">—</option>${ad.map(a=>`<option ${a==p?'selected':''}>${a}</option>`).join('')}</select></label>`).join('')}
$('#trsel').addEventListener('change',e=>{const i=e.target.dataset.i;if(i!=null){TR[i]=e.target.value;trd[i]=[];edited=1}});
function trSample(){TR.forEach((a,i)=>{if(!a)return;const v=get(a);trd[i].push(HW.an.has(a)?v:v*100);if(trd[i].length>120)trd[i].shift()})}
function trDraw(){const y=v=>145-cl(v,0,100)*1.4;$('#trs').innerHTML='<rect x="30" y="5" width="560" height="140" fill="#07111d" stroke="var(--ln)"/>'+[0,50,100].map(v=>`<text x="2" y="${y(v)+3}">${v}</text><line x1="30" x2="590" y1="${y(v)}" y2="${y(v)}" stroke="var(--ln)"/>`).join('')+
 trd.map((d,i)=>d.length>1?`<polyline fill="none" stroke="${TC[i]}" stroke-width="2" points="${d.map((v,k)=>`${30+k*560/119},${y(v)}`).join(' ')}"/>`:'').join('')+TR.map((a,i)=>a?`<text x="${40+i*120}" y="158" style="fill:${TC[i]}">${a}</text>`:'').join('')}
function hdemo(){const D=HW.A.DI,O=HW.A.DO,I=HW.A.AI,a=(t,px,py,o)=>{const it=hadd(t,o);it.x=px;it.y=py;return it};
 hid=1;AL=[];alst={};alh=[];alch=1;H=[{name:'Proceso',items:[]}];hs=0;hsel=null;
 a('tank',60,40,{label:'TK-101',bind:I[0]||''});a('gauge',200,40,{label:'Nivel',bind:I[0]||''});a('val',200,150,{label:'Nivel TK-101',bind:I[0]||''});
 a('motor',380,50,{label:'P-101',bind:O[0]});a('lamp',380,150,{label:'Válvula V-101',bind:O[1]});a('lamp',520,50,{label:'Piloto',bind:O[2]});a('btn',380,260,{label:'Marcha',bind:D[0]});
 AL.push({id:hid++,addr:I[0]||D[0],op:'>=',lim:80,pri:'Alta',msg:'Nivel alto en TK-101'},{id:hid++,addr:I[0]||D[0],op:'<=',lim:10,pri:'Media',msg:'Nivel bajo en TK-101'});
 TR=[I[0]||'',O[0],O[1],''];trd=[[],[],[],[]];hscr();alTable();trSel();hinsp()}
/* ---------- Variables, monitor y visualización del proceso ---------- */
const typ=a=>HW.an.has(a)?'INT':'BOOL',IOT={DI:'Entrada digital',DO:'Salida digital',AI:'Entrada analógica',AO:'Salida analógica'};
function rs(t){const A=Object.fromEntries(VT.filter(v=>/^[A-Za-z_]\w*$/.test(v.name)&&v.addr).map(v=>[v.name,v.addr])),k=Object.keys(A);return k.length?String(t).replace(new RegExp('\\b('+k.join('|')+')\\b','g'),m=>A[m]):String(t)}
function vtable(){const q=($('#vq').value||'').toLowerCase();
 $('#vt').innerHTML='<tr><th>Nombre</th><th>Dirección</th><th>Tipo</th><th>Descripción</th><th>Valor</th><th></th></tr>'+VT.map((v,i)=>({v,i})).filter(({v})=>!q||(v.name+v.addr+v.desc).toLowerCase().includes(q)).map(({v,i})=>`<tr><td><input data-i="${i}" data-f="name" value="${qe(v.name)}" style="width:110px"></td><td><input list="adl" data-i="${i}" data-f="addr" value="${qe(v.addr)}" style="width:100px"></td><td>${typ(v.addr)}</td><td><input data-i="${i}" data-f="desc" value="${qe(v.desc)}"></td><td class="vv" data-a="${qe(v.addr)}"></td><td><button data-x="${i}">Quitar</button></td></tr>`).join('');vval()}
const vval=()=>$$('#vt .vv').forEach(c=>{const a=c.dataset.a,v=get(a);c.textContent=HW.an.has(a)?Math.round(v):v?'ON':'OFF'});
$('#vt').addEventListener('input',e=>{const t=e.target,i=t.dataset.i;if(i!=null){VT[i][t.dataset.f]=t.value;edited=1;if(t.dataset.f=='addr')t.closest('tr').querySelector('.vv').dataset.a=t.value}});
$('#vt').addEventListener('click',e=>{const x=e.target.dataset.x;if(x!=null){VT.splice(+x,1);vtable()}});
$('#vq').oninput=vtable;$('#vadd').onclick=()=>{VT.push({name:'Var_'+(VT.length+1),addr:HW.A.M[VT.length]||HW.A.M[0],desc:''});edited=1;vtable()};
function mon(){const on=a=>`<span class="do${get(a)?' on':''}">${a} ${get(a)?'ON':'OFF'}</span>`,sh=(t,l)=>`<h3>${t}</h3><div class="ios">${l||'<span class="mut">Ninguno</span>'}</div>`;
 $('#mon').innerHTML=sh('Entradas',HW.A.DI.map(on).join(''))+sh('Salidas',HW.A.DO.map(on).join(''))+sh('Memorias',HW.A.M.map(on).join(''))+sh('Memorias de palabra',HW.A.W.map(a=>`<span class="do">${a} ${get(a)}</span>`).join(''))+
 sh('Temporizadores',Object.entries(rt.T).map(([k,t])=>`<span class="do${get(k)?' on':''}">${k} ${t.el.toFixed(1)} s</span>`).join(''))+sh('Contadores',Object.entries(rt.C).map(([k,c])=>`<span class="do${get(k)?' on':''}">${k} ${c.v}</span>`).join(''))}
function lab(o){if(dmode){const L=[o.type=='inst'?o.tag:ISA[o.type].n];if(o.bind){const v=get(o.bind);L.push(o.io=='AI'||o.io=='AO'?Math.round(v)+' %':v?'ON':'OFF')}return L}
 const L=[];if(o.type!='inst')L.push(ISA[o.type].n);if(o.type!='inst'&&(o.vt??V.tag))L.push(o.tag);if(o.bind&&(o.va??V.addr))L.push(o.bind);if(V.desc&&o.desc)L.push(o.desc);if(V.type&&o.io)L.push(IOT[o.io]);return L}
['tag','addr','desc','type'].forEach(k=>{$('#v'+k).onchange=e=>{V[k]=+e.target.checked;drawCV()}});
$('#dmode').onclick=()=>{dmode=!dmode;$('#dmode').textContent='Modo: '+(dmode?'Operación':'Diseño');drawCV()};
/* ---------- GRAFCET con varias acciones por etapa ---------- */
const A2=s=>String(s).split(',').map(x=>x.trim()).filter(Boolean);
function buildG(){G.forEach(s=>{if(!s.acts)s.acts=A2(s.a)});
 $('#gt').innerHTML='<tr><th>Etapa</th><th>Acciones</th><th>Receptividad</th><th>Salta a</th><th></th></tr>'+G.map((s,i)=>`<tr><td>${i}</td><td>${s.acts.map((x,j)=>`<div class="ar"><input data-i="${i}" data-j="${j}" value="${qe(x)}" list="adl" aria-label="Acción ${j+1}"><button data-op="up" data-i="${i}" data-j="${j}" title="Subir">▲</button><button data-op="dn" data-i="${i}" data-j="${j}" title="Bajar">▼</button><button data-op="dup" data-i="${i}" data-j="${j}" title="Duplicar">⧉</button><button data-op="del" data-i="${i}" data-j="${j}" title="Eliminar">✕</button></div>`).join('')}<button data-op="add" data-i="${i}">+ Agregar acción</button></td><td><input data-i="${i}" data-f="c" value="${qe(s.c)}"></td><td><input data-i="${i}" data-f="n" type="number" min="0" max="${G.length-1}" value="${s.n}" style="width:60px"></td><td>${i?`<button data-op="rm" data-i="${i}">Quitar etapa</button>`:''}</td></tr>`).join('');gDraw()}
$('#gt').addEventListener('input',e=>{const t=e.target,i=t.dataset.i;if(i==null)return;const s=G[i];edited=1;if(t.dataset.f)s[t.dataset.f]=t.dataset.f=='n'?+t.value:t.value;else{s.acts[+t.dataset.j]=t.value;s.a=s.acts.filter(Boolean).join(', ')}gDraw()});
$('#gt').addEventListener('click',e=>{const b=e.target.closest('[data-op]');if(!b)return;const i=+b.dataset.i,j=+b.dataset.j,s=G[i],op=b.dataset.op,l=s.acts||(s.acts=A2(s.a));
 if(op=='add')l.push('');else if(op=='del')l.splice(j,1);else if(op=='dup')l.splice(j+1,0,l[j]);else if(op=='up'&&j>0)[l[j-1],l[j]]=[l[j],l[j-1]];else if(op=='dn'&&j<l.length-1)[l[j+1],l[j]]=[l[j],l[j+1]];
 else if(op=='rm'){G.splice(i,1);G.forEach(q=>{q.n=Math.min(q.n,G.length-1)})}
 if(op!='rm')s.a=l.filter(Boolean).join(', ');edited=1;buildG()});
$('#gadd').onclick=()=>{G.push({a:'',acts:[],c:HW.A.DI[0],n:0});G[G.length-2].n=G.length-1;edited=1;buildG()};
const gSvg=hl=>{let y=20,o='';
 G.forEach((s,i)=>{const ac=A2(s.a),n=Math.max(ac.length,1),h=Math.max(110,(n-1)*34+90),yy=k=>y+20+k*34;
  o+=`<rect class="gs${hl&&i==act?' hi':''}" x="100" y="${y}" width="60" height="40"/>${i?'':`<rect class="gs" x="94" y="${y-6}" width="72" height="52" fill="none"/>`}<text x="130" y="${y+25}" text-anchor="middle" style="font-size:16px">${i}</text>`+
  `<line class="gl" x1="160" y1="${yy(0)}" x2="175" y2="${yy(0)}"/><line class="gl" x1="175" y1="${yy(0)}" x2="175" y2="${yy(n-1)}"/>`+(ac.length?ac:['—']).map((x,k)=>`<line class="gl" x1="175" y1="${yy(k)}" x2="185" y2="${yy(k)}"/><rect class="gs" x="185" y="${yy(k)-15}" width="215" height="30"/><text x="195" y="${yy(k)+4}">${x}</text>`).join('')+
  `<line class="gl" x1="130" y1="${y+40}" x2="130" y2="${y+h}"/><line class="gtr" x1="115" y1="${y+h-35}" x2="145" y2="${y+h-35}"/><text x="155" y="${y+h-31}">= ${s.c}</text>${s.n!=i+1?`<text x="20" y="${y+h-12}" style="fill:#ffb224">▲ etapa ${s.n}</text>`:''}`;y+=h});
 return `<svg id="gsvg" viewBox="0 0 460 ${y+10}" xmlns="http://www.w3.org/2000/svg">${o}</svg>`};
function gDraw(){$('#gsvg').outerHTML=gSvg(1)}
/* ---------- Ladder interactivo ---------- */
const LP=[['Contactos',[['NO','no'],['NC','nc'],['Comparador','cmp']]],['Bobinas',[['Coil','OUT'],['SET','S'],['RESET','R']]],['Temporizadores',[['TON','TON'],['TOF','TOF'],['TP','TP']]],['Contadores',[['CTU','CTU'],['CTD','CTD'],['Reset','RES']]],['Otros',[['MOVE','MOVE'],['ADD','ADD'],['SUB','SUB']]]],
 ARGL={OUT:['Dirección'],S:['Dirección'],R:['Dirección'],TON:['Temporizador','Preset (s)'],TOF:['Temporizador','Preset (s)'],TP:['Temporizador','Preset (s)'],CTU:['Contador','Preset'],CTD:['Contador','Preset'],RES:['Temporizador o contador'],MOVE:['Origen','Destino'],ADD:['Operando A','Operando B','Destino'],SUB:['Operando A','Operando B','Destino']};
$('#lpal').innerHTML=LP.map(([c,l])=>`<h3>${c}</h3><div class="ios">${l.map(([n,k])=>`<button draggable="true" data-lp="${k}">${n}</button>`).join('')}</div>`).join('');
const tt=t=>t.nc?'!'+t.a:t.a,rtext=r=>`${r.m.map(tt).join(' & ')}${r.b.length?' | '+r.b.map(tt).join(' & '):''} -> ${r.ct=='OUT'?r.args[0]:r.ct+' '+r.args.join(' ')}`,
 lraw=()=>parseLadder($('#ltxt').value),lm=[],lwq=R=>{$('#ltxt').value=R.map(r=>r.e?r.l:rtext(r)).join('\n');edited=1;lDraw()},lwrite=R=>{lwq(R);lprop()};
const lSvg=live=>{const R=parseLadder(rs($('#ltxt').value));lm.length=0;
 const mx=Math.max(1,...R.map(r=>r.e?1:Math.max(r.m.length,r.b.length))),ox=70+mx*110,W=ox+230,sc=(i,k,j)=>lsel&&lsel.r==i&&lsel.k==k&&lsel.i==j?' sel':'';let y=14,o='';
 R.forEach((r,i)=>{const h=!r.e&&r.b.length?104:64;lm.push([y,h]);
  o+=`<rect class="rb${lsel&&lsel.r==i&&!lsel.k?' sel':''}" data-r="${i}" x="14" y="${y}" width="${W-28}" height="${h}"/><text x="22" y="${y+13}" style="font-size:9px;fill:#7f97ad">Network ${i+1}</text>`;
  if(r.e){o+=`<text x="40" y="${y+40}" style="fill:#ff5470">Peldaño inválido: ${r.e}</text>`;y+=h+8;return}
  const cy=y+34,on=live&&power(r,get),wc=on?' hi':'',[a,b]=r.args,coil=['OUT','S','R'].includes(r.ct),
  term=(t,k,j,yy)=>{const p=live&&tv(t,get),x=70+j*110,at=`data-r="${i}" data-k="${k}" data-i="${j}"`;
   return t.cmp?`<g class="lc${p?' hi':''}${sc(i,k,j)}" ${at}><rect x="${x-8}" y="${yy-14}" width="100" height="28" fill="#07111d"/><text x="${x+42}" y="${yy+4}" text-anchor="middle">${t.a}</text></g>`:
   `<g class="lc${p?' hi':''}${sc(i,k,j)}" ${at}><rect x="${x-6}" y="${yy-16}" width="34" height="32" fill="transparent" stroke="none"/><line x1="${x}" y1="${yy-12}" x2="${x}" y2="${yy+12}"/><line x1="${x+18}" y1="${yy-12}" x2="${x+18}" y2="${yy+12}"/>${t.nc?`<line x1="${x-3}" y1="${yy+12}" x2="${x+21}" y2="${yy-12}"/>`:''}<text x="${x+9}" y="${yy-18}" text-anchor="middle">${t.a}</text></g>`};
  o+=`<line class="lw${wc}" x1="20" y1="${cy}" x2="${ox+40}" y2="${cy}"/>`+r.m.map((t,j)=>term(t,'m',j,cy)).join('');
  if(r.b.length)o+=`<line class="lw${wc}" x1="40" y1="${cy}" x2="40" y2="${cy+42}"/><line class="lw" x1="40" y1="${cy+42}" x2="${ox+10}" y2="${cy+42}"/><line class="lw" x1="${ox+10}" y1="${cy}" x2="${ox+10}" y2="${cy+42}"/>`+r.b.map((t,j)=>term(t,'b',j,cy+42)).join('');
  const at=`data-r="${i}" data-k="o" data-i="0"`,cls=`lc${on?' hi':''}${sc(i,'o',0)}`,t1=rt.T[a],c1=rt.C[a],lv=live?(t1?` ${t1.el.toFixed(1)}/${b}s`:c1?` ${c1.v}/${b}`:''):'';
  o+=(coil?`<g class="${cls}" ${at}><rect x="${ox+20}" y="${cy-18}" width="82" height="36" fill="transparent" stroke="none"/><path d="M${ox+30} ${cy-14}Q${ox+16} ${cy} ${ox+30} ${cy+14}M${ox+86} ${cy-14}Q${ox+100} ${cy} ${ox+86} ${cy+14}"/><text x="${ox+58}" y="${cy+4}" text-anchor="middle">${r.ct=='OUT'?'':r.ct}</text><text x="${ox+58}" y="${cy-20}" text-anchor="middle">${a}</text></g>`:
   `<g class="${cls}" ${at}><rect x="${ox+20}" y="${cy-24}" width="190" height="48" fill="#07111d"/><text x="${ox+30}" y="${cy-8}" style="font-weight:700">${r.ct}</text><text x="${ox+30}" y="${cy+8}">${r.args.join('  ')}${lv}</text></g>`)+
  `<line class="lw${wc}" x1="${ox+(coil?100:210)}" y1="${cy}" x2="${W-20}" y2="${cy}"/>`;y+=h+8});
 return `<svg id="lsvg" viewBox="0 0 ${W} ${y+6}" xmlns="http://www.w3.org/2000/svg"><line class="lc" x1="20" y1="8" x2="20" y2="${y}"/><line class="lc" x1="${W-20}" y1="8" x2="${W-20}" y2="${y}"/>${o}</svg>`};
const lDraw=()=>{$('#lsvg').outerHTML=lSvg(plc.st=='RUN')};
$('#ltxt').oninput=()=>{lsel=null;edited=1;lDraw();lprop()};
$('#lw').addEventListener('click',e=>{const g=e.target.closest('[data-k]'),rb=e.target.closest('[data-r]');lsel=g?{r:+g.dataset.r,k:g.dataset.k,i:+g.dataset.i}:rb?{r:+rb.dataset.r,k:null,i:0}:null;lDraw();lprop()});
const D0=()=>HW.A.DI[0]||'',Q0=()=>HW.A.DO[0]||'',M0=()=>HW.A.M[0]||'';
function defOut(k){const w=HW.A.W[0],ai=HW.A.AI[0]||'1';return{OUT:[Q0()],S:[M0()],R:[M0()],TON:['T1','5'],TOF:['T1','5'],TP:['T1','5'],CTU:['C1','10'],CTD:['C1','10'],RES:['C1'],MOVE:['0',w],ADD:[ai,'1',w],SUB:[ai,'1',w]}[k]}
function lpAdd(k,ri){const R=lraw();if(ri==null)ri=lsel?lsel.r:R.length-1;
 if(ri<0||!R.length){R.push({m:[],b:[],ct:'OUT',args:[Q0()]});ri=R.length-1}
 const r=R[ri];if(r.e)return;
 if(['no','nc','cmp'].includes(k)){const ai=HW.A.AI[0]||'IW64',t=k=='cmp'?{nc:false,a:ai+'>=50',cmp:[ai,'>=','50']}:{nc:k=='nc',a:D0()};($('#lbr').checked?r.b:r.m).push(t)}
 else{r.ct=k;r.args=defOut(k)}
 lsel={r:ri,k:null,i:0};lwrite(R)}
$('#lpal').onclick=e=>{const b=e.target.closest('[data-lp]');if(b)lpAdd(b.dataset.lp)};
$('#lpal').addEventListener('dragstart',e=>{const b=e.target.closest('[data-lp]');if(b)e.dataTransfer.setData('text/plain','lp:'+b.dataset.lp)});
$('#lw').addEventListener('dragover',e=>e.preventDefault());
$('#lw').addEventListener('drop',e=>{e.preventDefault();const d=e.dataTransfer.getData('text/plain');if(!d.startsWith('lp:'))return;const s=$('#lsvg'),p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(s.getScreenCTM().inverse()),ri=lm.findIndex(([y,h])=>q.y>=y&&q.y<y+h+8);lpAdd(d.slice(3),ri<0?null:ri)});
$('#nadd').onclick=()=>{const R=lraw(),at=(lsel?lsel.r:R.length-1)+1;R.splice(at,0,{m:[{nc:false,a:D0()}],b:[],ct:'OUT',args:[Q0()]});lsel={r:at,k:null,i:0};lwrite(R)};
$('#ndel').onclick=()=>{if(!lsel)return;const R=lraw();R.splice(lsel.r,1);lsel=null;lwrite(R)};
$('#nup').onclick=()=>{if(!lsel||!lsel.r)return;const R=lraw(),i=lsel.r;[R[i-1],R[i]]=[R[i],R[i-1]];lsel.r--;lwrite(R)};
$('#ndn').onclick=()=>{if(!lsel)return;const R=lraw(),i=lsel.r;if(i>=R.length-1)return;[R[i+1],R[i]]=[R[i],R[i+1]];lsel.r++;lwrite(R)};
function lprop(){const el=$('#lprop'),R=lraw();el.oninput=el.onchange=el.onclick=null;
 if(!lsel){el.innerHTML='<p class="mut">Seleccione un elemento o un network. Arrastre instrucciones sobre un network, o haga clic en ellas para agregarlas.</p>';return}
 const r=R[lsel.r];if(!r){lsel=null;return lprop()}
 if(r.e){el.innerHTML=`<p class="err">${r.e}</p><p class="mut">${qe(r.l)}</p>`;return}
 if(lsel.k=='o'){el.innerHTML=`<h3>${r.ct}</h3>`+r.args.map((x,j)=>`<label>${ARGL[r.ct][j]}<input list="adl" data-j="${j}" value="${qe(x)}"></label>`).join('');
  el.oninput=e=>{const j=e.target.dataset.j;if(j!=null){r.args[j]=e.target.value;lwq(R)}};return}
 if(lsel.k){const L=lsel.k=='m'?r.m:r.b,t=L[lsel.i];if(!t){lsel=null;return lprop()}
  el.innerHTML=`<h3>${t.cmp?'Comparador':t.nc?'Contacto NC':'Contacto NO'}</h3>`+(t.cmp?`<label>Operando A<input list="adl" data-f="0" value="${qe(t.cmp[0])}"></label><label>Operador<select data-f="1">${['>=','<=','==','!=','>','<'].map(o=>`<option ${o==t.cmp[1]?'selected':''}>${o}</option>`).join('')}</select></label><label>Operando B<input list="adl" data-f="2" value="${qe(t.cmp[2])}"></label>`:`<label>Dirección<input list="adl" data-f="a" value="${qe(t.a)}"></label><label><input type="checkbox" data-f="nc" ${t.nc?'checked':''}> Normalmente cerrado</label>`)+`<button data-lo="left">◀ Mover</button> <button data-lo="right">▶ Mover</button> <button data-lo="dup">Duplicar</button> <button data-lo="del">Eliminar</button>`;
  el.oninput=el.onchange=e=>{const f=e.target.dataset.f;if(f==null)return;if(t.cmp){t.cmp[+f]=e.target.value;t.a=t.cmp.join('')}else if(f=='nc')t.nc=e.target.checked;else t.a=e.target.value;lwq(R)};
  el.onclick=e=>{const o=e.target.dataset.lo;if(!o)return;const i=lsel.i;if(o=='del'){L.splice(i,1);lsel={r:lsel.r,k:null,i:0}}else if(o=='dup')L.splice(i+1,0,JSON.parse(JSON.stringify(t)));else{const d=o=='left'?-1:1;if(L[i+d]){[L[i],L[i+d]]=[L[i+d],L[i]];lsel.i=i+d}}lwrite(R)};return}
 el.innerHTML=`<h3>Network ${lsel.r+1}</h3><p class="mut">${r.m.length+r.b.length} contacto(s). Instrucción: ${r.ct}.</p>`}
/* ---------- Texto: ST / IL ---------- */
const tnum=()=>{$('#tgut').textContent=$('#ttxt').value.split('\n').map((_,i)=>i+1).join('\n')};
$('#ttxt').addEventListener('input',()=>{edited=1;tnum()});$('#ttxt').addEventListener('scroll',()=>{$('#tgut').scrollTop=$('#ttxt').scrollTop});
$('#tconv').onclick=()=>{let lg=$('#tlang').value;if(lg=='off'){lg='ST';$('#tlang').value='ST'}const R=lraw();$('#ttxt').value=lg=='ST'?toST(R):toIL(R);edited=1;tnum()};
function txCompile(r){const lang=$('#tlang').value;if(lang=='off')return;const src=rs($('#ttxt').value),add=(sev,ln,el,msg)=>{r.list.push({sev,where:lang,el,msg,line:ln-1});if(sev=='err')r.err++},dec=new Set(r.dec),ok=a=>HW.all.has(a)||dec.has(a);
 if(lang=='ST'){try{const p=stParse(src);stCheck(p,ok,HW.ro).forEach(x=>add('err',x.ln,x.el,x.msg));r.list.push({sev:'info',where:'ST',el:'—',msg:p.length+' sentencias analizadas'})}catch(x){add('err',x.line||1,'ST',x.m||x.message)}}
 else{const{prog,err}=ilParse(src);err.forEach(x=>add('err',x.ln,x.el,x.msg));ilCheck(prog,ok,HW.ro).forEach(x=>add('err',x.ln,x.el,x.msg))}}
/* ---------- Ejecución (ciclo de scan sobre el programa cargado) ---------- */
const ser=ts=>ts.every(t=>t.nc?!get(t.a):!!get(t.a));
function scan(){const dt=.1,L=plc.loaded;
 P.forEach(o=>{if(!o.bind)return;const t=o.tag.split('-')[0];if(t=='LSH')set(o.bind,+(level>=80));if(t=='LSL')set(o.bind,+(level>=20));if(t=='LT'||t=='LIT')set(o.bind,Math.round(level))});
 try{rt.act=act;rt.gT=gT;
  if(L.mode!='ladder'&&L.g.length)grafcet(L,rt,get,set,dt);
  if(L.mode!='grafcet')L.rungs.forEach((r,i)=>rung(r,i,rt,get,set,dt));
  if(L.txt)(L.txt.lg=='ST'?stRun:ilRun)(L.txt.p,{get,set,an:HW.an,rt,dt});
  act=rt.act;gT=rt.gT
 }catch(x){log('err','Fallo de ejecución: '+x.message);return setSt('ERROR')}
 const pumps=P.filter(o=>o.type=='pump'&&o.bind&&get(o.bind)).length,drains=P.filter(o=>isV(o)&&o.bind&&get(o.bind)>0).length;
 level=cl(level+(pumps*6-drains*5)*dt,0,100);if(++tick%5==0)trSample();refresh()}
setInterval(()=>{if(plc.st=='RUN')scan()},100);
$('#rst').onclick=()=>{reset();refresh()};
function refresh(){alarms();const t=($('section.act')||{}).id;if(t=='hmi'){drawH();trDraw();if(alch)alPanel()}if(t=='vars'){vval();mon()}if(t=='plc'){refreshIO();dev()}if(t=='proceso')drawCV();if(t=='grafcet')gDraw();if(t=='ladder')lDraw()}
/* ---------- Informe PDF ---------- */
$('#pdf').onclick=()=>{const p=PLCS[model],r=cres,rows=HW.rows.map(x=>`<tr><td>${x.slot}</td><td>${x.n}</td><td>${x.rng.join(' · ')}</td></tr>`).join(''),
 bd=P.filter(o=>o.bind).map(o=>`<tr><td>${o.bind}</td><td>${o.tag}</td><td>${o.type=='inst'?'Instrumento ISA 5.1':ISA[o.type].n}</td></tr>`).join('');
 drawCV();const c=cv.cloneNode(true);c.setAttribute('viewBox','0 0 900 420');
 $('#report').innerHTML=`<h1>Informe de programación</h1><p>${new Date().toLocaleString('es-CO')}</p><h2>PLC y red</h2><table><tr><th>Modelo</th><td>${model} (${p.brand}, ${p.fam})</td></tr><tr><th>IP / Máscara / Gateway</th><td>${$('#ip').value} / ${$('#mask').value} / ${$('#gw').value}</td></tr><tr><th>Estado del PLC</th><td>${ST[plc.st][0]}</td></tr><tr><th>Compilación</th><td>${r?(r.err?r.err+' errores':'Correcta')+', '+r.warn+' advertencias':'Sin compilar'}</td></tr></table>
 <h2>Hardware</h2><table><tr><th>Slot</th><th>Módulo</th><th>Direcciones</th></tr>${rows}</table><h2>Asignación de E/S</h2><table><tr><th>Dirección</th><th>TAG</th><th>Elemento</th></tr>${bd}</table>
 <h2>P&amp;ID</h2>${c.outerHTML}<h2>GRAFCET</h2>${gSvg(0)}<h2>Ladder</h2>${lSvg(0)}<h2>Texto Ladder</h2><pre>${$('#ltxt').value}</pre><p>Laboratorio PLC 4.0. Ing. Brayan Camilo Noreña Agudelo, Instructor Técnico, Área de Automatización, C.E.A.I.</p>`;print()};
/* ---------- Inicio ---------- */
function sample(){const D=HW.A.DI,O=HW.A.DO,Mm=HW.A.M,o=i=>O[i]||O[O.length-1];
 $('#ltxt').value=[`${D[0]} & !${D[3]} | ${Mm[0]} -> ${Mm[0]}`,`${Mm[0]} -> TON T1 3`,`T1 -> ${o(4)}`,`${HW.A.AI[0]||'IW64'}>=50 -> ${o(5)}`,`${D[3]} -> R ${Mm[0]}`].join('\n');
 G=[{a:`${O[3]}, R:${Mm[1]}`,c:D[0],n:1},{a:`${O[0]}, S:${Mm[1]}`,c:D[1],n:2},{a:`${O[1]}, T2=3s`,c:'T2',n:3},{a:O[2],c:'!'+D[2],n:0}];
 VT=[{name:'Sensor_Start',addr:D[0],desc:'Pulsador de inicio'},{name:'Motor_1',addr:O[0],desc:'Motor principal'},{name:'Marcha',addr:Mm[0],desc:'Memoria de marcha'}];
 $('#ttxt').value=`(* Equivalente en ST *)\nIF ${D[0]} AND NOT ${D[3]} THEN\n  ${o(6)} := TRUE;\nELSE\n  ${o(6)} := FALSE;\nEND_IF;`;tnum();
 lsel=null;demo();hdemo();buildG();lDraw();lprop();vtable();insp()}
$('#lib').innerHTML=$('#libp').innerHTML=libHTML();
const tbl=(t,a)=>`<h3>${t}</h3><table>${a.map(([l,x])=>`<tr><td>${l}</td><td>${x}</td></tr>`).join('')}</table>`;
$('#l1').innerHTML=tbl('Primera letra (variable medida)',LET1);$('#l2').innerHTML=tbl('Letras sucesivas (función)',LET2);
['#ltxt','#gt'].forEach(s=>$(s).addEventListener('input',()=>{edited=1}));
{const p0=PLCS[model];$('#ip').value=p0.ip;$('#gw').value=p0.ip.replace(/\d+$/,'254')}
chkIP();setModel();sample();renderCmp();setSt('STOP');go((location.hash||'#curso').slice(1)||'curso');

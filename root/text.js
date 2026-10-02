// Lenguajes de texto sobre el mismo PLC virtual: Structured Text (ST/SCL) y Lista de instrucciones (IL/STL), con conversión desde Ladder.
import {inst} from './engine.js';
const FN={ABS:Math.abs,SQRT:Math.sqrt,SIN:Math.sin,COS:Math.cos,TAN:Math.tan,EXP:Math.exp,LN:Math.log,LOG:Math.log10,MIN:Math.min,MAX:Math.max,POW:Math.pow,TRUNC:Math.trunc,ROUND:Math.round,AVG:(...a)=>a.reduce((x,y)=>x+y,0)/a.length,SCALE:(x,a,b,c,d)=>c+(x-a)*(d-c)/((b-a)||1)};
const num=x=>/^-?\d+(\.\d+)?$/.test(x);
function tok(src){const s=src.replace(/\(\*[\s\S]*?\*\)/g,m=>m.replace(/[^\n]/g,' ')).replace(/\/\/.*$/gm,m=>' '.repeat(m.length)),re=/\s*(:=|<>|<=|>=|\*\*|[-+*\/()<>=,;:]|\d+(?:\.\d+)?|[A-Za-z_](?:[\w.\/]|:(?!=))*)/y,r=[];
 while(re.lastIndex<s.length){const at=re.lastIndex;if(/^\s*$/.test(s.slice(at)))break;const m=re.exec(s);if(!m)throw{m:'Carácter no válido: "'+s.slice(at,at+6).trim()+'"',line:s.slice(0,at).split('\n').length};
  r.push({t:m[1],line:s.slice(0,re.lastIndex-m[1].length).split('\n').length})}return r}
export function stParse(src){const T=tok(src);let i=0,or,xor,and,cmp,add,mul,un,pw;
 const line=()=>(T[i]||T[T.length-1]||{line:1}).line,u=()=>T[i]?T[i].t.toUpperCase():'',er=m=>{throw{m,line:line()}},ex=s=>{if(u()!=s)er('Se esperaba "'+s+'"');i++};
 const args=()=>{const a=[];ex('(');if(u()!=')'){a.push(or());while(u()==','){i++;a.push(or())}}ex(')');return a};
 const prim=()=>{const t=T[i++];if(!t)er('Expresión incompleta');const x=t.t.toUpperCase();
  if(x=='('){const e=or();ex(')');return e}
  if(/^\d/.test(x))return['n',+x];if(x=='TRUE')return['n',1];if(x=='FALSE')return['n',0];
  if(/^[A-Z_]/.test(x)){if(u()=='(')return['f',x,args()];return['v',t.t]}
  i--;er('Símbolo inesperado "'+t.t+'"')};
 const bin=(nx,ops)=>()=>{let a=nx();while(ops.includes(u())){const o=u();i++;a=[o,a,nx()]}return a};
 pw=()=>{let a=prim();while(u()=='**'){i++;a=['**',a,prim()]}return a};
 un=()=>{if(u()=='NOT'){i++;return['!',un()]}if(u()=='-'){i++;return['neg',un()]}return pw()};
 mul=bin(un,['*','/','MOD']);add=bin(mul,['+','-']);cmp=bin(add,['=','<>','<','>','<=','>=']);and=bin(cmp,['AND']);xor=bin(and,['XOR']);or=bin(xor,['OR']);
 const blk=(end,lab)=>{const b=[];while(i<T.length&&!end.includes(u())&&!(lab&&/^\d/.test(T[i].t)))b.push(st());if(i>=T.length&&end.length)er('Falta '+end[end.length-1]);return b};
 const st=()=>{const ln=line(),x=u(),t=T[i];
  if(x=='IF'){i++;const c=[[or(),(ex('THEN'),blk(['ELSIF','ELSE','END_IF']))]];let el=null;
   while(u()=='ELSIF'){i++;const q=or();ex('THEN');c.push([q,blk(['ELSIF','ELSE','END_IF'])])}
   if(u()=='ELSE'){i++;el=blk(['END_IF'])}ex('END_IF');ex(';');return{k:'if',c,el,ln}}
  if(x=='WHILE'){i++;const c=or();ex('DO');const b=blk(['END_WHILE']);ex('END_WHILE');ex(';');return{k:'wh',c,b,ln}}
  if(x=='FOR'){i++;const v=T[i++].t;ex(':=');const lo=or();ex('TO');const hi=or();let s=['n',1];if(u()=='BY'){i++;s=or()}ex('DO');const b=blk(['END_FOR']);ex('END_FOR');ex(';');return{k:'for',v,lo,hi,s,b,ln}}
  if(x=='CASE'){i++;const e=or();ex('OF');const w=[];let el=null;
   while(i<T.length&&u()!='END_CASE'&&u()!='ELSE'){const vs=[];do{const n=T[i++];if(!n||!/^\d/.test(n.t))er('Se esperaba un valor numérico en CASE');vs.push(+n.t)}while(u()==','&&++i);ex(':');w.push([vs,blk(['ELSE','END_CASE'],1)])}
   if(u()=='ELSE'){i++;el=blk(['END_CASE'])}ex('END_CASE');ex(';');return{k:'case',e,w,el,ln}}
  if(!t)er('Instrucción incompleta');
  if(/^[A-Za-z_]/.test(t.t)){i++;if(u()==':='){i++;const e=or();ex(';');return{k:'as',t:t.t,e,ln}}if(u()=='('){const a=args();ex(';');return{k:'call',n:t.t.toUpperCase(),a,ln}}}
  er('Instrucción no válida "'+t.t+'"')};
 return blk([])}
const CALLS={TON:3,TOF:3,TP:3,CTU:3,CTD:3,RES:1};
export function stCheck(p,W,ro){const R=[],loc=new Set(),dec=new Set(),add=(ln,el,msg)=>R.push({ln,el,msg});
 const each=(b,f)=>b.forEach(s=>{f(s);if(s.k=='if'){s.c.forEach(c=>each(c[1],f));s.el&&each(s.el,f)}else if(s.k=='wh'||s.k=='for')each(s.b,f);else if(s.k=='case'){s.w.forEach(w=>each(w[1],f));s.el&&each(s.el,f)}});
 each(p,s=>{if(s.k=='call'&&s.n!='RES'&&s.a[0]&&s.a[0][0]=='v')dec.add(s.a[0][1])});
 const ex=(e,ln)=>{if(e[0]=='v'){if(!W(e[1])&&!dec.has(e[1])&&!loc.has(e[1]))add(ln,e[1],`La variable ${e[1]} no existe en la configuración actual del PLC.`)}
  else if(e[0]=='f'){if(!FN[e[1]])add(ln,e[1],'Función desconocida');e[2].forEach(x=>ex(x,ln))}else if(e[0]!='n')e.slice(1).forEach(x=>ex(x,ln))};
 each(p,s=>{const l=s.ln;
  if(s.k=='as'){if(!loc.has(s.t)){if(!W(s.t)&&!dec.has(s.t))add(l,s.t,`La variable ${s.t} no existe en la configuración actual del PLC.`);else if(ro.has(s.t))add(l,s.t,'Una entrada no puede usarse como destino')}ex(s.e,l)}
  else if(s.k=='if')s.c.forEach(c=>ex(c[0],l));else if(s.k=='wh')ex(s.c,l);else if(s.k=='case')ex(s.e,l);
  else if(s.k=='for'){loc.add(s.v);ex(s.lo,l);ex(s.hi,l);ex(s.s,l)}
  else if(s.k=='call'){const n=CALLS[s.n];if(!n)return add(l,s.n,'Instrucción o bloque desconocido (las llamadas a FC/FB aún no están disponibles)');
   if(s.a.length!=n)return add(l,s.n,`${s.n} requiere ${n} argumento(s)`);const nm=s.a[0];
   if(nm[0]!='v'||!(s.n=='RES'?dec.has(nm[1])||W(nm[1]):(s.n[0]=='C'?/^C\d+$/:/^T\d+$/).test(nm[1])))add(l,nm[1]||s.n,'Nombre inválido: use T1, T2… (temporizadores) o C1, C2… (contadores)');
   s.a.slice(1).forEach(x=>ex(x,l))}});
 return R}
export function stRun(p,io){const loc={},g=n=>n in loc?loc[n]:io.get(n);let guard=0;
 const ev=e=>{switch(e[0]){case'n':return e[1];case'v':return g(e[1]);case'neg':return -ev(e[1]);case'!':return +!ev(e[1]);case'f':return FN[e[1]](...e[2].map(ev));
  case'AND':return +!!(ev(e[1])&&ev(e[2]));case'OR':return +!!(ev(e[1])||ev(e[2]));case'XOR':return +(!ev(e[1])!=!ev(e[2]));
  default:{const x=ev(e[1]),y=ev(e[2]);switch(e[0]){case'+':return x+y;case'-':return x-y;case'*':return x*y;case'/':return y?x/y:0;case'MOD':return y?x%y:0;case'**':return x**y;
   case'=':return +(x==y);case'<>':return +(x!=y);case'<':return +(x<y);case'>':return +(x>y);case'<=':return +(x<=y);case'>=':return +(x>=y)}}}};
 const x=b=>b.forEach(s=>{switch(s.k){
  case'as':{const v=ev(s.e);if(s.t in loc)loc[s.t]=v;else io.set(s.t,io.an.has(s.t)?v:+!!v);break}
  case'if':{let d=0;for(const[c,b2]of s.c){if(ev(c)){x(b2);d=1;break}}if(!d&&s.el)x(s.el);break}
  case'wh':while(ev(s.c)){if(++guard>5000)throw Error('Bucle excesivo (WHILE)');x(s.b)}break;
  case'for':for(loc[s.v]=ev(s.lo);ev(s.s)>0?loc[s.v]<=ev(s.hi):loc[s.v]>=ev(s.hi);loc[s.v]+=ev(s.s)){if(++guard>5000)throw Error('Bucle excesivo (FOR)');x(s.b)}break;
  case'case':{const v=ev(s.e);let d=0;for(const[vs,b2]of s.w)if(vs.includes(v)){x(b2);d=1;break}if(!d&&s.el)x(s.el);break}
  case'call':{const nm=s.a[0][1];if(s.n=='RES'){inst('RES',[nm],1,0,io.rt,io.get,io.set,io.dt);break}
   const k='st'+s.ln,v=+!!ev(s.a[1]),rise=v&&!io.rt.prev[k];io.rt.prev[k]=v;inst(s.n,[nm,ev(s.a[2])],v,rise,io.rt,io.get,io.set,io.dt)}}});
 x(p)}
const ILOPS=new Set(['LD','LDN','ST','STN','S','R','AND','ANDN','OR','ORN','XOR','XORN','ADD','SUB','MUL','DIV','GT','LT','GE','LE','EQ','NE','JMP','JMPC','JMPCN','TON','TOF','TP','CTU','CTD','RES']);
export function ilParse(src){const prog=[],err=[];src.split('\n').forEach((raw,i)=>{let l=raw.replace(/\(\*.*?\*\)/g,'').replace(/\/\/.*$/,'').trim();if(!l)return;
 let lab=null;const m=l.match(/^([A-Za-z_]\w*):\s*(.*)$/);if(m){lab=m[1];l=m[2]}
 if(!l){prog.push({lab,ln:i+1,op:null,a:[]});return}
 const [op,...r]=l.split(/\s+/),O=op.toUpperCase();if(!ILOPS.has(O))err.push({ln:i+1,el:op,msg:'Instrucción IL desconocida'});
 prog.push({lab,ln:i+1,op:O,a:r.join(' ').split(',').map(q=>q.trim()).filter(Boolean)})});return{prog,err}}
export function ilCheck(P,W,ro){const R=[],lab=new Set(P.filter(x=>x.lab).map(x=>x.lab)),dec=new Set(),add=(ln,el,msg)=>R.push({ln,el,msg}),no=(ln,a)=>add(ln,a,`La dirección ${a} no existe en la configuración actual del PLC.`);
 P.forEach(x=>{if(/^(TON|TOF|TP|CTU|CTD)$/.test(x.op)&&x.a[0])dec.add(x.a[0])});
 P.forEach(x=>{if(!x.op)return;const a=x.a[0],o=x.op,ok=q=>W(q)||dec.has(q);
  if(/^(TON|TOF|TP|CTU|CTD)$/.test(o)){if(x.a.length!=2)return add(x.ln,o,`${o} requiere nombre y preset`);if(!(o[0]=='C'?/^C\d+$/:/^T\d+$/).test(a))add(x.ln,a,'Nombre inválido: use T1, T2… (temporizadores) o C1, C2… (contadores)');if(!num(x.a[1]))add(x.ln,x.a[1],'El preset debe ser un número')}
  else if(o=='RES'){if(!dec.has(a))add(x.ln,a||o,'El temporizador o contador no está definido')}
  else if(/^JMP/.test(o)){if(!lab.has(a))add(x.ln,a||o,'Etiqueta inexistente')}
  else if(x.a.length!=1)add(x.ln,o,`${o} requiere un operando`);
  else if(/^(ST|STN|S|R)$/.test(o)){if(!ok(a))no(x.ln,a);else if(ro.has(a))add(x.ln,a,'Una entrada no puede usarse como destino')}
  else if(!num(a)&&!ok(a))no(x.ln,a)});
 return R}
export function ilRun(P,io){let cr=0,pc=0,g=0;const lab={};P.forEach((x,i)=>{if(x.lab)lab[x.lab]=i});
 const val=a=>num(a)?+a:io.get(a),b=v=>v?1:0,out=(a,v)=>io.set(a,io.an.has(a)?v:+!!v);
 while(pc<P.length){if(++g>2000)throw Error('Salto excesivo en IL');const x=P[pc++];if(!x.op)continue;const a=x.a[0];
  switch(x.op){case'LD':cr=val(a);break;case'LDN':cr=+!val(a);break;case'ST':out(a,cr);break;case'STN':out(a,+!cr);break;case'S':if(cr)io.set(a,1);break;case'R':if(cr)io.set(a,0);break;
   case'AND':cr=b(cr&&val(a));break;case'ANDN':cr=b(cr&&!val(a));break;case'OR':cr=b(cr||val(a));break;case'ORN':cr=b(cr||!val(a));break;case'XOR':cr=b(!cr!=!val(a));break;case'XORN':cr=b(!cr!=!!val(a));break;
   case'ADD':cr+=val(a);break;case'SUB':cr-=val(a);break;case'MUL':cr*=val(a);break;case'DIV':cr=val(a)?cr/val(a):0;break;
   case'GT':cr=+(cr>val(a));break;case'LT':cr=+(cr<val(a));break;case'GE':cr=+(cr>=val(a));break;case'LE':cr=+(cr<=val(a));break;case'EQ':cr=+(cr==val(a));break;case'NE':cr=+(cr!=val(a));break;
   case'JMP':pc=lab[a];break;case'JMPC':if(cr)pc=lab[a];break;case'JMPCN':if(!cr)pc=lab[a];break;
   case'RES':inst('RES',[a],1,0,io.rt,io.get,io.set,io.dt);break;
   default:{const k='il'+x.ln,v=b(cr),rise=v&&!io.rt.prev[k];io.rt.prev[k]=v;inst(x.op,[a,x.a[1]],v,rise,io.rt,io.get,io.set,io.dt)}}}}
// Equivalencia: Ladder -> ST / IL (misma lógica, mismo modelo de memoria)
const tm=t=>t.cmp?`${t.cmp[0]} ${{'==':'=','!=':'<>'}[t.cmp[1]]||t.cmp[1]} ${t.cmp[2]}`:(t.nc?'NOT '+t.a:t.a),
 cond=r=>{const s=a=>a.map(tm).join(' AND '),m=s(r.m),q=s(r.b);return m&&q?`(${m}) OR (${q})`:m||q||'TRUE'};
export const toST=R=>R.map(r=>{if(r.e)return`(* Network ${r.n+1}: ${r.e} *)`;const c=cond(r),[a,b,d]=r.args,w=z=>`IF ${c} THEN ${z} END_IF;`;
 switch(r.ct){case'OUT':return`${a} := ${c};`;case'S':return w(`${a} := TRUE;`);case'R':return w(`${a} := FALSE;`);
  case'TON':case'TOF':case'TP':case'CTU':case'CTD':return`${r.ct}(${a}, ${c}, ${b});`;case'RES':return w(`RES(${a});`);
  case'MOVE':return w(`${b} := ${a};`);case'ADD':return w(`${d} := ${a} + ${b};`);case'SUB':return w(`${d} := ${a} - ${b};`)}}).join('\n');
export function toIL(R){let k=0;return R.map(r=>{if(r.e)return`(* Network ${r.n+1}: ${r.e} *)`;
 if(r.b.length||r.m.some(t=>t.cmp)||!r.m.length)return`(* Network ${r.n+1}: tiene rama paralela o comparador, use ST *)`;
 const [a,b,d]=r.args,L=r.m.map((t,j)=>(j?(t.nc?'ANDN ':'AND '):(t.nc?'LDN ':'LD '))+t.a),e='fin'+(++k),
 body={OUT:[`ST ${a}`],S:[`S ${a}`],R:[`R ${a}`],TON:[`TON ${a}, ${b}`],TOF:[`TOF ${a}, ${b}`],TP:[`TP ${a}, ${b}`],CTU:[`CTU ${a}, ${b}`],CTD:[`CTD ${a}, ${b}`],
  RES:[`JMPCN ${e}`,`RES ${a}`,`${e}:`],MOVE:[`JMPCN ${e}`,`LD ${a}`,`ST ${b}`,`${e}:`],ADD:[`JMPCN ${e}`,`LD ${a}`,`ADD ${b}`,`ST ${d}`,`${e}:`],SUB:[`JMPCN ${e}`,`LD ${a}`,`SUB ${b}`,`ST ${d}`,`${e}:`]}[r.ct];
 return [...L,...body].join('\n')}).join('\n')}

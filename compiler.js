// Analizador de expresiones, parser Ladder y compilador estático.
function tok(s){const r=[],re=/\s*(&&|\|\||>=|<=|==|!=|[()!<>]|\d+(?:\.\d+)?|[A-Za-z_][\w:.\/]*)/y;
 while(re.lastIndex<s.length){const at=re.lastIndex;if(/^\s*$/.test(s.slice(at)))break;const m=re.exec(s);if(!m)throw Error('Carácter no válido cerca de "'+s.slice(at,at+8).trim()+'"');r.push(m[1])}return r}
export function parse(s){const t=tok(String(s));let i=0;
 const or=()=>{let a=and();while(t[i]=='||'){i++;a=['|',a,and()]}return a},
 and=()=>{let a=cmp();while(t[i]=='&&'){i++;a=['&',a,cmp()]}return a},
 cmp=()=>{let a=un();if(['>','<','>=','<=','==','!='].includes(t[i])){const o=t[i++];a=[o,a,un()]}return a},
 un=()=>{if(t[i]=='!'){i++;return['!',un()]}return at()},
 at=()=>{const x=t[i++];if(x==null)throw Error('Expresión incompleta');if(x=='('){const e=or();if(t[i++]!=')')throw Error('Falta cerrar paréntesis');return e}
  if(/^\d/.test(x))return['n',+x];if(/^[A-Za-z_]/.test(x))return['v',x];throw Error('Operador inesperado "'+x+'"')};
 const r=or();if(i<t.length)throw Error('Sobra "'+t[i]+'"');return r}
export const vars=(a,o=[])=>{if(a[0]=='v')o.push(a[1]);else if(a[0]!='n')a.slice(1).forEach(x=>vars(x,o));return o};
export const run=(a,g)=>{switch(a[0]){case'n':return a[1];case'v':return g(a[1]);case'!':return +!run(a[1],g);
 case'&':return +!!(run(a[1],g)&&run(a[2],g));case'|':return +!!(run(a[1],g)||run(a[2],g));
 default:{const x=run(a[1],g),y=run(a[2],g);return +({'>':x>y,'<':x<y,'>=':x>=y,'<=':x<=y,'==':x==y,'!=':x!=y})[a[0]]}}};
// Acciones GRAFCET: "Q0.0", "S:Q0.1", "R:Q0.1", "QW64=60"
export const acts=s=>String(s).split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const m=x.match(/^(?:([SRsr]):\s*)?([^=\s]+)(?:\s*=\s*(\d+))?$/);return m?{m:m[1]&&m[1].toUpperCase(),a:m[2],v:m[3]==null?null:+m[3]}:{bad:x}});
// Ladder en texto: "I0.0 & !I0.1 | M0.0 -> M0.0", bobinas: "Q0.0", "S Q0.0", "R Q0.0"
export function parseLadder(txt){
 const T=s=>(s||'').split('&').map(t=>t.trim()).filter(Boolean).map(t=>({nc:t[0]=='!',a:t.replace(/^!\s*/,'')}));
 return txt.split('\n').map((l,i)=>({l:l.trim(),i})).filter(x=>x.l).map(({l,i},n)=>{
  const p=l.split('->');if(p.length!=2)return{n,i,l,e:'Falta "->" o hay más de una bobina'};
  const q=p[0].split('|');if(q.length>2)return{n,i,l,e:'Solo se admite una rama paralela por peldaño'};
  const c=p[1].trim().split(/\s+/);if(!c[0]||c.length>2)return{n,i,l,e:'Bobina con sintaxis incorrecta (use "Q0.0", "S Q0.0" o "R Q0.0")'};
  const ct=c.length==2?c[0].toUpperCase():'OUT';if(!['OUT','S','R'].includes(ct))return{n,i,l,e:'Tipo de bobina desconocido: '+c[0]};
  return{n,i,l,m:T(q[0]),b:T(q[1]),ct,ca:c[c.length-1]}})}
export function compile({ladder,g,HW,ip,mode,pid,hmi=[]}){
 const R=[],{all,ro,an}=HW,e=(sev,where,el,msg,line)=>R.push({sev,where,el,msg,line});
 if(ip)e('err','Red','PLC',ip);else e('info','Red','PLC','Parámetros de red válidos');
 {const c={};pid.forEach(o=>{if(o.bind)(c[o.bind]=c[o.bind]||[]).push(o.tag)});Object.entries(c).forEach(([a,t])=>{if(t.length>1)e('warn','P&ID',a,'Dirección asignada a varios elementos: '+t.join(', '))})}
 pid.forEach(o=>{if(o.bind&&!all.has(o.bind))e('err','P&ID',o.tag,'La dirección '+o.bind+' no existe en el hardware configurado');else if(o.io&&!o.bind)e('warn','P&ID',o.tag,'Elemento sin dirección asignada')});
 hmi.forEach(o=>{if(o.bind&&!all.has(o.bind))e('err','HMI',o.tag,'La variable '+o.bind+' no existe en el hardware configurado')});
 if(mode!='grafcet'){const rg=parseLadder(ladder),used={};
  if(!rg.length)e('warn','Ladder','—','El programa Ladder está vacío');else e('info','Ladder','—',rg.length+' peldaños analizados');
  rg.forEach(r=>{const w='Network '+(r.n+1);
   if(r.e)return e('err',w,r.l,r.e,r.i);
   const ts=[...r.m,...r.b];
   if(!ts.length)e('err',w,r.ca,'Peldaño sin contactos',r.i);
   ts.forEach(t=>{if(!all.has(t.a))e('err',w,t.a||'(vacío)','Dirección no válida o inexistente en el hardware',r.i);else if(an.has(t.a))e('warn',w,t.a,'Señal analógica usada como contacto',r.i)});
   if(!all.has(r.ca))e('err',w,r.ca,'Dirección de bobina no válida',r.i);
   else if(ro.has(r.ca))e('err',w,r.ca,'Una entrada no puede usarse como bobina',r.i);
   else if(r.ct=='OUT'){if(used[r.ca]!=null)e('warn',w,r.ca,'Bobina duplicada (también en Network '+(used[r.ca]+1)+')',r.i);used[r.ca]=r.n}})}
 if(mode!='ladder'){if(!g.length)e('warn','GRAFCET','—','No hay etapas definidas');else e('info','GRAFCET','—',g.length+' etapas analizadas');
  g.forEach((s,i)=>{const w='Etapa '+i;
   try{vars(parse(s.c)).forEach(v=>{if(v!='T'&&!all.has(v))e('err',w,v,'Variable de receptividad inexistente')})}catch(x){e('err',w,s.c,x.message)}
   if(!(s.n>=0&&s.n<g.length))e('err',w,'Salta a '+s.n,'La etapa destino no existe');
   acts(s.a).forEach(x=>{if(x.bad)return e('err',w,x.bad,'Acción con sintaxis incorrecta');if(!all.has(x.a))e('err',w,x.a,'Dirección de acción no válida');else if(ro.has(x.a))e('err',w,x.a,'Una entrada no puede ser una acción')})})}
 return{list:R,err:R.filter(r=>r.sev=='err').length,warn:R.filter(r=>r.sev=='warn').length}}

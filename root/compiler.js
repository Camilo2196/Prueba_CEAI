// Analizador de expresiones, parser Ladder y compilador estático.

function tok(s){
    const r=[],re=/\s*(&&|\|\||>=|<=|==|!=|[()!<>]|\d+(?:\.\d+)?|[A-Za-z_][\w:.\/]*)/y;
    while(re.lastIndex<s.length){
        const at=re.lastIndex;
        if(/^\s*$/.test(s.slice(at)))break;
        const m=re.exec(s);
        if(!m)throw Error('Carácter no válido cerca de "'+s.slice(at,at+8).trim()+'". Verifique la sintaxis.');
        r.push(m[1])
    }
    return r
}

export function parse(s){
    const t=tok(String(s));let i=0;
    const or=()=>{let a=and();while(t[i]=='||'){i++;a=['|',a,and()]}return a},
    and=()=>{let a=cmp();while(t[i]=='&&'){i++;a=['&',a,cmp()]}return a},
    cmp=()=>{let a=un();if(['>','<','>=','<=','==','!='].includes(t[i])){const o=t[i++];a=[o,a,un()]}return a},
    un=()=>{if(t[i]=='!'){i++;return['!',un()]}return at()},
    at=()=>{
        const x=t[i++];
        if(x==null)throw Error('Expresión incompleta: Asegúrese de proporcionar todos los operandos necesarios.');
        if(x=='('){
            const e=or();
            if(t[i++]!=')')throw Error('Falta cerrar paréntesis: Revise que cada "(" tenga su correspondiente ")".');
            return e
        }
        if(/^\d/.test(x))return['n',+x];
        if(/^[A-Za-z_]/.test(x))return['v',x];
        throw Error('Operador inesperado "'+x+'". Revise la estructura de la expresión.')
    };
    const r=or();
    if(i<t.length)throw Error('Sintaxis incorrecta: sobra el elemento "'+t[i]+'". Verifique la lógica.');
    return r
}

export const vars=(a,o=[])=>{if(a[0]=='v')o.push(a[1]);else if(a[0]!='n')a.slice(1).forEach(x=>vars(x,o));return o};

export const run=(a,g)=>{
    switch(a[0]){
        case'n':return a[1];
        case'v':return g(a[1]);
        case'!':return +!run(a[1],g);
        case'&':return +!!(run(a[1],g)&&run(a[2],g));
        case'|':return +!!(run(a[1],g)||run(a[2],g));
        default:{
            const x=run(a[1],g),y=run(a[2],g);
            return +({'>':x>y,'<':x<y,'>=':x>=y,'<=':x<=y,'==':x==y,'!=':x!=y})[a[0]]
        }
    }
};

// Acciones GRAFCET
export const acts=s=>String(s).split(',').map(x=>x.trim()).filter(Boolean).map(x=>{
    x=x.replace(/^([^=\s]+)\s*=\s*SET$/i,'S:$1').replace(/^([^=\s]+)\s*=\s*RESET$/i,'R:$1').replace(/\s*=\s*(ON|OPEN)$/i,'').replace(/\s*=\s*(OFF\vert{}CLOSE)$/i,'=0');
    const t=x.match(/^(T\d+)\s*=\s*(\d+(?:\.\d+)?)\s*s?$/i);if(t)return{tm:1,a:t[1].toUpperCase(),v:+t[2]};
    const m=x.match(/^(?:([SRsr]):\s*)?([^=\s]+)(?:\s*=\s*(\d+))?$/);return m?{m:m[1]&&m[1].toUpperCase(),a:m[2],v:m[3]==null?null:+m[3]}:{bad:x}
});

const CMP=/^(.+?)\s*(>=|<=|==|!=|>|<)\s*(.+)$/,ARG={OUT:1,S:1,R:1,TON:2,TOF:2,TP:2,CTU:2,CTD:2,RES:1,MOVE:2,ADD:3,SUB:3};

// Ladder en texto
export function parseLadder(txt){
    const T=s=>(s||'').split('&').map(t=>t.trim()).filter(Boolean).map(t=>{const c=t.match(CMP);return c?{nc:false,a:t,cmp:[c[1],c[2],c[3]]}:{nc:t[0]=='!',a:t.replace(/^!\s*/,'')}});
    return txt.split('\n').map((l,i)=>({l:l.trim(),i})).filter(x=>x.l).map(({l,i},n)=>{
        const p=l.split('->');
        if(p.length!=2)return{n,i,l,e:'Error de sintaxis: Falta la flecha de asignación "->" o hay más de una bobina en el network.'};
        const q=p[0].split('|');
        if(q.length>2)return{n,i,l,e:'Lógica inválida: Solo se admite una rama paralela principal por peldaño.'};
        
        const c=p[1].trim().split(/\s+/),k=c[0].toUpperCase(),ex=ARG[k]&&c.length>1,ct=ex?k:'OUT',args=ex?c.slice(1):c;
        if(!c[0]||args.length!=ARG[ct])return{n,i,l,e:`Error de instrucción: La instrucción ${ct} requiere ${ARG[ct]} operando(s).`};
        return{n,i,l,m:T(q[0]),b:T(q[1]),ct,args,ca:args[args.length-1]}
    })
}

export function compile({ladder,g,HW,ip,mode,pid,hmi=[],vt=[]}){
    const R=[],{all,ro,an}=HW,e=(sev,where,el,msg,line)=>R.push({sev,where,el,msg,line});
    const rg=parseLadder(ladder),dec=new Set(),W=a=>all.has(a)||dec.has(a),num=x=>/^-?\d+(\.\d+)?$/.test(x);
    
    if(mode!='grafcet')rg.forEach(r=>{if(!r.e&&/^(TON|TOF|TP|CTU|CTD)$/.test(r.ct))dec.add(r.args[0])});
    if(mode!='ladder')g.forEach(s=>acts(s.a).forEach(x=>{if(x.tm)dec.add(x.a)}));
    
    {const nm={};vt.forEach(v=>{
        if(!/^[A-Za-z_]\w*$/.test(v.name))e('err','Variables',v.name||'(vacío)','Nombre de variable no válido. Use únicamente letras, números o guión bajo.');
        else if(nm[v.name])e('err','Variables',v.name,'Nombre de variable duplicado. Cada TAG debe ser único.');
        nm[v.name]=1;
        if(!W(v.addr))e('err','Variables',v.name,'La dirección '+v.addr+' no existe en la configuración actual del PLC (Verifique el hardware).')
    })}
    
    if(ip)e('err','Red','PLC',ip);else e('info','Red','PLC','Parámetros de red válidos');
    
    {const c={};pid.forEach(o=>{if(o.bind)(c[o.bind]=c[o.bind]||[]).push(o.tag)});Object.entries(c).forEach(([a,t])=>{if(t.length>1)e('warn','P&ID',a,'Dirección asignada a varios elementos: '+t.join(', '))})}
    
    pid.forEach(o=>{if(o.bind&&!all.has(o.bind))e('err','P&ID',o.tag,'La dirección '+o.bind+' no existe en el hardware configurado');else if(o.io&&!o.bind)e('warn','P&ID',o.tag,'Elemento sin dirección asignada')});
    hmi.forEach(o=>{if(o.bind&&!all.has(o.bind))e('err','HMI',o.tag,'La variable '+o.bind+' no existe en el hardware configurado')});
    
    if(mode!='grafcet'){
        const used={};
        if(!rg.length)e('warn','Ladder','—','El programa Ladder está vacío. Se recomienda agregar peldaños.');else e('info','Ladder','—',rg.length+' peldaños analizados');
        
        rg.forEach(r=>{
            const w='Network '+(r.n+1),bad=(el,msg)=>e('err',w,el,msg,r.i),no=a=>bad(a||'(vacío)','La dirección de memoria '+(a||'')+' no existe en la configuración actual del PLC.');
            if(r.e)return bad(r.l,r.e);
            const ts=[...r.m,...r.b],[a,b,c]=r.args,wr=x=>{if(!W(x))no(x);else if(ro.has(x))bad(x,'Error lógico: Una entrada no puede usarse como destino (escritura).')},rd=x=>{if(!num(x)&&!W(x))no(x)};
            
            if(!ts.length)bad(a,'Peldaño inválido: Falta definir condiciones (contactos) antes de la salida.');
            
            ts.forEach(t=>{if(t.cmp)t.cmp.forEach((x,k)=>{if(k!=1)rd(x)});else if(!W(t.a))no(t.a);else if(an.has(t.a))e('warn',w,t.a,'Señal analógica usada como contacto digital puede tener comportamientos impredecibles.',r.i)});
            
            switch(r.ct){
                case'OUT':wr(a);if(all.has(a)&&!ro.has(a)){if(used[a]!=null)e('warn',w,a,'Bobina duplicada (también definida en Network '+(used[a]+1)+'). Esto sobrescribirá su valor.',r.i);used[a]=r.n}break;
                case'S':case'R':wr(a);break;
                case'TON':case'TOF':case'TP':case'CTU':case'CTD':if(!(r.ct[0]=='C'?/^C\d+$/:/^T\d+$/).test(a))bad(a,'Nombre de variable inválido: utilice el prefijo correcto (T1, T2… para temporizadores o C1, C2… para contadores).');if(!num(b)||+b<0)bad(b,'El parámetro Preset debe ser un número positivo.');break;
                case'RES':if(!dec.has(a))bad(a,'Error de referencia: El temporizador o contador indicado no está definido en el programa.');break;
                case'MOVE':rd(a);wr(b);break;case'ADD':case'SUB':rd(a);rd(b);wr(c)
            }
        })
    }
    
    if(mode!='ladder'){
        if(!g.length)e('warn','GRAFCET','—','El diseño del GRAFCET está vacío. Debe agregar al menos una etapa.');else e('info','GRAFCET','—',g.length+' etapas analizadas');
        
        g.forEach((s,i)=>{
            const w='Etapa '+i;
            try{vars(parse(s.c)).forEach(v=>{if(v!='T'&&!W(v))e('err',w,v,'La variable '+v+' no existe en la configuración actual del PLC.')})}catch(x){e('err',w,s.c,x.message)}
            if(!(s.n>=0&&s.n<g.length))e('err',w,'Salta a etapa '+s.n,'La etapa de destino indicada en el salto no existe. Revise la numeración.');
            
            acts(s.a).forEach(x=>{
                if(x.bad)return e('err',w,x.bad,'Acción con sintaxis incorrecta. Revise la escritura de la asignación.');
                if(x.tm)return;
                if(!W(x.a))e('err',w,x.a,'La dirección '+x.a+' no existe en la configuración actual del PLC.');
                else if(ro.has(x.a))e('err',w,x.a,'Conflicto lógico: Una entrada física no puede definirse como una acción (salida) de la etapa.')
            })
        })
    }
    return{list:R,err:R.filter(r=>r.sev=='err').length,warn:R.filter(r=>r.sev=='warn').length,dec:[...dec]}
}

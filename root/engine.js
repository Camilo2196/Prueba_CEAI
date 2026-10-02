// Motor de ejecución sin DOM: Ladder (contactos, comparadores, temporizadores, contadores, aritmética) y GRAFCET.
import {run,acts} from './compiler.js';

export const newRT=()=>({T:{},C:{},prev:{}});
const num=x=>/^-?\d+(\.\d+)?$/.test(x),val=(x,get)=>num(x)?+x:get(x);

export const tv=(t,get)=>{
    if(t.cmp){
        const x=val(t.cmp[0],get),y=val(t.cmp[2],get);
        return({'>':x>y,'<':x<y,'>=':x>=y,'<=':x<=y,'==':x==y,'!=':x!=y})[t.cmp[1]]
    }
    return t.nc?!get(t.a):!!get(t.a)
};

export const power=(r,get)=>+!!((r.m.length&&r.m.every(t=>tv(t,get)))||(r.b.length&&r.b.every(t=>tv(t,get))));

function tim(k,n,pv,v,rise,rt,set,dt){
    // dt dinámico desde el motor requestAnimationFrame garantiza precisión sin desfasajes
    const t=rt.T[n]=rt.T[n]||{el:k=='TOF'?pv:0};
    if(k=='TON'){
        t.el=v?Math.min(t.el+dt,pv):0;
        set(n,+(v&&t.el>=pv))
    }
    else if(k=='TOF'){
        if(v){t.el=0;set(n,1)}
        else{t.el=Math.min(t.el+dt,pv);set(n,+(t.el<pv))}
    }
    else{
        if(rise&&!t.run){t.run=1;t.el=0}
        if(t.run){t.el+=dt;if(t.el>=pv){t.run=0;t.el=pv}}
        set(n,+!!t.run)
    }
}

export function rung(r,i,rt,get,set,dt){
    const v=power(r,get),rise=v&&!rt.prev[i];
    rt.prev[i]=v;
    inst(r.ct,r.args,v,rise,rt,get,set,dt)
}

export function inst(ct,[a,b,c],v,rise,rt,get,set,dt){
    switch(ct){
        case'OUT':set(a,v);break;
        case'S':if(v)set(a,1);break;
        case'R':if(v)set(a,0);break;
        case'TON':case'TOF':case'TP':tim(ct,a,+b,v,rise,rt,set,dt);break;
        case'CTU':case'CTD':{
            const d=ct=='CTD',k=rt.C[a]=rt.C[a]||{v:d?+b:0,d,pv:+b};
            if(rise)k.v+=d?-1:1;
            set(a,+(d?k.v<=0:k.v>=+b));break
        }
        case'RES':if(v){
            const k=rt.C[a],t=rt.T[a];
            if(k){k.v=k.d?k.pv:0;set(a,0)}
            if(t){t.el=0;t.run=0;set(a,0)}
        }break;
        case'MOVE':if(v)set(b,val(a,get));break;
        case'ADD':if(v)set(c,val(a,get)+val(b,get));break;
        case'SUB':if(v)set(c,val(a,get)-val(b,get))
    }
}

export function grafcet(L,rt,get,set,dt){
    const g=L.g,n=a=>a=='T'?rt.gT:get(a);
    rt.gT+=dt;
    const gp=L.gp[rt.act];
    if(gp&&run(gp,n)){
        rt.act=Math.max(0,Math.min(g.length-1,+g[rt.act].n));
        rt.gT=0
    }
    const lv=new Set();
    g.forEach(s=>acts(s.a).forEach(x=>{if(!x.bad&&!x.tm&&x.v==null&&!x.m)lv.add(x.a)}));
    lv.forEach(a=>set(a,0));
    
    g.forEach((s,i)=>acts(s.a).forEach(x=>{
        if(x.bad)return;
        if(x.tm)tim('TON',x.a,x.v,i==rt.act?1:0,0,rt,set,dt);
        else if(i==rt.act){
            if(x.v!=null)set(x.a,x.v);
            else set(x.a,x.m=='R'?0:1)
        }
    }))
}

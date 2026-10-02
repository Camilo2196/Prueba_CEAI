// Catálogo de PLC y generación de direcciones por fabricante/familia/modelo/módulos.
export const MODS={'DI 16x24VDC':{di:16},'DQ 16x24VDC':{do:16},'AI 4xU/I':{ai:4},'AQ 2xU/I':{ao:2}};
const B=(n,o)=>({n,...o});
export const PLCS={
 'S7-1200 CPU 1215C AC/DC/RLY':{brand:'Siemens',fam:'S7-1200',fmt:'S7',ip:'192.168.0.1',mem:'125 KB',slots:8,sm:8,aio:64,base:[B('CPU 1215C integrado',{di:14,do:10,ai:2,ao:2})]},
 'S7-1500 CPU 1513-1 PN':{brand:'Siemens',fam:'S7-1500',fmt:'S7',ip:'192.168.0.1',mem:'300 KB',slots:12,aio:0,base:[B('DI 16x24VDC',{di:16}),B('DQ 16x24VDC',{do:16}),B('AI 4xU/I',{ai:4}),B('AQ 2xU/I',{ao:2})]},
 'LOGO! 8':{brand:'Siemens',fam:'LOGO!',fmt:'LG',ip:'192.168.0.3',mem:'400 bloques',slots:0,base:[B('LOGO! 8 integrado',{di:8,do:4,ai:4,ao:0})]},
 'MicroLogix 1400':{brand:'Allen-Bradley',fam:'MicroLogix',fmt:'ML',ip:'192.168.1.10',mem:'20 KB',slots:0,base:[B('1766-L32 integrado',{di:20,do:12})]},
 'CompactLogix L32E':{brand:'Allen-Bradley',fam:'CompactLogix',fmt:'CL',ip:'192.168.1.20',mem:'750 KB',slots:8,base:[B('1769-IQ16',{di:16}),B('1769-OB16',{do:16}),B('1769-IF4',{ai:4}),B('1769-OF2',{ao:2})]}};
const ADR={
 S7:{DI:i=>`I${i>>3}.${i&7}`,DO:i=>`Q${i>>3}.${i&7}`,AI:i=>`IW${i}`,AO:i=>`QW${i}`},
 LG:{DI:i=>`I${i+1}`,DO:i=>`Q${i+1}`,AI:i=>`AI${i+1}`,AO:i=>`AQ${i+1}`},
 ML:{DI:i=>`I:0/${i}`,DO:i=>`O:0/${i}`,AI:i=>`I:4.${i}`,AO:i=>`O:4.${i}`},
 CL:{DI:(i,l,s)=>`Local:${s}:I.Data.${l}`,DO:(i,l,s)=>`Local:${s}:O.Data.${l}`,AI:(i,l,s)=>`Local:${s}:I.Ch${l}Data`,AO:(i,l,s)=>`Local:${s}:O.Ch${l}Data`}};
const MEM={S7:[32,i=>`M${i>>3}.${i&7}`],LG:[27,i=>`M${i+1}`],ML:[16,i=>`B3:0/${i}`],CL:[16,i=>`Marca${i}`]};
// Siemens S7: bytes consecutivos por módulo (I0.0…I0.7, I1.0…). En S7-1200 los módulos de señales arrancan en el byte 8.
export function layout(model,extra=[]){
 const p=PLCS[model],mods=[...p.base,...extra.map(n=>B(n,MODS[n]))],s7=p.fmt=='S7',A={DI:[],DO:[],AI:[],AO:[],M:[],W:[]},rows=[],st={DI:0,DO:0,AI:p.aio||0,AO:p.aio||0};
 mods.forEach((m,s)=>{
  if(p.sm&&s==1)st.DI=st.DO=p.sm*8;
  const rng=[];
  [['DI','di'],['DO','do'],['AI','ai'],['AO','ao']].forEach(([k,f])=>{
   const n=m[f]||0,an=k[0]=='A',l=[];
   for(let i=0;i<n;i++)l.push(ADR[p.fmt][k](st[k]+(s7&&an?2*i:i),i,s+1));
   if(n){A[k].push(...l);rng.push(`${k} ${l[0]}…${l[n-1]}`);st[k]=s7?(an?st[k]+2*n:Math.ceil((st[k]+n)/8)*8):st[k]+n}});
  rows.push({slot:s+1,n:m.n,rng})});
 const [nm,fm]=MEM[p.fmt];for(let i=0;i<nm;i++)A.M.push(fm(i));
 const WF={S7:i=>`MW${10+2*i}`,LG:i=>`AM${i+1}`,ML:i=>`N7:${i}`,CL:i=>`Dato${i}`}[p.fmt];for(let i=0;i<4;i++)A.W.push(WF(i));
 return{A,rows,p,all:new Set([...A.DI,...A.DO,...A.AI,...A.AO,...A.M,...A.W]),ro:new Set([...A.DI,...A.AI]),an:new Set([...A.AI,...A.AO,...A.W])}}

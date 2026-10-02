// hmi.js - Lógica de Zoom y Widgets para el sistema HMI/SCADA
import { ISA, ins } from './isa.js';

export function zoomer(el, w, h, cb) {
    const vw = { x: 0, y: 0, z: 1 };
    return {
        vw,
        n: () => vw.z,
        pt: (cx, cy) => {
            const r = el.getBoundingClientRect();
            const k = (w / vw.z) / r.width;
            return { x: vw.x + (cx - r.left) * k, y: vw.y + (cy - r.top) * k };
        },
        zoom: (f) => {
            vw.z = Math.max(0.3, Math.min(4, vw.z * f));
            if (cb) cb();
        },
        fit: () => {
            vw.x = 0; vw.y = 0; vw.z = 1;
            if (cb) cb();
        }
    };
}

export const WID = {
    'tank': { n: 'Tanque', k: 'an', w: 60, h: 80, r: (o, v) => `<rect x="0" y="0" width="60" height="80" fill="none" stroke="var(--cy)" stroke-width="2"/><rect x="2" y="${78 - (Math.max(0, Math.min(100, v)) / 100) * 76}" width="56" height="${(Math.max(0, Math.min(100, v)) / 100) * 76}" fill="#27e0ff55"/>` },
    'gauge': { n: 'Indicador', k: 'an', w: 60, h: 60, r: (o, v) => { const a = -135 + (Math.max(0, Math.min(100, v)) / 100) * 270; return `<circle cx="30" cy="30" r="28" fill="#0a1a2b" stroke="var(--cy)" stroke-width="2"/><text x="30" y="45" text-anchor="middle" font-size="12" fill="var(--cy)">${Math.round(v)}</text><line x1="30" y1="30" x2="${30+20*Math.sin(a*Math.PI/180)}" y2="${30-20*Math.cos(a*Math.PI/180)}" stroke="var(--rd)" stroke-width="2"/>`; } },
    'motor': { n: 'Motor', k: 'bit', w: 40, h: 40, r: (o, v) => `<circle cx="20" cy="20" r="20" fill="${v?'var(--ok)':'#22313f'}" stroke="var(--cy)" stroke-width="2"/><text x="20" y="24" text-anchor="middle" fill="#fff">M</text>` },
    'val': { n: 'Válvula', k: 'bit', w: 40, h: 30, r: (o, v) => `<path d="M0 0L40 30V0L0 30Z" fill="${v?'var(--ok)':'#22313f'}" stroke="var(--cy)" stroke-width="2"/>` },
    'lamp': { n: 'Lámpara', k: 'bit', w: 30, h: 30, r: (o, v) => `<circle cx="15" cy="15" r="15" fill="${v?'var(--ok)':'#22313f'}" stroke="var(--cy)" stroke-width="2"/>` },
    'btn': { n: 'Pulsador', k: 'bit', wr: true, w: 40, h: 40, r: (o, v) => `<rect x="10" y="10" width="20" height="20" rx="5" fill="${v?'var(--ok)':'#0c2a40'}" stroke="var(--cy)" stroke-width="2"/><circle cx="20" cy="20" r="6" fill="${v?'#fff':'var(--rd)'}"/>` },
    'sw': { n: 'Interruptor', k: 'bit', wr: true, w: 40, h: 20, r: (o, v) => `<rect x="0" y="0" width="40" height="20" rx="10" fill="${v?'var(--ok)':'#22313f'}" stroke="var(--cy)" stroke-width="2"/><circle cx="${v?30:10}" cy="10" r="8" fill="#fff"/>` },
    'sym': { n: 'Símbolo ISA', w: 60, h: 60, r: (o) => `<g>${ISA[o.sym] ? (ISA[o.sym].inst ? ins({tag: o.label || '', loc: 'F'}) : ISA[o.sym].s) : ''}</g>` }
};

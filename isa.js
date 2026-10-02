// isa.js - Librería de símbolos ISA 5.1 y componentes de planta
export const CATS = ['Equipos', 'Válvulas', 'Campo', 'Panel', 'DCS', 'PLC', 'E/S'];

export const KINDS = {
    'p': ['Tubería principal', '#3d6b93', 3, 'none'],
    's': ['Tubería secundaria', '#3d6b93', 1, 'none'],
    'e': ['Señal eléctrica', '#7f97ad', 1, '4 4'],
    'd': ['Señal de software', '#7f97ad', 1, '2 2']
};

export const LET1 = [
    ['F', 'Caudal'], ['L', 'Nivel'], ['P', 'Presión'], 
    ['T', 'Temperatura'], ['V', 'Vibración'], ['Z', 'Posición']
];

export const LET2 = [
    ['C', 'Controlador'], ['I', 'Indicador'], ['T', 'Transmisor'], 
    ['A', 'Alarma'], ['V', 'Válvula'], ['S', 'Interruptor']
];

export const ins = (o) => {
    const l = o.tag || '';
    const t = (y) => `<text x="30" y="${y}" text-anchor="middle">${l}</text>`;
    const c = '<circle cx="30" cy="30" r="15" fill="#0a1a2b"/>';
    if (o.loc === 'F') return c + t(34);
    if (o.loc === 'P') return c + '<line x1="15" y1="30" x2="45" y2="30"/>' + t(26);
    if (o.loc === 'D') return '<rect x="10" y="10" width="40" height="40" fill="#0a1a2b"/>' + c + t(34);
    return '<rect x="10" y="10" width="40" height="40" fill="#0a1a2b"/><path d="M30 14L46 30L30 46L14 30Z"/>' + t(34); // PLC 'C'
};

export const ISA = {
    'tank': { n: 'Tanque', c: 'Equipos', p: 'TK', s: '<path d="M14 10V46Q30 58 46 46V10Q30 2 14 10Z"/>' },
    'pump': { n: 'Bomba', c: 'Equipos', p: 'P', s: '<circle cx="30" cy="30" r="15"/><path d="M30 15H50M21 40L30 22L39 40"/>', io: 'DO' },
    'motor': { n: 'Motor', c: 'Equipos', p: 'M', s: '<circle cx="30" cy="30" r="15"/><text x="30" y="34" text-anchor="middle">M</text>', io: 'DO' },
    'globe': { n: 'Válvula manual', c: 'Válvulas', p: 'V', s: '<path d="M10 20L50 40V20L10 40Z"/><circle cx="30" cy="30" r="4" fill="#050a12"/>' },
    'valve': { n: 'Válvula de bloqueo', c: 'Válvulas', p: 'V', s: '<path d="M10 20L50 40V20L10 40Z"/>', io: 'DO' },
    'cvalve': { n: 'Válvula de control', c: 'Válvulas', p: 'CV', s: '<path d="M10 30L50 50V30L10 50Z"/><path d="M30 40V22M20 22a10 10 0 0 1 20 0Z"/>', io: 'AO' },
    'check': { n: 'Válvula de retención', c: 'Válvulas', p: 'CK', s: '<path d="M10 30H50M36 20L22 30L36 40Z"/>' },
    'inst': { n: 'Instrumento ISA', c: 'Campo', p: 'IT', inst: 'IT' },
    'pb': { n: 'Pulsador', c: 'E/S', p: 'HS', s: '<rect x="14" y="26" width="32" height="10"/><path d="M30 26V14M20 14H40"/>', io: 'DI' },
    'lamp': { n: 'Lámpara piloto', c: 'E/S', p: 'XL', s: '<circle cx="30" cy="30" r="15"/><path d="M19 19L41 41M41 19L19 41"/>', io: 'DO' }
};

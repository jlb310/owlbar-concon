// Datos de la demo, compartidos por las 4 pantallas.
// Todo vive en localStorage de quien prueba la demo: no hay servidor.
// Lo que se edita en un administrador aparece en la carta; los pedidos y las
// reservas hechas desde la carta llegan al administrador, y cada cambio de
// estado del pedido le llega al cliente con la hora y el motivo.

const NS = 'owlbar-demo:v1:';
export const PREF = 'owlbar-demo:pref:';
export const clp = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(Number(n) || 0)).toLocaleString('es-CL');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fotos: de assets/ o de Unsplash (solo el id).
export function fotoUrl(f, w = 600) {
  if (!f) return '';
  if (/^(https?:|assets\/)/.test(f)) return f;
  return `https://images.unsplash.com/photo-${f}?w=${w}&q=70&auto=format&fit=crop`;
}

const haceMin = (m) => new Date(Date.now() - m * 60000).toISOString();
const isoChile = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
export const hoyIso = () => isoChile(new Date());
export const enDias = (n) => { const f = new Date(); f.setDate(f.getDate() + n); return isoChile(f); };

// Búho de la marca (mismo trazo que la landing).
export const BUHO = '<svg class="buho" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 9l6 5h12l6-5v15c0 7.7-5.4 12-12 12S8 31.7 8 24z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="15" cy="21" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="25" cy="21" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="15" cy="21" r="1.4" fill="currentColor"/><circle cx="25" cy="21" r="1.4" fill="currentColor"/><path d="M18.5 27l1.5 2 1.5-2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
export const LOGO = `<span class="logo-owl">${BUHO}<span>OWL <em>BAR</em></span></span>`;

// Grupos de opciones reutilizables. Cada opción suma (o resta) al precio.
const PUNTO = { grupo: 'Punto de la carne', items: [{ n: 'A punto', p: 0 }, { n: 'Tres cuartos', p: 0 }, { n: 'Bien cocida', p: 0 }] };
const ACOMP = { grupo: 'Acompañamiento', items: [{ n: 'Papas rústicas', p: 0 }, { n: 'Papas Owl', p: 2500 }, { n: 'Ensalada verde', p: 0 }] };
const EXTRAS_BURGER = { grupo: 'Extras', multi: true, items: [{ n: 'Tocino', p: 1500 }, { n: 'Huevo frito', p: 1000 }, { n: 'Doble carne', p: 3500 }, { n: 'Sin cebolla', p: 0 }, { n: 'Pan sin gluten', p: 1500 }] };
const SALSAS = { grupo: 'Salsas', multi: true, items: [{ n: 'BBQ ahumada', p: 0 }, { n: 'Dip de la casa', p: 0 }, { n: 'Picante', p: 0 }, { n: 'Salsa extra', p: 800 }] };
const GIN = { grupo: 'Gin', items: [{ n: 'Gin de la casa', p: 0 }, { n: 'Tanqueray', p: 1500 }, { n: 'Hendrick’s', p: 3000 }] };
const PROMO_NO = 'Es una promoción del after office: precio cerrado, sin cambios. Si quieres algo distinto, pide los productos por separado.';

function semilla() {
  return {
    local: {
      nombre: 'OWL BAR',
      tipo: 'Bar & cocina · Concón',
      direccion: 'Concón, Región de Valparaíso',
      horario: 'Todos los días · 12:30 a 00:30 · cocina hasta 23:45',
      telefono: '+56 9 5164 5582',
      whatsapp: '56951645582',
      instagram: 'https://www.instagram.com/owlbar.cl/',
      sitio: 'https://owlbar-concon.vercel.app/landing/',
      titulo: 'La noche empieza aquí',
      frase: 'Cocteles bien hechos, cerveza artesanal y cocina de bar hasta pasada la medianoche.',
      tema: 'noche',
      // Pedidos online: tiempo de espera que ve el cliente antes de pedir y pausa cuando la cocina se satura.
      espera: 35,
      pausa: false,
      despacho: 2500,
      reseñaGoogle: 'https://www.google.com/maps/search/?api=1&query=OWL+BAR+Conc%C3%B3n',
    },
    categorias: [
      { id: 'compartir', nombre: 'Para compartir', icono: '🍟' },
      { id: 'burgers', nombre: 'Hamburguesas y sándwiches', icono: '🍔' },
      { id: 'platos', nombre: 'Platos', icono: '🍖' },
      { id: 'promos', nombre: 'Promos', icono: '⭐' },
      { id: 'cocteles', nombre: 'Cocteles', icono: '🍸' },
      { id: 'cervezas', nombre: 'Cervezas', icono: '🍺' },
      { id: 'sin-alcohol', nombre: 'Sin alcohol', icono: '🍋' },
    ],
    // estado: disponible | agotado (se ve con el motivo, pero no se puede pedir) | oculto
    // delivery: false → solo en el local (no viaja bien).
    productos: [
      { id: 'papas-owl', nombre: 'Papas Owl', precio: 7900, cat: 'compartir', etiqueta: 'La favorita', tags: [], desc: 'Papas rústicas, cheddar, tocino y cebollín.', foto: '1485962398705-ef6a13c41e8f', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Tamaño', items: [{ n: 'Para 2', p: 0 }, { n: 'Para 4', p: 4000 }] }, SALSAS] },
      { id: 'alitas', nombre: 'Alitas BBQ', precio: 9900, cat: 'compartir', etiqueta: 'Más pedido', tags: ['picante'], desc: '8 unidades, salsa BBQ ahumada y dip de la casa.', foto: '1767065703745-f3c33524605a', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Salsa', items: [{ n: 'BBQ ahumada', p: 0 }, { n: 'Buffalo picante', p: 0 }, { n: 'Miel mostaza', p: 0 }] }, { grupo: 'Cantidad', items: [{ n: '8 unidades', p: 0 }, { n: '16 unidades', p: 8500 }] }] },
      { id: 'nachos', nombre: 'Nachos de la casa', precio: 8500, cat: 'compartir', etiqueta: '', tags: ['veggie'], desc: 'Totopos, cheddar fundido, pico de gallo, guacamole y crema ácida.', foto: '', emoji: '🌮', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Agregado', items: [{ n: 'Sin agregado', p: 0 }, { n: 'Carne mechada', p: 2500 }, { n: 'Pollo', p: 2000 }] }] },
      { id: 'tabla-owl', nombre: 'Tabla Owl', precio: 18900, cat: 'compartir', etiqueta: 'Para 3 o 4', tags: [], desc: 'Alitas, aros de cebolla, papas rústicas, mini empanadas de queso y tres salsas.', foto: '', emoji: '🍗', estado: 'disponible', cambios: true, opciones: [] },
      { id: 'burger-owl', nombre: 'Hamburguesa Owl', precio: 11900, cat: 'burgers', etiqueta: 'De la casa', tags: [], desc: 'Carne, cheddar, cebolla crispy y salsa de la casa. Con papas rústicas.', foto: '1607013251379-e6eecfffe234', estado: 'disponible', cambios: true, opciones: [PUNTO, ACOMP, EXTRAS_BURGER] },
      { id: 'burger-trufa', nombre: 'Hamburguesa trufada', precio: 13500, cat: 'burgers', etiqueta: '', tags: [], desc: 'Carne, queso gruyère, champiñones salteados y mayo de trufa.', foto: '', emoji: '🍔', estado: 'disponible', cambios: true, opciones: [PUNTO, ACOMP, EXTRAS_BURGER] },
      { id: 'burger-veggie', nombre: 'Burger de garbanzos', precio: 10500, cat: 'burgers', etiqueta: '', tags: ['veggie'], desc: 'Medallón de garbanzos y quinoa, palta, tomate y mayo de ajo.', foto: '', emoji: '🥙', estado: 'disponible', cambios: true, opciones: [ACOMP] },
      { id: 'mechada', nombre: 'Sándwich de mechada', precio: 10900, cat: 'burgers', etiqueta: '', tags: [], desc: 'Carne mechada, queso derretido y pebre en marraqueta.', foto: '', emoji: '🥪', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Estilo', items: [{ n: 'Queso', p: 0 }, { n: 'Italiana (palta, tomate, mayo)', p: 1500 }, { n: 'Barros Luco', p: 0 }] }, ACOMP] },
      { id: 'costillar', nombre: 'Costillar BBQ', precio: 15900, cat: 'platos', etiqueta: '', tags: [], desc: 'Medio costillar de cerdo ahumado, glaseado en BBQ, con papas rústicas y coleslaw.', foto: '', emoji: '🍖', estado: 'agotado', motivoAgotado: 'Se terminó el ahumado de hoy. Mañana desde las 12:30. Te recomendamos la Tabla Owl.', cambios: true, opciones: [] },
      { id: 'fish-chips', nombre: 'Fish & chips', precio: 12900, cat: 'platos', etiqueta: '', tags: [], desc: 'Reineta apanada en cerveza, papas rústicas y salsa tártara.', foto: '', emoji: '🐟', estado: 'disponible', cambios: true, opciones: [] },
      { id: 'ensalada', nombre: 'Ensalada César con pollo', precio: 9900, cat: 'platos', etiqueta: '', tags: [], desc: 'Lechuga, pollo grillado, crutones, parmesano y aderezo César.', foto: '', emoji: '🥗', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Ajustes', multi: true, items: [{ n: 'Sin crutones', p: 0 }, { n: 'Aderezo aparte', p: 0 }, { n: 'Sin pollo (veggie)', p: -2000 }] }] },
      { id: 'promo-burger', nombre: 'Promo Owl para 2', precio: 24900, cat: 'promos', etiqueta: 'After office', tags: [], desc: '2 Hamburguesas Owl, Papas Owl para 2 y 2 schops.', foto: '', emoji: '⭐', estado: 'disponible', cambios: false, motivoCambios: PROMO_NO, opciones: [] },
      { id: 'gin-tonic', nombre: 'Gin tonic', precio: 7500, cat: 'cocteles', etiqueta: 'De la barra', tags: [], desc: 'Gin, tónica premium, pomelo y romero.', foto: '1675370734208-120b43d3c7ac', estado: 'disponible', cambios: true, delivery: false, opciones: [GIN, { grupo: 'Tónica', items: [{ n: 'Tónica normal', p: 0 }, { n: 'Tónica zero', p: 0 }] }] },
      { id: 'moscow', nombre: 'Moscow mule', precio: 7500, cat: 'cocteles', etiqueta: '', tags: [], desc: 'Vodka, ginger beer, limón y menta.', foto: '1527628126150-086ff233b951', estado: 'disponible', cambios: true, delivery: false, opciones: [] },
      { id: 'old-fashioned', nombre: 'Old fashioned', precio: 8900, cat: 'cocteles', etiqueta: '', tags: [], desc: 'Bourbon, azúcar, amargo de angostura y piel de naranja.', foto: '1770164491578-09f08156db2d', estado: 'disponible', cambios: true, delivery: false, opciones: [] },
      { id: 'negroni', nombre: 'Negroni', precio: 8500, cat: 'cocteles', etiqueta: '', tags: [], desc: 'Gin, Campari y vermut rojo.', foto: '1776018396028-d40694777383', estado: 'disponible', cambios: true, delivery: false, opciones: [] },
      { id: 'cerveza', nombre: 'Cerveza artesanal', precio: 4900, cat: 'cervezas', etiqueta: '', tags: [], desc: 'Schop de 500 cc. Las variedades rotan según la semana.', foto: '1777558578003-e65755409d8e', estado: 'disponible', cambios: true, delivery: false, opciones: [{ grupo: 'Variedad de hoy', items: [{ n: 'Golden ale', p: 0 }, { n: 'IPA', p: 500 }, { n: 'Stout', p: 500 }] }] },
      { id: 'cerveza-lata', nombre: 'Cerveza en lata', precio: 3500, cat: 'cervezas', etiqueta: 'Para llevar', tags: [], desc: 'Artesanal local, 470 cc.', foto: '', emoji: '🥫', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Variedad', items: [{ n: 'Golden ale', p: 0 }, { n: 'IPA', p: 0 }] }] },
      { id: 'limonada', nombre: 'Limonada', precio: 3900, cat: 'sin-alcohol', etiqueta: '', tags: ['veggie'], desc: 'Limón y hielo, con menta o jengibre.', foto: '', emoji: '🍋', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Sabor', items: [{ n: 'Menta', p: 0 }, { n: 'Jengibre', p: 0 }, { n: 'Menta y jengibre', p: 0 }] }] },
      { id: 'mocktail', nombre: 'Mocktail del búho', precio: 5500, cat: 'sin-alcohol', etiqueta: 'Sin alcohol', tags: ['veggie'], desc: 'Maracuyá, ginger beer, limón y romero.', foto: '', emoji: '🍹', estado: 'disponible', cambios: true, delivery: false, opciones: [] },
      { id: 'bebida', nombre: 'Bebida en lata', precio: 2200, cat: 'sin-alcohol', etiqueta: '', tags: ['veggie'], desc: '350 cc.', foto: '', emoji: '🥤', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Sabor', items: [{ n: 'Coca-Cola', p: 0 }, { n: 'Coca-Cola zero', p: 0 }, { n: 'Sprite', p: 0 }] }] },
    ],
    // Pedidos para llevar (delivery o retiro). Cada cambio queda en el historial que ve el cliente.
    pedidos: [
      {
        id: 2070, tipo: 'delivery', cliente: 'Fernanda', telefono: '+56 9 8123 4567', direccion: 'Av. Borgoño 21.600, depto 504', nota: '',
        items: [{ id: 'burger-owl', nombre: 'Hamburguesa Owl', precio: 11900, cant: 2, mods: ['A punto', 'Papas rústicas'] }, { id: 'bebida', nombre: 'Bebida en lata', precio: 2200, cant: 2, mods: ['Coca-Cola zero'] }],
        despacho: 2500, estado: 'entregado', hora: haceMin(95), eta: haceMin(55), repartidor: 'Matías',
        historial: [
          { t: haceMin(95), e: 'recibido', texto: 'Recibimos tu pedido.' },
          { t: haceMin(94), e: 'aceptado', texto: 'Aceptado. Llega aprox. a las {eta}.' },
          { t: haceMin(85), e: 'preparacion', texto: 'Tu pedido está en la cocina.' },
          { t: haceMin(66), e: 'camino', texto: 'Matías salió con tu pedido.' },
          { t: haceMin(57), e: 'entregado', texto: 'Entregado. ¡Que lo disfrutes!' },
        ],
        evaluacion: { nota: 5, texto: 'Llegó caliente y antes de la hora. Muy buena la burger.', hora: haceMin(40) },
      },
      {
        id: 2071, tipo: 'delivery', cliente: 'Javiera', telefono: '+56 9 7766 5544', direccion: 'Los Pescadores 145, Concón', nota: 'Tocar el timbre 2 veces',
        items: [{ id: 'alitas', nombre: 'Alitas BBQ', precio: 9900, cant: 1, mods: ['BBQ ahumada', '8 unidades'] }, { id: 'papas-owl', nombre: 'Papas Owl', precio: 7900, cant: 1, mods: ['Para 2'] }],
        despacho: 2500, estado: 'preparacion', hora: haceMin(18), eta: haceMin(-17), repartidor: '',
        historial: [
          { t: haceMin(18), e: 'recibido', texto: 'Recibimos tu pedido.' },
          { t: haceMin(17), e: 'aceptado', texto: 'Aceptado. Llega aprox. a las {eta}.' },
          { t: haceMin(9), e: 'preparacion', texto: 'Tu pedido está en la cocina.' },
        ],
      },
      {
        id: 2072, tipo: 'retiro', cliente: 'Diego', telefono: '+56 9 6655 4433', direccion: '', nota: '',
        items: [{ id: 'mechada', nombre: 'Sándwich de mechada', precio: 10900, cant: 2, mods: ['Italiana (palta, tomate, mayo)', 'Papas rústicas'] }, { id: 'cerveza-lata', nombre: 'Cerveza en lata', precio: 3500, cant: 2, mods: ['IPA'] }],
        despacho: 0, estado: 'aceptado', hora: haceMin(6), eta: haceMin(-19), repartidor: '',
        historial: [
          { t: haceMin(6), e: 'recibido', texto: 'Recibimos tu pedido.' },
          { t: haceMin(5), e: 'aceptado', texto: 'Aceptado. Estará listo para retirar a las {eta}.' },
        ],
      },
      {
        // Atrasado y sin aviso: el panel lo marca en rojo para que el local avise antes de que el cliente reclame.
        id: 2073, tipo: 'delivery', cliente: 'Rodrigo', telefono: '+56 9 5544 3322', direccion: 'Av. Concón Reñaca 900, casa 12', nota: '',
        items: [{ id: 'tabla-owl', nombre: 'Tabla Owl', precio: 18900, cant: 1, mods: [] }, { id: 'burger-trufa', nombre: 'Hamburguesa trufada', precio: 13500, cant: 1, mods: ['Tres cuartos', 'Papas Owl'] }],
        despacho: 2500, estado: 'preparacion', hora: haceMin(52), eta: haceMin(7), repartidor: '',
        historial: [
          { t: haceMin(52), e: 'recibido', texto: 'Recibimos tu pedido.' },
          { t: haceMin(51), e: 'aceptado', texto: 'Aceptado. Llega aprox. a las {eta}.' },
          { t: haceMin(40), e: 'preparacion', texto: 'Tu pedido está en la cocina.' },
        ],
      },
      {
        id: 2074, tipo: 'delivery', cliente: 'Ignacio', telefono: '+56 9 4433 2211', direccion: 'Santa Laura 77, Concón', nota: 'Sin servilletas, gracias',
        items: [{ id: 'nachos', nombre: 'Nachos de la casa', precio: 8500, cant: 1, mods: ['Carne mechada'] }, { id: 'fish-chips', nombre: 'Fish & chips', precio: 12900, cant: 1, mods: [] }],
        despacho: 2500, estado: 'recibido', hora: haceMin(2), eta: null, repartidor: '',
        historial: [{ t: haceMin(2), e: 'recibido', texto: 'Recibimos tu pedido.' }],
      },
    ],
    // Evaluaciones después de la entrega: las bajas llegan primero al local para que lo solucione.
    evaluaciones: [
      { id: 'e1', pedido: 2061, cliente: 'Antonia', nota: 2, texto: 'Las papas llegaron frías y blandas.', hora: haceMin(60 * 26), resuelta: true, respuesta: 'Te pedimos disculpas. Cambiamos el envase de las papas y te dejamos unas Papas Owl de regalo en tu próximo pedido.' },
      { id: 'e2', pedido: 2064, cliente: 'Martín', nota: 5, texto: 'Rapidísimo y me avisaron cuando salió el repartidor.', hora: haceMin(60 * 22), resuelta: true, respuesta: '' },
      { id: 'e3', pedido: 2067, cliente: 'Paula', nota: 3, texto: 'Rico, pero llegó 15 minutos tarde. Al menos avisaron.', hora: haceMin(60 * 3), resuelta: false, respuesta: '' },
    ],
    repartidores: [
      { id: 'd1', nombre: 'Matías', activo: true },
      { id: 'd2', nombre: 'Sofía', activo: true },
    ],
    mesas: [
      { n: 1, zona: 'barra', cap: 2, nota: 'Frente al bartender' },
      { n: 2, zona: 'barra', cap: 2, nota: '' },
      { n: 3, zona: 'barra', cap: 2, nota: '' },
      { n: 4, zona: 'salon', cap: 2, nota: 'Rincón tranquilo' },
      { n: 5, zona: 'salon', cap: 4, nota: '' },
      { n: 6, zona: 'salon', cap: 4, nota: '' },
      { n: 7, zona: 'salon', cap: 6, nota: 'Mesa larga' },
      { n: 8, zona: 'salon', cap: 2, nota: 'Junto al baño', molesta: true },
      { n: 9, zona: 'terraza', cap: 4, nota: 'Con estufa' },
      { n: 10, zona: 'terraza', cap: 4, nota: '' },
      { n: 11, zona: 'terraza', cap: 6, nota: '' },
    ],
    reservas: [
      { id: 'r1', nombre: 'Camila Rojas', telefono: '+56 9 7777 0001', fecha: hoyIso(), hora: '21:00', personas: 2, zona: 'barra', ocasion: 'Cita', nota: '', estado: 'confirmada', mesa: 1, creada: haceMin(300) },
      { id: 'r2', nombre: 'Tomás Fuentes', telefono: '+56 9 5555 1212', fecha: hoyIso(), hora: '22:00', personas: 6, zona: 'salon', ocasion: 'Cumpleaños', nota: 'Llevamos torta.', estado: 'pendiente', mesa: null, creada: haceMin(40) },
    ],
  };
}

export const ZONAS = {
  barra: { nombre: 'Barra', icono: '🥃', texto: 'Frente al bartender. Ideal para dos.' },
  salon: { nombre: 'Salón', icono: '🕯', texto: 'Adentro, luz baja y música.' },
  terraza: { nombre: 'Terraza', icono: '🌙', texto: 'Al aire libre, con estufas.' },
  cualquiera: { nombre: 'Sin preferencia', icono: '✓', texto: 'La mejor mesa libre a esa hora.' },
};

// Estados del pedido para llevar. «listo» es para retiro; «camino» para delivery.
export const ESTADOS = {
  recibido: { label: 'Recibido', icono: '📥', mensaje: 'El local está revisando tu pedido. Te confirmamos la hora en unos minutos.' },
  aceptado: { label: 'Aceptado', icono: '✅', mensaje: 'El local aceptó tu pedido y te dio una hora.' },
  preparacion: { label: 'En cocina', icono: '🔥', mensaje: 'Tu pedido se está preparando.' },
  listo: { label: 'Listo para retirar', icono: '🛍', mensaje: 'Tu pedido está listo. Te esperamos en la barra.' },
  camino: { label: 'En camino', icono: '🛵', mensaje: 'Tu pedido va en camino.' },
  entregado: { label: 'Entregado', icono: '🦉', mensaje: 'Entregado. ¡Que lo disfrutes!' },
  cancelado: { label: 'Cancelado', icono: '✋', mensaje: 'El pedido se canceló. Abajo está el motivo.' },
};
export const PASOS = {
  delivery: ['recibido', 'aceptado', 'preparacion', 'camino', 'entregado'],
  retiro: ['recibido', 'aceptado', 'preparacion', 'listo', 'entregado'],
};

export const ESTADOS_RESERVA = {
  pendiente: { label: 'Por confirmar', icono: '⏳' },
  confirmada: { label: 'Confirmada', icono: '✅' },
  rechazada: { label: 'Sin disponibilidad', icono: '✋' },
};

const CLAVES = Object.keys(semilla());

export function leer(clave) {
  try {
    const v = localStorage.getItem(NS + clave);
    if (v) return JSON.parse(v);
  } catch { /* sin almacenamiento: se usa la semilla */ }
  return semilla()[clave];
}

export function guardar(clave, valor) {
  try { localStorage.setItem(NS + clave, JSON.stringify(valor)); } catch { /* modo privado */ }
}

export function restablecer() {
  try {
    CLAVES.forEach((c) => localStorage.removeItem(NS + c));
    Object.keys(localStorage).filter((k) => k.startsWith(PREF)).forEach((k) => localStorage.removeItem(k));
  } catch { /* nada */ }
}

// Avisa cuando otra pantalla (otra pestaña o el otro iframe) cambia los datos.
export function alCambiar(fn) {
  addEventListener('storage', (e) => { if (e.key?.startsWith(NS)) fn(e.key.slice(NS.length)); });
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema || 'noche';
}

// Pide al menú DEMO que muestre otra pantalla (cuando la página está dentro del iframe).
export function irA(pantalla, extra = {}) {
  if (window.parent !== window) window.parent.postMessage({ demo: 'ir', pantalla, ...extra }, location.origin);
  else location.href = { carta: 'carta.html', 'admin-carta': 'admin-carta.html', pedidos: 'pedidos.html', 'admin-pedidos': 'admin-pedidos.html' }[pantalla];
}

export const subtotalPedido = (p) => p.items.reduce((s, i) => s + i.precio * i.cant, 0);
export const totalPedido = (p) => subtotalPedido(p) + (p.despacho || 0) - (p.descuento || 0);
export const horaCorta = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' }) : '');
export const minutosPara = (iso) => Math.round((new Date(iso) - Date.now()) / 60000);
export const textoHist = (h, p) => h.texto.replace('{eta}', horaCorta(h.eta || p.eta));
export const activo = (p) => !['entregado', 'cancelado'].includes(p.estado);
// Atrasado: pasó la hora prometida y el pedido sigue en el local o en camino.
export const atrasado = (p) => activo(p) && p.eta && minutosPara(p.eta) < 0;

// Mesas libres para una reserva: misma fecha, ±2 h, tamaño adecuado.
const minutos = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + b; };
export function mesasLibres({ fecha, hora, personas, zona }, ignorar) {
  const ocupadas = new Set(leer('reservas')
    .filter((r) => r.id !== ignorar && r.mesa && r.estado === 'confirmada' && r.fecha === fecha && Math.abs(minutos(r.hora) - minutos(hora)) < 120)
    .map((r) => r.mesa));
  return leer('mesas')
    .filter((m) => (!zona || zona === 'cualquiera' || m.zona === zona) && m.cap >= personas && m.cap <= Math.max(personas + 2, 2) && !ocupadas.has(m.n))
    .sort((a, b) => (a.molesta ? 1 : 0) - (b.molesta ? 1 : 0) || a.cap - b.cap);
}

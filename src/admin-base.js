// Estructura común de los dos administradores: barra lateral, pestañas, aviso de demo, modales, QR y avisos.
import { leer, restablecer, irA, esc, LOGO } from './store.js';

/**
 * @param {{ plan: string, pestanas: {id:string, nombre:string, icono:string}[], verCarta: string, pintar: (id:string, el:HTMLElement)=>void, badges?: ()=>Record<string, number> }} cfg
 */
export function crearAdmin(cfg) {
  const local = leer('local');
  let actual = sessionStorage.getItem(`tab:${location.pathname}`) || cfg.pestanas[0].id;
  if (!cfg.pestanas.some((p) => p.id === actual)) actual = cfg.pestanas[0].id;

  document.body.innerHTML = `
    <div class="adm">
      <aside class="lateral">
        <div class="lateral-cab">
          <div class="logo">${LOGO}</div>
          <small class="sub">Administrador</small>
          <span class="plan">${esc(cfg.plan)}</span>
        </div>
        <nav class="tabs" role="tablist" aria-label="Secciones del administrador"></nav>
        <div class="lateral-pie">
          <button data-ver-carta>↗ Ver la carta</button>
          <button data-restablecer>↺ Restablecer la demo</button>
        </div>
      </aside>
      <main class="contenido">
        <div class="banner"><span>🧪</span><span><b>Estás probando una copia de la demo.</b> Los cambios se guardan solo en este navegador.</span><button class="enlace" data-restablecer>Restablecer</button></div>
        <div id="vista"></div>
      </main>
    </div>
    <div class="toast" id="toast" aria-live="polite"></div>`;

  const nav = document.querySelector('.tabs');
  const vista = document.getElementById('vista');

  function pintarTabs() {
    const b = cfg.badges?.() || {};
    nav.innerHTML = cfg.pestanas.map((p) => `<button class="tab" role="tab" aria-selected="${p.id === actual}" data-tab="${p.id}"><span aria-hidden="true">${p.icono}</span>${p.nombre}${b[p.id] ? `<span class="badge">${b[p.id]}</span>` : ''}</button>`).join('');
  }
  function mostrar(id) {
    actual = id;
    sessionStorage.setItem(`tab:${location.pathname}`, id);
    pintarTabs();
    cfg.pintar(id, vista);
  }

  nav.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { mostrar(t.dataset.tab); scrollTo(0, 0); } });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ver-carta]')) irA(cfg.verCarta);
    if (e.target.closest('[data-restablecer]') && confirm('¿Volver a los datos originales de la demo? Se pierden los cambios que hiciste.')) { restablecer(); location.reload(); }
  });

  return { mostrar, refrescar: () => mostrar(actual), get actual() { return actual; }, pintarTabs };
}

// Modal genérico con formulario. onGuardar recibe el FormData; si devuelve false, el modal queda abierto.
export function modal({ titulo, cuerpo, guardar = 'Guardar', onGuardar, extra = '' }) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  d.innerHTML = `<form method="dialog">
    <div class="modal-cab"><h2>${titulo}</h2><button type="button" class="icono-b" data-cerrar aria-label="Cerrar">×</button></div>
    <div class="modal-cuerpo form">${cuerpo}</div>
    <div class="modal-pie">${extra}<button type="button" class="boton boton--linea" data-cerrar>Cancelar</button><button class="boton" value="ok">${guardar}</button></div>
  </form>`;
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-cerrar]')) d.close(); });
  d.querySelector('form').addEventListener('submit', (e) => {
    const r = onGuardar?.(new FormData(e.target), d);
    if (r === false) e.preventDefault();
  });
  d.addEventListener('close', () => d.remove());
  d.showModal();
  return d;
}

export function qrSvg(texto) {
  if (!window.qrcode) return '<small>QR no disponible sin conexión</small>';
  const q = window.qrcode(0, 'M');
  q.addData(texto);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

export const urlDe = (ruta) => new URL(ruta, location.href).href;

export function toast(icono, titulo, texto, onClick) {
  const t = document.getElementById('toast');
  const el = document.createElement('div');
  el.innerHTML = `<span>${icono}</span><p><b>${titulo}</b><small>${texto}</small></p>`;
  el.addEventListener('click', () => { onClick?.(); el.remove(); });
  t.append(el);
  setTimeout(() => el.remove(), 7000);
}

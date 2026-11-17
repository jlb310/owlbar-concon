// Pantallas 1 (carta en el local + reservas) y 3 (pedido online para delivery o retiro, con seguimiento).
// El modo viene de <body data-modo>.
import {
  leer, guardar, alCambiar, aplicarTema, fotoUrl, clp, esc, uid, ESTADOS, PASOS, ESTADOS_RESERVA, ZONAS,
  subtotalPedido, totalPedido, horaCorta, minutosPara, textoHist, activo, atrasado, mesasLibres, hoyIso, enDias, PREF, LOGO,
} from './store.js';

const MODO = document.body.dataset.modo; // 'carta' | 'pedidos'
const PIDE = MODO === 'pedidos';
const pref = (k, d) => { try { return localStorage.getItem(PREF + k) ?? d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(PREF + k, v); } catch { /* nada */ } };

let local, categorias, productos;
let filtro = 'todos';
let etiquetaFiltro = '';
let busqueda = '';
let carro = PIDE ? JSON.parse(pref('carro', '[]')) : [];
let tipo = pref('tipo', 'delivery'); // delivery | retiro

const app = document.getElementById('app');
const aviso = document.getElementById('aviso');
let avisoT;
function avisar(t) { aviso.textContent = t; aviso.classList.add('ver'); clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove('ver'), 3200); }
const wa = (texto) => `https://wa.me/${esc(local.whatsapp)}?text=${encodeURIComponent(texto)}`;

const ETIQUETAS = [['veggie', '🌱 Veggie'], ['picante', '🌶 Picante']];

function cargar() {
  local = leer('local');
  categorias = leer('categorias');
  productos = leer('productos').filter((p) => p.estado !== 'oculto');
  aplicarTema(pref('tema', '') || local.tema);
}

const fotoDe = (p, w) => (p.foto ? `<img loading="lazy" src="${esc(fotoUrl(p.foto, w))}" alt="">` : `<span class="emoji">${esc(p.emoji || '🍽️')}</span>`);
const enCarro = (id) => carro.filter((c) => c.id === id).reduce((s, c) => s + c.cant, 0);
const agotado = (p) => p.estado === 'agotado';
// En el pedido online, los tragos preparados no viajan: se ven, pero solo se piden en el local.
const soloLocal = (p) => PIDE && p.delivery === false;
const pedible = (p) => !agotado(p) && !soloLocal(p);

function tarjeta(p) {
  const n = enCarro(p.id);
  const ag = agotado(p);
  return `
    <article class="prod${ag ? ' prod--agotado' : ''}${soloLocal(p) ? ' prod--local' : ''}" data-detalle="${esc(p.id)}" role="button" tabindex="0" aria-label="Ver ${esc(p.nombre)}${ag ? ', agotado hoy' : ''}">
      <div class="prod-foto">${fotoDe(p, 500)}${ag ? '<span class="sello">Agotado hoy</span>' : soloLocal(p) ? '<span class="sello sello--local">Solo en el bar</span>' : ''}</div>
      <div class="prod-texto">
        ${p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : ''}
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.desc)}</p>
        <div class="prod-pie"><span class="precio">${clp(p.precio)}</span>
          ${p.opciones?.length && pedible(p) ? '<span class="personaliza" title="Puedes personalizarlo">✎</span>' : ''}
          ${PIDE && pedible(p) ? (n ? `<span class="en-carro" aria-label="${n} en tu pedido">${n}</span>` : `<button class="mas" data-sumar="${esc(p.id)}" aria-label="Agregar ${esc(p.nombre)}">+</button>`) : ''}
        </div>
      </div>
    </article>`;
}

function misPedidos() {
  const ids = JSON.parse(pref('pedidos', '[2071]'));
  return leer('pedidos').filter((p) => ids.includes(p.id)).sort((a, b) => b.id - a.id);
}

function bloquePedidos() {
  if (local.pausa) return `
    <div class="estado-local estado-local--pausa"><span>⏸</span><div><b>Pausamos los pedidos online por un rato</b><small>La cocina está a full y preferimos no prometerte una hora que no vamos a cumplir. Vuelve en unos minutos o escríbenos.</small></div></div>`;
  return `
    <div class="estado-local"><span>⏱</span><div><b>Hoy estamos demorando ~${local.espera} min</b><small>Te confirmamos la hora exacta al aceptar tu pedido y te avisamos si algo cambia.</small></div></div>
    <div class="tipo-pedido" role="group" aria-label="Cómo quieres tu pedido">
      <button data-tipo="delivery" aria-pressed="${tipo === 'delivery'}">🛵 Delivery<small>Concón · ${clp(local.despacho)}</small></button>
      <button data-tipo="retiro" aria-pressed="${tipo === 'retiro'}">🛍 Retiro<small>En la barra · gratis</small></button>
    </div>`;
}

function render() {
  const q = busqueda.trim().toLowerCase();
  const coincide = (p) => (!q || `${p.nombre} ${p.desc} ${p.etiqueta}`.toLowerCase().includes(q)) && (!etiquetaFiltro || p.tags?.includes(etiquetaFiltro));
  const ordenar = (l) => [...l].sort((a, b) => !pedible(a) - !pedible(b));
  const destacados = productos.filter((p) => p.etiqueta && pedible(p) && coincide(p));
  const grupos = [
    ...(filtro === 'todos' || filtro === 'destacados' ? [{ id: 'destacados', nombre: 'Lo más pedido', items: destacados }] : []),
    ...categorias.filter((c) => filtro === 'todos' || filtro === c.id).map((c) => ({ ...c, items: ordenar(productos.filter((p) => p.cat === c.id && coincide(p))) })),
  ].filter((g) => g.items.length);
  const redes = [['instagram', 'IG', 'Instagram'], ['whatsapp', 'WA', 'WhatsApp'], ['sitio', '↗', 'Sitio web']]
    .filter(([k]) => local[k]).map(([k, i, n]) => `<a class="red" href="${k === 'whatsapp' ? `https://wa.me/${esc(local.whatsapp)}` : esc(local[k])}" target="_blank" rel="noopener" aria-label="${n}">${i}</a>`).join('');
  const mios = PIDE ? misPedidos() : [];
  const enCurso = mios.filter(activo);
  const porDecidir = mios.filter((p) => p.problema && !p.problema.decision).length;
  const misReservas = !PIDE ? reservasMias() : [];
  const cuenta = carro.reduce((s, c) => s + c.cant, 0);
  const agotados = productos.filter(agotado).length;

  document.body.classList.toggle('sin-carro', !cuenta);
  app.innerHTML = `
    <header class="top">
      ${LOGO}
      <span class="abierto" id="abierto"></span>
      <button class="icono" data-accion="info" aria-label="Información del local">i</button>
    </header>
    <section class="portada">
      <img src="${fotoUrl(PIDE ? '1607013251379-e6eecfffe234' : '1767022724924-993b00fc04b3', 900)}" alt="">
      <div class="portada-texto">
        <span class="pill">${PIDE ? 'Pedido online · Delivery y retiro' : 'Carta digital'}</span>
        <h1>${PIDE ? 'Pide y sigue tu pedido' : esc(local.titulo)}</h1>
        <p>${PIDE ? 'Ves la hora estimada y cada cambio en vivo. Si algo pasa, te avisamos antes, no después.' : esc(local.frase)}</p>
      </div>
    </section>
    ${PIDE && enCurso.length ? `<button class="pedido-vivo${porDecidir ? ' pedido-vivo--alerta' : ''}" data-accion="seguimiento">${vivoHtml(enCurso[0], porDecidir)}</button>` : ''}
    ${PIDE ? bloquePedidos() : `
      <div class="cta-reserva">
        <div><b>¿Vienes al bar?</b><small>Elige barra, salón o terraza y te guardamos la mesa.</small></div>
        <button class="boton-acento" data-accion="reservar">Reservar</button>
      </div>`}
    <div class="acciones">${redes}<span class="espacio"></span>
      ${!PIDE && misReservas.length ? '<button class="chip-accion" data-accion="mis-reservas">📅 Mis reservas</button>' : ''}
      ${PIDE && mios.length ? '<button class="chip-accion" data-accion="seguimiento">🧾 Mis pedidos</button>' : ''}
      <button class="chip-accion" data-accion="tema">${document.documentElement.dataset.tema === 'claro' ? '☾ Noche' : '☀ Día'}</button>
    </div>
    <div class="pegajoso">
      <label class="buscar"><span aria-hidden="true">⌕</span><input type="search" id="buscar" placeholder="Buscar: burger, alitas, gin…" value="${esc(busqueda)}" aria-label="Buscar en la carta"></label>
      <div class="chips" aria-label="Categorías">
        <button class="chip${filtro === 'todos' ? ' activa' : ''}" data-filtro="todos">Todo</button>
        ${categorias.map((c) => `<button class="chip${filtro === c.id ? ' activa' : ''}" data-filtro="${esc(c.id)}">${esc(c.icono)} ${esc(c.nombre)}</button>`).join('')}
      </div>
      <div class="chips chips--tags" aria-label="Filtros">
        ${ETIQUETAS.map(([id, n]) => `<button class="tag${etiquetaFiltro === id ? ' activa' : ''}" data-tag="${id}" aria-pressed="${etiquetaFiltro === id}">${n}</button>`).join('')}
      </div>
    </div>
    ${agotados && filtro === 'todos' && !q && !etiquetaFiltro ? `<p class="aviso-agotados">Hoy ${agotados === 1 ? 'hay 1 producto agotado' : `hay ${agotados} productos agotados`}: ${PIDE ? 'lo marcamos aquí para que no lo pidas y después te lo cancelemos' : 'lo marcamos aquí para que no te lleves sorpresas'}.</p>` : ''}
    ${grupos.length ? grupos.map((g) => `
      <section class="seccion">
        <div class="seccion-cab"><h2>${esc(g.nombre)}</h2><span>${g.items.length}</span></div>
        <div class="grilla">${g.items.map(tarjeta).join('')}</div>
      </section>`).join('') : '<p class="vacio">No encontramos productos con ese filtro. ¿Buscas algo especial? <button class="enlace" data-accion="consultar">Pregúntanos</button></p>'}
    <div class="ayuda-pie">
      <b>¿Una duda antes de pedir?</b>
      <p>Te respondemos por WhatsApp, directo desde el bar.</p>
      <button class="boton-linea" data-accion="consultar">💬 Escribir al bar</button>
    </div>
    <p class="pie">${esc(local.direccion)} · ${esc(local.horario)}<br>Carta digital por <a href="https://spacehost.cl" target="_blank" rel="noopener">Spacehost</a></p>
    ${PIDE ? `<div class="barra-carro${cuenta ? ' ver' : ''}"><span><span class="cuenta">${cuenta}</span>${clp(subtotal())}</span><button class="ir" data-accion="carro">Ver pedido</button></div>` : ''}
  `;
  pintarAbierto();
}

// Resumen del pedido en curso, arriba de la carta.
function vivoHtml(p, porDecidir) {
  const e = ESTADOS[p.estado];
  const m = p.eta ? minutosPara(p.eta) : null;
  const linea = porDecidir ? 'Falta un producto: elige qué hacemos'
    : p.estado === 'recibido' ? 'Esperando que el bar confirme la hora'
      : m === null ? e.mensaje
        : atrasado(p) ? `Atrasado ${-m} min · estamos en eso`
          : `${p.tipo === 'retiro' ? 'Listo' : 'Llega'} aprox. ${horaCorta(p.eta)} · en ${m} min`;
  return `<span class="vivo-ico">${porDecidir ? '⚠' : e.icono}</span><span class="vivo-texto"><b>Pedido ${p.id} · ${e.label}</b><small>${linea}</small></span><span class="vivo-ir">Ver →</span>`;
}

function pintarAbierto() {
  const el = document.getElementById('abierto');
  if (!el) return;
  const ahora = new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false });
  const abierto = ahora >= '12:30' || ahora < '00:30';
  el.className = `abierto${abierto ? ' si' : ''}`;
  el.textContent = abierto ? 'Abierto' : 'Cerrado';
}

// ---------- Hojas ----------
function abrirHoja(html) {
  let d = document.getElementById('hoja');
  if (!d) { d = document.createElement('dialog'); d.id = 'hoja'; d.className = 'hoja'; document.body.append(d); }
  d.innerHTML = html;
  if (!d.open) d.showModal();
  d.onclick = null; d.oninput = null; d.onchange = null; d.onsubmit = null;
  return d;
}
const cerrarSi = (e, d) => { if (e.target === d || e.target.closest('[data-cerrar]')) { d.close(); return true; } return false; };
const CAB = (titulo) => `<div class="hoja-cab"><h2>${titulo}</h2><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>`;

// ---------- Detalle de producto con opciones ----------
function detalle(id) {
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  let cant = 1;
  const sel = (p.opciones || []).map((g) => (g.multi ? new Set() : 0));
  const extra = () => (p.opciones || []).reduce((s, g, i) => s + (g.multi ? [...sel[i]].reduce((a, k) => a + g.items[k].p, 0) : g.items[sel[i]].p), 0);
  const mods = () => (p.opciones || []).flatMap((g, i) => (g.multi ? [...sel[i]].map((k) => g.items[k].n) : (g.items.length > 1 ? [g.items[sel[i]].n] : [])));
  const unitario = () => p.precio + extra();
  const ag = agotado(p);
  const puede = pedible(p);

  const pintar = () => {
    const d = abrirHoja(`
      <button class="cerrar cerrar--flotante" data-cerrar aria-label="Cerrar">×</button>
      <div class="hoja-cuerpo">
        <div class="detalle-foto">${fotoDe(p, 900)}</div>
        <div class="detalle-cuerpo">
          ${p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : ''}
          <h2>${esc(p.nombre)}</h2>
          <p>${esc(p.desc)}</p>
        </div>
        ${ag ? `<div class="explica explica--agotado"><b>Agotado hoy</b><span>${esc(p.motivoAgotado || 'No está disponible en este momento.')}</span></div>` : ''}
        ${!ag && soloLocal(p) ? '<div class="explica"><b>Este trago se sirve solo en el bar</b><span>Los cocteles preparados pierden el hielo y la espuma en el camino. Para llevar te recomendamos las cervezas en lata.</span></div>' : ''}
        ${puede && p.cambios === false ? `<div class="explica"><b>Este producto no admite cambios</b><span>${esc(p.motivoCambios || '')}</span></div>` : ''}
        ${(PIDE ? puede : !ag) && p.cambios !== false ? (p.opciones || []).map((g, i) => `
          <fieldset class="grupo">
            <legend>${esc(g.grupo)}<small>${g.multi ? 'Elige las que quieras' : 'Elige una'}</small></legend>
            ${g.items.map((o, k) => {
              const on = g.multi ? sel[i].has(k) : sel[i] === k;
              return `<button type="button" class="opcion${on ? ' on' : ''}" data-op="${i}:${k}" aria-pressed="${on}"><span class="marca-op ${g.multi ? 'cuadro' : 'radio'}"></span><span>${esc(o.n)}</span><b>${o.p ? (o.p > 0 ? '+' : '') + clp(o.p) : ''}</b></button>`;
            }).join('')}
          </fieldset>`).join('') : ''}
        ${PIDE && puede ? `
          <div class="fila-total"><span class="precio" style="font-size:22px">${clp(unitario())}</span>
            <span class="cantidad"><button data-cant="-1" aria-label="Quitar uno">−</button><span>${cant}</span><button data-cant="1" aria-label="Agregar uno">+</button></span>
          </div>
          <button class="boton-primario" data-agregar>Agregar · ${clp(unitario() * cant)}</button>`
        : `<div class="fila-total"><span class="precio" style="font-size:22px">${clp(unitario())}</span></div>
           <button class="boton-primario boton-primario--linea" data-cerrar>Volver a la carta</button>`}
      </div>`);
    d.onclick = (e) => {
      if (cerrarSi(e, d)) return;
      const op = e.target.closest('[data-op]');
      if (op) {
        const [i, k] = op.dataset.op.split(':').map(Number);
        if (p.opciones[i].multi) { sel[i].has(k) ? sel[i].delete(k) : sel[i].add(k); } else sel[i] = k;
        const y = d.scrollTop; pintar(); d.scrollTop = y; return;
      }
      const c = e.target.closest('[data-cant]');
      if (c) { cant = Math.max(1, cant + Number(c.dataset.cant)); const y = d.scrollTop; pintar(); d.scrollTop = y; return; }
      if (e.target.closest('[data-agregar]')) { sumar(p, cant, mods(), unitario()); d.close(); }
    };
  };
  pintar();
}

// ---------- Carrito ----------
const subtotal = () => carro.reduce((s, c) => s + c.precio * c.cant, 0);
const despacho = () => (tipo === 'delivery' ? local.despacho : 0);
function guardarCarro() { setPref('carro', JSON.stringify(carro)); }

function sumar(p, cant = 1, mods = [], precio = p.precio) {
  const key = `${p.id}|${mods.join('|')}`;
  const c = carro.find((x) => x.key === key);
  if (c) c.cant += cant; else carro.push({ key, id: p.id, nombre: p.nombre, precio, cant, mods });
  guardarCarro(); render(); avisar(`${cant} × ${p.nombre} agregado`);
}

function sumarRapido(id) {
  const p = productos.find((x) => x.id === id);
  if (p.opciones?.some((g) => !g.multi && g.items.length > 1)) return detalle(id);
  sumar(p);
}

function hojaCarro() {
  const datos = { cliente: pref('cliente', ''), telefono: pref('telefono', ''), direccion: pref('direccion', ''), nota: pref('nota', '') };
  const d = abrirHoja(`
    ${CAB('Tu pedido')}
    <form class="hoja-cuerpo" id="form-pedido">
      <div class="tipo-pedido" role="group" aria-label="Cómo quieres tu pedido">
        <button type="button" data-tipo="delivery" aria-pressed="${tipo === 'delivery'}">🛵 Delivery<small>${clp(local.despacho)}</small></button>
        <button type="button" data-tipo="retiro" aria-pressed="${tipo === 'retiro'}">🛍 Retiro<small>Gratis</small></button>
      </div>
      <div>${carro.map((c, i) => `
        <div class="linea"><div><b>${esc(c.nombre)}</b>${c.mods?.length ? `<br><small class="mods">${c.mods.map(esc).join(' · ')}</small>` : ''}<br><small>${clp(c.precio)} c/u</small></div>
          <span class="cantidad"><button type="button" data-item="${i}" data-cant="-1" aria-label="Quitar uno">−</button><span>${c.cant}</span><button type="button" data-item="${i}" data-cant="1" aria-label="Agregar uno">+</button></span></div>`).join('')}</div>
      <label class="campo">Tu nombre<input id="cliente" class="entrada" value="${esc(datos.cliente)}" autocomplete="given-name" required></label>
      <label class="campo">WhatsApp <small class="tenue">Para avisarte si algo cambia</small><input id="telefono" class="entrada" value="${esc(datos.telefono)}" inputmode="tel" autocomplete="tel" placeholder="+56 9 …" required></label>
      ${tipo === 'delivery' ? `<label class="campo">Dirección en Concón<input id="direccion" class="entrada" value="${esc(datos.direccion)}" autocomplete="street-address" placeholder="Calle, número, depto" required></label>` : ''}
      <label class="campo">Nota para el bar<textarea id="nota" rows="2" placeholder="${tipo === 'delivery' ? 'Ej.: tocar el timbre, dejar en conserjería' : 'Ej.: paso a las 21:30'}">${esc(datos.nota)}</textarea></label>
      <div class="totales">
        <div class="fila-total"><span>Productos</span><span>${clp(subtotal())}</span></div>
        <div class="fila-total"><span>${tipo === 'delivery' ? 'Despacho' : 'Retiro en el local'}</span><span>${despacho() ? clp(despacho()) : 'Gratis'}</span></div>
        <div class="fila-total total"><span>Total</span><span>${clp(subtotal() + despacho())}</span></div>
      </div>
      <div class="promesa"><b>Nuestro compromiso</b>
        <span>✓ Te confirmamos la hora en menos de 5 minutos.</span>
        <span>✓ Si nos atrasamos, te avisamos antes de la hora con una nueva.</span>
        <span>✓ Si falta algo, tú eliges: cambiarlo, quitarlo o cancelar. Nunca te cancelamos sin avisar.</span>
      </div>
      <button class="boton-primario">Enviar pedido · ${clp(subtotal() + despacho())}</button>
    </form>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const t = e.target.closest('[data-tipo]');
    if (t) { tipo = t.dataset.tipo; setPref('tipo', tipo); render(); return hojaCarro(); }
    const it = e.target.closest('[data-item]');
    if (it) {
      carro[Number(it.dataset.item)].cant += Number(it.dataset.cant);
      carro = carro.filter((x) => x.cant > 0);
      guardarCarro(); render();
      if (!carro.length) return d.close();
      return hojaCarro();
    }
  };
  d.oninput = (e) => { if (['cliente', 'telefono', 'direccion', 'nota'].includes(e.target.id)) setPref(e.target.id, e.target.value); };
  d.onsubmit = (e) => { e.preventDefault(); enviar(d); };
}

function enviar(d) {
  if (leer('local').pausa) { d.close(); render(); return avisar('Pausamos los pedidos online por un rato'); }
  const v = (id) => d.querySelector(`#${id}`)?.value.trim() || '';
  const pedidos = leer('pedidos');
  const id = Math.max(2070, ...pedidos.map((p) => p.id)) + 1;
  const ahora = new Date().toISOString();
  pedidos.push({
    id, tipo, cliente: v('cliente'), telefono: v('telefono'), direccion: tipo === 'delivery' ? v('direccion') : '', nota: v('nota'),
    items: carro.map(({ id: pid, nombre, precio, cant, mods }) => ({ id: pid, nombre, precio, cant, mods })),
    despacho: despacho(), estado: 'recibido', hora: ahora, eta: null, repartidor: '',
    historial: [{ t: ahora, e: 'recibido', texto: 'Recibimos tu pedido.' }],
  });
  guardar('pedidos', pedidos);
  setPref('pedidos', JSON.stringify([...JSON.parse(pref('pedidos', '[2071]')), id]));
  carro = []; guardarCarro(); setPref('nota', '');
  render(); seguimiento();
  avisar(`Pedido ${id} enviado`);
}

// ---------- Seguimiento del pedido ----------
const ICONO_HIST = { recibido: '📥', aceptado: '✅', preparacion: '🔥', listo: '🛍', camino: '🛵', entregado: '🦉', cancelado: '✋', atraso: '⏱', problema: '⚠', decision: '💬' };

function tarjetaPedido(p) {
  const e = ESTADOS[p.estado];
  const pasos = PASOS[p.tipo];
  const paso = pasos.indexOf(p.estado);
  const m = p.eta ? minutosPara(p.eta) : null;
  const pr = p.problema;
  let hora = '';
  if (p.estado === 'recibido') hora = '<div class="eta eta--espera"><b>Confirmando…</b><small>El bar revisa tu pedido y te da una hora.</small></div>';
  else if (activo(p) && p.eta) hora = `<div class="eta${atrasado(p) ? ' eta--tarde' : ''}"><small>${p.tipo === 'retiro' ? 'Listo para retirar' : 'Llega'} aprox.</small><b>${horaCorta(p.eta)}</b><small>${atrasado(p) ? `Vamos ${-m} min tarde. Ya le avisamos al bar.` : `en ${m} min`}</small></div>`;
  return `<div class="seguimiento seguimiento--grande">
    <div class="seguimiento-cab"><b>Pedido ${p.id} · ${p.tipo === 'delivery' ? '🛵 Delivery' : '🛍 Retiro'}</b><span class="estado estado--${p.estado}">${e.icono} ${e.label}</span></div>
    ${p.estado !== 'cancelado' ? `<div class="pasos">${pasos.map((s, i) => `<i class="${i <= paso ? 'hecho' : ''}" title="${ESTADOS[s].label}"></i>`).join('')}</div>
      <div class="pasos-nombres">${pasos.map((s) => `<span>${ESTADOS[s].label}</span>`).join('')}</div>` : ''}
    ${hora}
    ${pr && !pr.decision ? `
      <div class="problema">
        <b>⚠ Se nos acabó: ${esc(pr.item)}</b>
        <p>${esc(pr.motivo)} ¿Qué prefieres? El resto del pedido sigue en la cocina mientras decides.</p>
        <div class="problema-opciones">
          ${pr.alternativa ? `<button class="boton-primario" data-decidir="${p.id}:cambiar">Cambiar por ${esc(pr.alternativa.nombre)}${pr.alternativa.dif ? ` (${pr.alternativa.dif > 0 ? '+' : ''}${clp(pr.alternativa.dif)})` : ' (mismo precio)'}</button>` : ''}
          <button class="boton-primario boton-primario--linea" data-decidir="${p.id}:quitar">Quitarlo y descontar ${clp(pr.monto)}</button>
          <button class="enlace" data-decidir="${p.id}:cancelar">Cancelar todo el pedido</button>
        </div>
      </div>` : ''}
    ${p.estado === 'cancelado' ? `<p class="burbuja barra">${esc(p.motivo || 'El pedido se canceló.')}</p><small class="tenue">Si pagaste en línea, el reembolso es automático. ¿Dudas? <a href="${wa(`Hola, mi pedido ${p.id} fue cancelado.`)}" target="_blank" rel="noopener">Escríbenos</a>.</small>` : ''}
    <ol class="historial">${[...p.historial].reverse().map((h) => `<li><span>${ICONO_HIST[h.e] || '•'}</span><p>${esc(textoHist(h, p))}<small>${horaCorta(h.t)}</small></p></li>`).join('')}</ol>
    <small>${p.items.map((i) => `${i.cant} × ${esc(i.nombre)}${i.mods?.length ? ` (${i.mods.map(esc).join(', ')})` : ''}`).join(' · ')}</small>
    <div class="fila-total"><small class="tenue">Total${p.despacho ? ' con despacho' : ''}${p.descuento ? ` · descuento ${clp(p.descuento)}` : ''}</small><b>${clp(totalPedido(p))}</b></div>
    ${p.estado === 'entregado' ? evaluacionHtml(p) : ''}
  </div>`;
}

function evaluacionHtml(p) {
  if (p.evaluacion) {
    const bien = p.evaluacion.nota >= 4;
    return `<div class="evaluacion"><b>Tu evaluación: ${'★'.repeat(p.evaluacion.nota)}${'☆'.repeat(5 - p.evaluacion.nota)}</b>
      ${bien ? `<p>¡Gracias! Si te gustó, nos ayudas mucho contándolo en Google.</p><a class="boton-primario boton-primario--linea" href="${esc(local.reseñaGoogle)}" target="_blank" rel="noopener">Dejar reseña en Google ↗</a>`
        : '<p>Gracias por contarnos. Tu comentario le llegó directo al encargado y te va a escribir hoy para solucionarlo.</p>'}
      ${p.evaluacion.respuesta ? `<p class="burbuja barra">${esc(p.evaluacion.respuesta)}</p>` : ''}</div>`;
  }
  return `<form class="evaluacion" data-evaluar="${p.id}"><b>¿Cómo llegó tu pedido?</b>
    <div class="estrellas" role="radiogroup" aria-label="Nota">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="nota" value="${n}" required><span aria-label="${n} estrellas">★</span></label>`).join('')}</div>
    <textarea name="texto" rows="2" class="entrada" placeholder="¿Qué podemos mejorar? (opcional)"></textarea>
    <button class="boton-primario">Enviar evaluación</button></form>`;
}

function seguimiento() {
  const lista = misPedidos();
  const d = abrirHoja(`
    ${CAB('Mis pedidos')}
    <div class="hoja-cuerpo" id="seguimiento">
      ${lista.length ? lista.map(tarjetaPedido).join('') : '<p class="vacio">Todavía no haces pedidos desde este celular.</p>'}
      <p class="nota-envio">Esta pantalla se actualiza sola con cada cambio del bar. También te llega por WhatsApp.</p>
    </div>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const b = e.target.closest('[data-decidir]');
    if (b) { const [id, que] = b.dataset.decidir.split(':'); decidir(Number(id), que); }
  };
  d.onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const id = Number(e.target.dataset.evaluar);
    const nota = Number(f.get('nota'));
    if (!nota) return;
    const p = leer('pedidos').find((x) => x.id === id);
    const ev = { nota, texto: String(f.get('texto') || '').trim(), hora: new Date().toISOString() };
    guardar('pedidos', leer('pedidos').map((x) => (x.id === id ? { ...x, evaluacion: ev } : x)));
    guardar('evaluaciones', [{ id: uid(), pedido: id, cliente: p.cliente, ...ev, resuelta: nota >= 4, respuesta: '' }, ...leer('evaluaciones')]);
    seguimiento();
    avisar(nota >= 4 ? '¡Gracias por tu evaluación!' : 'Gracias. El encargado ya lo vio.');
  };
}

// El cliente decide qué hacer cuando falta un producto.
function decidir(id, que) {
  if (que === 'cancelar' && !confirm('¿Cancelar todo el pedido?')) return;
  const ahora = new Date().toISOString();
  guardar('pedidos', leer('pedidos').map((p) => {
    if (p.id !== id) return p;
    const pr = p.problema;
    let items = p.items;
    let descuento = p.descuento || 0;
    let texto = '';
    if (que === 'cambiar') {
      items = p.items.map((i, k) => (k === pr.indice ? { ...i, id: pr.alternativa.id, nombre: pr.alternativa.nombre, precio: pr.alternativa.precio, mods: ['Cambio acordado'] } : i));
      texto = `Elegiste cambiarlo por ${pr.alternativa.nombre}.`;
    }
    if (que === 'quitar') { descuento += pr.monto; texto = `Elegiste quitarlo. Te descontamos ${clp(pr.monto)}.`; }
    if (que === 'cancelar') {
      return { ...p, problema: { ...pr, decision: que }, estado: 'cancelado', motivo: `Cancelaste el pedido porque no teníamos ${pr.item}. No se te cobra nada.`, historial: [...p.historial, { t: ahora, e: 'cancelado', texto: 'Cancelaste el pedido. No se te cobra nada.' }] };
    }
    return { ...p, items, descuento, problema: { ...pr, decision: que }, historial: [...p.historial, { t: ahora, e: 'decision', texto }] };
  }));
  seguimiento();
  avisar('Listo, el bar ya lo sabe');
}

// ---------- Consulta por WhatsApp ----------
function consultar() {
  const d = abrirHoja(`
    ${CAB('Escríbele al bar')}
    <form class="hoja-cuerpo">
      <p class="intro">Te respondemos por WhatsApp, directo desde la barra.</p>
      <label class="campo">Tu consulta<textarea id="c-texto" rows="3" required placeholder="Ej.: ¿Tienen opciones sin gluten?"></textarea></label>
      <div class="sugerencias">${['¿Hacen delivery a mi dirección?', '¿Tienen opciones sin gluten?', '¿Hay mesa para 6 hoy?', '¿Qué cervezas hay hoy?'].map((s) => `<button type="button" class="tag" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <button class="boton-primario">Abrir WhatsApp</button>
    </form>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const s = e.target.closest('[data-sug]');
    if (s) { const t = d.querySelector('#c-texto'); t.value = s.dataset.sug; t.focus(); }
  };
  d.onsubmit = (e) => {
    e.preventDefault();
    const texto = d.querySelector('#c-texto').value.trim();
    if (!texto) return;
    window.open(wa(`Hola ${local.nombre}, tengo una consulta: ${texto}`), '_blank', 'noopener');
    d.close(); avisar('Abriendo WhatsApp…');
  };
}

// ---------- Reservas (pantalla 1) ----------
function reservasMias() {
  const ids = JSON.parse(pref('reservas', '[]'));
  return leer('reservas').filter((r) => ids.includes(r.id));
}

const HORAS = ['13:00', '14:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
function reservar() {
  const f = { fecha: hoyIso(), hora: '21:00', personas: 2, zona: '', ocasion: '', nombre: pref('r-nombre', ''), telefono: pref('r-telefono', ''), nota: '' };
  const dias = Array.from({ length: 10 }, (_, i) => enDias(i));
  const etiquetaDia = (iso, i) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : new Date(`${iso}T12:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }));

  const pintar = () => {
    const libres = Object.fromEntries(Object.keys(ZONAS).map((z) => [z, mesasLibres({ ...f, zona: z }).length]));
    if (f.zona && !libres[f.zona]) f.zona = '';
    const d = abrirHoja(`
      ${CAB('Reserva tu mesa')}
      <form class="hoja-cuerpo" id="form-reserva">
        <div class="detalle-foto foto-reserva"><img src="${fotoUrl('1739799120521-c5f44a9335a3', 900)}" alt="Barra del bar con taburetes"></div>
        <div class="campo">¿Qué día?<div class="carrusel">${dias.map((iso, i) => `<button type="button" class="dia${f.fecha === iso ? ' on' : ''}" data-fecha="${iso}">${etiquetaDia(iso, i)}</button>`).join('')}</div></div>
        <div class="campo">¿A qué hora?<div class="carrusel">${HORAS.map((h) => `<button type="button" class="dia${f.hora === h ? ' on' : ''}" data-hora="${h}">${h}</button>`).join('')}</div></div>
        <div class="campo fila-total">¿Cuántos son?<span class="cantidad"><button type="button" data-personas="-1" aria-label="Menos">−</button><span>${f.personas}</span><button type="button" data-personas="1" aria-label="Más">+</button></span></div>
        <div class="campo">¿Dónde prefieres sentarte?
          <div class="zonas">${Object.entries(ZONAS).map(([id, z]) => {
            const n = libres[id];
            return `<button type="button" class="zona${f.zona === id ? ' on' : ''}" data-zona="${id}"${n ? '' : ' disabled'}>
              <span class="zona-ico">${z.icono}</span><b>${z.nombre}</b><small>${z.texto}</small>
              <em>${n ? `${n} ${n === 1 ? 'mesa libre' : 'mesas libres'}` : 'Completo a esa hora'}</em></button>`;
          }).join('')}</div>
          ${f.personas >= 7 ? '<small class="tenue">Para grupos de 7 o más, escríbenos y juntamos mesas.</small>' : ''}
        </div>
        <label class="campo">¿Celebran algo? <select id="r-ocasion" class="entrada">${['', 'Cumpleaños', 'Aniversario', 'Cita', 'After office', 'Despedida'].map((o) => `<option${o === f.ocasion ? ' selected' : ''} value="${o}">${o || 'Nada en especial'}</option>`).join('')}</select></label>
        <label class="campo">Nombre<input id="r-nombre" class="entrada" value="${esc(f.nombre)}" required autocomplete="name"></label>
        <label class="campo">WhatsApp<input id="r-telefono" class="entrada" value="${esc(f.telefono)}" required inputmode="tel" autocomplete="tel" placeholder="+56 9 …"></label>
        <label class="campo">¿Algo que debamos saber?<textarea id="r-nota" rows="2" placeholder="Ej.: llevamos torta, alergias">${esc(f.nota)}</textarea></label>
        <button class="boton-primario"${f.zona ? '' : ' disabled'}>${f.zona ? `Solicitar mesa · ${ZONAS[f.zona].nombre}` : 'Elige dónde sentarte'}</button>
        <p class="nota-envio">Te confirmamos la mesa por WhatsApp. Ves el estado en «Mis reservas».</p>
      </form>`);
    d.onclick = (e) => {
      if (cerrarSi(e, d)) return;
      const t = e.target.closest('[data-fecha],[data-hora],[data-personas],[data-zona]');
      if (!t) return;
      if (t.dataset.fecha) f.fecha = t.dataset.fecha;
      if (t.dataset.hora) f.hora = t.dataset.hora;
      if (t.dataset.personas) f.personas = Math.min(10, Math.max(1, f.personas + Number(t.dataset.personas)));
      if (t.dataset.zona) f.zona = t.dataset.zona;
      const y = d.scrollTop; pintar(); document.getElementById('hoja').scrollTop = y;
    };
    d.oninput = (e) => {
      const k = { 'r-nombre': 'nombre', 'r-telefono': 'telefono', 'r-nota': 'nota', 'r-ocasion': 'ocasion' }[e.target.id];
      if (k) f[k] = e.target.value;
    };
    d.onchange = d.oninput;
    d.onsubmit = (e) => {
      e.preventDefault();
      if (!f.zona) return;
      if (!f.nombre.trim() || !f.telefono.trim()) return avisar('Completa tu nombre y WhatsApp');
      setPref('r-nombre', f.nombre); setPref('r-telefono', f.telefono);
      const r = { id: uid(), nombre: f.nombre.trim(), telefono: f.telefono.trim(), fecha: f.fecha, hora: f.hora, personas: f.personas, zona: f.zona, ocasion: f.ocasion, nota: f.nota.trim(), estado: 'pendiente', mesa: null, creada: new Date().toISOString() };
      guardar('reservas', [...leer('reservas'), r]);
      setPref('reservas', JSON.stringify([...JSON.parse(pref('reservas', '[]')), r.id]));
      render(); reservaEnviada(r);
    };
  };
  pintar();
}

const fechaLarga = (iso) => new Date(`${iso}T12:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

function reservaEnviada(r) {
  const texto = `Hola ${local.nombre}, soy ${r.nombre}. Pedí una mesa para ${r.personas} el ${fechaLarga(r.fecha)} a las ${r.hora}, en ${ZONAS[r.zona].nombre.toLowerCase()}${r.ocasion ? ` (${r.ocasion.toLowerCase()})` : ''}.${r.nota ? ` Nota: ${r.nota}` : ''}`;
  const d = abrirHoja(`
    ${CAB('Solicitud enviada')}
    <div class="hoja-cuerpo">
      <div class="listo"><span>✓</span><h3>¡Te esperamos, ${esc(r.nombre.split(' ')[0])}!</h3>
        <p>${r.personas} ${r.personas === 1 ? 'persona' : 'personas'} · ${fechaLarga(r.fecha)} · ${r.hora}<br>${ZONAS[r.zona].icono} ${ZONAS[r.zona].nombre}</p></div>
      <p class="intro">La reserva ya está en el panel de OWL BAR. Cuando te asignen la mesa, lo verás en «Mis reservas» y te llegará la confirmación por WhatsApp.</p>
      <a class="boton-primario" href="${wa(texto)}" target="_blank" rel="noopener">Escribir también por WhatsApp</a>
      <button class="boton-primario boton-primario--linea" data-mis>Ver mis reservas</button>
    </div>`);
  d.onclick = (e) => { if (cerrarSi(e, d)) return; if (e.target.closest('[data-mis]')) misReservas(); };
}

function misReservas() {
  const lista = reservasMias().reverse();
  const mesas = leer('mesas');
  const d = abrirHoja(`
    ${CAB('Mis reservas')}
    <div class="hoja-cuerpo" id="mis-reservas">
      ${lista.length ? lista.map((r) => {
        const e = ESTADOS_RESERVA[r.estado];
        const m = mesas.find((x) => x.n === r.mesa);
        return `<div class="seguimiento">
          <div class="seguimiento-cab"><b>${fechaLarga(r.fecha)} · ${r.hora}</b><span class="estado estado--${r.estado === 'confirmada' ? 'entregado' : r.estado === 'rechazada' ? 'cancelado' : 'recibido'}">${e.icono} ${e.label}</span></div>
          <small>${r.personas} ${r.personas === 1 ? 'persona' : 'personas'} · Pediste ${ZONAS[r.zona].nombre.toLowerCase()}</small>
          ${r.estado === 'confirmada' && m ? `<p class="burbuja barra">Tu mesa: <b>mesa ${m.n}, ${ZONAS[m.zona].nombre.toLowerCase()}</b>${m.nota && !m.molesta ? ` · ${esc(m.nota.toLowerCase())}` : ''}.</p>` : ''}
          ${r.estado === 'rechazada' ? `<p class="burbuja barra">${esc(r.respuesta || 'No nos quedan mesas a esa hora.')}</p>` : ''}
          ${r.estado === 'pendiente' ? '<small class="tenue">OWL BAR está revisando la mejor mesa para ustedes.</small>' : ''}
        </div>`;
      }).join('') : '<p class="vacio">Aún no tienes reservas.</p>'}
      <button class="boton-primario boton-primario--linea" data-otra>Hacer otra reserva</button>
    </div>`);
  d.onclick = (e) => { if (cerrarSi(e, d)) return; if (e.target.closest('[data-otra]')) reservar(); };
}

// ---------- Información del local ----------
function info() {
  const d = abrirHoja(`
    ${CAB(esc(local.nombre))}
    <div class="hoja-cuerpo"><div class="info-lista">
      <div><span>📍</span><p><small>Dónde</small>${esc(local.direccion)}</p></div>
      <div><span>🕐</span><p><small>Horario</small>${esc(local.horario)}</p></div>
      ${local.telefono ? `<div><span>☎</span><p><small>Teléfono</small><a href="tel:${esc(local.telefono.replace(/\s/g, ''))}">${esc(local.telefono)}</a></p></div>` : ''}
      ${local.whatsapp ? `<div><span>💬</span><p><small>WhatsApp</small><a href="https://wa.me/${esc(local.whatsapp)}" target="_blank" rel="noopener">Escríbenos</a></p></div>` : ''}
    </div></div>`);
  d.onclick = (e) => cerrarSi(e, d);
}

// ---------- Eventos ----------
app.addEventListener('click', (e) => {
  const sumarB = e.target.closest('[data-sumar]');
  if (sumarB) { e.stopPropagation(); return sumarRapido(sumarB.dataset.sumar); }
  const f = e.target.closest('[data-filtro]');
  if (f) { filtro = f.dataset.filtro; return render(); }
  const tg = e.target.closest('[data-tag]');
  if (tg) { etiquetaFiltro = etiquetaFiltro === tg.dataset.tag ? '' : tg.dataset.tag; return render(); }
  const tp = e.target.closest('[data-tipo]');
  if (tp) { tipo = tp.dataset.tipo; setPref('tipo', tipo); return render(); }
  const a = e.target.closest('[data-accion]')?.dataset.accion;
  if (a === 'info') return info();
  if (a === 'tema') { setPref('tema', document.documentElement.dataset.tema === 'claro' ? 'noche' : 'claro'); cargar(); return render(); }
  if (a === 'carro') return hojaCarro();
  if (a === 'seguimiento') return seguimiento();
  if (a === 'consultar') return consultar();
  if (a === 'reservar') return reservar();
  if (a === 'mis-reservas') return misReservas();
  const det = e.target.closest('[data-detalle]');
  if (det) detalle(det.dataset.detalle);
});
app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-detalle]')) detalle(e.target.dataset.detalle); });
app.addEventListener('input', (e) => {
  if (e.target.id !== 'buscar') return;
  busqueda = e.target.value;
  const pos = e.target.selectionStart;
  render();
  const b = document.getElementById('buscar'); b.focus(); b.setSelectionRange(pos, pos);
});

// Cambios hechos en el administrador (otra pantalla) se ven al tiro, con un aviso de lo que cambió.
const firma = (p) => `${p.estado}|${p.eta}|${p.historial.length}`;
let vistos = new Map(misPedidos().map((p) => [p.id, firma(p)]));
let confirmadas = new Set(reservasMias().filter((r) => r.estado !== 'pendiente').map((r) => r.id));
alCambiar((clave) => {
  cargar();
  carro = carro.filter((c) => productos.some((p) => p.id === c.id && pedible(p)));
  guardarCarro();
  const hoja = document.getElementById('hoja');
  if (PIDE && clave === 'pedidos') {
    for (const p of misPedidos()) {
      if (vistos.get(p.id) === firma(p)) continue;
      const ult = p.historial.at(-1);
      if (ult && vistos.has(p.id)) avisar(`${ICONO_HIST[ult.e] || '🦉'} ${textoHist(ult, p)}`);
    }
    vistos = new Map(misPedidos().map((p) => [p.id, firma(p)]));
    if (hoja?.open && hoja.querySelector('#seguimiento') && !hoja.querySelector('.evaluacion input:checked, .evaluacion textarea:focus')) seguimiento();
  }
  if (!PIDE && clave === 'reservas') {
    const nuevas = reservasMias().filter((r) => r.estado !== 'pendiente' && !confirmadas.has(r.id));
    if (nuevas.length) avisar(nuevas[0].estado === 'confirmada' ? '📅 ¡Tu reserva está confirmada!' : '📅 OWL BAR respondió tu reserva');
    confirmadas = new Set(reservasMias().filter((r) => r.estado !== 'pendiente').map((r) => r.id));
    if (hoja?.open && hoja.querySelector('#mis-reservas')) misReservas();
  }
  render();
});
// Los minutos que faltan se recalculan solos.
setInterval(() => { pintarAbierto(); if (PIDE && !document.activeElement?.matches('input,textarea')) render(); }, 30000);

cargar();
render();

// Pantalla 4: administrador de pedidos online (delivery y retiro), evaluaciones, reservas, mesas y repartidores.
// La regla de fondo: ningún pedido cambia (atraso, falta de producto, cancelación) sin que el cliente lo sepa y con motivo.
import {
  leer, guardar, alCambiar, clp, esc, uid, ESTADOS, ESTADOS_RESERVA, ZONAS, totalPedido, horaCorta, minutosPara, activo, atrasado,
  irA, mesasLibres, hoyIso, enDias, PREF,
} from './store.js';
import { crearAdmin, modal, qrSvg, urlDe, toast } from './admin-base.js';

let filtroDia = 'hoy';
const hace = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h`; };
const fechaCorta = (iso) => (iso === hoyIso() ? 'Hoy' : iso === enDias(1) ? 'Mañana' : new Date(`${iso}T12:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }));
const enMin = (m) => new Date(Date.now() + m * 60000).toISOString();
// Ya avisado: el último atraso informado dejó una hora que aún no se cumple.
const sinAviso = (p) => atrasado(p);
const sinAceptar = (p) => p.estado === 'recibido' && (Date.now() - new Date(p.hora)) / 60000 >= 3;

const admin = crearAdmin({
  plan: 'Plan pedidos online',
  verCarta: 'pedidos',
  pestanas: [
    { id: 'pedidos', nombre: 'Pedidos', icono: '🛎' },
    { id: 'evaluaciones', nombre: 'Evaluaciones', icono: '★' },
    { id: 'reservas', nombre: 'Reservas', icono: '📅' },
    { id: 'mesas', nombre: 'Mesas y QR', icono: '▦' },
    { id: 'repartidores', nombre: 'Repartidores', icono: '🛵' },
  ],
  badges: () => ({
    pedidos: leer('pedidos').filter((p) => p.estado === 'recibido' || atrasado(p) || (p.problema && !p.problema.decision)).length,
    evaluaciones: leer('evaluaciones').filter((e) => !e.resuelta).length,
    reservas: leer('reservas').filter((r) => r.estado === 'pendiente').length,
  }),
  pintar(id, el) { VISTAS[id](el); },
});

const COLUMNAS = [
  { id: 'nuevos', nombre: 'Nuevos', ayuda: 'Acéptalos con una hora realista', estados: ['recibido'] },
  { id: 'cocina', nombre: 'En cocina', ayuda: 'Aceptados y preparándose', estados: ['aceptado', 'preparacion'] },
  { id: 'salida', nombre: 'Listos y en camino', ayuda: 'Retiro en barra o con repartidor', estados: ['listo', 'camino'] },
];

const VISTAS = {
  pedidos(el) {
    const local = leer('local');
    const todos = leer('pedidos');
    const activos = todos.filter(activo);
    const tarde = activos.filter(sinAviso);
    const nuevos = activos.filter(sinAceptar);
    const evals = leer('evaluaciones');
    const prom = evals.length ? (evals.reduce((s, e) => s + e.nota, 0) / evals.length).toFixed(1) : '–';
    const cerrados = todos.filter((p) => !activo(p)).sort((a, b) => b.id - a.id);
    const aTiempo = cerrados.filter((p) => p.estado === 'entregado');

    el.innerHTML = `
      <div class="cab"><div><h1>Pedidos online</h1><p>Cada pedido tiene una hora prometida. Si se va a pasar, el panel te avisa antes de que el cliente reclame.</p></div>
        <button class="boton boton--linea" data-probar>Hacer un pedido de prueba ↗</button></div>
      ${tarde.map((p) => `<button class="alerta alerta--roja" data-atraso="${p.id}"><span>⏱</span><span><b>Pedido ${p.id} (${esc(p.cliente)}) va ${-minutosPara(p.eta)} min atrasado</b><small>El cliente sigue viendo «${ESTADOS[p.estado].label}». Avísale con una hora nueva antes de que escriba.</small></span><b>Avisar atraso →</b></button>`).join('')}
      ${nuevos.map((p) => `<div class="alerta"><span>📥</span><span><b>Pedido ${p.id} lleva ${Math.round((Date.now() - new Date(p.hora)) / 60000)} min sin aceptar</b><small>El cliente espera la confirmación. Prometimos responder en menos de 5 minutos.</small></span></div>`).join('')}
      <div class="panel control-espera">
        <div><b>Lo que ven los clientes antes de pedir</b><small>Súbelo cuando la cocina se llene: es mejor prometer 50 minutos y cumplir que prometer 30 y atrasarse.</small></div>
        <div class="filtros" role="group" aria-label="Tiempo de espera">${[25, 35, 50, 70].map((m) => `<button class="boton boton--chico ${local.espera === m && !local.pausa ? '' : 'boton--linea'}" data-espera="${m}">~${m} min</button>`).join('')}
          <button class="boton boton--chico ${local.pausa ? 'boton--peligro' : 'boton--linea'}" data-pausa>${local.pausa ? '▶ Reanudar pedidos' : '⏸ Pausar pedidos'}</button></div>
      </div>
      <div class="numeros">
        <div class="numero"><b>${activos.length}</b><span>Pedidos en curso</span></div>
        <div class="numero${tarde.length ? ' numero--mal' : ''}"><b>${tarde.length}</b><span>Atrasados sin aviso</span></div>
        <div class="numero"><b>${aTiempo.length}</b><span>Entregados hoy</span></div>
        <div class="numero"><b>${prom} ★</b><span>Evaluación promedio</span></div>
      </div>
      <div class="tablero">
        ${COLUMNAS.map((c) => {
          const lista = activos.filter((p) => c.estados.includes(p.estado)).sort((a, b) => (a.eta || a.hora).localeCompare(b.eta || b.hora));
          return `<section class="columna"><header><b>${c.nombre} <span>${lista.length}</span></b><small>${c.ayuda}</small></header>
            ${lista.length ? lista.map(pedidoHtml).join('') : '<div class="vacio">Nada por aquí.</div>'}</section>`;
        }).join('')}
      </div>
      ${cerrados.length ? `<h2 style="margin-top:6px">Entregados y cancelados</h2><div class="panel"><div class="lista">${cerrados.map((p) => `
        <div class="fila" style="grid-template-columns:auto 1fr auto"><div class="mini">${ESTADOS[p.estado].icono}</div>
          <div><b>Pedido ${p.id} · ${esc(p.cliente)} · ${p.tipo === 'delivery' ? 'Delivery' : 'Retiro'}</b><small>${ESTADOS[p.estado].label}${p.motivo ? ` · ${esc(p.motivo)}` : ''}${p.evaluacion ? ` · ${'★'.repeat(p.evaluacion.nota)}` : ''}</small></div>
          <b>${clp(totalPedido(p))}</b></div>`).join('')}</div></div>` : ''}`;
  },

  evaluaciones(el) {
    const evals = leer('evaluaciones');
    const prom = evals.length ? (evals.reduce((s, e) => s + e.nota, 0) / evals.length).toFixed(1) : '–';
    const pend = evals.filter((e) => !e.resuelta);
    el.innerHTML = `
      <div class="cab"><div><h1>Evaluaciones</h1><p>Después de cada entrega el cliente evalúa. Con 4 o 5 estrellas lo invitamos a dejar reseña en Google; con 1 a 3, el comentario llega primero aquí para que lo soluciones antes de que termine en Google Maps.</p></div></div>
      <div class="numeros">
        <div class="numero"><b>${prom} ★</b><span>Promedio</span></div>
        <div class="numero${pend.length ? ' numero--mal' : ''}"><b>${pend.length}</b><span>Por resolver</span></div>
        <div class="numero"><b>${evals.filter((e) => e.nota >= 4).length}</b><span>Invitados a Google</span></div>
      </div>
      ${evals.map((e) => `
        <article class="tarjeta${!e.resuelta ? ' tarjeta--pendiente' : ''}">
          <div class="tarjeta-cab"><div><b>${esc(e.cliente)} · pedido ${e.pedido}</b><small>${hace(e.hora)}</small></div>
            <span class="chip-estado chip-estado--${e.nota >= 4 ? 'ok' : e.resuelta ? 'ok' : 'no'}">${'★'.repeat(e.nota)}${'☆'.repeat(5 - e.nota)}</span></div>
          ${e.texto ? `<p class="pregunta">${esc(e.texto)}</p>` : ''}
          ${e.respuesta ? `<div class="respuesta"><b>Tu respuesta</b>${esc(e.respuesta)}</div>` : ''}
          ${!e.resuelta ? `<div class="filtros"><button class="boton boton--acento" data-resolver="${esc(e.id)}">Responder y compensar</button><span style="color:var(--tenue);font-size:13px;align-self:center">Va al celular del cliente y queda registrado.</span></div>` : e.nota >= 4 ? '<small style="color:var(--ok);font-weight:700">✓ Se le invitó a dejar reseña en Google</small>' : '<small style="color:var(--ok);font-weight:700">✓ Resuelta</small>'}
        </article>`).join('') || '<div class="panel vacio">Aún no hay evaluaciones.</div>'}`;
  },

  reservas(el) {
    const todas = leer('reservas').filter((r) => filtroDia === 'todas' || (filtroDia === 'hoy' ? r.fecha === hoyIso() : r.fecha === enDias(1)));
    const orden = (a, b) => (a.estado === 'pendiente' ? -1 : 0) - (b.estado === 'pendiente' ? -1 : 0) || a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora);
    const hoy = leer('reservas').filter((r) => r.fecha === hoyIso() && r.estado === 'confirmada');
    el.innerHTML = `
      <div class="cab"><div><h1>Reservas</h1><p>El cliente elige barra, salón o terraza al reservar desde la carta. Tú asignas la mesa.</p></div>
        <button class="boton boton--linea" data-probar-reserva>Hacer una reserva de prueba ↗</button></div>
      <div class="numeros">
        <div class="numero"><b>${leer('reservas').filter((r) => r.estado === 'pendiente').length}</b><span>Por confirmar</span></div>
        <div class="numero"><b>${hoy.length}</b><span>Confirmadas hoy</span></div>
        <div class="numero"><b>${hoy.reduce((s, r) => s + r.personas, 0)}</b><span>Personas esperadas hoy</span></div>
      </div>
      <div class="filtros">${[['hoy', 'Hoy'], ['manana', 'Mañana'], ['todas', 'Todas']].map(([id, n]) => `<button class="boton boton--chico ${filtroDia === id ? '' : 'boton--linea'}" data-dia="${id}">${n}</button>`).join('')}</div>
      ${todas.length ? todas.sort(orden).map(reservaHtml).join('') : '<div class="panel vacio">No hay reservas para este día.</div>'}`;
  },

  mesas(el) {
    const mesas = leer('mesas');
    el.innerHTML = `
      <div class="cab"><div><h1>Mesas, zonas y QR</h1><p>Cada mesa tiene su QR con la carta. Anota lo que conviene saber antes de sentar a alguien: el sistema lo avisa al asignar reservas.</p></div>
        <div class="filtros"><button class="boton" data-agregar-mesa>+ Agregar mesa</button></div></div>
      ${Object.entries(ZONAS).filter(([z]) => z !== 'cualquiera').map(([z, info]) => `
        <h2>${info.icono} ${info.nombre} <small style="color:var(--tenue);font-weight:500">· ${mesas.filter((m) => m.zona === z).length} mesas</small></h2>
        <div class="qr-grilla">
          ${mesas.filter((m) => m.zona === z).map((m) => `
            <div class="qr-tarjeta">
              <h3>Mesa ${m.n}</h3>
              <small style="color:var(--tenue)">${m.cap} personas${m.nota ? ` · <span class="${m.molesta ? 'alerta-mesa' : ''}">${m.molesta ? '⚠ ' : ''}${esc(m.nota)}</span>` : ''}</small>
              <div class="qr">${qrSvg(urlDe(`carta.html?mesa=${m.n}`))}</div>
              <div class="acciones"><button class="boton boton--chico boton--linea" data-editar-mesa="${m.n}">Editar</button><button class="boton boton--chico" data-abrir-carta>Probar</button></div>
            </div>`).join('')}
        </div>`).join('')}`;
  },

  repartidores(el) {
    const lista = leer('repartidores');
    const pedidos = leer('pedidos');
    el.innerHTML = `
      <div class="cab"><div><h1>Repartidores</h1><p>Al despachar eliges quién lleva el pedido; el cliente ve su nombre y la hora de salida.</p></div>
        <button class="boton" data-nuevo-rep>+ Nuevo repartidor</button></div>
      <div class="panel"><div class="lista">
        ${lista.map((r) => {
          const ahora = pedidos.filter((p) => p.estado === 'camino' && p.repartidor === r.nombre);
          return `<div class="fila">
            <div class="mini">🛵</div>
            <div><b>${esc(r.nombre)}${r.activo ? '' : '<span class="oculto-tag">Inactivo</span>'}</b><small>${ahora.length ? `En reparto: pedido ${ahora.map((p) => p.id).join(', ')}` : 'Disponible'}</small></div>
            <div class="fila-acciones">
              <label class="switch" title="${r.activo ? 'Activo' : 'Inactivo'}"><input type="checkbox" data-activo="${esc(r.id)}"${r.activo ? ' checked' : ''} aria-label="Repartidor activo"><span></span></label>
              <button class="icono-b" data-editar-rep="${esc(r.id)}" aria-label="Editar ${esc(r.nombre)}">✎</button>
            </div></div>`;
        }).join('')}
      </div></div>`;
  },
};

// ---------- Tarjeta de pedido ----------
function pedidoHtml(p) {
  const local = leer('local');
  const m = p.eta ? minutosPara(p.eta) : null;
  const tarde = atrasado(p);
  const pr = p.problema;
  const reps = leer('repartidores').filter((r) => r.activo);
  const reloj = p.estado === 'recibido' ? `<span class="reloj reloj--nuevo">Llegó ${hace(p.hora)}</span>`
    : `<span class="reloj${tarde ? ' reloj--tarde' : m <= 5 ? ' reloj--justo' : ''}">${tarde ? `⚠ ${-m} min tarde` : `⏱ ${m} min`} · prometido ${horaCorta(p.eta)}</span>`;
  let acciones = '';
  if (p.estado === 'recibido') {
    acciones = `<small style="color:var(--tenue)">Aceptar con hora de ${p.tipo === 'retiro' ? 'retiro' : 'llegada'}:</small>
      <div class="filtros">${[local.espera - 10, local.espera, local.espera + 15].filter((x) => x > 0).map((x) => `<button class="boton boton--chico ${x === local.espera ? 'boton--acento' : 'boton--linea'}" data-aceptar="${p.id}:${x}">${horaCorta(enMin(x))} · ${x} min</button>`).join('')}</div>
      <button class="enlace" data-cancelar="${p.id}">No podemos tomarlo…</button>`;
  } else {
    const siguiente = p.estado === 'aceptado' ? `<button class="boton boton--chico" data-avanzar="${p.id}:preparacion">🔥 A la cocina</button>`
      : p.estado === 'preparacion' ? (p.tipo === 'retiro' ? `<button class="boton boton--chico" data-avanzar="${p.id}:listo">🛍 Listo para retirar</button>`
        : `<select data-rep="${p.id}" aria-label="Repartidor">${reps.map((r) => `<option${r.nombre === p.repartidor ? ' selected' : ''}>${esc(r.nombre)}</option>`).join('')}</select><button class="boton boton--chico" data-avanzar="${p.id}:camino">🛵 Salió a reparto</button>`)
        : `<button class="boton boton--chico" data-avanzar="${p.id}:entregado">🦉 Entregado</button>`;
    acciones = `<div class="filtros">${siguiente}</div>
      <div class="filtros acciones-sec">
        <button class="boton boton--chico ${tarde ? 'boton--peligro' : 'boton--linea'}" data-atraso="${p.id}">⏱ Avisar atraso</button>
        ${!pr || pr.decision ? `<button class="boton boton--chico boton--linea" data-falta="${p.id}">⚠ Falta un producto</button>` : ''}
        <button class="enlace" data-cancelar="${p.id}">Cancelar…</button>
      </div>`;
  }
  return `
    <article class="pedido${tarde ? ' pedido--tarde' : ''}${p.estado === 'recibido' ? ' pedido--nuevo' : ''}">
      <div class="pedido-cab"><b>${p.tipo === 'delivery' ? '🛵' : '🛍'} ${p.id} · ${esc(p.cliente)}</b>${reloj}</div>
      <small class="estado-p">${ESTADOS[p.estado].icono} ${ESTADOS[p.estado].label}${p.repartidor && p.estado === 'camino' ? ` con ${esc(p.repartidor)}` : ''} · ${clp(totalPedido(p))}</small>
      <div class="items">${p.items.map((i) => `<div><span>${i.cant} × ${esc(i.nombre)}${i.mods?.length ? `<span class="mods">↳ ${i.mods.map(esc).join(' · ')}</span>` : ''}</span></div>`).join('')}</div>
      ${p.direccion ? `<small>📍 ${esc(p.direccion)}</small>` : ''}
      ${p.nota ? `<div class="nota-p">✎ ${esc(p.nota)}</div>` : ''}
      ${pr && !pr.decision ? `<div class="nota-p nota-p--espera">⏳ Le preguntamos al cliente qué hacer con «${esc(pr.item)}». El resto sigue en la cocina.</div>` : ''}
      ${pr && pr.decision ? `<div class="nota-p nota-p--ok">💬 Cliente decidió: ${{ cambiar: `cambiar por ${esc(pr.alternativa?.nombre || '')}`, quitar: `quitar «${esc(pr.item)}» (−${clp(pr.monto)})`, cancelar: 'cancelar' }[pr.decision]}</div>` : ''}
      ${acciones}
    </article>`;
}

// ---------- Cambios de estado (siempre dejan un mensaje para el cliente) ----------
function actualizar(id, fn) {
  guardar('pedidos', leer('pedidos').map((p) => (p.id === id ? fn(p) : p)));
  admin.refrescar();
}
// Al cambiar la hora prometida, los mensajes anteriores conservan la hora que decían.
const congelar = (p) => p.historial.map((h) => (h.eta || !h.texto.includes('{eta}') ? h : { ...h, eta: p.eta }));

function aceptar(id, min) {
  const eta = enMin(min);
  actualizar(id, (p) => ({ ...p, estado: 'aceptado', eta, historial: [...p.historial, { t: new Date().toISOString(), e: 'aceptado', eta, texto: p.tipo === 'retiro' ? 'Aceptado. Estará listo para retirar a las {eta}.' : 'Aceptado. Llega aprox. a las {eta}.' }] }));
  toast('✅', `Pedido ${id} aceptado`, `El cliente ya ve la hora: ${horaCorta(eta)}.`);
}

function avanzar(id, estado) {
  const rep = document.querySelector(`[data-rep="${id}"]`)?.value || '';
  const textos = {
    preparacion: 'Tu pedido está en la cocina.',
    listo: 'Tu pedido está listo. Te esperamos en la barra.',
    camino: `${rep || 'El repartidor'} salió con tu pedido.`,
    entregado: 'Entregado. ¡Que lo disfrutes! Cuéntanos cómo llegó.',
  };
  actualizar(id, (p) => ({ ...p, estado, repartidor: estado === 'camino' ? rep : p.repartidor, historial: [...p.historial, { t: new Date().toISOString(), e: estado, texto: textos[estado] }] }));
  toast(ESTADOS[estado].icono, `Pedido ${id}: ${ESTADOS[estado].label}`, 'El cliente lo ve al instante.');
}

const MOTIVOS_ATRASO = ['Se nos juntaron varios pedidos.', 'El repartidor viene volviendo de otra entrega.', 'Estamos esperando que salga un ingrediente.', 'Hay mucho tráfico en Borgoño.'];
function avisarAtraso(id) {
  const p = leer('pedidos').find((x) => x.id === id);
  const base = Math.max(Date.now(), new Date(p.eta).getTime());
  const d = modal({
    titulo: `Avisar atraso · pedido ${id}`,
    cuerpo: `<p style="color:var(--tenue)">${esc(p.cliente)} tiene prometido ${horaCorta(p.eta)}. Dale una hora nueva que sí puedas cumplir y el motivo. Le llega al celular al tiro.</p>
      <div class="campo">¿Cuánto más?<div class="filtros">${[10, 15, 20, 30].map((m, i) => `<label class="opcion-r"><input type="radio" name="min" value="${m}"${i === 1 ? ' checked' : ''}><span>+${m} min · ${horaCorta(new Date(base + m * 60000).toISOString())}</span></label>`).join('')}</div></div>
      <label class="campo">Motivo para el cliente<textarea name="motivo" rows="2" required>${MOTIVOS_ATRASO[0]}</textarea></label>
      <div class="rapidas">${MOTIVOS_ATRASO.map((m) => `<button type="button" data-motivo="${esc(m)}">${esc(m)}</button>`).join('')}</div>`,
    guardar: 'Avisar al cliente',
    onGuardar(f) {
      const eta = new Date(base + Number(f.get('min')) * 60000).toISOString();
      const motivo = f.get('motivo').trim();
      actualizar(id, (x) => ({ ...x, historial: [...congelar(x), { t: new Date().toISOString(), e: 'atraso', eta, texto: `Nos vamos a demorar un poco más: ${motivo} Nueva hora: {eta}.` }], eta }));
      toast('⏱', `Aviso enviado · pedido ${id}`, `Nueva hora: ${horaCorta(eta)}.`);
    },
  });
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-motivo]'); if (b) d.querySelector('[name=motivo]').value = b.dataset.motivo; });
}

function faltaProducto(id) {
  const p = leer('pedidos').find((x) => x.id === id);
  const prods = leer('productos');
  const pintarAlt = (i) => {
    const it = p.items[i];
    const cat = prods.find((x) => x.id === it.id)?.cat;
    return prods.filter((x) => x.estado === 'disponible' && x.delivery !== false && x.id !== it.id)
      .sort((a, b) => (b.cat === cat) - (a.cat === cat) || Math.abs(a.precio - it.precio) - Math.abs(b.precio - it.precio))
      .map((x) => `<option value="${esc(x.id)}">${esc(x.nombre)} · ${clp(x.precio)}${x.precio !== it.precio ? ` (${x.precio > it.precio ? '+' : ''}${clp(x.precio - it.precio)})` : ''}</option>`).join('');
  };
  const d = modal({
    titulo: `Falta un producto · pedido ${id}`,
    cuerpo: `<p style="color:var(--tenue)">En vez de cancelar, le preguntamos al cliente. Le llegan tres opciones: cambiarlo por lo que propongas, quitarlo con descuento o cancelar. El resto del pedido sigue en la cocina.</p>
      <label class="campo">¿Qué falta?<select name="item">${p.items.map((i, k) => `<option value="${k}">${i.cant} × ${esc(i.nombre)}</option>`).join('')}</select></label>
      <label class="campo">Motivo para el cliente<input name="motivo" required value="Se nos terminó por hoy."></label>
      <label class="campo">Le proponemos<select name="alt"><option value="">Sin alternativa</option>${pintarAlt(0)}</select></label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="agotar" checked><span></span></span>Marcarlo agotado en la carta para que nadie más lo pida</label>`,
    guardar: 'Preguntar al cliente',
    onGuardar(f) {
      const k = Number(f.get('item'));
      const it = p.items[k];
      const alt = prods.find((x) => x.id === f.get('alt'));
      const motivo = f.get('motivo').trim();
      const problema = { indice: k, item: it.nombre, motivo, monto: it.precio * it.cant, alternativa: alt ? { id: alt.id, nombre: alt.nombre, precio: alt.precio, dif: (alt.precio - it.precio) * it.cant } : null, decision: null };
      actualizar(id, (x) => ({ ...x, problema, historial: [...x.historial, { t: new Date().toISOString(), e: 'problema', texto: `Se nos acabó ${it.nombre}. Elige qué prefieres.` }] }));
      if (f.get('agotar') === 'on') guardar('productos', prods.map((x) => (x.id === it.id ? { ...x, estado: 'agotado', motivoAgotado: motivo } : x)));
      toast('⚠', `Pregunta enviada · pedido ${id}`, 'Te avisamos cuando el cliente elija.');
    },
  });
  d.querySelector('[name=item]').addEventListener('change', (e) => { d.querySelector('[name=alt]').innerHTML = `<option value="">Sin alternativa</option>${pintarAlt(Number(e.target.value))}`; });
}

const MOTIVOS_CANCELA = ['No llegamos a esa dirección: está fuera de nuestra zona de reparto.', 'Se nos cayó el sistema de la cocina y no podemos cumplir a tiempo.', 'Cerramos la cocina antes por un problema técnico.'];
function cancelar(id) {
  const p = leer('pedidos').find((x) => x.id === id);
  const d = modal({
    titulo: `Cancelar pedido ${id}`,
    cuerpo: `<p style="color:var(--tenue)">Último recurso. ${esc(p.cliente)} recibe el motivo al instante y, si pagó en línea, el reembolso sale automático. Si el problema es un solo producto, usa «Falta un producto».</p>
      <label class="campo">Motivo (obligatorio)<textarea name="motivo" rows="3" required placeholder="Explica por qué, en palabras simples"></textarea></label>
      <div class="rapidas">${MOTIVOS_CANCELA.map((m) => `<button type="button" data-motivo="${esc(m)}">${esc(m)}</button>`).join('')}</div>`,
    guardar: 'Cancelar y avisar',
    onGuardar(f) {
      const motivo = f.get('motivo').trim();
      if (!motivo) return false;
      actualizar(id, (x) => ({ ...x, estado: 'cancelado', motivo, historial: [...x.historial, { t: new Date().toISOString(), e: 'cancelado', texto: `Tuvimos que cancelar tu pedido: ${motivo} No se te cobra nada.` }] }));
      toast('✋', `Pedido ${id} cancelado`, 'El cliente recibió el motivo.');
    },
  });
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-motivo]'); if (b) d.querySelector('[name=motivo]').value = b.dataset.motivo; });
}

function resolver(eid) {
  const ev = leer('evaluaciones').find((x) => x.id === eid);
  const d = modal({
    titulo: `Responder a ${esc(ev.cliente)}`,
    cuerpo: `<p class="pregunta" style="font-size:15px">${'★'.repeat(ev.nota)} · ${esc(ev.texto || 'Sin comentario')}</p>
      <label class="campo">Tu respuesta<textarea name="r" rows="3" required>Te pedimos disculpas, ${esc(ev.cliente)}. Ya lo conversamos con la cocina. En tu próximo pedido te regalamos unas Papas Owl.</textarea></label>`,
    guardar: 'Enviar respuesta',
    onGuardar(f) {
      const respuesta = f.get('r').trim();
      guardar('evaluaciones', leer('evaluaciones').map((x) => (x.id === eid ? { ...x, resuelta: true, respuesta } : x)));
      guardar('pedidos', leer('pedidos').map((p) => (p.id === ev.pedido && p.evaluacion ? { ...p, evaluacion: { ...p.evaluacion, respuesta } } : p)));
      admin.refrescar();
      toast('★', 'Respuesta enviada', 'El cliente la ve en su pedido.');
    },
  });
  return d;
}

// ---------- Reservas ----------
const asignando = {};
function reservaHtml(r) {
  const e = ESTADOS_RESERVA[r.estado];
  const mesas = leer('mesas');
  const m = mesas.find((x) => x.n === r.mesa);
  const libres = r.estado === 'pendiente' ? mesasLibres(r, r.id) : [];
  const libresIds = new Set(libres.map((x) => x.n));
  const sugerida = libres.find((x) => !x.molesta);
  const elegida = asignando[r.id] ?? sugerida?.n;
  const candidatas = mesas.filter((x) => (r.zona === 'cualquiera' || x.zona === r.zona) && x.cap >= r.personas);
  const chipClase = r.estado === 'pendiente' ? 'pendiente' : r.estado === 'confirmada' ? 'ok' : 'no';
  return `
    <article class="tarjeta${r.estado === 'pendiente' ? ' tarjeta--pendiente' : ''}">
      <div class="tarjeta-cab">
        <div><b style="font-size:16px">${esc(r.nombre)} · ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}</b>
          <small>${fechaCorta(r.fecha)} · ${r.hora} · ${esc(r.telefono)}${r.ocasion ? ` · 🎉 ${esc(r.ocasion)}` : ''}</small></div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="zona-tag">Pidió: ${ZONAS[r.zona].icono} ${ZONAS[r.zona].nombre}</span><span class="chip-estado chip-estado--${chipClase}">${e.icono} ${e.label}</span></div>
      </div>
      ${r.nota ? `<div class="respuesta" style="background:var(--panel2);border-color:var(--linea)"><b style="color:var(--tenue)">Nota del cliente</b>${esc(r.nota)}</div>` : ''}
      ${r.estado === 'confirmada' && m ? `<p>Mesa <b>${m.n}</b> · ${ZONAS[m.zona].nombre} · ${m.cap} personas${m.nota ? ` · ${esc(m.nota)}` : ''}</p>` : ''}
      ${r.estado === 'rechazada' ? `<p style="color:var(--tenue)">Respuesta: ${esc(r.respuesta || '')}</p>` : ''}
      ${r.estado === 'pendiente' ? `
        <div class="mesas-zona">
          <small style="color:var(--tenue)">Elige la mesa. En verde la sugerida; con borde punteado, las que conviene evitar.</small>
          <div class="mesas-grilla">
            ${candidatas.map((x) => {
              const libre = libresIds.has(x.n);
              const cls = ['mesa-b', libre ? '' : 'ocupada', x.molesta ? 'molesta' : '', x.n === sugerida?.n ? 'sugerida' : ''].join(' ');
              return `<button type="button" class="${cls}" data-mesa-r="${esc(r.id)}:${x.n}" aria-pressed="${elegida === x.n}"${libre ? '' : ' disabled'}><b>Mesa ${x.n}</b><small>${x.cap} pers.${x.nota ? ` · ${x.molesta ? '⚠ ' : ''}${esc(x.nota)}` : ''}</small><small>${libre ? (x.n === sugerida?.n ? '★ Sugerida' : 'Libre') : 'Ocupada a esa hora'}</small></button>`;
            }).join('') || '<small>No hay mesas de ese tamaño en esta zona.</small>'}
          </div>
        </div>
        <div class="filtros">
          <button class="boton boton--acento" data-confirmar-r="${esc(r.id)}"${elegida ? '' : ' disabled'}>Confirmar${elegida ? ` mesa ${elegida}` : ''}</button>
          <button class="boton boton--linea" data-rechazar-r="${esc(r.id)}">Sin disponibilidad…</button>
          <a class="boton boton--linea" href="https://wa.me/${esc(r.telefono.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>
        </div>` : ''}
    </article>`;
}

function confirmarReserva(id) {
  const r = leer('reservas').find((x) => x.id === id);
  const n = asignando[id] ?? mesasLibres(r, id).find((x) => !x.molesta)?.n;
  if (!n) return;
  guardar('reservas', leer('reservas').map((x) => (x.id === id ? { ...x, estado: 'confirmada', mesa: n } : x)));
  delete asignando[id];
  admin.refrescar();
  toast('📅', `Reserva confirmada · mesa ${n}`, `${esc(r.nombre)} ya lo ve en «Mis reservas».`);
}

function rechazarReserva(id) {
  const r = leer('reservas').find((x) => x.id === id);
  modal({
    titulo: 'Avisar que no hay disponibilidad',
    cuerpo: `<p style="color:var(--tenue)">${esc(r.nombre)} pidió ${ZONAS[r.zona].nombre.toLowerCase()} para ${r.personas}, ${fechaCorta(r.fecha).toLowerCase()} a las ${r.hora}. Dale una alternativa:</p>
      <label class="campo">Mensaje<textarea name="msg" required rows="3">A esa hora no nos quedan mesas en ${ZONAS[r.zona].nombre.toLowerCase()}. ¿Te acomoda a las ${String((Number(r.hora.slice(0, 2)) + 1) % 24).padStart(2, '0')}:00 o en otra zona?</textarea></label>`,
    guardar: 'Enviar',
    onGuardar(f) {
      guardar('reservas', leer('reservas').map((x) => (x.id === id ? { ...x, estado: 'rechazada', respuesta: f.get('msg').trim() } : x)));
      admin.refrescar();
    },
  });
}

// ---------- Formularios ----------
function formRepartidor(id) {
  const g = leer('repartidores').find((x) => x.id === id) || { nombre: '', activo: true };
  modal({
    titulo: id ? 'Editar repartidor' : 'Nuevo repartidor',
    cuerpo: `<label class="campo">Nombre<input name="nombre" value="${esc(g.nombre)}" required></label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="activo"${g.activo ? ' checked' : ''}><span></span></span>Activo hoy</label>`,
    onGuardar(f) {
      const l = leer('repartidores');
      const datos = { nombre: f.get('nombre').trim(), activo: f.get('activo') === 'on' };
      if (id) Object.assign(l.find((x) => x.id === id), datos); else l.push({ id: uid(), ...datos });
      guardar('repartidores', l);
      admin.refrescar();
    },
  });
}

function formMesa(n) {
  const mesas = leer('mesas');
  const m = mesas.find((x) => x.n === n) || { n: Math.max(0, ...mesas.map((x) => x.n)) + 1, zona: 'salon', cap: 2, nota: '', molesta: false };
  modal({
    titulo: n ? `Mesa ${n}` : 'Nueva mesa',
    cuerpo: `<div class="form-2">
        <label class="campo">Zona<select name="zona">${Object.entries(ZONAS).filter(([z]) => z !== 'cualquiera').map(([z, i]) => `<option value="${z}"${z === m.zona ? ' selected' : ''}>${i.icono} ${i.nombre}</option>`).join('')}</select></label>
        <label class="campo">Capacidad<input name="cap" type="number" min="1" max="12" value="${m.cap}" required></label>
      </div>
      <label class="campo">Nota <small>Ej.: frente al bartender, junto al baño</small><input name="nota" value="${esc(m.nota)}"></label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="molesta"${m.molesta ? ' checked' : ''}><span></span></span>Conviene evitarla (se ofrece al final)</label>`,
    extra: n ? '<button type="button" class="boton boton--peligro" data-borrar style="margin-right:auto">Eliminar</button>' : '',
    onGuardar(f) {
      const l = leer('mesas');
      const datos = { zona: f.get('zona'), cap: Number(f.get('cap')) || 2, nota: f.get('nota').trim(), molesta: f.get('molesta') === 'on' };
      if (n) Object.assign(l.find((x) => x.n === n), datos); else l.push({ n: m.n, ...datos });
      guardar('mesas', l);
      admin.refrescar();
    },
  }).addEventListener('click', (e) => {
    if (e.target.closest('[data-borrar]') && confirm(`¿Eliminar la mesa ${n}?`)) {
      guardar('mesas', leer('mesas').filter((x) => x.n !== n));
      e.target.closest('dialog').close();
      admin.refrescar();
    }
  });
}

// ---------- Eventos ----------
const num = (s) => s.split(':').map((x, i) => (i === 0 || /^\d+$/.test(x) ? Number(x) : x));
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('dialog')) return;
  if (t.closest('[data-probar]')) return irA('pedidos');
  if (t.closest('[data-probar-reserva]') || t.closest('[data-abrir-carta]')) return irA('carta');
  const es = t.closest('[data-espera]');
  if (es) { guardar('local', { ...leer('local'), espera: Number(es.dataset.espera), pausa: false }); admin.refrescar(); return toast('⏱', `Espera: ~${es.dataset.espera} min`, 'Es lo que ven los clientes antes de pedir.'); }
  if (t.closest('[data-pausa]')) { const l = leer('local'); guardar('local', { ...l, pausa: !l.pausa }); admin.refrescar(); return toast(l.pausa ? '▶' : '⏸', l.pausa ? 'Pedidos reanudados' : 'Pedidos online en pausa', l.pausa ? 'Los clientes ya pueden pedir.' : 'La carta avisa que vuelvan en un rato. Los pedidos en curso siguen igual.'); }
  const ac = t.closest('[data-aceptar]');
  if (ac) { const [id, m] = num(ac.dataset.aceptar); return aceptar(id, m); }
  const av = t.closest('[data-avanzar]');
  if (av) { const [id, est] = num(av.dataset.avanzar); return avanzar(id, est); }
  const at = t.closest('[data-atraso]');
  if (at) return avisarAtraso(Number(at.dataset.atraso));
  const fa = t.closest('[data-falta]');
  if (fa) return faltaProducto(Number(fa.dataset.falta));
  const ca = t.closest('[data-cancelar]');
  if (ca) return cancelar(Number(ca.dataset.cancelar));
  const rs = t.closest('[data-resolver]');
  if (rs) return resolver(rs.dataset.resolver);
  const dia = t.closest('[data-dia]');
  if (dia) { filtroDia = dia.dataset.dia; return admin.refrescar(); }
  const mr = t.closest('[data-mesa-r]');
  if (mr) { const [id, n] = mr.dataset.mesaR.split(':'); asignando[id] = Number(n); return admin.refrescar(); }
  const cr = t.closest('[data-confirmar-r]');
  if (cr) return confirmarReserva(cr.dataset.confirmarR);
  const rr = t.closest('[data-rechazar-r]');
  if (rr) return rechazarReserva(rr.dataset.rechazarR);
  if (t.closest('[data-nuevo-rep]')) return formRepartidor();
  const er = t.closest('[data-editar-rep]');
  if (er) return formRepartidor(er.dataset.editarRep);
  if (t.closest('[data-agregar-mesa]')) return formMesa();
  const em = t.closest('[data-editar-mesa]');
  if (em) return formMesa(Number(em.dataset.editarMesa));
});
document.addEventListener('change', (e) => {
  const a = e.target.closest('[data-activo]');
  if (a) { guardar('repartidores', leer('repartidores').map((g) => (g.id === a.dataset.activo ? { ...g, activo: a.checked } : g))); admin.refrescar(); }
});

// ---------- Avisos en vivo desde la pantalla 3 ----------
const firma = (p) => `${p.estado}|${p.problema?.decision || ''}|${p.evaluacion ? 1 : 0}`;
let conocidos = new Map(leer('pedidos').map((p) => [p.id, firma(p)]));
let reservas = new Set(leer('reservas').map((r) => r.id));
alCambiar((clave) => {
  if (clave === 'pedidos') {
    for (const p of leer('pedidos')) {
      const antes = conocidos.get(p.id);
      if (antes === firma(p)) continue;
      if (!antes) toast('🧾', `Nuevo pedido ${p.id} · ${p.tipo === 'delivery' ? 'Delivery' : 'Retiro'}`, `${esc(p.cliente)} · ${p.items.reduce((s, i) => s + i.cant, 0)} productos · ${clp(totalPedido(p))}. Acéptalo con una hora.`, () => admin.mostrar('pedidos'));
      else if (p.problema?.decision && !antes.includes(`|${p.problema.decision}|`)) toast('💬', `Pedido ${p.id}: el cliente eligió`, { cambiar: `Cambiar por ${esc(p.problema.alternativa?.nombre || '')}`, quitar: `Quitar ${esc(p.problema.item)}`, cancelar: 'Cancelar el pedido' }[p.problema.decision], () => admin.mostrar('pedidos'));
      else if (p.evaluacion && antes.endsWith('|0')) toast(p.evaluacion.nota >= 4 ? '★' : '⚠', `Evaluación ${'★'.repeat(p.evaluacion.nota)} · pedido ${p.id}`, p.evaluacion.nota >= 4 ? 'Lo invitamos a dejar reseña en Google.' : 'Llegó a Evaluaciones para que lo resuelvas.', () => admin.mostrar('evaluaciones'));
    }
    conocidos = new Map(leer('pedidos').map((p) => [p.id, firma(p)]));
  }
  if (clave === 'reservas') {
    for (const r of leer('reservas')) if (!reservas.has(r.id)) toast('📅', `Nueva reserva · ${esc(r.nombre)}`, `${r.personas} pers. · ${fechaCorta(r.fecha)} ${r.hora} · ${ZONAS[r.zona].nombre}`, () => admin.mostrar('reservas'));
    reservas = new Set(leer('reservas').map((r) => r.id));
  }
  if (!document.querySelector('dialog[open]')) admin.refrescar(); else admin.pintarTabs();
});
// Lo que llegó mientras este administrador estaba cerrado también se avisa una vez.
(function avisosPendientes() {
  const K = PREF + 'vistos-admin';
  let vistos;
  try { vistos = new Set(JSON.parse(localStorage.getItem(K) || '[]')); } catch { vistos = new Set(); }
  for (const p of leer('pedidos')) if (p.estado === 'recibido' && !vistos.has(`p${p.id}`)) toast('🧾', `Pedido ${p.id} sin aceptar`, `${esc(p.cliente)} · ${clp(totalPedido(p))}`, () => admin.mostrar('pedidos'));
  for (const r of leer('reservas')) if (r.estado === 'pendiente' && !vistos.has(`r${r.id}`)) toast('📅', `Reserva por confirmar · ${esc(r.nombre)}`, `${r.personas} pers. · ${fechaCorta(r.fecha)} ${r.hora}`, () => admin.mostrar('reservas'));
  const todos = [...leer('pedidos').map((p) => `p${p.id}`), ...leer('reservas').map((r) => `r${r.id}`)];
  try { localStorage.setItem(K, JSON.stringify(todos)); } catch { /* nada */ }
})();

// Los cronómetros avanzan solos.
setInterval(() => { if (admin.actual === 'pedidos' && !document.querySelector('dialog[open]') && document.activeElement?.tagName !== 'SELECT') admin.refrescar(); }, 20000);

admin.refrescar();

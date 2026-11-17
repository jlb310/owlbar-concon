// Pantalla 2: administrador de la carta (productos con disponibilidad del día y opciones, categorías, local, tema y QR).
import { leer, guardar, alCambiar, fotoUrl, clp, esc, uid, irA, PREF } from './store.js';
import { crearAdmin, modal, qrSvg, urlDe, toast } from './admin-base.js';

let busq = '';
let catFiltro = '';

const fotoMini = (p) => (p.foto ? `<img src="${esc(fotoUrl(p.foto, 120))}" alt="">` : esc(p.emoji || '🍽️'));
const ESTADO_P = { disponible: ['Disponible', 'chip-estado--ok'], agotado: ['Agotado hoy', 'chip-estado--no'], oculto: ['Oculto', ''] };

// Opciones como texto editable: «Grupo: opción +precio, opción, …» (un grupo por línea; «*» al final del grupo = elegir varias).
const opcionesATexto = (ops = []) => ops.map((g) => `${g.grupo}${g.multi ? '*' : ''}: ${g.items.map((o) => `${o.n}${o.p ? ` ${o.p > 0 ? '+' : ''}${o.p}` : ''}`).join(', ')}`).join('\n');
function textoAOpciones(t) {
  return t.split('\n').map((l) => l.trim()).filter((l) => l.includes(':')).map((l) => {
    const [cab, resto] = [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1)];
    const multi = cab.trim().endsWith('*');
    const items = resto.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(.*?)\s*([+-]\s*\d[\d.]*)$/);
      return m ? { n: m[1].trim(), p: Number(m[2].replace(/[\s.]/g, '')) } : { n: s, p: 0 };
    });
    return { grupo: cab.replace('*', '').trim(), multi, items };
  }).filter((g) => g.items.length);
}

const admin = crearAdmin({
  plan: 'Plan carta',
  verCarta: 'carta',
  pestanas: [
    { id: 'resumen', nombre: 'Hoy', icono: '▦' },
    { id: 'productos', nombre: 'Productos', icono: '☰' },
    { id: 'categorias', nombre: 'Categorías', icono: '⌗' },
    { id: 'local', nombre: 'Datos del local', icono: '◎' },
    { id: 'personalizar', nombre: 'Personalizar', icono: '✦' },
    { id: 'qr', nombre: 'Código QR', icono: '▣' },
  ],
  badges: () => ({ resumen: leer('productos').filter((p) => p.estado === 'agotado').length }),
  pintar(id, el) { VISTAS[id](el); },
});

const VISTAS = {
  resumen(el) {
    const productos = leer('productos');
    const agotados = productos.filter((p) => p.estado === 'agotado');
    const conOpciones = productos.filter((p) => p.cambios !== false && p.opciones?.length);
    el.innerHTML = `
      <div class="cab"><div><h1>La carta de hoy</h1><p>Lo que se agota se marca aquí al tiro: desaparece del pedido online y nadie lo pide para que después haya que cancelárselo.</p></div>
        <button class="boton" data-ir-carta>Ver la carta ↗</button></div>
      <div class="numeros">
        <div class="numero"><b>${productos.filter((p) => p.estado === 'disponible').length}</b><span>Disponibles hoy</span></div>
        <div class="numero"><b>${agotados.length}</b><span>Agotados hoy</span></div>
        <div class="numero"><b>${conOpciones.length}</b><span>Con opciones para personalizar</span></div>
        <div class="numero"><b>${productos.filter((p) => p.delivery === false).length}</b><span>Solo en el bar (no viajan)</span></div>
      </div>
      <div class="panel">
        <div class="cab"><div><h2>Disponibilidad rápida</h2><p>Un toque para marcar agotado o volver a disponible.</p></div></div>
        <div class="lista" style="margin-top:8px">
          ${productos.filter((p) => p.estado !== 'oculto').map((p) => `
            <div class="fila">
              <div class="mini">${fotoMini(p)}</div>
              <div><b>${esc(p.nombre)}</b><small>${p.estado === 'agotado' ? `<span class="alerta-mesa">Agotado:</span> ${esc(p.motivoAgotado || 'sin motivo')}` : clp(p.precio)}</small></div>
              <div class="fila-acciones"><button class="boton boton--chico ${p.estado === 'agotado' ? '' : 'boton--linea'}" data-agotar="${esc(p.id)}">${p.estado === 'agotado' ? '✓ Volvió' : 'Se agotó'}</button></div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  productos(el) {
    const productos = leer('productos');
    const cats = leer('categorias');
    const q = busq.toLowerCase();
    const lista = productos.filter((p) => (!catFiltro || p.cat === catFiltro) && (!q || p.nombre.toLowerCase().includes(q)));
    const catNombre = (id) => cats.find((c) => c.id === id)?.nombre || 'Sin categoría';
    el.innerHTML = `
      <div class="cab"><div><h1>Productos</h1><p>Precios, fotos, disponibilidad y las opciones que el cliente puede elegir (punto de la carne, acompañamiento, gin…).</p></div>
        <button class="boton" data-nuevo>+ Nuevo producto</button></div>
      <div class="panel">
        <div class="filtros">
          <input type="search" id="busq" placeholder="Buscar producto" value="${esc(busq)}" aria-label="Buscar producto">
          <select id="cat-filtro" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${cats.map((c) => `<option value="${esc(c.id)}"${c.id === catFiltro ? ' selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('')}</select>
        </div>
        <div class="lista" style="margin-top:8px">
          ${lista.length ? lista.map((p) => {
            const [label, cls] = ESTADO_P[p.estado] || ESTADO_P.disponible;
            return `
            <div class="fila">
              <div class="mini">${fotoMini(p)}</div>
              <div><b>${esc(p.nombre)}</b><small>${esc(catNombre(p.cat))} · ${clp(p.precio)}${p.cambios === false ? ' · Sin cambios' : p.opciones?.length ? ` · ${p.opciones.length} ${p.opciones.length === 1 ? 'grupo' : 'grupos'} de opciones` : ''}</small></div>
              <div class="fila-acciones">
                <span class="chip-estado ${cls}">${label}</span>
                <button class="icono-b" data-editar="${esc(p.id)}" aria-label="Editar ${esc(p.nombre)}">✎</button>
              </div>
            </div>`;
          }).join('') : '<p class="vacio">No hay productos con ese filtro.</p>'}
        </div>
      </div>`;
  },

  categorias(el) {
    const cats = leer('categorias');
    const productos = leer('productos');
    el.innerHTML = `
      <div class="cab"><div><h1>Categorías</h1><p>Las secciones de la carta, en el orden en que aparecen.</p></div>
        <button class="boton" data-nueva-cat>+ Nueva categoría</button></div>
      <div class="panel"><div class="lista">
        ${cats.map((c, i) => `
          <div class="fila">
            <div class="mini">${esc(c.icono)}</div>
            <div><b>${esc(c.nombre)}</b><small>${productos.filter((p) => p.cat === c.id).length} productos</small></div>
            <div class="fila-acciones">
              <button class="icono-b" data-subir="${i}" aria-label="Subir"${i === 0 ? ' disabled style="opacity:.35"' : ''}>↑</button>
              <button class="icono-b" data-editar-cat="${esc(c.id)}" aria-label="Editar ${esc(c.nombre)}">✎</button>
            </div>
          </div>`).join('')}
      </div></div>`;
  },

  local(el) {
    const l = leer('local');
    el.innerHTML = `
      <div class="cab"><div><h1>Datos del local</h1><p>Lo que aparece en la carta: dirección, horario, teléfono y redes. Las consultas y los avisos de pedidos salen de este WhatsApp.</p></div></div>
      <form class="panel form" id="form-local">
        <div class="form-2">
          <label class="campo">Nombre del local<input name="nombre" value="${esc(l.nombre)}" required></label>
          <label class="campo">Tipo de local<input name="tipo" value="${esc(l.tipo)}"></label>
          <label class="campo">Dirección<input name="direccion" value="${esc(l.direccion)}"></label>
          <label class="campo">Horario<input name="horario" value="${esc(l.horario)}"></label>
          <label class="campo">Teléfono<input name="telefono" value="${esc(l.telefono)}" inputmode="tel"></label>
          <label class="campo">WhatsApp <small>Solo números, con 56</small><input name="whatsapp" value="${esc(l.whatsapp)}" inputmode="numeric"></label>
          <label class="campo">Instagram<input name="instagram" value="${esc(l.instagram)}" placeholder="https://instagram.com/…"></label>
          <label class="campo">Facebook<input name="facebook" value="${esc(l.facebook)}" placeholder="https://facebook.com/…"></label>
          <label class="campo">Sitio web<input name="sitio" value="${esc(l.sitio)}" placeholder="https://…"></label>
        </div>
        <div><button class="boton">Guardar cambios</button></div>
      </form>`;
  },

  personalizar(el) {
    const l = leer('local');
    const temas = [
      ['noche', 'Noche', 'Negro tostado, crema y bronce OWL.', 'linear-gradient(135deg,#0d0a07 60%,#c9a36a 60%)'],
      ['claro', 'Día', 'Fondo claro para leer a pleno sol.', 'linear-gradient(135deg,#f4ede1 60%,#1d1610 60%)'],
    ];
    el.innerHTML = `
      <div class="cab"><div><h1>Personalizar la carta</h1><p>Título, frase de portada y el tema de colores.</p></div><button class="boton boton--linea" data-ir-carta>Ver cómo queda ↗</button></div>
      <form class="panel form" id="form-portada">
        <label class="campo">Título de portada <small>Máximo 28 caracteres, para que quede en una línea.</small><input name="titulo" maxlength="28" value="${esc(l.titulo)}"></label>
        <label class="campo">Frase de portada<input name="frase" maxlength="90" value="${esc(l.frase)}"></label>
        <div class="campo">Tema de la carta
          <div class="opciones">${temas.map(([id, n, d, g]) => `<button type="button" class="opcion" data-tema="${id}" aria-pressed="${l.tema === id}"><i style="background:${g}"></i><b>${n}</b><small>${d}</small></button>`).join('')}</div>
        </div>
        <div><button class="boton">Guardar cambios</button></div>
      </form>`;
  },

  qr(el) {
    const url = urlDe('carta.html');
    el.innerHTML = `
      <div class="cab"><div><h1>Código QR</h1><p>Un solo QR para la carta, las reservas y la ayuda. Para Instagram, la mesa o la barra.</p></div></div>
      <div class="panel qr-grande">
        <div class="qr">${qrSvg(url)}</div>
        <div><b>${esc(leer('local').nombre)}</b><br><small style="color:var(--tenue)">${esc(url)}</small></div>
        <div class="filtros" style="justify-content:center">
          <button class="boton" onclick="window.print()">Imprimir</button>
          <button class="boton boton--linea" data-ir-carta>Abrir la carta</button>
        </div>
        <p style="color:var(--tenue);font-size:13px;max-width:440px">¿Delivery y retiro? En el plan con pedidos online, el cliente pide desde aquí y sigue su pedido en vivo, con la hora prometida.</p>
      </div>`;
  },
};

// ---------- Formularios ----------
function formProducto(id) {
  const productos = leer('productos');
  const cats = leer('categorias');
  const p = productos.find((x) => x.id === id) || { id: '', nombre: '', precio: '', cat: cats[0]?.id, etiqueta: '', desc: '', detalle: '', foto: '', emoji: '🍽️', estado: 'disponible', motivoAgotado: '', cambios: true, motivoCambios: '', opciones: [] };
  const d = modal({
    titulo: id ? 'Editar producto' : 'Nuevo producto',
    cuerpo: `
      <div class="form-2">
        <label class="campo">Nombre<input name="nombre" value="${esc(p.nombre)}" required></label>
        <label class="campo">Precio<input name="precio" type="number" min="0" step="50" value="${esc(p.precio)}" required inputmode="numeric"></label>
        <label class="campo">Categoría<select name="cat">${cats.map((c) => `<option value="${esc(c.id)}"${c.id === p.cat ? ' selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('')}</select></label>
        <label class="campo">Etiqueta <small>Opcional: «De la casa», «Nuevo»…</small><input name="etiqueta" value="${esc(p.etiqueta)}"></label>
      </div>
      <label class="campo">Descripción corta<input name="desc" value="${esc(p.desc)}"></label>
      <div class="form-2">
        <label class="campo">Disponibilidad<select name="estado">${Object.entries(ESTADO_P).map(([k, [n]]) => `<option value="${k}"${k === p.estado ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="campo">Si está agotado, ¿por qué? <small>El cliente lo lee en la carta</small><input name="motivoAgotado" value="${esc(p.motivoAgotado || '')}" placeholder="Ej.: se terminó por hoy, prueba el…"></label>
      </div>
      <label class="campo">Opciones para el cliente <small>Un grupo por línea: <code>Acompañamiento: Papas rústicas, Papas Owl +2500</code>. Agrega * al nombre del grupo si se pueden elegir varias.</small><textarea name="opciones" rows="4">${esc(opcionesATexto(p.opciones))}</textarea></label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="delivery"${p.delivery !== false ? ' checked' : ''}><span></span></span>Se puede pedir para llevar (delivery y retiro)</label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="cambios"${p.cambios !== false ? ' checked' : ''}><span></span></span>Admite cambios</label>
      <label class="campo">Si no admite cambios, explica por qué<input name="motivoCambios" value="${esc(p.motivoCambios || '')}" placeholder="Ej.: es una promoción cerrada"></label>
      <div class="form-2">
        <label class="campo">Foto <small>Enlace a una imagen (opcional)</small><input name="foto" value="${esc(p.foto ? fotoUrl(p.foto, 900) : '')}" placeholder="https://…"></label>
        <label class="campo">Emoji si no hay foto<input name="emoji" value="${esc(p.emoji || '')}" maxlength="4"></label>
      </div>`,
    extra: id ? '<button type="button" class="boton boton--peligro" data-borrar style="margin-right:auto">Eliminar</button>' : '',
    onGuardar(f) {
      const cambios = f.get('cambios') === 'on';
      if (!cambios && !f.get('motivoCambios').trim()) { toast('✋', 'Falta el motivo', 'Si no admite cambios, explica por qué: el cliente lo verá.'); return false; }
      const datos = { nombre: f.get('nombre').trim(), precio: Number(f.get('precio')), cat: f.get('cat'), etiqueta: f.get('etiqueta').trim(), desc: f.get('desc').trim(), estado: f.get('estado'), motivoAgotado: f.get('motivoAgotado').trim(), opciones: textoAOpciones(f.get('opciones')), cambios, motivoCambios: f.get('motivoCambios').trim(), delivery: f.get('delivery') === 'on', foto: f.get('foto').trim(), emoji: f.get('emoji').trim() };
      const lista = leer('productos');
      if (id) Object.assign(lista.find((x) => x.id === id), datos); else lista.push({ id: uid(), tags: [], ...datos });
      guardar('productos', lista);
      admin.refrescar();
      toast('✓', 'Producto guardado', 'Ya se ve en la carta.');
    },
  });
  d.addEventListener('click', (e) => {
    if (e.target.closest('[data-borrar]') && confirm(`¿Eliminar «${p.nombre}» de la carta?`)) {
      guardar('productos', leer('productos').filter((x) => x.id !== id));
      d.close();
      admin.refrescar();
    }
  });
}

function formAgotado(id) {
  const p = leer('productos').find((x) => x.id === id);
  modal({
    titulo: `Se agotó: ${esc(p.nombre)}`,
    cuerpo: `<p style="color:var(--tenue)">Sale del pedido online al tiro y sigue en la carta marcado como agotado. Cuéntale al cliente por qué y qué puede pedir en su lugar.</p>
      <label class="campo">Mensaje para el cliente<input name="motivo" value="${esc(p.motivoAgotado || 'Se terminó por hoy.')}" required></label>`,
    guardar: 'Marcar agotado',
    onGuardar(f) {
      guardar('productos', leer('productos').map((x) => (x.id === id ? { ...x, estado: 'agotado', motivoAgotado: f.get('motivo').trim() } : x)));
      admin.refrescar();
      toast('✓', `${p.nombre} agotado`, 'La carta ya lo muestra con tu mensaje.');
    },
  });
}

function formCategoria(id) {
  const cats = leer('categorias');
  const c = cats.find((x) => x.id === id) || { id: '', nombre: '', icono: '🍣' };
  modal({
    titulo: id ? 'Editar categoría' : 'Nueva categoría',
    cuerpo: `<div class="form-2"><label class="campo">Nombre<input name="nombre" value="${esc(c.nombre)}" required></label><label class="campo">Ícono (emoji)<input name="icono" value="${esc(c.icono)}" maxlength="4"></label></div>`,
    extra: id ? '<button type="button" class="boton boton--peligro" data-borrar style="margin-right:auto">Eliminar</button>' : '',
    onGuardar(f) {
      const lista = leer('categorias');
      const datos = { nombre: f.get('nombre').trim(), icono: f.get('icono').trim() || '🍣' };
      if (id) Object.assign(lista.find((x) => x.id === id), datos); else lista.push({ id: uid(), ...datos });
      guardar('categorias', lista);
      admin.refrescar();
    },
  }).addEventListener('click', (e) => {
    if (!e.target.closest('[data-borrar]')) return;
    const n = leer('productos').filter((p) => p.cat === id).length;
    if (n) return alert(`Esta categoría tiene ${n} productos. Muévelos a otra categoría antes de eliminarla.`);
    if (confirm(`¿Eliminar la categoría «${c.nombre}»?`)) { guardar('categorias', leer('categorias').filter((x) => x.id !== id)); e.target.closest('dialog').close(); admin.refrescar(); }
  });
}

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-ir-carta]')) return irA('carta');
  const ag = t.closest('[data-agotar]');
  if (ag) {
    const p = leer('productos').find((x) => x.id === ag.dataset.agotar);
    if (p.estado === 'agotado') { guardar('productos', leer('productos').map((x) => (x.id === p.id ? { ...x, estado: 'disponible' } : x))); admin.refrescar(); return toast('✓', `${p.nombre} disponible`, 'Volvió a la carta.'); }
    return formAgotado(p.id);
  }
  if (t.closest('[data-nuevo]')) return formProducto();
  const ed = t.closest('[data-editar]');
  if (ed) return formProducto(ed.dataset.editar);
  if (t.closest('[data-nueva-cat]')) return formCategoria();
  const ec = t.closest('[data-editar-cat]');
  if (ec) return formCategoria(ec.dataset.editarCat);
  const sub = t.closest('[data-subir]');
  if (sub) { const l = leer('categorias'); const i = Number(sub.dataset.subir); [l[i - 1], l[i]] = [l[i], l[i - 1]]; guardar('categorias', l); return admin.refrescar(); }
  const tema = t.closest('[data-tema]');
  if (tema) document.querySelectorAll('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', b === tema));
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'cat-filtro') { catFiltro = e.target.value; admin.refrescar(); }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'busq') return;
  busq = e.target.value;
  admin.refrescar();
  const b = document.getElementById('busq'); b.focus(); b.setSelectionRange(busq.length, busq.length);
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'form-local') {
    e.preventDefault();
    guardar('local', { ...leer('local'), ...Object.fromEntries(new FormData(e.target)) });
    toast('✓', 'Datos guardados', 'La carta ya muestra la información nueva.');
  }
  if (e.target.id === 'form-portada') {
    e.preventDefault();
    const tema = document.querySelector('[data-tema][aria-pressed="true"]')?.dataset.tema || 'noche';
    guardar('local', { ...leer('local'), ...Object.fromEntries(new FormData(e.target)), tema });
    try { localStorage.removeItem(PREF + 'tema'); } catch { /* nada */ }
    toast('✓', 'Carta personalizada', 'Abre la carta para ver el cambio.', () => irA('carta'));
  }
});

alCambiar(() => { if (!document.querySelector('dialog[open]')) admin.refrescar(); });
admin.refrescar();

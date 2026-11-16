// OWL BAR · landing: carta con pedido por WhatsApp, estado abierto/cerrado y animaciones de entrada.
const WHATSAPP = '56951645582';
const FOTO = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=72&auto=format&fit=crop`;

const carta = [
  { nombre: 'Hamburguesa Owl', detalle: 'Carne, cheddar, cebolla crispy y salsa de la casa', precio: 11900, tipo: 'comida', foto: '1607013251379-e6eecfffe234', destacado: true },
  { nombre: 'Alitas BBQ', detalle: '8 unidades, salsa BBQ ahumada y dip de la casa', precio: 9900, tipo: 'comida', foto: '1767065703745-f3c33524605a', destacado: true },
  { nombre: 'Papas Owl', detalle: 'Papas rústicas, cheddar, tocino y cebollín', precio: 7900, tipo: 'comida', foto: '1485962398705-ef6a13c41e8f' },
  { nombre: 'Gin tonic', detalle: 'Gin, tónica premium, pomelo y romero', precio: 7500, tipo: 'bar', foto: '1675370734208-120b43d3c7ac', destacado: true },
  { nombre: 'Moscow mule', detalle: 'Vodka, ginger beer, limón y menta', precio: 7500, tipo: 'bar', foto: '1527628126150-086ff233b951' },
  { nombre: 'Cerveza artesanal', detalle: 'Consulta las variedades disponibles hoy', precio: 4900, tipo: 'bar', foto: '1777558578003-e65755409d8e' },
];

const pesos = (n) => '$' + n.toLocaleString('es-CL');
const linkPedido = (p) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola OWL BAR, quiero pedir: ${p.nombre} (${pesos(p.precio)}).`)}`;

document.getElementById('destacados').innerHTML = carta.filter((p) => p.destacado).map((p) => `
  <a class="destacado revela" href="${linkPedido(p)}" target="_blank" rel="noopener">
    <div class="destacado-foto"><img loading="lazy" src="${FOTO(p.foto)}" alt="${p.nombre}"></div>
    <div class="destacado-info">
      <span class="eti">${p.tipo === 'bar' ? 'De la barra' : 'De la cocina'}</span>
      <h3>${p.nombre}</h3>
      <p>${p.detalle}</p>
      <div class="destacado-pie"><b>${pesos(p.precio)}</b><span>Pedir →</span></div>
    </div>
  </a>`).join('');

for (const tipo of ['comida', 'bar']) {
  document.getElementById(`lista-${tipo}`).innerHTML = carta.filter((p) => p.tipo === tipo).map((p) => `
    <li><a href="${linkPedido(p)}" target="_blank" rel="noopener">
      <img loading="lazy" src="${FOTO(p.foto, 200)}" alt="">
      <div class="item-texto"><span class="item-nombre">${p.nombre}</span><span class="item-detalle">${p.detalle}</span></div>
      <span class="item-puntos" aria-hidden="true"></span>
      <span class="item-precio">${pesos(p.precio)}</span>
    </a></li>`).join('');
}

// Abierto / cerrado según la hora de Concón (todos los días 12:30 a 00:30, cocina hasta 23:45).
(function estado() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  const m = +p.hour * 60 + +p.minute;
  const abierto = m >= 12 * 60 + 30 || m < 30;
  const cocina = m >= 12 * 60 + 30 && m < 23 * 60 + 45;
  const texto = abierto
    ? (cocina ? 'Abierto ahora · cocina hasta las 23:45' : 'Abierto ahora · barra hasta las 00:30')
    : 'Cerrado ahora · abrimos hoy a las 12:30';
  document.querySelectorAll('[data-estado]').forEach((el) => {
    el.classList.toggle('abierto', abierto);
    el.querySelector('span').textContent = texto;
  });
  setTimeout(estado, 60_000);
})();

// Nav con fondo al bajar.
const nav = document.getElementById('nav');
const alBajar = () => nav.classList.toggle('solida', scrollY > 40);
addEventListener('scroll', alBajar, { passive: true });
alBajar();

// Aparición suave al entrar en pantalla.
const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.revela').forEach((el) => io.observe(el));

// Reserva: arma el mensaje de WhatsApp con nombre, fecha, hora y personas.
const form = document.getElementById('form-reserva');
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
form.fecha.min = hoy;
form.fecha.value = hoy;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const [a, m, d] = String(f.get('fecha')).split('-');
  const texto = `Hola OWL BAR, soy ${f.get('nombre')}. Quiero reservar una mesa para ${f.get('personas')} el ${d}/${m}/${a} a las ${f.get('hora')}. ¿Me confirman?`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});

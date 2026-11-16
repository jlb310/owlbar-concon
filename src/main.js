const items=[
{name:'Hamburguesa Owl',description:'Carne, cheddar, cebolla crispy y salsa de la casa',price:'$11.900',category:'comida'},
{name:'Alitas BBQ',description:'8 unidades, salsa BBQ ahumada y dip de la casa',price:'$9.900',category:'comida'},
{name:'Papas Owl',description:'Papas rústicas, cheddar, tocino y cebollín',price:'$7.900',category:'comida'},
{name:'Gin tonic',description:'Gin, tónica premium, pomelo y romero',price:'$7.500',category:'bar'},
{name:'Moscow mule',description:'Vodka, ginger beer, limón y menta',price:'$7.500',category:'bar'},
{name:'Cerveza artesanal',description:'Consulta variedades disponibles hoy',price:'$4.900',category:'bar'}
];
const menuGrid=document.querySelector('#menu-grid');const toast=document.querySelector('#toast');let toastTimer;
function showToast(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.remove('show'),3200)}
function render(category='todos'){menuGrid.innerHTML=items.filter(i=>category==='todos'||i.category===category).map(i=>`<article class="menu-card"><div class="menu-card-content"><h3>${i.name}</h3><p>${i.description}</p><div class="menu-meta"><span>${i.price}</span><span class="status">Disponible</span></div></div></article>`).join('')}
render();document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{document.querySelector('.tab.active')?.classList.remove('active');t.classList.add('active');render(t.dataset.category)}));
const status=document.querySelector('#order-status');const heroStatus=document.querySelector('#hero-status');let activeOrder=false;
function setStatus(title,detail,kind='live'){status.innerHTML=`<span class="status-dot ${kind}"></span><div><b>${title}</b><small>${detail}</small></div>`;heroStatus.textContent=title}
function moveToPreparing(){if(!activeOrder){showToast('Confirma primero un pedido');return}setStatus('En preparación','La cocina está trabajando en tu pedido','live');showToast('Estado actualizado: En preparación')}
document.querySelector('#prepare-order').addEventListener('click',moveToPreparing);
document.querySelector('#place-order').addEventListener('click',()=>{const name=document.querySelector('#customer-name').value.trim();const product=document.querySelector('#order-product').value;if(!name){showToast('Escribe tu nombre para confirmar el pedido');return}activeOrder=true;setStatus('Pedido confirmado','Avisaremos cuando pase a preparación','live');showToast(`Pedido de ${name} confirmado: ${product}`);window.setTimeout(moveToPreparing,1200)});
document.querySelector('#cancel-order').addEventListener('click',()=>{if(!activeOrder){showToast('No tienes un pedido activo');return}activeOrder=false;setStatus('Pedido cancelado','Te avisamos antes de preparar la orden','cancelled');showToast('Cancelación confirmada · Puedes escribirnos por WhatsApp');window.open('https://wa.me/56951645582?text=Hola%20OWL%20BAR,%20mi%20pedido%20fue%20cancelado%20y%20necesito%20ayuda.','_blank','noopener,noreferrer')});

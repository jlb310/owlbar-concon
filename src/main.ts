type Category = 'todos' | 'entradas' | 'fondos' | 'cocteles';
type MenuItem = { name:string; description:string; price:string; category:Exclude<Category,'todos'> };
const items: MenuItem[] = [
  {name:'Ostiones de la bahía', description:'Limón, leche de tigre y aceite de cilantro', price:'$12.900', category:'entradas'},
  {name:'Ceviche Oceanic', description:'Pesca blanca, palta, cebolla morada y ají amarillo', price:'$13.900', category:'entradas'},
  {name:'Pesca del día', description:'Papas rústicas, ensalada fresca y salsa de la casa', price:'$18.900', category:'fondos'},
  {name:'Linguini marino', description:'Mariscos salteados, tomate cherry y vino blanco', price:'$17.500', category:'fondos'},
  {name:'Risotto de camarón', description:'Arroz arborio, parmesano y bisque de mariscos', price:'$16.900', category:'fondos'},
  {name:'Spritz de la costa', description:'Aperol, espumante, pomelo y romero', price:'$8.500', category:'cocteles'}
];
const menuGrid = document.querySelector<HTMLDivElement>('#menu-grid')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;
let toastTimer:number;
function showToast(message:string){ toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=window.setTimeout(()=>toast.classList.remove('show'),3200); }
function render(category:Category='todos'){
  menuGrid.innerHTML = items.filter(item=>category==='todos'||item.category===category).map(item=>`<article class="menu-card"><div class="menu-card-content"><h3>${item.name}</h3><p>${item.description}</p><div class="menu-meta"><span>${item.price}</span><span class="status">Disponible</span></div></div></article>`).join('');
}
render();
document.querySelectorAll<HTMLButtonElement>('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelector('.tab.active')?.classList.remove('active');tab.classList.add('active');render(tab.dataset.category as Category)}));
function openWhatsApp(message:string){ window.open(`https://wa.me/56322830006?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer'); }
function formatReservationDate(value:FormDataEntryValue|null){
  const parts=String(value||'').split('-');
  return parts.length===3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value||'');
}
document.querySelectorAll<HTMLElement>('[data-action="attention"]').forEach(button=>button.addEventListener('click',()=>openWhatsApp('Hola Oceanic Restobar, estoy en una mesa y necesito atención.')));
document.querySelector<HTMLFormElement>('#reservation-form')!.addEventListener('submit',(event)=>{event.preventDefault();const form=new FormData(event.currentTarget as HTMLFormElement);const name=form.get('name');const date=formatReservationDate(form.get('date'));const people=form.get('people');openWhatsApp(`Hola Oceanic Restobar, soy ${name}. Me gustaría reservar una mesa para ${people} el día ${date}. ¿Me confirman disponibilidad?`);showToast('Abriendo WhatsApp para confirmar tu solicitud…');});

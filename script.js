/* frontend/script.js
   Reemplaza totalmente el archivo existente por este. */

const RENDER_API_BASE = 'https://crear-un-formulario-con-acceso-a-bd.onrender.com';
const LOCAL_API_BASE = 'http://localhost:3000';

// Si estás en localhost usamos el backend local, en otro caso el de Render
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? LOCAL_API_BASE : RENDER_API_BASE;
const API = API_BASE + '/api/people';

const form = document.getElementById('form');
const idEl = document.getElementById('id');
const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const ageEl = document.getElementById('age');
const notesEl = document.getElementById('notes');
const tbody = document.getElementById('tbody');
const search = document.getElementById('search');
const refreshBtn = document.getElementById('refresh');
const clearBtn = document.getElementById('clear');
const exportBtn = document.getElementById('export');
const loadExampleBtn = document.getElementById('loadExample'); // si existe

let dataCache = [];

function escapeHtml(s){ if(s === null || s === undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function notify(msg){ console.log('[APP]', msg); }

/* Carga todos los registros */
async function loadAll(){
  try{
    const res = await fetch(API, { cache: 'no-store' });
    const ct = res.headers.get('content-type') || '';
    if(!ct.includes('application/json')){
      const txt = await res.text().catch(()=>'');
      throw new Error('Respuesta inesperada del backend: no es JSON. (' + txt.slice(0,120) + ')');
    }
    if(!res.ok) throw new Error('status ' + res.status);
    const data = await res.json();
    dataCache = Array.isArray(data) ? data : [];
    render(dataCache);
  }catch(e){
    console.error(e);
    alert('Error al cargar datos. Asegura que el backend esté activo en ' + API_BASE + ' — ver consola.');
    render([]);
  }
}

function render(items){
  tbody.innerHTML = '';
  if(!items || items.length === 0){
    tbody.innerHTML = '<tr><td colspan="6" class="small">No hay registros</td></tr>';
    return;
  }
  items.forEach(it=>{
    const id = it.id ?? it._id ?? '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(String(id).slice(0,12))}</td>
      <td>${escapeHtml(it.name||'')}</td>
      <td>${escapeHtml(it.email||'')}</td>
      <td>${escapeHtml(it.notes||'')}</td>
      <td>${it.age ?? ''}</td>
      <td>
        <button class="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
        <button class="del" data-id="${escapeHtml(id)}" type="button">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('.edit').addEventListener('click', ()=> onEdit(id));
    tr.querySelector('.del').addEventListener('click', ()=> onDelete(id));
  });
}

/* Submit del formulario (crear/actualizar) */
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = {
    name: nameEl.value.trim(),
    email: emailEl.value.trim() || null,
    age: ageEl.value ? Number(ageEl.value) : null,
    notes: notesEl.value.trim() || null
  };
  if(!payload.name){ alert('Nombre es obligatorio'); nameEl.focus(); return; }
  const id = idEl.value;
  try{
    let res;
    if(id){
      res = await fetch(`${API}/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('update failed: ' + res.status);
    } else {
      res = await fetch(API, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('create failed: ' + res.status);
    }
    resetForm();
    await loadAll();
  }catch(err){
    console.error(err);
    alert('Error guardando (ver consola).');
  }
});

function resetForm(){ idEl.value=''; form.reset(); nameEl.focus(); }

/* Editar */
async function onEdit(id){
  try{
    const res = await fetch(`${API}/${encodeURIComponent(id)}`);
    if(!res.ok) throw new Error('Registro no encontrado: ' + res.status);
    const d = await res.json();
    idEl.value = d.id ?? d._id ?? '';
    nameEl.value = d.name || '';
    emailEl.value = d.email || '';
    ageEl.value = d.age ?? '';
    notesEl.value = d.notes || '';
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){
    console.error(e);
    alert('No se pudo cargar el registro (ver consola).');
  }
}

/* Eliminar */
async function onDelete(id){
  if(!confirm('¿Eliminar este registro?')) return;
  try{
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if(!res.ok) throw new Error('Error eliminando: ' + res.status);
    await loadAll();
  }catch(e){
    console.error(e);
    alert('Error eliminando (ver consola).');
  }
}

/* Búsqueda y export */
search.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  if(!q) return render(dataCache);
  render(dataCache.filter(p=> (p.name||'').toLowerCase().includes(q)));
});
refreshBtn && refreshBtn.addEventListener('click', loadAll);
clearBtn && clearBtn.addEventListener('click', (e)=>{ e.preventDefault(); resetForm(); });
loadExampleBtn && loadExampleBtn.addEventListener('click', ()=>{
  nameEl.value = 'Ejemplo Nombre';
  emailEl.value = 'ejemplo@correo.com';
  ageEl.value = 30;
  notesEl.value = 'Notas de ejemplo...';
});
exportBtn && exportBtn.addEventListener('click', ()=>{
  if(!dataCache || dataCache.length===0){ alert('No hay datos'); return; }
  const header = ['id','name','email','age','notes'];
  const rows = dataCache.map(p=>[p.id ?? p._id ?? '', p.name ?? '', p.email ?? '', p.age ?? '', (p.notes||'').replace(/\n/g,' ')]);
  const csv = [header.join(','), ...rows.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='export.csv'; a.click();
});

/* Al cargar la página, prevenir submit por botones no submit y cargar datos */
window.addEventListener('load', () => {
  document.querySelectorAll('button').forEach(btn => {
    if(!btn.hasAttribute('type')) btn.setAttribute('type','button');
  });
  const save = document.getElementById('save');
  if(save) save.setAttribute('type','submit');
  loadAll();
});

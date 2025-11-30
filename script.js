// frontend/script.js
// CRUD frontend — usa window.API_BASE si está definida (útil para despliegue)
const API = (window.API_BASE ? window.API_BASE + '/api/people' : '/api/people');

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
const loadExampleBtn = document.getElementById('loadExample');

let dataCache = [];

/* ========== helpers ========== */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function notify(msg){ console.log('APP:', msg); }

/* ========== render ========== */
function render(items){
  tbody.innerHTML = '';
  if(!items || items.length === 0){
    tbody.innerHTML = '<tr><td colspan="6" class="small">No hay registros</td></tr>';
    return;
  }
  items.forEach(it => {
    const id = it.id ?? it._id ?? '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${String(id).slice(0,10)}</td>
      <td>${escapeHtml(it.name||'')}</td>
      <td>${escapeHtml(it.email||'')}</td>
      <td>${escapeHtml(it.notes||'')}</td>
      <td>${it.age ?? ''}</td>
      <td>
        <button class="edit" data-id="${id}" type="button">Editar</button>
        <button class="del" data-id="${id}" type="button">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.edit').addEventListener('click', ()=> onEdit(id));
    tr.querySelector('.del').addEventListener('click', ()=> onDelete(id));
  });
}

/* ========== load ========== */
async function loadAll(){
  try{
    const res = await fetch(API, { cache: 'no-store' });
    // Si backend sirve HTML (404 en GH Pages), detectarlo para evitar JSON.parse errors
    const ct = res.headers.get('content-type') || '';
    if(!ct.includes('application/json')){
      const txt = await res.text().catch(()=>'');
      throw new Error('Respuesta inesperada (no JSON) del backend: ' + txt.slice(0,120));
    }
    const data = await res.json();
    dataCache = Array.isArray(data) ? data : [];
    render(dataCache);
    notify('Datos cargados: ' + dataCache.length);
  }catch(err){
    console.error(err);
    alert('Error al cargar datos. Asegura que el backend esté activo en ' + (window.API_BASE || 'http://localhost:3000') + ' — ver consola.');
    render([]);
  }
}

/* ========== form submit ========== */
form.addEventListener('submit', async (e) => {
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
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('update failed: ' + res.status);
    } else {
      res = await fetch(API, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
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

function resetForm(){
  idEl.value = '';
  form.reset();
  nameEl.focus();
}

/* ========== edit / delete ========== */
async function onEdit(id){
  try{
    const res = await fetch(`${API}/${encodeURIComponent(id)}`);
    if(!res.ok) throw new Error('Registro no encontrado');
    const d = await res.json();
    idEl.value = d.id ?? d._id ?? '';
    nameEl.value = d.name || '';
    emailEl.value = d.email || '';
    ageEl.value = d.age ?? '';
    notesEl.value = d.notes || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }catch(err){
    console.error(err);
    alert('No se pudo cargar el registro.');
  }
}

async function onDelete(id){
  if(!confirm('¿Eliminar este registro?')) return;
  try{
    const res = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if(!res.ok) throw new Error('Error eliminando');
    await loadAll();
  }catch(err){
    console.error(err);
    alert('Error eliminando (ver consola).');
  }
}

/* ========== search / export / helpers UI ========== */
search.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  if(!q) return render(dataCache);
  render(dataCache.filter(p => (p.name || '').toLowerCase().includes(q)));
});

refreshBtn.addEventListener('click', loadAll);
clearBtn.addEventListener('click', (e) => { e.preventDefault(); resetForm(); });
loadExampleBtn.addEventListener('click', ()=>{
  nameEl.value = 'Ejemplo Nombre';
  emailEl.value = 'ejemplo@correo.com';
  ageEl.value = 30;
  notesEl.value = 'Notas de ejemplo...';
});

exportBtn.addEventListener('click', ()=>{
  if(!dataCache || dataCache.length === 0){ alert('No hay datos'); return; }
  const header = ['id','name','email','age','notes'];
  const rows = dataCache.map(p => [p.id ?? p._id ?? '', p.name ?? '', p.email ?? '', p.age ?? '', (p.notes || '').replace(/\n/g,' ')]);
  const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'export.csv'; a.click();
});

/* ========== init ========== */
window.addEventListener('load', () => {
  // asegurar tipos por defecto
  document.querySelectorAll('button').forEach(btn => { if(!btn.hasAttribute('type')) btn.setAttribute('type','button'); });
  const save = document.getElementById('save'); if(save) save.setAttribute('type','submit');

  loadAll();
});


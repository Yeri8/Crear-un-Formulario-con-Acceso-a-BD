// frontend/script.js
const API = '/api/people';

const form = document.getElementById('form');
const idEl = document.getElementById('id');
const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const ageEl = document.getElementById('age');
const notesEl = document.getElementById('notes');
const tbody = document.getElementById('tbody');
const search = document.getElementById('search');
const refresh = document.getElementById('refresh');
const clearBtn = document.getElementById('clear');
const exportBtn = document.getElementById('export');
const presetBtn = document.getElementById('preset');

let dataCache = [];

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function loadAll(){
  try{
    const res = await fetch(API);
    if(!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();
    dataCache = data;
    render(data);
  }catch(e){
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="6" class="small">Error cargando datos. Asegura que el backend esté activo en http://localhost:3000</td></tr>';
  }
}

function render(items){
  tbody.innerHTML = '';
  if(!items || items.length===0){
    tbody.innerHTML = '<tr><td colspan="6" class="small">No hay registros</td></tr>';
    return;
  }
  items.forEach(it=>{
    const id = it.id || it._id || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${String(id).slice(0,10)}</td>
      <td>${escapeHtml(it.name||'')}</td>
      <td>${escapeHtml(it.email||'')}</td>
      <td>${escapeHtml(it.notes||'')}</td>
      <td>${it.age ?? ''}</td>
      <td>
        <button class="edit" data-id="${id}">Editar</button>
        <button class="del" data-id="${id}">Eliminar</button>
      </td>`;
    tbody.appendChild(tr);
    tr.querySelector('.edit').addEventListener('click', ()=> onEdit(id));
    tr.querySelector('.del').addEventListener('click', ()=> onDelete(id));
  });
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = { name: nameEl.value.trim(), email: emailEl.value.trim()||null, age: ageEl.value?Number(ageEl.value):null, notes: notesEl.value.trim()||null };
  if(!payload.name){ alert('Nombre es obligatorio'); nameEl.focus(); return; }
  const id = idEl.value;
  try{
    if(id){
      await fetch(API+'/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    }else{
      await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    }
    resetForm();
    await loadAll();
  }catch(err){ console.error(err); alert('Error guardando'); }
});

function resetForm(){ idEl.value=''; form.reset(); nameEl.focus(); }

clearBtn.addEventListener('click', (e)=>{ e.preventDefault(); resetForm(); });

async function onEdit(id){
  try{
    const res = await fetch(API+'/'+id);
    if(!res.ok) throw new Error('Status ' + res.status);
    const d = await res.json();
    idEl.value = d.id || d._id || '';
    nameEl.value = d.name||'';
    emailEl.value = d.email||'';
    ageEl.value = d.age||'';
    notesEl.value = d.notes||'';
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){ alert('No se pudo cargar el registro'); }
}

async function onDelete(id){
  if(!confirm('¿Eliminar este registro?')) return;
  try{
    await fetch(API+'/'+id, { method:'DELETE' });
    await loadAll();
  }catch(e){ alert('Error eliminando'); }
}

search.addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase().trim();
  if(!q) return render(dataCache);
  render(dataCache.filter(p=> (p.name||'').toLowerCase().includes(q)));
});

refresh.addEventListener('click', loadAll);

exportBtn.addEventListener('click', ()=>{
  if(!dataCache || dataCache.length===0){ alert('No hay datos'); return; }
  const header = ['id','name','email','age','notes'];
  const rows = dataCache.map(p=>[p.id||p._id||'', p.name||'', p.email||'', p.age||'', (p.notes||'').replace(/\n/g,' ')]);
  const csv = [header.join(','), ...rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='export.csv'; a.click();
});

presetBtn.addEventListener('click', ()=>{
  nameEl.value='Ejemplo Demo';
  emailEl.value='demo@example.com';
  ageEl.value='30';
  notesEl.value='Registro de ejemplo';
});

window.onload = loadAll;

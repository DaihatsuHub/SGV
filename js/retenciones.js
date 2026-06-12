// ═══════════════════════════════════════════════════════════
// RETENCIONES — ABM (Cobranzas)
// Tabla Supabase: retenciones (codigo, descripcion)
// ═══════════════════════════════════════════════════════════

let RETES = [];
let reteSelIdx = null;

async function sbLoadRetes() {
  try { RETES = await sbGet('retenciones', 'order=codigo.asc'); }
  catch(e) { console.error('sbLoadRetes:', e); RETES = []; }
}

// Helper usado por Recibos (descripción de un código)
function reteDesc(cod) {
  const r = RETES.find(x => x.codigo === cod);
  return r ? (r.descripcion||'') : '';
}

function getReteRows() {
  const q = (document.getElementById('rete-q')?.value || '').toLowerCase();
  return RETES.filter(r =>
    !q ||
    (r.codigo||'').toLowerCase().includes(q) ||
    (r.descripcion||'').toLowerCase().includes(q)
  ).sort((a,b) => (a.codigo||'').localeCompare(b.codigo||''));
}

function renderRete() {
  const list = getReteRows();
  const body = document.getElementById('rete-body');
  if (!body) return;
  if (!list.length) { body.innerHTML = '<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML = list.map((r,i) => {
    const sel = reteSelIdx===i ? 'sel' : '';
    return `<div class="tr-tab ${sel}" onclick="selRete(${i})" ondblclick="reteModif()">
      <span class="col-cod">${esc(r.codigo||'')}</span>
      <span class="col-des">${esc(r.descripcion||'')}</span>
      <span></span><span></span>
    </div>`;
  }).join('');
}
function selRete(i) { reteSelIdx = i; renderRete(); }

function reteAlta() {
  document.getElementById('rtf-cod').value  = '';
  document.getElementById('rtf-desc').value = '';
  document.getElementById('rtf-cod').disabled = false;
  document.getElementById('rete-mtit').textContent = 'Nueva Retención';
  setMtag('rete-mtag','ALTA','tag-a');
  document.getElementById('ov-rete').classList.add('open');
  window._rte = 'A';
}
function reteModif() {
  if (reteSelIdx===null) { toast('Seleccioná una retención','err'); return; }
  const r = getReteRows()[reteSelIdx];
  document.getElementById('rtf-cod').value  = r.codigo;
  document.getElementById('rtf-cod').disabled = true;
  document.getElementById('rtf-desc').value = r.descripcion||'';
  document.getElementById('rete-mtit').textContent = 'Modificar Retención';
  setMtag('rete-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-rete').classList.add('open');
  window._rte = 'M';
}
function reteBaja() {
  if (reteSelIdx===null) { toast('Seleccioná una retención','err'); return; }
  const r = getReteRows()[reteSelIdx];
  confirm2(`¿Dar de baja "${r.codigo}"?`, `"${r.descripcion||''}" será eliminada.`, async () => {
    try {
      await sbDelete('retenciones', { codigo: r.codigo });
      const idx = RETES.findIndex(x => x.codigo===r.codigo);
      if (idx>=0) RETES.splice(idx,1);
      reteSelIdx = null; renderRete(); toast('Retención eliminada','scs');
    } catch(e) { console.error(e); toast('Error al eliminar','err'); }
  });
}
async function saveRete() {
  const cod  = document.getElementById('rtf-cod').value.trim().toUpperCase();
  const desc = document.getElementById('rtf-desc').value.trim().toUpperCase();
  if (!cod || !desc) { toast('Código y descripción son obligatorios','err'); return; }
  if (window._rte==='A' && RETES.find(r => r.codigo===cod)) { toast('Ese código ya existe','err'); return; }
  const data = { codigo: cod, descripcion: desc };
  try {
    await sbUpsertOnConflict('retenciones', data, 'codigo');
    const idx = RETES.findIndex(r => r.codigo===cod);
    if (idx>=0) RETES[idx] = data; else RETES.push(data);
    closeOv('ov-rete'); reteSelIdx = null; renderRete();
    toast(window._rte==='A' ? 'Retención dada de alta' : 'Retención modificada','scs');
  } catch(e) { console.error(e); toast('Error al guardar','err'); }
}

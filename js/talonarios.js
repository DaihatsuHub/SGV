// ═══════════════════════════════════════════════════════════
// TALONARIOS — ABM (Cobranzas)
// Tabla Supabase: talonarios (empresa, tipo, descripcion, ultimo_nro)
// ═══════════════════════════════════════════════════════════

let TALOS = [];
let taloSelIdx = null;

async function sbLoadTalos() {
  try { TALOS = await sbGet('talonarios', 'order=empresa.asc,tipo.asc'); }
  catch(e) { console.error('sbLoadTalos:', e); TALOS = []; }
}

// ── Helpers usados por Recibos ─────────────────────────────
function taloFind(emp, tipo) {
  return TALOS.find(t => t.empresa === emp && t.tipo === tipo);
}
function talosDeEmpresa(emp) {
  return TALOS.filter(t => t.empresa === emp);
}
function taloNextNumero(emp, tipo) {
  const t = taloFind(emp, tipo);
  return t ? (Number(t.ultimo_nro) || 0) + 1 : 1;
}
async function taloSetUltimo(emp, tipo, nro) {
  const t = taloFind(emp, tipo);
  if (!t) return;
  t.ultimo_nro = nro;
  try {
    await sbUpsertOnConflict('talonarios',
      { empresa: emp, tipo, descripcion: t.descripcion || null, ultimo_nro: nro }, 'empresa,tipo');
  } catch(e) { console.error('taloSetUltimo:', e); }
}

// ── Listado ────────────────────────────────────────────────
function getTaloRows() {
  const q = (document.getElementById('talo-q')?.value || '').toLowerCase();
  return TALOS.filter(t =>
    !q ||
    (t.empresa||'').toLowerCase().includes(q) ||
    (t.tipo||'').toLowerCase().includes(q) ||
    (t.descripcion||'').toLowerCase().includes(q)
  ).sort((a,b) => ((a.empresa||'')+(a.tipo||'')).localeCompare((b.empresa||'')+(b.tipo||'')));
}

function renderTalo() {
  const list = getTaloRows();
  const body = document.getElementById('talo-body');
  if (!body) return;
  if (!list.length) { body.innerHTML = '<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML = list.map((t,i) => {
    const sel = taloSelIdx===i ? 'sel' : '';
    const emp = t.empresa==='H' ? 'Hatsu' : (t.empresa==='T' ? 'Tressa' : (t.empresa||''));
    return `<div class="tr-tab ${sel}" onclick="selTalo(${i})" ondblclick="taloModif()">
      <span class="col-cod">${esc(t.empresa||'')} / ${esc(t.tipo||'')}</span>
      <span class="col-des">${esc(t.descripcion||'')}</span>
      <span class="col-sm">${esc(emp)}</span>
      <span class="col-num">${Number(t.ultimo_nro)||0}</span>
    </div>`;
  }).join('');
}
function selTalo(i) { taloSelIdx = i; renderTalo(); }

// ── ABM ────────────────────────────────────────────────────
function taloAlta() {
  document.getElementById('tlf-emp').value  = 'H';
  document.getElementById('tlf-tipo').value = 'R';
  document.getElementById('tlf-desc').value = '';
  document.getElementById('tlf-ult').value  = 0;
  document.getElementById('tlf-emp').disabled  = false;
  document.getElementById('tlf-tipo').disabled = false;
  document.getElementById('talo-mtit').textContent = 'Nuevo Talonario';
  setMtag('talo-mtag','ALTA','tag-a');
  document.getElementById('ov-talo').classList.add('open');
  window._tle = 'A';
}
function taloModif() {
  if (taloSelIdx===null) { toast('Seleccioná un talonario','err'); return; }
  const t = getTaloRows()[taloSelIdx];
  document.getElementById('tlf-emp').value  = t.empresa;
  document.getElementById('tlf-tipo').value = t.tipo;
  document.getElementById('tlf-desc').value = t.descripcion||'';
  document.getElementById('tlf-ult').value  = Number(t.ultimo_nro)||0;
  document.getElementById('tlf-emp').disabled  = true;   // clave: no se cambia
  document.getElementById('tlf-tipo').disabled = true;
  document.getElementById('talo-mtit').textContent = 'Modificar Talonario';
  setMtag('talo-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-talo').classList.add('open');
  window._tle = 'M';
}
function taloBaja() {
  if (taloSelIdx===null) { toast('Seleccioná un talonario','err'); return; }
  const t = getTaloRows()[taloSelIdx];
  confirm2(`¿Dar de baja el talonario ${t.empresa}/${t.tipo}?`, `"${t.descripcion||''}" será eliminado.`, async () => {
    try {
      await sbDelete('talonarios', { empresa: t.empresa, tipo: t.tipo });
      const idx = TALOS.findIndex(x => x.empresa===t.empresa && x.tipo===t.tipo);
      if (idx>=0) TALOS.splice(idx,1);
      taloSelIdx = null; renderTalo(); toast('Talonario eliminado','scs');
    } catch(e) { console.error(e); toast('Error al eliminar','err'); }
  });
}
async function saveTalo() {
  const emp  = document.getElementById('tlf-emp').value;
  const tipo = document.getElementById('tlf-tipo').value;
  const desc = document.getElementById('tlf-desc').value.trim().toUpperCase();
  const ult  = parseInt(document.getElementById('tlf-ult').value) || 0;
  if (!emp || !tipo) { toast('Empresa y tipo son obligatorios','err'); return; }
  if (window._tle==='A' && taloFind(emp,tipo)) { toast('Ya existe ese talonario','err'); return; }
  const data = { empresa: emp, tipo, descripcion: desc||null, ultimo_nro: ult };
  try {
    await sbUpsertOnConflict('talonarios', data, 'empresa,tipo');
    const idx = TALOS.findIndex(t => t.empresa===emp && t.tipo===tipo);
    if (idx>=0) TALOS[idx] = data; else TALOS.push(data);
    closeOv('ov-talo'); taloSelIdx = null; renderTalo();
    toast(window._tle==='A' ? 'Talonario dado de alta' : 'Talonario modificado','scs');
  } catch(e) { console.error(e); toast('Error al guardar','err'); }
}

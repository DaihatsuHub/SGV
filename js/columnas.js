// ═══════════════════════════════════════════════════════════
// COLUMNAS CONFIGURABLES — solo RGRDELTA
// La config se guarda en Supabase (tabla config_ui)
// para que sea global y se aplique a todos los usuarios
// ═══════════════════════════════════════════════════════════

let artSelIdx=null, artFilt='todos', artOfe=false;
let cliSelIdx=null, cliFilt='todos';

const COL_DEFS = {
  art: [
    {field:'ART_COD',    label:'Código',       width:'110px', active:true},
    {field:'ART_DES',    label:'Descripción',  width:'1fr',   active:true},
    {field:'ART_RUB',    label:'Rubro',        width:'70px',  active:true},
    {field:'ART_PRE',    label:'Precio',       width:'95px',  align:'right', active:true},
    {field:'ART_STK',    label:'Stk Hat',      width:'68px',  align:'right', active:true},
    {field:'ART_STKT',   label:'Stk Tre',      width:'68px',  align:'right', active:true},
    {field:'ART_ESTU',   label:'Est',          width:'52px',  align:'center',active:true},
    {field:'ART_ACT',    label:'Act',          width:'52px',  align:'center',active:true},
    {field:'ART_GRUP',   label:'Grupo',        width:'75px',  active:true},
    {field:'ART_MARCA',  label:'Marca',        width:'70px',  active:false},
    {field:'ART_PROV',   label:'Prov',         width:'60px',  active:false},
    {field:'ART_PREMAY', label:'P.Mayor',      width:'90px',  align:'right', active:false},
    {field:'ART_PREESP', label:'P.Esp.',       width:'90px',  align:'right', active:false},
    {field:'ART_SUBCOD', label:'Sub-Código',   width:'80px',  active:false},
    {field:'ART_FRANQ',  label:'Franquicia',   width:'90px',  align:'right', active:false},
    {field:'ART_RESERV', label:'Reservado',    width:'75px',  align:'right', active:false},
    {field:'ART_PED',    label:'Pedido',       width:'70px',  align:'right', active:false},
    {field:'ART_DTO',    label:'Dto %',        width:'60px',  align:'right', active:false},
    {field:'ART_OFERTA', label:'Oferta',       width:'55px',  align:'center',active:false},
    {field:'ART_SEX',    label:'Sexo',         width:'50px',  active:false},
  ],
  cli: [
    {field:'CLI_CODIGO', label:'Código',       width:'75px',  active:true},
    {field:'CLI_RAZON',  label:'Razón Social', width:'1fr',   active:true},
    {field:'CLI_DOMIC',  label:'Domicilio',    width:'155px', active:true},
    {field:'CLI_LOCAL',  label:'Localidad',    width:'110px', active:true},
    {field:'CLI_CUIT',   label:'CUIT',         width:'115px', active:true},
    {field:'CLI_IVA',    label:'IVA',          width:'80px',  active:true},
    {field:'CLI_CONPAG', label:'C.Pago',       width:'75px',  active:true},
    {field:'CLI_ESTADO', label:'Estado',       width:'60px',  active:true},
    {field:'CLI_PROVIN', label:'Provincia',    width:'100px', active:false},
    {field:'CLI_CODPOS', label:'Cód.Postal',   width:'80px',  active:false},
    {field:'CLI_VEND',   label:'Vendedor',     width:'55px',  active:false},
    {field:'CLI_EXPRE',  label:'Expreso',      width:'60px',  active:false},
    {field:'CLI_TELEF',  label:'Teléfono',     width:'120px', active:false},
    {field:'CLI_EMAIL',  label:'Email',        width:'140px', active:false},
    {field:'CLI_ABC',    label:'ABC',          width:'45px',  active:false},
    {field:'CLI_ICRED',  label:'Crédito',      width:'90px',  align:'right', active:false},
    {field:'CLI_NROIB',  label:'Nro IB',       width:'100px', active:false},
    {field:'CLI_OBS',    label:'Observaciones',width:'150px', active:false},
    {field:'CLI_CATE',   label:'Categoría',    width:'80px',  active:false},
    {field:'CLI_DTO',    label:'Dto %',        width:'55px',  align:'right', active:false},
  ]
};

const SORT_STATE = { art:{col:null,asc:true}, cli:{col:null,asc:true} };

function getActiveCols(grid) {
  const cfg  = getConfigUI(grid);
  const defs = COL_DEFS[grid];
  if (!cfg || !cfg.activas || cfg.activas.length === 0) {
    return defs.filter(c => c.active);
  }
  let ordered = (cfg.orden || [])
    .map(f => defs.find(d => d.field === f))
    .filter(Boolean);
  defs.forEach(d => { if (!ordered.find(o => o.field === d.field)) ordered.push(d); });
  return ordered
    .filter(c => cfg.activas.includes(c.field))
    .map(c => cfg.labels && cfg.labels[c.field]
      ? { ...c, label: cfg.labels[c.field] } : c);
}

function toggleSort(grid, field) {
  if (SORT_STATE[grid].col===field) SORT_STATE[grid].asc = !SORT_STATE[grid].asc;
  else { SORT_STATE[grid].col = field; SORT_STATE[grid].asc = true; }
  if (grid==='art') renderArts(); else if (grid==='cli') renderClis();
}

function sortArrow(grid, field) {
  const s = SORT_STATE[grid];
  if (s.col !== field) return '';
  return s.asc ? ' ▲' : ' ▼';
}

function openColCfg(grid) {
  const defs = COL_DEFS[grid];
  const cfg  = getConfigUI(grid);

  let ordered;
  if (cfg && cfg.orden && cfg.orden.length > 0) {
    ordered = cfg.orden.map(f => defs.find(d => d.field === f)).filter(Boolean);
    defs.forEach(d => { if (!ordered.find(o => o.field === d.field)) ordered.push(d); });
  } else {
    ordered = [...defs];
  }

  document.getElementById('col-cfg-title').textContent = 'Columnas — ' + (grid==='art' ? 'Artículos' : 'Clientes');
  const body = document.getElementById('col-cfg-body');
  body.innerHTML = ordered.map(c => {
    const isActive     = cfg ? (cfg.activas || []).includes(c.field) : c.active;
    const customLabel  = cfg && cfg.labels && cfg.labels[c.field] ? cfg.labels[c.field] : c.label;
    return `<div class="col-cfg-row" data-field="${c.field}" draggable="true"
      style="display:flex;align-items:center;gap:8px;padding:7px 6px;border-bottom:1px solid var(--b1);border-radius:4px;transition:background .1s;cursor:default">
      <span style="color:var(--t3);font-size:14px;cursor:grab;padding:0 4px" title="Arrastrar">☰</span>
      <input type="checkbox" data-field="${c.field}" ${isActive?'checked':''} style="width:15px;height:15px;accent-color:var(--acc);cursor:pointer;flex-shrink:0">
      <input type="text" class="col-lbl-inp" data-field="${c.field}" value="${customLabel}"
        style="flex:1;background:var(--s2);border:1px solid var(--b1);border-radius:4px;padding:3px 7px;font-size:13px;font-family:var(--sans);color:var(--txt);outline:none;min-width:0"
        onfocus="this.style.borderColor='var(--acc)'" onblur="this.style.borderColor='var(--b1)'"
        placeholder="${c.label}">
      <span style="font-family:var(--mono);font-size:10px;color:var(--t4);flex-shrink:0">${c.field}</span>
    </div>`;
  }).join('');

  document.getElementById('col-cfg-grid').value = grid;
  initColDrag(body);
  document.getElementById('ov-col-cfg').classList.add('open');
}

function initColDrag(container) {
  let dragEl = null;
  container.querySelectorAll('.col-cfg-row').forEach(row => {
    row.addEventListener('dragstart', e => {
      dragEl = row;
      setTimeout(()=>row.style.opacity='0.4', 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.style.opacity = '';
      container.querySelectorAll('.col-cfg-row').forEach(r => r.style.background='');
      dragEl = null;
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      if (!dragEl || dragEl === row) return;
      const rect = row.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      container.querySelectorAll('.col-cfg-row').forEach(r => r.style.background='');
      row.style.background = 'var(--s3)';
      if (after) container.insertBefore(dragEl, row.nextSibling);
      else container.insertBefore(dragEl, row);
    });
    row.addEventListener('drop', e => { e.preventDefault(); });
  });
}

async function saveColCfg() {
  const grid    = document.getElementById('col-cfg-grid').value;
  const rows    = document.querySelectorAll('#col-cfg-body .col-cfg-row');
  const orden   = [...rows].map(r => r.dataset.field);
  const activas = [...document.querySelectorAll('#col-cfg-body input[type=checkbox]:checked')].map(c => c.dataset.field);
  const labels  = {};
  document.querySelectorAll('#col-cfg-body .col-lbl-inp').forEach(inp => {
    const def = COL_DEFS[grid].find(d => d.field === inp.dataset.field);
    const val = inp.value.trim();
    if (val && val !== (def ? def.label : '')) labels[inp.dataset.field] = val;
  });
  try {
    await saveConfigUI(grid, orden, activas, labels);
    document.getElementById('ov-col-cfg').classList.remove('open');
    if (grid==='art') renderArts(); else if (grid==='cli') renderClis();
    toast('Configuración guardada para todos los usuarios', 'scs');
  } catch(e) {
    console.error('saveColCfg:', e);
    toast('Error al guardar la configuración', 'err');
  }
}

function showDevTools() {
  ['btn-cfg-art','btn-cfg-cli'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
}

const _stEl = document.createElement('style');
_stEl.textContent = '.th-sortable{cursor:pointer;user-select:none}.th-sortable:hover{color:#fff!important}';
document.head.appendChild(_stEl);

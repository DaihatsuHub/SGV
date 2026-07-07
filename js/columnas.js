// ═══════════════════════════════════════════════════════════
// COLUMNAS CONFIGURABLES
// ═══════════════════════════════════════════════════════════

let artSelIdx=null, artFilt='todos', artOfe=false;
let cliSelIdx=null, cliFilt='todos';

const COL_DEFS = {
  art: [
    {field:'ART_COD',   label:'Código',        width:'110px', active:true},
    {field:'ART_DES',   label:'Descripción',   width:'1fr',   active:true},
    {field:'ART_RUB',   label:'Rubro',         width:'70px',  active:true},
    {field:'ART_SRUB',  label:'Sub-Rubro',     width:'70px',  active:false},
    {field:'ART_PRE',   label:'Precio',        width:'95px',  align:'right', active:true},
    {field:'ART_STK',   label:'Stk Hat',       width:'68px',  align:'right', active:true},
    {field:'ART_STKT',  label:'Stk Tre',       width:'68px',  align:'right', active:true},
    {field:'ART_DEPH',  label:'Dep Hat',       width:'68px',  align:'right', active:false},
    {field:'ART_DEPT',  label:'Dep Tre',       width:'68px',  align:'right', active:false},
    {field:'ART_ESTU',  label:'Est',           width:'52px',  align:'center',active:true},
    {field:'ART_ACT',   label:'Act',           width:'52px',  align:'center',active:true},
    {field:'ART_GRUP',  label:'Grupo',         width:'75px',  active:true},
    {field:'ART_SEX',   label:'Sexo',          width:'50px',  active:false},
    {field:'ART_MARCA', label:'Marca',         width:'70px',  active:false},
    {field:'ART_PROV',  label:'Prov',          width:'60px',  active:false},
    {field:'CODCASIO',  label:'Cód.Casio',     width:'90px',  active:false},
  ],
  desp: [
    {field:'DEP_DESP',  label:'Despacho',    width:'130px', active:true},
    {field:'DEP_SUB',   label:'Sub',         width:'45px',  active:true},
    {field:'DEP_FEC',   label:'Fecha',       width:'90px',  active:true},
    {field:'DEP_ART',   label:'Artículo',    width:'110px', active:true},
    {field:'DEP_DES',   label:'Descripción', width:'1fr',   active:true},
    {field:'DEP_PROC',  label:'Procedencia', width:'90px',  active:true},
    {field:'DEP_ENT',   label:'Ingreso',     width:'70px',  align:'right', active:true},
    {field:'DEP_SAL',   label:'Egreso',      width:'70px',  align:'right', active:true},
    {field:'DEP_STK',   label:'Stock',       width:'70px',  align:'right', active:true},
    {field:'DEP_ADUA',  label:'Aduana',      width:'60px',  active:false},
    {field:'DEP_FOB',   label:'FOB',         width:'80px',  align:'right', active:false},
    {field:'DEP_GAS',   label:'Gastos 1',    width:'80px',  align:'right', active:false},
    {field:'DEP_GAS2',  label:'Gastos 2',    width:'80px',  align:'right', active:false},
    {field:'DEP_MONEDA',label:'Moneda',      width:'65px',  active:false},
    {field:'DEP_COSTO', label:'Costo',       width:'90px',  align:'right', active:false},
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
  ],
  reci: [
    {field:'REC_FEC',    label:'Fecha recibo', width:'100px', active:true},
    {field:'REC_CLI',    label:'Cliente',      chars:34,      active:true},
    {field:'REC_COMP',   label:'Comprobante',  width:'130px', active:true},
    {field:'REC_MON',    label:'Moneda',       width:'95px',  active:true},
    {field:'REC_PESOS',  label:'Pesos',        width:'115px', align:'right', active:true},
    {field:'REC_CASIO',  label:'Casio',        width:'115px', align:'right', active:true},
    {field:'REC_TRESSA', label:'Tressa',       width:'115px', align:'right', active:true},
    {field:'REC_NRO',    label:'Recibo',       width:'110px', active:false},
  ],
  cart: [
    {field:'CHQ_FEC',  label:'Fecha',        chars:10, active:true},
    {field:'CHQ_NUM',  label:'Número',       chars:9,  active:true},
    {field:'CHQ_IMP',  label:'Importe',      chars:14, align:'right', active:true},
    {field:'CHQ_CLI',  label:'Cliente',      chars:32, active:true},
    {field:'CHQ_EMP',  label:'Empresa',      chars:9,  active:true},
    {field:'CHQ_FIS',  label:'Tipo cheque',  chars:12, active:true},
    {field:'CHQ_PROP', label:'Origen',       chars:10, active:false},
    {field:'CHQ_REC',  label:'Recibo',       chars:11, active:true},
    {field:'CHQ_EST',  label:'Estado',       chars:13, active:true},
    {field:'CHQ_FSAL', label:'Fec.salida',   chars:11, active:true},
    {field:'CHQ_OBS',  label:'Observaciones',chars:40, active:true},
  ],
  oc: [
    {field:'OC_PED',  label:'Pedido',     width:'80px',  active:true},
    {field:'OC_FEC',  label:'Fecha',      width:'90px',  active:true},
    {field:'OC_PROV', label:'Proveedor',  width:'1fr',   active:true},
    {field:'OC_ORD',  label:'Orden',      width:'110px', active:true},
    {field:'OC_RUB',  label:'Rubro',      width:'70px',  active:true},
    {field:'OC_ENV',  label:'Envío',      width:'90px',  active:true},
    {field:'OC_AM',   label:'A/M',        width:'55px',  active:false},
    {field:'OC_TOT',  label:'Total',      width:'110px', align:'right', active:true},
    {field:'OC_ANT',  label:'Anticipo',   width:'105px', align:'right', active:false},
    {field:'OC_SAL',  label:'Saldo',      width:'105px', align:'right', active:false},
    {field:'OC_DER',  label:'Derecho',    width:'105px', align:'right', active:false},
    {field:'OC_PEND', label:'Pendiente',  width:'110px', align:'right', active:true},
  ],
  ctip: [
    {field:'empresa',    label:'Empresa',       width:'70px',  active:true},
    {field:'prefijo',    label:'Prefijo',       width:'80px',  active:true},
    {field:'tipo',       label:'Tipo',          width:'120px', active:true},
    {field:'desc',       label:'Descripción',   width:'1fr',   active:true},
    {field:'ultimo_nro', label:'Último Nro',    width:'90px',  align:'right',  active:true},
    {field:'contable',   label:'Contable',      width:'80px',  align:'center', active:true},
    {field:'tab_stk',    label:'Mueve Stock',   width:'100px', align:'center', active:true},
    {field:'tab_fact',   label:'P/Facturar',    width:'100px', align:'center', active:true},
  ]
};

const SORT_STATE = { art:{col:null,asc:true}, cli:{col:null,asc:true}, desp:{col:null,asc:true}, reci:{col:null,asc:true}, cart:{col:null,asc:true}, oc:{col:null,asc:true}, ctip:{col:null,asc:true} };

// Ancho de referencia por carácter (px). Se usa para convertir 'chars' → px FIJO,
// así una columna mide igual en el encabezado y en las filas aunque usen fuentes
// distintas (la unidad CSS 'ch' variaría según la fuente y desalinearía).
const CHAR_PX = 8;

function getActiveCols(grid) {
  const cfg  = getConfigUI(grid);
  const defs = COL_DEFS[grid];
  const userChars = (cfg && cfg.chars) || {};
  // Ancho FIJO por caracteres = chars × CHAR_PX (px). Prioridad: config del usuario > def.
  const norm = c => {
    const ch = (userChars[c.field] != null) ? userChars[c.field] : c.chars;
    return ch ? { ...c, width: (ch * CHAR_PX) + 'px' } : c;
  };
  if (!cfg || !cfg.activas || cfg.activas.length === 0) return defs.filter(c => c.active).map(norm);
  let ordered = (cfg.orden || []).map(f => defs.find(d => d.field === f)).filter(Boolean);
  defs.forEach(d => { if (!ordered.find(o => o.field === d.field)) ordered.push(d); });
  return ordered
    .filter(c => cfg.activas.includes(c.field))
    .map(c => cfg.labels && cfg.labels[c.field] ? { ...c, label: cfg.labels[c.field] } : c)
    .map(norm);
}

function toggleSort(grid, field) {
  if (SORT_STATE[grid].col===field) SORT_STATE[grid].asc = !SORT_STATE[grid].asc;
  else { SORT_STATE[grid].col = field; SORT_STATE[grid].asc = true; }
  if (grid==='art') renderArts();
  else if (grid==='cli') renderClis();
  else if (grid==='desp') renderDesp();
  else if (grid==='reci') renderReci();
  else if (grid==='cart') renderCart();
  else if (grid==='oc') renderOC();
  else if (grid==='ctip') renderCtip();
}

function sortArrow(grid, field) {
  const s = SORT_STATE[grid];
  return s.col !== field ? '' : (s.asc ? ' ▲' : ' ▼');
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
  const titles = {art:'Artículos', cli:'Clientes', desp:'Despachos', reci:'Recibos', cart:'Cartera de Valores', oc:'Ordenes de Compra', ctip:'Tipos de Comprobante'};
  document.getElementById('col-cfg-title').textContent = 'Columnas — ' + (titles[grid]||grid);
  const body = document.getElementById('col-cfg-body');
  body.innerHTML = ordered.map(c => {
    const isActive    = cfg ? (cfg.activas || []).includes(c.field) : c.active;
    const customLabel = cfg && cfg.labels && cfg.labels[c.field] ? cfg.labels[c.field] : c.label;
    const charsVal    = (cfg && cfg.chars && cfg.chars[c.field] != null) ? cfg.chars[c.field] : (c.chars || '');
    return `<div class="col-cfg-row" data-field="${c.field}" draggable="true"
      style="display:flex;align-items:center;gap:8px;padding:7px 6px;border-bottom:1px solid var(--b1);border-radius:4px;transition:background .1s;cursor:default">
      <span style="color:var(--t3);font-size:14px;cursor:grab;padding:0 4px" title="Arrastrar">☰</span>
      <input type="checkbox" data-field="${c.field}" ${isActive?'checked':''} style="width:15px;height:15px;accent-color:var(--acc);cursor:pointer;flex-shrink:0">
      <input type="text" class="col-lbl-inp" data-field="${c.field}" value="${customLabel}"
        style="flex:1;background:var(--s2);border:1px solid var(--b1);border-radius:4px;padding:3px 7px;font-size:13px;font-family:var(--sans);color:var(--txt);outline:none;min-width:0"
        onfocus="this.style.borderColor='var(--acc)'" onblur="this.style.borderColor='var(--b1)'"
        placeholder="${c.label}">
      <input type="number" min="0" max="200" class="col-chars-inp" data-field="${c.field}" value="${charsVal}"
        title="Ancho en caracteres (vacío = automático)" placeholder="auto"
        style="width:58px;background:var(--s2);border:1px solid var(--b1);border-radius:4px;padding:3px 6px;font-size:12px;font-family:var(--mono);color:var(--txt);outline:none;text-align:center;flex-shrink:0"
        onfocus="this.style.borderColor='var(--acc)';this.select()" onblur="this.style.borderColor='var(--b1)'">
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
      e.stopPropagation();
    });
    row.addEventListener('dragend', () => {
      row.style.opacity = '';
      container.querySelectorAll('.col-cfg-row').forEach(r=>r.style.background='');
      dragEl = null;
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation(); // ← FIX: evita scroll de fondo
      if (!dragEl || dragEl===row) return;
      const rect = row.getBoundingClientRect();
      container.querySelectorAll('.col-cfg-row').forEach(r=>r.style.background='');
      row.style.background = 'var(--s3)';
      if (e.clientY > rect.top + rect.height/2) container.insertBefore(dragEl, row.nextSibling);
      else container.insertBefore(dragEl, row);
    });
    row.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation(); // ← FIX
    });
  });

  // Evitar scroll de fondo en el modal durante drag
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
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
  const chars = {};
  document.querySelectorAll('#col-cfg-body .col-chars-inp').forEach(inp => {
    const v = parseInt(inp.value, 10);
    if (v > 0) chars[inp.dataset.field] = v;
  });
  try {
    await saveConfigUI(grid, orden, activas, labels, chars);
    document.getElementById('ov-col-cfg').classList.remove('open');
    if (grid==='art') renderArts();
    else if (grid==='cli') renderClis();
    else if (grid==='desp') renderDesp();
    else if (grid==='reci') renderReci();
    else if (grid==='cart') renderCart();
  else if (grid==='oc') renderOC();
    toast('Configuración guardada', 'scs');
  } catch(e) {
    console.error('saveColCfg:', e);
    toast('Error al guardar la configuración', 'err');
  }
}

function showDevTools() {
  ['btn-cfg-art','btn-cfg-cli','btn-cfg-desp'].forEach(id => {
    const el = document.getElementById(id); if(el) el.style.display='';
  });
}

const _stEl = document.createElement('style');
_stEl.textContent = '.th-sortable{cursor:pointer;user-select:none}.th-sortable:hover{color:#fff!important}';
document.head.appendChild(_stEl);
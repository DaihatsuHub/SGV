// TABLAS
// ══════════════════════════════════════════════
let TABLAS = {};
let tabActiva = 'RUBR';
let tabSelIdx = null;

const TAB_CONFIG = {
  MARC: { label:'Marcas',           lbl1:'Info',       lbl2:'' },
  RUBR: { label:'Rubros',           lbl1:'Grupo',      lbl2:'' },
  CCOS: { label:'Centros de Costos', lbl1:'',          lbl2:'' },
  PROV: { label:'Proveedores',      lbl1:'Info',       lbl2:'' },
  VEND: { label:'Vendedores',       lbl1:'Info',       lbl2:'' },
  CPAG: { label:'Cond. de Pago',    lbl1:'Info',       lbl2:'' },
  PCIA: { label:'Provincias',       lbl1:'% IIBB',     lbl2:'Conv.' },
  GRUP: { label:'Grupos',           lbl1:'Info',       lbl2:'' },
  CATE: { label:'Categorías',       lbl1:'Info',       lbl2:'' },
  EXPR: { label:'Transportes/Expresos', lbl1:'Dirección', lbl2:'' },
  MONE: { label:'Monedas',           lbl1:'Signo',      lbl2:'',           lblNum:'Cotización' },
  PCIA: { label:'Provincias',         lbl1:'Alícuota IB', lbl2:'' },
  PERC: { label:'Percepciones',       lbl1:'Porcentaje', lbl2:'' },
  // Código del BCRA (3 dígitos, el que viene impreso en el cheque) + nombre.
  // Sin campos extra: `sinExtras` oculta Dato 1 y Dato 2 del formulario.
  BANC: { label:'Bancos',             lbl1:'', lbl2:'', sinExtras:true },
  CGAS: { label:'Conceptos de Gasto', lbl1:'', lbl2:'', sinExtras:true },
};



function setTabActiva(t, el) {
  tabActiva = t; tabSelIdx = null;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-q').value = '';
  renderTab();
}

function getTabRows() {
  const q = document.getElementById('tab-q').value.toLowerCase();
  return (TABLAS[tabActiva]||[]).filter(r =>
    !q || r.CODIGO.toLowerCase().includes(q) || r.DETALLE.toLowerCase().includes(q)
  ).sort((a,b)=>(a.CODIGO||'').localeCompare(b.CODIGO||''));
}

function renderTab() {
  const list = getTabRows();
  const body = document.getElementById('tab-body');
  const cfg = TAB_CONFIG[tabActiva];
  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML = list.map((r,i) => {
    const sel = tabSelIdx===i?'sel':'';
    return `<div class="tr-tab ${sel}" onclick="selTab(${i})">
      <span class="col-cod">${esc(r.CODIGO)}</span>
      <span class="col-des">${esc(r.DETALLE)}</span>
      <span class="col-sm">${esc(r.STRING1||'')}</span>
      <span class="col-sm">${esc(r.STRING2||'')}</span>
    </div>`;
  }).join('');

}

function selTab(i) { tabSelIdx=i; renderTab(); }

function tAlta() {
  clrTabForm();
  document.getElementById('tf-cod').disabled = false;
  document.getElementById('tab-mtit').textContent = TAB_CONFIG[tabActiva].label + ' — Nuevo';
  setMtag('tab-mtag','ALTA','tag-a');
  setTabLabels();
  document.getElementById('ov-tab').classList.add('open');
  window._te = 'A';
}
function tModif() {
  if (tabSelIdx===null) { toast('Seleccioná un registro','err'); return; }
  const r = getTabRows()[tabSelIdx];
  document.getElementById('tf-cod').value = r.CODIGO;
  document.getElementById('tf-cod').disabled = true;
  document.getElementById('tf-det').value = r.DETALLE;
  document.getElementById('tf-s1').value  = r.STRING1||'';
  document.getElementById('tf-s2').value  = r.STRING2||'';
  document.getElementById('tab-mtit').textContent = TAB_CONFIG[tabActiva].label + ' — Modificar';
  setMtag('tab-mtag','MODIFICACIÓN','tag-m');
  setTabLabels();
  document.getElementById('ov-tab').classList.add('open');
  window._te = 'M';
}
function tBaja() {
  if (tabSelIdx===null) { toast('Seleccioná un registro','err'); return; }
  const r = getTabRows()[tabSelIdx];
  confirm2('¿Dar de baja "'+r.CODIGO+'"?', '"'+r.DETALLE+'" será eliminado.', ()=>{
    // Se borra en la pantalla SÓLO si el server confirma
    const tipo=tabActiva;
    apiPost('/tablas/borrar',{ tabla:tipo, codigo:r.CODIGO })
      .then(res=>{
        if(!res || res.ok===false){ toast('No se borró: '+((res&&res.error)||'error del servidor'),'err'); return; }
        const idx = TABLAS[tipo].findIndex(x=>x.CODIGO===r.CODIGO);
        if (idx>=0) TABLAS[tipo].splice(idx,1);
        tabSelIdx=null; renderTab();
        toast('Registro eliminado','scs');
      })
      .catch(e=>toast('No se borró: '+e.message,'err'));
  });
}
function clrTabForm() {
  ['tf-cod','tf-det','tf-s1','tf-s2'].forEach(i=>document.getElementById(i).value='');
}
function setTabLabels() {
  const cfg = TAB_CONFIG[tabActiva];
  document.getElementById('tf-lbl1').textContent = cfg.lbl1 || 'Dato 1';
  document.getElementById('tf-lbl2').textContent = cfg.lbl2 || 'Dato 2';
}
function saveTab() {
  // Si viene de subtabla (MARC/RUBR), usar _tabEditTipo
  if (_tabEditTipo && ['MARC','RUBR','CCOS','PROV','VEND','CPAG','PCIA','GRUP','CATE','EXPR','SRUB','MONE','PERC','BANC','CGAS'].includes(_tabEditTipo)) {
    const cod = document.getElementById('tf-cod').value.trim().toUpperCase();
    const det = document.getElementById('tf-det').value.trim().toUpperCase();
    if (!cod||!det) { toast('Código y detalle son obligatorios','err'); return; }
    const numGrpSave = document.getElementById('tf-num-grp');
    const s2val = numGrpSave && numGrpSave.style.display!=='none'
      ? String(document.getElementById('tf-num').value)
      : document.getElementById('tf-s2').value.trim();
    const d = {TABLA:_tabEditTipo,CODIGO:cod,DETALLE:det,
      STRING1:document.getElementById('tf-s1').value.trim(),
      STRING2:s2val,STRING3:'',FECHA1:''};
    if(_tabEditTipo==='VEND'){ d.STRING1=String(parseFloat(document.getElementById('tf-com').value)||0); d.STRING2=document.getElementById('tf-ger').checked?'S':''; }
    if (!TABLAS[_tabEditTipo]) TABLAS[_tabEditTipo]=[];
    if (_tabEditMode==='A' && TABLAS[_tabEditTipo].find(r=>r.CODIGO===cod)) { toast('Código ya existe','err'); return; }
    // PRIMERO se graba en el server y SÓLO si confirma se actualiza la pantalla.
    // Antes era al revés y sin esperar la respuesta: si el server rechazaba el
    // alta, el registro aparecía igual y se perdía al recargar la página.
    const tipo=_tabEditTipo, modo=_tabEditMode;
    apiPost('/tablas/guardar',{ tabla:tipo, codigo:d.CODIGO, detalle:d.DETALLE, string1:d.STRING1, string2:d.STRING2 })
      .then(res=>{
        if(!res || res.ok===false){ toast('No se grabó: '+((res&&res.error)||'error del servidor'),'err'); return; }
        if (modo==='A') {
          TABLAS[tipo].push(d);
          TABLAS[tipo].sort((a,b)=>a.CODIGO.localeCompare(b.CODIGO));
          toast('Registro dado de alta','scs');
        } else {
          const idx=(TABLAS[tipo]||[]).findIndex(r=>r.CODIGO===cod);
          if(idx>=0) TABLAS[tipo][idx]=d;
          toast('Registro modificado','scs');
        }
        if(typeof saveTablas==='function') saveTablas();
        closeOv('ov-tab');
        renderTabGral(tipo);
        _tabEditTipo='';
      })
      .catch(e=>toast('No se grabó: '+e.message,'err'));
    return;
  }
  const cod = document.getElementById('tf-cod').value.trim().toUpperCase();
  const det = document.getElementById('tf-det').value.trim().toUpperCase();
  if (!cod||!det) { toast('Código y detalle son obligatorios','err'); return; }
  const d = {
    TABLA: tabActiva, CODIGO: cod, DETALLE: det,
    STRING1: document.getElementById('tf-s1').value.trim(),
    STRING2: document.getElementById('tf-s2').value.trim(),
    STRING3: '', FECHA1: ''
  };
  if(tabActiva==='VEND'){ d.STRING1=String(parseFloat(document.getElementById('tf-com').value)||0); d.STRING2=document.getElementById('tf-ger').checked?'S':''; }
  if (!TABLAS[tabActiva]) TABLAS[tabActiva] = [];
  if (window._te==='A' && TABLAS[tabActiva].find(r=>r.CODIGO===cod)) { toast('Código ya existe','err'); return; }
  // PRIMERO el server; la pantalla se actualiza SÓLO si confirma
  const tipo=tabActiva, modo=window._te;
  apiPost('/tablas/guardar',{ tabla:tipo, codigo:d.CODIGO, detalle:d.DETALLE, string1:d.STRING1, string2:d.STRING2 })
    .then(res=>{
      if(!res || res.ok===false){ toast('No se grabó: '+((res&&res.error)||'error del servidor'),'err'); return; }
      if (modo==='A') {
        TABLAS[tipo].push(d);
        TABLAS[tipo].sort((a,b)=>a.CODIGO.localeCompare(b.CODIGO));
        toast('Registro dado de alta','scs');
      } else {
        const idx = TABLAS[tipo].findIndex(r=>r.CODIGO===cod);
        if (idx>=0) TABLAS[tipo][idx] = d;
        toast('Registro modificado','scs');
      }
      if(typeof saveTablas==='function') saveTablas();
      closeOv('ov-tab'); renderTab();
    })
    .catch(e=>toast('No se grabó: '+e.message,'err'));
}




// ── ABM GENÉRICO PARA SUBTABLAS ────────────────────────────────────
let _tabGralSel = {};   // {MARC: idx, RUBR: idx, ...}

function getTabGralRows(tipo) {
  const qId = tipo.toLowerCase()+'-q';
  const qEl = document.getElementById(qId);
  const q = qEl ? qEl.value.toLowerCase() : '';
  return (TABLAS[tipo]||[]).filter(r =>
    !q || r.CODIGO.toLowerCase().includes(q) || r.DETALLE.toLowerCase().includes(q)
  );
}

function renderTabGral(tipo) {
  // Caso especial MONE — muestra cotización numérica
  if (tipo === 'MONE') {
    const q = (document.getElementById('mone-q')?.value||'').toLowerCase();
    const body = document.getElementById('mone-body');
    if (!body) return;
    const list = (TABLAS['MONE']||[]).filter(r =>
      !q || r.CODIGO.toLowerCase().includes(q) || r.DETALLE.toLowerCase().includes(q)
    );
    if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
    body.innerHTML = list.map((r,i) => {
      const sel = (_tabGralSel['MONE']===i) ? 'sel' : '';
      return `<div class="tr-tab ${sel}" style="display:grid;grid-template-columns:60px 1fr 70px 110px;gap:8px;padding:11px 16px;font-size:13px;cursor:pointer" onclick="selTabGral('MONE',${i})">
        <span class="col-cod">${esc(r.CODIGO)}</span>
        <span>${esc(r.DETALLE)}</span>
        <span style="font-family:var(--mono);text-align:center">${esc(r.STRING1||'')}</span>
        <span style="text-align:right;font-family:var(--mono);color:var(--grn)">${parseFloat(r.STRING2||0).toLocaleString('es-AR',{minimumFractionDigits:2})}</span>
      </div>`;
    }).join('');
    return;
  }

  const list = getTabGralRows(tipo);
  const bodyId = tipo.toLowerCase()+'-body';
  const body = document.getElementById(bodyId);
  if (!body) return;
  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML = list.map((r,i) => {
    const sel = _tabGralSel[tipo]===i?'sel':'';
    const c3 = tipo==='VEND' ? (r.STRING1||'0')+'%' : (r.STRING1||'');
    const c4 = (tipo==='VEND' && r.STRING2==='S') ? '<span class="pill ps">👥 Gerencia</span>' : '';
    return `<div class="tr-tab ${sel}" onclick="selTabGral('${tipo}',${i})">
      <span class="col-cod">${esc(r.CODIGO)}</span>
      <span class="col-des">${esc(r.DETALLE)}</span>
      <span class="col-sm">${esc(c3)}</span>
      <span class="col-ctr">${c4}</span>
    </div>`;
  }).join('');
}

function selTabGral(tipo, i) { _tabGralSel[tipo]=i; renderTabGral(tipo); }

// Muestra/precarga los campos propios de VEND (comisión % + gerencia)
function _tabVendUI(tipo, r){
  const isV = (tipo==='VEND');
  document.getElementById('tf-com-grp').style.display = isV?'flex':'none';
  document.getElementById('tf-ger-grp').style.display = isV?'flex':'none';
  document.getElementById('tf-s1').closest('.fgrp').style.display = isV?'none':'flex';
  if(isV){
    document.getElementById('tf-com').value = r ? (parseFloat(r.STRING1)||0) : 0;
    document.getElementById('tf-ger').checked = r ? (r.STRING2==='S') : false;
  }
}

// Tablas que son sólo código + detalle (ej. Bancos): se ocultan Dato 1 y 2
function _tabSinExtras(tipo){
  if(!(TAB_CONFIG[tipo]||{}).sinExtras) return;
  ['tf-s1','tf-s2'].forEach(id=>{
    const g=document.getElementById(id)?.closest('.fgrp');
    if(g) g.style.display='none';
  });
}

function tabAlta(tipo) {
  _tabEditTipo = tipo; _tabEditMode = 'A';
  clrTabForm();
  document.getElementById('tf-cod').disabled = false;
  document.getElementById('tab-mtit').textContent = (TAB_CONFIG[tipo]?.label||tipo) + ' — Nuevo';
  setMtag('tab-mtag','ALTA','tag-a');
  const cfgT = TAB_CONFIG[tipo]||{};
  document.getElementById('tf-lbl1').textContent = cfgT.lbl1||'Dato 1';
  document.getElementById('tf-lbl2').textContent = cfgT.lbl2||'';
  document.getElementById('tf-s2').type = 'text';
  document.getElementById('tf-s2').closest('.fgrp').style.display = (tipo==='RUBR'||tipo==='MONE'||tipo==='PERC'||tipo==='VEND')?'none':'flex';
  _tabVendUI(tipo, null);
  _tabSinExtras(tipo);
  // Campo numérico
  const numGrp = document.getElementById('tf-num-grp');
  const cfgNum = TAB_CONFIG[tipo]||{};
  if (cfgNum.lblNum) {
    numGrp.style.display = 'flex';
    document.getElementById('tf-lbl-num').textContent = cfgNum.lblNum;
    document.getElementById('tf-num').value = 0;
  } else {
    numGrp.style.display = 'none';
  }
  document.getElementById('ov-tab').classList.add('open');
}

function tabModif(tipo) {
  const idx = _tabGralSel[tipo];
  if (idx===undefined||idx===null) { toast('Seleccioná un registro','err'); return; }
  const r = getTabGralRows(tipo)[idx];
  if (!r) { toast('Seleccioná un registro','err'); return; }
  _tabEditTipo = tipo; _tabEditMode = 'M';
  document.getElementById('tf-cod').value = r.CODIGO;
  document.getElementById('tf-cod').disabled = true;
  document.getElementById('tf-det').value = r.DETALLE;
  document.getElementById('tf-s1').value  = r.STRING1||'';
  document.getElementById('tf-s2').value  = r.STRING2||'';
  document.getElementById('tab-mtit').textContent = (TAB_CONFIG[tipo]?.label||tipo) + ' — Modificar';
  setMtag('tab-mtag','MODIFICACIÓN','tag-m');
  const cfgM = TAB_CONFIG[tipo]||{};
  document.getElementById('tf-lbl1').textContent = cfgM.lbl1||'Dato 1';
  document.getElementById('tf-lbl2').textContent = cfgM.lbl2||'';
  document.getElementById('tf-s2').closest('.fgrp').style.display = (tipo==='RUBR'||tipo==='MONE'||tipo==='PERC'||tipo==='VEND')?'none':'flex';
  _tabVendUI(tipo, r);
  _tabSinExtras(tipo);
  // Campo numérico
  const numGrpM = document.getElementById('tf-num-grp');
  const cfgNumM = TAB_CONFIG[tipo]||{};
  if (cfgNumM.lblNum) {
    numGrpM.style.display = 'flex';
    document.getElementById('tf-lbl-num').textContent = cfgNumM.lblNum;
    document.getElementById('tf-num').value = parseFloat(r.STRING2)||0;
  } else {
    numGrpM.style.display = 'none';
  }
  document.getElementById('ov-tab').classList.add('open');
}

function tabBaja(tipo) {
  const idx = _tabGralSel[tipo];
  if (idx===undefined||idx===null) { toast('Seleccioná un registro','err'); return; }
  const r = getTabGralRows(tipo)[idx];
  if (!r) { toast('Seleccioná un registro','err'); return; }
  confirm2('¿Dar de baja "'+r.CODIGO+'"?', '"'+r.DETALLE+'" será eliminado.', ()=>{
    // Se borra en la pantalla SÓLO si el server confirma
    apiPost('/tablas/borrar',{ tabla:tipo, codigo:r.CODIGO })
      .then(res=>{
        if(!res || res.ok===false){ toast('No se borró: '+((res&&res.error)||'error del servidor'),'err'); return; }
        const i = (TABLAS[tipo]||[]).findIndex(x=>x.CODIGO===r.CODIGO);
        if (i>=0) TABLAS[tipo].splice(i,1);
        _tabGralSel[tipo]=null; renderTabGral(tipo);
        toast('Registro eliminado','scs');
      })
      .catch(e=>toast('No se borró: '+e.message,'err'));
  });
}

let _tabEditTipo = '', _tabEditMode = 'A';

// Navegación por teclado en las grillas del ABM genérico (vendedores, rubros, prov, etc.)
document.addEventListener('keydown', e => {
  if(document.querySelector('.ov.open')) return;
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const pg = document.querySelector('.page.active');
  if(!pg || !pg.id.startsWith('page-')) return;
  const tipo = pg.id.replace('page-','').toUpperCase();
  const body = document.getElementById(tipo.toLowerCase()+'-body');
  if(!body || !TAB_CONFIG[tipo]) return;   // solo tablas del ABM genérico
  const list = getTabGralRows(tipo);
  if(!list.length) return;
  let cur = _tabGralSel[tipo];
  if(cur===undefined||cur===null) cur=-1;
  let next=cur;
  if(e.key==='ArrowDown'){ e.preventDefault(); next=Math.min(cur+1, list.length-1); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); next=Math.max(cur-1, 0); }
  else if(e.key==='PageDown'){ e.preventDefault(); next=Math.min(cur+10, list.length-1); }
  else if(e.key==='PageUp'){ e.preventDefault(); next=Math.max(cur-10, 0); }
  else if(e.key==='Home'){ e.preventDefault(); next=0; }
  else if(e.key==='End'){ e.preventDefault(); next=list.length-1; }
  else if(e.key==='Enter'){ e.preventDefault(); if(cur>=0) tabModif(tipo); return; }
  else return;
  if(next!==cur && next>=0){
    _tabGralSel[tipo]=next;
    renderTabGral(tipo);
    const rows=document.querySelectorAll('#'+tipo.toLowerCase()+'-body .tr-tab');
    if(rows[next]) rows[next].scrollIntoView({block:'nearest'});
  }
});


// ══════════════════════════════════════════════
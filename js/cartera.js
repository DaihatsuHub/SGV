// ═══════════════════════════════════════════════════════════
// CARTERA DE VALORES (cheques)
// ═══════════════════════════════════════════════════════════

let CHEQUES = [];
let cheqSelIdx = null;
let cheqFiltEstado = 'todos';
let cheqFiltFisico = 'todos';     // todos | fisico | echeq
let cheqFiltDesde = '';           // filtro rango de fechas (fecha del cheque)
let cheqFiltHasta = '';
let selectedCheqIds = new Set();
let _cheqOrig = null;

const CHEQ_ESTADOS = {
  'cartera':    'En cartera',
  'depositado': 'Depositado',
  'entregado':  'Entregado a proveedor',
  'rechazado':  'Rechazado',
  'devuelto':   'Devuelto al cliente'
};

const CART_SEL_W = '64px';   // ancho de la columna de selección

async function sbLoadCheques(){
  try { CHEQUES = await sbGetAll('cheques','fecha'); CHEQUES.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')); }
  catch(e){ console.error('sbLoadCheques:', e); CHEQUES=[]; }
  // Asegurar recibos cargados para mostrar el talonario en la columna Recibo-Cheque
  if(typeof RECIS!=='undefined' && (!RECIS || !RECIS.length) && typeof sbLoadRecis==='function'){
    try{ await sbLoadRecis(); }catch(e){ console.error('sbLoadRecis desde cartera:', e); }
  }
}

function cheqEstadoLabel(e){ return CHEQ_ESTADOS[e] || e || 'En cartera'; }
function cheqEstadoColor(e){
  switch(e){
    case 'depositado': return 'var(--grn)';
    case 'entregado':  return 'var(--acc)';
    case 'rechazado':  return 'var(--red)';
    case 'devuelto':   return 'var(--t3)';
    default:           return 'var(--txt)';
  }
}
function cheqFisLabel(c){ return c.fisico ? 'Cheque' : 'ECheq'; }

function cheqSetFiltEstado(e){ cheqFiltEstado=e; cheqSelIdx=null; renderCart(); }
function cheqSetFiltFisico(f){ cheqFiltFisico=f; cheqSelIdx=null; renderCart(); }

function getCheqRows(){
  const q=(document.getElementById('cart-q')?.value||'').toLowerCase();
  let list=(CHEQUES||[]).slice();
  if(cheqFiltEstado!=='todos') list=list.filter(c=>(c.estado||'cartera')===cheqFiltEstado);
  if(cheqFiltFisico==='fisico') list=list.filter(c=>!!c.fisico);
  else if(cheqFiltFisico==='echeq') list=list.filter(c=>!c.fisico);
  if(cheqFiltDesde) list=list.filter(c=>(c.fecha||'').substring(0,10) >= cheqFiltDesde);
  if(cheqFiltHasta) list=list.filter(c=>(c.fecha||'').substring(0,10) <= cheqFiltHasta);
  if(q) list=list.filter(c=>{
    const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
    return String(c.numero||'').includes(q) ||
      (c.cliente||'').toLowerCase().includes(q) ||
      (cli && (cli.CLI_RAZON||'').toLowerCase().includes(q)) ||
      String(c.recibo_numero||'').includes(q);
  });
  const s=(typeof SORT_STATE!=='undefined' && SORT_STATE.cart) ? SORT_STATE.cart : {col:null,asc:true};
  if(s.col){
    const razon=c=>{ const k=CLIS.find(x=>(x.CLI_CODIGO||'').trim()===(c.cliente||'').trim()); return (k?k.CLI_RAZON:c.cliente)||''; };
    list=list.slice().sort((a,b)=>{
      let va,vb;
      switch(s.col){
        case 'CHQ_FEC': va=a.fecha||''; vb=b.fecha||''; break;
        case 'CHQ_NUM': va=a.numero||''; vb=b.numero||''; break;
        case 'CHQ_IMP': va=a.importe||0; vb=b.importe||0; break;
        case 'CHQ_CLI': va=razon(a); vb=razon(b); break;
        case 'CHQ_EMP': va=a.empresa||''; vb=b.empresa||''; break;
        case 'CHQ_FIS': va=a.fisico?1:0; vb=b.fisico?1:0; break;
        case 'CHQ_PROP':va=a.propio?1:0; vb=b.propio?1:0; break;
        case 'CHQ_REC': va=a.recibo_numero||0; vb=b.recibo_numero||0; break;
        case 'CHQ_EST': va=cheqEstadoLabel(a.estado); vb=cheqEstadoLabel(b.estado); break;
        case 'CHQ_FSAL':va=a.fecha_salida||''; vb=b.fecha_salida||''; break;
        case 'CHQ_OBS': va=a.observaciones||''; vb=b.observaciones||''; break;
        default: va=''; vb='';
      }
      const r=(typeof va==='number'&&typeof vb==='number')?(va-vb):String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    });
  }
  return list;
}

function renderCart(){
  const body=document.getElementById('cart-body'); if(!body) return;
  if (typeof _recisLoaded !== 'undefined' && !_recisLoaded) {
    body.innerHTML='<div class="empty">⏳ Cargando cartera…</div>';
    if (typeof ensureRecibos==='function') ensureRecibos().then(renderCart);
    return;
  }
  const list=getCheqRows();

  // filtros activos (resaltado)
  document.querySelectorAll('#cart-filtros .fbtn').forEach(b=>{
    const on=b.dataset.est===cheqFiltEstado; b.style.background=on?'var(--acc)':''; b.style.color=on?'#fff':'';
  });
  document.querySelectorAll('#cart-filtros-fis .fbtn').forEach(b=>{
    const on=b.dataset.fis===cheqFiltFisico; b.style.background=on?'var(--acc)':''; b.style.color=on?'#fff':'';
  });

  // totales del filtro actual
  const tot=list.reduce((s,c)=>s+(c.importe||0),0);
  const totEl=document.getElementById('cart-total'); if(totEl) totEl.textContent=reciFmt(tot);
  const cntEl=document.getElementById('cart-count'); if(cntEl) cntEl.textContent=list.length;

  const cols=(typeof getActiveCols==='function')?getActiveCols('cart'):[];
  const gridTpl=cols.map(c=>c.width||'1fr').join(' ')+' '+CART_SEL_W;
  const allSel = list.length>0 && list.every(c=>selectedCheqIds.has(c.id));
  const thead=document.getElementById('cart-thead');
  if(thead){
    thead.style.gridTemplateColumns=gridTpl;
    thead.innerHTML=cols.map(c=>`<span class="th-sortable" onclick="toggleSort('cart','${c.field}')" style="${c.align?'text-align:'+c.align:''}${c.field==='CHQ_IMP'?';padding-right:16px':''}">${c.label}${(typeof sortArrow==='function')?sortArrow('cart',c.field):''}</span>`).join('')
      + `<span style="text-align:center"><input type="checkbox" id="cart-selall" ${allSel?'checked':''} onclick="cheqToggleAll(this.checked)" title="Seleccionar todos" style="accent-color:var(--acc);cursor:pointer"></span>`;
  }

  if(!list.length){ body.innerHTML='<div class="empty">🔍 Sin cheques</div>'; cheqUpdateSel(); cheqInstallNav(); return; }
  body.innerHTML=list.map((c,i)=>{
    const sel=cheqSelIdx===i?'sel':'';
    const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
    const fec=c.fecha?_cartFecha(c.fecha):'—';
    const fsal=_cartFecha(c.fecha_salida);
    const emp=c.empresa==='H'?'Hatsu':(c.empresa==='T'?'Tressa':(c.empresa||''));
    const checked=selectedCheqIds.has(c.id)?'checked':'';
    const cell=f=>{
      switch(f){
        case 'CHQ_FEC':  return `<span class="col-sm" style="color:var(--t2)">${fec}</span>`;
        case 'CHQ_NUM':  return `<span class="col-cod" style="font-family:var(--mono)">${esc(_cartCheque(c))}</span>`;
        case 'CHQ_IMP':  return `<span class="col-num" style="text-align:right;font-family:var(--mono);font-size:14px;font-weight:600;padding-right:16px">${reciFmt(c.importe||0)}</span>`;
        case 'CHQ_CLI':  return `<span class="col-des" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.cliente||'')}${cli?' — '+esc(cli.CLI_RAZON):''}</span>`;
        case 'CHQ_EMP':  return `<span class="col-sm">${esc(emp)}</span>`;
        case 'CHQ_FIS':  return `<span class="col-sm" style="color:${c.fisico?'var(--txt)':'var(--acc)'}">${cheqFisLabel(c)}</span>`;
        case 'CHQ_PROP': return `<span class="col-sm">${c.propio?'Propio':'Terceros'}</span>`;
        case 'CHQ_REC':  return `<span class="col-sm" style="font-family:var(--mono)">${esc(_cartRecibo(c))}</span>`;
        case 'CHQ_EST':  return `<span class="col-sm" style="color:${cheqEstadoColor(c.estado)};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cheqEstadoShort(c.estado))}</span>`;
        case 'CHQ_FSAL': return `<span class="col-sm">${fsal}</span>`;
        case 'CHQ_OBS':  return `<span class="col-des" style="color:var(--t3)">${esc(c.observaciones||'')}</span>`;
        default: return `<span></span>`;
      }
    };
    return `<div class="tr-art ${sel}" data-idx="${i}" style="grid-template-columns:${gridTpl};gap:6px" onclick="selCheq(${i})" ondblclick="cheqEdit()">`
      + cols.map(co=>cell(co.field)).join('')
      + `<span style="text-align:center"><input type="checkbox" ${checked} onclick="event.stopPropagation();cheqToggleSel(${c.id},this.checked)" style="accent-color:var(--acc);cursor:pointer"></span>`
      + `</div>`;
  }).join('');
  body.querySelector('.tr-art.sel')?.scrollIntoView({block:'nearest'});
  cheqUpdateSel();
  cheqInstallNav();
  cartFit();
}

// ─── Escalar la tabla para que entre completa en cualquier pantalla (Opción A) ───
// Mantiene los anchos/proporciones exactos y hace "zoom" del contenedor para que
// llene el ancho disponible (achica si no entra, agranda si sobra).
let _cartFitBound = false;
function cartFit(){
  const wrap = document.querySelector('#page-cart .tbl-wrap');
  if(!wrap) return;
  const cols = (typeof getActiveCols==='function') ? getActiveCols('cart') : [];
  // Ancho natural = suma de columnas fijas (px) + selección + gaps + padding del thead.
  let sum = 0, ok = true;
  cols.forEach(c=>{ const m=/^(\d+(?:\.\d+)?)px$/.exec(c.width||''); if(m) sum+=parseFloat(m[1]); else ok=false; });
  if(!ok){ wrap.style.zoom=''; wrap.style.width=''; return; }   // si hay 1fr/otra unidad, no escala
  const selW    = parseFloat(CART_SEL_W) || 64;
  const tracks  = cols.length + 1;              // + columna de selección
  const PAD     = 24;                            // padding horizontal del thead (12+12)
  const natural = sum + selW + (tracks-1)*6 + PAD;
  const parent  = wrap.parentElement;
  const avail   = parent ? parent.clientWidth : natural;
  if(natural>0 && avail>0){
    wrap.style.width = natural + 'px';
    wrap.style.zoom  = Math.min(1, avail / natural).toFixed(4);   // nunca AGRANDA; solo achica si no entra
  }
  if(!_cartFitBound){
    window.addEventListener('resize', ()=>{ if(document.getElementById('cart-thead')) cartFit(); });
    _cartFitBound = true;
  }
}

function selCheq(i){ cheqSelIdx=i; renderCart(); }

// ── Selección múltiple ────────────────────────────────────
function cheqToggleSel(id, checked){
  if(checked) selectedCheqIds.add(id); else selectedCheqIds.delete(id);
  cheqUpdateSel();
  const all=document.getElementById('cart-selall');
  if(all){ const list=getCheqRows(); all.checked = list.length>0 && list.every(c=>selectedCheqIds.has(c.id)); }
}
function cheqToggleAll(checked){
  const list=getCheqRows();
  if(checked) list.forEach(c=>selectedCheqIds.add(c.id));
  else list.forEach(c=>selectedCheqIds.delete(c.id));
  renderCart();
}
function cheqUpdateSel(){
  let total=0;
  CHEQUES.forEach(c=>{ if(selectedCheqIds.has(c.id)) total+=(c.importe||0); });
  const n=selectedCheqIds.size;
  const c1=document.getElementById('cart-selcount'); if(c1) c1.textContent=n;
  const c2=document.getElementById('cart-selcount2'); if(c2) c2.textContent=n;
  const t=document.getElementById('cart-seltotal'); if(t) t.textContent=reciFmt(total);
  const btn=document.getElementById('btn-cart-confirm');
  if(btn){ btn.disabled = n===0; btn.style.opacity = n===0?'0.5':'1'; }
}

// ── Edición individual ────────────────────────────────────
function cheqEdit(){
  if(cheqSelIdx===null){ toast('Seleccioná un cheque','err'); return; }
  const c=getCheqRows()[cheqSelIdx]; if(!c){ toast('Seleccioná un cheque','err'); return; }
  _cheqOrig=c;
  const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
  document.getElementById('cf-info').textContent =
    `Nº ${c.numero||''} · ${reciFmt(c.importe||0)} · ${cheqFisLabel(c)} · ${_cartFecha(c.fecha)} · ${cli?cli.CLI_RAZON:(c.cliente||'')}`;
  document.getElementById('cf-estado').innerHTML =
    Object.keys(CHEQ_ESTADOS).map(k=>`<option value="${k}"${(c.estado||'cartera')===k?' selected':''}>${CHEQ_ESTADOS[k]}</option>`).join('');
  document.getElementById('cf-fsalida').value=(c.fecha_salida||'').substring(0,10);
  document.getElementById('cf-obs').value=c.observaciones||'';
  document.getElementById('cart-mtit').textContent=`Cheque Nº ${c.numero||''}`;
  document.getElementById('ov-cart').classList.add('open');
}
async function saveCheq(){
  if(!_cheqOrig) return;
  const estado=document.getElementById('cf-estado').value;
  const fsal=document.getElementById('cf-fsalida').value||null;
  const obs=document.getElementById('cf-obs').value.trim()||null;
  try{
    await sbUpsert('cheques',{ id:_cheqOrig.id, estado, fecha_salida:fsal, observaciones:obs });
    _cheqOrig.estado=estado; _cheqOrig.fecha_salida=fsal; _cheqOrig.observaciones=obs;
    closeOv('ov-cart'); renderCart(); toast('Cheque actualizado','scs');
  }catch(e){ console.error('saveCheq:', e); toast('Error al guardar','err'); }
}

// ── Confirmación masiva (varios seleccionados) ────────────
function openCheqBulk(){
  if(selectedCheqIds.size===0){ toast('No hay valores seleccionados','err'); return; }
  let total=0; CHEQUES.forEach(c=>{ if(selectedCheqIds.has(c.id)) total+=(c.importe||0); });
  document.getElementById('cb-info').textContent =
    `${selectedCheqIds.size} valor(es) seleccionado(s) · Total ${reciFmt(total)}`;
  document.getElementById('cb-estado').innerHTML =
    Object.keys(CHEQ_ESTADOS).map(k=>`<option value="${k}">${CHEQ_ESTADOS[k]}</option>`).join('');
  document.getElementById('cb-fsalida').value='';
  document.getElementById('cb-obs').value='';
  document.getElementById('ov-cartbulk').classList.add('open');
}
async function saveCheqBulk(){
  const ids=[...selectedCheqIds];
  if(!ids.length){ closeOv('ov-cartbulk'); return; }
  const estado=document.getElementById('cb-estado').value;
  const fsal=document.getElementById('cb-fsalida').value||null;
  const obs=document.getElementById('cb-obs').value.trim()||null;
  try{
    for(const id of ids){
      await sbUpsert('cheques',{ id, estado, fecha_salida:fsal, observaciones:obs });
      const c=CHEQUES.find(x=>x.id===id);
      if(c){ c.estado=estado; c.fecha_salida=fsal; c.observaciones=obs; }
    }
    selectedCheqIds.clear();
    closeOv('ov-cartbulk'); renderCart();
    toast(`${ids.length} valor(es) actualizado(s)`,'scs');
  }catch(e){ console.error('saveCheqBulk:', e); toast('Error al actualizar','err'); }
}

// ── Navegación por teclado ────────────────────────────────
let _cheqNavInstalled=false;
function cheqInstallNav(){
  if(_cheqNavInstalled) return; _cheqNavInstalled=true;
  document.addEventListener('keydown', function(e){
    const page=document.getElementById('page-cart');
    if(!page || !page.classList.contains('active')) return;
    if(document.querySelector('.ov.open')) return;
    const ae=document.activeElement;
    if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    const total=getCheqRows().length; if(!total) return;
    let next=(cheqSelIdx==null)?0:cheqSelIdx;
    switch(e.key){
      case 'ArrowDown': next++; break;
      case 'ArrowUp':   next--; break;
      case 'PageDown':  next+=10; break;
      case 'PageUp':    next-=10; break;
      case 'Home':      next=0; break;
      case 'End':       next=total-1; break;
      default: return;
    }
    e.preventDefault();
    next=Math.max(0,Math.min(next,total-1));
    selCheq(next);
    document.getElementById('cart-body')?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({block:'nearest'});
  });
}

// ════════════════ Filtro por fechas ════════════════
function cheqSetFiltDesde(v){ cheqFiltDesde=v||''; cheqSelIdx=null; renderCart(); }
function cheqSetFiltHasta(v){ cheqFiltHasta=v||''; cheqSelIdx=null; renderCart(); }
function cheqClearFechas(){
  cheqFiltDesde=''; cheqFiltHasta='';
  const d=document.getElementById('cart-desde'); if(d) d.value='';
  const h=document.getElementById('cart-hasta'); if(h) h.value='';
  cheqSelIdx=null; renderCart();
}

// ════════════════ Exportar / Imprimir ════════════════
function _cartFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _cartFecha(f){
  if(!f) return '';
  const p=String(f).substring(0,10).split('-');   // [yyyy, mm, dd]
  return p.length<3 ? String(f) : (p[2]+'/'+p[1]+'/'+p[0].slice(-2));
}
// Recibo: empresa+talonario+numero(6 díg). Talonario del recibo real (coincide con el recibo).
function _cartRecibo(c){
  if(!c||!c.recibo_numero) return '';
  let emp=c.empresa||'', talo='';
  if(typeof RECIS!=='undefined' && Array.isArray(RECIS)){
    const r=RECIS.find(x=>x.id===c.recibo_id);
    if(r){ emp=r.empresa||emp; talo=r.talonario||''; }
  }
  return emp+talo+String(c.recibo_numero).padStart(6,'0');
}
// Número de cheque a 4 dígitos
function _cartCheque(c){ return (c && c.numero) ? String(c.numero).padStart(4,'0') : ''; }
// Estado corto (para que entre en la columna sin ensancharla)
const CHEQ_ESTADOS_SHORT = { 'cartera':'En cartera','depositado':'Depositado','entregado':'Entregado','rechazado':'Rechazado','devuelto':'Devuelto' };
function cheqEstadoShort(e){ return CHEQ_ESTADOS_SHORT[e] || cheqEstadoLabel(e); }

// Filas visibles (respeta filtros y orden actuales), resueltas para exportar
function _cartRowsExport(){
  return getCheqRows().map(c=>{
    const cli=(typeof CLIS!=='undefined') ? CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim()) : null;
    return {
      fecha: _cartFecha(c.fecha),
      numero: _cartCheque(c),
      cliente: cli ? (cli.CLI_RAZON||c.cliente||'') : (c.cliente||''),
      empresa: c.empresa||'',
      tipo: c.fisico ? 'Cheque' : 'ECheq',
      propio: c.propio ? 'Sí' : '',
      estado: cheqEstadoLabel(c.estado),
      fsal: _cartFecha(c.fecha_salida),
      recibo: _cartRecibo(c),
      obs: c.observaciones||'',
      importe: Number(c.importe)||0
    };
  });
}

function _cartLoadExcelJS(){
  return new Promise((resolve,reject)=>{
    if(window.ExcelJS) return resolve(window.ExcelJS);
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=()=>resolve(window.ExcelJS); s.onerror=()=>reject(new Error('ExcelJS'));
    document.head.appendChild(s);
  });
}

async function cartExcel(){
  const rows=_cartRowsExport();
  if(!rows.length){ toast('Nada para exportar','err'); return; }
  let ExcelJS;
  try{ ExcelJS=await _cartLoadExcelJS(); }catch(e){ toast('No se pudo cargar Excel','err'); return; }
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Cartera');
  ws.mergeCells('A1:K1');
  const t=ws.getCell('A1'); t.value='Cartera de Valores — '+new Date().toLocaleDateString('es-AR');
  t.font={bold:true,size:14}; t.alignment={horizontal:'center'};
  const head=['Fecha','Número','Cliente','Empresa','Tipo','Propio','Estado','Fecha salida','Recibo','Observaciones','Importe'];
  const hr=ws.addRow(head); hr.font={bold:true}; hr.eachCell(c=>{c.border={bottom:{style:'medium'}};});
  let tot=0;
  for(const r of rows){
    tot+=r.importe;
    const row=ws.addRow([r.fecha,r.numero,r.cliente,r.empresa,r.tipo,r.propio,r.estado,r.fsal,r.recibo,r.obs,r.importe]);
    row.getCell(11).numFmt='#,##0.00';
  }
  const tr=ws.addRow(['','','','','','','','','','TOTAL',tot]);
  tr.font={bold:true}; tr.getCell(11).numFmt='#,##0.00'; tr.eachCell(c=>{c.border={top:{style:'double'}};});
  ws.columns=[{width:11},{width:12},{width:28},{width:9},{width:8},{width:7},{width:20},{width:12},{width:9},{width:26},{width:13}];
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='Cartera_'+new Date().toISOString().slice(0,10)+'.xlsx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}

function cartPrint(){
  const rows=_cartRowsExport();
  if(!rows.length){ toast('Nada para imprimir','err'); return; }
  const _e=(typeof esc==='function')?esc:(s=>String(s==null?'':s));
  let tot=0, body='';
  for(const r of rows){
    tot+=r.importe;
    body+=`<tr><td>${r.fecha}</td><td>${_e(r.numero)}</td><td>${_e(r.cliente)}</td><td>${_e(r.empresa)}</td><td>${r.tipo}</td><td style="text-align:center">${r.propio}</td><td>${_e(r.estado)}</td><td>${r.fsal}</td><td>${_e(r.recibo)}</td><td>${_e(r.obs)}</td><td class="n">${_cartFmt(r.importe)}</td></tr>`;
  }
  const fecha=new Date().toLocaleDateString('es-AR');
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Cartera de Valores</title><meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:18px}
    h2{margin:0 0 2px} .sub{color:#666;font-size:11px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse} td,th{padding:3px 6px;border-bottom:1px solid #eee;text-align:left}
    th{background:#333;color:#fff} .n{text-align:right;font-family:monospace;white-space:nowrap}
    tr.tot td{font-weight:bold;border-top:2px solid #000}
  </style></head><body>
  <h2>Cartera de Valores</h2>
  <div class="sub">Daihatsu Electronics — ${fecha} · ${rows.length} cheque(s)</div>
  <table>
    <tr><th>Fecha</th><th>Número</th><th>Cliente</th><th>Empresa</th><th>Tipo</th><th>Propio</th><th>Estado</th><th>Fecha salida</th><th>Recibo</th><th>Observaciones</th><th class="n">Importe</th></tr>
    ${body}
    <tr class="tot"><td colspan="10">TOTAL</td><td class="n">${_cartFmt(tot)}</td></tr>
  </table>
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(()=>win.print(),300);
}

// ─── Alineación encabezado↔datos ───────────────────────────
// Fuerza que cada celda (título y dato) respete el ancho de su columna y
// recorte con "…" si no entra, para que nunca se solape con la siguiente.
(function(){
  if(document.getElementById('cart-align-style')) return;
  const s=document.createElement('style');
  s.id='cart-align-style';
  s.textContent='#cart-thead>*,#cart-body .tr-art>*{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}';
  document.head.appendChild(s);
})();

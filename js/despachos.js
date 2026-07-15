// ═══════════════════════════════════════════════════════════
// DESPACHOS — Listado, filtros, ABM
// ═══════════════════════════════════════════════════════════

let DESPS = [];
let despSelIdx = null;

async function sbLoadDesps() {
  try {
    DESPS = await sbGetAll('despachos', 'dep_desp');
  } catch(e) { console.error('sbLoadDesps:', e); DESPS = []; }
}

function despEmpresa(depDesp) {
  return (depDesp||'').trim().toUpperCase().charAt(0);
}

function filtDesps() {
  const q   = (document.getElementById('desp-q')?.value||'').toLowerCase();
  const nro = document.getElementById('desp-nro')?.value||'';
  const srt = document.getElementById('desp-sort')?.value||'fec-desc';

  let list = DESPS.filter(d => {
    const mn = !nro || (d.dep_desp||'').trim() === nro;
    const mq = !q ||
      (d.dep_desp||'').toLowerCase().includes(q) ||
      (d.dep_art||'').toLowerCase().includes(q)  ||
      (d.dep_proc||'').toLowerCase().includes(q);
    return mn && mq;
  });

  list = list.slice().sort((a,b) => {
    if(srt==='fec-desc') return (b.dep_fec||'').localeCompare(a.dep_fec||'');
    if(srt==='fec-asc')  return (a.dep_fec||'').localeCompare(b.dep_fec||'');
    if(srt==='nro-asc')  return (a.dep_desp||'').localeCompare(b.dep_desp||'');
    if(srt==='nro-desc') return (b.dep_desp||'').localeCompare(a.dep_desp||'');
    return 0;
  });
  return list;
}

function renderDesp() {
  const body  = document.getElementById('desp-body');
  // ── Carga diferida: la 1ra vez que se abre Despachos, traer sus datos (no se cargan al login) ──
  if(!window._despLoaded){
    if(!window._despLoading){
      window._despLoading=true;
      if(body) body.innerHTML='<div class="empty">⏳ Cargando despachos…</div>';
      Promise.all([
        (typeof sbLoadDesps==='function'?sbLoadDesps():Promise.resolve()),
        (typeof ensureArts==='function'?ensureArts():Promise.resolve())
      ])
        .then(()=>{ window._despLoaded=true; window._despLoading=false; renderDesp(); })
        .catch(e=>{ window._despLoading=false; console.error('carga despachos:',e); if(body) body.innerHTML='<div class="empty">⚠️ Error al cargar despachos</div>'; });
    }
    return;
  }
  const list  = filtDesps();
  const cols  = getActiveCols('desp');
  const gridTpl = cols.map(c => c.width||'1fr').join(' ');

  // Actualizar selector de despacho
  const nroSel = document.getElementById('desp-nro');
  if (nroSel) {
    const cur = nroSel.value;
    const despNros = [...new Set(DESPS.map(d=>(d.dep_desp||'').trim()).filter(Boolean))].sort();
    nroSel.innerHTML = '<option value="">Todos los despachos</option>' +
      despNros.map(n=>`<option value="${n}"${n===cur?' selected':''}>${n}</option>`).join('');
  }

  const thDesp = document.querySelector('.th-desp');
  if (thDesp) {
    thDesp.style.gridTemplateColumns = gridTpl;
    thDesp.innerHTML = cols.map(c =>
      `<span class="th-sortable" onclick="toggleSort('desp','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('desp',c.field)}</span>`
    ).join('');
  }

  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }

  body.innerHTML = list.map((d,i) => {
    const sel = despSelIdx===i ? 'sel' : '';
    const art = ARTS.find(a=>(a.ART_COD||'').trim()===(d.dep_art||'').trim());
    const stk = (d.dep_ent||0) - (d.dep_sal||0);
    const fec = d.dep_fec ? d.dep_fec.substring(0,10).split('-').reverse().join('/') : '—';
    return `<div class="tr-art ${sel}" style="grid-template-columns:${gridTpl}" onclick="selDesp(${i})" ondblclick="despModif()">` +
      cols.map(c => {
        if(c.field==='DEP_DESP')   return `<span class="col-cod">${esc(d.dep_desp||'')}${d.dep_sub?'<span style="color:var(--t3);font-size:10px"> '+esc(d.dep_sub)+'</span>':''}</span>`;
        if(c.field==='DEP_SUB')    return `<span class="col-sm">${esc(d.dep_sub||'')}</span>`;
        if(c.field==='DEP_FEC')    return `<span style="font-size:12px;color:var(--t2)">${fec}</span>`;
        if(c.field==='DEP_ART')    return `<span class="col-cod">${esc(d.dep_art||'')}</span>`;
        if(c.field==='DEP_DES')    return `<span class="col-des">${esc(art?art.ART_DES:'—')}</span>`;
        if(c.field==='DEP_PROC')   return `<span class="col-sm">${esc(d.dep_proc||'')}</span>`;
        if(c.field==='DEP_ENT')    return `<span class="col-num">${d.dep_ent||0}</span>`;
        if(c.field==='DEP_SAL')    return `<span class="col-num">${d.dep_sal||0}</span>`;
        if(c.field==='DEP_STK')    return `<span class="col-num" style="color:${stk<=0?'var(--red)':'var(--grn)'};font-weight:${stk>0?'600':'400'}">${stk}</span>`;
        if(c.field==='DEP_ADUA')   return `<span class="col-sm">${esc(d.dep_adua||'')}</span>`;
        if(c.field==='DEP_FOB')    {const f=(v=>v===0||v===null||v===undefined?'0,00':Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}))(d.dep_fob||0); return `<span class="col-num" style="font-weight:700">${f}</span>`;};
        if(c.field==='DEP_GAS')    return `<span class="col-num">${d.dep_gas||0}</span>`;
        if(c.field==='DEP_GAS2')   {const f=(v=>v===0||v===null||v===undefined?'0,00':Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}))(d.dep_gas2||0); return `<span class="col-num">${f}</span>`;};
        if(c.field==='DEP_MONEDA') return `<span class="col-sm">${esc(d.dep_moneda||'$')}</span>`;
        if(c.field==='DEP_COSTO')  {const f=(v=>v===0||v===null||v===undefined?'0,00':Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}))(d.dep_costo||0); return `<span class="col-num">${f}</span>`;};
        return `<span>${esc(String(d[c.field.toLowerCase()]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');
}

function selDesp(i) { despSelIdx=i; renderDesp(); }

// ── Alta ──────────────────────────────────────────────────
function despAlta() {
  clrDespForm();
  document.getElementById('df-desp').disabled = false;
  document.getElementById('df-art').disabled  = false;
  document.getElementById('desp-mtit').textContent = 'Nuevo Despacho';
  setMtag('desp-mtag','ALTA','tag-a');
  fillDespArtSelect('');
  const depGrp=document.getElementById('df-depent-grp');
  if(depGrp) depGrp.style.display='none';
  document.getElementById('ov-desp').classList.add('open');
  window._de = 'A';
}

// ── Modificar ─────────────────────────────────────────────
function despModif() {
  if(despSelIdx===null){ toast('Seleccioná un despacho','err'); return; }
  const d = filtDesps()[despSelIdx];
  fillDespForm(d);
  document.getElementById('df-desp').disabled = true;
  document.getElementById('df-art').disabled  = true;
  document.getElementById('desp-mtit').textContent = `Modificar: ${d.dep_desp}${d.dep_sub?' '+d.dep_sub:''}`;
  setMtag('desp-mtag','MODIFICACIÓN','tag-m');
  const depGrpM=document.getElementById('df-depent-grp');
  if(depGrpM) depGrpM.style.display='';
  document.getElementById('ov-desp').classList.add('open');
  window._de = 'M';
  window._despOrig = { ...d }; // guardar original para revertir stock si es necesario
}

// ── Baja ──────────────────────────────────────────────────
function despBaja() {
  if(despSelIdx===null){ toast('Seleccioná un despacho','err'); return; }
  const d = filtDesps()[despSelIdx];
  confirm2(
    `¿Dar de baja "${d.dep_desp}${d.dep_sub?' '+d.dep_sub:''}"?`,
    `Artículo: ${d.dep_art} — Se revertirá el stock.`,
    async () => {
      syncSaving();
      try {
        const res = await apiPost('/despachos/borrar', { desp:d.dep_desp, art:d.dep_art });
        aplicarStockMemoria(res.stock);
        const idx = DESPS.findIndex(x=>x.dep_desp===d.dep_desp&&x.dep_art===d.dep_art);
        if(idx>=0) DESPS.splice(idx,1);
        despSelIdx=null;
        renderDesp();
        syncOk();
        toast('Despacho eliminado','scs');
      } catch(e){ console.error(e); syncErr(); toast('Error al eliminar: '+e.message,'err'); }
    }
  );
}

function clrDespForm() {
  ['df-desp','df-sub','df-adua','df-proc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('df-fec').value = new Date().toISOString().substring(0,10);
  document.getElementById('df-ent').value = 0;
  document.getElementById('df-fob').value = 0;
  document.getElementById('df-gas2').value = 0;
  const monEl=document.getElementById('df-moneda'); if(monEl) monEl.value='';
  const depEntEl=document.getElementById('df-depent'); if(depEntEl) depEntEl.value=0;
  ['df-sal','df-stk','df-coent','df-cosal','df-costk'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=0;});
}

function fillDespForm(d) {
  document.getElementById('df-desp').value  = d.dep_desp||'';
  document.getElementById('df-sub').value   = d.dep_sub||'';
  document.getElementById('df-fec').value   = d.dep_fec||'';
  document.getElementById('df-adua').value  = d.dep_adua||'';
  document.getElementById('df-proc').value  = d.dep_proc||'';
  document.getElementById('df-fob').value   = d.dep_fob||0;
  document.getElementById('df-gas2').value  = d.dep_gas2||0;
  document.getElementById('df-ent').value   = d.dep_ent||0;
  const monEl=document.getElementById('df-moneda'); if(monEl) monEl.value=d.dep_moneda||'';
  const depEntEl=document.getElementById('df-depent'); if(depEntEl) depEntEl.value=d.dep_depent||0;
  { const es=document.getElementById('df-sal'); if(es)es.value=d.dep_sal||0;
    const ek=document.getElementById('df-stk'); if(ek)ek.value=d.dep_stk||0;
    const e1=document.getElementById('df-coent'); if(e1)e1.value=d.dep_coent||0;
    const e2=document.getElementById('df-cosal'); if(e2)e2.value=d.dep_cosal||0;
    const e3=document.getElementById('df-costk'); if(e3)e3.value=d.dep_costk||0; }
  fillDespArtSelect(d.dep_art||'');
}

function fillDespArtSelect(selArt) {
  const sel = document.getElementById('df-art');
  if(!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar artículo —</option>' +
    ARTS.map(a=>`<option value="${a.ART_COD}"${a.ART_COD===selArt?' selected':''}>${a.ART_COD} — ${a.ART_DES}</option>`).join('');
}

// Al cambiar ingreso, proponer mismo valor en dep_depent
function dfEntChange() {
  const val = parseInt(document.getElementById('df-ent')?.value)||0;
  const depEntEl = document.getElementById('df-depent');
  if(depEntEl && depEntEl.value==0) depEntEl.value = val;
  // En ALTA, proponer Stock real = Ingreso (salida 0). En modif no piso lo cargado.
  if(window._de==='A'){
    const stkEl=document.getElementById('df-stk'); const salEl=document.getElementById('df-sal');
    const sal=parseInt(salEl?.value)||0;
    if(stkEl) stkEl.value = val - sal;
  }
}

// ── Actualizar stock del artículo EN MEMORIA (el server ya lo grabó) ──
function aplicarStockMemoria(stock) {
  if (!stock || !stock.art_cod) return;
  const art = ARTS.find(a => (a.ART_COD||'').trim() === stock.art_cod.trim());
  if (!art) return;
  if (stock.art_stk  !== undefined) art.ART_STK  = stock.art_stk;
  if (stock.art_stkt !== undefined) art.ART_STKT = stock.art_stkt;
  if (stock.art_deph !== undefined) art.ART_DEPH = stock.art_deph;
  if (stock.art_dept !== undefined) art.ART_DEPT = stock.art_dept;
}

// ── Guardar ───────────────────────────────────────────────
async function saveDesp() {
  const desp  = document.getElementById('df-desp').value.trim().toUpperCase();
  const sub   = document.getElementById('df-sub').value.trim().toUpperCase();
  const fec   = document.getElementById('df-fec').value;
  const art   = document.getElementById('df-art').value;
  const ent   = parseInt(document.getElementById('df-ent').value)||0;
  const fob   = parseFloat(document.getElementById('df-fob').value)||0;
  const gas2  = parseFloat(document.getElementById('df-gas2').value)||0;
  const adua  = document.getElementById('df-adua').value.trim().toUpperCase();
  const proc  = document.getElementById('df-proc').value.trim().toUpperCase();
  const mone  = document.getElementById('df-moneda').value;
  const depEntEl = document.getElementById('df-depent');
  const depent = depEntEl ? (parseInt(depEntEl.value)||ent) : ent;
  const coent = parseInt(document.getElementById('df-coent')?.value)||0;
  const cosal = parseInt(document.getElementById('df-cosal')?.value)||0;
  const costk = parseInt(document.getElementById('df-costk')?.value)||0;
  const sal   = parseInt(document.getElementById('df-sal')?.value)||0;
  const stk   = parseInt(document.getElementById('df-stk')?.value)||0;

  if(!desp){ toast('Ingresá el número de despacho','err'); return; }
  if(!art){  toast('Seleccioná un artículo','err'); return; }
  if(!fec){  toast('Ingresá la fecha','err'); return; }
  if(ent<=0){ toast('El ingreso debe ser mayor a 0','err'); return; }

  // Verificar duplicado en alta
  if(window._de==='A') {
    const existe = DESPS.find(d=>d.dep_desp===desp&&d.dep_art===art);
    if(existe){ toast('Ya existe ese artículo en ese despacho','err'); return; }
  }

  syncSaving();
  try {
    const res = await apiPost('/despachos/guardar', {
      modo: window._de, desp, sub, fec, art, ent, fob, gas2, adua, proc, mone, depent, coent, cosal, costk, sal, stk
    });
    aplicarStockMemoria(res.stock);
    if(window._de==='A') {
      DESPS.push(res.despacho);
      toast('Despacho dado de alta','scs');
    } else {
      const idx=DESPS.findIndex(d=>d.dep_desp===desp&&d.dep_art===art);
      if(idx>=0) DESPS[idx]=res.despacho;
      toast('Despacho modificado','scs');
    }
    syncOk();
    closeOv('ov-desp');
    despSelIdx=null;
    renderDesp();
  } catch(e){ console.error(e); syncErr(); toast('Error: '+e.message,'err'); }
}

// ── Recalcular costo de todos los despachos ───────────────
async function despRecalcularCostos() {
  confirm2('¿Recalcular costos?', 'Se actualizará dep_costo = FOB × (1 + Gastos%/100) en todos los despachos.', async () => {
    syncSaving();
    try {
      const res = await apiPost('/despachos/recalcular-costos', {});
      await sbLoadDesps();          // recargar con los costos nuevos
      renderDesp();
      syncOk();
      toast(`Costos actualizados: ${res.actualizados} registros`, 'scs');
    } catch(e){ console.error(e); syncErr(); toast('Error al recalcular: '+e.message,'err'); }
  });
}

// ═══════════════════════════════════════════════════════════
//  IMPORTAR DESPACHO DESDE EXCEL
//  Excel: fila 1 = títulos (CODIGO=Cód.Casio / CANTIDAD / PRECIO unit.)
// ═══════════════════════════════════════════════════════════
function despLoadXLSX(){
  return new Promise((resolve,reject)=>{
    if(window.XLSX) return resolve(window.XLSX);
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=()=>resolve(window.XLSX);
    s.onerror=()=>reject(new Error('No se pudo cargar la librería de Excel'));
    document.head.appendChild(s);
  });
}
// Parseo tolerante de números (acepta 1234.56, 1.234,56, número nativo de Excel)
function despNum(v){
  if(typeof v==='number') return v;
  const s=String(v==null?'':v).trim();
  if(!s) return 0;
  if(s.indexOf(',')>=0) return parseFloat(s.replace(/\./g,'').replace(',','.'))||0;
  return parseFloat(s)||0;
}

function despImportarExcel(){
  let inp=document.getElementById('desp-xlsx-input');
  if(!inp){
    inp=document.createElement('input');
    inp.type='file'; inp.id='desp-xlsx-input'; inp.accept='.xlsx,.xls';
    inp.style.display='none';
    inp.addEventListener('change', despXlsxSelected);
    document.body.appendChild(inp);
  }
  inp.value='';
  inp.click();
}

async function despXlsxSelected(ev){
  const file=ev.target.files&&ev.target.files[0];
  if(!file) return;
  let XLSX;
  try { XLSX=await despLoadXLSX(); }
  catch(e){ toast('No se pudo cargar la librería de Excel','err'); return; }
  // Traer artículos FRESCOS del server (por si se cargaron en otra sesión)
  try { if(typeof reloadArts==='function'){ syncSaving(); await reloadArts(); syncOk(); } }
  catch(e){ console.error('reloadArts:',e); }
  try {
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    const datos=rows.slice(1).filter(r=>r.some(c=>String(c).trim()!==''));  // saltea encabezado
    if(!datos.length){ toast('El Excel no tiene datos','err'); return; }
    const items=[], faltantes=[];
    datos.forEach((r,i)=>{
      const codcasio=String(r[0]==null?'':r[0]).trim();
      if(!codcasio) return;
      const cant=Math.round(despNum(r[1]));
      const fob=despNum(r[2]);
      const art=ARTS.find(a=>(a.CODCASIO||'').trim().toUpperCase()===codcasio.toUpperCase());
      if(!art){ faltantes.push({fila:i+2, codcasio}); return; }
      items.push({ codcasio, art:art.ART_COD, desc:art.ART_DES, cant, fob, importe: cant*fob });
    });
    if(faltantes.length){ despImportError(faltantes); return; }
    if(!items.length){ toast('No se reconoció ningún artículo en el Excel','err'); return; }
    window._despImport=items;
    despImportModal(items);
  } catch(e){ console.error(e); toast('Error leyendo el Excel: '+e.message,'err'); }
}

// Cartel grande: hay códigos que no existen → suspende todo
function despImportError(faltantes){
  let ov=document.getElementById('ov-desp-imperr');
  if(!ov){ ov=document.createElement('div'); ov.id='ov-desp-imperr'; ov.className='ov'; document.body.appendChild(ov); }
  ov.innerHTML=`<div class="modal" style="max-width:560px;width:94%;border:2px solid var(--red)">
    <div style="text-align:center;padding:10px">
      <div style="font-size:42px">⚠️</div>
      <div style="font-size:19px;font-weight:700;color:var(--red);margin:6px 0">Importación suspendida</div>
      <div style="font-size:13px;color:var(--t2);margin-bottom:12px">Estos códigos del Excel <strong>no existen</strong> en el maestro de artículos (Cód.Casio). Corregí el Excel o dá de alta esos artículos, y volvé a importar. <strong>No se cargó nada.</strong></div>
      <div style="max-height:240px;overflow:auto;text-align:left;border:1px solid var(--b1);border-radius:6px">
        ${faltantes.map(f=>`<div style="display:flex;justify-content:space-between;padding:6px 10px;border-bottom:1px solid var(--b1);font-size:12px"><span style="color:var(--t3)">Fila ${f.fila}</span><span style="font-family:var(--mono);color:var(--red);font-weight:700">${esc(f.codcasio)}</span></div>`).join('')}
      </div>
      <button class="btn pri" style="margin-top:14px;padding:8px 24px" onclick="document.getElementById('ov-desp-imperr').classList.remove('open')">Entendido</button>
    </div>
  </div>`;
  ov.classList.add('open');
}

// Modal con cabecera + grilla + totales + confirmar/cancelar
function despImportModal(items){
  const totUnid=items.reduce((s,it)=>s+it.cant,0);
  const totMonto=items.reduce((s,it)=>s+it.importe,0);
  const hoy=new Date().toISOString().substring(0,10);
  let ov=document.getElementById('ov-desp-imp');
  if(!ov){ ov=document.createElement('div'); ov.id='ov-desp-imp'; ov.className='ov'; document.body.appendChild(ov); }
  ov.innerHTML=`<div class="modal" style="max-width:840px;width:96%">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <strong style="font-size:15px">📥 Importar despacho desde Excel</strong>
      <button class="btn" onclick="document.getElementById('ov-desp-imp').classList.remove('open')" style="padding:3px 9px">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px">
      <div class="fgrp"><label class="flbl2">N° Despacho *</label><input id="di-desp" class="finp" onclick="this.select()" style="width:100%;text-transform:uppercase"></div>
      <div class="fgrp"><label class="flbl2">Fecha *</label><input id="di-fec" type="date" class="finp" value="${hoy}" style="width:100%"></div>
      <div class="fgrp"><label class="flbl2">Moneda</label><select id="di-mone" class="finp" style="width:100%"><option value="">—</option><option value="$">$ Pesos</option><option value="U">u$s Dólar</option></select></div>
      <div class="fgrp"><label class="flbl2">Procedencia</label><input id="di-proc" class="finp" onclick="this.select()" style="width:100%;text-transform:uppercase"></div>
      <div class="fgrp"><label class="flbl2">Aduana</label><input id="di-adua" class="finp" onclick="this.select()" style="width:100%;text-transform:uppercase"></div>
    </div>
    <div style="max-height:320px;overflow:auto;border:1px solid var(--b1);border-radius:6px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="position:sticky;top:0;background:var(--bg2,#1a1a2e)">
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--b1)">Casio</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--b1)">ART_Cod</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--b1)">Descripción</th>
          <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--b1)">Cant</th>
          <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--b1)">FOB unit.</th>
          <th style="text-align:right;padding:6px 8px;border-bottom:1px solid var(--b1)">Importe</th>
        </tr></thead>
        <tbody>
          ${items.map((it,i)=>`<tr style="${i%2?'background:rgba(128,128,128,.06)':''}">
            <td style="padding:5px 8px;font-family:var(--mono)">${esc(it.codcasio)}</td>
            <td style="padding:5px 8px;font-family:var(--mono);color:var(--acc)">${esc(it.art)}</td>
            <td style="padding:5px 8px">${esc(it.desc||'')}</td>
            <td style="padding:5px 8px;text-align:right">${it.cant}</td>
            <td style="padding:5px 8px;text-align:right">${fmtN(it.fob,2)}</td>
            <td style="padding:5px 8px;text-align:right">${fmtN(it.importe,2)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr style="font-weight:700;border-top:2px solid var(--b1)">
          <td colspan="3" style="padding:8px;text-align:right">TOTALES:</td>
          <td style="padding:8px;text-align:right">${totUnid}</td>
          <td></td>
          <td style="padding:8px;text-align:right">${fmtN(totMonto,2)}</td>
        </tr></tfoot>
      </table>
    </div>
    <div style="font-size:12px;color:var(--t2);margin-top:8px">${items.length} artículos · ${totUnid} unidades · monto ${fmtN(totMonto,2)}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
      <button class="btn" onclick="document.getElementById('ov-desp-imp').classList.remove('open')" style="padding:8px 18px">Cancelar</button>
      <button class="btn pri" id="di-confirmar" onclick="despImportConfirmar()" style="padding:8px 24px">✓ Confirmar e importar</button>
    </div>
  </div>`;
  ov.classList.add('open');
}

async function despImportConfirmar(){
  const items=window._despImport||[];
  if(!items.length){ toast('No hay ítems para importar','err'); return; }
  const desp=document.getElementById('di-desp').value.trim().toUpperCase();
  const fec =document.getElementById('di-fec').value;
  const mone=document.getElementById('di-mone').value;
  const proc=document.getElementById('di-proc').value.trim().toUpperCase();
  const adua=document.getElementById('di-adua').value.trim().toUpperCase();
  if(!desp){ toast('Ingresá el N° de despacho','err'); return; }
  if(!fec){  toast('Ingresá la fecha','err'); return; }
  const btn=document.getElementById('di-confirmar');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Importando…'; }
  syncSaving();
  try {
    const res=await apiPost('/despachos/importar',{
      desp, fec, mone, proc, adua,
      items: items.map(it=>({ art:it.art, ent:it.cant, fob:it.fob }))
    });
    if(!res.ok){ syncErr(); toast(res.error||'Error al importar','err'); if(btn){btn.disabled=false;btn.textContent='✓ Confirmar e importar';} return; }
    (res.stock||[]).forEach(s=>aplicarStockMemoria(s));
    (res.guardadas||[]).forEach(d=>DESPS.push(d));
    syncOk();
    document.getElementById('ov-desp-imp').classList.remove('open');
    despSelIdx=null;
    renderDesp();
    const nErr=(res.errores||[]).length;
    if(nErr) toast(`Importados ${res.guardadas.length}. ${nErr} con problema: ${res.errores.slice(0,3).join('; ')}`,'err');
    else toast(`✓ ${res.guardadas.length} artículos importados en ${desp}`,'scs');
  } catch(e){ console.error(e); syncErr(); toast('Error: '+e.message,'err'); if(btn){btn.disabled=false;btn.textContent='✓ Confirmar e importar';} }
}

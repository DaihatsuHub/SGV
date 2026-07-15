// ═══════════════════════════════════════════════════════════
// ARTÍCULOS — Listado, filtros, ABM
// ═══════════════════════════════════════════════════════════

let artSoloStock = false;
let artSoloFact = false;

// Colores para diferenciar Stock vs Depósito en grilla
const STK_BG  = 'background:rgba(30,58,110,0.12)';   // azul — Stock
const DEP_BG  = 'background:rgba(26,58,42,0.12)';    // verde — Depósito
const SEP_STY = 'width:4px;background:rgba(74,127,193,0.4);padding:0;flex-shrink:0'; // separador

function filtArts(){
  const q = document.getElementById('art-q').value.toLowerCase();
  let list = ARTS.filter(a => {
    const mq = !q || a.ART_COD.toLowerCase().includes(q) || a.ART_DES.toLowerCase().includes(q);
    const ms = !artSoloStock || ((a.ART_STK||0) + (a.ART_STKT||0)) !== 0;
    const mf = !artSoloFact  || ((a.ART_DEPH||0) + (a.ART_DEPT||0)) !== 0;
    return mq && ms && mf;
  });
  const s = SORT_STATE['art'];
  if (s && s.col) {
    list = list.slice().sort((a,b) => {
      const va=a[s.col]||'', vb=b[s.col]||'';
      const r = typeof va==='number' ? va-vb : String(va).localeCompare(String(vb));
      return s.asc ? r : -r;
    });
  } else {
    list = list.slice().sort((a,b) => (a.ART_COD||'').localeCompare(b.ART_COD||''));
  }
  return list;
}

function renderArts(){
  if (typeof _artsLoaded !== 'undefined' && !_artsLoaded) { ensureArts().then(renderArts); return; }
  const list = filtArts();
  const body = document.getElementById('art-body');
  const cols  = getActiveCols('art');
  const gridTpl = cols.map(c => c.width||'1fr').join(' ');

  const thArt = document.querySelector('.th-art');
  if (thArt) {
    thArt.style.gridTemplateColumns = gridTpl;
    thArt.innerHTML = cols.map(c => {
      let bg = '';
      if (c.field==='ART_STK'||c.field==='ART_STKT')  bg = 'background:#1e3a6e;color:#93b4d8;';
      if (c.field==='ART_DEPH'||c.field==='ART_DEPT')  bg = 'background:#1a3a2a;color:#6ab98a;';
      return `<span class="th-sortable" onclick="toggleSort('art','${c.field}')" style="${bg}${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('art',c.field)}</span>`;
    }).join('');
  }

  if (!list.length) {
    body.innerHTML = '<div class="empty">🔍 Sin resultados</div>';
    const bArt = document.getElementById('b-art'); if(bArt) bArt.textContent = ARTS.length + ' artículos';
    return;
  }

  body.innerHTML = list.map(a => {
    const idx = ARTS.indexOf(a);
    const sel = artSelIdx===idx ? 'sel' : '';
    const sH  = a.ART_STK||0,  sT  = a.ART_STKT||0;
    const sDH = a.ART_DEPH||0, sDT = a.ART_DEPT||0;
    return `<div class="tr-art ${sel}" style="grid-template-columns:${gridTpl}" onclick="selArt(${idx})" ondblclick="artDetail(${idx})">` +
      cols.map(c => {
        if(c.field==='ART_COD')   return `<span class="col-cod">${esc(a.ART_COD)}</span>`;
        if(c.field==='ART_DES')   return `<span class="col-des">${esc(a.ART_DES)}</span>`;
        if(c.field==='ART_RUB')   return `<span style="font-family:var(--mono);font-size:12px;color:var(--t2)">${esc(a.ART_RUB||'')}</span>`;
        if(c.field==='ART_SRUB')  return `<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">${esc(a.ART_SRUB||'')}</span>`;
        if(c.field==='ART_PRE')   { const mone=(TABLAS['MONE']||[]).find(m=>m.CODIGO===a.ART_MONEDA); const signo=mone?mone.STRING1:'$'; const iva=a.ART_IVA!==undefined&&a.ART_IVA!==null?` <span style="font-size:10px;color:var(--t3);font-family:var(--mono)">${a.ART_IVA}%</span>`:''; return `<span class="col-num" style="color:var(--grn)">${signo} ${fmt(a.ART_PRE)}${iva}</span>`; }
        if(c.field==='ART_STK')   return `<span class="col-num" style="${STK_BG}">${sH===0?'—':sH}</span>`;
        if(c.field==='ART_STKT')  return `<span class="col-num" style="${STK_BG}">${sT===0?'—':sT}</span>`;
        if(c.field==='ART_DEPH')  return `<span class="col-num" style="${DEP_BG};border-left:3px solid rgba(74,127,193,0.5)">${sDH===0?'—':sDH}</span>`;
        if(c.field==='ART_DEPT')  return `<span class="col-num" style="${DEP_BG}">${sDT===0?'—':sDT}</span>`;
        if(c.field==='ART_ESTU')  return `<span class="col-ctr"><span class="pill ${a.ART_ESTU==='S'?'pi':'pn'}">${a.ART_ESTU||'—'}</span></span>`;
        if(c.field==='ART_ACT')   return `<span class="col-ctr"><span class="pill ${a.ART_ACT==='S'?'ps':'pn'}">${a.ART_ACT||'N'}</span></span>`;
        if(c.field==='ART_GRUP')  return `<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">${esc((a.ART_GRUP||'')+(a.ART_SEX?'-'+a.ART_SEX:''))}</span>`;
        if(c.field==='ART_SEX')   return `<span class="col-sm">${esc(a.ART_SEX||'')}</span>`;
        if(c.field==='ART_MARCA') return `<span class="col-sm">${esc(a.ART_MARCA||'')}</span>`;
        if(c.field==='ART_PROV')  return `<span class="col-sm">${esc(a.ART_PROV||'')}</span>`;
        if(c.field==='CODCASIO')  return `<span class="col-sm">${esc(a.CODCASIO||'')}</span>`;
        return `<span>${esc(String(a[c.field]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');
  const bArt = document.getElementById('b-art'); if(bArt) bArt.textContent = ARTS.length + ' artículos';
}

// ── IVA: opción "Otro…" muestra un campo al lado para tipear el % ──
function afIvaChange(){
  const sel=document.getElementById('af-iva');
  const inp=document.getElementById('af-iva-otro');
  if(!sel||!inp) return;
  if(sel.value==='__otro'){ inp.style.display=''; inp.focus(); inp.select(); }
  else { inp.style.display='none'; }
}
function afIvaVal(){
  const sel=document.getElementById('af-iva');
  if(sel && sel.value==='__otro'){
    return parseFloat((document.getElementById('af-iva-otro')?.value||'').replace(',','.'))||0;
  }
  return parseFloat(sel?.value||21)||21;
}

function togArtStock() {
  artSoloStock = !artSoloStock;
  const btn = document.getElementById('af-stock');
  btn.classList.toggle('on', artSoloStock);
  btn.textContent = artSoloStock ? '📦 Todos' : '📦 Con Stock';
  renderArts();
}
function togArtFact() {
  artSoloFact = !artSoloFact;
  const btn = document.getElementById('af-fact');
  btn.classList.toggle('on', artSoloFact);
  btn.textContent = artSoloFact ? '🧾 Todos' : '🧾 Con Stock p/Facturar';
  renderArts();
}

function selArt(i) {
  document.querySelector('#art-body .tr-art.sel')?.classList.remove('sel');
  artSelIdx = i;
  const list = filtArts();
  const pos = list.findIndex(a => ARTS.indexOf(a) === i);
  const rows = document.querySelectorAll('#art-body .tr-art');
  if(rows[pos]) {
    rows[pos].classList.add('sel');
    document.activeElement?.blur();
  }
}

function artDetail(idx){
  const a = ARTS[idx];
  document.getElementById('art-dp-tit').textContent = a.ART_COD + ' — ' + a.ART_DES;
  const sH=a.ART_STK||0, sT=a.ART_STKT||0, sDH=a.ART_DEPH||0, sDT=a.ART_DEPT||0;
  document.getElementById('art-dp-body').innerHTML = [
    ['Código',a.ART_COD],['Rubro',a.ART_RUB||'—'],['Sub-Rubro',a.ART_SRUB||'—'],
    ['Marca',a.ART_MARCA||'—'],['Proveedor',a.ART_PROV||'—'],
    ['Centro de Costos',a.ART_CCOS||'—'],
    ['Precio','$'+fmt(a.ART_PRE)+' (IVA '+(a.ART_IVA!==null&&a.ART_IVA!==undefined?a.ART_IVA:21)+'%)'],
    ['Stock Hatsu',  sH===0?'—':sH],
    ['Stock Tressa', sT===0?'—':sT],
    ['Depósito Hatsu', sDH===0?'—':sDH],
    ['Depósito Tressa',sDT===0?'—':sDT],
    ['Grupo',a.ART_GRUP||'—'],['Sexo',a.ART_SEX||'—'],['Estuche',a.ART_ESTU||'—'],
    ['Activo',a.ART_ACT==='S'?'Sí':'No'],['Cód.Casio',a.CODCASIO||'—'],
  ].map(([l,v])=>`<div class="dpi"><span class="dpi-lbl">${l}</span><span class="dpi-val">${esc(String(v))}</span></div>`).join('');
  document.getElementById('art-dp').classList.add('open');
}

function aAlta(){
  clrArtForm();
  document.getElementById('af-cod').disabled = false;
  document.getElementById('art-mtit').textContent = 'Nuevo Artículo';
  setMtag('art-mtag','ALTA','tag-a');
  document.getElementById('ov-art').classList.add('open');
  window._ae = 'A';
}
function aModif(){
  if(artSelIdx===null){ toast('Seleccioná un artículo','err'); return; }
  fillArtForm(ARTS[artSelIdx]);
  document.getElementById('af-cod').disabled = true;
  document.getElementById('art-mtit').textContent = 'Modificar: ' + ARTS[artSelIdx].ART_COD;
  setMtag('art-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-art').classList.add('open');
  window._ae = 'M';
  window._artVerEdit = ARTS[artSelIdx].ART_UPDATED || null;   // versión que estoy editando
}
function aBaja(){
  if(artSelIdx===null){ toast('Seleccioná un artículo','err'); return; }
  const a = ARTS[artSelIdx];
  confirm2('¿Dar de baja "'+a.ART_COD+'"?','"'+a.ART_DES+'" será eliminado.',()=>{
    const cod = a.ART_COD;
    ARTS.splice(artSelIdx,1); artSelIdx=null; deleteArt(cod); renderArts(); toast('Artículo eliminado','scs');
  });
}
function aDuplicar(){
  if(artSelIdx===null){ toast('Seleccioná un artículo a duplicar','err'); return; }
  const orig = ARTS[artSelIdx];
  fillArtForm(orig);                                   // trae TODOS los datos del artículo
  document.getElementById('af-cod').value = '';        // menos el código
  document.getElementById('af-cod').disabled = false;
  const cc = document.getElementById('af-codcasio'); if(cc) cc.value='';  // y el Cód.Casio (debe ser único)
  ['af-stk','af-stkt','af-deph','af-dept'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=0; }); // stocks en 0
  document.getElementById('art-mtit').textContent = 'Duplicar de: ' + orig.ART_COD;
  setMtag('art-mtag','DUPLICAR','tag-a');
  document.getElementById('ov-art').classList.add('open');
  window._ae = 'A';                                    // modo alta → valida código y da de alta
  const codEl=document.getElementById('af-cod'); if(codEl) codEl.focus();
}

function fillArtSelects(selMarc, selRub, selSrub, selProv, selMone='P', selCcos='') {
  const opts = (tab, sel) => '<option value="">— Sin —</option>' +
    (TABLAS[tab]||[]).map(r=>`<option value="${r.CODIGO}"${r.CODIGO===sel?' selected':''}>${r.CODIGO} — ${r.DETALLE}</option>`).join('');
  document.getElementById('af-marc').innerHTML = opts('MARC', selMarc);
  document.getElementById('af-rub').innerHTML  = opts('RUBR', selRub);
  document.getElementById('af-srub').innerHTML = opts('SRUB', selSrub);
  document.getElementById('af-prov').innerHTML = opts('PROV', selProv);
  const ccosEl = document.getElementById('af-ccos');
  if (ccosEl) ccosEl.innerHTML = opts('CCOS', selCcos);
  const moneEl = document.getElementById('af-moneda');
  if (moneEl) moneEl.innerHTML = (TABLAS['MONE']||[]).map(m=>`<option value="${m.CODIGO}"${m.CODIGO===selMone?' selected':''}>${m.STRING1} ${m.DETALLE}</option>`).join('');
}

function clrArtForm(){
  ['af-cod','af-des','af-grup','af-sex','af-estu','af-codcasio'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=''; });
  ['af-pre','af-stk','af-stkt','af-deph','af-dept'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=0; });
  const ivaEl=document.getElementById('af-iva'); if(ivaEl) ivaEl.value='21';
  const ivaInp=document.getElementById('af-iva-otro'); if(ivaInp){ ivaInp.value=''; ivaInp.style.display='none'; }
  const act = document.getElementById('af-act'); if(act) act.value='S';
  fillArtSelects('','','','','P');
  const tog = document.getElementById('atog-act'); if(tog) tog.classList.add('on');
}

function fillArtForm(a){
  document.getElementById('af-cod').value     = a.ART_COD||'';
  document.getElementById('af-des').value     = a.ART_DES||'';
  document.getElementById('af-pre').value     = a.ART_PRE||0;
  document.getElementById('af-stk').value     = a.ART_STK||0;
  document.getElementById('af-stkt').value    = a.ART_STKT||0;
  document.getElementById('af-deph').value    = a.ART_DEPH||0;
  document.getElementById('af-dept').value    = a.ART_DEPT||0;
  document.getElementById('af-estu').value    = a.ART_ESTU||'';
  document.getElementById('af-grup').value    = a.ART_GRUP||'';
  document.getElementById('af-sex').value     = a.ART_SEX||'';
  const cc = document.getElementById('af-codcasio'); if(cc) cc.value = a.CODCASIO||'';
  const actVal = a.ART_ACT||'S';
  const actInp = document.getElementById('af-act');
  const actTog = document.getElementById('atog-act');
  if(actInp) actInp.value = actVal;
  if(actTog) actTog.classList.toggle('on', actVal==='S');
  fillArtSelects(a.ART_MARCA, a.ART_RUB, a.ART_SRUB, a.ART_PROV, a.ART_MONEDA||'P', a.ART_CCOS||'');
  const ivaEl=document.getElementById('af-iva');
  const ivaInp=document.getElementById('af-iva-otro');
  if(ivaEl){
    const v=(a.ART_IVA!==null&&a.ART_IVA!==undefined)?String(a.ART_IVA):'21';
    const esFija=[...ivaEl.options].some(o=>o.value===v && o.value!=='__otro');
    if(esFija){ ivaEl.value=v; if(ivaInp){ ivaInp.value=''; ivaInp.style.display='none'; } }
    else { ivaEl.value='__otro'; if(ivaInp){ ivaInp.value=v; ivaInp.style.display=''; } }
  }
}

async function saveArt(){
  const cod = document.getElementById('af-cod').value.trim().toUpperCase();
  const des = document.getElementById('af-des').value.trim().toUpperCase();
  if(!cod||!des){ toast('Código y descripción son obligatorios','err'); return; }
  const d = {
    ART_COD:   cod,
    ART_DES:   des,
    ART_RUB:   document.getElementById('af-rub').value,
    ART_SRUB:  document.getElementById('af-srub')?.value||null,
    ART_MARCA: document.getElementById('af-marc').value,
    ART_CCOS:  document.getElementById('af-ccos')?.value||null,
    ART_PRE:   parseFloat(document.getElementById('af-pre').value)||0,
    ART_STK:   parseInt(document.getElementById('af-stk').value)||0,
    ART_STKT:  parseInt(document.getElementById('af-stkt').value)||0,
    ART_DEPH:  parseInt(document.getElementById('af-deph').value)||0,
    ART_DEPT:  parseInt(document.getElementById('af-dept').value)||0,
    ART_ACT:   document.getElementById('af-act').value||'S',
    ART_ESTU:  document.getElementById('af-estu').value,
    ART_GRUP:  document.getElementById('af-grup').value.trim().toUpperCase(),
    ART_SEX:   document.getElementById('af-sex').value.trim().toUpperCase(),
    ART_PROV:  document.getElementById('af-prov').value,
    ART_MONEDA:document.getElementById('af-moneda')?.value||'P',
    ART_IVA:   afIvaVal(),
    CODCASIO:  document.getElementById('af-codcasio')?.value.trim()||null,
  };
  if(window._ae==='A' && ARTS.find(a=>a.ART_COD===cod)){ toast('Código ya existe','err'); return; }
  // El SERVER es la verdad: espero su OK antes de tocar memoria/cerrar.
  let res;
  try {
    res = await sbSaveArt(d, window._ae, window._ae==='M' ? (window._artVerEdit||null) : null);
  } catch(e){
    // Conflicto de edición concurrente u otro rechazo → NO piso memoria ni cierro
    toast(e.message||'No se pudo guardar','err');
    return;
  }
  if(res && res.art_updated) d.ART_UPDATED = res.art_updated;   // guardo la versión nueva
  if(window._ae==='A'){
    ARTS.unshift(d); artSelIdx=0; toast('Artículo dado de alta','scs');
  } else {
    ARTS[artSelIdx]=d; toast('Artículo modificado','scs');
  }
  closeOv('ov-art'); renderArts();
}

function printArt(){
  const list = filtArts();
  const rows = list.map(a=>`<tr>
    <td style="font-family:monospace;color:#4f8ef7">${esc(a.ART_COD)}</td>
    <td>${esc(a.ART_DES||'')}</td>
    <td>${esc(a.ART_RUB||'')}</td>
    <td style="text-align:right">$${fmt(a.ART_PRE)}</td>
    <td style="text-align:right">${a.ART_STK||0}</td>
    <td style="text-align:right">${a.ART_STKT||0}</td>
    <td style="text-align:right">${a.ART_DEPH||0}</td>
    <td style="text-align:right">${a.ART_DEPT||0}</td>
  </tr>`).join('');
  openPrint('📦 Listado de Artículos',`<table><thead><tr>
    <th>CÓDIGO</th><th>DESCRIPCIÓN</th><th>RUBRO</th><th>PRECIO</th>
    <th>STK HAT</th><th>STK TRE</th><th>DEP HAT</th><th>DEP TRE</th>
  </tr></thead><tbody>${rows}</tbody></table>`,list.length);
}

// ── Navegación por teclado ────────────────────────────────
document.addEventListener('keydown', e => {
  // Solo cuando no hay modal abierto ni input activo
  if(document.querySelector('.ov.open')) return;
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)) return;

  const page = document.getElementById('page-art');
  if(!page?.classList.contains('active')) return;

  const list = filtArts();
  if(!list.length) return;
  let idx = artSelIdx;
  const cur = idx !== null ? ARTS.indexOf(list.find((a,i)=>ARTS.indexOf(a)===idx)) : -1;

  let next = cur;
  if(e.key==='ArrowDown')  { e.preventDefault(); next = Math.min(cur+1, list.length-1); }
  if(e.key==='ArrowUp')    { e.preventDefault(); next = Math.max(cur-1, 0); }
  if(e.key==='PageDown')   { e.preventDefault(); next = Math.min(cur+10, list.length-1); }
  if(e.key==='PageUp')     { e.preventDefault(); next = Math.max(cur-10, 0); }
  if(e.key==='Home')       { e.preventDefault(); next = 0; }
  if(e.key==='End')        { e.preventDefault(); next = list.length-1; }
  if(e.key==='Enter')      { e.preventDefault(); if(idx!==null) artDetail(idx); return; }
  if(e.key==='F2')         { e.preventDefault(); aModif(); return; }

  if(next !== cur && next >= 0) {
    const newIdx = ARTS.indexOf(list[next]);
    selArt(newIdx);
    // Scroll al elemento seleccionado
    const rows = document.querySelectorAll('#art-body .tr-art');
    if(rows[next]) rows[next].scrollIntoView({block:'nearest'});
  }
});
function exportArt() {
  const list = filtArts();
  const headers = ['Código','Descripción','Rubro','Sub-Rubro','Marca','Proveedor','Moneda','Precio','IVA%','Stk Hatsu','Stk Tressa','Dep Hatsu','Dep Tressa','Estuche','Activo','Grupo','Cód.Casio'];
  const rows = list.map(a => [
    a.ART_COD, a.ART_DES, a.ART_RUB||'', a.ART_SRUB||'', a.ART_MARCA||'', a.ART_PROV||'',
    a.ART_MONEDA||'P', a.ART_PRE||0, a.ART_IVA||21,
    a.ART_STK||0, a.ART_STKT||0, a.ART_DEPH||0, a.ART_DEPT||0,
    a.ART_ESTU||'', a.ART_ACT||'S', a.ART_GRUP||'', a.CODCASIO||''
  ]);
  exportToXls('Articulos', headers, rows);
}

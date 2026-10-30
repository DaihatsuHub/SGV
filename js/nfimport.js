// ═══════════════════════════════════════════════════════════
// FACTURACIÓN · IMPORTAR ARTÍCULOS DESDE EXCEL (ventas de Mercado Libre)
// Ricardo, Oct 2026.
//  · El Excel trae SKU (= código de SGV), cantidad y precio FINAL. Si no tiene
//    títulos (o no se reconocen) se pide elegir las columnas.
//  · Las filas con la columna FACTURA llena ya se facturaron: se descartan.
//  · Se agrupa por SKU + precio. El stock se controla POR ARTÍCULO (todas las
//    filas del SKU juntas) contra la empresa que se factura: stock real si el
//    comprobante baja stock, depósito si baja depósito (los dos si baja ambos).
//  · Columnas: HATSU / TRESSA (donde alcanza el stock) / ERROR (no existe o no
//    alcanza). Sólo se factura la columna de la empresa elegida; con errores no
//    se puede confirmar.
//  · Al confirmar se reparten entre los despachos del MÁS VIEJO al más nuevo;
//    si un renglón necesita más de un despacho, se parte.
//  · Al grabar la factura se baja una copia del Excel con la columna FACTURA
//    llena en las filas facturadas (para importar después la otra empresa).
// Prefijo propio `nfi`.
// ═══════════════════════════════════════════════════════════

let _nfi = null;   // { wb, ws, nombre, cols:{sku,can,pre,fac}, hdrRow, filas:[], grupos:[], emp }

function nfiReset(){ _nfi = null; document.getElementById('nfi-modal')?.remove(); }

const _nfiNorm = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase();
const _nfiVal  = c => { const v = c && c.value; if (v && typeof v === 'object') return v.result ?? v.text ?? (v.richText ? v.richText.map(t=>t.text).join('') : ''); return v ?? ''; };
const _nfiNum  = v => { if (typeof v === 'number') return v; let s = String(v||'').trim().replace(/[$\s]/g,''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g,'').replace(',','.'); else s = s.replace(/,/g,''); const n = parseFloat(s); return isNaN(n) ? 0 : n; };
const _nfiArt  = cod => { const c = _nfiNorm(cod); return c ? (ARTS||[]).find(a => _nfiNorm(a.ART_COD) === c) : null; };

function nfiAbrir(){
  const ct = nfCtipActual();
  if (!ct) { toast('Elegí primero la empresa y el tipo de comprobante','err'); return; }
  if (nfEsNC()) { toast('La importación es para facturas, no para notas de crédito','err'); return; }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.xlsx';
  inp.onchange = () => { if (inp.files[0]) nfiLeer(inp.files[0]); };
  inp.click();
}

async function nfiLeer(file){
  try {
    await vmesLoadExcelJS();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) { toast('El Excel no tiene hojas','err'); return; }
    // Fila de títulos: la primera (de las 10 primeras) que tenga "SKU"
    let hdrRow = 0, cols = {};
    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
      const c = {};
      ws.getRow(r).eachCell({ includeEmpty:false }, (cell, n) => {
        const t = _nfiNorm(_nfiVal(cell));
        if (t === 'SKU') c.sku = n;
        else if (/^(CANT|CANTIDAD|UNIDADES|CANT\.)$/.test(t)) c.can = n;
        else if (/^(PRECIO|UNITARIO|P\.? ?UNIT)/.test(t)) c.pre = c.pre || n;   // PRECIO o UNITARIO
        else if (t === 'FACTURA') c.fac = n;
      });
      if (c.sku) { hdrRow = r; cols = c; break; }
    }
    // Los precios del Excel están en la MONEDA DE LA FACTURA (pesos, U$T, U$C…)
    _nfi = { wb, ws, nombre:file.name.replace(/\.xlsx$/i,''), cols, hdrRow, emp:document.getElementById('nf-empresa')?.value||'H',
             mon:document.getElementById('nf-moneda')?.value||'P' };
    if (!cols.sku || !cols.can || !cols.pre) nfiElegirColumnas();
    else nfiArmar();
  } catch (e) { console.error('nfiLeer:', e); sgvAviso({ titulo:'No se pudo leer el Excel', texto:e.message, tipo:'err' }); }
}

// Sin títulos (o incompletos): se adivina el SKU por los códigos que existen en
// SGV y se le pide al usuario que confirme las tres columnas
function nfiElegirColumnas(){
  const ws = _nfi.ws, desde = _nfi.hdrRow + 1, hasta = Math.min(ws.rowCount, desde + 30);
  const nCols = ws.columnCount || 1, muestra = {}, aciertos = {};
  for (let n = 1; n <= nCols; n++) {
    muestra[n] = []; aciertos[n] = 0;
    for (let r = desde; r <= hasta; r++) {
      const v = _nfiVal(ws.getRow(r).getCell(n));
      if (muestra[n].length < 3 && String(v).trim()) muestra[n].push(String(v).trim().substring(0,14));
      if (_nfiArt(v)) aciertos[n]++;
    }
  }
  const c = _nfi.cols;
  if (!c.sku) { const best = Object.keys(aciertos).sort((a,b)=>aciertos[b]-aciertos[a])[0]; if (best && aciertos[best]) c.sku = +best; }
  const letra = n => { let s=''; while(n){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; };
  const opts = sel => '<option value="">—</option>' + Array.from({length:nCols}, (_,i)=>i+1).map(n =>
    `<option value="${n}"${n===sel?' selected':''}>Columna ${letra(n)} (${esc(muestra[n].join(' · ')||'vacía')})</option>`).join('');
  document.getElementById('nfi-modal')?.remove();
  const m = document.createElement('div'); m.id = 'nfi-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center';
  m.innerHTML = `<div style="background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:16px;width:min(520px,94vw)">
    <div style="font-weight:700;margin-bottom:6px">📥 ¿Qué columna es cada dato?</div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:12px">No encontré los títulos SKU, CANT y PRECIO (o UNITARIO). Elegí las columnas (al lado van los primeros valores).</div>
    ${[['nfi-c-sku','SKU (código de SGV)',c.sku],['nfi-c-can','Cantidad',c.can],['nfi-c-pre','Precio final',c.pre]].map(([id,l,v])=>
      `<label style="font-size:12px;color:var(--t2)">${l}</label><select id="${id}" class="finp" style="width:100%;margin-bottom:8px">${opts(v)}</select>`).join('')}
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
      <button class="btn" onclick="nfiReset()">Cancelar</button>
      <button class="btn pri" onclick="nfiColumnasOk()">Seguir</button></div></div>`;
  document.body.appendChild(m);
}
function nfiColumnasOk(){
  const g = id => parseInt(document.getElementById(id)?.value) || 0;
  const c = _nfi.cols; c.sku = g('nfi-c-sku'); c.can = g('nfi-c-can'); c.pre = g('nfi-c-pre');
  if (!c.sku || !c.can || !c.pre) { toast('Elegí las tres columnas','err'); return; }
  if (new Set([c.sku,c.can,c.pre]).size < 3) { toast('Las tres columnas tienen que ser distintas','err'); return; }
  nfiArmar();
}

// Disponible del artículo en una empresa según lo que mueve el comprobante
function _nfiDispArt(a, emp, ct){
  const ms = !!ct.tab_stk, pf = !!ct.tab_fact;
  const real = emp === 'T' ? (a.ART_STKT||0) : (a.ART_STK||0);
  const depo = emp === 'T' ? (a.ART_DEPT||0) : (a.ART_DEPH||0);
  if (ms && pf) return Math.min(real, depo);
  if (pf) return depo;
  if (ms) return real;
  return Infinity;                          // el comprobante no controla stock
}

function nfiArmar(){
  const { ws, cols, hdrRow } = _nfi;
  const ct = nfCtipActual(), emp = _nfi.emp, otra = emp === 'T' ? 'H' : 'T';
  const filas = [];
  let yaFact = 0;
  for (let r = hdrRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const sku = String(_nfiVal(row.getCell(cols.sku))).trim();
    if (!sku) continue;
    if (cols.fac && String(_nfiVal(row.getCell(cols.fac))).trim()) { yaFact++; continue; }   // ya facturada
    const can = _nfiNum(_nfiVal(row.getCell(cols.can))), pre = Math.round(_nfiNum(_nfiVal(row.getCell(cols.pre)))*100)/100;
    if (!can) continue;
    filas.push({ r, sku, can, pre });
  }
  // Por artículo: total pedido, y en qué columna cae
  const porArt = {};
  filas.forEach(f => { const k = _nfiNorm(f.sku); porArt[k] = (porArt[k]||0) + f.can; });
  const cargados = new Set((FAC_ITEMS_NUEVA||[]).map(it => _nfiNorm(it.ite_art)));
  const destino = {};
  Object.keys(porArt).forEach(k => {
    const a = _nfiArt(k), tot = porArt[k];
    if (!a) destino[k] = { col:'E', motivo:'No existe en el maestro' };
    // Factura en otra moneda: sólo artículos de esa misma moneda (igual que por grupo)
    else if (_nfi.mon !== 'P' && (a.ART_MONEDA||'P') !== _nfi.mon) destino[k] = { col:'E', motivo:`El artículo es en ${a.ART_MONEDA||'P'}, la factura en ${_nfi.mon}` };
    else if (cargados.has(k)) destino[k] = { col:'E', motivo:'Ya está cargado en la factura' };
    else if (_nfiDispArt(a, emp, ct) >= tot) destino[k] = { col:emp };
    else if (_nfiDispArt(a, otra, ct) >= tot) destino[k] = { col:otra, motivo:`No alcanza el stock de ${emp==='T'?'Tressa':'Hatsu'}` };
    else destino[k] = { col:'E', motivo:`No alcanza el stock (pide ${tot}; ${emp==='T'?'Tressa':'Hatsu'} ${_nfiDispArt(a,emp,ct)}, ${otra==='T'?'Tressa':'Hatsu'} ${_nfiDispArt(a,otra,ct)})` };
  });
  // Grupos SKU + precio
  const g = {};
  filas.forEach(f => {
    const k = _nfiNorm(f.sku) + '|' + f.pre;
    if (!g[k]) { const a = _nfiArt(f.sku); g[k] = { art:k.split('|')[0], cod:a ? (a.ART_COD||'').trim() : f.sku, des:a ? (a.ART_DES||'') : '', pre:f.pre, can:0, rows:[] }; }
    g[k].can += f.can; g[k].rows.push(f.r);
  });
  _nfi.grupos = Object.values(g).map(x => ({ ...x, ...destino[x.art] })).sort((a,b) => a.cod.localeCompare(b.cod) || a.pre - b.pre);
  _nfi.yaFact = yaFact;
  nfiMostrar();
}

function nfiMostrar(){
  const emp = _nfi.emp, G = _nfi.grupos;
  const fmt = v => (Number(v)||0).toLocaleString('es-AR', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const tot = { H:0, T:0, E:0, imp:0, uni:0 };
  G.forEach(x => { tot[x.col] += x.can; tot.uni += x.can; if (x.col === emp) tot.imp += x.can * x.pre; });
  const grid = '120px minmax(0,1fr) 100px 70px 70px 70px';
  const celda = (x, c) => x.col === c ? `<b>${x.can}</b>` : '';
  document.getElementById('nfi-modal')?.remove();
  const m = document.createElement('div'); m.id = 'nfi-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center';
  m.innerHTML = `<div style="background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:14px;width:min(920px,96vw);max-height:90vh;display:flex;flex-direction:column">
    <div style="font-weight:700;margin-bottom:4px">📥 Importar · ${esc(_nfi.nombre)} · facturando <span style="color:var(--acc)">${emp==='T'?'TRESSA':'HATSU'}</span></div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:8px">Precios en ${esc((TABLAS['MONE']||[]).find(m=>m.CODIGO===_nfi.mon)?.STRING1||_nfi.mon)}. Se factura sólo la columna ${emp==='T'?'TRESSA':'HATSU'}.${_nfi.yaFact?` ${_nfi.yaFact} fila(s) ya facturadas se descartaron.`:''}</div>
    <div style="display:grid;grid-template-columns:${grid};gap:6px;padding:5px 8px;background:var(--s2);font-size:11px;font-weight:600;color:var(--t2)">
      <span>Código</span><span>Descripción</span><span style="text-align:right">Precio</span>
      <span style="text-align:right">Hatsu</span><span style="text-align:right">Tressa</span><span style="text-align:right;color:var(--red)">Error</span></div>
    <div style="overflow:auto;flex:1;min-height:120px">${G.map(x => `
      <div style="display:grid;grid-template-columns:${grid};gap:6px;padding:3px 8px;border-bottom:1px solid var(--b1);font-size:12px;${x.col==='E'?'background:rgba(220,38,38,.08)':''}" title="${esc(x.motivo||'')}">
        <span style="font-family:var(--mono);color:var(--acc)">${esc(x.cod)}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.des)}${x.motivo?` <span style="color:${x.col==='E'?'var(--red)':'var(--t3)'};font-size:11px">· ${esc(x.motivo)}</span>`:''}</span>
        <span style="text-align:right;font-family:var(--mono)">${fmt(x.pre)}</span>
        <span style="text-align:right;font-family:var(--mono)">${celda(x,'H')}</span>
        <span style="text-align:right;font-family:var(--mono)">${celda(x,'T')}</span>
        <span style="text-align:right;font-family:var(--mono);color:var(--red)">${celda(x,'E')}</span></div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:${grid};gap:6px;padding:6px 8px;border-top:2px solid var(--b1);font-size:12px;font-weight:700">
      <span>Totales</span><span>${tot.uni} unidades · a facturar $ ${fmt(tot.imp)}</span><span></span>
      <span style="text-align:right">${tot.H}</span><span style="text-align:right">${tot.T}</span><span style="text-align:right;color:var(--red)">${tot.E}</span></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;align-items:center">
      ${tot.E?`<span style="font-size:12px;color:var(--red);margin-right:auto">Hay ${tot.E} unidad(es) con error: corregí el Excel o el stock y volvé a importar.</span>`:''}
      <button class="btn" onclick="nfiReset()">Cancelar</button>
      ${tot.E || !tot[emp] ? '' : '<button class="btn pri" onclick="nfiConfirmar()">✔ Confirmar</button>'}</div></div>`;   // con errores no se muestra
  document.body.appendChild(m);
}

// Agrega los renglones de la empresa elegida, repartiendo entre despachos (FIFO)
async function nfiConfirmar(){
  const emp = _nfi.emp, G = _nfi.grupos.filter(x => x.col === emp);
  if (!G.length) return;
  const btn = document.querySelector('#nfi-modal .btn.pri'); if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando despachos…'; }
  const ct = nfCtipActual(), ms = !!ct.tab_stk, pf = !!ct.tab_fact;
  const dispDesp = d => { const s = (d.dep_stk!=null) ? d.dep_stk : ((d.dep_ent||0)-(d.dep_sal||0)); const c = (d.dep_costk!=null) ? d.dep_costk : s;
    return ms && pf ? Math.min(s, c) : (pf ? c : s); };
  const cods = [...new Set(G.map(x => x.cod))];
  const desps = {};
  try {
    for (let i = 0; i < cods.length; i += 200) {
      const lista = cods.slice(i, i+200).map(c => '"' + String(c).replace(/"/g,'') + '"').join(',');
      const rows = await sbGet('despachos', `dep_art=in.(${encodeURIComponent(lista)})&order=dep_fec.asc`);
      (rows||[]).forEach(d => (desps[_nfiNorm(d.dep_art)] = desps[_nfiNorm(d.dep_art)] || []).push({ ...d, _libre: dispDesp(d) }));
    }
  } catch (e) { if (btn) { btn.disabled = false; btn.textContent = '✔ Confirmar'; } sgvAviso({ titulo:'No se pudieron traer los despachos', texto:e.message, tipo:'err' }); return; }

  const esA = nfEsFacturaA(), nuevos = [], faltan = [];
  for (const x of G) {
    const a = _nfiArt(x.cod);
    const ds = (desps[x.art] || []).filter(d => d._libre > 0);
    let resta = x.can;
    const iva = (a.ART_IVA!==null && a.ART_IVA!==undefined) ? Number(a.ART_IVA) : 21;
    const renglon = (d, can) => {
      const div = 1 + iva/100, neto = esA ? x.pre/div : x.pre;
      const dStk = d ? ((d.dep_stk!=null) ? d.dep_stk : ((d.dep_ent||0)-(d.dep_sal||0))) : null;
      return { ite_art:(a.ART_COD||'').trim(), ite_desp_art:a.ART_DES||'',
        ite_desp_nro: d ? d.dep_desp + (d.dep_sub||'') : '', ite_desp_fec: d ? (d.dep_fec||'') : '', ite_can:can,
        ite_uni:x.pre, ite_preori:x.pre, ite_moneda:_nfi.mon, ite_cotiz:1, ite_iva_porc:iva,
        ite_imp:Math.round(neto*can*100)/100, ite_iva_imp: esA ? Math.round((x.pre-neto)*can*100)/100 : 0,
        _artReal: emp==='T' ? (a.ART_STKT||0) : (a.ART_STK||0), _artPfac: emp==='T' ? (a.ART_DEPT||0) : (a.ART_DEPH||0),
        _depStk:dStk, _depCostk: d ? ((d.dep_costk!=null) ? d.dep_costk : dStk) : null,
        _desps: (desps[x.art]||[]).slice().reverse(), _desp_id: d ? d.dep_id : null, ite_disp: d ? dispDesp(d) : null };
    };
    if (!ms && !pf) { nuevos.push(renglon(ds[0] || (desps[x.art]||[])[0] || null, resta)); continue; }
    for (const d of ds) {
      if (resta <= 0) break;
      const usa = Math.min(resta, d._libre);
      d._libre -= usa; resta -= usa;
      nuevos.push(renglon(d, usa));
    }
    if (resta > 0) faltan.push(`${x.cod}: faltan ${resta} en los despachos`);
  }
  if (faltan.length) {
    if (btn) { btn.disabled = false; btn.textContent = '✔ Confirmar'; }
    sgvAviso({ titulo:'Los despachos no alcanzan', texto:'El stock del artículo alcanza pero el de sus despachos no:\n\n' + faltan.join('\n'), tipo:'err' });
    return;
  }
  FAC_ITEMS_NUEVA.push(...nuevos);
  _nfi.filasFacturadas = G.flatMap(x => x.rows);
  document.getElementById('nfi-modal')?.remove();
  nfRenderItems(); nfCalcTotales();
  toast(`${nuevos.length} renglón(es) importados`,'scs');
}

// Después de grabar la factura: copia del Excel con la columna FACTURA llena
async function nfiTrasGrabar(facNro){
  if (!_nfi || !_nfi.filasFacturadas || !_nfi.filasFacturadas.length) { _nfi = null; return; }
  try {
    const { wb, ws, cols } = _nfi;
    if (!_nfi.hdrRow) {                                  // sin títulos: se agrega la fila de títulos
      ws.spliceRows(1, 0, []);
      _nfi.filasFacturadas = _nfi.filasFacturadas.map(r => r + 1);
      const h = ws.getRow(1);
      h.getCell(cols.sku).value = 'SKU'; h.getCell(cols.can).value = 'CANT'; h.getCell(cols.pre).value = 'PRECIO';
      _nfi.hdrRow = 1;
    }
    if (!cols.fac) { cols.fac = (ws.columnCount || 0) + 1; ws.getRow(_nfi.hdrRow).getCell(cols.fac).value = 'FACTURA'; }
    _nfi.filasFacturadas.forEach(r => { ws.getRow(r).getCell(cols.fac).value = facNro; });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${_nfi.nombre}_${String(facNro).trim().replace(/\s+/g,'')}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Se bajó el Excel con la columna FACTURA (carpeta Descargas)','scs');
  } catch (e) { console.error('nfiTrasGrabar:', e); toast('La factura se grabó, pero no se pudo generar el Excel marcado: ' + e.message, 'err'); }
  _nfi = null;
}

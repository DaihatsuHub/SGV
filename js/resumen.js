// ══════════════════════════════════════════════════════════
//  RESUMEN DE STOCK VALORIZADO
//  Jerarquía: Centro de Costos → Rubro → Marca → (artículos)
//  Salidas: pantalla (árbol colapsable), impresión y Excel (.xlsx nativo)
// ══════════════════════════════════════════════════════════

let _resRows = null;         // filas planas del server
const _resOpen = {};         // estado de colapso por clave de nodo (true = abierto)

// ── Helpers de formato ────────────────────────────────────
function _resFmtN(n)  { return (Math.round(n)||0).toLocaleString('es-AR'); }
function _resFmtN2(n) { return (Math.round((n||0)*100)/100).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// ── Abrir el reporte ──────────────────────────────────────
async function abrirResumen(){
  const ov = document.getElementById('ov-resumen');
  if(!ov) return;
  ov.classList.add('open');
  const body = document.getElementById('res-body');
  body.innerHTML = '<div class="empty" style="margin-top:40px">⏳ Cargando resumen…</div>';
  try{
    const r = await apiGet('/articulos/resumen-stock');
    _resRows = (r && r.rows) ? r.rows : [];
    renderResumen();
  }catch(e){
    console.error('resumen:', e);
    body.innerHTML = '<div class="empty" style="margin-top:40px">⚠️ Error al cargar el resumen</div>';
  }
}
function cerrarResumen(){
  const ov = document.getElementById('ov-resumen');
  if(ov) ov.classList.remove('open');
}

// ── Armar el árbol agrupado ───────────────────────────────
// Devuelve: [{ key, ccos, totU, totT, rubros:[{ key, rubro, totU, totT, marcas:[{ key, marca, totU, totT, arts:[fila] }] }] }]
function _resBuildTree(rows){
  const byC = {};
  for(const f of rows){
    const c = f.ccos||'(sin centro)';
    const ru= f.rubro||'(sin rubro)';
    const ma= f.marca||'(sin marca)';
    byC[c] = byC[c] || { key:'c|'+c, ccos:c, totU:0, totT:0, _r:{} };
    const nc = byC[c];
    nc._r[ru] = nc._r[ru] || { key:'c|'+c+'|r|'+ru, rubro:ru, totU:0, totT:0, _m:{} };
    const nr = nc._r[ru];
    nr._m[ma] = nr._m[ma] || { key:'c|'+c+'|r|'+ru+'|m|'+ma, marca:ma, totU:0, totT:0, arts:[] };
    const nm = nr._m[ma];
    nm.arts.push(f);
    nm.totU += f.unid||0;  nm.totT += f.total||0;
    nr.totU += f.unid||0;  nr.totT += f.total||0;
    nc.totU += f.unid||0;  nc.totT += f.total||0;
  }
  // ordenar y aplanar los diccionarios a arrays
  const cs = Object.values(byC).sort((a,b)=>a.ccos.localeCompare(b.ccos));
  for(const c of cs){
    c.rubros = Object.values(c._r).sort((a,b)=>a.rubro.localeCompare(b.rubro));
    for(const r of c.rubros){
      r.marcas = Object.values(r._m).sort((a,b)=>a.marca.localeCompare(b.marca));
      for(const m of r.marcas) m.arts.sort((a,b)=>(a.art||'').localeCompare(b.art||''));
    }
  }
  return cs;
}

// ── Render del árbol en pantalla ──────────────────────────
function renderResumen(){
  const body = document.getElementById('res-body');
  if(!body) return;
  if(!_resRows || !_resRows.length){
    body.innerHTML = '<div class="empty" style="margin-top:40px">Sin artículos con stock.</div>';
    return;
  }
  const tree = _resBuildTree(_resRows);
  let gU=0, gT=0;
  tree.forEach(c=>{ gU+=c.totU; gT+=c.totT; });

  const row = (lvl, cols, cls, key, hasChild, open) => {
    const pad = 8 + lvl*20;
    const arrow = hasChild ? `<span class="res-arrow" style="cursor:pointer;display:inline-block;width:14px">${open?'▼':'▶'}</span>` : '<span style="display:inline-block;width:14px"></span>';
    const onclick = hasChild ? ` onclick="toggleResNode('${key}')"` : '';
    return `<div class="res-row ${cls}"${onclick} style="display:grid;grid-template-columns:2fr 1.4fr 1.4fr 1fr 1.3fr 2.4fr 0.8fr 1fr 1.1fr;gap:6px;padding:5px 8px 5px ${pad}px;border-bottom:1px solid var(--b1);${hasChild?'cursor:pointer;':''}align-items:center">${cols.map((v,i)=>`<span style="${i>=6?'text-align:right;font-family:var(--mono);':''}${cls==='res-det'?'font-size:12px;color:var(--t2)':''}">${i===0?arrow+' ':''}${v}</span>`).join('')}</div>`;
  };

  let html = '';
  // encabezado de columnas
  html += `<div style="display:grid;grid-template-columns:2fr 1.4fr 1.4fr 1fr 1.3fr 2.4fr 0.8fr 1fr 1.1fr;gap:6px;padding:8px;background:var(--s3);position:sticky;top:0;font-family:var(--mono);font-size:11px;color:var(--t2);text-transform:uppercase;border-bottom:2px solid var(--b1)">
    <span>C.Costo</span><span>Marca</span><span>Rubro</span><span>SubR</span><span>Artículo</span><span>Descripción</span><span style="text-align:right">Unid</span><span style="text-align:right">Costo</span><span style="text-align:right">Total</span></div>`;

  for(const c of tree){
    const cOpen = _resOpen[c.key] !== false;   // por defecto abierto en nivel 1
    html += row(0, [`<b>${c.ccos}</b>`,'','','','','', `<b>${_resFmtN(c.totU)}</b>`, '', `<b>${_resFmtN2(c.totT)}</b>`], 'res-c', c.key, true, cOpen);
    if(!cOpen) continue;
    for(const r of c.rubros){
      const rOpen = _resOpen[r.key] !== false;
      html += row(1, ['', '', `<b>${r.rubro}</b>`,'','','', _resFmtN(r.totU), '', _resFmtN2(r.totT)], 'res-r', r.key, true, rOpen);
      if(!rOpen) continue;
      for(const m of r.marcas){
        const mOpen = _resOpen[m.key] === true;   // marcas cerradas por defecto (detalle oculto)
        html += row(2, ['', m.marca, '','','','', _resFmtN(m.totU), '', _resFmtN2(m.totT)], 'res-m', m.key, true, mOpen);
        if(!mOpen) continue;
        for(const a of m.arts){
          html += row(3, ['', a.marca, a.rubro, a.srub, a.art, a.des, _resFmtN(a.unid), _resFmtN2(a.costo), _resFmtN2(a.total)], 'res-det', a.art, false, false);
        }
      }
    }
  }
  // total general
  html += `<div style="display:grid;grid-template-columns:2fr 1.4fr 1.4fr 1fr 1.3fr 2.4fr 0.8fr 1fr 1.1fr;gap:6px;padding:10px 8px;background:var(--s3);border-top:2px solid var(--acc);font-weight:700">
    <span>TOTAL GENERAL</span><span></span><span></span><span></span><span></span><span></span>
    <span style="text-align:right;font-family:var(--mono)">${_resFmtN(gU)}</span><span></span><span style="text-align:right;font-family:var(--mono)">${_resFmtN2(gT)}</span></div>`;

  body.innerHTML = html;
}

function toggleResNode(key){
  // default abierto para c y r; cerrado para marcas. Invertir respetando el default.
  const isMarca = key.includes('|m|');
  const cur = isMarca ? (_resOpen[key]===true) : (_resOpen[key]!==false);
  _resOpen[key] = !cur;
  renderResumen();
}

function resExpandirTodo(){
  const tree = _resBuildTree(_resRows||[]);
  for(const c of tree){ _resOpen[c.key]=true;
    for(const r of c.rubros){ _resOpen[r.key]=true;
      for(const m of r.marcas){ _resOpen[m.key]=true; } } }
  renderResumen();
}
function resContraerTodo(){
  const tree = _resBuildTree(_resRows||[]);
  for(const c of tree){ _resOpen[c.key]=false;
    for(const r of c.rubros){ _resOpen[r.key]=false;
      for(const m of r.marcas){ _resOpen[m.key]=false; } } }
  renderResumen();
}

// ── Impresión ─────────────────────────────────────────────
function imprimirResumen(){
  if(!_resRows || !_resRows.length){ toast('Nada para imprimir','err'); return; }
  const tree = _resBuildTree(_resRows);
  let gU=0, gT=0; tree.forEach(c=>{ gU+=c.totU; gT+=c.totT; });
  const fecha = new Date().toLocaleDateString('es-AR');
  let rows = '';
  for(const c of tree){
    rows += `<tr class="c"><td colspan="6"><b>${c.ccos}</b></td><td class="n"><b>${_resFmtN(c.totU)}</b></td><td></td><td class="n"><b>${_resFmtN2(c.totT)}</b></td></tr>`;
    for(const r of c.rubros){
      rows += `<tr class="r"><td></td><td></td><td colspan="4"><b>${r.rubro}</b></td><td class="n">${_resFmtN(r.totU)}</td><td></td><td class="n">${_resFmtN2(r.totT)}</td></tr>`;
      for(const m of r.marcas){
        rows += `<tr class="m"><td></td><td colspan="5"><b>${m.marca}</b></td><td class="n">${_resFmtN(m.totU)}</td><td></td><td class="n">${_resFmtN2(m.totT)}</td></tr>`;
        for(const a of m.arts){
          rows += `<tr><td></td><td>${a.marca}</td><td>${a.rubro}</td><td>${a.srub||''}</td><td>${a.art}</td><td>${a.des||''}</td><td class="n">${_resFmtN(a.unid)}</td><td class="n">${_resFmtN2(a.costo)}</td><td class="n">${_resFmtN2(a.total)}</td></tr>`;
        }
      }
    }
  }
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Resumen de Stock Valorizado</title><meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    h2{margin:0 0 2px} .sub{color:#666;font-size:11px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse} td{padding:2px 6px;border-bottom:1px solid #eee}
    .n{text-align:right;font-family:monospace;white-space:nowrap}
    tr.c{background:#e8e8e8} tr.r{background:#f3f3f3} tr.m{background:#fafafa}
    tr.c td{border-top:1px solid #999}
    .tot{font-weight:bold;border-top:2px solid #000}
  </style></head><body>
  <h2>Resumen de Stock Valorizado</h2>
  <div class="sub">Daihatsu Electronics — ${fecha}</div>
  <table>
    <tr style="background:#333;color:#fff"><td>C.Costo</td><td>Marca</td><td>Rubro</td><td>SubR</td><td>Artículo</td><td>Descripción</td><td class="n">Unid</td><td class="n">Costo</td><td class="n">Total</td></tr>
    ${rows}
    <tr class="tot"><td colspan="6">TOTAL GENERAL</td><td class="n">${_resFmtN(gU)}</td><td></td><td class="n">${_resFmtN2(gT)}</td></tr>
  </table>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(), 300);
}

// ── Excel nativo (.xlsx con ExcelJS 4.4.0 desde CDN) ──────
function _resLoadExcelJS(){
  return new Promise((resolve, reject)=>{
    if(window.ExcelJS) return resolve(window.ExcelJS);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload = ()=> resolve(window.ExcelJS);
    s.onerror = ()=> reject(new Error('No se pudo cargar ExcelJS'));
    document.head.appendChild(s);
  });
}

async function excelResumen(){
  if(!_resRows || !_resRows.length){ toast('Nada para exportar','err'); return; }
  let ExcelJS;
  try{ ExcelJS = await _resLoadExcelJS(); }
  catch(e){ toast('No se pudo cargar Excel','err'); return; }

  const tree = _resBuildTree(_resRows);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Resumen');

  // Título
  ws.mergeCells('A1:I1');
  const t = ws.getCell('A1');
  t.value = 'Resumen de Stock Valorizado — ' + new Date().toLocaleDateString('es-AR');
  t.font = { bold:true, size:14 };
  t.alignment = { horizontal:'center' };

  // Encabezado
  const head = ['C.Costo','Marca','Rubro','SubR','Artículo','Descripción','Unid','Costo','Total'];
  const hr = ws.addRow(head);
  hr.font = { bold:true };
  hr.alignment = { horizontal:'center' };
  hr.eachCell(c=>{ c.border = { bottom:{style:'medium'} }; });

  const fmtN = '#,##0';
  const fmtN2 = '#,##0.00';
  const setNums = (r) => {
    r.getCell(7).numFmt = fmtN;
    r.getCell(8).numFmt = fmtN2;
    r.getCell(9).numFmt = fmtN2;
  };

  let gU=0, gT=0;
  for(const c of tree){
    gU+=c.totU; gT+=c.totT;
    // línea negra separadora en cambio de Centro de Costos
    const cr = ws.addRow([c.ccos,'','','','','', c.totU, null, c.totT]);
    cr.font = { bold:true };
    cr.eachCell(cell=>{ cell.border = { top:{style:'medium'} }; });
    setNums(cr);
    for(const r of c.rubros){
      const rr = ws.addRow(['', '', r.rubro,'','','', r.totU, null, r.totT]);
      rr.font = { bold:true, color:{argb:'FF444444'} };
      setNums(rr);
      for(const m of r.marcas){
        const mr = ws.addRow(['', m.marca, '','','','', m.totU, null, m.totT]);
        mr.font = { italic:true };
        setNums(mr);
        for(const a of m.arts){
          const ar = ws.addRow(['', a.marca, a.rubro, a.srub||'', a.art, a.des||'', a.unid, a.costo, a.total]);
          setNums(ar);
        }
      }
    }
  }
  // Total general
  const tr = ws.addRow(['TOTAL GENERAL','','','','','', gU, null, gT]);
  tr.font = { bold:true };
  tr.eachCell(cell=>{ cell.border = { top:{style:'double'} }; });
  setNums(tr);

  // Anchos
  ws.columns = [
    {width:14},{width:16},{width:16},{width:8},{width:14},{width:32},{width:9},{width:11},{width:13}
  ];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Resumen_Stock_' + new Date().toISOString().slice(0,10) + '.xlsx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

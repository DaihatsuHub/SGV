// ═══════════════════════════════════════════════════════════
// LISTADO DE COBRANZAS — recibos de un período con total
// Se arma del lado cliente desde RECIS (recibos ya cargados).
// ═══════════════════════════════════════════════════════════
let _lcobRows = [];

function _lcobFecha(f){
  if(!f) return '';
  const p=String(f).substring(0,10).split('-');           // [yyyy, mm, dd]
  return p.length<3 ? String(f) : (p[2]+'/'+p[1]+'/'+p[0].slice(-2));  // DD/MM/AA
}
function _lcobFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _lcobRecNum(r){ return (r.empresa||'')+(r.talonario||'')+String(r.numero||'').padStart(6,'0'); }
function _lcobCliRazon(cod){
  const c=(typeof CLIS!=='undefined')?CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(cod||'').trim()):null;
  return c ? (c.CLI_RAZON||'') : '';
}
function _lcobCli(cod){
  const rz=_lcobCliRazon(cod);
  return rz ? ((cod||'')+' — '+rz) : (cod||'');
}

async function renderListCob(){
  const body=document.getElementById('lcob-body'); if(!body) return;
  // Asegurar recibos cargados (pueden estar diferidos)
  if(typeof RECIS!=='undefined' && (!RECIS||!RECIS.length) && typeof sbLoadRecis==='function'){
    body.innerHTML='<div class="empty" style="margin-top:40px">Cargando recibos…</div>';
    try{ await sbLoadRecis(); }catch(e){ console.error('listcob/recibos:',e); }
  }
  const desde=document.getElementById('lcob-desde')?.value||'';
  const hasta=document.getElementById('lcob-hasta')?.value||'';
  let list=(RECIS||[]).filter(r=>!r.anulado);
  if(desde) list=list.filter(r=>(r.fecha||'').substring(0,10)>=desde);
  if(hasta) list=list.filter(r=>(r.fecha||'').substring(0,10)<=hasta);
  list=list.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'') || (Number(a.numero)||0)-(Number(b.numero)||0));
  _lcobRows=list;
  const tot=list.reduce((s,r)=>s+(Number(r.total_abonado)||0),0);
  const totEl=document.getElementById('lcob-total'); if(totEl) totEl.textContent='$ '+_lcobFmt(tot);
  const cntEl=document.getElementById('lcob-count'); if(cntEl) cntEl.textContent=list.length;
  if(!list.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Sin recibos en el período</div>'; return; }
  const TPL='display:grid;grid-template-columns:90px 120px 1fr 150px;gap:8px;align-items:center';
  body.innerHTML=list.map(r=>`
    <div style="${TPL};padding:6px 12px;border-bottom:1px solid var(--b1);font-size:13px">
      <span style="color:var(--t2);font-family:var(--mono)">${_lcobFecha(r.fecha)}</span>
      <span style="font-family:var(--mono);color:var(--acc)">${esc(_lcobRecNum(r))}</span>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(_lcobCli(r.cliente))}</span>
      <span style="text-align:right;font-family:var(--mono);font-weight:600">$ ${_lcobFmt(r.total_abonado)}</span>
    </div>`).join('')
    + `<div style="${TPL};padding:9px 12px;border-top:2px solid var(--b1);font-weight:700;font-family:var(--mono)">
        <span></span><span></span><span style="text-align:right">TOTAL (${list.length} recibos)</span>
        <span style="text-align:right">$ ${_lcobFmt(tot)}</span></div>`;
}

// ── Filas resueltas para exportar ──
function _lcobExportRows(){
  return (_lcobRows||[]).map(r=>({
    fecha:_lcobFecha(r.fecha),
    recibo:_lcobRecNum(r),
    codigo:r.cliente||'',
    razon:_lcobCliRazon(r.cliente),
    importe:Number(r.total_abonado)||0
  }));
}

function _lcobLoadExcelJS(){
  return new Promise((resolve,reject)=>{
    if(window.ExcelJS) return resolve(window.ExcelJS);
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=()=>resolve(window.ExcelJS); s.onerror=()=>reject(new Error('ExcelJS'));
    document.head.appendChild(s);
  });
}

async function lcobExcel(){
  const rows=_lcobExportRows();
  if(!rows.length){ toast('Consultá primero un período con recibos','err'); return; }
  let ExcelJS;
  try{ ExcelJS=await _lcobLoadExcelJS(); }catch(e){ toast('No se pudo cargar Excel','err'); return; }
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Cobranzas');
  const desde=document.getElementById('lcob-desde')?.value||'', hasta=document.getElementById('lcob-hasta')?.value||'';
  ws.mergeCells('A1:E1');
  const t=ws.getCell('A1');
  t.value='Listado de Cobranzas'+((desde||hasta)?('  ('+(desde?_lcobFecha(desde):'…')+' a '+(hasta?_lcobFecha(hasta):'…')+')'):'');
  t.font={bold:true,size:14}; t.alignment={horizontal:'center'};
  const hr=ws.addRow(['Fecha','Recibo','Código','Cliente','Importe']);
  hr.font={bold:true}; hr.eachCell(c=>{c.border={bottom:{style:'medium'}};});
  let tot=0;
  for(const r of rows){
    tot+=r.importe;
    const row=ws.addRow([r.fecha,r.recibo,r.codigo,r.razon,r.importe]);
    row.getCell(5).numFmt='#,##0.00';
  }
  const tr=ws.addRow(['','','','TOTAL',tot]);
  tr.font={bold:true}; tr.getCell(5).numFmt='#,##0.00'; tr.eachCell(c=>{c.border={top:{style:'double'}};});
  ws.columns=[{width:11},{width:14},{width:10},{width:34},{width:15}];
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='Cobranzas_'+new Date().toISOString().slice(0,10)+'.xlsx';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}

function lcobPrint(){
  const rows=_lcobExportRows();
  if(!rows.length){ toast('Consultá primero un período con recibos','err'); return; }
  const _e=(typeof esc==='function')?esc:(s=>String(s==null?'':s));
  const desde=document.getElementById('lcob-desde')?.value||'', hasta=document.getElementById('lcob-hasta')?.value||'';
  let tot=0, cuerpo='';
  for(const r of rows){
    tot+=r.importe;
    cuerpo+=`<tr><td>${r.fecha}</td><td>${_e(r.recibo)}</td><td>${_e(r.codigo)}</td><td>${_e(r.razon)}</td><td class="n">${_lcobFmt(r.importe)}</td></tr>`;
  }
  const periodo=(desde||hasta)?(' · '+(desde?_lcobFecha(desde):'…')+' a '+(hasta?_lcobFecha(hasta):'…')):'';
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Listado de Cobranzas</title><meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:18px}
    h2{margin:0 0 2px} .sub{color:#666;font-size:11px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse} td,th{padding:4px 8px;border-bottom:1px solid #eee;text-align:left}
    th{background:#333;color:#fff} .n{text-align:right;font-family:monospace;white-space:nowrap}
    tr.tot td{font-weight:bold;border-top:2px solid #000}
  </style></head><body>
  <h2>Listado de Cobranzas</h2>
  <div class="sub">Daihatsu Electronics — ${new Date().toLocaleDateString('es-AR')}${periodo} · ${rows.length} recibo(s)</div>
  <table>
    <tr><th>Fecha</th><th>Recibo</th><th>Código</th><th>Cliente</th><th class="n">Importe</th></tr>
    ${cuerpo}
    <tr class="tot"><td colspan="4">TOTAL</td><td class="n">${_lcobFmt(tot)}</td></tr>
  </table>
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(()=>win.print(),300);
}

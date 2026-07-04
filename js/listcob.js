// ═══════════════════════════════════════════════════════════
// LISTADO DE COBRANZAS — recibos de un período, con columnas
// por instrumento de pago (Efectivo, Transfer., Cheques,
// Retenc., Ajuste) + Total. Se arma del lado cliente.
// ═══════════════════════════════════════════════════════════
let _lcobRows  = [];
let _lcobPagos = null;   // cache de recibo_pagos
let _lcobCheq  = null;   // cache de cheques

function _lcobFecha(f){
  if(!f) return '';
  const p=String(f).substring(0,10).split('-');           // [yyyy, mm, dd]
  return p.length<3 ? String(f) : (p[2]+'/'+p[1]+'/'+p[0].slice(-2));  // DD/MM/AA
}
function _lcobFmt(n){ n=Number(n)||0; return n? n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}) : ''; }
function _lcobFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _lcobRecNum(r){ return (r.empresa||'')+(r.talonario||'')+String(r.numero||'').padStart(6,'0'); }
function _lcobCliRazon(cod){
  const c=(typeof CLIS!=='undefined')?CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(cod||'').trim()):null;
  return c ? (c.CLI_RAZON||'') : '';
}
function _lcobCli(cod){ const rz=_lcobCliRazon(cod); return rz ? ((cod||'')+' — '+rz) : (cod||''); }

async function _lcobEnsureData(){
  if(typeof RECIS!=='undefined' && (!RECIS||!RECIS.length) && typeof sbLoadRecis==='function'){
    try{ await sbLoadRecis(); }catch(e){ console.error('listcob/recibos:',e); }
  }
  if(!_lcobPagos){ try{ _lcobPagos = await sbGetAll('recibo_pagos','id'); }catch(e){ _lcobPagos=[]; } }
  if(!_lcobCheq){
    if(typeof CHEQUES!=='undefined' && CHEQUES && CHEQUES.length) _lcobCheq = CHEQUES;
    else { try{ _lcobCheq = await sbGetAll('cheques','id'); }catch(e){ _lcobCheq=[]; } }
  }
}

// Suma los instrumentos de un recibo: efectivo/transf/retenc/ajuste (recibo_pagos) + cheques (tabla cheques)
function _lcobInstrumentos(reciboId){
  const r={efectivo:0, transf:0, cheques:0, retenc:0, ajuste:0};
  (_lcobPagos||[]).forEach(p=>{ if(p.recibo_id!==reciboId) return;
    const v=Number(p.importe)||0;
    if(p.tipo==='efectivo') r.efectivo+=v;
    else if(p.tipo==='transferencia') r.transf+=v;
    else if(p.tipo==='retencion') r.retenc+=v;
    else if(p.tipo==='ajuste') r.ajuste+=v;
  });
  (_lcobCheq||[]).forEach(c=>{ if(c.recibo_id===reciboId) r.cheques+=(Number(c.importe)||0); });
  return r;
}

const _LCOB_TPL='display:grid;grid-template-columns:85px 115px minmax(200px,1fr) 105px 105px 105px 100px 95px 120px;gap:6px;align-items:center';

async function renderListCob(){
  const body=document.getElementById('lcob-body'); if(!body) return;
  body.innerHTML='<div class="empty" style="margin-top:40px">Cargando…</div>';
  await _lcobEnsureData();
  const desde=document.getElementById('lcob-desde')?.value||'';
  const hasta=document.getElementById('lcob-hasta')?.value||'';
  let list=(RECIS||[]).filter(r=>!r.anulado);
  if(desde) list=list.filter(r=>(r.fecha||'').substring(0,10)>=desde);
  if(hasta) list=list.filter(r=>(r.fecha||'').substring(0,10)<=hasta);
  list=list.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'') || (Number(a.numero)||0)-(Number(b.numero)||0));
  _lcobRows=list.map(r=>({ rec:r, ins:_lcobInstrumentos(r.id), total:Number(r.total_abonado)||0 }));

  const T={efectivo:0,transf:0,cheques:0,retenc:0,ajuste:0,total:0};
  _lcobRows.forEach(x=>{ T.efectivo+=x.ins.efectivo; T.transf+=x.ins.transf; T.cheques+=x.ins.cheques; T.retenc+=x.ins.retenc; T.ajuste+=x.ins.ajuste; T.total+=x.total; });
  const totEl=document.getElementById('lcob-total'); if(totEl) totEl.textContent='$ '+_lcobFmt0(T.total);
  const cntEl=document.getElementById('lcob-count'); if(cntEl) cntEl.textContent=_lcobRows.length;

  if(!_lcobRows.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Sin recibos en el período</div>'; return; }
  const numCell=v=>`<span style="text-align:right;font-family:var(--mono)">${_lcobFmt(v)}</span>`;
  body.innerHTML=_lcobRows.map(x=>`
    <div style="${_LCOB_TPL};padding:6px 12px;border-bottom:1px solid var(--b1);font-size:13px">
      <span style="color:var(--t2);font-family:var(--mono)">${_lcobFecha(x.rec.fecha)}</span>
      <span style="font-family:var(--mono);color:var(--acc)">${esc(_lcobRecNum(x.rec))}</span>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(_lcobCli(x.rec.cliente))}</span>
      ${numCell(x.ins.efectivo)}${numCell(x.ins.transf)}${numCell(x.ins.cheques)}${numCell(x.ins.retenc)}${numCell(x.ins.ajuste)}
      <span style="text-align:right;font-family:var(--mono);font-weight:700">${_lcobFmt0(x.total)}</span>
    </div>`).join('')
    + `<div style="${_LCOB_TPL};padding:9px 12px;border-top:2px solid var(--b1);font-weight:700;font-family:var(--mono)">
        <span></span><span></span><span style="text-align:right">TOTALES (${_lcobRows.length})</span>
        <span style="text-align:right">${_lcobFmt0(T.efectivo)}</span>
        <span style="text-align:right">${_lcobFmt0(T.transf)}</span>
        <span style="text-align:right">${_lcobFmt0(T.cheques)}</span>
        <span style="text-align:right">${_lcobFmt0(T.retenc)}</span>
        <span style="text-align:right">${_lcobFmt0(T.ajuste)}</span>
        <span style="text-align:right">${_lcobFmt0(T.total)}</span>
      </div>`;
}

// ── Exportar / Imprimir ──
function _lcobExportRows(){
  return (_lcobRows||[]).map(x=>({
    fecha:_lcobFecha(x.rec.fecha), recibo:_lcobRecNum(x.rec),
    codigo:x.rec.cliente||'', razon:_lcobCliRazon(x.rec.cliente),
    efectivo:x.ins.efectivo, transf:x.ins.transf, cheques:x.ins.cheques,
    retenc:x.ins.retenc, ajuste:x.ins.ajuste, total:x.total
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
  let ExcelJS; try{ ExcelJS=await _lcobLoadExcelJS(); }catch(e){ toast('No se pudo cargar Excel','err'); return; }
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Cobranzas');
  const desde=document.getElementById('lcob-desde')?.value||'', hasta=document.getElementById('lcob-hasta')?.value||'';
  ws.mergeCells('A1:J1');
  const t=ws.getCell('A1');
  t.value='Listado de Cobranzas'+((desde||hasta)?('  ('+(desde?_lcobFecha(desde):'…')+' a '+(hasta?_lcobFecha(hasta):'…')+')'):'');
  t.font={bold:true,size:14}; t.alignment={horizontal:'center'};
  const hr=ws.addRow(['Fecha','Recibo','Código','Cliente','Efectivo','Transfer.','Cheques','Retenc.','Ajuste','Total']);
  hr.font={bold:true}; hr.eachCell(c=>{c.border={bottom:{style:'medium'}};});
  const T={e:0,t:0,c:0,r:0,a:0,tot:0};
  for(const r of rows){
    T.e+=r.efectivo;T.t+=r.transf;T.c+=r.cheques;T.r+=r.retenc;T.a+=r.ajuste;T.tot+=r.total;
    const row=ws.addRow([r.fecha,r.recibo,r.codigo,r.razon,r.efectivo,r.transf,r.cheques,r.retenc,r.ajuste,r.total]);
    [5,6,7,8,9,10].forEach(i=>row.getCell(i).numFmt='#,##0.00');
  }
  const tr=ws.addRow(['','','','TOTALES',T.e,T.t,T.c,T.r,T.a,T.tot]);
  tr.font={bold:true}; [5,6,7,8,9,10].forEach(i=>tr.getCell(i).numFmt='#,##0.00');
  tr.eachCell(c=>{c.border={top:{style:'double'}};});
  ws.columns=[{width:11},{width:14},{width:9},{width:30},{width:13},{width:13},{width:13},{width:12},{width:11},{width:15}];
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
  const T={e:0,t:0,c:0,r:0,a:0,tot:0};
  let cuerpo='';
  for(const r of rows){
    T.e+=r.efectivo;T.t+=r.transf;T.c+=r.cheques;T.r+=r.retenc;T.a+=r.ajuste;T.tot+=r.total;
    cuerpo+=`<tr><td>${r.fecha}</td><td>${_e(r.recibo)}</td><td>${_e(r.codigo)} ${_e(r.razon)}</td>`
      +`<td class="n">${_lcobFmt(r.efectivo)}</td><td class="n">${_lcobFmt(r.transf)}</td><td class="n">${_lcobFmt(r.cheques)}</td>`
      +`<td class="n">${_lcobFmt(r.retenc)}</td><td class="n">${_lcobFmt(r.ajuste)}</td><td class="n"><b>${_lcobFmt0(r.total)}</b></td></tr>`;
  }
  const periodo=(desde||hasta)?(' · '+(desde?_lcobFecha(desde):'…')+' a '+(hasta?_lcobFecha(hasta):'…')):'';
  const win=window.open('','_blank');
  win.document.write(`<html><head><title>Listado de Cobranzas</title><meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;margin:14px}
    h2{margin:0 0 2px} .sub{color:#666;font-size:11px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse} td,th{padding:3px 6px;border-bottom:1px solid #eee;text-align:left}
    th{background:#333;color:#fff} .n{text-align:right;font-family:monospace;white-space:nowrap}
    tr.tot td{font-weight:bold;border-top:2px solid #000}
  </style></head><body>
  <h2>Listado de Cobranzas</h2>
  <div class="sub">Daihatsu Electronics — ${new Date().toLocaleDateString('es-AR')}${periodo} · ${rows.length} recibo(s)</div>
  <table>
    <tr><th>Fecha</th><th>Recibo</th><th>Cliente</th><th class="n">Efectivo</th><th class="n">Transfer.</th><th class="n">Cheques</th><th class="n">Retenc.</th><th class="n">Ajuste</th><th class="n">Total</th></tr>
    ${cuerpo}
    <tr class="tot"><td colspan="3">TOTALES</td><td class="n">${_lcobFmt0(T.e)}</td><td class="n">${_lcobFmt0(T.t)}</td><td class="n">${_lcobFmt0(T.c)}</td><td class="n">${_lcobFmt0(T.r)}</td><td class="n">${_lcobFmt0(T.a)}</td><td class="n">${_lcobFmt0(T.tot)}</td></tr>
  </table>
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(()=>win.print(),300);
}

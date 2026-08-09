// ═══════════════════════════════════════════════════════════
// LISTADO DE COBRANZAS — recibos de un período, con columnas
// por instrumento de pago (Efectivo, Transfer., Cheques,
// Retenc., Ajuste) + Total. Se arma del lado cliente.
// ═══════════════════════════════════════════════════════════
let _lcobRows  = [];
let _lcobPagos = null;   // cache de recibo_pagos
let _lcobCheq  = null;   // cache de cheques
let _lcobRets  = [];     // códigos de retención presentes en el período (una columna c/u)

// ¿Unificar todas las retenciones en una sola columna?
function _lcobRetTot(){ return !!document.getElementById('lcob-rettot')?.checked; }

// Columnas de retención a mostrar: una por código, o una sola totalizada
function _lcobRetCols(){
  return _lcobRetTot() ? [{key:'__TOT__', label:'Retenc.'}] : _lcobRets.map(k=>({key:k, label:k}));
}
function _lcobRetVal(ins, key){ return key==='__TOT__' ? (ins.retenc||0) : (ins.rets?.[key]||0); }

// Al cambiar el check no hace falta recalcular: solo redibujar
function lcobToggleRetTot(){ if(_lcobRows.length) _lcobPintar(); }

// Vendedor del cliente del recibo (los recibos no lo guardan: sale de la ficha)
function _lcobVend(cod){
  const c=(typeof CLIS!=='undefined')?CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(cod||'').trim()):null;
  return c ? (c.CLI_VEND||'').trim() : '';
}

// Plantilla de columnas: se arma según cuántas retenciones haya
function _lcobTpl(){
  const rets=_lcobRetCols().map(()=>'95px').join(' ');
  return `display:grid;grid-template-columns:85px 115px minmax(180px,1fr) 55px 100px 100px 100px 100px ${rets} 95px 120px;gap:6px;align-items:center`;
}

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
  if(typeof ensureRecibos==='function') { try{ await ensureRecibos(); }catch(e){ console.error('listcob/recibos:',e); } }
  else if(typeof RECIS!=='undefined' && (!RECIS||!RECIS.length) && typeof sbLoadRecis==='function'){
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
  const r={efectivo:0, transf:0, cheques:0, cheqF:0, cheqE:0, retenc:0, ajuste:0, rets:{}};
  (_lcobPagos||[]).forEach(p=>{ if(p.recibo_id!==reciboId) return;
    const v=Number(p.importe)||0;
    if(p.tipo==='efectivo') r.efectivo+=v;
    else if(p.tipo==='transferencia') r.transf+=v;
    else if(p.tipo==='retencion'){
      r.retenc+=v;
      const k=(p.ret_codigo||'S/C').trim()||'S/C';   // una columna por tipo de retención
      r.rets[k]=(r.rets[k]||0)+v;
    }
    else if(p.tipo==='ajuste') r.ajuste+=v;
  });
  // Los cheques se separan en físicos (fisico=true) y electrónicos (ECheq)
  (_lcobCheq||[]).forEach(c=>{ if(c.recibo_id!==reciboId) return;
    const v=Number(c.importe)||0;
    r.cheques+=v;
    if(c.fisico===false) r.cheqE+=v; else r.cheqF+=v;
  });
  return r;
}

// Códigos de retención que aparecen en las filas cargadas
function _lcobRetsPresentes(rows){
  const set=new Set();
  rows.forEach(x=>Object.keys(x.ins.rets||{}).forEach(k=>set.add(k)));
  return [...set].sort();
}

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
  _lcobRets=_lcobRetsPresentes(_lcobRows);

  const totEl=document.getElementById('lcob-total');
  const cntEl=document.getElementById('lcob-count'); if(cntEl) cntEl.textContent=_lcobRows.length;
  if(!_lcobRows.length){ if(totEl) totEl.textContent='$ 0,00'; body.innerHTML='<div class="empty" style="margin-top:40px">Sin recibos en el período</div>'; return; }
  _lcobPintar();
}

// Dibuja la grilla con las filas ya calculadas (se llama también al togglear retenciones)
function _lcobPintar(){
  const body=document.getElementById('lcob-body'); if(!body) return;
  _lcobHead();
  const RC=_lcobRetCols();
  const T={efectivo:0,transf:0,cheqF:0,cheqE:0,ajuste:0,total:0,rets:{}};
  _lcobRows.forEach(x=>{ T.efectivo+=x.ins.efectivo; T.transf+=x.ins.transf; T.cheqF+=x.ins.cheqF; T.cheqE+=x.ins.cheqE; T.ajuste+=x.ins.ajuste; T.total+=x.total;
    RC.forEach(c=>{ T.rets[c.key]=(T.rets[c.key]||0)+_lcobRetVal(x.ins,c.key); }); });
  const totEl=document.getElementById('lcob-total'); if(totEl) totEl.textContent='$ '+_lcobFmt0(T.total);
  const TPL=_lcobTpl();
  const numCell=v=>`<span style="text-align:right;font-family:var(--mono)">${_lcobFmt(v)}</span>`;
  body.innerHTML=_lcobRows.map(x=>`
    <div style="${TPL};padding:6px 12px;border-bottom:1px solid var(--b1);font-size:13px">
      <span style="color:var(--t2);font-family:var(--mono)">${_lcobFecha(x.rec.fecha)}</span>
      <span style="font-family:var(--mono);color:var(--acc)">${esc(_lcobRecNum(x.rec))}</span>
      <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(_lcobCli(x.rec.cliente))}</span>
      <span style="font-family:var(--mono);color:var(--t2)">${esc(_lcobVend(x.rec.cliente))}</span>
      ${numCell(x.ins.efectivo)}${numCell(x.ins.transf)}${numCell(x.ins.cheqF)}${numCell(x.ins.cheqE)}
      ${RC.map(c=>numCell(_lcobRetVal(x.ins,c.key))).join('')}
      ${numCell(x.ins.ajuste)}
      <span style="text-align:right;font-family:var(--mono);font-weight:700">${_lcobFmt0(x.total)}</span>
    </div>`).join('')
    + `<div style="${TPL};padding:9px 12px;border-top:2px solid var(--b1);font-weight:700;font-family:var(--mono)">
        <span></span><span></span><span style="text-align:right">TOTALES (${_lcobRows.length})</span><span></span>
        <span style="text-align:right">${_lcobFmt0(T.efectivo)}</span>
        <span style="text-align:right">${_lcobFmt0(T.transf)}</span>
        <span style="text-align:right">${_lcobFmt0(T.cheqF)}</span>
        <span style="text-align:right">${_lcobFmt0(T.cheqE)}</span>
        ${RC.map(c=>`<span style="text-align:right">${_lcobFmt0(T.rets[c.key]||0)}</span>`).join('')}
        <span style="text-align:right">${_lcobFmt0(T.ajuste)}</span>
        <span style="text-align:right">${_lcobFmt0(T.total)}</span>
      </div>`;
}

// El encabezado se re-arma porque las columnas de retención son variables
function _lcobHead(){
  const th=document.querySelector('#page-listcob .th-tab'); if(!th) return;
  th.setAttribute('style', _lcobTpl()+';padding:8px 12px;background:var(--s2);border-bottom:1px solid var(--b1);font-size:11px;color:var(--t2)');
  th.innerHTML=`<span>Fecha</span><span>Recibo</span><span>Cliente</span><span>Vend</span>`+
    `<span style="text-align:right">Efectivo</span><span style="text-align:right">Transfer.</span><span style="text-align:right">Cheque</span><span style="text-align:right">Echeq</span>`+
    _lcobRetCols().map(c=>`<span style="text-align:right" title="Retención ${esc(c.label)}">${esc(c.label)}</span>`).join('')+
    `<span style="text-align:right">Ajuste</span><span style="text-align:right">Total</span>`;
}

// ── Exportar / Imprimir ──
function _lcobExportRows(){
  return (_lcobRows||[]).map(x=>({
    fecha:_lcobFecha(x.rec.fecha), recibo:_lcobRecNum(x.rec),
    codigo:x.rec.cliente||'', razon:_lcobCliRazon(x.rec.cliente),
    vend:_lcobVend(x.rec.cliente),
    efectivo:x.ins.efectivo, transf:x.ins.transf, cheqF:x.ins.cheqF, cheqE:x.ins.cheqE,
    rets:x.ins.rets||{}, retenc:x.ins.retenc, ajuste:x.ins.ajuste, total:x.total
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
  ws.mergeCells(1,1,1,11+_lcobRetCols().length);
  const t=ws.getCell(1,1);
  t.value='Listado de Cobranzas'+((desde||hasta)?('  ('+(desde?_lcobFecha(desde):'…')+' a '+(hasta?_lcobFecha(hasta):'…')+')'):'');
  t.font={bold:true,size:14}; t.alignment={horizontal:'center'};
  const RC=_lcobRetCols(), RT=RC.map(c=>c.key);
  const hr=ws.addRow(['Fecha','Recibo','Código','Cliente','Vend','Efectivo','Transfer.','Cheque','Echeq',...RC.map(c=>c.label),'Ajuste','Total']);
  hr.font={bold:true}; hr.eachCell(c=>{c.border={bottom:{style:'medium'}};});
  const nCols=9+RT.length+2;
  const numIdx=[]; for(let i=6;i<=nCols;i++) numIdx.push(i);
  const T={e:0,t:0,cf:0,ce:0,a:0,tot:0,rets:{}};
  for(const r of rows){
    T.e+=r.efectivo;T.t+=r.transf;T.cf+=r.cheqF;T.ce+=r.cheqE;T.a+=r.ajuste;T.tot+=r.total;
    RT.forEach(k=>{ T.rets[k]=(T.rets[k]||0)+(k==='__TOT__'?(r.retenc||0):(r.rets[k]||0)); });
    const row=ws.addRow([r.fecha,r.recibo,r.codigo,r.razon,r.vend,r.efectivo,r.transf,r.cheqF,r.cheqE,
      ...RT.map(k=>(k==='__TOT__'?(r.retenc||null):(r.rets[k]||null))), r.ajuste, r.total]);
    numIdx.forEach(i=>row.getCell(i).numFmt='#,##0.00');
  }
  const tr=ws.addRow(['','','','TOTALES','',T.e,T.t,T.cf,T.ce,...RT.map(k=>T.rets[k]||0),T.a,T.tot]);
  tr.font={bold:true}; numIdx.forEach(i=>tr.getCell(i).numFmt='#,##0.00');
  tr.eachCell(c=>{c.border={top:{style:'double'}};});
  ws.columns=[{width:11},{width:14},{width:9},{width:30},{width:7},{width:13},{width:13},{width:13},{width:13},
    ...RT.map(()=>({width:12})),{width:11},{width:15}];
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
  const RC=_lcobRetCols(), RT=RC.map(c=>c.key);
  const T={e:0,t:0,cf:0,ce:0,a:0,tot:0,rets:{}};
  let cuerpo='';
  for(const r of rows){
    T.e+=r.efectivo;T.t+=r.transf;T.cf+=r.cheqF;T.ce+=r.cheqE;T.a+=r.ajuste;T.tot+=r.total;
    RT.forEach(k=>{ T.rets[k]=(T.rets[k]||0)+(k==='__TOT__'?(r.retenc||0):(r.rets[k]||0)); });
    cuerpo+=`<tr><td>${r.fecha}</td><td>${_e(r.recibo)}</td><td>${_e(r.codigo)} ${_e(r.razon)}</td><td>${_e(r.vend)}</td>`
      +`<td class="n">${_lcobFmt(r.efectivo)}</td><td class="n">${_lcobFmt(r.transf)}</td><td class="n">${_lcobFmt(r.cheqF)}</td><td class="n">${_lcobFmt(r.cheqE)}</td>`
      +RT.map(k=>`<td class="n">${_lcobFmt(k==='__TOT__'?(r.retenc||0):(r.rets[k]||0))}</td>`).join('')
      +`<td class="n">${_lcobFmt(r.ajuste)}</td><td class="n"><b>${_lcobFmt0(r.total)}</b></td></tr>`;
  }
  const periodo=(desde||hasta)?(' · '+(desde?_lcobFecha(desde):'…')+' a '+(hasta?_lcobFecha(hasta):'…')):'';
  sgvPrint({
    titulo:'Listado de Cobranzas',
    subtitulo:`Daihatsu Electronics — ${new Date().toLocaleDateString('es-AR')}${periodo} · ${rows.length} recibo(s)`,
    apaisado:true,
    cuerpo:`<table>
    <tr><th>Fecha</th><th>Recibo</th><th>Cliente</th><th>Vend</th><th class="n">Efectivo</th><th class="n">Transfer.</th><th class="n">Cheque</th><th class="n">Echeq</th>${RC.map(c=>`<th class="n">${_e(c.label)}</th>`).join('')}<th class="n">Ajuste</th><th class="n">Total</th></tr>
    ${cuerpo}
    <tr class="tot"><td colspan="4">TOTALES</td><td class="n">${_lcobFmt0(T.e)}</td><td class="n">${_lcobFmt0(T.t)}</td><td class="n">${_lcobFmt0(T.cf)}</td><td class="n">${_lcobFmt0(T.ce)}</td>${RC.map(c=>`<td class="n">${_lcobFmt0(T.rets[c.key]||0)}</td>`).join('')}<td class="n">${_lcobFmt0(T.a)}</td><td class="n">${_lcobFmt0(T.tot)}</td></tr>
  </table>`
  });
}

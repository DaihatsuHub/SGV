/* ===========================================================================
   CUENTA CORRIENTE de clientes  (Clientes → Cuenta Corriente)
   - Filtra por cliente + rango de fechas.  El SERVER hace el trabajo pesado
     (endpoint /ctacte/:cli) y devuelve, por moneda: saldo anterior + movimientos.
   - Grilla: FECHA · COMPROBANTE · DEBE · HABER · SALDO (acumulativo).
   - DEBE = facturas (F) + notas de débito (D) + cheques rechazados (R)
     HABER = notas de crédito (C) + recibos/pagos.
   =========================================================================== */

let _ccData = null;   // último resultado del server { cliente, desde, hasta, monedas }

function _ccEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _ccFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _ccFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }
function _ccMonLabel(m){
  const map={ P:'Pesos', U:'Dólares', C:'Dólar Casio', T:'Dólar Tressa', D:'Dólares' };
  return map[m] || (m||'—');
}
function _ccMonSimbolo(m){ return m==='P' ? '$' : 'u$s'; }

// Llena el datalist de clientes (al abrir la página)
function ctacteFillClientes(){
  const dl=document.getElementById('ctacte-cli-list'); if(!dl) return;
  dl.innerHTML=(CLIS||[]).map(c=>`<option value="${_ccEsc((c.CLI_CODIGO||'').trim())} — ${_ccEsc(c.CLI_RAZON||'')}">`).join('');
}

// Resuelve el código de cliente desde el input ("COD — Razón" o código o razón)
function _ccResolverCli(){
  const val=(document.getElementById('ctacte-cli')?.value||'').trim();
  if(!val) return null;
  const codPart=(val.split('—')[0]||'').trim().toUpperCase();
  let c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===codPart);
  if(!c) c=(CLIS||[]).find(x=>(x.CLI_RAZON||'').trim().toLowerCase()===val.toLowerCase());
  return c ? (c.CLI_CODIGO||'').trim() : null;
}

async function ctacteConsultar(){
  const cli=_ccResolverCli();
  const body=document.getElementById('ctacte-body');
  if(!cli){ if(typeof toast==='function') toast('Elegí un cliente','err'); return; }
  const desde=(document.getElementById('ctacte-desde')?.value||'').trim();
  const hasta=(document.getElementById('ctacte-hasta')?.value||'').trim();
  if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Cargando cuenta corriente…</div>';
  try{
    const qs=[]; if(desde) qs.push('desde='+desde); if(hasta) qs.push('hasta='+hasta);
    const r=await apiGet('/ctacte/'+encodeURIComponent(cli)+(qs.length?'?'+qs.join('&'):''));
    _ccData={ ...r, _cli:cli };
    renderCtaCte();
  }catch(e){
    if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_ccEsc(e.message||'Error')+'</div>';
  }
}

// Devuelve el nombre del cliente para encabezados
function _ccCliNombre(cod){
  const c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim()===(cod||'').trim());
  return c ? (c.CLI_RAZON||'') : (cod||'');
}

function renderCtaCte(){
  const body=document.getElementById('ctacte-body'); if(!body) return;
  if(!_ccData){ body.innerHTML='<div class="empty" style="margin-top:40px">Elegí un cliente y tocá Consultar</div>'; return; }
  const monedas=_ccData.monedas||{};
  const claves=Object.keys(monedas);
  if(!claves.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Sin movimientos en el período</div>'; return; }

  // Ordenar: Pesos primero, después el resto
  claves.sort((a,b)=> (a==='P'?-1:b==='P'?1:0) || a.localeCompare(b));

  let html='';
  for(const m of claves){
    const d=monedas[m];
    let saldo=Number(d.saldoAnterior)||0;
    const sim=_ccMonSimbolo(m);
    const filas=(d.movimientos||[]).map(mv=>{
      saldo=Math.round((saldo + (mv.debe||0) - (mv.haber||0))*100)/100;
      const cls = mv.tipo==='REC' ? 'cc-rec' : (mv.tipo==='C' ? 'cc-nc' : '');
      return `<div class="cc-row ${cls}">
        <span>${_ccFecha(mv.fecha)}</span>
        <span class="cc-comp">${_ccEsc(mv.comprobante)}</span>
        <span class="cc-num">${mv.debe?_ccFmt(mv.debe):''}</span>
        <span class="cc-num">${mv.haber?_ccFmt(mv.haber):''}</span>
        <span class="cc-num cc-saldo">${_ccFmt(saldo)}</span>
      </div>`;
    }).join('');

    html+=`<div class="cc-moneda">
      <div class="cc-stickyhead">
        <div class="cc-mon-tit">${_ccMonLabel(m)} <span style="opacity:.6">(${sim})</span></div>
        <div class="cc-head">
          <span>Fecha</span><span>Comprobante</span>
          <span class="cc-num">Debe</span><span class="cc-num">Haber</span><span class="cc-num">Saldo</span>
        </div>
      </div>
      <div class="cc-grid">
        <div class="cc-row cc-ant">
          <span></span><span class="cc-comp"><i>Saldo anterior</i></span>
          <span class="cc-num"></span><span class="cc-num"></span>
          <span class="cc-num cc-saldo">${_ccFmt(d.saldoAnterior)}</span>
        </div>
        ${filas}
        <div class="cc-row cc-fin">
          <span></span><span class="cc-comp"><b>Saldo final</b></span>
          <span class="cc-num"></span><span class="cc-num"></span>
          <span class="cc-num cc-saldo"><b>${sim} ${_ccFmt(saldo)}</b></span>
        </div>
      </div>
    </div>`;
  }
  body.innerHTML=html;
  _ccInjectStyle();
}

// Estilos del módulo (una sola vez)
function _ccInjectStyle(){
  if(document.getElementById('cc-style')) return;
  const st=document.createElement('style'); st.id='cc-style';
  st.textContent=`
    #ctacte-body{padding:0 0 12px}
    .cc-moneda{margin:12px 12px 22px}
    .cc-stickyhead{position:sticky;top:0;z-index:5}
    .cc-mon-tit{font-size:14px;font-weight:700;color:var(--acc);padding:6px 10px;background:var(--s2);border-bottom:2px solid var(--acc)}
    .cc-grid{border:1px solid var(--b1);border-top:none}
    .cc-head,.cc-row{display:grid;grid-template-columns:90px minmax(220px,1fr) 130px 130px 150px;gap:6px;padding:5px 10px;align-items:center}
    .cc-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)}
    .cc-row{font-size:13px;border-bottom:1px solid var(--b1);background:var(--bg)}
    .cc-row:hover{background:var(--s2)}
    .cc-num{text-align:right;font-family:var(--mono)}
    .cc-comp{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cc-saldo{font-weight:600}
    .cc-ant{background:var(--s2);color:var(--t2)}
    .cc-fin{background:var(--s2);border-top:2px solid var(--acc)}
    .cc-rec .cc-comp{color:var(--scs,#22c55e)}
    .cc-nc .cc-comp{color:var(--wrn,#f59e0b)}
  `;
  document.head.appendChild(st);
}

/* ─────────── Imprimir ─────────── */
function ctactePrint(){
  if(!_ccData){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  const cli=_ccData._cli, nom=_ccCliNombre(cli);
  const per=(_ccData.desde||_ccData.hasta) ? `Período: ${_ccData.desde?_ccFecha(_ccData.desde):'inicio'} a ${_ccData.hasta?_ccFecha(_ccData.hasta):'hoy'}` : 'Todos los movimientos';
  let cuerpo='';
  const monedas=_ccData.monedas||{};
  const claves=Object.keys(monedas).sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));
  for(const m of claves){
    const d=monedas[m]; let saldo=Number(d.saldoAnterior)||0;
    let filas=`<tr><td></td><td><i>Saldo anterior</i></td><td></td><td></td><td class="r">${_ccFmt(d.saldoAnterior)}</td></tr>`;
    (d.movimientos||[]).forEach(mv=>{
      saldo=Math.round((saldo+(mv.debe||0)-(mv.haber||0))*100)/100;
      filas+=`<tr><td>${_ccFecha(mv.fecha)}</td><td>${_ccEsc(mv.comprobante)}</td><td class="r">${mv.debe?_ccFmt(mv.debe):''}</td><td class="r">${mv.haber?_ccFmt(mv.haber):''}</td><td class="r">${_ccFmt(saldo)}</td></tr>`;
    });
    filas+=`<tr class="fin"><td></td><td><b>Saldo final</b></td><td></td><td></td><td class="r"><b>${_ccFmt(saldo)}</b></td></tr>`;
    cuerpo+=`<h3>${_ccMonLabel(m)} (${_ccMonSimbolo(m)})</h3>
      <table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="r">Debe</th><th class="r">Haber</th><th class="r">Saldo</th></tr></thead><tbody>${filas}</tbody></table>`;
  }
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Cuenta Corriente - ${_ccEsc(nom)}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}
    h2{margin:0 0 2px} .sub{color:#666;font-size:12px;margin-bottom:14px}
    h3{margin:16px 0 4px;color:#0a58ca;border-bottom:1px solid #ccc;padding-bottom:2px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th,td{padding:4px 8px;border-bottom:1px solid #e5e5e5;text-align:left}
    th{background:#f0f0f0;font-size:11px}.r{text-align:right;font-variant-numeric:tabular-nums}
    tr.fin td{border-top:2px solid #0a58ca}</style></head>
    <body><h2>Cuenta Corriente — ${_ccEsc(cli)} ${_ccEsc(nom)}</h2>
    <div class="sub">${per}</div>${cuerpo}
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
  w.document.close();
}

/* ─────────── Excel (.xlsx nativo con ExcelJS) ─────────── */
async function _ccLoadExcelJS(){
  if(window.ExcelJS) return window.ExcelJS;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); });
  return window.ExcelJS;
}
async function ctacteExcel(){
  if(!_ccData){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  let ExcelJS; try{ ExcelJS=await _ccLoadExcelJS(); }catch(e){ if(typeof toast==='function') toast(e.message,'err'); return; }
  const cli=_ccData._cli, nom=_ccCliNombre(cli);
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Cta Corriente');
  ws.columns=[{width:12},{width:36},{width:16},{width:16},{width:18}];
  const titulo=ws.addRow([`Cuenta Corriente — ${cli} ${nom}`]); titulo.font={bold:true,size:13}; ws.mergeCells(titulo.number,1,titulo.number,5);
  const per=(_ccData.desde||_ccData.hasta)?`Período: ${_ccData.desde?_ccFecha(_ccData.desde):'inicio'} a ${_ccData.hasta?_ccFecha(_ccData.hasta):'hoy'}`:'Todos los movimientos';
  const rp=ws.addRow([per]); rp.font={italic:true,color:{argb:'FF666666'}}; ws.mergeCells(rp.number,1,rp.number,5);
  ws.addRow([]);
  const monedas=_ccData.monedas||{};
  const claves=Object.keys(monedas).sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));
  const NUM='#,##0.00';
  for(const m of claves){
    const d=monedas[m]; let saldo=Number(d.saldoAnterior)||0;
    const rm=ws.addRow([_ccMonLabel(m)+' ('+_ccMonSimbolo(m)+')']); rm.font={bold:true,size:12,color:{argb:'FF0A58CA'}}; ws.mergeCells(rm.number,1,rm.number,5);
    const hr=ws.addRow(['Fecha','Comprobante','Debe','Haber','Saldo']);
    hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center'}; c.border={bottom:{style:'thin'}}; });
    const ant=ws.addRow(['','Saldo anterior','','',Number(d.saldoAnterior)||0]);
    ant.getCell(2).font={italic:true}; ant.getCell(5).numFmt=NUM;
    (d.movimientos||[]).forEach(mv=>{
      saldo=Math.round((saldo+(mv.debe||0)-(mv.haber||0))*100)/100;
      const r=ws.addRow([_ccFecha(mv.fecha), mv.comprobante, mv.debe||null, mv.haber||null, saldo]);
      r.getCell(3).numFmt=NUM; r.getCell(4).numFmt=NUM; r.getCell(5).numFmt=NUM;
    });
    const fr=ws.addRow(['','Saldo final','','',saldo]);
    fr.getCell(2).font={bold:true}; fr.getCell(5).font={bold:true}; fr.getCell(5).numFmt=NUM;
    fr.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
    ws.addRow([]);
  }
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`CtaCte_${cli}_${new Date().toISOString().substring(0,10)}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

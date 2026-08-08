/* ===========================================================================
   ANTIGÜEDAD DE SALDOS  (Cobranzas → Antigüedad de Saldos)
   - Deuda abierta de cada cliente repartida en tramos: 0-30 / 31-60 / 61-90 / +90.
   - La antigüedad se mide desde la FECHA DE ENTREGA (fac_salida) cuando existe;
     si no, desde la fecha del comprobante.
   - Débitos (F/D/R) suman, notas de crédito restan, A/Cuenta sin aplicar resta.
   - El server hace todo el cálculo: GET /informes/antiguedad
   =========================================================================== */

let _antData = null;

function _anEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _anFmt(n){ const v=Number(n)||0; return v===0?'':v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _anFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }
function _anMonLabel(m){ return ({P:'Pesos',U:'Dólares',C:'Dólar Casio',T:'Dólar Tressa',D:'Dólares'})[m] || (m||'—'); }
function _anMonSim(m){ return m==='P' ? '$' : 'u$s'; }
function _anCliNom(cod){
  const c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim()===(cod||'').trim());
  return c ? (c.CLI_RAZON||'') : (cod||'');
}

// Llena el combo de vendedores (una vez, al abrir la página)
function antFillVend(){
  const sel=document.getElementById('ant-vend'); if(!sel) return;
  const cur=sel.value;
  sel.innerHTML='<option value="">Todos los vendedores</option>'+
    (TABLAS['VEND']||[]).map(v=>`<option value="${_anEsc(v.CODIGO)}"${v.CODIGO===cur?' selected':''}>${_anEsc(v.CODIGO)} — ${_anEsc(v.DETALLE)}</option>`).join('');
}

async function antConsultar(){
  const body=document.getElementById('ant-body');
  const hasta=(document.getElementById('ant-hasta')?.value||'').trim();
  const vend=(document.getElementById('ant-vend')?.value||'').trim();
  if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Calculando…</div>';
  try{
    const qs=[]; if(hasta) qs.push('hasta='+hasta); if(vend) qs.push('vend='+encodeURIComponent(vend));
    const r=await apiGet('/informes/antiguedad'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_anEsc(r.error||'Error')+'</div>'; return; }
    _antData=r;
    renderAnt();
  }catch(e){
    if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_anEsc(e.message||'Error')+'</div>';
  }
}

// Carga diferida: la 1ra vez que se abre, trae facturas si hiciera falta y consulta
function renderAntiguedad(){
  antFillVend();
  const h=document.getElementById('ant-hasta');
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
  if(!_antData) antConsultar();
  else renderAnt();
}

function renderAnt(){
  const body=document.getElementById('ant-body'); if(!body) return;
  if(!_antData){ body.innerHTML='<div class="empty" style="margin-top:40px">Tocá Consultar</div>'; return; }
  const filas=_antData.filas||[];
  if(!filas.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Sin deuda abierta a esa fecha</div>'; return; }

  // Agrupar por moneda: Pesos primero
  const porMon={};
  filas.forEach(f=>{ (porMon[f.moneda]=porMon[f.moneda]||[]).push(f); });
  const claves=Object.keys(porMon).sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));

  let html='';
  for(const m of claves){
    const lista=porMon[m], sim=_anMonSim(m), T=(_antData.totales||{})[m]||{t1:0,t2:0,t3:0,t4:0,total:0};
    const rows=lista.map(f=>{
      const neg=f.total<0;
      return `<div class="an-row">
        <span class="an-cli" title="${_anEsc(f.cliente+' — '+_anCliNom(f.cliente))}">${_anEsc(f.cliente)} ${_anEsc(_anCliNom(f.cliente))}</span>
        <span class="an-num">${_anFmt(f.t1)}</span>
        <span class="an-num">${_anFmt(f.t2)}</span>
        <span class="an-num an-w">${_anFmt(f.t3)}</span>
        <span class="an-num an-d">${_anFmt(f.t4)}</span>
        <span class="an-num an-tot" style="${neg?'color:var(--scs,#22c55e)':''}">${_anFmt(f.total)}</span>
      </div>`;
    }).join('');
    html+=`<div class="an-mon">
      <div class="an-stickyhead">
        <div class="an-mon-tit">${_anMonLabel(m)} <span style="opacity:.6">(${sim})</span>
          <span style="font-size:11px;font-weight:400;color:var(--t2);margin-left:8px">${lista.length} cliente${lista.length===1?'':'s'}</span></div>
        <div class="an-head">
          <span>Cliente</span>
          <span class="an-num">0 a 30</span><span class="an-num">31 a 60</span>
          <span class="an-num">61 a 90</span><span class="an-num">+90</span>
          <span class="an-num">Total</span>
        </div>
      </div>
      <div class="an-grid">
        ${rows}
        <div class="an-row an-fin">
          <span><b>Total ${_anMonLabel(m)}</b></span>
          <span class="an-num"><b>${_anFmt(T.t1)}</b></span>
          <span class="an-num"><b>${_anFmt(T.t2)}</b></span>
          <span class="an-num an-w"><b>${_anFmt(T.t3)}</b></span>
          <span class="an-num an-d"><b>${_anFmt(T.t4)}</b></span>
          <span class="an-num an-tot"><b>${sim} ${_anFmt(T.total)}</b></span>
        </div>
      </div>
    </div>`;
  }
  body.innerHTML=html;
  _anInjectStyle();
}

function _anInjectStyle(){
  if(document.getElementById('an-style')) return;
  const st=document.createElement('style'); st.id='an-style';
  st.textContent=`
    #ant-body{padding:0 0 12px}
    .an-mon{margin:12px 12px 22px}
    .an-stickyhead{position:sticky;top:0;z-index:5}
    .an-mon-tit{font-size:14px;font-weight:700;color:var(--acc);padding:6px 10px;background:var(--s2);border-bottom:2px solid var(--acc)}
    .an-grid{border:1px solid var(--b1);border-top:none}
    .an-head,.an-row{display:grid;grid-template-columns:minmax(220px,1fr) 120px 120px 120px 120px 140px;gap:6px;padding:5px 10px;align-items:center}
    .an-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)}
    .an-row{font-size:13px;border-bottom:1px solid var(--b1);background:var(--bg)}
    .an-row:hover{background:var(--s2)}
    .an-num{text-align:right;font-family:var(--mono)}
    .an-cli{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .an-w{color:var(--wrn,#f59e0b)}
    .an-d{color:var(--red)}
    .an-tot{font-weight:600}
    .an-fin{background:var(--s2);border-top:2px solid var(--acc)}
  `;
  document.head.appendChild(st);
}

/* ─────────── Imprimir ─────────── */
function antPrint(){
  if(!_antData){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  const filas=_antData.filas||[];
  const porMon={}; filas.forEach(f=>{ (porMon[f.moneda]=porMon[f.moneda]||[]).push(f); });
  const claves=Object.keys(porMon).sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));
  let cuerpo='';
  for(const m of claves){
    const T=(_antData.totales||{})[m]||{};
    let f='';
    porMon[m].forEach(x=>{
      f+=`<tr><td>${_anEsc(x.cliente)} ${_anEsc(_anCliNom(x.cliente))}</td>
        <td class="r">${_anFmt(x.t1)}</td><td class="r">${_anFmt(x.t2)}</td>
        <td class="r">${_anFmt(x.t3)}</td><td class="r">${_anFmt(x.t4)}</td>
        <td class="r"><b>${_anFmt(x.total)}</b></td></tr>`;
    });
    f+=`<tr class="fin"><td><b>Total</b></td><td class="r"><b>${_anFmt(T.t1)}</b></td><td class="r"><b>${_anFmt(T.t2)}</b></td>
        <td class="r"><b>${_anFmt(T.t3)}</b></td><td class="r"><b>${_anFmt(T.t4)}</b></td><td class="r"><b>${_anFmt(T.total)}</b></td></tr>`;
    cuerpo+=`<h3>${_anMonLabel(m)} (${_anMonSim(m)})</h3>
      <table><thead><tr><th>Cliente</th><th class="r">0 a 30</th><th class="r">31 a 60</th><th class="r">61 a 90</th><th class="r">+90</th><th class="r">Total</th></tr></thead><tbody>${f}</tbody></table>`;
  }
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Antigüedad de Saldos</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#111}
    h2{margin:0 0 2px}.sub{color:#666;font-size:12px;margin-bottom:14px}
    h3{margin:16px 0 4px;color:#0a58ca;border-bottom:1px solid #ccc;padding-bottom:2px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th,td{padding:4px 8px;border-bottom:1px solid #e5e5e5;text-align:left}
    th{background:#f0f0f0;font-size:11px}.r{text-align:right;font-variant-numeric:tabular-nums}
    tr.fin td{border-top:2px solid #0a58ca}</style></head>
    <body><h2>Antigüedad de Saldos</h2>
    <div class="sub">Al ${_anFecha(_antData.hasta)} — antigüedad medida desde la fecha de entrega</div>${cuerpo}
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
  w.document.close();
}

/* ─────────── Excel ─────────── */
async function _anLoadExcelJS(){
  if(window.ExcelJS) return window.ExcelJS;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); });
  return window.ExcelJS;
}
async function antExcel(){
  if(!_antData){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  let ExcelJS; try{ ExcelJS=await _anLoadExcelJS(); }catch(e){ if(typeof toast==='function') toast(e.message,'err'); return; }
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Antiguedad');
  ws.columns=[{width:42},{width:16},{width:16},{width:16},{width:16},{width:18}];
  const t=ws.addRow(['Antigüedad de Saldos']); t.font={bold:true,size:13}; ws.mergeCells(t.number,1,t.number,6);
  const s=ws.addRow([`Al ${_anFecha(_antData.hasta)} — desde la fecha de entrega`]);
  s.font={italic:true,color:{argb:'FF666666'}}; ws.mergeCells(s.number,1,s.number,6);
  ws.addRow([]);
  const NUM='#,##0.00';
  const filas=_antData.filas||[];
  const porMon={}; filas.forEach(f=>{ (porMon[f.moneda]=porMon[f.moneda]||[]).push(f); });
  const claves=Object.keys(porMon).sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));
  for(const m of claves){
    const rm=ws.addRow([_anMonLabel(m)+' ('+_anMonSim(m)+')']);
    rm.font={bold:true,size:12,color:{argb:'FF0A58CA'}}; ws.mergeCells(rm.number,1,rm.number,6);
    const hr=ws.addRow(['Cliente','0 a 30','31 a 60','61 a 90','+90','Total']);
    hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center'}; c.border={bottom:{style:'thin'}}; });
    porMon[m].forEach(x=>{
      const r=ws.addRow([x.cliente+' '+_anCliNom(x.cliente), x.t1||null, x.t2||null, x.t3||null, x.t4||null, x.total]);
      for(let i=2;i<=6;i++) r.getCell(i).numFmt=NUM;
    });
    const T=(_antData.totales||{})[m]||{};
    const fr=ws.addRow(['Total', T.t1||null, T.t2||null, T.t3||null, T.t4||null, T.total||0]);
    fr.eachCell(c=>{ c.font={bold:true}; c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
    for(let i=2;i<=6;i++) fr.getCell(i).numFmt=NUM;
    ws.addRow([]);
  }
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`Antiguedad_${(_antData.hasta||'').substring(0,10)}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

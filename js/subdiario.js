/* ===========================================================================
   SUBDIARIO DE IVA VENTAS  (Ventas → Subdiario de IVA)
   - Informe FISCAL: lleva los valores DECLARADOS a AFIP, no los reales.
   - Sólo comprobantes CON CAE y no anulados. Las NC restan.
   - El IVA se abre por ALÍCUOTA y las percepciones por JURISDICCIÓN, en
     columnas DINÁMICAS: sólo aparecen las que existen en el período, así
     una alícuota nueva se toma sola sin tocar el código.
   =========================================================================== */

let _sdData = null;

function _sdEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _sdFmt(n){ const v=Number(n)||0; return v===0?'':v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _sdFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _sdFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }
function _sdAlic(a){ return (Number(a)||0).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:1})+'%'; }
function _sdIvaDesc(c){
  const m={ I:'RI', M:'RI', C:'CF', E:'EX', A:'MT', B:'EX', S:'MT' };
  return m[(c||'').trim().toUpperCase()] || (c||'').trim();
}

// Al abrir la pantalla: período por defecto = mes anterior completo
function renderSubdiario(){
  const d=document.getElementById('sd-desde'), h=document.getElementById('sd-hasta');
  if(d && !d.value){
    const hoy=new Date(), pm=new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
    d.value=pm.toISOString().substring(0,10);
    if(h) h.value=new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().substring(0,10);
  }
  if(_sdData) renderSd();
}

async function sdConsultar(){
  const body=document.getElementById('sd-body');
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const qs=[];
  if(g('sd-desde')) qs.push('desde='+g('sd-desde'));
  if(g('sd-hasta')) qs.push('hasta='+g('sd-hasta'));
  if(g('sd-empresa')) qs.push('empresa='+encodeURIComponent(g('sd-empresa')));
  if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Calculando…</div>';
  try{
    const r=await apiGet('/informes/subdiario'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_sdEsc(r.error||'Error')+'</div>'; return; }
    _sdData=r;
    renderSd();
  }catch(e){
    if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_sdEsc(e.message||'Error')+'</div>';
  }
}

// Plantilla de columnas: fijas + 2 por alícuota + 1 por percepción
function _sdTpl(){
  const A=(_sdData?.alicuotas||[]).map(()=>'115px 105px').join(' ');
  const P=(_sdData?.percepciones||[]).map(()=>'110px').join(' ');
  return `display:grid;grid-template-columns:75px 120px 45px 60px minmax(150px,1fr) 115px 45px ${A} ${P} 125px;gap:6px;align-items:center;min-width:max-content`;
}

function renderSd(){
  const body=document.getElementById('sd-body'); if(!body) return;
  if(!_sdData){ body.innerHTML='<div class="empty" style="margin-top:40px">Elegí el período y tocá Consultar</div>'; return; }
  const F=_sdData.filas||[], AL=_sdData.alicuotas||[], PE=_sdData.percepciones||[], T=_sdData.totales||{};
  if(!F.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Sin comprobantes con CAE en el período</div>'; return; }

  const TPL=_sdTpl();
  const cab=`<div class="sd-head" style="${TPL}">
      <span>Fecha</span><span>Comprobante</span><span>Tipo</span><span>Cód</span><span>Cliente</span>
      <span>CUIT</span><span>IVA</span>
      ${AL.map(a=>`<span class="sd-num">Neto ${_sdAlic(a)}</span><span class="sd-num">IVA ${_sdAlic(a)}</span>`).join('')}
      ${PE.map(p=>`<span class="sd-num" title="${_sdEsc(p.detalle)}">${_sdEsc(p.detalle.replace(/^PERCEP\.\s*IIBB\s*/i,''))}</span>`).join('')}
      <span class="sd-num">Total</span>
    </div>`;

  const filas=F.map(r=>`<div class="sd-row" style="${TPL}">
      <span class="sd-mono" style="color:var(--t2)">${_sdFecha(r.fec)}</span>
      <span class="sd-mono" style="color:${r.tipo==='C'?'var(--red)':'var(--acc)'}">${_sdEsc(r.comp)}</span>
      <span style="font-size:11px;color:var(--t2)">${r.tipo==='C'?'NC':r.tipo==='D'?'ND':'FC'}</span>
      <span class="sd-mono" style="color:var(--t2)">${_sdEsc(r.cli)}</span>
      <span class="sd-cli" title="${_sdEsc(r.razon)}">${_sdEsc(sgvCorta(r.razon))}</span>
      <span class="sd-mono">${_sdEsc(r.cuit)}</span>
      <span style="font-size:11px;color:var(--t2)">${_sdEsc(_sdIvaDesc(r.iva))}</span>
      ${AL.map(a=>`<span class="sd-num">${_sdFmt(r.porAlic[a]?.neto)}</span><span class="sd-num">${_sdFmt(r.porAlic[a]?.iva)}</span>`).join('')}
      ${PE.map(p=>`<span class="sd-num">${_sdFmt(r.perc[p.cod])}</span>`).join('')}
      <span class="sd-num sd-tot">${_sdFmt(r.total)}</span>
    </div>`).join('');

  const pie=`<div class="sd-row sd-fin" style="${TPL}">
      <span></span><span><b>TOTALES</b></span><span></span><span></span>
      <span style="font-size:11px;color:var(--t2)">${F.length} comprobante${F.length===1?'':'s'}</span>
      <span></span><span></span>
      ${AL.map(a=>`<span class="sd-num"><b>${_sdFmt0(T.porAlic?.[a]?.neto)}</b></span><span class="sd-num"><b>${_sdFmt0(T.porAlic?.[a]?.iva)}</b></span>`).join('')}
      ${PE.map(p=>`<span class="sd-num"><b>${_sdFmt0(T.perc?.[p.cod])}</b></span>`).join('')}
      <span class="sd-num sd-tot"><b>${_sdFmt0(T.total)}</b></span>
    </div>`;

  // Resumen para la declaración jurada
  const resumen=`<div class="sd-res">
      <div class="sd-res-tit">Resumen del período</div>
      <div class="sd-res-body">
        ${AL.map(a=>`<div class="sd-res-item"><span>Neto gravado ${_sdAlic(a)}</span><b>${_sdFmt0(T.porAlic?.[a]?.neto)}</b></div>
          <div class="sd-res-item"><span>IVA débito fiscal ${_sdAlic(a)}</span><b>${_sdFmt0(T.porAlic?.[a]?.iva)}</b></div>`).join('')}
        ${PE.map(p=>`<div class="sd-res-item"><span>${_sdEsc(p.detalle)}</span><b>${_sdFmt0(T.perc?.[p.cod])}</b></div>`).join('')}
        <div class="sd-res-item sd-res-tot"><span>TOTAL FACTURADO</span><b>${_sdFmt0(T.total)}</b></div>
      </div>
    </div>`;

  body.innerHTML=`<div class="sd-wrap">${cab}<div class="sd-grid">${filas}${pie}</div></div>${resumen}`;
  _sdInjectStyle();
  _sdSyncScroll();
}

// El encabezado está fuera del área que scrollea: hay que moverlo a la par
function _sdSyncScroll(){
  const body=document.getElementById('sd-body');
  const head=body?.querySelector('.sd-head');
  if(!body||!head) return;
  body.onscroll=function(){ head.style.transform='translateX(-'+body.scrollLeft+'px)'; };
  head.style.transform='translateX(-'+body.scrollLeft+'px)';
}

function _sdInjectStyle(){
  if(document.getElementById('sd-style')) return;
  const st=document.createElement('style'); st.id='sd-style';
  st.textContent=`
    #sd-body{padding:0 0 12px;overflow:auto}
    .sd-wrap{min-width:max-content}
    .sd-head{background:var(--s2);font-size:11px;color:var(--t2);padding:8px 12px;
             border-bottom:2px solid var(--b1);position:sticky;top:0;z-index:5;will-change:transform}
    .sd-row{font-size:12px;border-bottom:1px solid var(--b1);padding:4px 12px;background:var(--bg)}
    .sd-row:hover{background:var(--s2)}
    .sd-num{text-align:right;font-family:var(--mono)}
    .sd-mono{font-family:var(--mono)}
    .sd-cli{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .sd-tot{font-weight:600}
    .sd-fin{background:var(--s2);border-top:2px solid var(--acc);font-family:var(--mono)}
    .sd-res{margin:16px 12px;border:1px solid var(--b1);border-radius:6px;max-width:520px}
    .sd-res-tit{background:var(--s2);padding:7px 12px;font-weight:700;color:var(--acc);font-size:13px;border-bottom:1px solid var(--b1)}
    .sd-res-body{padding:6px 0}
    .sd-res-item{display:flex;justify-content:space-between;gap:16px;padding:4px 12px;font-size:13px}
    .sd-res-item b{font-family:var(--mono)}
    .sd-res-tot{border-top:2px solid var(--acc);margin-top:6px;padding-top:8px;font-weight:700;color:var(--acc)}
  `;
  document.head.appendChild(st);
}

/* ─────────── Imprimir ─────────── */
function sdPrint(){
  if(!_sdData || !(_sdData.filas||[]).length){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  const F=_sdData.filas, AL=_sdData.alicuotas||[], PE=_sdData.percepciones||[], T=_sdData.totales||{};
  const per=`${_sdData.desde?_sdFecha(_sdData.desde):'inicio'} a ${_sdData.hasta?_sdFecha(_sdData.hasta):'hoy'}`;
  const empTxt=_sdData.empresa==='H'?'Hatsu':_sdData.empresa==='T'?'Tressa':'Todas las empresas';

  const cab=`<tr><th>Fecha</th><th>Comprobante</th><th>T</th><th>Cód</th><th>Cliente</th><th>CUIT</th><th>IVA</th>`
    + AL.map(a=>`<th class="n">Neto ${_sdAlic(a)}</th><th class="n">IVA ${_sdAlic(a)}</th>`).join('')
    + PE.map(p=>`<th class="n">${_sdEsc(p.detalle.replace(/^PERCEP\.\s*IIBB\s*/i,''))}</th>`).join('')
    + `<th class="n">Total</th></tr>`;

  const cuerpo=F.map(r=>`<tr><td>${_sdFecha(r.fec)}</td><td>${_sdEsc(r.comp)}</td>
      <td>${r.tipo==='C'?'NC':r.tipo==='D'?'ND':'FC'}</td><td>${_sdEsc(r.cli)}</td>
      <td>${_sdEsc(sgvCorta(r.razon))}</td><td>${_sdEsc(r.cuit)}</td><td>${_sdEsc(_sdIvaDesc(r.iva))}</td>`
    + AL.map(a=>`<td class="n">${_sdFmt(r.porAlic[a]?.neto)}</td><td class="n">${_sdFmt(r.porAlic[a]?.iva)}</td>`).join('')
    + PE.map(p=>`<td class="n">${_sdFmt(r.perc[p.cod])}</td>`).join('')
    + `<td class="n">${_sdFmt(r.total)}</td></tr>`).join('');

  const pie=`<tr class="tot"><td colspan="7">TOTALES (${F.length} comprobantes)</td>`
    + AL.map(a=>`<td class="n">${_sdFmt0(T.porAlic?.[a]?.neto)}</td><td class="n">${_sdFmt0(T.porAlic?.[a]?.iva)}</td>`).join('')
    + PE.map(p=>`<td class="n">${_sdFmt0(T.perc?.[p.cod])}</td>`).join('')
    + `<td class="n">${_sdFmt0(T.total)}</td></tr>`;

  const resumen=`<h3>Resumen del período</h3><table style="width:auto">`
    + AL.map(a=>`<tr><td>Neto gravado ${_sdAlic(a)}</td><td class="n">${_sdFmt0(T.porAlic?.[a]?.neto)}</td></tr>
        <tr><td>IVA débito fiscal ${_sdAlic(a)}</td><td class="n">${_sdFmt0(T.porAlic?.[a]?.iva)}</td></tr>`).join('')
    + PE.map(p=>`<tr><td>${_sdEsc(p.detalle)}</td><td class="n">${_sdFmt0(T.perc?.[p.cod])}</td></tr>`).join('')
    + `<tr class="tot"><td>TOTAL FACTURADO</td><td class="n">${_sdFmt0(T.total)}</td></tr></table>`;

  sgvPrint({
    titulo:'Subdiario de IVA Ventas',
    subtitulo:`${empTxt} — Período: ${per} — sólo comprobantes con CAE — valores declarados a AFIP`,
    cuerpo:`<table><thead>${cab}</thead><tbody>${cuerpo}${pie}</tbody></table>${resumen}`
  });
}

/* ─────────── Excel ─────────── */
async function _sdLoadExcelJS(){
  if(window.ExcelJS) return window.ExcelJS;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); });
  return window.ExcelJS;
}
async function sdExcel(){
  if(!_sdData || !(_sdData.filas||[]).length){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  let ExcelJS; try{ ExcelJS=await _sdLoadExcelJS(); }catch(e){ if(typeof toast==='function') toast(e.message,'err'); return; }
  const F=_sdData.filas, AL=_sdData.alicuotas||[], PE=_sdData.percepciones||[], T=_sdData.totales||{};
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Subdiario IVA');
  const NUM='#,##0.00';

  const nCols=7+AL.length*2+PE.length+1;
  ws.columns=[{width:11},{width:15},{width:6},{width:9},{width:34},{width:15},{width:7},
    ...AL.flatMap(()=>[{width:15},{width:14}]),
    ...PE.map(()=>({width:15})), {width:16}];

  const empTxt=_sdData.empresa==='H'?'Hatsu':_sdData.empresa==='T'?'Tressa':'Todas las empresas';
  const t=ws.addRow(['Subdiario de IVA Ventas']); t.font={bold:true,size:14}; ws.mergeCells(t.number,1,t.number,nCols);
  const per=`${empTxt} — Período: ${_sdData.desde?_sdFecha(_sdData.desde):'inicio'} a ${_sdData.hasta?_sdFecha(_sdData.hasta):'hoy'} — sólo comprobantes con CAE — valores declarados a AFIP`;
  const s=ws.addRow([per]); s.font={italic:true,color:{argb:'FF666666'}}; ws.mergeCells(s.number,1,s.number,nCols);
  ws.addRow([]);

  const hr=ws.addRow(['Fecha','Comprobante','Tipo','Cód','Cliente','CUIT','IVA',
    ...AL.flatMap(a=>['Neto '+_sdAlic(a),'IVA '+_sdAlic(a)]),
    ...PE.map(p=>p.detalle), 'Total']);
  hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center',wrapText:true}; c.border={bottom:{style:'medium'}}; });

  const primerNum=8;
  F.forEach(r=>{
    const row=ws.addRow([_sdFecha(r.fec), r.comp, r.tipo==='C'?'NC':r.tipo==='D'?'ND':'FC', r.cli, r.razon, r.cuit, _sdIvaDesc(r.iva),
      ...AL.flatMap(a=>[r.porAlic[a]?.neto||null, r.porAlic[a]?.iva||null]),
      ...PE.map(p=>r.perc[p.cod]||null), r.total]);
    for(let i=primerNum;i<=nCols;i++) row.getCell(i).numFmt=NUM;
  });

  const fr=ws.addRow(['','','','','TOTALES ('+F.length+')','','',
    ...AL.flatMap(a=>[T.porAlic?.[a]?.neto||0, T.porAlic?.[a]?.iva||0]),
    ...PE.map(p=>T.perc?.[p.cod]||0), T.total||0]);
  fr.font={bold:true}; fr.eachCell(c=>{ c.border={top:{style:'double'}}; });
  for(let i=primerNum;i<=nCols;i++) fr.getCell(i).numFmt=NUM;

  // Hoja aparte con el resumen para la DDJJ
  const ws2=wb.addWorksheet('Resumen');
  ws2.columns=[{width:34},{width:18}];
  const t2=ws2.addRow(['Resumen del período']); t2.font={bold:true,size:13}; ws2.mergeCells(t2.number,1,t2.number,2);
  ws2.addRow([per]).font={italic:true,color:{argb:'FF666666'}};
  ws2.addRow([]);
  AL.forEach(a=>{
    const r1=ws2.addRow(['Neto gravado '+_sdAlic(a), T.porAlic?.[a]?.neto||0]); r1.getCell(2).numFmt=NUM;
    const r2=ws2.addRow(['IVA débito fiscal '+_sdAlic(a), T.porAlic?.[a]?.iva||0]); r2.getCell(2).numFmt=NUM;
  });
  PE.forEach(p=>{ const r=ws2.addRow([p.detalle, T.perc?.[p.cod]||0]); r.getCell(2).numFmt=NUM; });
  const rt=ws2.addRow(['TOTAL FACTURADO', T.total||0]);
  rt.font={bold:true}; rt.getCell(2).numFmt=NUM; rt.eachCell(c=>{ c.border={top:{style:'double'}}; });

  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`Subdiario_IVA_${(_sdData.desde||'').substring(0,7)}${_sdData.empresa?'_'+_sdData.empresa:''}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ===========================================================================
   SUBDIARIO DE COBRANZAS  (Cobranzas → Subdiario)
   - Lo que entró en el período SEGÚN LA CONTABILIDAD: cada instrumento por la
     parte imputada a la parte declarada, no por lo realmente cobrado.
   - Sólo recibos FISCALES (talonario distinto de "X").
   - Columnas de retención DINÁMICAS: sólo las que aparecen en el período.
   =========================================================================== */

let _sdcData = null;

function _sdcEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _sdcFmt(n){ const v=Number(n)||0; return v===0?'':v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _sdcFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _sdcFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }

// Ancho de la grilla: fijo + una columna por retención presente
function _sdcGrid(rets){
  return `74px 92px 56px 1fr 104px 104px 96px 96px ${rets.map(()=>'96px').join(' ')} 110px`;
}

function renderSubdiarioCob(){
  // Período por defecto: el mes en curso
  const d=document.getElementById('sdc-desde'), h=document.getElementById('sdc-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value){ h.value=new Date().toISOString().substring(0,10); }
  if(_sdcData) _sdcPintar();
}

async function sdcConsultar(){
  const body=document.getElementById('sdc-body'); if(!body) return;
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const qs=[];
  if(g('sdc-desde')) qs.push('desde='+g('sdc-desde'));
  if(g('sdc-hasta')) qs.push('hasta='+g('sdc-hasta'));
  if(g('sdc-empresa')) qs.push('empresa='+g('sdc-empresa'));
  body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Cargando…</div>';
  try{
    const r=await apiGet('/informes/subdiario-cob'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_sdcEsc(r.error||'Error')+'</div>'; return; }
    _sdcData=r;
    _sdcPintar();
  }catch(e){
    body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_sdcEsc(e.message||'Error')+'</div>';
  }
}

function _sdcPintar(){
  const body=document.getElementById('sdc-body'); if(!body||!_sdcData) return;
  const D=_sdcData, rets=D.retenciones||[], filas=D.filas||[];
  const grid=_sdcGrid(rets);

  const head=document.getElementById('sdc-head');
  if(head){
    head.style.gridTemplateColumns=grid;
    head.innerHTML=`<span>Fecha</span><span>Recibo</span><span>Cód</span><span>Cliente</span>`
      + `<span class="r">Efectivo</span><span class="r">Transfer.</span>`
      + `<span class="r">Cheques</span><span class="r">ECheq</span>`
      + rets.map(c=>`<span class="r">${_sdcEsc(c)}</span>`).join('')
      + `<span class="r">Total</span>`;
  }

  if(!filas.length){
    body.innerHTML='<div class="empty" style="margin-top:40px">Sin cobranzas contables en el período</div>';
    const cnt=document.getElementById('sdc-count'); if(cnt) cnt.textContent='0';
    return;
  }

  body.innerHTML=filas.map(f=>`<div class="sdc-row" style="grid-template-columns:${grid}">
      <span>${_sdcFecha(f.fecha)}</span>
      <span class="mono acc">${_sdcEsc(f.recibo)}</span>
      <span class="mono">${_sdcEsc(f.codigo)}</span>
      <span title="${_sdcEsc(f.razon)}" class="ell">${_sdcEsc(f.razon)}</span>
      <span class="r mono">${_sdcFmt(f.efectivo)}</span>
      <span class="r mono">${_sdcFmt(f.transf)}</span>
      <span class="r mono">${_sdcFmt(f.cheqF)}</span>
      <span class="r mono">${_sdcFmt(f.cheqE)}</span>
      ${rets.map(c=>`<span class="r mono">${_sdcFmt((f.rets||{})[c])}</span>`).join('')}
      <span class="r mono tot">${_sdcFmt0(f.total)}</span>
    </div>`).join('');

  const T=D.totales||{};
  const pie=document.getElementById('sdc-pie');
  if(pie){
    pie.style.gridTemplateColumns=grid;
    pie.innerHTML=`<span></span><span></span><span></span><span><b>Totales</b></span>`
      + `<span class="r mono"><b>${_sdcFmt0(T.efectivo)}</b></span>`
      + `<span class="r mono"><b>${_sdcFmt0(T.transf)}</b></span>`
      + `<span class="r mono"><b>${_sdcFmt0(T.cheqF)}</b></span>`
      + `<span class="r mono"><b>${_sdcFmt0(T.cheqE)}</b></span>`
      + rets.map(c=>`<span class="r mono"><b>${_sdcFmt0((T.rets||{})[c])}</b></span>`).join('')
      + `<span class="r mono"><b>${_sdcFmt0(T.total)}</b></span>`;
  }
  const cnt=document.getElementById('sdc-count'); if(cnt) cnt.textContent=filas.length;
  _sdcStyle();
}

function _sdcStyle(){
  if(document.getElementById('sdc-style')) return;
  const st=document.createElement('style'); st.id='sdc-style';
  st.textContent=`
    #sdc-head,#sdc-pie,.sdc-row{display:grid;gap:6px;padding:5px 10px;align-items:center}
    #sdc-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:4}
    .sdc-row{font-size:12px;border-bottom:1px solid var(--b1)}
    .sdc-row:hover{background:var(--s2)}
    #sdc-pie{background:var(--s2);border-top:2px solid var(--acc);font-size:12px}
    #sdc-head .r,#sdc-pie .r,.sdc-row .r{text-align:right}
    .sdc-row .mono,#sdc-pie .mono{font-family:var(--mono)}
    .sdc-row .acc{color:var(--acc)}
    .sdc-row .tot{font-weight:600}
    .sdc-row .ell{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  `;
  document.head.appendChild(st);
}

/* ─────────── Imprimir ─────────── */
function sdcPrint(){
  if(!_sdcData){ toast('Consultá primero','err'); return; }
  const D=_sdcData, rets=D.retenciones||[], T=D.totales||{};
  const per=`Período: ${_sdcFecha(D.desde)||'inicio'} a ${_sdcFecha(D.hasta)||'hoy'}`
          + (D.empresa?` — ${D.empresa==='H'?'Hatsu':'Tressa'}`:'');
  const th=`<tr><th>Fecha</th><th>Recibo</th><th>Cód</th><th>Cliente</th><th>CUIT</th>`
    + `<th class="r">Efectivo</th><th class="r">Transfer.</th><th class="r">Cheques</th><th class="r">ECheq</th>`
    + rets.map(c=>`<th class="r">${_sdcEsc(c)}</th>`).join('')
    + `<th class="r">Total</th></tr>`;
  const tb=(D.filas||[]).map(f=>`<tr>
      <td>${_sdcFecha(f.fecha)}</td><td>${_sdcEsc(f.recibo)}</td>
      <td>${_sdcEsc(f.codigo)}</td><td>${_sdcEsc(f.razon)}</td><td>${_sdcEsc(f.cuit)}</td>
      <td class="r">${_sdcFmt(f.efectivo)}</td><td class="r">${_sdcFmt(f.transf)}</td>
      <td class="r">${_sdcFmt(f.cheqF)}</td><td class="r">${_sdcFmt(f.cheqE)}</td>
      ${rets.map(c=>`<td class="r">${_sdcFmt((f.rets||{})[c])}</td>`).join('')}
      <td class="r">${_sdcFmt0(f.total)}</td></tr>`).join('')
    + `<tr class="fin"><td colspan="5"><b>Totales</b></td>
        <td class="r"><b>${_sdcFmt0(T.efectivo)}</b></td><td class="r"><b>${_sdcFmt0(T.transf)}</b></td>
        <td class="r"><b>${_sdcFmt0(T.cheqF)}</b></td><td class="r"><b>${_sdcFmt0(T.cheqE)}</b></td>
        ${rets.map(c=>`<td class="r"><b>${_sdcFmt0((T.rets||{})[c])}</b></td>`).join('')}
        <td class="r"><b>${_sdcFmt0(T.total)}</b></td></tr>`;
  sgvPrint({
    titulo:'Subdiario de Cobranzas',
    subtitulo:per+' — importes contables',
    cuerpo:`<table><thead>${th}</thead><tbody>${tb}</tbody></table>`,
    apaisado:true
  });
}

/* ─────────── Excel ─────────── */
async function _sdcLoadExcelJS(){
  if(window.ExcelJS) return window.ExcelJS;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); });
  return window.ExcelJS;
}
async function sdcExcel(){
  if(!_sdcData){ toast('Consultá primero','err'); return; }
  let ExcelJS; try{ ExcelJS=await _sdcLoadExcelJS(); }catch(e){ toast(e.message,'err'); return; }
  const D=_sdcData, rets=D.retenciones||[], T=D.totales||{};
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Subdiario Cobranzas');
  ws.columns=[{width:11},{width:14},{width:9},{width:34},{width:15},
    {width:14},{width:14},{width:14},{width:14},
    ...rets.map(()=>({width:13})), {width:15}];

  const tit=ws.addRow(['Subdiario de Cobranzas']); tit.font={bold:true,size:13};
  const per=ws.addRow([`Período: ${_sdcFecha(D.desde)||'inicio'} a ${_sdcFecha(D.hasta)||'hoy'} — importes contables`]);
  per.font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);

  const hr=ws.addRow(['Fecha','Recibo','Cód','Cliente','CUIT','Efectivo','Transfer.','Cheques','ECheq',...rets,'Total']);
  hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center'}; c.border={bottom:{style:'thin'}}; });

  const NUM='#,##0.00';
  (D.filas||[]).forEach(f=>{
    const r=ws.addRow([_sdcFecha(f.fecha), f.recibo, f.codigo, f.razon, f.cuit,
      f.efectivo||null, f.transf||null, f.cheqF||null, f.cheqE||null,
      ...rets.map(c=>(f.rets||{})[c]||null), f.total||0]);
    for(let i=6;i<=9+rets.length+1;i++) r.getCell(i).numFmt=NUM;
  });
  const fr=ws.addRow(['','','','Totales','',T.efectivo,T.transf,T.cheqF,T.cheqE,
    ...rets.map(c=>(T.rets||{})[c]||0), T.total]);
  fr.eachCell(c=>{ c.font={bold:true}; c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
  for(let i=6;i<=9+rets.length+1;i++) fr.getCell(i).numFmt=NUM;

  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`Subdiario_Cobranzas_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ===========================================================================
   LIQUIDACIÓN DE COMISIONES  (Ventas → Comisiones)
   - Se comisiona SOBRE LO COBRADO, neto de IVA y percepciones, en pesos.
   - Manda la FECHA DE APLICACIÓN del recibo: un cobro de septiembre aplicado
     en octubre corresponde a octubre.
   - Sólo facturas; las notas de crédito no descuentan; lo que quedó a cuenta
     no comisiona hasta aplicarse.
   - Un vendedor → el % de la factura o el de su ficha.
     Todos los vendedores → liquidación del gerente, con % fijo.
   =========================================================================== */

let _comData = null, _comVerDet = false;

function _coEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _coFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _coFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
function _coVal(id){ return (document.getElementById(id)?.value||'').trim(); }
const COM_GRID='minmax(170px,1fr) 150px 130px 130px 70px 130px';

function renderComisiones(){
  _coStyle();
  const d=document.getElementById('com-desde'), h=document.getElementById('com-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
  const v=document.getElementById('com-vend');
  if(v && v.options.length<=1){
    v.innerHTML='<option value="">Todos — liquidación del gerente</option>'
      + (((typeof TABLAS!=='undefined'&&TABLAS['VEND'])||[])
         .map(x=>`<option value="${_coEsc(x.CODIGO)}">${_coEsc(x.CODIGO)} — ${_coEsc(x.DETALLE)}</option>`).join(''));
  }
  comPctSync();
  comConsultar();
}

// El % fijo sólo tiene sentido cuando se liquida a TODOS
function comPctSync(){
  const g=document.getElementById('com-pct-grp');
  if(g) g.style.display = _coVal('com-vend') ? 'none' : '';
}

async function comConsultar(){
  const body=document.getElementById('com-body'); if(!body) return;
  if(!_coVal('com-desde')||!_coVal('com-hasta')){ toast('Elegí el período','err'); return; }
  const qs=[`desde=${_coVal('com-desde')}`,`hasta=${_coVal('com-hasta')}`];
  if(_coVal('com-vend')) qs.push('vend='+encodeURIComponent(_coVal('com-vend')));
  else qs.push('pct='+(parseFloat(_coVal('com-pct'))||1));
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Calculando…</div>';
  try{
    const r=await apiGet('/informes/comisiones?'+qs.join('&'));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_coEsc(r.error||'Error')+'</div>'; return; }
    _comData=r; _coPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_coEsc(e.message||'Error')+'</div>'; }
}

function comVerDetalle(){ _comVerDet=!_comVerDet; _coPintar(); }

function _coPintar(){
  const body=document.getElementById('com-body'), head=document.getElementById('com-head');
  if(!body||!_comData) return;
  const D=_comData, F=D.filas||[], T=D.totales||{};

  if(head){
    head.style.gridTemplateColumns=COM_GRID;
    head.innerHTML= _comVerDet
      ? '<span>Cliente</span><span>Comprobante</span><span class="r">Cobrado</span><span class="r">Base</span><span class="r">%</span><span class="r">Comisión</span>'
      : '<span>Vendedor</span><span>Centro de costos</span><span class="r">Cobrado</span><span class="r">Base comisión</span><span class="r">Comp.</span><span class="r">Comisión</span>';
  }
  if(!F.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin cobranzas aplicadas en el período</div>'; return; }

  const aviso = D.pctFijo!==null && D.pctFijo!==undefined
    ? `<div class="co-nota">Liquidación del gerente: se aplica <b>${_coFmt(D.pctFijo)}%</b> sobre todo lo cobrado, sin mirar el porcentaje de cada vendedor.</div>`
    : '';

  let html='';
  if(_comVerDet){
    html=(D.detalle||[]).map(x=>`<div class="co-row" style="grid-template-columns:${COM_GRID}">
      <span class="co-t">${_coFecha(x.fecha)} · ${_coEsc(x.cliente)}</span>
      <span class="co-t" style="font-family:var(--mono);font-size:11px">${_coEsc(x.comprobante)} · rec. ${_coEsc(x.recibo)}</span>
      <span class="r">${_coFmt(x.cobrado)}</span>
      <span class="r">${_coFmt(x.base)}</span>
      <span class="r">${_coFmt(x.pct)}</span>
      <span class="r com">${_coFmt(x.comision)}</span>
    </div>`).join('');
  } else {
    html=F.map(f=>`<div class="co-row" style="grid-template-columns:${COM_GRID}">
      <span class="co-t"><b>${_coEsc(f.vend)}</b> ${_coEsc(f.vendDet)}</span>
      <span class="co-t">${_coEsc(f.ccos||'—')}</span>
      <span class="r">${_coFmt(f.cobrado)}</span>
      <span class="r">${_coFmt(f.base)}</span>
      <span class="r">${f.comprobantes}</span>
      <span class="r com">${_coFmt(f.comision)}</span>
    </div>`).join('');
  }

  html+=`<div class="co-row co-tot" style="grid-template-columns:${COM_GRID}">
    <span><b>TOTAL</b></span><span></span>
    <span class="r">${_coFmt(T.cobrado)}</span>
    <span class="r">${_coFmt(T.base)}</span><span></span>
    <span class="r com">${_coFmt(T.comision)}</span>
  </div>`;

  body.innerHTML=aviso+html;
}

/* ─────────── Imprimir ─────────── */
function comPrint(){
  if(!_comData){ toast('Consultá primero','err'); return; }
  const D=_comData, T=D.totales||{};
  const tr=(f,b)=>`<tr${b?' class="fin"':''}><td>${b?'<b>TOTAL</b>':_coEsc(f.vend+' '+f.vendDet)}</td>
    <td>${b?'':_coEsc(f.ccos||'')}</td><td class="r">${_coFmt(f.cobrado)}</td>
    <td class="r">${_coFmt(f.base)}</td><td class="r">${_coFmt(f.comision)}</td></tr>`;
  const sub=`Período ${_coFecha(D.desde)} a ${_coFecha(D.hasta)} · ${D.vend ? 'Vendedor '+_coEsc(D.vend) : 'Todos los vendedores al '+_coFmt(D.pctFijo)+'%'} · sobre lo cobrado, neto de IVA y percepciones`;
  sgvPrint({ titulo:'Liquidación de Comisiones', subtitulo:sub,
    cuerpo:`<table><thead><tr><th>Vendedor</th><th>Centro de costos</th><th class="r">Cobrado</th>
      <th class="r">Base</th><th class="r">Comisión</th></tr></thead>
      <tbody>${(D.filas||[]).map(f=>tr(f)).join('')}${tr(T,true)}</tbody></table>` });
}

/* ─────────── Excel ─────────── */
async function comExcel(){
  if(!_comData){ toast('Consultá primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_comData, T=D.totales||{}, NUM='#,##0.00';
  const wb=new ExcelJS.Workbook();

  const ws=wb.addWorksheet('Resumen');
  ws.columns=[{width:12},{width:28},{width:20},{width:16},{width:16},{width:10},{width:14}];
  ws.addRow(['Liquidación de Comisiones']).font={bold:true,size:13};
  ws.addRow([`Período ${_coFecha(D.desde)} a ${_coFecha(D.hasta)} · `
    +(D.vend?('Vendedor '+D.vend):('Todos al '+_coFmt(D.pctFijo)+'%'))
    +' · sobre lo cobrado, neto de IVA y percepciones']).font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Vendedor','Nombre','Centro de costos','Cobrado','Base comisión','Comp.','Comisión']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  (D.filas||[]).forEach(f=>{
    const r=ws.addRow([f.vend,f.vendDet,f.ccos||'',f.cobrado,f.base,f.comprobantes,f.comision]);
    [4,5,7].forEach(i=>{ r.getCell(i).numFmt=NUM; });
  });
  const fr=ws.addRow(['','','TOTAL',T.cobrado,T.base,null,T.comision]);
  fr.font={bold:true}; [4,5,7].forEach(i=>{ fr.getCell(i).numFmt=NUM; });
  ws.views=[{state:'frozen', ySplit:4}];

  const wd=wb.addWorksheet('Detalle');
  wd.columns=[{width:12},{width:16},{width:16},{width:30},{width:10},{width:15},{width:15},{width:8},{width:14}];
  const hd=wd.addRow(['Fecha aplic.','Recibo','Comprobante','Cliente','Vend.','Cobrado','Base','%','Comisión']);
  hd.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  (D.detalle||[]).forEach(x=>{
    const r=wd.addRow([_coFecha(x.fecha),x.recibo,x.comprobante,x.cliente,x.vend,x.cobrado,x.base,x.pct,x.comision]);
    [6,7,9].forEach(i=>{ r.getCell(i).numFmt=NUM; });
  });
  wd.views=[{state:'frozen', ySplit:1}];
  wd.autoFilter={ from:{row:1,column:1}, to:{row:1,column:9} };

  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Comisiones_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

function _coStyle(){
  if(document.getElementById('com-style')) return;
  const st=document.createElement('style'); st.id='com-style';
  st.textContent=`
    #com-head,.co-row{display:grid;gap:8px;align-items:center;padding:7px 12px}
    #com-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3}
    #com-head .r,.co-row .r{text-align:right}
    .co-row{font-size:13px;border-bottom:1px solid var(--b1);font-family:var(--mono)}
    .co-row .co-t{font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .co-row:hover{background:var(--s2)}
    .co-row .com{font-weight:600;color:var(--grn)}
    .co-tot{background:var(--s2);border-top:2px solid var(--acc);font-weight:700}
    .co-nota{margin:10px 12px;padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.5;
      background:rgba(55,138,221,.10);color:#185FA5}
  `;
  document.head.appendChild(st);
}

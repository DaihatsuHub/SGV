/* ===========================================================================
   RESULTADO POR CENTRO DE COSTOS  (Ventas → Resultado por Centro de Costos)
   - En pesos, sólo comprobantes reales. El cálculo lo hace el server
     (/informes/resultado-ccos): acá sólo se muestra.
   - Un centro con renglones SIN COSTO se marca: su resultado y su margen salen
     inflados, porque esas unidades figuran como si no hubieran costado nada.
   =========================================================================== */

let _rccData = null;

function _rcEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _rcFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _rcFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{maximumFractionDigits:2}); }
function _rcFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
const RCC_GRID='minmax(170px,1.4fr) 80px 130px 130px 120px 120px 130px 84px 26px';

function renderResultadoCcos(){
  const d=document.getElementById('rcc-desde'), h=document.getElementById('rcc-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
  _rcStyle();
  if(_rccData) _rcPintar(); else rccConsultar();
}

async function rccConsultar(){
  const body=document.getElementById('rcc-body'); if(!body) return;
  const g=id=>(document.getElementById(id)?.value||'').trim();
  if(!g('rcc-desde')||!g('rcc-hasta')){ toast('Elegí el período','err'); return; }
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Calculando…</div>';
  try{
    const r=await apiGet(`/informes/resultado-ccos?desde=${g('rcc-desde')}&hasta=${g('rcc-hasta')}`);
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_rcEsc(r.error||'Error')+'</div>'; return; }
    _rccData=r; _rcPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_rcEsc(e.message||'Error')+'</div>'; }
}

// Aviso de calidad del dato: unidades sin costo (el margen sale inflado) y
// unidades con costo convertido a la cotización vigente (estimado)
function _rcAviso(f){
  if(f.sinCosto>0) return `<span class="rc-warn" title="${_rcFmt0(f.sinCosto)} unidad(es) sin costo: el resultado y el margen salen inflados">⚠</span>`;
  if(f.estimados>0) return `<span class="rc-est" title="${_rcFmt0(f.estimados)} unidad(es) con el costo convertido a la cotización vigente (estimado)">≈</span>`;
  return '';
}

function _rcFila(f, total){
  const cls = total ? ' rc-tot' : (f.sinAsignar ? ' rc-sin' : '');
  const neg = v => v<0 ? ' rc-neg' : '';
  return `<div class="rc-row${cls}" style="grid-template-columns:${RCC_GRID}">
    <span class="rc-cc">${total?'<b>Total</b>':(f.sinAsignar?'<i>Sin asignar</i>':`<b>${_rcEsc(f.ccos)}</b> ${_rcEsc(f.detalle)}`)}</span>
    <span class="r">${_rcFmt0(f.unidades)}</span>
    <span class="r${neg(f.ventas)}">${_rcFmt(f.ventas)}</span>
    <span class="r">${_rcFmt(f.costos)}</span>
    <span class="r">${_rcFmt(f.impuestos)}</span>
    <span class="r">${_rcFmt(f.otros)}</span>
    <span class="r rc-res${neg(f.resultado)}">${_rcFmt(f.resultado)}</span>
    <span class="r${neg(f.margen)}">${f.margen===null||f.margen===undefined?'—':_rcFmt(f.margen)+' %'}</span>
    <span class="c">${_rcAviso(f)}</span>
  </div>`;
}

function _rcPintar(){
  const body=document.getElementById('rcc-body'); if(!body||!_rccData) return;
  const head=document.getElementById('rcc-head');
  if(head){
    head.style.gridTemplateColumns=RCC_GRID;
    head.innerHTML='<span>Centro de costos</span><span class="r">Unidades</span><span class="r">Ventas</span>'
      +'<span class="r">Costos</span><span class="r">IVA + IIBB</span><span class="r">Otros gastos</span>'
      +'<span class="r">Resultado</span><span class="r">Margen</span><span></span>';
  }
  const F=_rccData.filas||[], T=_rccData.totales||{};
  if(!F.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin movimientos en el período</div>'; return; }

  let aviso='';
  if((T.sinCosto||0)>0){
    const pct=T.unidades>0?Math.round(T.sinCosto/T.unidades*100):0;
    aviso=`<div class="rc-banner">⚠ <b>${_rcFmt0(T.sinCosto)} de ${_rcFmt0(T.unidades)} unidades (${pct}%) no tienen costo</b> —
      sus despachos no tienen costo cargado o les falta la moneda—. El resultado y el margen de los centros marcados salen <b>inflados</b>.</div>`;
  }
  if((T.estimados||0)>0){
    aviso+=`<div class="rc-banner rc-banner-est">≈ ${_rcFmt0(T.estimados)} unidad(es) con el costo convertido a la cotización vigente, porque el despacho está en otra moneda que la factura.</div>`;
  }
  body.innerHTML=aviso + F.map(f=>_rcFila(f,false)).join('') + _rcFila(T,true);
}

/* ─────────── Imprimir ─────────── */
function rccPrint(){
  if(!_rccData){ toast('Consultá primero','err'); return; }
  const D=_rccData, T=D.totales||{};
  const fila=(f,tot)=>`<tr${tot?' class="fin"':''}><td>${tot?'<b>Total</b>':(f.sinAsignar?'Sin asignar':_rcEsc(f.ccos+' '+f.detalle))}${!tot&&f.sinCosto>0?' ⚠':''}</td>
    <td class="r">${_rcFmt0(f.unidades)}</td><td class="r">${_rcFmt(f.ventas)}</td><td class="r">${_rcFmt(f.costos)}</td>
    <td class="r">${_rcFmt(f.impuestos)}</td><td class="r">${_rcFmt(f.otros)}</td><td class="r">${_rcFmt(f.resultado)}</td>
    <td class="r">${f.margen===null?'—':_rcFmt(f.margen)+' %'}</td></tr>`;
  const nota=(T.sinCosto||0)>0?`<p style="font-size:9px">⚠ ${_rcFmt0(T.sinCosto)} de ${_rcFmt0(T.unidades)} unidades sin costo: el resultado de los centros marcados está inflado.</p>`:'';
  sgvPrint({ titulo:'Resultado por Centro de Costos',
    subtitulo:`Período ${_rcFecha(D.desde)} a ${_rcFecha(D.hasta)} — en pesos, comprobantes reales`,
    cuerpo:`<table><thead><tr><th>Centro de costos</th><th class="r">Unidades</th><th class="r">Ventas</th><th class="r">Costos</th>
      <th class="r">IVA + IIBB</th><th class="r">Otros gastos</th><th class="r">Resultado</th><th class="r">Margen</th></tr></thead>
      <tbody>${(D.filas||[]).map(f=>fila(f,false)).join('')}${fila(T,true)}</tbody></table>${nota}`,
    apaisado:true });
}

/* ─────────── Excel ─────────── */
async function rccExcel(){
  if(!_rccData){ toast('Consultá primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_rccData, T=D.totales||{};
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Resultado');
  ws.columns=[{width:12},{width:28},{width:11},{width:16},{width:16},{width:15},{width:15},{width:16},{width:10},{width:13}];
  ws.addRow([`Resultado por Centro de Costos — ${_rcFecha(D.desde)} a ${_rcFecha(D.hasta)}`]).font={bold:true,size:13};
  ws.addRow(['En pesos, sólo comprobantes reales']).font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Centro','Descripción','Unidades','Ventas','Costos','IVA + IIBB','Otros gastos','Resultado','Margen %','Sin costo (u.)']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  const NUM='#,##0.00';
  const add=(f,tot)=>{
    const r=ws.addRow([tot?'':(f.sinAsignar?'':f.ccos), tot?'Total':(f.sinAsignar?'Sin asignar':f.detalle),
      f.unidades,f.ventas,f.costos,f.impuestos,f.otros,f.resultado,f.margen,f.sinCosto||null]);
    [4,5,6,7,8,9].forEach(i=>{ r.getCell(i).numFmt=NUM; });
    if(tot) r.eachCell(c=>{ c.font={bold:true}; c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
  };
  (D.filas||[]).forEach(f=>add(f,false)); add(T,true);
  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Resultado_CCostos_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

function _rcStyle(){
  if(document.getElementById('rcc-style')) return;
  const st=document.createElement('style'); st.id='rcc-style';
  st.textContent=`
    #rcc-head,.rc-row{display:grid;gap:8px;align-items:center;padding:7px 12px}
    #rcc-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3}
    #rcc-head .r,.rc-row .r{text-align:right}
    .rc-row .c{text-align:center}
    .rc-row{font-size:13px;border-bottom:1px solid var(--b1);font-family:var(--mono)}
    .rc-row .rc-cc{font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rc-row:hover{background:var(--s2)}
    .rc-res{font-weight:600}
    .rc-neg{color:var(--red)}
    .rc-sin{color:var(--t2);background:rgba(0,0,0,.02)}
    .rc-tot{background:var(--s2);border-top:2px solid var(--acc);font-weight:600}
    .rc-warn{color:#B45309;cursor:help;font-size:15px}
    .rc-est{color:var(--t2);cursor:help;font-size:15px}
    .rc-banner{margin:10px 12px 4px;padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.5;
      background:rgba(239,159,39,.14);color:#854F0B;border-left:3px solid #EF9F27}
    .rc-banner-est{background:rgba(55,138,221,.08);color:var(--t2);border-left-color:#378ADD}
  `;
  document.head.appendChild(st);
}

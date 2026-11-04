/* ===========================================================================
   COBRANZAS POR CENTRO DE COSTOS  (Cobranzas → Cobranzas por Centro de Costos)
   Ricardo, Nov 2026. Mismo criterio que Comisiones:
   - Sólo cobranzas REALES sobre FACTURAS (sin a cuenta, sin pago de
     percepciones, sin recibos anulados ni sólo contables).
   - Manda la FECHA DE APLICACIÓN del recibo.
   - Importe CON IVA y SIN PERCEPCIONES, en pesos, repartido por centro de
     costos según los renglones de la factura.
   - Listado detallado y, abajo, el total por centro de costos.
   =========================================================================== */

let _ccbData = null;
function _ccbEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _ccbFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _ccbFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
const CCB_GRID='86px 110px minmax(200px,1fr) 125px 120px 125px 85px 135px';
// Nombre del centro de costos (tabla CCOS); si no está, el código
function _ccbCC(c){ const t=((typeof TABLAS!=='undefined'&&TABLAS['CCOS'])||[]).find(x=>(x.CODIGO||'').trim()===c); return t?(t.DETALLE||c):c; }
// Recibo, fecha y cliente sólo en el primer renglón de cada recibo (como el listado del DOS)
function _ccbFilas(){
  let ant=null;
  return (_ccbData.detalle||[]).map(x=>{ const pri=x.reciboId!==ant; ant=x.reciboId; return {...x, pri}; });
}

function renderCobCC(){
  _ccbStyle();
  const d=document.getElementById('ccb-desde'), h=document.getElementById('ccb-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
  ccbConsultar();
}

async function ccbConsultar(){
  const body=document.getElementById('ccb-body'); if(!body) return;
  const de=document.getElementById('ccb-desde')?.value, ha=document.getElementById('ccb-hasta')?.value;
  if(!de||!ha){ toast('Elegí el período','err'); return; }
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Calculando…</div>';
  try{
    const r=await apiGet(`/informes/cobranzas-cc?desde=${de}&hasta=${ha}`);
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_ccbEsc(r.error||'Error')+'</div>'; return; }
    _ccbData=r; _ccbPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_ccbEsc(e.message||'Error')+'</div>'; }
}

// Columnas (Ricardo, Nov 2026): Fecha · Recibo · Cliente · Factura · Centro de
// Costos · Importe · Cotización · Total. Un renglón por aplicación (factura y
// centro), con todos los datos en cada renglón.
function _ccbPintar(){
  const D=_ccbData, T=D.totales||{cobrado:0,cc:{}};
  const head=document.getElementById('ccb-head'), body=document.getElementById('ccb-body');
  head.style.gridTemplateColumns=CCB_GRID;
  head.innerHTML='<span>Fecha</span><span>Recibo</span><span>Cliente</span><span>Factura</span>'
    + '<span>Centro de Costos</span><span class="r">Importe</span><span class="r">Cotización</span><span class="r">Total</span>';
  const filas=_ccbFilas();
  if(!filas.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin cobranzas aplicadas en el período</div>'; return; }
  body.innerHTML=filas.map(x=>`<div class="ccb-row" style="grid-template-columns:${CCB_GRID}">
      <span>${_ccbFecha(x.fecha)}</span><span class="t">${_ccbEsc(x.recibo)}</span>
      <span class="t" title="${_ccbEsc(x.cli)}">${_ccbEsc(x.cliente)}</span>
      <span class="t" style="color:var(--acc)">${_ccbEsc(x.comprobante)}</span>
      <span class="t cc">${_ccbEsc(_ccbCC(x.ccos))}</span>
      <span class="r">${_ccbFmt(x.importe)}</span><span class="r">${_ccbFmt(x.cotiz)}</span>
      <span class="r">${_ccbFmt(x.total)}</span></div>`).join('')
    + `<div class="ccb-row ccb-tot" style="grid-template-columns:${CCB_GRID}">
      <span><b>TOTAL</b></span><span></span><span>${filas.length} aplicaciones</span><span></span>
      <span></span><span></span><span></span><span class="r">${_ccbFmt(T.cobrado)}</span></div>`;
}

// Botón "RESUMEN x CENTRO DE COSTOS": popup con los parciales y el total general
function ccbResumen(){
  if(!_ccbData||!(_ccbData.detalle||[]).length){ toast('Consultá primero','err'); return; }
  const D=_ccbData, CC=D.centros||[], T=D.totales;
  const pct=c=>T.cobrado?_ccbFmt((T.cc[c]||0)*100/T.cobrado):'0,00';
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px';
  ov.innerHTML=`<div style="background:var(--s1,#fff);border-radius:14px;max-width:520px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
    <div style="background:var(--acc,#0a58ca);color:#fff;padding:12px 18px;font-size:16px;font-weight:600">🏢 Resumen por Centro de Costos</div>
    <div style="padding:6px 18px 0;font-size:12px;color:var(--t2)">Período ${_ccbFecha(D.desde)} a ${_ccbFecha(D.hasta)} · con IVA, sin percepciones · en pesos</div>
    <div style="padding:10px 18px">
      ${CC.map(c=>`<div class="ccb-res-r"><span>${_ccbEsc(_ccbCC(c))}</span><span class="r">${_ccbFmt(T.cc[c])}</span><span class="r p">${pct(c)}%</span></div>`).join('')}
      <div class="ccb-res-r tot"><span>TOTAL GENERAL</span><span class="r">${_ccbFmt(T.cobrado)}</span><span class="r p">100,00%</span></div>
    </div>
    <div style="display:flex;justify-content:flex-end;padding:0 18px 16px"><button class="btn pri" id="ccb-res-ok">Cerrar</button></div>
  </div>`;
  const cerrar=()=>{ ov.remove(); document.removeEventListener('keydown',tecla); };
  const tecla=e=>{ if(e.key==='Escape'||e.key==='Enter') cerrar(); };
  ov.addEventListener('click',e=>{ if(e.target===ov) cerrar(); });
  document.body.appendChild(ov);
  ov.querySelector('#ccb-res-ok').onclick=cerrar;
  document.addEventListener('keydown',tecla);
}

function ccbPrint(){
  if(!_ccbData||!(_ccbData.detalle||[]).length){ toast('No hay nada para imprimir','err'); return; }
  const D=_ccbData, CC=D.centros||[], T=D.totales;
  const th='<tr><th>Fecha</th><th>Recibo</th><th>Cliente</th><th>Factura</th><th>Centro de Costos</th>'
    + '<th class="r">Importe</th><th class="r">Cotización</th><th class="r">Total</th></tr>';
  const filas=_ccbFilas().map(x=>`<tr><td>${_ccbFecha(x.fecha)}</td><td>${_ccbEsc(x.recibo)}</td>
    <td>${_ccbEsc(sgvCorta(x.cliente,30))}</td><td>${_ccbEsc(x.comprobante)}</td><td>${_ccbEsc(_ccbCC(x.ccos))}</td>
    <td class="r">${_ccbFmt(x.importe)}</td><td class="r">${_ccbFmt(x.cotiz)}</td><td class="r">${_ccbFmt(x.total)}</td></tr>`).join('');
  const tot=`<tr class="fin"><td colspan="7"><b>TOTAL</b></td><td class="r">${_ccbFmt(T.cobrado)}</td></tr>`;
  const res=`<h3>Total por Centro de Costos</h3><table style="width:auto;min-width:50%"><thead><tr><th>Centro</th><th class="r">Importe</th><th class="r">%</th></tr></thead><tbody>
    ${CC.map(c=>`<tr><td>${_ccbEsc(_ccbCC(c))}</td><td class="r">${_ccbFmt(T.cc[c])}</td><td class="r">${T.cobrado?_ccbFmt((T.cc[c]||0)*100/T.cobrado):'0,00'}%</td></tr>`).join('')}
    <tr class="fin"><td>TOTAL</td><td class="r">${_ccbFmt(T.cobrado)}</td><td class="r">100,00%</td></tr></tbody></table>`;
  sgvPrint({ titulo:'Cobranzas por Centro de Costos',
    subtitulo:`Período ${_ccbFecha(D.desde)} a ${_ccbFecha(D.hasta)} · cobranzas reales sobre facturas · con IVA, sin percepciones · total en pesos`,
    cuerpo:`<table><thead>${th}</thead><tbody>${filas}${tot}</tbody></table><div style="break-inside:avoid">${res}</div>` });
}

async function ccbExcel(){
  if(!_ccbData||!(_ccbData.detalle||[]).length){ toast('No hay nada para exportar','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_ccbData, CC=D.centros||[], T=D.totales, NUM='#,##0.00';
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Cobranzas x CC');
  ws.columns=[{width:12},{width:15},{width:36},{width:15},{width:18},{width:15},{width:11},{width:16}];
  ws.addRow(['Cobranzas por Centro de Costos']).font={bold:true,size:13};
  ws.addRow([`Período ${_ccbFecha(D.desde)} a ${_ccbFecha(D.hasta)} · cobranzas reales sobre facturas · con IVA, sin percepciones · total en pesos`])
    .font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Fecha','Recibo','Cliente','Factura','Centro de Costos','Importe','Cotización','Total']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  _ccbFilas().forEach(x=>{
    const r=ws.addRow([_ccbFecha(x.fecha), x.recibo, x.cliente, x.comprobante, _ccbCC(x.ccos), x.importe, x.cotiz, x.total]);
    r.getCell(6).numFmt=NUM; r.getCell(7).numFmt=NUM; r.getCell(8).numFmt=NUM;
  });
  const rt=ws.addRow(['TOTAL','','','','','','',T.cobrado]); rt.font={bold:true}; rt.getCell(8).numFmt=NUM;
  rt.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
  ws.addRow([]); ws.addRow([]);
  ws.addRow(['Total por Centro de Costos']).font={bold:true};
  const h2=ws.addRow(['Centro','Importe','%']); h2.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  CC.forEach(c=>{ const r=ws.addRow([_ccbCC(c),T.cc[c]||0,T.cobrado?(T.cc[c]||0)/T.cobrado:0]); r.getCell(2).numFmt=NUM; r.getCell(3).numFmt='0.00%'; });
  const rf=ws.addRow(['TOTAL',T.cobrado,1]); rf.font={bold:true}; rf.getCell(2).numFmt=NUM; rf.getCell(3).numFmt='0.00%';
  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer(), a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`CobranzasCC_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

function _ccbStyle(){
  if(document.getElementById('ccb-style')) return;
  const st=document.createElement('style'); st.id='ccb-style';
  st.textContent=`
    #ccb-head,.ccb-row{display:grid;gap:8px;align-items:center;padding:7px 12px}
    #ccb-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3}
    #ccb-head .r,.ccb-row .r{text-align:right}
    .ccb-row{font-size:13px;border-bottom:1px solid var(--b1);font-family:var(--mono)}
    .ccb-row .t{font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
    .ccb-row:hover{background:var(--s2)}
    .ccb-row .cc,#ccb-head .cc{color:#6A5BD0}
    .ccb-row .cc{background:rgba(127,119,221,.07)}
    .ccb-tot{background:var(--s2);border-top:2px solid var(--acc);font-weight:700;position:sticky;bottom:0}
    .ccb-res{margin:18px 12px;max-width:460px;border:1px solid var(--b1);border-radius:6px;overflow:hidden}
    .ccb-res-t{padding:8px 12px;background:var(--s3);font-weight:700;font-size:12px;color:var(--acc);text-transform:uppercase;letter-spacing:.5px}
    .ccb-res-r{display:grid;grid-template-columns:1fr 150px 80px;gap:8px;padding:6px 12px;border-top:1px solid var(--b1);font-family:var(--mono);font-size:13px}
    .ccb-res-r .r{text-align:right} .ccb-res-r .p{color:var(--t2)}
    .ccb-res-r.tot{font-weight:700;background:var(--s2)}
  `;
  document.head.appendChild(st);
}

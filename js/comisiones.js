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

let _comData = null;

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

// La grilla: un renglón por cobro, con una COLUMNA POR CENTRO DE COSTOS, y
// el VENDEDOR como subtítulo —igual que Saldos por Mes—. Cierra con el total
// de cada centro y el total de comisión (Ricardo, Oct 2026).
function _coGrid(nCC){ return `86px 120px 120px 125px repeat(${nCC},120px) 62px 120px`; }

function _coPintar(){
  const body=document.getElementById('com-body'), head=document.getElementById('com-head');
  if(!body||!_comData) return;
  const D=_comData, CC=D.centros||[], T=D.totales||{}, det=D.detalle||[];
  const GRID=_coGrid(CC.length);

  if(head){
    head.style.gridTemplateColumns=GRID;
    // Sólo se comisionan FACTURAS, así que la factura cobrada va a la vista
    head.innerHTML='<span>Fecha</span><span>Recibo</span><span>Factura</span><span class="r">Cobrado</span>'
      + CC.map(c=>`<span class="r cc">${_coEsc(c)}</span>`).join('')
      + '<span class="r">%</span><span class="r">Comisión</span>';
  }
  if(!det.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin cobranzas aplicadas en el período</div>'; return; }

  const aviso = (D.pctFijo!==null && D.pctFijo!==undefined)
    ? `<div class="co-nota">Liquidación del gerente: se aplica <b>${_coFmt(D.pctFijo)}%</b> sobre todo lo cobrado, sin mirar el porcentaje de cada vendedor.</div>`
    : '';

  // Agrupado por vendedor
  const porVend={};
  det.forEach(x=>{ (porVend[x.vend]||(porVend[x.vend]={det:x.vendDet||x.vend,filas:[]})).filas.push(x); });

  const fila=(x,cls)=>`<div class="co-row${cls||''}" style="grid-template-columns:${GRID}">
      <span>${_coFecha(x.fecha)}</span>
      <span class="co-t" style="font-size:12px">${_coEsc(x.recibo)}</span>
      <span class="co-t" style="font-size:12px;color:var(--acc)">${_coEsc(x.comprobante)}</span>
      <span class="r">${_coFmt(x.cobrado)}</span>
      ${CC.map(c=>`<span class="r cc">${x.cc&&x.cc[c]?_coFmt(x.cc[c]):''}</span>`).join('')}
      <span class="r">${_coFmt(x.pct)}</span>
      <span class="r com">${_coFmt(x.comision)}</span>
    </div>`;

  let html='';
  const totGral={cc:{},cobrado:0,comision:0};
  for(const v of Object.keys(porVend).sort((a,b)=>porVend[a].det.localeCompare(porVend[b].det))){
    const g=porVend[v];
    html+=`<div class="co-vend" style="grid-column:1/-1">${_coEsc(v)} — ${_coEsc(g.det)}</div>`;
    html+=g.filas.map(x=>fila(x)).join('');
    // Subtotal del vendedor
    const sub={cc:{},cobrado:0,comision:0};
    g.filas.forEach(x=>{
      CC.forEach(c=>{ if(x.cc&&x.cc[c]){ sub.cc[c]=(sub.cc[c]||0)+x.cc[c]; totGral.cc[c]=(totGral.cc[c]||0)+x.cc[c]; } });
      sub.cobrado+=x.cobrado; sub.comision+=x.comision;
      totGral.cobrado+=x.cobrado; totGral.comision+=x.comision;
    });
    html+=`<div class="co-row co-sub" style="grid-template-columns:${GRID}">
      <span></span><span><b>Subtotal</b></span><span></span>
      <span class="r">${_coFmt(sub.cobrado)}</span>
      ${CC.map(c=>`<span class="r cc">${sub.cc[c]?_coFmt(sub.cc[c]):''}</span>`).join('')}
      <span></span>
      <span class="r com">${_coFmt(sub.comision)}</span>
    </div>`;
  }

  html+=`<div class="co-row co-tot" style="grid-template-columns:${GRID}">
    <span><b>TOTAL</b></span><span></span><span></span>
    <span class="r">${_coFmt(totGral.cobrado)}</span>
    ${CC.map(c=>`<span class="r cc">${totGral.cc[c]?_coFmt(totGral.cc[c]):''}</span>`).join('')}
    <span></span>
    <span class="r com">${_coFmt(totGral.comision)}</span>
  </div>`;

  body.innerHTML=aviso+html;
}

/* ─────────── Imprimir ─────────── */
// Sale LO MISMO QUE SE VE: por vendedor, un renglón por cobro, una columna
// por centro de costos, con subtotales y total (Ricardo, Oct 2026).
function _coAgrupado(){
  const det=(_comData?.detalle)||[], g={};
  det.forEach(x=>{ (g[x.vend]||(g[x.vend]={det:x.vendDet||x.vend,filas:[]})).filas.push(x); });
  return Object.keys(g).sort((a,b)=>g[a].det.localeCompare(g[b].det)).map(v=>({ vend:v, ...g[v] }));
}
function _coSuma(filas, CC){
  const t={cc:{},cobrado:0,comision:0};
  filas.forEach(x=>{
    CC.forEach(c=>{ if(x.cc&&x.cc[c]) t.cc[c]=(t.cc[c]||0)+x.cc[c]; });
    t.cobrado+=x.cobrado; t.comision+=x.comision;
  });
  return t;
}

function comPrint(){
  if(!_comData){ toast('Consultá primero','err'); return; }
  const D=_comData, CC=D.centros||[], grupos=_coAgrupado();
  if(!grupos.length){ toast('No hay nada para imprimir','err'); return; }

  const th=`<tr><th>Fecha</th><th>Recibo</th><th>Factura</th><th class="r">Cobrado</th>`
    + CC.map(c=>`<th class="r cc">${_coEsc(c)}</th>`).join('')
    + `<th class="r">%</th><th class="r">Comisión</th></tr>`;

  let cuerpo='', tot={cc:{},cobrado:0,comision:0};
  for(const g of grupos){
    cuerpo+=`<tr class="vend"><td colspan="${CC.length+6}">${_coEsc(g.vend)} — ${_coEsc(g.det)}</td></tr>`;
    cuerpo+=g.filas.map(x=>`<tr><td>${_coFecha(x.fecha)}</td><td>${_coEsc(x.recibo)}</td>
      <td>${_coEsc(x.comprobante)}</td><td class="r">${_coFmt(x.cobrado)}</td>
      ${CC.map(c=>`<td class="r cc">${x.cc&&x.cc[c]?_coFmt(x.cc[c]):''}</td>`).join('')}
      <td class="r">${_coFmt(x.pct)}</td><td class="r">${_coFmt(x.comision)}</td></tr>`).join('');
    const sub=_coSuma(g.filas, CC);
    cuerpo+=`<tr class="sub"><td colspan="3"><b>Subtotal</b></td><td class="r">${_coFmt(sub.cobrado)}</td>
      ${CC.map(c=>`<td class="r cc">${sub.cc[c]?_coFmt(sub.cc[c]):''}</td>`).join('')}
      <td></td><td class="r"><b>${_coFmt(sub.comision)}</b></td></tr>`;
    CC.forEach(c=>{ if(sub.cc[c]) tot.cc[c]=(tot.cc[c]||0)+sub.cc[c]; });
    tot.cobrado+=sub.cobrado; tot.comision+=sub.comision;
  }
  cuerpo+=`<tr class="fin"><td colspan="3"><b>TOTAL</b></td><td class="r">${_coFmt(tot.cobrado)}</td>
    ${CC.map(c=>`<td class="r cc">${tot.cc[c]?_coFmt(tot.cc[c]):''}</td>`).join('')}
    <td></td><td class="r"><b>${_coFmt(tot.comision)}</b></td></tr>`;

  const sub=`Período ${_coFecha(D.desde)} a ${_coFecha(D.hasta)} · `
    + (D.vend ? ('Vendedor '+_coEsc(D.vend)) : ('Todos los vendedores al '+_coFmt(D.pctFijo)+'%'))
    + ' · sobre lo cobrado, neto de IVA y percepciones, en pesos';

  sgvPrint({ titulo:'Liquidación de Comisiones', subtitulo:sub, apaisado:true,
    estilos:`tr.vend td{background:#e8eef7;font-weight:bold;text-transform:uppercase;font-size:10px}
             tr.sub td{background:#f4f6f9;font-weight:600}
             td.cc,th.cc{color:#6A5BD0}`,
    cuerpo:`<table><thead>${th}</thead><tbody>${cuerpo}</tbody></table>` });
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
  const D=_comData, CC=D.centros||[], grupos=_coAgrupado(), NUM='#,##0.00';
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Comisiones');
  ws.columns=[{width:12},{width:16},{width:16},{width:15},...CC.map(()=>({width:15})),{width:8},{width:15}];

  ws.addRow(['Liquidación de Comisiones']).font={bold:true,size:13};
  ws.addRow([`Período ${_coFecha(D.desde)} a ${_coFecha(D.hasta)} · `
    +(D.vend?('Vendedor '+D.vend):('Todos al '+_coFmt(D.pctFijo)+'%'))
    +' · sobre lo cobrado, neto de IVA y percepciones, en pesos'])
    .font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Fecha','Recibo','Factura','Cobrado',...CC,'%','Comisión']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  const colCC = i => 5 + i;                     // primera columna de centro
  const colPct = 5 + CC.length, colCom = 6 + CC.length;
  const fmtFila = r => { r.getCell(4).numFmt=NUM; CC.forEach((_,i)=>{ r.getCell(colCC(i)).numFmt=NUM; });
                         r.getCell(colPct).numFmt='#,##0.00'; r.getCell(colCom).numFmt=NUM; };

  const tot={cc:{},cobrado:0,comision:0};
  for(const g of grupos){
    const rv=ws.addRow([`${g.vend} — ${g.det}`]);
    rv.font={bold:true}; rv.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EEF7'}};
    g.filas.forEach(x=>{
      const r=ws.addRow([_coFecha(x.fecha), x.recibo, x.comprobante, x.cobrado,
        ...CC.map(c=>(x.cc&&x.cc[c])?x.cc[c]:null), x.pct, x.comision]);
      fmtFila(r);
    });
    const sub=_coSuma(g.filas, CC);
    const rs=ws.addRow(['','','Subtotal', sub.cobrado, ...CC.map(c=>sub.cc[c]||null), null, sub.comision]);
    rs.font={bold:true}; fmtFila(rs);
    CC.forEach(c=>{ if(sub.cc[c]) tot.cc[c]=(tot.cc[c]||0)+sub.cc[c]; });
    tot.cobrado+=sub.cobrado; tot.comision+=sub.comision;
  }
  const rt=ws.addRow(['','','TOTAL', tot.cobrado, ...CC.map(c=>tot.cc[c]||null), null, tot.comision]);
  rt.font={bold:true}; fmtFila(rt);
  rt.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });

  ws.views=[{state:'frozen', ySplit:4}];
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
    /* Los importes por CENTRO DE COSTOS, en violeta, para distinguirlos del
       cobrado y de la comisión (Ricardo, Oct 2026) */
    .co-row .cc,#com-head .cc{color:#6A5BD0}
    .co-row .cc{background:rgba(127,119,221,.07)}
    .co-tot{background:var(--s2);border-top:2px solid var(--acc);font-weight:700}
    .co-sub{background:rgba(55,138,221,.06);font-weight:600;border-bottom:1px solid var(--b1)}
    .co-vend{margin:12px 0 0;padding:7px 12px;background:var(--s3);font-size:12px;font-weight:700;
      color:var(--acc);text-transform:uppercase;letter-spacing:.5px;border-top:1px solid var(--b1)}
    .co-nota{margin:10px 12px;padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.5;
      background:rgba(55,138,221,.10);color:#185FA5}
  `;
  document.head.appendChild(st);
}

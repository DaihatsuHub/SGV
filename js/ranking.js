/* ===========================================================================
   RANKING DE ARTÍCULOS  (Ventas → Ranking de Artículos)
   - Unidades, importe, costo y MARGEN por artículo en un período.
   - TODO EN PESOS: el costo sale del despacho y se convierte con la
     cotización de la tabla de monedas.
   - Facturas suman, notas de crédito restan, anuladas excluidas.
   - Los artículos cuyo costo no se puede determinar (sin despacho, despacho
     sin moneda, moneda sin cotización) van en un bloque APARTE, sin margen:
     no se estima ningún costo.
   =========================================================================== */

let _rkData = null;
let _rkOrden = 'importe';   // importe | margen | margenPct | unid | art

function _rkEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _rkFmt(n){ const v=Number(n)||0; return v===0?'':v.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _rkFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _rkFmtU(n){ const v=Number(n)||0; return v===0?'':v.toLocaleString('es-AR'); }
function _rkFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }

// Llena los combos de filtro (una vez, al abrir la página)
function rkFillCombos(){
  const put=(id, tabla, label)=>{
    const sel=document.getElementById(id); if(!sel) return;
    const cur=sel.value;
    sel.innerHTML=`<option value="">${label}</option>`+
      ((TABLAS&&TABLAS[tabla])||[]).map(x=>`<option value="${_rkEsc(x.CODIGO)}"${x.CODIGO===cur?' selected':''}>${_rkEsc(x.CODIGO)} — ${_rkEsc(x.DETALLE)}</option>`).join('');
  };
  put('rk-marca','MARC','Todas las marcas');
  put('rk-rubro','RUBR','Todos los rubros');
  put('rk-vend','VEND','Todos los vendedores');
}

// Al abrir la pantalla: combos + período por defecto (mes actual)
function renderRanking(){
  rkFillCombos();
  const d=document.getElementById('rk-desde'), h=document.getElementById('rk-hasta');
  if(d && !d.value){
    const hoy=new Date();
    d.value=new Date(hoy.getFullYear(),hoy.getMonth(),1).toISOString().substring(0,10);
  }
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
  if(_rkData) renderRk();
}

async function rkConsultar(){
  const body=document.getElementById('rk-body');
  const qs=[];
  const g=id=>(document.getElementById(id)?.value||'').trim();
  if(g('rk-desde')) qs.push('desde='+g('rk-desde'));
  if(g('rk-hasta')) qs.push('hasta='+g('rk-hasta'));
  if(g('rk-marca')) qs.push('marca='+encodeURIComponent(g('rk-marca')));
  if(g('rk-rubro')) qs.push('rubro='+encodeURIComponent(g('rk-rubro')));
  if(g('rk-vend'))  qs.push('vend='+encodeURIComponent(g('rk-vend')));
  if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Calculando…</div>';
  try{
    const r=await apiGet('/informes/ranking-art'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_rkEsc(r.error||'Error')+'</div>'; return; }
    _rkData=r;
    renderRk();
  }catch(e){
    if(body) body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_rkEsc(e.message||'Error')+'</div>';
  }
}

function rkOrdenar(col){ _rkOrden=col; renderRk(); }

function _rkSort(lista){
  const l=lista.slice();
  if(_rkOrden==='art') l.sort((a,b)=>(a.art||'').localeCompare(b.art||''));
  else if(_rkOrden==='unid') l.sort((a,b)=>b.unid-a.unid);
  else if(_rkOrden==='margen') l.sort((a,b)=>(b.margen||0)-(a.margen||0));
  else if(_rkOrden==='margenPct') l.sort((a,b)=>(b.margenPct||0)-(a.margenPct||0));
  else l.sort((a,b)=>b.importe-a.importe);
  return l;
}

function renderRk(){
  const body=document.getElementById('rk-body'); if(!body) return;
  if(!_rkData){ body.innerHTML='<div class="empty" style="margin-top:40px">Elegí el período y tocá Consultar</div>'; return; }
  const filas=_rkData.filas||[], inc=_rkData.incompletas||[];
  if(!filas.length && !inc.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Sin ventas en el período</div>'; return; }

  const T=_rkData.totales||{}, TI=_rkData.totIncomp||{};
  const flecha=c=>_rkOrden===c?' ▼':'';
  const col=(c,txt)=>`<span class="rk-num rk-ord" onclick="rkOrdenar('${c}')">${txt}${flecha(c)}</span>`;

  let html='';

  // Aviso: sólo entran los comprobantes facturados al 100%
  const C=_rkData.comprobantes;
  if(C){
    html+=`<div style="margin:10px 12px 0;padding:7px 12px;background:var(--s2);border-left:3px solid var(--acc);border-radius:4px;font-size:12px;color:var(--t2)">
      Comprobantes: <b style="color:var(--txt)">${C.al100}</b> al 100% (importe con IVA)
      · <b style="color:var(--txt)">${C.parcial}</b> con descuento (valor real, sin IVA)
      ${C.fuera?`· <b style="color:var(--txt)">${C.fuera}</b> fuera (no mueven stock y depósito)`:''}
    </div>`;
  }

  if(filas.length){
    html+=`<div class="rk-blk">
      <div class="rk-stickyhead">
        <div class="rk-tit">Artículos con costo conocido <span style="opacity:.6;font-weight:400">— ${filas.length} artículo${filas.length===1?'':'s'}</span></div>
        <div class="rk-head">
          <span class="rk-ord" onclick="rkOrdenar('art')">Artículo${flecha('art')}</span>
          <span>Descripción</span><span>Marca</span>
          ${col('unid','Unid')}${col('importe','Importe')}
          <span class="rk-num">Costo</span>
          ${col('margen','Margen')}${col('margenPct','%')}
        </div>
      </div>
      <div class="rk-grid">
        ${_rkSort(filas).map(r=>`<div class="rk-row">
          <span class="rk-art">${_rkEsc(r.art)}</span>
          <span class="rk-des" title="${_rkEsc(r.des)}">${_rkEsc(sgvCorta(r.des,34))}</span>
          <span class="rk-mar">${_rkEsc(r.marca)}</span>
          <span class="rk-num">${_rkFmtU(r.unid)}</span>
          <span class="rk-num">${_rkFmt(r.importe)}</span>
          <span class="rk-num rk-cos">${_rkFmt(r.costo)}</span>
          <span class="rk-num rk-mrg" style="${r.margen<0?'color:var(--red)':''}">${_rkFmt(r.margen)}</span>
          <span class="rk-num rk-pct" style="${r.margenPct<0?'color:var(--red)':''}">${(Number(r.margenPct)||0).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})}</span>
        </div>`).join('')}
        <div class="rk-row rk-fin">
          <span><b>TOTAL</b></span><span></span><span></span>
          <span class="rk-num"><b>${_rkFmtU(T.unid)}</b></span>
          <span class="rk-num"><b>${_rkFmt0(T.importe)}</b></span>
          <span class="rk-num"><b>${_rkFmt0(T.costo)}</b></span>
          <span class="rk-num"><b>${_rkFmt0(T.margen)}</b></span>
          <span class="rk-num"><b>${(Number(T.margenPct)||0).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})}</b></span>
        </div>
      </div>
    </div>`;
  }

  if(inc.length){
    html+=`<div class="rk-blk">
      <div class="rk-stickyhead">
        <div class="rk-tit rk-tit-inc">⚠️ Sin costo determinable — ${inc.length} artículo${inc.length===1?'':'s'}
          <span style="font-size:11px;font-weight:400;color:var(--t2);margin-left:8px">no se estima el costo: se listan aparte, sin margen</span></div>
        <div class="rk-head">
          <span>Artículo</span><span>Descripción</span><span>Marca</span>
          <span class="rk-num">Unid</span><span class="rk-num">Importe</span>
          <span style="grid-column:span 3">Motivo</span>
        </div>
      </div>
      <div class="rk-grid">
        ${inc.map(r=>`<div class="rk-row">
          <span class="rk-art">${_rkEsc(r.art)}</span>
          <span class="rk-des" title="${_rkEsc(r.des)}">${_rkEsc(sgvCorta(r.des,34))}</span>
          <span class="rk-mar">${_rkEsc(r.marca)}</span>
          <span class="rk-num">${_rkFmtU(r.unid)}</span>
          <span class="rk-num">${_rkFmt(r.importe)}</span>
          <span class="rk-mot" style="grid-column:span 3">${_rkEsc(r.motivo)}</span>
        </div>`).join('')}
        <div class="rk-row rk-fin">
          <span><b>TOTAL</b></span><span></span><span></span>
          <span class="rk-num"><b>${_rkFmtU(TI.unid)}</b></span>
          <span class="rk-num"><b>${_rkFmt0(TI.importe)}</b></span>
          <span style="grid-column:span 3"></span>
        </div>
      </div>
    </div>`;
  }

  body.innerHTML=html;
  _rkInjectStyle();
}

function _rkInjectStyle(){
  if(document.getElementById('rk-style')) return;
  const st=document.createElement('style'); st.id='rk-style';
  st.textContent=`
    #rk-body{padding:0 0 12px}
    .rk-blk{margin:12px 12px 22px}
    .rk-stickyhead{position:sticky;top:0;z-index:5}
    .rk-tit{font-size:14px;font-weight:700;color:var(--acc);padding:6px 10px;background:var(--s2);border-bottom:2px solid var(--acc)}
    .rk-tit-inc{color:var(--wrn,#f59e0b);border-bottom-color:var(--wrn,#f59e0b)}
    .rk-grid{border:1px solid var(--b1);border-top:none}
    .rk-head,.rk-row{display:grid;grid-template-columns:120px minmax(180px,1fr) 90px 70px 130px 130px 130px 70px;gap:6px;padding:5px 10px;align-items:center}
    .rk-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)}
    .rk-row{font-size:13px;border-bottom:1px solid var(--b1);background:var(--bg)}
    .rk-row:hover{background:var(--s2)}
    .rk-num{text-align:right;font-family:var(--mono)}
    .rk-ord{cursor:pointer;user-select:none}
    .rk-ord:hover{color:var(--acc)}
    .rk-art{font-family:var(--mono);color:var(--acc)}
    .rk-des,.rk-mot{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .rk-mar{font-family:var(--mono);color:var(--t2);font-size:12px}
    .rk-mot{font-size:12px;color:var(--wrn,#f59e0b)}
    .rk-cos{color:var(--t2)}
    .rk-mrg,.rk-pct{font-weight:600}
    .rk-fin{background:var(--s2);border-top:2px solid var(--acc)}
  `;
  document.head.appendChild(st);
}

/* ─────────── Imprimir ─────────── */
function rkPrint(){
  if(!_rkData){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  const filas=_rkSort(_rkData.filas||[]), inc=_rkData.incompletas||[];
  const T=_rkData.totales||{}, TI=_rkData.totIncomp||{};
  const per=`${_rkData.desde?_rkFecha(_rkData.desde):'inicio'} a ${_rkData.hasta?_rkFecha(_rkData.hasta):'hoy'}`;
  let cuerpo='';

  if(filas.length){
    cuerpo+=`<h3>Artículos con costo conocido</h3>
      <table><thead><tr><th>Artículo</th><th>Descripción</th><th>Marca</th>
        <th class="n">Unid</th><th class="n">Importe</th><th class="n">Costo</th>
        <th class="n">Margen</th><th class="n">%</th></tr></thead><tbody>`
      + filas.map(r=>`<tr><td>${_rkEsc(r.art)}</td><td>${_rkEsc(sgvCorta(r.des,34))}</td><td>${_rkEsc(r.marca)}</td>
          <td class="n">${_rkFmtU(r.unid)}</td><td class="n">${_rkFmt(r.importe)}</td><td class="n">${_rkFmt(r.costo)}</td>
          <td class="n">${_rkFmt(r.margen)}</td><td class="n">${(Number(r.margenPct)||0).toFixed(1)}</td></tr>`).join('')
      + `<tr class="tot"><td colspan="3">TOTAL</td><td class="n">${_rkFmtU(T.unid)}</td>
          <td class="n">${_rkFmt0(T.importe)}</td><td class="n">${_rkFmt0(T.costo)}</td>
          <td class="n">${_rkFmt0(T.margen)}</td><td class="n">${(Number(T.margenPct)||0).toFixed(1)}</td></tr>
        </tbody></table>`;
  }
  if(inc.length){
    cuerpo+=`<h3>Sin costo determinable (no se estima: se listan aparte, sin margen)</h3>
      <table><thead><tr><th>Artículo</th><th>Descripción</th><th>Marca</th>
        <th class="n">Unid</th><th class="n">Importe</th><th>Motivo</th></tr></thead><tbody>`
      + inc.map(r=>`<tr><td>${_rkEsc(r.art)}</td><td>${_rkEsc(sgvCorta(r.des,34))}</td><td>${_rkEsc(r.marca)}</td>
          <td class="n">${_rkFmtU(r.unid)}</td><td class="n">${_rkFmt(r.importe)}</td><td>${_rkEsc(r.motivo)}</td></tr>`).join('')
      + `<tr class="tot"><td colspan="3">TOTAL</td><td class="n">${_rkFmtU(TI.unid)}</td>
          <td class="n">${_rkFmt0(TI.importe)}</td><td></td></tr></tbody></table>`;
  }

  const C=_rkData.comprobantes;
  const nota=C?` · ${C.al100} comprobante(s) al 100% + ${C.parcial} con descuento`:'';
  sgvPrint({
    titulo:'Ranking de Artículos',
    subtitulo:`Período: ${per} — importes en pesos${nota}`,
    cuerpo:cuerpo
  });
}

/* ─────────── Excel ─────────── */
async function _rkLoadExcelJS(){
  if(window.ExcelJS) return window.ExcelJS;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); });
  return window.ExcelJS;
}
async function rkExcel(){
  if(!_rkData){ if(typeof toast==='function') toast('Consultá primero','err'); return; }
  let ExcelJS; try{ ExcelJS=await _rkLoadExcelJS(); }catch(e){ if(typeof toast==='function') toast(e.message,'err'); return; }
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Ranking');
  ws.columns=[{width:16},{width:38},{width:12},{width:10},{width:16},{width:16},{width:16},{width:9}];
  const NUM='#,##0.00', ENT='#,##0';

  const t=ws.addRow(['Ranking de Artículos']); t.font={bold:true,size:13}; ws.mergeCells(t.number,1,t.number,8);
  const per=`Período: ${_rkData.desde?_rkFecha(_rkData.desde):'inicio'} a ${_rkData.hasta?_rkFecha(_rkData.hasta):'hoy'} — importes en pesos`;
  const s=ws.addRow([per]); s.font={italic:true,color:{argb:'FF666666'}}; ws.mergeCells(s.number,1,s.number,8);
  ws.addRow([]);

  const filas=_rkSort(_rkData.filas||[]), inc=_rkData.incompletas||[], T=_rkData.totales||{}, TI=_rkData.totIncomp||{};

  if(filas.length){
    const b=ws.addRow(['Artículos con costo conocido']); b.font={bold:true,size:12,color:{argb:'FF0A58CA'}};
    ws.mergeCells(b.number,1,b.number,8);
    const hr=ws.addRow(['Artículo','Descripción','Marca','Unid','Importe','Costo','Margen','%']);
    hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center'}; c.border={bottom:{style:'thin'}}; });
    filas.forEach(r=>{
      const row=ws.addRow([r.art, r.des, r.marca, r.unid, r.importe, r.costo, r.margen, r.margenPct]);
      row.getCell(4).numFmt=ENT;
      [5,6,7].forEach(i=>row.getCell(i).numFmt=NUM);
      row.getCell(8).numFmt='0.0';
    });
    const fr=ws.addRow(['TOTAL','','',T.unid,T.importe,T.costo,T.margen,T.margenPct]);
    fr.font={bold:true}; fr.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
    fr.getCell(4).numFmt=ENT; [5,6,7].forEach(i=>fr.getCell(i).numFmt=NUM); fr.getCell(8).numFmt='0.0';
    ws.addRow([]);
  }

  if(inc.length){
    const b=ws.addRow(['Sin costo determinable — no se estima el costo']);
    b.font={bold:true,size:12,color:{argb:'FFB45309'}}; ws.mergeCells(b.number,1,b.number,8);
    const hr=ws.addRow(['Artículo','Descripción','Marca','Unid','Importe','Motivo']);
    hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center'}; c.border={bottom:{style:'thin'}}; });
    inc.forEach(r=>{
      const row=ws.addRow([r.art, r.des, r.marca, r.unid, r.importe, r.motivo]);
      row.getCell(4).numFmt=ENT; row.getCell(5).numFmt=NUM;
    });
    const fr=ws.addRow(['TOTAL','','',TI.unid,TI.importe,'']);
    fr.font={bold:true}; fr.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FFB45309'}}}; });
    fr.getCell(4).numFmt=ENT; fr.getCell(5).numFmt=NUM;
  }

  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`Ranking_articulos_${new Date().toISOString().substring(0,10)}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

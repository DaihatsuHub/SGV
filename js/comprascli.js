// ═══════════════════════════════════════════════════════════
// COMPRAS POR CLIENTE (Ricardo, Oct 2026)
// Qué artículos compró un cliente en un período.
//   · Sólo comprobantes que BAJAN STOCK; las NC RESTAN cantidad.
//   · Precio unitario FINAL CON IVA de la ÚLTIMA factura, en su moneda.
//   · El cálculo lo hace el server: GET /informes/compras-cli
// ═══════════════════════════════════════════════════════════

// OJO: prefijo propio `cxc` (antes era `cc` y chocaba con ctacte.js, que usa
// `_ccData` y las clases `.cc-*`: la cuenta corriente dejaba de cargar).
let _cxcData = null;

// Estilos de la pantalla en UN solo lugar (regla: nada de estilos sueltos
// repetidos en cada renglón).
(function(){
  if(document.getElementById('cxc-estilos')) return;
  const st=document.createElement('style'); st.id='cxc-estilos';
  st.textContent=`
    .cxc-grid{display:grid;grid-template-columns:110px minmax(220px,1fr) 110px 170px 110px;gap:8px;
             align-items:center;padding:4px 12px;white-space:nowrap;font-size:12px}
    .cxc-head{font-size:11px;font-weight:600;color:var(--t2);background:var(--s3);
             border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:1;padding:7px 12px}
    .cxc-row{font-family:var(--mono);border-bottom:1px solid var(--b1)}
    .cxc-row:nth-child(even){background:var(--s2)}
    .cxc-row.neg{color:var(--red)}
    .cxc-tot{font-family:var(--mono);font-weight:700;border-top:2px solid var(--acc);padding:7px 12px}
    .cxc-r{text-align:right}
    .cxc-cod{color:var(--acc)}
    .cxc-desc{overflow:hidden;text-overflow:ellipsis;font-family:var(--sans,inherit)}
    .cxc-vacio{color:var(--t3);padding:24px;text-align:center}`;
  document.head.appendChild(st);
})();

function cxcHoyIso(){ const h=new Date(); return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0'); }
function cxcFecha(iso){ return iso ? iso.substring(0,10).split('-').reverse().join('/') : '—'; }
function cxcFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function cxcCant(n){ const v=Number(n)||0; return Number.isInteger(v) ? v.toLocaleString('es-AR') : cxcFmt(v); }
function cxcSimbolo(m){
  try{ if(typeof reciMonInfo==='function'){ const s=reciMonInfo(m,{})?.simbolo; if(s) return s; } }catch(_){}
  return (!m || m==='P') ? '$' : m;
}

// Al entrar a la pantalla: lista de clientes y período de hoy
function cxcInit(){
  const dl=document.getElementById('cxc-cli-list');
  if(dl && !dl.children.length)
    dl.innerHTML=(CLIS||[]).map(c=>`<option value="${esc((c.CLI_CODIGO||'').trim())} — ${esc(c.CLI_RAZON||'')}">`).join('');
  const d=document.getElementById('cxc-desde'), h=document.getElementById('cxc-hasta');
  if(d && !d.value) d.value=cxcHoyIso();
  if(h && !h.value) h.value=cxcHoyIso();
  if(!_cxcData) cxcRender();
}

function cxcCliente(){
  const val=(document.getElementById('cxc-cli')?.value||'').trim(); if(!val) return null;
  if(typeof fichaResolveCli==='function') return fichaResolveCli(val);
  const cod=val.split('—')[0].trim().toUpperCase();
  return (CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===cod)||null;
}

async function cxcConsultar(){
  const c=cxcCliente();
  if(!c){ sgvAviso({titulo:'Falta el cliente', texto:'Elegí un cliente de la lista.', tipo:'adv'}); return; }
  const desde=document.getElementById('cxc-desde').value, hasta=document.getElementById('cxc-hasta').value;
  if(!desde||!hasta){ sgvAviso({titulo:'Falta el período', texto:'Completá desde y hasta.', tipo:'adv'}); return; }
  if(desde>hasta){ sgvAviso({titulo:'Período inválido', texto:'"Desde" no puede ser posterior a "hasta".', tipo:'adv'}); return; }
  const body=document.getElementById('cxc-body');
  body.innerHTML='<div class="cxc-vacio">⏳ Consultando…</div>';
  try{
    const cod=(c.CLI_CODIGO||'').trim();
    const r=await apiGet(`/informes/compras-cli?cli=${encodeURIComponent(cod)}&desde=${desde}&hasta=${hasta}`);
    if(!r.ok){ body.innerHTML=`<div class="cxc-vacio" style="color:var(--red)">${esc(r.error||'Error')}</div>`; return; }
    _cxcData={ ...r, razon:c.CLI_RAZON||'' };
    cxcRender();
  }catch(e){
    body.innerHTML=`<div class="cxc-vacio" style="color:var(--red)">Error: ${esc(e.message||'')}</div>`;
  }
}

function cxcRender(){
  const body=document.getElementById('cxc-body'); if(!body) return;
  if(!_cxcData){ body.innerHTML='<div class="cxc-vacio">Elegí el cliente y el período, y apretá Consultar.</div>'; return; }
  const F=_cxcData.filas||[];
  if(!F.length){ body.innerHTML='<div class="cxc-vacio">El cliente no tiene compras en el período.</div>'; return; }
  const tot=F.reduce((s,x)=>s+(Number(x.cantidad)||0),0);
  body.innerHTML=
    `<div class="cxc-grid cxc-head"><span>Código</span><span>Descripción</span><span class="cxc-r">Cantidad</span>
       <span class="cxc-r">Precio unit. (c/IVA)</span><span class="cxc-r">Últ. compra</span></div>`
    + F.map(x=>`<div class="cxc-grid cxc-row${x.cantidad<0?' neg':''}">
        <span class="cxc-cod">${esc(x.art)}</span>
        <span class="cxc-desc" title="${esc(x.descripcion)}">${esc(x.descripcion)}</span>
        <span class="cxc-r">${cxcCant(x.cantidad)}</span>
        <span class="cxc-r">${x.unitario!=null ? cxcSimbolo(x.moneda)+' '+cxcFmt(x.unitario) : '—'}</span>
        <span class="cxc-r">${cxcFecha(x.ultFec)}</span></div>`).join('')
    + `<div class="cxc-grid cxc-tot"><span></span><span>${F.length} artículo${F.length===1?'':'s'}</span>
        <span class="cxc-r">${cxcCant(tot)}</span><span></span><span></span></div>`;
}

function cxcSubtitulo(){
  const D=_cxcData;
  // Sólo cliente y período: NADA de textos explicativos en los listados (Ricardo, Oct 2026)
  return `${esc(D.cli)} — ${esc(D.razon)} · Período ${cxcFecha(D.desde)} a ${cxcFecha(D.hasta)}`;
}

function cxcImprimir(){
  if(!_cxcData || !(_cxcData.filas||[]).length){ toast('Consultá primero','err'); return; }
  const F=_cxcData.filas, tot=F.reduce((s,x)=>s+(Number(x.cantidad)||0),0);
  const filas=F.map(x=>`<tr><td>${esc(x.art)}</td><td>${esc(sgvCorta(x.descripcion,45))}</td>
      <td class="r">${cxcCant(x.cantidad)}</td>
      <td class="r">${x.unitario!=null ? cxcSimbolo(x.moneda)+' '+cxcFmt(x.unitario) : '—'}</td>
      <td class="r">${cxcFecha(x.ultFec)}</td></tr>`).join('');
  sgvPrint({ titulo:'Compras por Cliente', subtitulo:cxcSubtitulo(),
    cuerpo:`<table><thead><tr><th>Código</th><th>Descripción</th><th class="r">Cantidad</th>
      <th class="r">Precio unit. (c/IVA)</th><th class="r">Últ. compra</th></tr></thead>
      <tbody>${filas}</tbody>
      <tr class="fin"><td></td><td>${F.length} artículos</td><td class="r">${cxcCant(tot)}</td><td></td><td></td></tr></table>` });
}

// Excel CON FORMATO (como Comisiones): título, cliente y período, encabezado
// en negrita, números como números, columnas a medida, títulos fijos y total.
async function cxcExcel(){
  if(!_cxcData || !(_cxcData.filas||[]).length){ toast('Consultá primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const sc=document.createElement('script');
      sc.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      sc.onload=res; sc.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(sc); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_cxcData, F=D.filas, NUM='#,##0.00';
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Compras');
  ws.columns=[{width:16},{width:44},{width:12},{width:9},{width:18},{width:14}];

  ws.addRow(['Compras por Cliente']).font={bold:true,size:13};
  ws.addRow([`${D.cli} — ${D.razon} · Período ${cxcFecha(D.desde)} a ${cxcFecha(D.hasta)}`])
    .font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Código','Descripción','Cantidad','Moneda','Precio unit. c/IVA','Últ. compra']);
  hr.eachCell(c=>{ c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EAED'}};
                   c.border={bottom:{style:'thin'}}; });
  [3,5,6].forEach(n=>hr.getCell(n).alignment={horizontal:'right'});

  F.forEach(x=>{
    const r=ws.addRow([x.art, x.descripcion, Number(x.cantidad)||0, cxcSimbolo(x.moneda),
      x.unitario!=null ? Number(x.unitario) : null, cxcFecha(x.ultFec)]);
    r.getCell(3).numFmt='#,##0.##'; r.getCell(5).numFmt=NUM;
    r.getCell(6).alignment={horizontal:'right'};
    if((Number(x.cantidad)||0)<0) r.font={color:{argb:'FFC00000'}};
  });
  const tot=F.reduce((s,x)=>s+(Number(x.cantidad)||0),0);
  const rt=ws.addRow(['', `${F.length} artículos`, tot]);
  rt.font={bold:true}; rt.getCell(3).numFmt='#,##0.##';
  rt.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });

  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Compras_${D.cli}_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// Se inicializa sola cada vez que la pantalla pasa a estar visible
(function(){
  const arrancar=()=>{
    const pg=document.getElementById('page-comcli');
    if(!pg || !('MutationObserver' in window)) return;
    let visible=pg.offsetParent!==null;
    const chequear=()=>{ const ahora=pg.offsetParent!==null; if(ahora && !visible) cxcInit(); visible=ahora; };
    const obs=new MutationObserver(chequear);
    obs.observe(pg,{attributes:true,attributeFilter:['class','style']});
    if(pg.parentElement) obs.observe(pg.parentElement,{attributes:true,attributeFilter:['class','style']});
    if(visible) cxcInit();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

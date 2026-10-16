// ═══════════════════════════════════════════════════════════
// COMPRAS POR CLIENTE (Ricardo, Oct 2026)
// Qué artículos compró un cliente en un período.
//   · Sólo comprobantes que BAJAN STOCK; las NC RESTAN cantidad.
//   · Precio unitario FINAL CON IVA de la ÚLTIMA factura, en su moneda.
//   · El cálculo lo hace el server: GET /informes/compras-cli
// ═══════════════════════════════════════════════════════════

let _ccData = null;

// Estilos de la pantalla en UN solo lugar (regla: nada de estilos sueltos
// repetidos en cada renglón).
(function(){
  if(document.getElementById('cc-estilos')) return;
  const st=document.createElement('style'); st.id='cc-estilos';
  st.textContent=`
    .cc-grid{display:grid;grid-template-columns:110px minmax(220px,1fr) 110px 170px 110px;gap:8px;
             align-items:center;padding:4px 12px;white-space:nowrap;font-size:12px}
    .cc-head{font-size:11px;font-weight:600;color:var(--t2);background:var(--s3);
             border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:1;padding:7px 12px}
    .cc-row{font-family:var(--mono);border-bottom:1px solid var(--b1)}
    .cc-row:nth-child(even){background:var(--s2)}
    .cc-row.neg{color:var(--red)}
    .cc-tot{font-family:var(--mono);font-weight:700;border-top:2px solid var(--acc);padding:7px 12px}
    .cc-r{text-align:right}
    .cc-cod{color:var(--acc)}
    .cc-desc{overflow:hidden;text-overflow:ellipsis;font-family:var(--sans,inherit)}
    .cc-vacio{color:var(--t3);padding:24px;text-align:center}`;
  document.head.appendChild(st);
})();

function ccHoyIso(){ const h=new Date(); return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0'); }
function ccFecha(iso){ return iso ? iso.substring(0,10).split('-').reverse().join('/') : '—'; }
function ccFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function ccCant(n){ const v=Number(n)||0; return Number.isInteger(v) ? v.toLocaleString('es-AR') : ccFmt(v); }
function ccSimbolo(m){
  try{ if(typeof reciMonInfo==='function'){ const s=reciMonInfo(m,{})?.simbolo; if(s) return s; } }catch(_){}
  return (!m || m==='P') ? '$' : m;
}

// Al entrar a la pantalla: lista de clientes y período de hoy
function ccInit(){
  const dl=document.getElementById('cc-cli-list');
  if(dl && !dl.children.length)
    dl.innerHTML=(CLIS||[]).map(c=>`<option value="${esc((c.CLI_CODIGO||'').trim())} — ${esc(c.CLI_RAZON||'')}">`).join('');
  const d=document.getElementById('cc-desde'), h=document.getElementById('cc-hasta');
  if(d && !d.value) d.value=ccHoyIso();
  if(h && !h.value) h.value=ccHoyIso();
  if(!_ccData) ccRender();
}

function ccCliente(){
  const val=(document.getElementById('cc-cli')?.value||'').trim(); if(!val) return null;
  if(typeof fichaResolveCli==='function') return fichaResolveCli(val);
  const cod=val.split('—')[0].trim().toUpperCase();
  return (CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===cod)||null;
}

async function ccConsultar(){
  const c=ccCliente();
  if(!c){ sgvAviso({titulo:'Falta el cliente', texto:'Elegí un cliente de la lista.', tipo:'adv'}); return; }
  const desde=document.getElementById('cc-desde').value, hasta=document.getElementById('cc-hasta').value;
  if(!desde||!hasta){ sgvAviso({titulo:'Falta el período', texto:'Completá desde y hasta.', tipo:'adv'}); return; }
  if(desde>hasta){ sgvAviso({titulo:'Período inválido', texto:'"Desde" no puede ser posterior a "hasta".', tipo:'adv'}); return; }
  const body=document.getElementById('cc-body');
  body.innerHTML='<div class="cc-vacio">⏳ Consultando…</div>';
  try{
    const cod=(c.CLI_CODIGO||'').trim();
    const r=await apiGet(`/informes/compras-cli?cli=${encodeURIComponent(cod)}&desde=${desde}&hasta=${hasta}`);
    if(!r.ok){ body.innerHTML=`<div class="cc-vacio" style="color:var(--red)">${esc(r.error||'Error')}</div>`; return; }
    _ccData={ ...r, razon:c.CLI_RAZON||'' };
    ccRender();
  }catch(e){
    body.innerHTML=`<div class="cc-vacio" style="color:var(--red)">Error: ${esc(e.message||'')}</div>`;
  }
}

function ccRender(){
  const body=document.getElementById('cc-body'); if(!body) return;
  if(!_ccData){ body.innerHTML='<div class="cc-vacio">Elegí el cliente y el período, y apretá Consultar.</div>'; return; }
  const F=_ccData.filas||[];
  if(!F.length){ body.innerHTML='<div class="cc-vacio">El cliente no tiene compras en el período.</div>'; return; }
  const tot=F.reduce((s,x)=>s+(Number(x.cantidad)||0),0);
  body.innerHTML=
    `<div class="cc-grid cc-head"><span>Código</span><span>Descripción</span><span class="cc-r">Cantidad</span>
       <span class="cc-r">Precio unit. (c/IVA)</span><span class="cc-r">Últ. compra</span></div>`
    + F.map(x=>`<div class="cc-grid cc-row${x.cantidad<0?' neg':''}">
        <span class="cc-cod">${esc(x.art)}</span>
        <span class="cc-desc" title="${esc(x.descripcion)}">${esc(x.descripcion)}</span>
        <span class="cc-r">${ccCant(x.cantidad)}</span>
        <span class="cc-r">${x.unitario!=null ? ccSimbolo(x.moneda)+' '+ccFmt(x.unitario) : '—'}</span>
        <span class="cc-r">${ccFecha(x.ultFec)}</span></div>`).join('')
    + `<div class="cc-grid cc-tot"><span></span><span>${F.length} artículo${F.length===1?'':'s'}</span>
        <span class="cc-r">${ccCant(tot)}</span><span></span><span></span></div>`;
}

function ccSubtitulo(){
  const D=_ccData;
  return `${esc(D.cli)} — ${esc(D.razon)} · Período ${ccFecha(D.desde)} a ${ccFecha(D.hasta)}`
       + ' · Sólo comprobantes que bajan stock; las NC restan · Precio final con IVA de la última factura';
}

function ccImprimir(){
  if(!_ccData || !(_ccData.filas||[]).length){ toast('Consultá primero','err'); return; }
  const F=_ccData.filas, tot=F.reduce((s,x)=>s+(Number(x.cantidad)||0),0);
  const filas=F.map(x=>`<tr><td>${esc(x.art)}</td><td>${esc(sgvCorta(x.descripcion,45))}</td>
      <td class="r">${ccCant(x.cantidad)}</td>
      <td class="r">${x.unitario!=null ? ccSimbolo(x.moneda)+' '+ccFmt(x.unitario) : '—'}</td>
      <td class="r">${ccFecha(x.ultFec)}</td></tr>`).join('');
  sgvPrint({ titulo:'Compras por Cliente', subtitulo:ccSubtitulo(),
    cuerpo:`<table><thead><tr><th>Código</th><th>Descripción</th><th class="r">Cantidad</th>
      <th class="r">Precio unit. (c/IVA)</th><th class="r">Últ. compra</th></tr></thead>
      <tbody>${filas}</tbody>
      <tr class="fin"><td></td><td>${F.length} artículos</td><td class="r">${ccCant(tot)}</td><td></td><td></td></tr></table>` });
}

function ccExcel(){
  if(!_ccData || !(_ccData.filas||[]).length){ toast('Consultá primero','err'); return; }
  const D=_ccData;
  exportToXls(`Compras_${D.cli}_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}`,
    ['Código','Descripción','Cantidad','Moneda','Precio unit. c/IVA','Última compra'],
    D.filas.map(x=>[x.art, x.descripcion, String(x.cantidad).replace('.',','), ccSimbolo(x.moneda),
      x.unitario!=null ? String(x.unitario).replace('.',',') : '', ccFecha(x.ultFec)]));
}

// Se inicializa sola cada vez que la pantalla pasa a estar visible
(function(){
  const arrancar=()=>{
    const pg=document.getElementById('page-comcli');
    if(!pg || !('MutationObserver' in window)) return;
    let visible=pg.offsetParent!==null;
    const chequear=()=>{ const ahora=pg.offsetParent!==null; if(ahora && !visible) ccInit(); visible=ahora; };
    const obs=new MutationObserver(chequear);
    obs.observe(pg,{attributes:true,attributeFilter:['class','style']});
    if(pg.parentElement) obs.observe(pg.parentElement,{attributes:true,attributeFilter:['class','style']});
    if(visible) ccInit();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

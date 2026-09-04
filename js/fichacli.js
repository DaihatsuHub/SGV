// ═══════════════════════════════════════════════════════════
// FICHA DEL CLIENTE (consulta)
// ═══════════════════════════════════════════════════════════

let fichaCliCod = null;
// Los comprobantes que sólo bajan depósito son contables, no ventas reales:
// se ocultan salvo que se pidan expresamente (regla general de SGV).
let _fichaContables = false;
function fichaToggleContables(on){ _fichaContables=!!on; renderFicha(); }

function fichaFillClienteList(){
  const dl=document.getElementById('ficha-cli-list'); if(!dl) return;
  dl.innerHTML=(CLIS||[]).map(c=>`<option value="${esc((c.CLI_CODIGO||'').trim())} — ${esc(c.CLI_RAZON||'')}">`).join('');
}

function fichaResolveCli(val){
  val=(val||'').trim(); if(!val) return null;
  const codPart=val.split('—')[0].trim().toUpperCase();
  let c=CLIS.find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===codPart);
  if(!c) c=CLIS.find(x=>(x.CLI_RAZON||'').trim().toLowerCase()===val.toLowerCase());
  return c||null;
}

function fichaOnPick(){
  const c=fichaResolveCli(document.getElementById('ficha-cli').value);
  if(c){ fichaCliCod=(c.CLI_CODIGO||'').trim(); renderFicha(); }
}
function fichaClear(){ fichaCliCod=null; renderFicha(); }

async function renderFicha(){
  fichaFillClienteList();
  const datos=document.getElementById('ficha-datos');
  const izq=document.getElementById('ficha-izq');
  const der=document.getElementById('ficha-der');
  const pie=document.getElementById('ficha-pie');
  if(!datos) return;

  if(!fichaCliCod){
    datos.innerHTML='<div style="color:var(--t3);padding:24px;text-align:center">Buscá un cliente por razón social o código.</div>';
    if(izq) izq.innerHTML=''; if(der) der.innerHTML=''; if(pie) pie.innerHTML=''; { const _cc=document.getElementById('ficha-cred'); if(_cc) _cc.innerHTML=''; }
    return;
  }
  const c=CLIS.find(x=>(x.CLI_CODIGO||'').trim()===fichaCliCod);
  if(!c){ datos.innerHTML='<div style="color:var(--red);padding:14px">Cliente no encontrado.</div>'; return; }

  // Los datos los arma el SERVER (/ficha/:cli). Antes se calculaban en memoria
  // y hacía falta tener FACS, RECIS, RECI_ITEMS y CHEQUES cargados: si no se
  // había pasado por facturación o recibos, la ficha quedaba esperando.
  datos.innerHTML='<div style="color:var(--t3);padding:24px;text-align:center">⏳ Cargando datos del cliente…</div>';
  if(izq) izq.innerHTML=''; if(der) der.innerHTML=''; if(pie) pie.innerHTML='';
  { const _cc=document.getElementById('ficha-cred'); if(_cc) _cc.innerHTML=''; }

  let D;
  try{
    const qs = _fichaContables ? '?contables=1' : '';
    D = await apiGet('/ficha/'+encodeURIComponent(fichaCliCod)+qs);
    if(!D.ok){ datos.innerHTML='<div style="color:var(--red);padding:14px">'+esc(D.error||'Error')+'</div>'; return; }
  }catch(e){
    console.error('ficha:', e);
    datos.innerHTML='<div style="color:var(--red);padding:14px">Error al cargar la ficha: '+esc(e.message||'')+'</div>';
    return;
  }

  const vend=(typeof reciVendDesc==='function')?reciVendDesc(c.CLI_VEND):'';
  datos.innerHTML=`
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline">
      <div style="font-size:16px;font-weight:700;color:var(--txt)">${esc(c.CLI_RAZON||'')}
        <span style="font-family:var(--mono);color:var(--acc);font-size:13px">${esc((c.CLI_CODIGO||'').trim())}</span></div>
      <div style="font-size:12px;color:var(--t2)">📍 ${esc(c.CLI_DOMIC||'—')}${c.CLI_LOCAL?', '+esc(c.CLI_LOCAL):''} ${esc(PCIA[c.CLI_PROVIN]||c.CLI_PROVIN||'')}</div>
      <div style="font-size:12px;color:var(--t2)">👤 Vendedor: ${esc(vend||c.CLI_VEND||'—')}</div>
    </div>`;

  // ── IZQUIERDA: comprobantes con saldo + A/Cuenta, encolumnado por moneda ──
  const LGRID='80px 1fr 95px 95px 95px';
  let totP=0, totT=0, totC=0, lrows='';
  (D.comprobantes||[]).forEach(f=>{
    const key=reciMonKey(f.moneda), v=f.saldo||0;
    if(key==='pesos') totP+=v; else if(key==='tressa') totT+=v; else totC+=v;
    const fec=(f.fec||'').split('-').reverse().join('/');
    // Los contables (sólo bajan depósito) se marcan: no son ventas reales
    const marca=f.contable?' <span style="font-size:9px;color:var(--wrn,#f59e0b)">CONT</span>':'';
    lrows+=`<div style="display:grid;grid-template-columns:${LGRID};gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0">
      <span style="color:var(--t3)">${fec}</span><span style="color:var(--acc)">${esc(f.nro||'')}${marca}</span>
      <span style="text-align:right">${key==='pesos'?reciFmt(v):''}</span>
      <span style="text-align:right">${key==='tressa'?reciFmt(v):''}</span>
      <span style="text-align:right">${key==='casio'?reciFmt(v):''}</span></div>`;
  });
  (D.acuenta||[]).forEach(a=>{
    const key=reciMonKey(a.moneda), v=a.importe||0;
    if(key==='pesos') totP-=v; else if(key==='tressa') totT-=v; else totC-=v;
    const fec=(a.fec||'').split('-').reverse().join('/'), cell='- '+reciFmt(v);
    lrows+=`<div style="display:grid;grid-template-columns:${LGRID};gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0;color:var(--grn)">
      <span>${fec}</span><span>${esc(a.desc||'A/Cuenta')}</span>
      <span style="text-align:right">${key==='pesos'?cell:''}</span>
      <span style="text-align:right">${key==='tressa'?cell:''}</span>
      <span style="text-align:right">${key==='casio'?cell:''}</span></div>`;
  });
  if(!lrows){ izq.innerHTML='<div style="color:var(--t3);padding:12px">Sin comprobantes con saldo ni A/Cuenta.</div>'; }
  else izq.innerHTML=
    `<div style="display:grid;grid-template-columns:${LGRID};gap:6px;font-size:11px;color:var(--t2);font-weight:600;border-bottom:1px solid var(--b1);padding-bottom:4px;margin-bottom:4px">
      <span>Fecha</span><span>Comprobante</span><span style="text-align:right">Pesos</span><span style="text-align:right">Tressa</span><span style="text-align:right">Casio</span></div>`
    + lrows
    + `<div style="display:grid;grid-template-columns:${LGRID};gap:6px;font-size:12px;font-weight:700;font-family:var(--mono);border-top:1px solid var(--b1);padding-top:4px;margin-top:4px">
      <span></span><span>Saldo</span><span style="text-align:right">${reciFmt(totP)}</span><span style="text-align:right">${reciFmt(totT)}</span><span style="text-align:right">${reciFmt(totC)}</span></div>`;

  // ── DERECHA: cheques encolumnado Físico / ECheq ──
  const hoy=new Date().toISOString().substring(0,10);
  const chs=D.cheques||[];
  const enCart=chs.filter(ch=>(ch.estado||'cartera')==='cartera');
  const otros =chs.filter(ch=>(ch.estado||'cartera')!=='cartera' && (ch.fec||'')>=hoy);
  const RGRID='80px 80px 95px 95px 1fr';
  let totFis=0, totEch=0, rrows='';
  const chRow=(ch,gris)=>{
    const fec=(ch.fec||'').split('-').reverse().join('/');
    const est=(typeof cheqEstadoLabel==='function')?cheqEstadoLabel(ch.estado):(ch.estado||'');
    const imp=ch.importe||0;
    if(ch.fisico) totFis+=imp; else totEch+=imp;
    const estCol=gris?'var(--t3)':((typeof cheqEstadoColor==='function')?cheqEstadoColor(ch.estado):'var(--txt)');
    return `<div style="display:grid;grid-template-columns:${RGRID};gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0;${gris?'color:var(--t3)':''}">
      <span style="color:var(--t3)">${fec}</span><span>${esc(ch.numero||'')}</span>
      <span style="text-align:right">${ch.fisico?reciFmt(imp):''}</span>
      <span style="text-align:right">${!ch.fisico?reciFmt(imp):''}</span>
      <span style="color:${estCol}">${esc(est)}</span></div>`;
  };
  enCart.forEach(ch=>rrows+=chRow(ch,false));
  otros.forEach(ch=>rrows+=chRow(ch,true));
  if(!rrows){ der.innerHTML='<div style="color:var(--t3);padding:12px">Sin cheques.</div>'; }
  else der.innerHTML=
    `<div style="display:grid;grid-template-columns:${RGRID};gap:6px;font-size:11px;color:var(--t2);font-weight:600;border-bottom:1px solid var(--b1);padding-bottom:4px;margin-bottom:4px">
      <span>Fecha</span><span>Número</span><span style="text-align:right">Físico</span><span style="text-align:right">ECheq</span><span>Estado</span></div>`
    + rrows
    + `<div style="display:grid;grid-template-columns:${RGRID};gap:6px;font-size:12px;font-weight:700;font-family:var(--mono);border-top:1px solid var(--b1);padding-top:4px;margin-top:4px">
      <span></span><span>Total</span><span style="text-align:right">${reciFmt(totFis)}</span><span style="text-align:right">${reciFmt(totEch)}</span><span></span></div>`;

  // ── Crédito otorgado + vencimiento (debajo del recuadro de cheques) ──
  const _cred = document.getElementById('ficha-cred');
  if(_cred){
    const _icred = c.CLI_ICRED || 0;
    const _fcred = c.CLI_FCRED ? c.CLI_FCRED.substring(0,10).split('-').reverse().join('/') : '—';
    _cred.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;background:var(--s2);border:1px solid var(--b1);border-radius:6px;padding:8px 12px">
        <span style="color:var(--t2)">💳 Crédito otorgado: <b style="color:var(--txt);font-family:var(--mono)">$ ${reciFmt(_icred)}</b></span>
        <span style="color:var(--t2)">📅 Vto: <b style="color:var(--txt)">${_fcred}</b></span>
      </div>`;
  }

  // ── PIE: última compra / último pago ──
  const fmtD=d=>d?d.substring(0,10).split('-').reverse().join('/'):'—';
  const avisoCont = (!_fichaContables && D.ocultosContables)
    ? ` &nbsp;·&nbsp; <span style="color:var(--wrn,#f59e0b)">${D.ocultosContables} comprobante(s) contable(s) oculto(s)</span>`
    : '';
  pie.innerHTML=`🧾 Última compra (factura): <b style="color:var(--txt)">${fmtD(D.ultCompra)}</b> &nbsp;·&nbsp; 💵 Último pago (recibo): <b style="color:var(--txt)">${fmtD(D.ultPago)}</b>`
    + avisoCont
    + ` &nbsp;·&nbsp; <label style="cursor:pointer;color:var(--t2)"><input type="checkbox" ${_fichaContables?'checked':''} onchange="fichaToggleContables(this.checked)"> ver contables</label>`;
}

// ── Auto-refresco de la ficha ──────────────────────────────
// La ficha se recalcula sola cada vez que se la muestra, pidiendo los datos
// al server. NO depende de que se haya entrado antes a facturación o recibos,
// ni de cómo navegue el sistema.
(function(){
  const refrescar=()=>{ if(typeof fichaCliCod!=='undefined' && fichaCliCod && typeof renderFicha==='function') renderFicha(); };

  // 1) Al clickear "Ficha del Cliente" en el menú (cubre la navegación normal)
  const btn=document.getElementById('ddi-ficha');
  if(btn) btn.addEventListener('click', ()=>setTimeout(refrescar,0));

  // 2) Cuando la página de la ficha pasa a estar VISIBLE (cualquier método).
  //    offsetParent===null cuando la página (o un ancestro) está oculta.
  const pg=document.getElementById('page-ficha');
  if(pg && 'MutationObserver' in window){
    let visible = pg.offsetParent!==null;
    const chequear=()=>{ const ahora=pg.offsetParent!==null; if(ahora && !visible) refrescar(); visible=ahora; };
    const obs=new MutationObserver(chequear);
    obs.observe(pg,{attributes:true,attributeFilter:['class','style']});
    if(pg.parentElement) obs.observe(pg.parentElement,{attributes:true,attributeFilter:['class','style']});
  }
})();

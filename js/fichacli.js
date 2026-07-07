// ═══════════════════════════════════════════════════════════
// FICHA DEL CLIENTE (consulta)
// ═══════════════════════════════════════════════════════════

let fichaCliCod = null;

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

function renderFicha(){
  fichaFillClienteList();
  const datos=document.getElementById('ficha-datos');
  const izq=document.getElementById('ficha-izq');
  const der=document.getElementById('ficha-der');
  const pie=document.getElementById('ficha-pie');
  if(!datos) return;

  if(!fichaCliCod){
    datos.innerHTML='<div style="color:var(--t3);padding:24px;text-align:center">Buscá un cliente por razón social o código.</div>';
    if(izq) izq.innerHTML=''; if(der) der.innerHTML=''; if(pie) pie.innerHTML='';
    return;
  }
  const c=CLIS.find(x=>(x.CLI_CODIGO||'').trim()===fichaCliCod);
  if(!c){ datos.innerHTML='<div style="color:var(--red);padding:14px">Cliente no encontrado.</div>'; return; }

  // Carga diferida: la ficha necesita facturas + recibos + cheques (hoy diferidos)
  if(!window._facsLoaded || (typeof _recisLoaded!=='undefined' && !_recisLoaded)){
    datos.innerHTML='<div style="color:var(--t3);padding:24px;text-align:center">⏳ Cargando datos del cliente…</div>';
    if(izq) izq.innerHTML=''; if(der) der.innerHTML=''; if(pie) pie.innerHTML='';
    Promise.all([ ensureFacturas(), (typeof ensureRecibos==='function'?ensureRecibos():Promise.resolve()) ]).then(()=>renderFicha()).catch(e=>console.error('ficha/carga:',e));
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
  const comps=(FACS||[]).filter(f=>(f.fac_cli||'').trim()===fichaCliCod && (f.fac_saldo||0)>0)
    .sort((a,b)=>(a.fac_fec||'').localeCompare(b.fac_fec||''));
  const acuenta=[];
  (RECI_ITEMS||[]).forEach(it=>{
    if((it.comprobante||'').toUpperCase()!=='A/CUENTA' && !it.a_cuenta) return;
    const rec=(RECIS||[]).find(r=>r.id===it.recibo_id);
    if(!rec || rec.anulado || (rec.cliente||'').trim()!==fichaCliCod) return;
    acuenta.push({it,rec});
  });
  acuenta.sort((a,b)=>(a.rec.fecha||'').localeCompare(b.rec.fecha||''));
  const LGRID='80px 1fr 95px 95px 95px';
  let totP=0, totT=0, totC=0, lrows='';
  comps.forEach(f=>{
    const key=reciMonKey(f.fac_moneda), v=f.fac_saldo||0;
    if(key==='pesos') totP+=v; else if(key==='tressa') totT+=v; else totC+=v;
    const fec=(f.fac_fec||'').substring(0,10).split('-').reverse().join('/');
    lrows+=`<div style="display:grid;grid-template-columns:${LGRID};gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0">
      <span style="color:var(--t3)">${fec}</span><span style="color:var(--acc)">${esc(f.fac_nro||'')}</span>
      <span style="text-align:right">${key==='pesos'?reciFmt(v):''}</span>
      <span style="text-align:right">${key==='tressa'?reciFmt(v):''}</span>
      <span style="text-align:right">${key==='casio'?reciFmt(v):''}</span></div>`;
  });
  acuenta.forEach(a=>{
    const key=reciMonKey(a.it.moneda), v=key==='pesos'?(a.it.abona||0):(a.it.abona_orig||0);
    if(key==='pesos') totP-=v; else if(key==='tressa') totT-=v; else totC-=v;
    const fec=(a.rec.fecha||'').substring(0,10).split('-').reverse().join('/'), cell='- '+reciFmt(v);
    lrows+=`<div style="display:grid;grid-template-columns:${LGRID};gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0;color:var(--grn)">
      <span>${fec}</span><span>A/Cuenta ${esc(a.rec.empresa||'')}${esc(String(a.rec.numero||''))}</span>
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
  const chs=(CHEQUES||[]).filter(ch=>(ch.cliente||'').trim()===fichaCliCod);
  const enCart=chs.filter(ch=>(ch.estado||'cartera')==='cartera').sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  const otros =chs.filter(ch=>(ch.estado||'cartera')!=='cartera' && (ch.fecha||'')>=hoy).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||''));
  const RGRID='80px 80px 95px 95px 1fr';
  let totFis=0, totEch=0, rrows='';
  const chRow=(ch,gris)=>{
    const fec=(ch.fecha||'').substring(0,10).split('-').reverse().join('/');
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

  // ── Crédito otorgado + vencimiento (debajo del cuadro de cheques) ──
  const _icred = c.CLI_ICRED || 0;
  const _fcred = c.CLI_FCRED ? c.CLI_FCRED.substring(0,10).split('-').reverse().join('/') : '—';
  der.innerHTML += `<div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--b1);display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:12px">
      <span style="color:var(--t2)">💳 Crédito otorgado: <b style="color:var(--txt);font-family:var(--mono)">$ ${reciFmt(_icred)}</b></span>
      <span style="color:var(--t2)">📅 Vto: <b style="color:var(--txt)">${_fcred}</b></span>
    </div>`;

  // ── PIE: última compra / último pago ──
  const facsCli=(FACS||[]).filter(f=>(f.fac_cli||'').trim()===fichaCliCod);
  const ultFac=facsCli.filter(f=>(f.fac_nro||'').slice(-1).toUpperCase()==='F').map(f=>f.fac_fec).filter(Boolean).sort().pop();
  const ultPago=(RECIS||[]).filter(r=>(r.cliente||'').trim()===fichaCliCod && !r.anulado).map(r=>r.fecha).filter(Boolean).sort().pop();
  const fmtD=d=>d?d.substring(0,10).split('-').reverse().join('/'):'—';
  pie.innerHTML=`🧾 Última compra (factura): <b style="color:var(--txt)">${fmtD(ultFac)}</b> &nbsp;·&nbsp; 💵 Último pago (recibo): <b style="color:var(--txt)">${fmtD(ultPago)}</b>`;
}

// ── Auto-refresco de la ficha ──────────────────────────────
// La ficha se recalcula sola cada vez que se la muestra, con datos
// frescos de memoria (FACS, RECIS, CHEQUES, RECI_ITEMS). NO depende
// de recibos/facturación ni de cómo navegue el sistema.
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

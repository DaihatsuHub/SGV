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

  const vend=(typeof reciVendDesc==='function')?reciVendDesc(c.CLI_VEND):'';
  datos.innerHTML=`
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:baseline">
      <div style="font-size:16px;font-weight:700;color:var(--txt)">${esc(c.CLI_RAZON||'')}
        <span style="font-family:var(--mono);color:var(--acc);font-size:13px">${esc((c.CLI_CODIGO||'').trim())}</span></div>
      <div style="font-size:12px;color:var(--t2)">📍 ${esc(c.CLI_DOMIC||'—')}${c.CLI_LOCAL?', '+esc(c.CLI_LOCAL):''} ${esc(PCIA[c.CLI_PROVIN]||c.CLI_PROVIN||'')}</div>
      <div style="font-size:12px;color:var(--t2)">👤 Vendedor: ${esc(vend||c.CLI_VEND||'—')}</div>
    </div>`;

  // ── IZQUIERDA: comprobantes con saldo + A/Cuenta, por moneda ──
  const monedas=[['P','pesos','Pesos','$'],['C','casio','Dólar Casio','U$C'],['T','tressa','Dólar Tressa','U$T']];
  const comps=(FACS||[]).filter(f=>(f.fac_cli||'').trim()===fichaCliCod && (f.fac_saldo||0)>0);
  const acuenta=[];
  (RECI_ITEMS||[]).forEach(it=>{
    if((it.comprobante||'').toUpperCase()!=='A/CUENTA' && !it.a_cuenta) return;
    const rec=(RECIS||[]).find(r=>r.id===it.recibo_id);
    if(!rec || rec.anulado || (rec.cliente||'').trim()!==fichaCliCod) return;
    acuenta.push({it,rec});
  });

  let izqHtml='';
  monedas.forEach(([cod,key,label,sig])=>{
    const cs=comps.filter(f=>reciMonKey(f.fac_moneda)===key);
    const acs=acuenta.filter(a=>reciMonKey(a.it.moneda)===key);
    if(!cs.length && !acs.length) return;
    const totComp=cs.reduce((s,f)=>s+(f.fac_saldo||0),0);
    const totAc=acs.reduce((s,a)=>s+(key==='pesos'?(a.it.abona||0):(a.it.abona_orig||0)),0);
    const neto=totComp-totAc;
    izqHtml+=`<div style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--acc);border-bottom:1px solid var(--b1);padding:4px 0;margin-bottom:4px">${label}</div>`;
    cs.forEach(f=>{
      const fec=(f.fac_fec||'').substring(0,10).split('-').reverse().join('/');
      izqHtml+=`<div style="display:grid;grid-template-columns:1fr 80px 110px;gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0">
        <span style="color:var(--acc)">${esc(f.fac_nro||'')}</span><span style="color:var(--t3)">${fec}</span>
        <span style="text-align:right">${sig} ${reciFmt(f.fac_saldo||0)}</span></div>`;
    });
    acs.forEach(a=>{
      const fec=(a.rec.fecha||'').substring(0,10).split('-').reverse().join('/');
      const imp=key==='pesos'?(a.it.abona||0):(a.it.abona_orig||0);
      izqHtml+=`<div style="display:grid;grid-template-columns:1fr 80px 110px;gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0;color:var(--grn)">
        <span>A/Cuenta (Rec ${esc(a.rec.empresa||'')}${esc(String(a.rec.numero||''))})</span><span>${fec}</span>
        <span style="text-align:right">- ${sig} ${reciFmt(imp)}</span></div>`;
    });
    izqHtml+=`<div style="display:grid;grid-template-columns:1fr 110px;gap:6px;font-size:12px;font-weight:700;border-top:1px solid var(--b1);padding-top:4px;margin-top:2px">
      <span>Saldo ${label}</span><span style="text-align:right;font-family:var(--mono)">${sig} ${reciFmt(neto)}</span></div></div>`;
  });
  if(!izqHtml) izqHtml='<div style="color:var(--t3);padding:12px">Sin comprobantes con saldo ni A/Cuenta.</div>';
  izq.innerHTML=izqHtml;

  // ── DERECHA: cheques (en cartera + otros con fecha ≥ hoy) ──
  const hoy=new Date().toISOString().substring(0,10);
  const chs=(CHEQUES||[]).filter(ch=>(ch.cliente||'').trim()===fichaCliCod);
  const enCart=chs.filter(ch=>(ch.estado||'cartera')==='cartera');
  const otros =chs.filter(ch=>(ch.estado||'cartera')!=='cartera' && (ch.fecha||'')>=hoy);
  const chRow=(ch,color)=>{
    const fec=(ch.fecha||'').substring(0,10).split('-').reverse().join('/');
    const est=(typeof cheqEstadoLabel==='function')?cheqEstadoLabel(ch.estado):(ch.estado||'');
    return `<div style="display:grid;grid-template-columns:70px 80px 1fr 100px;gap:6px;font-size:12px;font-family:var(--mono);padding:2px 0;${color?'color:'+color:''}">
      <span>${esc(ch.numero||'')}</span><span style="color:var(--t3)">${fec}</span>
      <span>${esc(est)}</span><span style="text-align:right">${reciFmt(ch.importe||0)}</span></div>`;
  };
  let derHtml='';
  if(enCart.length){
    derHtml+=`<div style="font-size:12px;font-weight:600;color:var(--acc);border-bottom:1px solid var(--b1);padding:4px 0;margin-bottom:4px">En cartera</div>`;
    enCart.forEach(ch=>derHtml+=chRow(ch,''));
  }
  if(otros.length){
    derHtml+=`<div style="font-size:12px;font-weight:600;color:var(--t3);border-bottom:1px solid var(--b1);padding:4px 0;margin:10px 0 4px">Otros (fecha ≥ hoy)</div>`;
    otros.forEach(ch=>derHtml+=chRow(ch,'var(--t3)'));
  }
  const totCheq=[...enCart,...otros].reduce((s,ch)=>s+(ch.importe||0),0);
  if(!derHtml) derHtml='<div style="color:var(--t3);padding:12px">Sin cheques.</div>';
  else derHtml+=`<div style="display:grid;grid-template-columns:1fr 100px;gap:6px;font-size:12px;font-weight:700;border-top:1px solid var(--b1);padding-top:4px;margin-top:6px">
    <span>Total cheques</span><span style="text-align:right;font-family:var(--mono)">${reciFmt(totCheq)}</span></div>`;
  der.innerHTML=derHtml;

  // ── PIE: última compra / último pago ──
  const facsCli=(FACS||[]).filter(f=>(f.fac_cli||'').trim()===fichaCliCod);
  const ultFac=facsCli.filter(f=>(f.fac_nro||'').slice(-1).toUpperCase()==='F').map(f=>f.fac_fec).filter(Boolean).sort().pop();
  const ultPago=(RECIS||[]).filter(r=>(r.cliente||'').trim()===fichaCliCod && !r.anulado).map(r=>r.fecha).filter(Boolean).sort().pop();
  const fmtD=d=>d?d.substring(0,10).split('-').reverse().join('/'):'—';
  pie.innerHTML=`🧾 Última compra (factura): <b style="color:var(--txt)">${fmtD(ultFac)}</b> &nbsp;·&nbsp; 💵 Último pago (recibo): <b style="color:var(--txt)">${fmtD(ultPago)}</b>`;
}

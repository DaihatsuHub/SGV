/* ===========================================================================
   DASHBOARD / PANEL DE CONTROL   (Ventas → Panel)
   - Los números del día en una sola pantalla: ventas, deuda, cartera y alertas.
   - Mide el NEGOCIO REAL: sólo comprobantes que mueven stock, con importes
     reales (nunca los declarados a AFIP). El server ya lo filtra así.
   - Permiso propio 'dash'/'ver' — no es información para todos.
   =========================================================================== */

let _dashData = null;

function _dEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _dFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _dCorto(n){
  const v=Math.abs(Number(n)||0);
  if(v>=1e6) return (n/1e6).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+' M';
  if(v>=1e3) return (n/1e3).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0})+' mil';
  return _dFmt(n);
}
function _dDia(f){
  const p=(f||'').split('-'); if(p.length!==3) return '';
  const d=new Date(+p[0], +p[1]-1, +p[2]);
  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
}
function _dFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }

// Símbolo de la moneda, de la tabla MONE
function _dSimb(cod){
  const m=((TABLAS&&TABLAS['MONE'])||[]).find(x=>x.CODIGO===cod);
  return m ? (m.STRING1||cod) : (cod==='P'?'$':cod);
}
// Un color por moneda, estable entre el gráfico y la referencia
// Un color por moneda, el MISMO en la barrita de composición y en el gráfico
const _DASH_COLORES={ P:'#378ADD', C:'#1D9E75', T:'#EF9F27', K:'#7F77DD', A:'#D4537E' };

// Un color por TEMA para las tarjetas: fondo suave + texto oscuro del mismo tono.
// Siempre el mismo: ventas azul, cobranzas verde, deuda ámbar, cartera violeta.
const _DASH_TEMA={
  ventas:  { bg:'rgba(55,138,221,.13)',  tx:'#185FA5' },
  cobro:   { bg:'rgba(29,158,117,.13)',  tx:'#0F6E56' },
  deuda:   { bg:'rgba(239,159,39,.16)',  tx:'#854F0B' },
  cartera: { bg:'rgba(127,119,221,.15)', tx:'#534AB7' }
};

// Importe abreviado para la tarjeta ("$ 43,97 M"); el completo va en el tooltip
function _dAbrev(n){
  const v=Number(n)||0, a=Math.abs(v);
  if(a>=1e6) return '$ '+(v/1e6).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2})+' M';
  return '$ '+v.toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:0});
}
// Barrita horizontal de composición: [{v, c}]
function _dBarra(partes){
  const tot=partes.reduce((a,p)=>a+Math.max(0,p.v),0); if(tot<=0) return '';
  return '<div class="dash-bar2">'+partes.filter(p=>p.v>0)
    .map(p=>`<div style="width:${(p.v/tot*100).toFixed(1)}%;background:${p.c}" title="${_dEsc(p.t||'')}"></div>`).join('')+'</div>';
}
function _dColorMon(cod){
  if(_DASH_COLORES[cod]) return _DASH_COLORES[cod];
  const paleta=['#2563eb','#0f9d58','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899'];
  let h=0; for(const ch of String(cod)) h=(h*31+ch.charCodeAt(0))>>>0;
  return paleta[h%paleta.length];
}

// Parcial POR MONEDA debajo del total. La moneda dice de qué mercadería se
// trata, así que el desglose informa tanto como la cifra.
function _dPorMoneda(obj){
  if(!obj) return '';
  const claves=Object.keys(obj).filter(k=>Math.abs(Number(obj[k])||0)>0.005)
    .sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));
  if(!claves.length || (claves.length===1 && claves[0]==='P')) return '';
  return `<div class="dash-mon">`+claves.map(k=>
    `<span><i>${_dEsc(_dSimb(k))}</i> ${_dFmt(obj[k])}</span>`).join('')+`</div>`;
}

// Llena los combos de filtro
function dashFillCombos(){
  const put=(id,tabla,label)=>{
    const sel=document.getElementById(id); if(!sel||sel.options.length>1) return;
    sel.innerHTML=`<option value="">${label}</option>`+
      ((TABLAS&&TABLAS[tabla])||[]).map(x=>`<option value="${_dEsc(x.CODIGO)}">${_dEsc(x.CODIGO)} — ${_dEsc(x.DETALLE)}</option>`).join('');
  };
  put('dash-marca','MARC','Todas las marcas');
  put('dash-rubro','RUBR','Todos los rubros');
  put('dash-vend','VEND','Todos los vendedores');
  put('dash-ccos','CCOS','Todos los centros');
}

function renderDashboard(){
  dashFillCombos();
  if(!_dashData) dashConsultar();
  else pintarDash();
}

async function dashConsultar(){
  const body=document.getElementById('dash-body'); if(!body) return;
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const qs=[];
  if(g('dash-desde')) qs.push('desde='+g('dash-desde'));
  if(g('dash-hasta')) qs.push('hasta='+g('dash-hasta'));
  ['marca','rubro','vend','ccos'].forEach(k=>{ if(g('dash-'+k)) qs.push(k+'='+encodeURIComponent(g('dash-'+k))); });
  body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Cargando…</div>';
  try{
    const r=await apiGet('/dashboard'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_dEsc(r.error||'Error')+'</div>'; return; }
    _dashData=r;
    // Reflejar el período que resolvió el server
    if(!g('dash-desde')&&r.desde){ const e=document.getElementById('dash-desde'); if(e) e.value=r.desde; }
    if(!g('dash-hasta')&&r.hasta){ const e=document.getElementById('dash-hasta'); if(e) e.value=r.hasta; }
    pintarDash();
  }catch(e){
    body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_dEsc(e.message||'Error')+'</div>';
  }
}

function pintarDash(){
  const body=document.getElementById('dash-body'); if(!body||!_dashData) return;
  const D=_dashData, V=D.ventas||{}, C=D.cobranzas||{}, CH=D.cheques||{}, A=D.alertas||{}, CO=D.cobrado||{};

  const tarjeta=(tema,icono,titulo,importe,pie,extra,colorPie)=>{
    const T=_DASH_TEMA[tema];
    return `<div class="dash-card" style="background:${T.bg}">
      <div class="dash-lbl" style="color:${T.tx}"><i class="ti ti-${icono}" aria-hidden="true"></i>${titulo}</div>
      <div class="dash-val" title="$ ${_dFmt(importe)}">${_dAbrev(importe)}</div>
      ${extra||''}
      <div class="dash-pie" style="color:${colorPie||T.tx}">${pie||''}</div>
    </div>`;
  };

  // Composición de lo vendido en el período, en pesos, por moneda
  const pp=V.pesPeriodo||{};
  const barVend=_dBarra(Object.keys(pp).map(m=>({v:pp[m], c:_dColorMon(m), t:_dSimb(m)+' $ '+_dFmt(pp[m])})));
  // Por cobrar: al día vs. vencido a más de 90 días
  const barDeuda=(C.deuda>0) ? _dBarra([
    {v:(C.deuda||0)-(C.vencida||0), c:'#97C459', t:'Al día'},
    {v:C.vencida||0, c:'#E24B4A', t:'Más de 90 días'}]) : '';

  const nomMes=(()=>{ const f=(D.hasta||'').split('-'); const ms=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return (D.desde||'').substring(0,7)===(D.hasta||'').substring(0,7) && f[1] ? ms[+f[1]-1] : 'el período'; })();

  const cards=`<div class="dash-cards">
    ${tarjeta('ventas','shopping-cart','Vendido hoy',V.hoy,`${V.compHoy||0} comprobante${V.compHoy===1?'':'s'}`)}
    ${tarjeta('ventas','chart-bar','Vendido en '+nomMes,V.periodo,`${V.compPeriodo||0} comprobante${V.compPeriodo===1?'':'s'}`,barVend)}
    ${tarjeta('cobro','cash','Cobrado hoy',CO.hoy,`${_dAbrev(CO.periodo)} en ${nomMes==='el período'?'el período':'el mes'}`)}
    ${tarjeta('deuda','receipt','Por cobrar',C.deuda, C.vencida>0?`${_dAbrev(C.vencida)} con +90 días`:'sin deuda vencida', barDeuda, C.vencida>0?'#A32D2D':null)}
    ${tarjeta('cartera','wallet','Cheques en cartera',CH.cartera, CH.vencenPronto?`${CH.vencenPronto} vence${CH.vencenPronto===1?'':'n'} esta semana`:'ninguno vence esta semana', '', CH.vencenPronto?'#854F0B':null)}
  </div>`;

  // Gráfico: barras apiladas por moneda, con el total arriba de cada día
  const serie=D.serie||[];
  const max=Math.max(1,...serie.map(x=>Math.abs(x.importe)));
  const monsSerie=[...new Set(serie.flatMap(x=>Object.keys(x.porMoneda||{})))]
    .sort((a,b)=>(a==='P'?-1:b==='P'?1:0)||a.localeCompare(b));
  const barras=serie.map(x=>{
    const esHoy=x.fecha===D.hoy, pm=x.porMoneda||{}, total=Math.abs(x.importe);
    const alto=total>0.005?Math.max(3,Math.round(total/max*104)):0;
    const franjas=total>0.005 ? monsSerie.filter(m=>Math.abs(pm[m]||0)>0.005).map(m=>
      `<div style="height:${Math.max(1,Math.round(Math.abs(pm[m])/total*alto))}px;background:${_dColorMon(m)}" title="${_dEsc(_dSimb(m))} $ ${_dFmt(pm[m])}"></div>`).join('') : '';
    const etiq = total>0.005 ? `<div class="dash-bar-v" style="${esHoy?'font-weight:600;color:var(--txt)':''}">${_dCorto(x.importe)}</div>` : '';
    return `<div class="dash-bar-col" title="${_dFecha(x.fecha)}: $ ${_dFmt(x.importe)}">
      ${etiq}
      ${alto ? `<div class="dash-bar" style="height:${alto}px">${franjas}</div>` : '<div class="dash-bar-0"></div>'}
      <span style="${esHoy?'color:var(--txt);font-weight:600':'color:var(--t3)'}">${esHoy?'Hoy':_dDia(x.fecha)}</span>
    </div>`;
  }).join('');
  const refer = monsSerie.length ? `<div class="dash-ref">`+monsSerie.map(m=>
      `<span><i style="background:${_dColorMon(m)}"></i>${_dEsc(_dSimb(m))}</span>`).join('')+`</div>` : '';

  // Requiere atención: la cantidad destacada, rojo lo urgente y ámbar lo que puede esperar
  const alerta=(n,txt,grave,accion)=>
    `<div class="dash-alert" onclick="${accion}">
       <span class="dash-badge ${grave?'grave':'aviso'}">${n}</span>
       <span style="flex:1">${txt}</span><span class="dash-chev">›</span>
     </div>`;
  let alertas='';
  if(A.sinCae)        alertas+=alerta(A.sinCae, `comprobante${A.sinCae===1?'':'s'} sin CAE`, true, "showSubPage('ven','fac')");
  if(A.sinEntrega)    alertas+=alerta(A.sinEntrega, `factura${A.sinEntrega===1?'':'s'} sin fecha de entrega`, false, "showSubPage('ven','fac')");
  if(CH.vencenPronto) alertas+=alerta(CH.vencenPronto, `cheque${CH.vencenPronto===1?'':'s'} vence${CH.vencenPronto===1?'':'n'} esta semana`, false, "showSubPage('cob','cart')");
  if(C.vencida>0)     alertas+=alerta('$', `${_dAbrev(C.vencida)} vencido a +90 días`, true, "showSubPage('cob','antig')");
  if(!alertas) alertas='<div class="dash-alert" style="cursor:default;color:var(--grn)">✓ Nada pendiente de atención</div>';

  body.innerHTML=`
    <div class="dash-wrap">
      ${cards}
      <div class="dash-fila">
        <div class="dash-panel">
          <div class="dash-tit"><span>Últimos 7 días</span>${refer}</div>
          <div class="dash-bars">${barras}</div>
        </div>
        <div class="dash-panel">
          <div class="dash-tit"><span>Requiere atención</span></div>
          ${alertas}
        </div>
      </div>
    </div>`;
  _dashStyle();
}

function _dashStyle(){
  // Íconos: el juego Tabler, un solo estilo en toda la pantalla (en vez de
  // emojis, que se ven distinto en cada computadora)
  if(!document.getElementById('tabler-icons')){
    const l=document.createElement('link'); l.id='tabler-icons'; l.rel='stylesheet';
    l.href='https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css';
    document.head.appendChild(l);
  }
  if(document.getElementById('dash-style')) return;
  const st=document.createElement('style'); st.id='dash-style';
  st.textContent=`
    #dash-body{padding:0 0 16px;overflow:auto}
    #page-dash .toolbar{flex-wrap:wrap;row-gap:6px}
    #page-dash .toolbar select{min-width:0 !important;width:140px}
    #page-dash .toolbar input[type=date]{width:136px !important}
    .dash-wrap{margin:12px 14px 0}
    .dash-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px}
    .dash-card{border-radius:12px;padding:12px 14px;min-width:0}
    .dash-lbl{display:flex;align-items:center;gap:7px;font-size:13px;margin-bottom:6px}
    .dash-lbl i{font-size:18px}
    .dash-val{font-size:24px;font-weight:600;color:var(--txt);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .dash-pie{font-size:12px;margin-top:4px}
    .dash-bar2{display:flex;height:5px;border-radius:3px;overflow:hidden;margin-top:7px;background:rgba(0,0,0,.06)}
    .dash-fila{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:10px}
    .dash-panel{background:var(--s2);border:1px solid var(--b1);border-radius:12px;padding:12px 16px}
    .dash-tit{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600;color:var(--txt);margin-bottom:10px}
    .dash-ref{display:flex;gap:10px;font-size:11px;font-weight:400;color:var(--t2)}
    .dash-ref span{display:flex;align-items:center;gap:4px}
    .dash-ref i{width:9px;height:9px;border-radius:2px;display:block}
    .dash-bars{display:flex;align-items:flex-end;gap:10px;height:140px}
    .dash-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;min-width:0}
    .dash-bar{width:100%;border-radius:3px 3px 0 0;overflow:hidden;display:flex;flex-direction:column-reverse}
    .dash-bar-0{width:100%;height:2px;background:var(--b1)}
    .dash-bar-v{font-size:10px;color:var(--t2);white-space:nowrap}
    .dash-bar-col>span{font-size:11px}
    .dash-alert{display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid var(--b1);font-size:13px;color:var(--txt);cursor:pointer}
    .dash-alert:last-child{border-bottom:none}
    .dash-alert:hover{background:var(--s3)}
    .dash-badge{min-width:28px;text-align:center;font-size:12px;font-weight:600;padding:2px 7px;border-radius:6px}
    .dash-badge.grave{background:rgba(226,75,74,.14);color:#A32D2D}
    .dash-badge.aviso{background:rgba(239,159,39,.18);color:#854F0B}
    .dash-chev{color:var(--t3);font-size:16px}
    @media(max-width:900px){ .dash-fila{grid-template-columns:1fr} }
  `;
  document.head.appendChild(st);
}

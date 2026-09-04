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
  const D=_dashData, V=D.ventas||{}, C=D.cobranzas||{}, CH=D.cheques||{}, A=D.alertas||{};

  const tarjeta=(titulo,valor,pie,color)=>`
    <div class="dash-card">
      <div class="dash-lbl">${titulo}</div>
      <div class="dash-val">${valor}</div>
      <div class="dash-pie" style="${color?'color:'+color:''}">${pie||''}</div>
    </div>`;

  // Gráfico de los últimos 7 días: barras proporcionales al máximo
  const serie=D.serie||[];
  const max=Math.max(1,...serie.map(x=>Math.abs(x.importe)));
  const barras=serie.map((x,i)=>{
    const h=Math.max(2,Math.round(Math.abs(x.importe)/max*110));
    const esHoy=x.fecha===D.hoy;
    return `<div class="dash-bar-col" title="${_dFecha(x.fecha)}: ${_dFmt(x.importe)}">
      <div class="dash-bar" style="height:${h}px;background:${esHoy?'var(--acc)':'var(--b2,#8ab4f8)'}"></div>
      <span style="${esHoy?'color:var(--txt);font-weight:600':'color:var(--t3)'}">${esHoy?'Hoy':_dDia(x.fecha)}</span>
    </div>`;
  }).join('');

  // Alertas: cada línea lleva al listado correspondiente
  const alerta=(icono,txt,color,accion)=>
    `<div class="dash-alert"${accion?` onclick="${accion}" style="cursor:pointer"`:''}>
       <span style="color:${color}">${icono}</span><span>${txt}</span>
     </div>`;
  let alertas='';
  if(A.sinCae)      alertas+=alerta('⚠️',`${A.sinCae} comprobante${A.sinCae===1?'':'s'} sin CAE`,'var(--red)',"showSubPage('ven','fac')");
  if(A.sinEntrega)  alertas+=alerta('🚚',`${A.sinEntrega} factura${A.sinEntrega===1?'':'s'} sin fecha de entrega`,'var(--wrn,#f59e0b)',"showSubPage('ven','fac')");
  if(CH.vencenPronto) alertas+=alerta('📅',`${CH.vencenPronto} cheque${CH.vencenPronto===1?'':'s'} vence${CH.vencenPronto===1?'':'n'} esta semana`,'var(--wrn,#f59e0b)',"showSubPage('cob','cart')");
  if(C.vencida>0)   alertas+=alerta('💰',`$ ${_dCorto(C.vencida)} con más de 90 días`,'var(--red)',"showSubPage('cob','antig')");
  if(!alertas) alertas='<div class="dash-alert" style="color:var(--grn)">✓ Nada pendiente de atención</div>';

  body.innerHTML=`
    <div class="dash-wrap">
      <div class="dash-cards">
        ${tarjeta('Vendido hoy','$ '+_dFmt(V.hoy),`${V.compHoy||0} comprobante${V.compHoy===1?'':'s'}`,'var(--t2)')}
        ${tarjeta('Vendido en el período','$ '+_dFmt(V.periodo),`${V.compPeriodo||0} comprobante${V.compPeriodo===1?'':'s'}`,'var(--t2)')}
        ${tarjeta('Por cobrar','$ '+_dFmt(C.deuda), C.vencida>0?`$ ${_dCorto(C.vencida)} con más de 90 días`:'sin deuda vencida', C.vencida>0?'var(--red)':'var(--grn)')}
        ${tarjeta('Cheques en cartera','$ '+_dFmt(CH.cartera), CH.vencenPronto?`${CH.vencenPronto} vence${CH.vencenPronto===1?'':'n'} esta semana`:'ninguno vence esta semana', CH.vencenPronto?'var(--wrn,#f59e0b)':'var(--t2)')}
      </div>
      <div class="dash-fila">
        <div class="dash-panel">
          <div class="dash-tit">Ventas de los últimos 7 días</div>
          <div class="dash-bars">${barras}</div>
        </div>
        <div class="dash-panel">
          <div class="dash-tit">Requiere atención</div>
          ${alertas}
        </div>
      </div>
    </div>`;
  _dashStyle();
}

function _dashStyle(){
  if(document.getElementById('dash-style')) return;
  const st=document.createElement('style'); st.id='dash-style';
  st.textContent=`
    #dash-body{padding:0 0 16px;overflow:auto}
    .dash-wrap{margin:14px 14px 0}
    .dash-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:14px}
    .dash-card{background:var(--s2);border-radius:8px;padding:14px 16px}
    .dash-lbl{font-size:12px;color:var(--t2);margin-bottom:5px}
    .dash-val{font-size:22px;font-weight:600;color:var(--txt);font-family:var(--mono)}
    .dash-pie{font-size:11px;margin-top:3px;color:var(--t3)}
    .dash-fila{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:12px}
    .dash-panel{background:var(--s2);border:1px solid var(--b1);border-radius:8px;padding:14px 16px}
    .dash-tit{font-size:14px;font-weight:600;color:var(--txt);margin-bottom:12px}
    .dash-bars{display:flex;align-items:flex-end;gap:10px;height:135px}
    .dash-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end}
    .dash-bar{width:100%;border-radius:3px 3px 0 0}
    .dash-bar-col span{font-size:11px}
    .dash-alert{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--b1);font-size:13px;color:var(--txt)}
    .dash-alert:last-child{border-bottom:none}
    .dash-alert:hover{background:var(--s3)}
    @media(max-width:900px){ .dash-fila{grid-template-columns:1fr} }
  `;
  document.head.appendChild(st);
}

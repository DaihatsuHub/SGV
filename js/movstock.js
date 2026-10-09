/* ===========================================================================
   MOVIMIENTOS DE STOCK  (Artículos → Movimientos de Stock)
   - Altas y bajas de stock y/o depósito por rotura, ajuste u otros motivos.
   - Las reglas son las de facturación y las valida EL SERVER:
       · egreso → tiene que haber disponible en ese despacho
       · ingreso → si hay más de un despacho, hay que elegir cuál
   - El despacho define la empresa (Hatsu o Tressa) por su primera letra.
   =========================================================================== */

let _mstkLista = [], _mstkSel = null, _mstkDesps = [];

function _msEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _msFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _msFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{maximumFractionDigits:2}); }
function _msFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
function _msVal(id){ return (document.getElementById(id)?.value||'').trim(); }
const MSTK_GRID='90px 130px 70px 150px 80px 110px 110px minmax(140px,1fr) 90px';

function renderMovStock(){
  _msStyle();
  const d=document.getElementById('ms-desde'), h=document.getElementById('ms-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
  // Artículos para el buscador del alta
  if(typeof ensureArts==='function') ensureArts();
  mstkConsultar();
}

async function mstkConsultar(){
  const body=document.getElementById('ms-body'); if(!body) return;
  const qs=[];
  if(_msVal('ms-desde')) qs.push('desde='+_msVal('ms-desde'));
  if(_msVal('ms-hasta')) qs.push('hasta='+_msVal('ms-hasta'));
  const art=(_msVal('ms-art').split('—')[0]||'').trim();
  if(art) qs.push('art='+encodeURIComponent(art));
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Cargando…</div>';
  try{
    const r=await apiGet('/mstk'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_msEsc(r.error||'Error')+'</div>'; return; }
    _mstkLista=r.movimientos||[]; _mstkSel=null; _msPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_msEsc(e.message||'Error')+'</div>'; }
}

function _msPintar(){
  const head=document.getElementById('ms-head'), body=document.getElementById('ms-body');
  if(head){
    head.style.gridTemplateColumns=MSTK_GRID;
    head.innerHTML='<span>Fecha</span><span>Artículo</span><span>Mov.</span><span>Despacho</span>'
      +'<span class="r">Cantidad</span><span class="r">Importe</span><span>Mueve</span>'
      +'<span>Concepto</span><span>Usuario</span>';
  }
  if(!_mstkLista.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin movimientos en el período</div>'; return; }
  body.innerHTML=_mstkLista.map((m,i)=>{
    const esE = m.tipo==='E';
    const mueve=[m.mueve_stk?'Stock':null, m.mueve_dep?'Depósito':null].filter(Boolean).join(' + ');
    return `<div class="ms-row${_mstkSel===i?' sel':''}${m.anulado?' anul':''}" onclick="mstkSel(${i})">
      <span>${_msFecha(m.fecha)}</span>
      <span class="ms-art">${_msEsc(m.articulo)}</span>
      <span class="${esE?'ms-egr':'ms-ing'}">${esE?'Egreso':'Ingreso'}</span>
      <span class="ms-desp">${_msEsc(m.despacho||'')}</span>
      <span class="r">${esE?'-':'+'}${_msFmt0(m.cantidad)}</span>
      <span class="r">${m.importe?_msFmt(m.importe):''}</span>
      <span style="font-size:11px;color:var(--t2)">${mueve}</span>
      <span class="ms-con">${_msEsc(m.concepto||'')}</span>
      <span style="font-size:11px;color:var(--t3)">${_msEsc(m.usuario||'')}</span>
    </div>`;
  }).join('');
}

function mstkSel(i){ _mstkSel=i; _msPintar(); }

/* ─────────── Alta ─────────── */
function mstkNuevo(){
  if(typeof puedeh==='function' && !puedeh('mstk','alta')){ toast('Sin permiso para cargar movimientos','err'); return; }
  _mstkDesps=[];
  const s=(id,v)=>{ const e=document.getElementById(id); if(e) e.value=v; };
  s('msf-fecha', new Date().toISOString().substring(0,10));
  s('msf-art',''); s('msf-can',''); s('msf-imp',''); s('msf-con','');
  const t=document.getElementById('msf-tipo'); if(t) t.value='E';
  const cs=document.getElementById('msf-stk'); if(cs) cs.checked=true;
  const cd=document.getElementById('msf-dep'); if(cd) cd.checked=false;
  const ds=document.getElementById('msf-desp'); if(ds) ds.innerHTML='<option value="">— elegí el artículo primero —</option>';
  // Artículos en el buscador
  const dl=document.getElementById('msf-art-list');
  if(dl && !dl.options.length && typeof ARTS!=='undefined')
    dl.innerHTML=(ARTS||[]).slice(0,4000).map(a=>`<option value="${_msEsc((a.ART_COD||'').trim())} — ${_msEsc(a.ART_DES||'')}">`).join('');
  document.getElementById('ov-mstk').classList.add('open');
  setTimeout(()=>document.getElementById('msf-art')?.focus(),40);
}

// Al elegir el artículo se traen sus despachos con el disponible de cada uno
async function mstkArtChange(){
  const cod=(_msVal('msf-art').split('—')[0]||'').trim();
  const sel=document.getElementById('msf-desp'); if(!sel) return;
  if(!cod){ sel.innerHTML='<option value="">— elegí el artículo primero —</option>'; return; }
  sel.innerHTML='<option value="">⏳ buscando despachos…</option>';
  try{
    const r=await apiGet('/mstk/despachos/'+encodeURIComponent(cod));
    _mstkDesps=r.despachos||[];
    if(!_mstkDesps.length){
      sel.innerHTML='<option value="">— el artículo no tiene despachos —</option>';
      sgvAviso({ titulo:'Sin despachos',
        texto:'Ese artículo no tiene ningún despacho cargado, así que no se le puede mover stock.', tipo:'adv' });
      return;
    }
    sel.innerHTML=(_mstkDesps.length>1?'<option value="">— elegí el despacho —</option>':'')
      + _mstkDesps.map(d=>`<option value="${d.dep_id}">${_msEsc(d.desp)} · ${d.empresa==='T'?'Tressa':'Hatsu'} · stock ${_msFmt0(d.stk)} · depósito ${_msFmt0(d.dep)}</option>`).join('');
    if(_mstkDesps.length===1) sel.value=_mstkDesps[0].dep_id;
    mstkSugerirImporte();
  }catch(e){ sel.innerHTML='<option value="">⚠️ error al buscar</option>'; }
}

// El importe se propone con el costo del despacho, para valorizar la pérdida
function mstkSugerirImporte(){
  const d=_mstkDesps.find(x=>String(x.dep_id)===_msVal('msf-desp'));
  const can=parseFloat(_msVal('msf-can'))||0;
  const imp=document.getElementById('msf-imp');
  if(d && can>0 && imp && !imp.dataset.tocado) imp.value=_msFmt(d.costo*can);
}

async function mstkGuardar(){
  const cod=(_msVal('msf-art').split('—')[0]||'').trim();
  const can=parseFloat(_msVal('msf-can'))||0;
  const mueveStk=!!document.getElementById('msf-stk')?.checked;
  const mueveDep=!!document.getElementById('msf-dep')?.checked;
  if(!cod){ toast('Elegí el artículo','err'); return; }
  if(!(can>0)){ toast('La cantidad tiene que ser mayor a cero','err'); return; }
  if(!mueveStk && !mueveDep){ toast('Elegí si mueve stock, depósito o los dos','err'); return; }
  if(_mstkDesps.length>1 && !_msVal('msf-desp')){ toast('El artículo tiene varios despachos: elegí uno','err'); return; }

  try{
    const r=await apiPost('/mstk/guardar',{
      fecha:_msVal('msf-fecha'), articulo:cod, tipo:_msVal('msf-tipo'),
      dep_id:_msVal('msf-desp')||undefined, cantidad:can,
      importe:(parseFloat(String(_msVal('msf-imp')).replace(/\./g,'').replace(',','.'))||0),
      mueve_stk:mueveStk, mueve_dep:mueveDep, concepto:_msVal('msf-con')
    });
    if(!r || r.ok===false){
      sgvAviso({ titulo:'No se pudo grabar', texto:(r&&r.error)||'Error del servidor', tipo:'err' });
      return;
    }
    closeOv('ov-mstk');
    toast('Movimiento grabado','scs');
    if(typeof reloadArts==='function') reloadArts();   // el stock cambió
    mstkConsultar();
  }catch(e){ sgvAviso({ titulo:'No se pudo grabar', texto:e.message, tipo:'err' }); }
}

async function mstkAnular(){
  if(_mstkSel===null){ toast('Seleccioná un movimiento','err'); return; }
  const m=_mstkLista[_mstkSel];
  if(m.anulado){ toast('Ya está anulado','err'); return; }
  if(!confirm(`¿Anular este movimiento?\n\n${_msFecha(m.fecha)} · ${m.articulo} · ${m.tipo==='E'?'Egreso':'Ingreso'} de ${_msFmt0(m.cantidad)}\n\nSe devuelve el stock.`)) return;
  try{
    const r=await apiPost('/mstk/anular',{ id:m.id });
    if(!r || r.ok===false){ sgvAviso({ titulo:'No se pudo anular', texto:(r&&r.error)||'Error', tipo:'err' }); return; }
    toast('Movimiento anulado','scs');
    if(typeof reloadArts==='function') reloadArts();
    mstkConsultar();
  }catch(e){ sgvAviso({ titulo:'No se pudo anular', texto:e.message, tipo:'err' }); }
}

function _msStyle(){
  if(document.getElementById('ms-style')) return;
  const st=document.createElement('style'); st.id='ms-style';
  st.textContent=`
    #ms-head,.ms-row{display:grid;gap:8px;align-items:center;padding:7px 12px}
    #ms-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3}
    #ms-head .r,.ms-row .r{text-align:right}
    .ms-row{font-size:13px;border-bottom:1px solid var(--b1);cursor:pointer;grid-template-columns:${MSTK_GRID};font-family:var(--mono)}
    .ms-row:hover{background:var(--s2)}
    .ms-row.sel{background:var(--s3);box-shadow:inset 3px 0 0 var(--acc)}
    .ms-row.anul{opacity:.5;text-decoration:line-through}
    .ms-art{color:var(--acc)}
    .ms-desp{font-size:11px;color:var(--t2)}
    .ms-con{font-family:var(--sans,inherit);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ms-ing{color:var(--grn);font-weight:600}
    .ms-egr{color:var(--red);font-weight:600}
  `;
  document.head.appendChild(st);
}

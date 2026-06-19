// ═══════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA  (ABM)
// Tablas: ordenes_compra (encabezado) · oc_items (renglones)
// ═══════════════════════════════════════════════════════════

let OCS = [];
let OCITEMS = [];
let ocSelIdx = null;

// ── formato ───────────────────────────────────────────────
function ocFmt(n){
  return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function ocFecFmt(d){
  return d ? String(d).substring(0,10).split('-').reverse().join('/') : '';
}
function ocPend(o){
  return (Number(o.saldo_ant)||0)+(Number(o.saldo_sal)||0)+(Number(o.saldo_der)||0);
}
function ocAmLabel(am){
  const a=(am||'').trim().toUpperCase();
  return a==='A'?'Aéreo':(a==='M'?'Marítimo':a);
}

// ── carga ─────────────────────────────────────────────────
async function sbLoadOC(){
  try{ OCS = await sbGetAll('ordenes_compra','pedido'); OCS.sort((a,b)=>(Number(b.pedido)||0)-(Number(a.pedido)||0)); }
  catch(e){ console.error('sbLoadOC:', e); OCS=[]; }
}
async function sbLoadOCItems(){
  try{ OCITEMS = await sbGetAll('oc_items','pedido'); }
  catch(e){ console.error('sbLoadOCItems:', e); OCITEMS=[]; }
}
function ocItemsDe(pedido){
  return (OCITEMS||[]).filter(it=>Number(it.pedido)===Number(pedido));
}

// ── filas (búsqueda + orden) ──────────────────────────────
function getOCRows(){
  const q=(document.getElementById('oc-q')?.value||'').toLowerCase().trim();
  let list=(OCS||[]).slice();
  if(q) list=list.filter(o=>
    String(o.pedido||'').includes(q) ||
    (o.proveedor||'').toLowerCase().includes(q) ||
    (o.orden||'').toLowerCase().includes(q)
  );
  const s=(typeof SORT_STATE!=='undefined' && SORT_STATE.oc) ? SORT_STATE.oc : {col:null,asc:true};
  if(s.col){
    list=list.slice().sort((a,b)=>{
      let va,vb;
      switch(s.col){
        case 'OC_PED':  va=Number(a.pedido)||0; vb=Number(b.pedido)||0; break;
        case 'OC_FEC':  va=a.fecha||''; vb=b.fecha||''; break;
        case 'OC_PROV': va=a.proveedor||''; vb=b.proveedor||''; break;
        case 'OC_ORD':  va=a.orden||''; vb=b.orden||''; break;
        case 'OC_RUB':  va=a.rubro||''; vb=b.rubro||''; break;
        case 'OC_ENV':  va=a.envio||''; vb=b.envio||''; break;
        case 'OC_AM':   va=a.am||''; vb=b.am||''; break;
        case 'OC_TOT':  va=Number(a.total)||0; vb=Number(b.total)||0; break;
        case 'OC_ANT':  va=Number(a.anticipo)||0; vb=Number(b.anticipo)||0; break;
        case 'OC_SAL':  va=Number(a.saldo)||0; vb=Number(b.saldo)||0; break;
        case 'OC_DER':  va=Number(a.derecho)||0; vb=Number(b.derecho)||0; break;
        case 'OC_PEND': va=ocPend(a); vb=ocPend(b); break;
        default: va=''; vb='';
      }
      const r=(typeof va==='number'&&typeof vb==='number')?(va-vb):String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    });
  }
  return list;
}

// ── render listado ────────────────────────────────────────
function renderOC(){
  const body=document.getElementById('oc-body'); if(!body) return;
  const list=getOCRows();

  // totales
  const totT=list.reduce((s,o)=>s+(Number(o.total)||0),0);
  const totP=list.reduce((s,o)=>s+ocPend(o),0);
  const tEl=document.getElementById('oc-total'); if(tEl) tEl.textContent=ocFmt(totT);
  const pEl=document.getElementById('oc-pend');  if(pEl) pEl.textContent=ocFmt(totP);
  const cEl=document.getElementById('oc-count');  if(cEl) cEl.textContent=list.length;

  const cols=(typeof getActiveCols==='function')?getActiveCols('oc'):[];
  const gridTpl=cols.map(c=>c.width||'1fr').join(' ');
  const thead=document.getElementById('oc-thead');
  if(thead){
    thead.style.gridTemplateColumns=gridTpl;
    thead.innerHTML=cols.map(c=>`<span class="th-sortable" onclick="toggleSort('oc','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${(typeof sortArrow==='function')?sortArrow('oc',c.field):''}</span>`).join('');
  }

  if(!list.length){ body.innerHTML='<div class="empty">🔍 Sin órdenes de compra</div>'; ocInstallNav(); return; }

  body.innerHTML=list.map((o,i)=>{
    const sel=ocSelIdx===i?'sel':'';
    const pend=ocPend(o);
    const cell=f=>{
      switch(f){
        case 'OC_PED':  return `<span class="col-cod" style="font-family:var(--mono)">${esc(String(o.pedido||''))}</span>`;
        case 'OC_FEC':  return `<span class="col-sm" style="color:var(--t2)">${ocFecFmt(o.fecha)}</span>`;
        case 'OC_PROV': return `<span class="col-des">${esc(o.proveedor||'')}</span>`;
        case 'OC_ORD':  return `<span class="col-sm" style="font-family:var(--mono)">${esc(o.orden||'')}</span>`;
        case 'OC_RUB':  return `<span class="col-sm">${esc(o.rubro||'')}</span>`;
        case 'OC_ENV':  return `<span class="col-sm">${ocFecFmt(o.envio)}</span>`;
        case 'OC_AM':   return `<span class="col-sm">${esc((o.am||'').trim())}</span>`;
        case 'OC_TOT':  return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${ocFmt(o.total)}</span>`;
        case 'OC_ANT':  return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${ocFmt(o.anticipo)}</span>`;
        case 'OC_SAL':  return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${ocFmt(o.saldo)}</span>`;
        case 'OC_DER':  return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${ocFmt(o.derecho)}</span>`;
        case 'OC_PEND': return `<span class="col-num" style="text-align:right;font-family:var(--mono);color:${pend>0.005?'var(--red)':'var(--grn)'};font-weight:600">${ocFmt(pend)}</span>`;
        default: return `<span></span>`;
      }
    };
    return `<div class="tr-art ${sel}" data-idx="${i}" style="grid-template-columns:${gridTpl}" onclick="selOC(${i})" ondblclick="ocVer()">`
      + cols.map(co=>cell(co.field)).join('') + `</div>`;
  }).join('');
  body.querySelector('.tr-art.sel')?.scrollIntoView({block:'nearest'});
  ocInstallNav();
}

function selOC(i){ ocSelIdx=i; renderOC(); }

// ── ficha / detalle (solo lectura) ────────────────────────
function ocVer(){
  if(ocSelIdx===null){ toast('Seleccioná una orden','err'); return; }
  const o=getOCRows()[ocSelIdx]; if(!o){ toast('Seleccioná una orden','err'); return; }

  document.getElementById('oc-mtit').textContent=`Orden de Compra · Pedido ${o.pedido||''}`;

  // datos encabezado
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('ocd-pedido',   o.pedido||'');
  set('ocd-fecha',    ocFecFmt(o.fecha)||'—');
  set('ocd-prov',     o.proveedor||'—');
  set('ocd-orden',    o.orden||'—');
  set('ocd-rubro',    o.rubro||'—');
  set('ocd-envio',    ocFecFmt(o.envio)||'—');
  set('ocd-am',       (o.am||'').trim()?ocAmLabel(o.am):'—');
  set('ocd-total',    ocFmt(o.total));

  // bloques de pago
  const fila=(pre,imp,fec,pago,saldo)=>{
    set(pre+'-imp',   ocFmt(imp));
    set(pre+'-fec',   ocFecFmt(fec)||'—');
    set(pre+'-pago',  ocFmt(pago));
    set(pre+'-saldo', ocFmt(saldo));
    const sEl=document.getElementById(pre+'-saldo');
    if(sEl) sEl.style.color=(Number(saldo)||0)>0.005?'var(--red)':'var(--grn)';
  };
  fila('ocd-ant', o.anticipo, o.fecha_ant, o.pago_ant, o.saldo_ant);
  fila('ocd-sal', o.saldo,    o.fecha_sal, o.pago_sal, o.saldo_sal);
  fila('ocd-der', o.derecho,  o.fecha_der, o.pago_der, o.saldo_der);

  // items
  const its=ocItemsDe(o.pedido);
  const tb=document.getElementById('ocd-items');
  if(tb){
    if(!its.length){ tb.innerHTML='<div class="empty" style="padding:14px">Sin renglones</div>'; }
    else{
      tb.innerHTML=its.map(it=>{
        const art=ARTS.find(a=>(a.ART_COD||'').trim()===(it.codint||'').trim());
        const des=art?art.ART_DES:'';
        return `<div class="ocd-it-row">`
          + `<span style="font-family:var(--mono)">${esc(it.codint||'')}</span>`
          + `<span class="col-des">${esc(des)}</span>`
          + `<span style="font-family:var(--mono)">${esc(it.codprov||'')}</span>`
          + `<span style="text-align:right">${(Number(it.cantped)||0).toLocaleString('es-AR')}</span>`
          + `<span style="text-align:right">${(Number(it.cantent)||0).toLocaleString('es-AR')}</span>`
          + `<span style="text-align:right;font-family:var(--mono)">${ocFmt(it.costo)}</span>`
          + `<span style="text-align:right;font-family:var(--mono)">${ocFmt(it.total)}</span>`
          + `</div>`;
      }).join('');
    }
  }
  const totIt=its.reduce((s,it)=>s+(Number(it.total)||0),0);
  set('ocd-items-tot', ocFmt(totIt));
  const cnt=document.getElementById('ocd-items-cnt'); if(cnt) cnt.textContent=its.length;

  document.getElementById('ov-oc').classList.add('open');
}

// ── baja ──────────────────────────────────────────────────
async function ocBaja(){
  if(ocSelIdx===null){ toast('Seleccioná una orden','err'); return; }
  const o=getOCRows()[ocSelIdx]; if(!o){ toast('Seleccioná una orden','err'); return; }
  const ok=(typeof confirm2==='function')
    ? await confirm2(`¿Eliminar la OC del pedido ${o.pedido}? Se borran también sus renglones.`)
    : confirm(`¿Eliminar la OC del pedido ${o.pedido}?`);
  if(!ok) return;
  try{
    await sbDelete('ordenes_compra', {pedido:o.pedido});   // oc_items cae por ON DELETE CASCADE
    OCS=OCS.filter(x=>Number(x.pedido)!==Number(o.pedido));
    OCITEMS=OCITEMS.filter(x=>Number(x.pedido)!==Number(o.pedido));
    ocSelIdx=null; renderOC(); toast('Orden eliminada','scs');
  }catch(e){ console.error('ocBaja:', e); toast('Error al eliminar','err'); }
}

// ── alta / modif (próximo paso) ───────────────────────────
function ocAlta(){ toast('Editor de alta — próximo paso','err'); }
function ocModif(){
  if(ocSelIdx===null){ toast('Seleccioná una orden','err'); return; }
  toast('Editor de modificación — próximo paso','err');
}

// ── navegación por teclado ────────────────────────────────
let _ocNavInstalled=false;
function ocInstallNav(){
  if(_ocNavInstalled) return; _ocNavInstalled=true;
  document.addEventListener('keydown', function(e){
    const page=document.getElementById('page-oc');
    if(!page || !page.classList.contains('active')) return;
    if(document.querySelector('.ov.open')) return;
    const ae=document.activeElement;
    if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    const total=getOCRows().length; if(!total) return;
    let next=(ocSelIdx==null)?0:ocSelIdx;
    switch(e.key){
      case 'ArrowDown': next++; break;
      case 'ArrowUp':   next--; break;
      case 'PageDown':  next+=10; break;
      case 'PageUp':    next-=10; break;
      case 'Home':      next=0; break;
      case 'End':       next=total-1; break;
      case 'Enter':     ocVer(); return;
      default: return;
    }
    e.preventDefault();
    next=Math.max(0,Math.min(next,total-1));
    selOC(next);
    document.getElementById('oc-body')?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({block:'nearest'});
  });
}

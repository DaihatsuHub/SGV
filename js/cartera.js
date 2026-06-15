// ═══════════════════════════════════════════════════════════
// CARTERA DE VALORES (cheques)
// ═══════════════════════════════════════════════════════════

let CHEQUES = [];
let cheqSelIdx = null;
let cheqFiltEstado = 'todos';
let cheqFiltFisico = 'todos';     // todos | fisico | echeq
let selectedCheqIds = new Set();
let _cheqOrig = null;

const CHEQ_ESTADOS = {
  'cartera':    'En cartera',
  'depositado': 'Depositado',
  'entregado':  'Entregado a proveedor',
  'rechazado':  'Rechazado',
  'devuelto':   'Devuelto al cliente'
};

const CART_SEL_W = '64px';   // ancho de la columna de selección

async function sbLoadCheques(){
  try { CHEQUES = await sbGetAll('cheques','fecha'); CHEQUES.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')); }
  catch(e){ console.error('sbLoadCheques:', e); CHEQUES=[]; }
}

function cheqEstadoLabel(e){ return CHEQ_ESTADOS[e] || e || 'En cartera'; }
function cheqEstadoColor(e){
  switch(e){
    case 'depositado': return 'var(--grn)';
    case 'entregado':  return 'var(--acc)';
    case 'rechazado':  return 'var(--red)';
    case 'devuelto':   return 'var(--t3)';
    default:           return 'var(--txt)';
  }
}
function cheqFisLabel(c){ return c.fisico ? 'Cheque' : 'ECheq'; }

function cheqSetFiltEstado(e){ cheqFiltEstado=e; cheqSelIdx=null; renderCart(); }
function cheqSetFiltFisico(f){ cheqFiltFisico=f; cheqSelIdx=null; renderCart(); }

function getCheqRows(){
  const q=(document.getElementById('cart-q')?.value||'').toLowerCase();
  let list=(CHEQUES||[]).slice();
  if(cheqFiltEstado!=='todos') list=list.filter(c=>(c.estado||'cartera')===cheqFiltEstado);
  if(cheqFiltFisico==='fisico') list=list.filter(c=>!!c.fisico);
  else if(cheqFiltFisico==='echeq') list=list.filter(c=>!c.fisico);
  if(q) list=list.filter(c=>{
    const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
    return String(c.numero||'').includes(q) ||
      (c.cliente||'').toLowerCase().includes(q) ||
      (cli && (cli.CLI_RAZON||'').toLowerCase().includes(q)) ||
      String(c.recibo_numero||'').includes(q);
  });
  const s=(typeof SORT_STATE!=='undefined' && SORT_STATE.cart) ? SORT_STATE.cart : {col:null,asc:true};
  if(s.col){
    const razon=c=>{ const k=CLIS.find(x=>(x.CLI_CODIGO||'').trim()===(c.cliente||'').trim()); return (k?k.CLI_RAZON:c.cliente)||''; };
    list=list.slice().sort((a,b)=>{
      let va,vb;
      switch(s.col){
        case 'CHQ_FEC': va=a.fecha||''; vb=b.fecha||''; break;
        case 'CHQ_NUM': va=a.numero||''; vb=b.numero||''; break;
        case 'CHQ_IMP': va=a.importe||0; vb=b.importe||0; break;
        case 'CHQ_CLI': va=razon(a); vb=razon(b); break;
        case 'CHQ_EMP': va=a.empresa||''; vb=b.empresa||''; break;
        case 'CHQ_FIS': va=a.fisico?1:0; vb=b.fisico?1:0; break;
        case 'CHQ_PROP':va=a.propio?1:0; vb=b.propio?1:0; break;
        case 'CHQ_REC': va=a.recibo_numero||0; vb=b.recibo_numero||0; break;
        case 'CHQ_EST': va=cheqEstadoLabel(a.estado); vb=cheqEstadoLabel(b.estado); break;
        case 'CHQ_FSAL':va=a.fecha_salida||''; vb=b.fecha_salida||''; break;
        case 'CHQ_OBS': va=a.observaciones||''; vb=b.observaciones||''; break;
        default: va=''; vb='';
      }
      const r=(typeof va==='number'&&typeof vb==='number')?(va-vb):String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    });
  }
  return list;
}

function renderCart(){
  const body=document.getElementById('cart-body'); if(!body) return;
  const list=getCheqRows();

  // filtros activos (resaltado)
  document.querySelectorAll('#cart-filtros .fbtn').forEach(b=>{
    const on=b.dataset.est===cheqFiltEstado; b.style.background=on?'var(--acc)':''; b.style.color=on?'#fff':'';
  });
  document.querySelectorAll('#cart-filtros-fis .fbtn').forEach(b=>{
    const on=b.dataset.fis===cheqFiltFisico; b.style.background=on?'var(--acc)':''; b.style.color=on?'#fff':'';
  });

  // totales del filtro actual
  const tot=list.reduce((s,c)=>s+(c.importe||0),0);
  const totEl=document.getElementById('cart-total'); if(totEl) totEl.textContent=reciFmt(tot);
  const cntEl=document.getElementById('cart-count'); if(cntEl) cntEl.textContent=list.length;

  const cols=(typeof getActiveCols==='function')?getActiveCols('cart'):[];
  const gridTpl=cols.map(c=>c.width||'1fr').join(' ')+' '+CART_SEL_W;
  const allSel = list.length>0 && list.every(c=>selectedCheqIds.has(c.id));
  const thead=document.getElementById('cart-thead');
  if(thead){
    thead.style.gridTemplateColumns=gridTpl;
    thead.innerHTML=cols.map(c=>`<span class="th-sortable" onclick="toggleSort('cart','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${(typeof sortArrow==='function')?sortArrow('cart',c.field):''}</span>`).join('')
      + `<span style="text-align:center"><input type="checkbox" id="cart-selall" ${allSel?'checked':''} onclick="cheqToggleAll(this.checked)" title="Seleccionar todos" style="accent-color:var(--acc);cursor:pointer"></span>`;
  }

  if(!list.length){ body.innerHTML='<div class="empty">🔍 Sin cheques</div>'; cheqUpdateSel(); cheqInstallNav(); return; }
  body.innerHTML=list.map((c,i)=>{
    const sel=cheqSelIdx===i?'sel':'';
    const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
    const fec=c.fecha?c.fecha.substring(0,10).split('-').reverse().join('/'):'—';
    const fsal=c.fecha_salida?c.fecha_salida.substring(0,10).split('-').reverse().join('/'):'';
    const emp=c.empresa==='H'?'Hatsu':(c.empresa==='T'?'Tressa':(c.empresa||''));
    const checked=selectedCheqIds.has(c.id)?'checked':'';
    const cell=f=>{
      switch(f){
        case 'CHQ_FEC':  return `<span class="col-sm" style="color:var(--t2)">${fec}</span>`;
        case 'CHQ_NUM':  return `<span class="col-cod" style="font-family:var(--mono)">${esc(c.numero||'')}</span>`;
        case 'CHQ_IMP':  return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${reciFmt(c.importe||0)}</span>`;
        case 'CHQ_CLI':  return `<span class="col-des">${esc(c.cliente||'')}${cli?' — '+esc(cli.CLI_RAZON):''}</span>`;
        case 'CHQ_EMP':  return `<span class="col-sm">${esc(emp)}</span>`;
        case 'CHQ_FIS':  return `<span class="col-sm" style="color:${c.fisico?'var(--txt)':'var(--acc)'}">${cheqFisLabel(c)}</span>`;
        case 'CHQ_PROP': return `<span class="col-sm">${c.propio?'Propio':'Terceros'}</span>`;
        case 'CHQ_REC':  return `<span class="col-sm">${c.recibo_numero?esc(c.empresa||'')+' '+esc(String(c.recibo_numero)):''}</span>`;
        case 'CHQ_EST':  return `<span class="col-sm" style="color:${cheqEstadoColor(c.estado)};font-weight:600">${esc(cheqEstadoLabel(c.estado))}</span>`;
        case 'CHQ_FSAL': return `<span class="col-sm">${fsal}</span>`;
        case 'CHQ_OBS':  return `<span class="col-des" style="color:var(--t3)">${esc(c.observaciones||'')}</span>`;
        default: return `<span></span>`;
      }
    };
    return `<div class="tr-art ${sel}" data-idx="${i}" style="grid-template-columns:${gridTpl}" onclick="selCheq(${i})" ondblclick="cheqEdit()">`
      + cols.map(co=>cell(co.field)).join('')
      + `<span style="text-align:center"><input type="checkbox" ${checked} onclick="event.stopPropagation();cheqToggleSel(${c.id},this.checked)" style="accent-color:var(--acc);cursor:pointer"></span>`
      + `</div>`;
  }).join('');
  body.querySelector('.tr-art.sel')?.scrollIntoView({block:'nearest'});
  cheqUpdateSel();
  cheqInstallNav();
}

function selCheq(i){ cheqSelIdx=i; renderCart(); }

// ── Selección múltiple ────────────────────────────────────
function cheqToggleSel(id, checked){
  if(checked) selectedCheqIds.add(id); else selectedCheqIds.delete(id);
  cheqUpdateSel();
  const all=document.getElementById('cart-selall');
  if(all){ const list=getCheqRows(); all.checked = list.length>0 && list.every(c=>selectedCheqIds.has(c.id)); }
}
function cheqToggleAll(checked){
  const list=getCheqRows();
  if(checked) list.forEach(c=>selectedCheqIds.add(c.id));
  else list.forEach(c=>selectedCheqIds.delete(c.id));
  renderCart();
}
function cheqUpdateSel(){
  let total=0;
  CHEQUES.forEach(c=>{ if(selectedCheqIds.has(c.id)) total+=(c.importe||0); });
  const n=selectedCheqIds.size;
  const c1=document.getElementById('cart-selcount'); if(c1) c1.textContent=n;
  const c2=document.getElementById('cart-selcount2'); if(c2) c2.textContent=n;
  const t=document.getElementById('cart-seltotal'); if(t) t.textContent=reciFmt(total);
  const btn=document.getElementById('btn-cart-confirm');
  if(btn){ btn.disabled = n===0; btn.style.opacity = n===0?'0.5':'1'; }
}

// ── Edición individual ────────────────────────────────────
function cheqEdit(){
  if(cheqSelIdx===null){ toast('Seleccioná un cheque','err'); return; }
  const c=getCheqRows()[cheqSelIdx]; if(!c){ toast('Seleccioná un cheque','err'); return; }
  _cheqOrig=c;
  const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
  document.getElementById('cf-info').textContent =
    `Nº ${c.numero||''} · ${reciFmt(c.importe||0)} · ${cheqFisLabel(c)} · ${(c.fecha||'').substring(0,10).split('-').reverse().join('/')} · ${cli?cli.CLI_RAZON:(c.cliente||'')}`;
  document.getElementById('cf-estado').innerHTML =
    Object.keys(CHEQ_ESTADOS).map(k=>`<option value="${k}"${(c.estado||'cartera')===k?' selected':''}>${CHEQ_ESTADOS[k]}</option>`).join('');
  document.getElementById('cf-fsalida').value=(c.fecha_salida||'').substring(0,10);
  document.getElementById('cf-obs').value=c.observaciones||'';
  document.getElementById('cart-mtit').textContent=`Cheque Nº ${c.numero||''}`;
  document.getElementById('ov-cart').classList.add('open');
}
async function saveCheq(){
  if(!_cheqOrig) return;
  const estado=document.getElementById('cf-estado').value;
  const fsal=document.getElementById('cf-fsalida').value||null;
  const obs=document.getElementById('cf-obs').value.trim()||null;
  try{
    await sbUpsert('cheques',{ id:_cheqOrig.id, estado, fecha_salida:fsal, observaciones:obs });
    _cheqOrig.estado=estado; _cheqOrig.fecha_salida=fsal; _cheqOrig.observaciones=obs;
    closeOv('ov-cart'); renderCart(); toast('Cheque actualizado','scs');
  }catch(e){ console.error('saveCheq:', e); toast('Error al guardar','err'); }
}

// ── Confirmación masiva (varios seleccionados) ────────────
function openCheqBulk(){
  if(selectedCheqIds.size===0){ toast('No hay valores seleccionados','err'); return; }
  let total=0; CHEQUES.forEach(c=>{ if(selectedCheqIds.has(c.id)) total+=(c.importe||0); });
  document.getElementById('cb-info').textContent =
    `${selectedCheqIds.size} valor(es) seleccionado(s) · Total ${reciFmt(total)}`;
  document.getElementById('cb-estado').innerHTML =
    Object.keys(CHEQ_ESTADOS).map(k=>`<option value="${k}">${CHEQ_ESTADOS[k]}</option>`).join('');
  document.getElementById('cb-fsalida').value='';
  document.getElementById('cb-obs').value='';
  document.getElementById('ov-cartbulk').classList.add('open');
}
async function saveCheqBulk(){
  const ids=[...selectedCheqIds];
  if(!ids.length){ closeOv('ov-cartbulk'); return; }
  const estado=document.getElementById('cb-estado').value;
  const fsal=document.getElementById('cb-fsalida').value||null;
  const obs=document.getElementById('cb-obs').value.trim()||null;
  try{
    for(const id of ids){
      await sbUpsert('cheques',{ id, estado, fecha_salida:fsal, observaciones:obs });
      const c=CHEQUES.find(x=>x.id===id);
      if(c){ c.estado=estado; c.fecha_salida=fsal; c.observaciones=obs; }
    }
    selectedCheqIds.clear();
    closeOv('ov-cartbulk'); renderCart();
    toast(`${ids.length} valor(es) actualizado(s)`,'scs');
  }catch(e){ console.error('saveCheqBulk:', e); toast('Error al actualizar','err'); }
}

// ── Navegación por teclado ────────────────────────────────
let _cheqNavInstalled=false;
function cheqInstallNav(){
  if(_cheqNavInstalled) return; _cheqNavInstalled=true;
  document.addEventListener('keydown', function(e){
    const page=document.getElementById('page-cart');
    if(!page || !page.classList.contains('active')) return;
    if(document.querySelector('.ov.open')) return;
    const ae=document.activeElement;
    if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    const total=getCheqRows().length; if(!total) return;
    let next=(cheqSelIdx==null)?0:cheqSelIdx;
    switch(e.key){
      case 'ArrowDown': next++; break;
      case 'ArrowUp':   next--; break;
      case 'PageDown':  next+=10; break;
      case 'PageUp':    next-=10; break;
      case 'Home':      next=0; break;
      case 'End':       next=total-1; break;
      default: return;
    }
    e.preventDefault();
    next=Math.max(0,Math.min(next,total-1));
    selCheq(next);
    document.getElementById('cart-body')?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({block:'nearest'});
  });
}

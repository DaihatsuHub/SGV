// ═══════════════════════════════════════════════════════════
// CARTERA DE VALORES (cheques)
// ═══════════════════════════════════════════════════════════

let CHEQUES = [];
let cheqSelIdx = null;
let cheqFiltEstado = 'todos';
let _cheqOrig = null;

const CHEQ_ESTADOS = {
  'cartera':    'En cartera',
  'depositado': 'Depositado',
  'entregado':  'Entregado a proveedor',
  'rechazado':  'Rechazado',
  'devuelto':   'Devuelto al cliente'
};

const CART_GRID = '90px 90px 110px 1fr 70px 80px 90px 140px 90px 1fr';

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
    default:           return 'var(--txt)';   // en cartera
  }
}

function cheqSetFiltEstado(e){ cheqFiltEstado=e; cheqSelIdx=null; renderCart(); }

function getCheqRows(){
  const q=(document.getElementById('cart-q')?.value||'').toLowerCase();
  let list=(CHEQUES||[]).slice();
  if(cheqFiltEstado!=='todos') list=list.filter(c=>(c.estado||'cartera')===cheqFiltEstado);
  if(q) list=list.filter(c=>{
    const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
    return String(c.numero||'').includes(q) ||
      (c.cliente||'').toLowerCase().includes(q) ||
      (cli && (cli.CLI_RAZON||'').toLowerCase().includes(q)) ||
      String(c.recibo_numero||'').includes(q);
  });
  return list;
}

function renderCart(){
  const body=document.getElementById('cart-body'); if(!body) return;
  const list=getCheqRows();
  // resaltar filtro activo
  document.querySelectorAll('#cart-filtros .fbtn').forEach(b=>{
    const on=b.dataset.est===cheqFiltEstado;
    b.style.background=on?'var(--acc)':''; b.style.color=on?'#fff':'';
  });
  // totales del filtro actual
  const tot=list.reduce((s,c)=>s+(c.importe||0),0);
  const totEl=document.getElementById('cart-total'); if(totEl) totEl.textContent=reciFmt(tot);
  const cntEl=document.getElementById('cart-count'); if(cntEl) cntEl.textContent=list.length;
  const thead=document.getElementById('cart-thead'); if(thead) thead.style.gridTemplateColumns=CART_GRID;
  if(!list.length){ body.innerHTML='<div class="empty">🔍 Sin cheques</div>'; cheqInstallNav(); return; }
  body.innerHTML=list.map((c,i)=>{
    const sel=cheqSelIdx===i?'sel':'';
    const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
    const fec=c.fecha?c.fecha.substring(0,10).split('-').reverse().join('/'):'—';
    const fsal=c.fecha_salida?c.fecha_salida.substring(0,10).split('-').reverse().join('/'):'';
    const emp=c.empresa==='H'?'Hatsu':(c.empresa==='T'?'Tressa':(c.empresa||''));
    const tipo=c.propio?'Propio':'Terceros';
    return `<div class="tr-art ${sel}" data-idx="${i}" style="grid-template-columns:${CART_GRID}" onclick="selCheq(${i})" ondblclick="cheqEdit()">
      <span class="col-sm" style="color:var(--t2)">${fec}</span>
      <span class="col-cod" style="font-family:var(--mono)">${esc(c.numero||'')}</span>
      <span class="col-num" style="text-align:right;font-family:var(--mono)">${reciFmt(c.importe||0)}</span>
      <span class="col-des">${esc(c.cliente||'')}${cli?' — '+esc(cli.CLI_RAZON):''}</span>
      <span class="col-sm">${esc(emp)}</span>
      <span class="col-sm">${esc(tipo)}</span>
      <span class="col-sm">${c.recibo_numero?esc(c.empresa||'')+' '+esc(String(c.recibo_numero)):''}</span>
      <span class="col-sm" style="color:${cheqEstadoColor(c.estado)};font-weight:600">${esc(cheqEstadoLabel(c.estado))}</span>
      <span class="col-sm">${fsal}</span>
      <span class="col-des" style="color:var(--t3)">${esc(c.observaciones||'')}</span>
    </div>`;
  }).join('');
  body.querySelector('.tr-art.sel')?.scrollIntoView({block:'nearest'});
  cheqInstallNav();
}

function selCheq(i){ cheqSelIdx=i; renderCart(); }

function cheqEdit(){
  if(cheqSelIdx===null){ toast('Seleccioná un cheque','err'); return; }
  const c=getCheqRows()[cheqSelIdx]; if(!c){ toast('Seleccioná un cheque','err'); return; }
  _cheqOrig=c;
  const cli=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(c.cliente||'').trim());
  document.getElementById('cf-info').textContent =
    `Nº ${c.numero||''} · ${reciFmt(c.importe||0)} · ${(c.fecha||'').substring(0,10).split('-').reverse().join('/')} · ${cli?cli.CLI_RAZON:(c.cliente||'')}`;
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

// Navegación por teclado (flechas + RePág/AvPág + Inicio/Fin), instalada una sola vez.
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

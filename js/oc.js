// ═══════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA  (ABM master-detail)
// Tablas: ordenes_compra (encabezado) · oc_items (renglones)
// ═══════════════════════════════════════════════════════════

let OCS = [];
let OCITEMS = [];
let ocSelIdx = null;
let _ocEditNum = null;        // pedido en edición (null = alta)
let _ocEditItems = [];        // items en edición

// ── formato ───────────────────────────────────────────────
function ocFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function ocFmt3(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:3,maximumFractionDigits:3}); }
function ocNum(v){
  if(v===''||v==null) return null;
  let s=String(v).trim().replace(/\s/g,'');
  if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.');   // 1.234,56 -> 1234.56
  const n=parseFloat(s); return isNaN(n)?null:n;
}
function ocInt(n){ return (Number(n)||0).toLocaleString('es-AR'); }
function ocFecFmt(d){ return d ? String(d).substring(0,10).split('-').reverse().join('/') : ''; }
function ocFecISO(d){ return d ? String(d).substring(0,10) : ''; }
function ocPend(o){ return (Number(o.saldo_ant)||0)+(Number(o.saldo_sal)||0)+(Number(o.saldo_der)||0); }
function ocEmpLabel(r){ const x=(r||'').trim().toUpperCase(); return x==='H'?'Hatsu':(x==='T'?'Tressa':(r||'')); }
function ocAmLabel(a){ const x=(a||'').trim().toUpperCase(); return x==='A'?'Aéreo':(x==='M'?'Marítimo':(a||'')); }

// ── carga ─────────────────────────────────────────────────
async function sbLoadOC(){
  try{ OCS = await sbGetAll('ordenes_compra','pedido'); OCS.sort((a,b)=>(Number(a.pedido)||0)-(Number(b.pedido)||0)); }
  catch(e){ console.error('sbLoadOC:', e); OCS=[]; }
}
async function sbLoadOCItems(){
  try{ OCITEMS = await sbGetAll('oc_items','pedido'); }
  catch(e){ console.error('sbLoadOCItems:', e); OCITEMS=[]; }
}
function ocItemsDe(pedido){ return (OCITEMS||[]).filter(it=>Number(it.pedido)===Number(pedido)); }
function ocTotalItems(pedido){ return ocItemsDe(pedido).reduce((s,it)=>s+(Number(it.total)||0),0); }
function ocProxNumero(){ const m=(OCS||[]).reduce((x,o)=>Math.max(x,Number(o.pedido)||0),0); return m+1; }
function ocFillArtList(){
  const dl=document.getElementById('oce-art-list'); if(!dl || dl.childElementCount) return;
  dl.innerHTML=(ARTS||[]).map(a=>`<option value="${esc((a.ART_COD||'').trim())}">${esc((a.ART_DES||'').trim())}</option>`).join('');
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
  // orden inicial por PEDIDO asc (ya viene ordenado de sbLoadOC)
  return list;
}

// ── render lista izquierda + detalle derecha ──────────────
function renderOC(){
  const body=document.getElementById('oc-body'); if(!body) return;
  const list=getOCRows();

  const totP=list.reduce((s,o)=>s+ocPend(o),0);
  const cEl=document.getElementById('oc-count'); if(cEl) cEl.textContent=list.length;
  const pEl=document.getElementById('oc-pend');  if(pEl) pEl.textContent=ocFmt(totP);

  if(!list.length){ body.innerHTML='<div class="empty">🔍 Sin órdenes</div>'; renderOCDetail(null); ocInstallNav(); return; }

  const dmd=p=>{ const a=p[0],s=p[1]; if(a<=0) return '<span style="color:var(--t4,#3a4760)">·</span>';
    return `<span style="color:${s>0.005?'var(--red)':'var(--grn)'}">◆</span>`; };

  body.innerHTML=list.map((o,i)=>{
    const sel=ocSelIdx===i?'sel':'';
    const ind=[ [Number(o.anticipo)||0, Number(o.saldo_ant)||0],
                [Number(o.saldo)||0,    Number(o.saldo_sal)||0],
                [Number(o.derecho)||0,  Number(o.saldo_der)||0] ];
    return `<div class="tr-art ${sel}" data-idx="${i}" style="grid-template-columns:54px 1fr 60px" onclick="selOC(${i})" ondblclick="ocModif()">`
      + `<span class="col-cod" style="font-family:var(--mono)">${esc(String(o.pedido||''))}</span>`
      + `<span class="col-des">${esc(o.proveedor||'')}</span>`
      + `<span style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center">`
      +   `<span>${dmd(ind[0])}</span><span>${dmd(ind[1])}</span><span>${dmd(ind[2])}</span>`
      + `</span>`
      + `</div>`;
  }).join('');

  if(ocSelIdx===null || ocSelIdx>=list.length) ocSelIdx=0;
  body.querySelector('.tr-art.sel')?.scrollIntoView({block:'nearest'});
  renderOCDetail(list[ocSelIdx]);
  ocInstallNav();
}

function selOC(i){ ocSelIdx=i; renderOC(); }

function renderOCDetail(o){
  const wrap=document.getElementById('oc-detalle'); if(!wrap) return;
  if(!o){ wrap.style.display='none'; return; }
  wrap.style.display='block';

  document.getElementById('ocd-prov').textContent=o.proveedor||'—';
  document.getElementById('ocd-ped').textContent=o.pedido||'';

  const empPill=e=>{ const b=e==='Hatsu'; return `<span style="font-size:10px;padding:1px 8px;border-radius:10px;background:${b?'#16314e':'#3a2c12'};color:${b?'#7cc0ff':'#e7a13b'}">${e}</span>`; };
  const glb=(l,v)=>`<div class="oc-glb"><div class="oc-glb-l">${l}</div><div class="oc-glb-v">${v}</div></div>`;
  // 3) Envío a la IZQUIERDA de Vía
  const totItems=ocTotalItems(o.pedido);
  document.getElementById('ocd-globos').innerHTML=
    glb('Fecha', ocFecFmt(o.fecha)||'—') +
    glb('Empresa', empPill(ocEmpLabel(o.rubro))) +
    glb('Orden prov.', `<span style="font-family:var(--mono)">${esc(o.orden||'—')}</span>`) +
    glb('Envío', ocFecFmt(o.envio)||'—') +
    glb('Vía', (o.am||'').trim()?ocAmLabel(o.am):'—') +
    `<div class="oc-glb" style="background:#10233a;border-color:#2b5780"><div class="oc-glb-l">Total OC</div><div class="oc-glb-v" style="font-size:15px;font-weight:600;color:#9cc8ff;font-family:var(--mono)">${ocFmt(totItems)}</div></div>`;

  const payc=(t,imp,fec,pago,saldo)=>{ const has=(Number(imp)||0)>0;
    return `<div class="oc-payc">
      <div style="font-size:12px;font-weight:600;color:var(--txt);margin-bottom:4px">${t}</div>
      <div class="oc-pr"><span>Importe</span><span class="mono" style="color:var(--txt)">${has?ocFmt(imp):'—'}</span></div>
      <div class="oc-pr"><span>Fecha</span><span>${ocFecFmt(fec)||'—'}</span></div>
      <div class="oc-pr"><span>Pago</span><span class="mono">${has?ocFmt(pago):'—'}</span></div>
      <div class="oc-pr" style="border-top:1px solid var(--b1);margin-top:3px;padding-top:3px"><span>Saldo</span><span class="mono" style="color:${has&&(Number(saldo)||0)>0.005?'var(--red)':'var(--grn)'};font-weight:600">${has?ocFmt(saldo):'—'}</span></div>
    </div>`; };
  document.getElementById('ocd-pagos').innerHTML=
    payc('Anticipo', o.anticipo, o.fecha_ant, o.pago_ant, o.saldo_ant) +
    payc('Saldo',    o.saldo,    o.fecha_sal, o.pago_sal, o.saldo_sal) +
    payc('Derecho',  o.derecho,  o.fecha_der, o.pago_der, o.saldo_der);

  const its=ocItemsDe(o.pedido);
  const tb=document.getElementById('ocd-items');
  tb.innerHTML = its.length ? its.map(it=>{
      const ped=Number(it.cantped)||0, ent=Number(it.cantent)||0, sld=ped-ent;
      return `<div class="oc-itrow">`
        + `<span class="mono">${esc(it.codprov||'')}</span>`
        + `<span class="mono" style="color:var(--txt)">${esc(it.codint||'')}</span>`
        + `<span style="text-align:right">${ocInt(ped)}</span>`
        + `<span style="text-align:right;color:${sld>0?'var(--txt)':'var(--t3)'}">${ocInt(sld)}</span>`
        + `<span style="text-align:right" class="mono">${ocFmt3(it.costo)}</span>`
        + `<span style="text-align:right" class="mono" style="color:var(--txt)">${ocFmt(it.total)}</span>`
        + `</div>`; }).join('')
    : '<div class="empty" style="padding:12px">Sin renglones</div>';
}

// ═══════════════════════════════════════════════════════════
// EDITOR (alta / modificación)
// ═══════════════════════════════════════════════════════════
function ocAlta(){
  _ocEditNum=null; _ocEditItems=[];
  _ocFill({ pedido:ocProxNumero(), fecha:new Date().toISOString().substring(0,10), rubro:'H', am:'M' });
  document.getElementById('oce-mtit').textContent='Nueva Orden de Compra';
  document.getElementById('oce-mtag').textContent='ALTA';
  ocFillArtList();
  ocEditRenderItems(); ocEditCalc();
  document.getElementById('ov-oce').classList.add('open');
  setTimeout(()=>document.getElementById('oce-prov')?.focus(),60);
}
function ocModif(){
  if(ocSelIdx===null){ toast('Seleccioná una orden','err'); return; }
  const o=getOCRows()[ocSelIdx]; if(!o){ toast('Seleccioná una orden','err'); return; }
  _ocEditNum=Number(o.pedido);
  _ocEditItems=ocItemsDe(o.pedido).map(it=>({ codint:it.codint||'', codprov:it.codprov||'', cantped:Number(it.cantped)||0, cantent:Number(it.cantent)||0, costo:Number(it.costo)||0 }));
  _ocFill(o);
  document.getElementById('oce-mtit').textContent=`Modificar OC · Pedido ${o.pedido}`;
  document.getElementById('oce-mtag').textContent='MODIF';
  ocFillArtList();
  ocEditRenderItems(); ocEditCalc();
  document.getElementById('ov-oce').classList.add('open');
}
function _ocFill(o){
  const v=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=(val??''); };
  v('oce-ped', o.pedido); v('oce-fecha', ocFecISO(o.fecha)); v('oce-prov', o.proveedor);
  v('oce-orden', o.orden); v('oce-emp', (o.rubro||'H').trim().toUpperCase()==='T'?'T':'H');
  v('oce-envio', ocFecISO(o.envio)); v('oce-am', (o.am||'M').trim().toUpperCase()==='A'?'A':'M');
  v('oce-ant-imp', o.anticipo); v('oce-ant-fec', ocFecISO(o.fecha_ant)); v('oce-ant-pago', o.pago_ant);
  v('oce-sal-imp', o.saldo);    v('oce-sal-fec', ocFecISO(o.fecha_sal)); v('oce-sal-pago', o.pago_sal);
  v('oce-der-imp', o.derecho);  v('oce-der-fec', ocFecISO(o.fecha_der)); v('oce-der-pago', o.pago_der);
}

function ocEditAddItem(){ _ocEditItems.push({ codint:'', codprov:'', cantped:0, cantent:0, costo:0 }); ocEditRenderItems(); ocEditCalc(); }
function ocEditDelItem(i){ _ocEditItems.splice(i,1); ocEditRenderItems(); ocEditCalc(); }
function ocEditRenderItems(){
  const c=document.getElementById('oce-items'); if(!c) return;
  c.innerHTML=_ocEditItems.map((it,i)=>`
    <div class="oce-itrow">
      <input class="finp" list="oce-art-list" value="${esc(it.codint||'')}" onchange="ocEditItChg(${i},'codint',this.value)" onfocus="this.select()" onclick="this.select()" placeholder="cód. interno">
      <input class="finp" value="${esc(it.codprov||'')}" onchange="ocEditItChg(${i},'codprov',this.value)" onfocus="this.select()" onclick="this.select()" placeholder="cód. prov.">
      <input class="finp" type="text" inputmode="numeric" value="${it.cantped||0}" oninput="ocEditItChg(${i},'cantped',this.value)" onfocus="this.select()" onclick="this.select()" style="text-align:right">
      <input class="finp" type="text" inputmode="numeric" value="${it.cantent||0}" oninput="ocEditItChg(${i},'cantent',this.value)" onfocus="this.select()" onclick="this.select()" style="text-align:right">
      <input class="finp" type="text" inputmode="decimal" value="${it.costo||0}" oninput="ocEditItChg(${i},'costo',this.value)" onfocus="this.select()" onclick="this.select()" style="text-align:right">
      <span class="mono oce-sub" style="text-align:right;align-self:center;color:var(--txt)">${ocFmt((Number(it.cantped)||0)*(Number(it.costo)||0))}</span>
      <button class="btn dng" style="padding:2px 7px" onclick="ocEditDelItem(${i})" title="Quitar">✕</button>
    </div>`).join('') || '<div class="empty" style="padding:10px">Sin renglones — agregá con “＋ Renglón”.</div>';
}
function ocEditItChg(i,campo,val){
  if(!_ocEditItems[i]) return;
  _ocEditItems[i][campo] = (campo==='codint'||campo==='codprov') ? val : (ocNum(val)||0);
  const r=document.querySelectorAll('#oce-items .oce-itrow')[i];
  if(r){ const sub=r.querySelector('.oce-sub'); if(sub){ const it=_ocEditItems[i]; sub.textContent=ocFmt((Number(it.cantped)||0)*(Number(it.costo)||0)); } }
  ocEditCalc();
}
function ocEditCalc(){
  // total OC = suma de items (cantped × costo)
  let tot=0; _ocEditItems.forEach(it=>{ tot+=(Number(it.cantped)||0)*(Number(it.costo)||0); });
  const tEl=document.getElementById('oce-total'); if(tEl) tEl.textContent=ocFmt(tot);
  // saldo de cada bloque = importe − pago
  [['ant'],['sal'],['der']].forEach(([p])=>{
    const imp=ocNum(document.getElementById('oce-'+p+'-imp')?.value)||0;
    const pago=ocNum(document.getElementById('oce-'+p+'-pago')?.value)||0;
    const sEl=document.getElementById('oce-'+p+'-saldo');
    if(sEl){ const s=imp-pago; sEl.textContent=ocFmt(s); sEl.style.color=s>0.005?'var(--red)':'var(--grn)'; }
  });
}

async function saveOC(){
  const ped=parseInt(document.getElementById('oce-ped').value,10);
  if(!ped){ toast('Falta el número de pedido','err'); return; }
  const prov=document.getElementById('oce-prov').value.trim();
  if(!prov){ toast('Falta el proveedor','err'); return; }
  if(_ocEditNum===null && OCS.some(o=>Number(o.pedido)===ped)){
    toast(`El pedido ${ped} ya existe`,'err'); return;
  }
  const numF=id=>{ const v=document.getElementById(id).value; return v.trim()===''?null:(ocNum(v)||0); };
  const fecF=id=>{ const v=document.getElementById(id).value; return v||null; };
  const total=_ocEditItems.reduce((s,it)=>s+(Number(it.cantped)||0)*(Number(it.costo)||0),0);
  const sld=(impId,pagoId)=>{ const raw=document.getElementById(impId).value; if(raw.trim()==='') return null; return (ocNum(raw)||0)-(ocNum(document.getElementById(pagoId).value)||0); };

  const hdr={
    pedido:ped, fecha:fecF('oce-fecha'), proveedor:prov,
    orden:document.getElementById('oce-orden').value.trim()||null,
    rubro:document.getElementById('oce-emp').value, envio:fecF('oce-envio'),
    am:document.getElementById('oce-am').value, total:total,
    anticipo:numF('oce-ant-imp'), fecha_ant:fecF('oce-ant-fec'), pago_ant:numF('oce-ant-pago'), saldo_ant:sld('oce-ant-imp','oce-ant-pago'),
    saldo:numF('oce-sal-imp'),    fecha_sal:fecF('oce-sal-fec'), pago_sal:numF('oce-sal-pago'), saldo_sal:sld('oce-sal-imp','oce-sal-pago'),
    derecho:numF('oce-der-imp'),  fecha_der:fecF('oce-der-fec'), pago_der:numF('oce-der-pago'), saldo_der:sld('oce-der-imp','oce-der-pago')
  };
  try{
    await sbUpsert('ordenes_compra', hdr);
    // reemplazo de items
    await sbDelete('oc_items', {pedido:ped});
    for(const it of _ocEditItems){
      if(!(it.codint||'').trim() && !(Number(it.cantped))) continue;
      await sbUpsert('oc_items', {
        pedido:ped, codprov:it.codprov||null, subcod:null, codint:it.codint||null,
        envio:hdr.envio, am:hdr.am,
        cantped:Math.round(Number(it.cantped)||0), cantent:Math.round(Number(it.cantent)||0), cantpl:null,
        costo:Number(it.costo)||0, total:(Number(it.cantped)||0)*(Number(it.costo)||0)
      });
    }
    closeOv('ov-oce');
    await sbLoadOC(); await sbLoadOCItems();
    const idx=getOCRows().findIndex(o=>Number(o.pedido)===ped);
    ocSelIdx=idx>=0?idx:0;
    renderOC();
    toast(_ocEditNum===null?'Orden creada':'Orden actualizada','scs');
  }catch(e){ console.error('saveOC:', e); toast('Error al guardar','err'); }
}

// ── baja ──────────────────────────────────────────────────
function ocBaja(){
  if(ocSelIdx===null){ toast('Seleccioná una orden','err'); return; }
  const o=getOCRows()[ocSelIdx]; if(!o){ toast('Seleccioná una orden','err'); return; }
  confirm2(`¿Eliminar la OC del pedido ${o.pedido}?`, 'Se borran también sus renglones.', async ()=>{
    try{
      await sbDelete('oc_items', {pedido:o.pedido});
      await sbDelete('ordenes_compra', {pedido:o.pedido});
      OCS=OCS.filter(x=>Number(x.pedido)!==Number(o.pedido));
      OCITEMS=OCITEMS.filter(x=>Number(x.pedido)!==Number(o.pedido));
      ocSelIdx=null; renderOC(); toast('Orden eliminada','scs');
    }catch(e){ console.error('ocBaja:', e); toast('Error al eliminar','err'); }
  });
}

function ocVer(){ ocModif(); }   // doble clic / botón Ver abre el detalle editable

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
      case 'PageDown':  next+=12; break;
      case 'PageUp':    next-=12; break;
      case 'Home':      next=0; break;
      case 'End':       next=total-1; break;
      case 'Enter':     ocModif(); return;
      default: return;
    }
    e.preventDefault();
    next=Math.max(0,Math.min(next,total-1));
    selOC(next);
    document.getElementById('oc-body')?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({block:'nearest'});
  });
}

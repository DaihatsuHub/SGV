// ═══════════════════════════════════════════════════════════
// FACTURACIÓN — Facturas, Items, Tipos de Comprobante
// ═══════════════════════════════════════════════════════════

let FACS   = [];
let CTIPS  = [];
let facSelIdx  = null;
let ctipSelIdx = null;
let facSort = { col: 'fac_fec', asc: true };
let facFechaBusq = '';
let FAC_ITEMS_NUEVA = [];
let FAC_MODO = null; // null=vista, 'A'=alta, 'M'=modif

// ── Cargar datos ──────────────────────────────────────────
async function sbLoadFacs() {
  try {
    FACS = await sbGetAll('facturas', 'fac_fec');
    FACS.sort((a,b) => (b.fac_fec||'').localeCompare(a.fac_fec||''));
  } catch(e) { console.error('sbLoadFacs:', e); }
}
async function sbLoadCtips() {
  try { CTIPS = await sbGet('comp_tipos','order=empresa.asc,prefijo.asc,tipo.asc'); }
  catch(e) { console.error('sbLoadCtips:', e); }
}
async function sbLoadItemsFac(nro) {
  try { return await sbGet('fac_items',`ite_nro=eq.${encodeURIComponent(nro)}&order=id.asc`); }
  catch(e) { console.error('sbLoadItemsFac:', e); return []; }
}

// ── Helpers ───────────────────────────────────────────────
function facGetPrefijo(fac_nro) {
  const nro = (fac_nro||'').trim();
  if (nro.includes('-')) return nro.split('-')[0];
  return nro.substring(0,3);
}
function facGetTipo(fac_nro) { return (fac_nro||'').trim().slice(-1); }
function nfEsNC() {
  const val = document.getElementById('nf-ctip')?.value||'';
  if (!val) return false;
  return val.split('|')[1] === 'C';
}
function nfEsFacturaA() {
  const val  = document.getElementById('nf-ctip')?.value||'';
  const tiva = document.getElementById('nf-tiva')?.value||'';
  if (!val) return false;
  return val.split('|')[1]==='F' && tiva==='I';
}

// ── Empresa label ─────────────────────────────────────────
function facEmpresaLabel(emp) {
  if (emp==='H') return 'HATSU ELECTRONICS S.A.';
  if (emp==='T') return 'TRESSA ARGENTINA S.A.';
  return '';
}

// ══════════════════════════════════════════════════════════
// TIPOS DE COMPROBANTE
// ══════════════════════════════════════════════════════════
const TIPO_LABEL = { F:'Factura', C:'Nota de Crédito', D:'Nota de Débito', R:'Cheque Rechazado' };

function filtCtip() {
  const q = (document.getElementById('ctip-q')?.value||'').toLowerCase();
  return CTIPS.filter(c => !q || c.prefijo.toLowerCase().includes(q) ||
    c.empresa.toLowerCase().includes(q) || (TIPO_LABEL[c.tipo]||'').toLowerCase().includes(q));
}
function renderCtip() {
  const list = filtCtip();
  const body = document.getElementById('ctip-body');
  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML = list.map((c,i) => {
    const sel = ctipSelIdx===i ? 'sel' : '';
    return `<div class="tr-tab ${sel}" style="display:grid;grid-template-columns:60px 80px 80px 1fr 80px 80px;gap:8px;padding:11px 16px;font-size:13px;cursor:pointer" onclick="selCtip(${i})">
      <span class="col-cod">${esc(c.empresa)}</span>
      <span class="col-cod">${esc(c.prefijo)}</span>
      <span class="col-sm">${esc(TIPO_LABEL[c.tipo]||c.tipo)}</span>
      <span style="color:var(--t2);font-size:12px">${c.empresa==='H'?'Hatsu Electronics SA':'Tressa Argentina SA'}</span>
      <span style="text-align:right;font-family:var(--mono)">${c.ultimo_nro||0}</span>
      <span style="text-align:center"><span class="pill ${c.contable?'ps':'pn'}">${c.contable?'Sí':'No'}</span></span>
    </div>`;
  }).join('');
}
function selCtip(i) { ctipSelIdx=i; renderCtip(); }

function ctipAlta() {
  document.getElementById('ctip-empresa').value='H';
  document.getElementById('ctip-prefijo').value='';
  document.getElementById('ctip-tipo').value='F';
  document.getElementById('ctip-ultimo').value=0;
  setTog('ctip-tog-cont','ctip-contable',true);
  document.getElementById('ctip-mtit').textContent='Nuevo Tipo de Comprobante';
  setMtag('ctip-mtag','ALTA','tag-a');
  document.getElementById('ov-ctip').classList.add('open');
  window._ctipe='A';
}
function ctipModif() {
  if(ctipSelIdx===null){toast('Seleccioná un tipo','err');return;}
  const c=filtCtip()[ctipSelIdx];
  document.getElementById('ctip-empresa').value=c.empresa;
  document.getElementById('ctip-prefijo').value=c.prefijo;
  document.getElementById('ctip-tipo').value=c.tipo;
  document.getElementById('ctip-ultimo').value=c.ultimo_nro||0;
  setTog('ctip-tog-cont','ctip-contable',!!c.contable);
  document.getElementById('ctip-mtit').textContent=`Modificar: ${c.empresa}${c.prefijo} ${TIPO_LABEL[c.tipo]||c.tipo}`;
  setMtag('ctip-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-ctip').classList.add('open');
  window._ctipe='M';
}
function ctipBaja() {
  if(ctipSelIdx===null){toast('Seleccioná un tipo','err');return;}
  const c=filtCtip()[ctipSelIdx];
  confirm2(`¿Eliminar tipo "${c.empresa}${c.prefijo} ${TIPO_LABEL[c.tipo]||c.tipo}"?`,'El tipo será eliminado.',async()=>{
    try {
      await sbDelete('comp_tipos',{id:c.id});
      const idx=CTIPS.findIndex(x=>x.id===c.id);
      if(idx>=0) CTIPS.splice(idx,1);
      ctipSelIdx=null; renderCtip(); toast('Tipo eliminado','scs');
    } catch(e){toast('Error al eliminar','err');}
  });
}
async function saveCtip() {
  const empresa=document.getElementById('ctip-empresa').value;
  const prefijo=document.getElementById('ctip-prefijo').value.trim().toUpperCase();
  const tipo=document.getElementById('ctip-tipo').value;
  const ultimo=parseInt(document.getElementById('ctip-ultimo').value)||0;
  const contable=document.getElementById('ctip-contable').value==='1';
  if(!prefijo||prefijo.length!==3){toast('El prefijo debe tener exactamente 3 caracteres','err');return;}
  const data={empresa,prefijo,tipo,ultimo_nro:ultimo,contable};
  try {
    if(window._ctipe==='A'){
      const existe=CTIPS.find(c=>c.empresa===empresa&&c.prefijo===prefijo&&c.tipo===tipo);
      if(existe){toast('Ya existe ese tipo','err');return;}
      await sbUpsert('comp_tipos',data);
    } else {
      const c=filtCtip()[ctipSelIdx];
      await fetch(`${SB_URL}/rest/v1/comp_tipos?id=eq.${c.id}`,{method:'PATCH',headers:{...SB_HDR},body:JSON.stringify(data)});
    }
    await sbLoadCtips(); closeOv('ov-ctip'); ctipSelIdx=null; renderCtip();
    toast(window._ctipe==='A'?'Tipo dado de alta':'Tipo modificado','scs');
  } catch(e){console.error(e);toast('Error al guardar','err');}
}

// ══════════════════════════════════════════════════════════
// LISTA DE FACTURAS
// ══════════════════════════════════════════════════════════
function filtFacs() {
  const emp=document.getElementById('fac-empresa')?.value||'';
  let list=FACS.filter(f=>{
    const me=!emp||(f.fac_nro||'').startsWith(emp);
    const mf=!facFechaBusq||(f.fac_fec||'').includes(facFechaBusq);
    return me&&mf;
  });
  return list.slice().sort((a,b)=>{
    const va=a[facSort.col]||'', vb=b[facSort.col]||'';
    const r=String(va).localeCompare(String(vb));
    if(r!==0) return facSort.asc?r:-r;
    return (a.fac_nro||'').localeCompare(b.fac_nro||'');
  });
}
function toggleFacSort(col) {
  if(facSort.col===col) facSort.asc=!facSort.asc;
  else{facSort.col=col;facSort.asc=true;}
  facSelIdx=null; renderFac();
  if(col==='fac_fec') posicionarUltimaFecha();
}
function setFacFecha(val) {
  if(!val){facFechaBusq='';facSelIdx=null;posicionarUltimaFecha();return;}
  facSort={col:'fac_fec',asc:true}; facFechaBusq='';
  const list=filtFacs();
  let idx=list.findIndex(f=>(f.fac_fec||'')===val);
  if(idx<0) idx=list.findIndex(f=>(f.fac_fec||'')>=val);
  if(idx<0) idx=list.length-1;
  facSelIdx=idx; renderFac();
  document.getElementById('fac-body')?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({block:'center'});
  document.getElementById('fac-fecha').value='';
}
function posicionarUltimaFecha() {
  const list=filtFacs();
  if(!list.length) return;
  const uf=list.map(f=>f.fac_fec||'').filter(Boolean).reduce((a,b)=>a>b?a:b,'');
  const idx=list.findIndex(f=>f.fac_fec===uf);
  if(idx>=0){facSelIdx=idx;renderFac();document.getElementById('fac-body')?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({block:'center'});}
}
function buscarFac() {
  const q=(document.getElementById('fac-q')?.value||'').toLowerCase().trim();
  if(!q){facSelIdx=null;posicionarUltimaFecha();return;}
  const esFecha=/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(q)||/^\d{4}-\d{2}-\d{2}$/.test(q);
  if(esFecha){
    let fi=q;
    if(q.includes('/')||(q.includes('-')&&q.indexOf('-')===2)){const p=q.replace(/\//g,'-').split('-');fi=p[2]+'-'+p[1]+'-'+p[0];}
    facSort={col:'fac_fec',asc:true};
    const list=filtFacs();
    let idx=list.findIndex(f=>(f.fac_fec||'')===fi);
    if(idx<0) idx=list.findIndex(f=>(f.fac_fec||'')>=fi);
    if(idx<0) idx=list.length-1;
    facSelIdx=idx; document.getElementById('fac-q').value=''; renderFac();
    document.getElementById('fac-body')?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({block:'center'});
    return;
  }
  if(/^[ht]/i.test(q)){
    facSort={col:'fac_nro',asc:true};
    const list=filtFacs();
    const idx=list.findIndex(f=>(f.fac_nro||'').toLowerCase().includes(q));
    if(idx>=0){facSelIdx=idx;document.getElementById('fac-q').value='';renderFac();document.getElementById('fac-body')?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({block:'center'});}
    return;
  }
  facSort={col:'fac_cli',asc:true};
  const lc=FACS.filter(f=>{const emp=document.getElementById('fac-empresa')?.value||'';return!emp||(f.fac_nro||'').startsWith(emp);})
    .map(f=>{const cli=CLIS.find(c=>c.CLI_CODIGO===(f.fac_cli||'').trim());return{...f,_r:(cli?.CLI_RAZON||f.fac_cli||'').toLowerCase()};})
    .filter(f=>f._r.includes(q)).sort((a,b)=>a._r.localeCompare(b._r));
  if(lc.length>0){
    const list=filtFacs();
    const idx=list.findIndex(f=>f.fac_nro===lc[0].fac_nro);
    if(idx>=0){facSelIdx=idx;document.getElementById('fac-q').value='';renderFac();document.getElementById('fac-body')?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({block:'center'});}
  }
}

function renderFac() {
  const list=filtFacs();
  const body=document.getElementById('fac-body');
  if(!list.length){body.innerHTML='<div class="empty">🔍 Sin resultados</div>';return;}
  if(facSelIdx===null||facSelIdx>=list.length){
    const uf=list.map(f=>f.fac_fec||'').filter(Boolean).reduce((a,b)=>a>b?a:b,'');
    facSelIdx=list.findIndex(f=>f.fac_fec===uf);
    if(facSelIdx<0) facSelIdx=0;
  }
  const thFac=document.querySelector('.th-fac');
  if(thFac){
    const arr=col=>facSort.col===col?(facSort.asc?' ▲':' ▼'):' ↕';
    thFac.innerHTML=`
      <span style="cursor:pointer" onclick="toggleFacSort('fac_fec')">Fecha${arr('fac_fec')}</span>
      <span style="cursor:pointer" onclick="toggleFacSort('fac_nro')">Comprobante${arr('fac_nro')}</span>
      <span style="cursor:pointer" onclick="toggleFacSort('fac_cli')">Cliente${arr('fac_cli')}</span>`;
  }
  body.innerHTML=list.map((f,i)=>{
    const sel=facSelIdx===i?'sel':'';
    const fec=f.fac_fec?f.fac_fec.substring(0,10).split('-').reverse().join('/'):'—';
    const cli=CLIS.find(c=>c.CLI_CODIGO===(f.fac_cli||'').trim());
    const nomCli=cli?cli.CLI_RAZON:f.fac_cli||'—';
    const prefijo=facGetPrefijo(f.fac_nro);
    const ctip=CTIPS.find(c=>c.prefijo===prefijo);
    const contColor=ctip?(ctip.contable?'var(--acc)':'var(--red)'):'var(--t2)';
    const esBorrador=f.fac_afip_st==='pendiente'&&!f.fac_cae;
    const badge=f.fac_cae
      ?`<span style="font-size:10px;background:#1a3a1a;color:#4ade80;padding:1px 5px;border-radius:3px;margin-left:3px">CAE</span>`
      :esBorrador
        ?`<span style="font-size:10px;background:#2a2a1a;color:#facc15;padding:1px 5px;border-radius:3px;margin-left:3px">BORR</span>`
        :'';
    return `<div class="tr-fac ${sel}" data-idx="${i}" onclick="selFac(${i})">
      <span style="font-size:12px;color:var(--t2);flex-shrink:0">${fec}</span>
      <span class="col-cod" style="font-family:var(--mono);color:${contColor};flex-shrink:0">${esc(f.fac_nro||'')}${badge}</span>
      <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nomCli)}</span>
    </div>`;
  }).join('');
  body.querySelector('.tr-fac.sel')?.scrollIntoView({block:'nearest'});
  const f=list[facSelIdx];
  if(f&&FAC_MODO===null) renderFacDetalle(f);
  document.onkeydown=function(e){
    const page=document.getElementById('page-fac');
    if(!page||!page.classList.contains('active')) return;
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp') return;
    e.preventDefault();
    const total=filtFacs().length;
    if(!total) return;
    let next=e.key==='ArrowDown'?(facSelIdx||0)+1:(facSelIdx||0)-1;
    next=Math.max(0,Math.min(next,total-1));
    selFac(next);
    body.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({block:'nearest'});
  };
}

async function selFac(i) {
  if(FAC_MODO!==null) return; // si estamos editando no cambiar
  facSelIdx=i;
  document.querySelectorAll('#fac-body .tr-fac').forEach((el,idx)=>el.classList.toggle('sel',idx===i));
  const f=filtFacs()[i];
  if(f) await renderFacDetalle(f);
}

// ══════════════════════════════════════════════════════════
// VISTA DETALLE (panel derecho — modo lectura)
// ══════════════════════════════════════════════════════════
async function renderFacDetalle(f) {
  const det=document.getElementById('fac-detalle');
  const fec=f.fac_fec?f.fac_fec.substring(0,10).split('-').reverse().join('/'):'—';
  const cli=CLIS.find(c=>c.CLI_CODIGO===(f.fac_cli||'').trim());
  const mon=f.fac_moneda==='P'?'$':'u$s';
  const items=await sbLoadItemsFac(f.fac_nro);
  const tipoChar=facGetTipo(f.fac_nro);
  const prefijo2=facGetPrefijo(f.fac_nro);
  const ctip2=CTIPS.find(c=>c.prefijo===prefijo2);
  const contColor2=ctip2?(ctip2.contable?'var(--acc)':'var(--red)'):'var(--acc)';
  const esBorrador=f.fac_afip_st==='pendiente'&&!f.fac_cae;
  const empLabel=facEmpresaLabel(f.fac_empresa||(f.fac_nro||'').substring(0,1));

  const caeInfo=f.fac_cae
    ?`<div style="background:#1a3a1a;border-radius:6px;padding:6px 12px;font-family:var(--mono);font-size:11px;color:#4ade80;margin-bottom:8px">✅ CAE: ${f.fac_cae} &nbsp;·&nbsp; Vto: ${f.fac_cae_vto||'—'}</div>`
    :esBorrador
      ?`<div style="background:#2a2a1a;border-radius:6px;padding:6px 12px;font-size:11px;color:#facc15;margin-bottom:8px">⚠️ Borrador — pendiente de autorización AFIP</div>`
      :'';

  det.innerHTML=`
    <div style="padding:16px;height:100%;overflow-y:auto;box-sizing:border-box">

      <!-- Encabezado tipo Watch-Land -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--b1)">
        <div>
          <div style="font-size:18px;font-weight:700;color:var(--txt);letter-spacing:1px">${esc(empLabel)}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">I.V.A Responsable Inscripto</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700;font-family:var(--mono);color:${contColor2}">${esc(f.fac_nro||'')}</div>
          <div style="font-size:12px;color:var(--t2)">${TIPO_LABEL[tipoChar]||''}</div>
          <div style="font-size:11px;color:var(--t3)">Fecha: ${fec}</div>
        </div>
      </div>

      ${caeInfo}

      <!-- Datos cliente -->
      <div style="background:var(--s2);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <div><span style="color:var(--t3)">Cliente: </span><strong>${esc(cli?cli.CLI_RAZON:f.fac_cli||'—')}</strong></div>
          <div><span style="color:var(--t3)">Cód: </span>${esc(f.fac_cli||'—')}</div>
          <div><span style="color:var(--t3)">CUIT: </span>${esc(cli?.CLI_CUIT||'—')}</div>
          <div><span style="color:var(--t3)">IVA: </span>${esc(f.fac_tiva||'—')}</div>
          <div><span style="color:var(--t3)">Dirección: </span>${esc(cli?.CLI_DOMIC||'—')}</div>
          <div><span style="color:var(--t3)">Ciudad: </span>${esc(cli?.CLI_LOCAL||'—')}</div>
          <div><span style="color:var(--t3)">Cond.Pago: </span>${esc(cli?.CLI_CONPAG||f.fac_vcomi||'—')}</div>
          <div><span style="color:var(--t3)">Transporte: </span>${esc(f.fac_transp||'—')}</div>
        </div>
      </div>

      <!-- Grilla items -->
      <div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-bottom:4px;letter-spacing:1px">ÍTEMS (${items.length})</div>
      <div style="background:var(--s2);border-radius:6px;overflow:hidden;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:100px 1fr 90px 60px 85px 85px;gap:4px;padding:6px 10px;background:var(--s3);font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">
          <span>Código</span><span>Descripción</span><span>Despacho</span><span style="text-align:right">Cant</span><span style="text-align:right">Precio</span><span style="text-align:right">Subtotal</span>
        </div>
        <div style="max-height:220px;overflow-y:auto">
        ${items.length?items.map(it=>{
          const dto=it.ite_costo&&it.ite_costo>0?((1-it.ite_uni/it.ite_costo)*100).toFixed(1):'';
          return `<div style="display:grid;grid-template-columns:100px 1fr 90px 60px 85px 85px;gap:4px;padding:6px 10px;border-bottom:1px solid var(--b1);font-size:12px;align-items:center">
            <span style="font-family:var(--mono);color:var(--acc)">${esc(it.ite_art||'')}</span>
            <span style="color:var(--t2)">${esc(it.ite_desp||'')}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${esc(it.ite_desp_nro||it.ite_sub||'')}</span>
            <span style="text-align:right;font-family:var(--mono)">${it.ite_can||0}</span>
            <span style="text-align:right;font-family:var(--mono)">${mon}${fmt(it.ite_uni)}</span>
            <span style="text-align:right;font-family:var(--mono);color:var(--grn)">${mon}${fmt(it.ite_imp)}</span>
          </div>`;
        }).join(''):'<div style="padding:12px;text-align:center;color:var(--t3);font-size:12px">Sin ítems</div>'}
        </div>
      </div>

      <!-- Totales -->
      <div style="background:var(--s2);border-radius:6px;padding:10px 14px">
        ${(f.fac_iva||0)>0?`
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>Subtotal neto</span><span>${mon} ${fmt((f.fac_sub||0)-(f.fac_iva||0))}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>IVA 21%</span><span>${mon} ${fmt(f.fac_iva)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>Subtotal</span><span>${mon} ${fmt(f.fac_sub)}</span></div>
        ${(f.fac_percib||0)>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>Percepción IIBB</span><span>${mon} ${fmt(f.fac_percib)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:var(--txt);padding:8px 0 3px;border-top:1px solid var(--b1);margin-top:4px"><span>TOTAL</span><span>${mon} ${fmt(f.fac_total)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span style="color:var(--t3)">Saldo</span><span style="color:${(f.fac_saldo||0)>0?'var(--red)':'var(--grn)'}">${mon} ${fmt(f.fac_saldo)}</span></div>
      </div>

    </div>`;
}

// ══════════════════════════════════════════════════════════
// NUEVA FACTURA — formulario inline en panel derecho
// ══════════════════════════════════════════════════════════
function facAlta() {
  FAC_ITEMS_NUEVA=[];
  FAC_MODO='A';
  const hoy=new Date().toISOString().substring(0,10);
  renderFacForm(hoy,'H','');
}

function facModif() {
  if(facSelIdx===null){toast('Seleccioná una factura','err');return;}
  toast('Próximamente: Modificar factura','scs');
}
function facBaja() {
  if(facSelIdx===null){toast('Seleccioná una factura','err');return;}
  toast('Próximamente: Anular factura','scs');
}
function facImprimir() {
  if(facSelIdx===null){toast('Seleccioná una factura','err');return;}
  toast('Próximamente: Imprimir factura','scs');
}

function facCancelar() {
  FAC_MODO=null;
  FAC_ITEMS_NUEVA=[];
  const f=filtFacs()[facSelIdx];
  if(f) renderFacDetalle(f);
  else document.getElementById('fac-detalle').innerHTML='<div class="fac-det-placeholder">← Seleccioná una factura</div>';
}

// ── Renderizar formulario inline ──────────────────────────
function renderFacForm(fecha, empresa, cliCod) {
  const det=document.getElementById('fac-detalle');

  // Opciones moneda
  const monesOpts=(TABLAS['MONE']||[]).map(m=>`<option value="${m.CODIGO}">${m.STRING1} ${m.DETALLE}</option>`).join('') || '<option value="P">$ Pesos</option>';

  // Opciones CTIP por empresa
  const ctipOpts=CTIPS.filter(c=>c.empresa===empresa&&['F','C','D'].includes(c.tipo))
    .map(c=>`<option value="${c.prefijo}|${c.tipo}">${c.prefijo} — ${TIPO_LABEL[c.tipo]||c.tipo}</option>`).join('');

  // Opciones CPAG
  const cpagOpts='<option value="">— Sin especificar —</option>'+(TABLAS['CPAG']||[]).map(c=>`<option value="${c.CODIGO}">${c.CODIGO} — ${c.DETALLE}</option>`).join('');

  // Opciones EXPR
  const exprOpts='<option value="">— Sin especificar —</option>'+(TABLAS['EXPR']||[]).map(e=>`<option value="${e.CODIGO}">${e.CODIGO} — ${e.DETALLE}</option>`).join('');

  det.innerHTML=`
    <div style="padding:14px;height:100%;overflow-y:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:10px">

      <!-- Header formulario -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:2px solid var(--acc)">
        <div style="font-size:15px;font-weight:700;color:var(--acc)">📄 Nueva Factura</div>
        <button class="btn" onclick="facCancelar()" style="padding:3px 10px;font-size:12px">✕ Cancelar</button>
      </div>

      <!-- Identificación -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Empresa *</label>
          <select class="finp" id="nf-empresa" onchange="nfOnEmpresaChange()" style="width:100%">
            <option value="H" ${empresa==='H'?'selected':''}>H — Hatsu Electronics SA</option>
            <option value="T" ${empresa==='T'?'selected':''}>T — Tressa Argentina SA</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Tipo Comprobante *</label>
          <select class="finp" id="nf-ctip" onchange="nfOnCtipChange()" style="width:100%">
            <option value="">— Seleccionar —</option>
            ${ctipOpts}
          </select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Número</label>
          <span id="nf-preview-nro" style="font-family:var(--mono);font-size:13px;color:var(--acc);background:var(--s3);padding:5px 10px;border-radius:4px;display:block">—</span>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Fecha *</label>
          <input class="finp" id="nf-fecha" type="date" value="${fecha}" style="width:100%">
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Moneda</label>
          <select class="finp" id="nf-moneda" onchange="nfCalcTotales()" style="width:100%">${monesOpts}</select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Descuento %</label>
          <input class="finp" id="nf-dto" type="number" min="0" max="100" step="0.1" value="0" oninput="nfCalcTotales()" style="width:100%">
        </div>
      </div>

      <!-- Cliente -->
      <div style="background:var(--s2);border-radius:6px;padding:10px 12px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Cliente</div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;margin-bottom:8px">
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Código *</label>
            <input class="finp" id="nf-cli-cod" maxlength="6" style="text-transform:uppercase;width:100%" placeholder="Código" oninput="nfOnCliCodChange()">
          </div>
          <div style="position:relative">
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Buscar por Razón Social</label>
            <input class="finp" id="nf-cli-busq" placeholder="Escribí para buscar..." style="width:100%"
              oninput="nfOnCliBusqInput()"
              onblur="setTimeout(()=>{const s=document.getElementById('nf-cli-sug');if(s)s.style.display='none'},200)">
            <div id="nf-cli-sug" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--s1);border:1px solid var(--acc);border-radius:0 0 6px 6px;z-index:200;max-height:180px;overflow-y:auto"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 80px 120px 120px;gap:8px">
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Razón Social</label>
            <input class="finp" id="nf-razon" readonly style="color:var(--t2);background:var(--s3);width:100%" placeholder="—">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">IVA</label>
            <input class="finp" id="nf-tiva" readonly style="color:var(--t2);background:var(--s3);width:100%" placeholder="—">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Cond. de Pago</label>
            <select class="finp" id="nf-conpag" style="width:100%">${cpagOpts}</select>
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Transporte</label>
            <select class="finp" id="nf-transp" style="width:100%">${exprOpts}</select>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:11px;color:var(--t3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px">Ítems</span>
          <button class="btn pri" onclick="nfAgregarItem()" style="padding:3px 10px;font-size:12px">＋ Agregar</button>
        </div>
        <div style="background:var(--s2);border-radius:6px;overflow:hidden">
          <div id="nf-items-hdr"></div>
          <div id="nf-items-body"></div>
        </div>
      </div>

      <!-- Totales + botones -->
      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end">
        <div style="background:var(--s2);border-radius:6px;padding:10px 14px">
          <div id="nf-fila-neto" style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>Subtotal neto</span><span id="nf-tot-neto">$ 0,00</span></div>
          <div id="nf-fila-iva"  style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>IVA</span><span id="nf-tot-iva">$ 0,00</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>Subtotal</span><span id="nf-tot-sub">$ 0,00</span></div>
          <div id="nf-fila-dto"  style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>Descuento</span><span id="nf-tot-dto">—</span></div>
          <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:var(--txt);padding:6px 0 2px;border-top:1px solid var(--b1);margin-top:4px"><span>TOTAL</span><span id="nf-tot-total">$ 0,00</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn pri" onclick="nfGuardar()" style="padding:8px 18px;font-size:13px">💾 Guardar borrador</button>
          <button class="btn" onclick="facCancelar()" style="padding:8px 18px;font-size:13px">Cancelar</button>
        </div>
      </div>

    </div>`;

  nfRenderItems();
  nfCalcTotales();
}

// ── Empresa change ────────────────────────────────────────
function nfOnEmpresaChange() {
  const emp=document.getElementById('nf-empresa').value;
  const sel=document.getElementById('nf-ctip');
  if(!sel) return;
  const lista=CTIPS.filter(c=>c.empresa===emp&&['F','C','D'].includes(c.tipo));
  sel.innerHTML='<option value="">— Seleccionar —</option>'+
    lista.map(c=>`<option value="${c.prefijo}|${c.tipo}">${c.prefijo} — ${TIPO_LABEL[c.tipo]||c.tipo}</option>`).join('');
  nfOnCtipChange();
  nfRenderItems();
}

function nfOnCtipChange() {
  const val=document.getElementById('nf-ctip')?.value||'';
  const el=document.getElementById('nf-preview-nro');
  if(!val){if(el)el.textContent='—';return;}
  const [prefijo,tipo]=val.split('|');
  const emp=document.getElementById('nf-empresa').value;
  const ct=CTIPS.find(c=>c.empresa===emp&&c.prefijo===prefijo&&c.tipo===tipo);
  if(ct&&el) el.textContent=`${prefijo}-${String((ct.ultimo_nro||0)+1).padStart(6,'0')}`;
  nfRenderItems();
  nfCalcTotales();
}

// ── Cliente ───────────────────────────────────────────────
function nfOnCliCodChange() {
  const cod=(document.getElementById('nf-cli-cod')?.value||'').trim().toUpperCase();
  const sug=document.getElementById('nf-cli-sug');
  if(sug){sug.innerHTML='';sug.style.display='none';}
  if(!cod){nfLimpiarCliente();return;}
  const cli=CLIS.find(c=>c.CLI_CODIGO===cod);
  if(cli) nfSetCliente(cli);
  else nfLimpiarCliente();
}

function nfOnCliBusqInput() {
  const q=(document.getElementById('nf-cli-busq')?.value||'').toLowerCase().trim();
  const sug=document.getElementById('nf-cli-sug');
  if(!sug) return;
  if(!q||q.length<2){sug.innerHTML='';sug.style.display='none';return;}
  const matches=CLIS.filter(c=>(c.CLI_RAZON||'').toLowerCase().includes(q)||(c.CLI_CODIGO||'').toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){sug.innerHTML='';sug.style.display='none';return;}
  sug.style.display='block';
  sug.innerHTML=matches.map(c=>`<div onclick="nfSelCliSug('${c.CLI_CODIGO}')"
    style="padding:7px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--b1);display:flex;gap:10px;align-items:center">
    <span style="font-family:var(--mono);color:var(--acc);flex-shrink:0">${esc(c.CLI_CODIGO)}</span>
    <span style="color:var(--txt)">${esc(c.CLI_RAZON||'')}</span>
  </div>`).join('');
}

function nfSelCliSug(cod) {
  const cli=CLIS.find(c=>c.CLI_CODIGO===cod);
  if(!cli) return;
  const codEl=document.getElementById('nf-cli-cod');
  const busqEl=document.getElementById('nf-cli-busq');
  const sug=document.getElementById('nf-cli-sug');
  if(codEl) codEl.value=cli.CLI_CODIGO;
  if(busqEl) busqEl.value=cli.CLI_RAZON||'';
  if(sug){sug.innerHTML='';sug.style.display='none';}
  nfSetCliente(cli);
}

function nfSetCliente(cli) {
  const razonEl=document.getElementById('nf-razon');
  const tivaEl=document.getElementById('nf-tiva');
  const dtoEl=document.getElementById('nf-dto');
  const conpagEl=document.getElementById('nf-conpag');
  if(razonEl) razonEl.value=cli.CLI_RAZON||'';
  if(tivaEl)  tivaEl.value=cli.CLI_IVA||'';
  if(dtoEl)   dtoEl.value=cli.CLI_DTO||0;
  // Preseleccionar condición de pago del cliente
  if(conpagEl){
    const opt=[...conpagEl.options].find(o=>o.value===(cli.CLI_CONPAG||''));
    if(opt) conpagEl.value=opt.value;
  }
  nfCalcTotales();
  nfRenderItems();
}

function nfLimpiarCliente() {
  ['nf-razon','nf-tiva'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const dto=document.getElementById('nf-dto');if(dto)dto.value='0';
}

// ── Items ─────────────────────────────────────────────────
function nfAgregarItem() {
  FAC_ITEMS_NUEVA.push({ite_art:'',ite_desp_art:'',ite_disp:0,ite_desp_nro:'',ite_desp_fec:'',ite_can:1,ite_uni:0,ite_iva_porc:21,ite_imp:0,ite_iva_imp:0,_desps:null,_desp_id:null});
  nfRenderItems();
  nfCalcTotales();
  setTimeout(()=>{const inputs=document.querySelectorAll('.nf-item-cod');if(inputs.length)inputs[inputs.length-1].focus();},50);
}

function nfEliminarItem(idx) {
  FAC_ITEMS_NUEVA.splice(idx,1);
  nfRenderItems();
  nfCalcTotales();
}

async function nfItemArtChange(idx,cod) {
  const codUp=cod.trim().toUpperCase();
  FAC_ITEMS_NUEVA[idx].ite_art=codUp;
  FAC_ITEMS_NUEVA[idx].ite_desp_art='';
  FAC_ITEMS_NUEVA[idx].ite_disp=0;
  FAC_ITEMS_NUEVA[idx].ite_desp_nro='';
  FAC_ITEMS_NUEVA[idx]._desps=null;
  FAC_ITEMS_NUEVA[idx]._desp_id=null;
  if(!codUp){nfRenderItems();return;}
  const art=ARTS.find(a=>a.ART_COD===codUp);
  if(!art){
    // Código inexistente — mostrar error
    FAC_ITEMS_NUEVA[idx].ite_desp_art='⚠️ Código no encontrado';
    nfRenderItems();
    return;
  }
  const empresa=document.getElementById('nf-empresa')?.value||'H';
  FAC_ITEMS_NUEVA[idx].ite_desp_art=art.ART_DES||'';
  FAC_ITEMS_NUEVA[idx].ite_disp=empresa==='T'?(art.ART_STKT||0):(art.ART_STK||0);
  FAC_ITEMS_NUEVA[idx].ite_uni=art.ART_PRE||0;
  // Despachos
  try {
    const esNC=nfEsNC();
    const desps=await sbGet('despachos',`dep_art=eq.${encodeURIComponent(codUp)}&order=dep_fec.desc`);
    const despsFilt=esNC?desps:desps.filter(d=>(d.dep_ent||0)-(d.dep_sal||0)>0);
    FAC_ITEMS_NUEVA[idx]._desps=despsFilt;
    if(despsFilt.length===1){
      const d=despsFilt[0];
      FAC_ITEMS_NUEVA[idx].ite_desp_nro=d.dep_desp+(d.dep_sub||'');
      FAC_ITEMS_NUEVA[idx].ite_desp_fec=d.dep_fec||'';
      FAC_ITEMS_NUEVA[idx].ite_disp=esNC?null:(d.dep_ent||0)-(d.dep_sal||0);
      FAC_ITEMS_NUEVA[idx]._desp_id=d.dep_id;
    }
  } catch(e){console.error('nfItemArtChange desps:',e);}
  nfRenderItems();
  nfCalcTotales();
}

function nfItemDespChange(idx,depId) {
  const desps=FAC_ITEMS_NUEVA[idx]._desps||[];
  const d=desps.find(x=>String(x.dep_id)===String(depId));
  if(!d) return;
  const esNC=nfEsNC();
  FAC_ITEMS_NUEVA[idx].ite_desp_nro=d.dep_desp+(d.dep_sub||'');
  FAC_ITEMS_NUEVA[idx].ite_desp_fec=d.dep_fec||'';
  FAC_ITEMS_NUEVA[idx].ite_disp=esNC?null:(d.dep_ent||0)-(d.dep_sal||0);
  FAC_ITEMS_NUEVA[idx]._desp_id=depId;
  nfRenderItems();
  nfCalcTotales();
}

function nfItemChange(idx,campo,valor) {
  FAC_ITEMS_NUEVA[idx][campo]=valor;
  const it=FAC_ITEMS_NUEVA[idx];
  if(campo==='ite_can'&&!nfEsNC()&&it.ite_disp!==null&&valor>it.ite_disp){
    FAC_ITEMS_NUEVA[idx].ite_can=it.ite_disp;
    toast(`Máximo disponible: ${it.ite_disp}`,'err');
  }
  const esA=nfEsFacturaA();
  const div=1+(it.ite_iva_porc||0)/100;
  const neto=esA?it.ite_uni/div:it.ite_uni;
  it.ite_imp=neto*(FAC_ITEMS_NUEVA[idx].ite_can||1);
  it.ite_iva_imp=esA?(it.ite_uni-neto)*(FAC_ITEMS_NUEVA[idx].ite_can||1):0;
  nfRenderItems();
  nfCalcTotales();
}

function nfItemBusqArt(idx,q) {
  const sug=document.getElementById(`nf-art-sug-${idx}`);
  if(!sug) return;
  if(!q||q.length<2){sug.innerHTML='';sug.style.display='none';return;}
  const empresa=document.getElementById('nf-empresa')?.value||'H';
  const matches=ARTS.filter(a=>
    a.ART_COD.toLowerCase().includes(q.toLowerCase())||
    (a.ART_DES||'').toLowerCase().includes(q.toLowerCase())
  ).slice(0,8);
  if(!matches.length){sug.innerHTML='';sug.style.display='none';return;}
  sug.style.display='block';
  sug.innerHTML=matches.map(a=>{
    const disp=empresa==='T'?(a.ART_STKT||0):(a.ART_STK||0);
    const dispColor=disp>0?'color:var(--grn)':'color:var(--red)';
    return `<div onclick="nfSelArtSug(${idx},'${a.ART_COD}')"
      style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--b1);display:grid;grid-template-columns:100px 1fr 60px;gap:6px;align-items:center">
      <span style="font-family:var(--mono);color:var(--acc)">${esc(a.ART_COD)}</span>
      <span style="color:var(--t2)">${esc(a.ART_DES||'')}</span>
      <span style="text-align:right;font-family:var(--mono);${dispColor}">${disp}</span>
    </div>`;
  }).join('');
}

function nfSelArtSug(idx,cod) {
  const sug=document.getElementById(`nf-art-sug-${idx}`);
  if(sug){sug.innerHTML='';sug.style.display='none';}
  const input=document.getElementById(`nf-item-cod-${idx}`);
  if(input) input.value=cod;
  nfItemArtChange(idx,cod);
}

function nfRenderItems() {
  const body=document.getElementById('nf-items-body');
  const hdr=document.getElementById('nf-items-hdr');
  if(!body||!hdr) return;
  const esA=nfEsFacturaA();
  const cols=`90px 1fr 55px 110px 65px 100px ${esA?'75px 75px ':''} 95px 30px`;
  hdr.innerHTML=`<div style="display:grid;grid-template-columns:${cols};gap:4px;padding:6px 8px;background:var(--s3);font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">
    <span>Código</span><span>Descripción</span><span style="text-align:right">Disp</span><span>Despacho</span>
    <span style="text-align:right">Cant</span><span style="text-align:right">Precio c/IVA</span>
    ${esA?'<span style="text-align:center">%IVA</span><span style="text-align:right">IVA</span>':''}
    <span style="text-align:right">Importe</span><span></span>
  </div>`;
  if(!FAC_ITEMS_NUEVA.length){
    body.innerHTML=`<div style="text-align:center;color:var(--t3);font-size:12px;padding:16px">Sin ítems — usá <strong>＋ Agregar</strong></div>`;
    return;
  }
  body.innerHTML=FAC_ITEMS_NUEVA.map((it,i)=>{
    const div=1+(it.ite_iva_porc||0)/100;
    const neto=esA?it.ite_uni/div:it.ite_uni;
    const ivaT=esA?(it.ite_uni-neto)*(it.ite_can||1):0;
    const imp=neto*(it.ite_can||1);
    const dispTxt=it.ite_disp===null?'—':(it.ite_disp||0);
    const dispColor=(!nfEsNC()&&(it.ite_disp||0)===0&&it.ite_art)?'color:var(--red)':'color:var(--grn)';
    const esInexistente=(it.ite_art&&!ARTS.find(a=>a.ART_COD===it.ite_art));
    const desps=it._desps||[];
    let despHtml='';
    if(desps.length>1&&!it._desp_id){
      despHtml=`<select class="finp" style="font-size:10px;width:100%;padding:2px 4px" onchange="nfItemDespChange(${i},this.value)">
        <option value="">— Elegir —</option>
        ${desps.map(d=>{
          const disp=(d.dep_ent||0)-(d.dep_sal||0);
          const fec=d.dep_fec?d.dep_fec.substring(0,10).split('-').reverse().join('/'):'' ;
          return `<option value="${d.dep_id}">${d.dep_desp}${d.dep_sub||''} ${fec} (${disp})</option>`;
        }).join('')}
      </select>`;
    } else {
      despHtml=`<span style="font-family:var(--mono);font-size:10px;color:var(--t2)">${esc(it.ite_desp_nro||'—')}</span>`;
    }
    return `<div style="display:grid;grid-template-columns:${cols};gap:4px;padding:6px 8px;border-bottom:1px solid var(--b1);align-items:center;background:var(--s2);${esInexistente?'background:#2a1a1a;':''}position:relative">
      <div style="position:relative">
        <input id="nf-item-cod-${i}" class="nf-item-cod finp" value="${esc(it.ite_art||'')}" placeholder="Código"
          style="font-size:11px;text-transform:uppercase;width:100%;${esInexistente?'border-color:var(--red);':''}"
          oninput="nfItemBusqArt(${i},this.value)"
          onchange="nfItemArtChange(${i},this.value)"
          onblur="setTimeout(()=>{const s=document.getElementById('nf-art-sug-${i}');if(s)s.style.display='none'},200)">
        <div id="nf-art-sug-${i}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--s1);border:1px solid var(--acc);border-radius:0 0 4px 4px;z-index:100;max-height:150px;overflow-y:auto"></div>
      </div>
      <span style="font-size:11px;color:${esInexistente?'var(--red)':'var(--t2)'}">${esc(it.ite_desp_art||'')}</span>
      <span style="text-align:right;font-family:var(--mono);font-size:11px;${dispColor}">${dispTxt}</span>
      <div>${despHtml}</div>
      <input class="finp" type="number" min="1" step="1" value="${it.ite_can||1}"
        style="text-align:right;font-size:12px;width:100%"
        oninput="nfItemChange(${i},'ite_can',parseFloat(this.value)||1)">
      <input class="finp" type="number" min="0" step="0.01" value="${it.ite_uni||''}" placeholder="0.00"
        style="text-align:right;font-size:12px;width:100%"
        oninput="nfItemChange(${i},'ite_uni',parseFloat(this.value)||0)">
      ${esA?`
        <select class="finp" style="font-size:11px" onchange="nfItemChange(${i},'ite_iva_porc',parseFloat(this.value))">
          <option value="21"   ${(it.ite_iva_porc||21)===21  ?'selected':''}>21%</option>
          <option value="10.5" ${(it.ite_iva_porc||21)===10.5?'selected':''}>10.5%</option>
          <option value="0"    ${(it.ite_iva_porc||21)===0   ?'selected':''}>Exento</option>
        </select>
        <span style="text-align:right;font-family:var(--mono);font-size:11px;color:var(--acc)">$${fmt(ivaT)}</span>`:''}
      <span style="text-align:right;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--grn)">$${fmt(imp)}</span>
      <button class="btn dng" onclick="nfEliminarItem(${i})" style="padding:2px 6px;font-size:11px">✕</button>
    </div>`;
  }).join('');
}

function nfCalcTotales() {
  const esA=nfEsFacturaA();
  const dto=parseFloat(document.getElementById('nf-dto')?.value||0)||0;
  let neto=0,iva=0;
  FAC_ITEMS_NUEVA.forEach(it=>{
    const div=1+(it.ite_iva_porc||0)/100;
    const n=esA?it.ite_uni/div:it.ite_uni;
    const can=it.ite_can||1;
    neto+=n*can;
    if(esA) iva+=(it.ite_uni-n)*can;
  });
  const subtotal=neto+iva;
  const dtoImp=subtotal*dto/100;
  const total=subtotal-dtoImp;
  const monSel=document.getElementById('nf-moneda')?.value||'P';
  const monObj=(TABLAS['MONE']||[]).find(m=>m.CODIGO===monSel);
  const mon=monObj?monObj.STRING1:'$';
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  const setFlex=(id,show)=>{const el=document.getElementById(id);if(el)el.style.display=show?'flex':'none';};
  set('nf-tot-neto',`${mon} ${fmt(neto)}`);
  set('nf-tot-iva', `${mon} ${fmt(iva)}`);
  set('nf-tot-sub', `${mon} ${fmt(subtotal)}`);
  set('nf-tot-dto',dto>0?`- ${mon} ${fmt(dtoImp)}`:'—');
  set('nf-tot-total',`${mon} ${fmt(total)}`);
  setFlex('nf-fila-neto',esA);
  setFlex('nf-fila-iva', esA);
  setFlex('nf-fila-dto', dto>0);
  window._nfTotales={neto,iva,subtotal,dtoImp,total};
}

async function nfGuardar() {
  const empresa=document.getElementById('nf-empresa')?.value||'';
  const ctipVal=document.getElementById('nf-ctip')?.value||'';
  const cliCod=(document.getElementById('nf-cli-cod')?.value||'').trim().toUpperCase();
  const fecha=document.getElementById('nf-fecha')?.value||'';
  const moneda=document.getElementById('nf-moneda')?.value||'P';
  const tiva=document.getElementById('nf-tiva')?.value||'';

  if(!empresa){toast('Seleccioná una empresa','err');return;}
  if(!ctipVal){toast('Seleccioná un tipo de comprobante','err');return;}
  if(!cliCod){toast('Ingresá un código de cliente','err');return;}
  if(!fecha){toast('Ingresá la fecha','err');return;}
  if(!FAC_ITEMS_NUEVA.length){toast('Agregá al menos un ítem','err');return;}

  const cli=CLIS.find(c=>c.CLI_CODIGO===cliCod);
  if(!cli){toast(`Cliente ${cliCod} no encontrado`,'err');return;}

  for(let i=0;i<FAC_ITEMS_NUEVA.length;i++){
    const it=FAC_ITEMS_NUEVA[i];
    if(!it.ite_art?.trim()){toast(`Ítem ${i+1}: falta el código de artículo`,'err');return;}
    if(!ARTS.find(a=>a.ART_COD===it.ite_art)){toast(`Ítem ${i+1}: código ${it.ite_art} no existe`,'err');return;}
    if(!(it.ite_uni>0)){toast(`Ítem ${i+1}: precio debe ser mayor a 0`,'err');return;}
    if(!nfEsNC()&&!it._desp_id&&(it._desps||[]).length>1){toast(`Ítem ${i+1}: seleccioná un despacho`,'err');return;}
  }

  const [prefijo,tipo]=ctipVal.split('|');
  const ct=CTIPS.find(c=>c.empresa===empresa&&c.prefijo===prefijo&&c.tipo===tipo);
  if(!ct){toast('Tipo de comprobante no encontrado','err');return;}

  const nroSig=(ct.ultimo_nro||0)+1;
  const facNro=`${prefijo}-${String(nroSig).padStart(6,'0')}`;
  if(FACS.find(f=>f.fac_nro===facNro)){toast(`El número ${facNro} ya existe`,'err');return;}

  const esA=nfEsFacturaA();
  const tot=window._nfTotales||{};
  const dto=parseFloat(document.getElementById('nf-dto')?.value||0)||0;
  const conpag=document.getElementById('nf-conpag')?.value||'';
  const transp=document.getElementById('nf-transp')?.value||'';
  const remito=document.getElementById('nf-remito')?.value||'';

  const facData={
    fac_nro:facNro, fac_fec:fecha, fac_cli:cliCod,
    fac_empresa:empresa, fac_ctip:prefijo, fac_tiva:tiva, fac_moneda:moneda,
    fac_sub:tot.subtotal||0, fac_iva:esA?(tot.iva||0):0,
    fac_total:tot.total||0, fac_saldo:tot.total||0, fac_percib:0,
    fac_transp:transp, fac_remito:remito, fac_vcomi:conpag, fac_monpor:dto,
    fac_afip_st:'pendiente', fac_cae:null, fac_cae_vto:null
  };

  try {
    await sbUpsert('facturas',facData);
    for(const it of FAC_ITEMS_NUEVA){
      const div=1+(it.ite_iva_porc||0)/100;
      const neto=esA?it.ite_uni/div:it.ite_uni;
      await sbUpsert('fac_items',{
        ite_nro:facNro, ite_art:it.ite_art||'',
        ite_desp:it.ite_desp_nro||'',
        ite_can:it.ite_can, ite_uni:it.ite_uni,
        ite_imp:neto*(it.ite_can||1),
        ite_iva_porc:esA?(it.ite_iva_porc||21):0,
        ite_iva_imp:esA?(it.ite_uni-neto)*(it.ite_can||1):0,
        ite_impu:0, ite_costo:it.ite_uni
      });
    }
    await fetch(`${SB_URL}/rest/v1/comp_tipos?id=eq.${ct.id}`,{method:'PATCH',headers:{...SB_HDR},body:JSON.stringify({ultimo_nro:nroSig})});
    ct.ultimo_nro=nroSig;
    await sbLoadFacs();
    FAC_MODO=null;
    FAC_ITEMS_NUEVA=[];
    renderFac();
    toast(`✓ Factura ${facNro} guardada como borrador`,'scs');
    const idx=filtFacs().findIndex(f=>f.fac_nro===facNro);
    if(idx>=0) selFac(idx);
  } catch(e){console.error('nfGuardar:',e);toast('Error al guardar','err');}
}

// ══════════════════════════════════════════════════════════
// TOP 10
// ══════════════════════════════════════════════════════════
async function openTop10() {
  const ov=document.getElementById('ov-top10');
  if(!ov) return;
  const anio=new Date().getFullYear();
  document.getElementById('top10-desde').value=`${anio}-01-01`;
  document.getElementById('top10-hasta').value=`${anio}-12-31`;
  document.getElementById('top10-emp').value='';
  document.getElementById('top10-body').innerHTML='<div style="text-align:center;color:var(--t3);padding:20px">Presioná Calcular para ver los resultados</div>';
  ov.classList.add('open');
}

async function calcTop10() {
  const desde=document.getElementById('top10-desde').value;
  const hasta=document.getElementById('top10-hasta').value;
  const emp=document.getElementById('top10-emp').value;
  const body=document.getElementById('top10-body');
  body.innerHTML='<div style="text-align:center;color:var(--t3);padding:20px">⏳ Calculando...</div>';
  try {
    const facsResp=await sbGetAll('facturas','fac_nro',`fac_fec=gte.${desde}&fac_fec=lte.${hasta}`);
    let facNros=new Set(facsResp.map(f=>f.fac_nro));
    if(emp) facNros=new Set([...facNros].filter(n=>(n||'').startsWith(emp)));
    if(!facNros.size){body.innerHTML='<div style="text-align:center;color:var(--t3);padding:20px">Sin facturas en el período</div>';return;}
    const nrosArr=[...facNros];
    const allItems=[];
    for(let i=0;i<nrosArr.length;i+=200){
      const inList=nrosArr.slice(i,i+200).map(n=>n.trim()).join(',');
      const items=await sbGet('fac_items',`ite_nro=in.(${encodeURIComponent(inList)})&select=ite_art,ite_desp,ite_can,ite_imp&limit=10000`);
      allItems.push(...items);
    }
    const agg={};
    allItems.forEach(it=>{
      const cod=(it.ite_art||'').trim();
      if(!cod) return;
      if(!agg[cod]) agg[cod]={cant:0,imp:0};
      agg[cod].cant+=(it.ite_can||0);
      agg[cod].imp+=(it.ite_imp||0);
    });
    const top10=Object.entries(agg).sort((a,b)=>b[1].cant-a[1].cant).slice(0,10);
    if(!top10.length){body.innerHTML='<div style="text-align:center;color:var(--t3);padding:20px">Sin datos</div>';return;}
    body.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:var(--s3)">
        <th style="padding:8px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">#</th>
        <th style="padding:8px;text-align:left;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">Código</th>
        <th style="padding:8px;text-align:left;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">Descripción</th>
        <th style="padding:8px;text-align:right;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">Cantidad</th>
        <th style="padding:8px;text-align:right;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">Importe</th>
      </tr></thead>
      <tbody>${top10.map(([cod,d],i)=>{
        const art=ARTS.find(a=>a.ART_COD===cod);
        return `<tr style="border-bottom:1px solid var(--b1)">
          <td style="padding:9px 8px;text-align:center;font-family:var(--mono);color:var(--t3)">${i+1}</td>
          <td style="padding:9px 8px;font-family:var(--mono);color:var(--acc)">${esc(cod)}</td>
          <td style="padding:9px 8px">${esc(art?art.ART_DES:'—')}</td>
          <td style="padding:9px 8px;text-align:right;font-family:var(--mono);color:var(--grn)">${d.cant.toLocaleString('es-AR')}</td>
          <td style="padding:9px 8px;text-align:right;font-family:var(--mono)">$${fmt(d.imp)}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch(e){console.error(e);body.innerHTML='<div style="text-align:center;color:var(--red);padding:20px">Error al calcular</div>';}
}
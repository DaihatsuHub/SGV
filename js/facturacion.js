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
let NF_PERCEP = [];   // [{cod, detalle, pct, importe}] percepciones IIBB de la factura actual
let FAC_MODO = null;

async function sbLoadFacs() {
  try {
    FACS = await sbGetAll('facturas', 'fac_fec');
    FACS.sort((a,b) => (b.fac_fec||'').localeCompare(a.fac_fec||''));
  } catch(e) { console.error('sbLoadFacs:', e); }
}

// Carga facturas bajo demanda (idempotente). La usan el módulo Facturas,
// Recibos (lista de deudores) y la Ficha del cliente. Facturas YA NO se carga al login.
async function ensureFacturas(){
  if(window._facsLoaded) return;
  if(window._facsLoadingPromise) return window._facsLoadingPromise;
  window._facsLoadingPromise = (typeof sbLoadFacs==='function' ? sbLoadFacs() : Promise.resolve())
    .then(()=>{ window._facsLoaded=true; window._facsLoadingPromise=null; })
    .catch(e=>{ window._facsLoadingPromise=null; console.error('ensureFacturas:',e); throw e; });
  return window._facsLoadingPromise;
}
async function sbLoadCtips() {
  try { CTIPS = await sbGet('comp_tipos','order=empresa.asc,prefijo.asc,tipo.asc'); }
  catch(e) { console.error('sbLoadCtips:', e); }
}
async function sbLoadItemsFac(nro) {
  try { return await sbGet('fac_items',`ite_nro=eq.${encodeURIComponent(nro)}&order=id.asc`); }
  catch(e) { console.error('sbLoadItemsFac:', e); return []; }
}

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
  const tiva = document.getElementById('nf-tiva-cod')?.value||'';
  if (!val) return false;
  const tipo = val.split('|')[1];
  const ct = nfCtipActual();
  const paraFacturar = !!(ct && ct.tab_fact);   // p/Facturar off = mercadería → sin IVA
  // Letra A (discrimina IVA): sólo si es "para facturar", F/C/D y cliente Inscripto
  return paraFacturar && (tipo==='F'||tipo==='C'||tipo==='D') && tiva==='I';
}
function facEmpresaLabel(emp) {
  if (emp==='H') return 'HATSU ELECTRONICS S.A.';
  if (emp==='T') return 'TRESSA ARGENTINA S.A.';
  return '';
}
function facFindCli(fac_cli) {
  const cod = (fac_cli||'').trim();
  return CLIS.find(c => (c.CLI_CODIGO||'').trim() === cod);
}

// Formato numérico con decimales y separador de miles
function fmtN(v, dec=2) {
  if(v===null||v===undefined||isNaN(v)) return '0,' + '0'.repeat(dec);
  return Number(v).toLocaleString('es-AR', {minimumFractionDigits:dec, maximumFractionDigits:dec});
}
// Símbolo/prefijo de una moneda (STRING1 de la tabla MONE)
function nfMonSimbolo(cod){
  const m=(TABLAS['MONE']||[]).find(x=>x.CODIGO===(cod||'P'));
  return (m && m.STRING1) ? m.STRING1 : '$';
}
// Parseo de número en formato es-AR ("1.234,56" -> 1234.56)
function nfParseNum(s){
  return parseFloat(String(s||'').trim().replace(/\./g,'').replace(',','.'))||0;
}

const TIPO_LABEL = { F:'Factura', C:'Nota de Crédito', D:'Nota de Débito', R:'Cheque Rechazado' };

// Helpers descripcion
const IVA_DESC = {
  I:'Responsable Inscripto', M:'Monotributista', C:'Consumidor Final',
  E:'Exento', N:'No Responsable', L:'Pequeño Contribuyente'
};
function facIvaDesc(cod) {
  if(!cod) return '—';
  return IVA_DESC[cod] ? `${cod} — ${IVA_DESC[cod]}` : cod;
}
function facTranspDesc(cod) {
  if(!cod) return '—';
  const t=(TABLAS['EXPR']||[]).find(e=>e.CODIGO===cod);
  return t ? `${t.CODIGO} — ${t.DETALLE}` : cod;
}
function facVendDesc(cod) {
  if(!cod) return '—';
  const v=(TABLAS['VEND']||[]).find(e=>e.CODIGO===cod);
  return v ? `${v.CODIGO} — ${v.DETALLE}` : cod;
}

// Datos fiscales de empresas
const EMP_DATA = {
  H: {
    razon:  'HATSU ELECTRONICS S.A.',
    domic:  'Sarmiento 1206 - 7° "A"',
    ciudad: '(1041) Capital Federal',
    tel:    'Tel.: 4382-4779 - Fax: 4814-1092',
    email:  'daihatsu@hatsu.com.ar',
    cuit:   '30-69161036-1',
    iibb:   '901-195790-3',
    inicio: '01-08-1997',
    iva:    'I.V.A. RESPONSABLE INSCRIPTO'
  },
  T: {
    razon:  'TRESSA ARGENTINA S.A.',
    domic:  'Sarmiento 1206 - 7° "A"',
    ciudad: '(1041) Capital Federal',
    tel:    'Tel.: 4382-4779 - Fax: 4814-1092',
    email:  'ventas@tressa.com.ar',
    cuit:   '30-70912824-4',
    iibb:   '901-209397-0',
    inicio: '01-04-2005',
    iva:    'I.V.A. RESPONSABLE INSCRIPTO'
  }
};

function filtCtip() {
  const q = (document.getElementById('ctip-q')?.value||'').toLowerCase();
  let list = CTIPS.filter(c => !q || c.prefijo.toLowerCase().includes(q) ||
    c.empresa.toLowerCase().includes(q) || (TIPO_LABEL[c.tipo]||'').toLowerCase().includes(q));
  const s = SORT_STATE['ctip'];
  if(s && s.col){
    list = list.slice().sort((a,b)=>{
      let va, vb;
      if(s.col==='desc'){ va=a.empresa==='H'?'Hatsu':'Tressa'; vb=b.empresa==='H'?'Hatsu':'Tressa'; }
      else if(s.col==='tipo'){ va=TIPO_LABEL[a.tipo]||a.tipo; vb=TIPO_LABEL[b.tipo]||b.tipo; }
      else { va=a[s.col]; vb=b[s.col]; }
      if(va==null) va=''; if(vb==null) vb='';
      let r;
      if(typeof va==='boolean'||typeof vb==='boolean') r=(va===vb?0:va?1:-1);
      else if(typeof va==='number'&&typeof vb==='number') r=va-vb;
      else r=String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    });
  }
  return list;
}
function renderCtip() {
  const list = filtCtip();
  const body = document.getElementById('ctip-body');
  const cols = getActiveCols('ctip');
  const gridTpl = cols.map(c=>c.width||'1fr').join(' ');

  // Encabezado dinámico
  const th = document.querySelector('.th-ctip');
  if(th){
    th.style.gridTemplateColumns = gridTpl;
    th.innerHTML = cols.map(c=>
      `<span class="th-sortable" onclick="toggleSort('ctip','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('ctip',c.field)}</span>`
    ).join('');
  }

  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
  const pill = v => `<span style="text-align:center"><span class="pill ${v?'ps':'pn'}">${v?'Sí':'No'}</span></span>`;
  body.innerHTML = list.map((c,i) => {
    const sel = ctipSelIdx===i ? 'sel' : '';
    return `<div class="tr-tab ${sel}" style="display:grid;grid-template-columns:${gridTpl};gap:8px;padding:11px 16px;font-size:13px;cursor:pointer" onclick="selCtip(${i})">` +
      cols.map(col=>{
        if(col.field==='empresa')    return `<span class="col-cod">${esc(c.empresa)}</span>`;
        if(col.field==='prefijo')    return `<span class="col-cod">${esc(c.prefijo)}</span>`;
        if(col.field==='tipo')       return `<span class="col-sm">${esc(TIPO_LABEL[c.tipo]||c.tipo)}</span>`;
        if(col.field==='desc')       return `<span style="color:var(--t2);font-size:12px">${c.empresa==='H'?'Hatsu Electronics SA':'Tressa Argentina SA'}</span>`;
        if(col.field==='ultimo_nro') return `<span style="text-align:right;font-family:var(--mono)">${c.ultimo_nro||0}</span>`;
        if(col.field==='contable')   return pill(c.contable);
        if(col.field==='tab_stk')    return pill(c.tab_stk);
        if(col.field==='tab_fact')   return pill(c.tab_fact);
        if(col.field==='tab_percib') return pill(c.tab_percib);
        return `<span class="col-sm">${esc(String(c[col.field]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');
}
function selCtip(i) { ctipSelIdx=i; renderCtip(); }

function ctipAlta() {
  document.getElementById('ctip-empresa').value='H';
  document.getElementById('ctip-prefijo').value='';
  document.getElementById('ctip-tipo').value='F';
  document.getElementById('ctip-ultimo').value=0;
  setTog('ctip-tog-cont','ctip-contable',true);
  setTog('ctip-tog-stk','ctip-stk',false);
  setTog('ctip-tog-fact','ctip-fact',false);
  setTog('ctip-tog-percib','ctip-percib',false);
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
  setTog('ctip-tog-stk','ctip-stk',!!c.tab_stk);
  setTog('ctip-tog-fact','ctip-fact',!!c.tab_fact);
  setTog('ctip-tog-percib','ctip-percib',!!c.tab_percib);
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
      const res=await apiPost('/comp_tipos/borrar',{id:c.id});
      if(!res.ok){ toast(res.error||'No se pudo eliminar','err'); return; }
      const idx=CTIPS.findIndex(x=>x.id===c.id);
      if(idx>=0) CTIPS.splice(idx,1);
      ctipSelIdx=null; renderCtip(); toast('Tipo eliminado','scs');
    } catch(e){toast('Error al eliminar: '+e.message,'err');}
  });
}
async function saveCtip() {
  const empresa=document.getElementById('ctip-empresa').value;
  const prefijo=document.getElementById('ctip-prefijo').value.trim().toUpperCase();
  const tipo=document.getElementById('ctip-tipo').value;
  const ultimo=parseInt(document.getElementById('ctip-ultimo').value)||0;
  const contable=document.getElementById('ctip-contable').value==='1';
  const tabStk=document.getElementById('ctip-stk').value==='1';
  const tabFact=document.getElementById('ctip-fact').value==='1';
  const tabPercib=document.getElementById('ctip-percib').value==='1';
  if(!prefijo||prefijo.length!==3){toast('El prefijo debe tener exactamente 3 caracteres','err');return;}
  const data={empresa,prefijo,tipo,ultimo_nro:ultimo,contable};
  const id = window._ctipe==='A' ? null : (filtCtip()[ctipSelIdx]?.id);
  syncSaving();
  try {
    const res=await apiPost('/comp_tipos/guardar',{ id, empresa, prefijo, tipo, ultimo_nro:ultimo, contable, tab_stk:tabStk, tab_fact:tabFact, tab_percib:tabPercib });
    if(!res.ok){ syncErr(); toast(res.error||'No se pudo guardar','err'); return; }
    await sbLoadCtips(); closeOv('ov-ctip'); ctipSelIdx=null; renderCtip();
    syncOk();
    toast(window._ctipe==='A'?'Tipo dado de alta':'Tipo modificado','scs');
  } catch(e){console.error(e); syncErr(); toast('Error al guardar: '+e.message,'err');}
}

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
    .map(f=>{const cli=facFindCli(f.fac_cli);return{...f,_r:(cli?.CLI_RAZON||f.fac_cli||'').toLowerCase()};})
    .filter(f=>f._r.includes(q)).sort((a,b)=>a._r.localeCompare(b._r));
  if(lc.length>0){
    const list=filtFacs();
    const idx=list.findIndex(f=>f.fac_nro===lc[0].fac_nro);
    if(idx>=0){facSelIdx=idx;document.getElementById('fac-q').value='';renderFac();document.getElementById('fac-body')?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({block:'center'});}
  }
}

function renderFac() {
  const body=document.getElementById('fac-body');
  // Carga diferida: facturas no se cargan al login; se traen al abrir el módulo
  if(!window._facsLoaded){
    if(body) body.innerHTML='<div class="empty">⏳ Cargando facturas…</div>';
    Promise.all([ ensureFacturas(), (typeof ensureArts==='function'?ensureArts():Promise.resolve()) ]).then(()=>renderFac()).catch(()=>{ if(body) body.innerHTML='<div class="empty">⚠️ Error al cargar facturas</div>'; });
    return;
  }
  const list=filtFacs();
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
    const cli=facFindCli(f.fac_cli);
    const nomCli=cli?cli.CLI_RAZON:(f.fac_cli||'—').trim();
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
  if(FAC_MODO!==null) return;
  facSelIdx=i;
  document.querySelectorAll('#fac-body .tr-fac').forEach((el,idx)=>el.classList.toggle('sel',idx===i));
  const f=filtFacs()[i];
  if(f) await renderFacDetalle(f);
}

async function renderFacDetalle(f) {
  const det=document.getElementById('fac-detalle');
  const fec=f.fac_fec?f.fac_fec.substring(0,10).split('-').reverse().join('/'):'—';
  const cli=facFindCli(f.fac_cli);
  const mon=f.fac_moneda==='P'?'$':'u$s';
  const items=await sbLoadItemsFac(f.fac_nro);
  const tipoChar=facGetTipo(f.fac_nro);
  const prefijo2=facGetPrefijo(f.fac_nro);
  const ctip2=CTIPS.find(c=>c.prefijo===prefijo2);
  const contColor2=ctip2?(ctip2.contable?'var(--acc)':'var(--red)'):'var(--acc)';
  const esBorrador=f.fac_afip_st==='pendiente'&&!f.fac_cae;
  const empLabel=facEmpresaLabel(f.fac_empresa||(f.fac_nro||'').substring(0,1));

  const caeInfo=f.fac_cae
    ?`<div style="background:#1a3a1a;border-radius:6px;padding:8px 12px;font-family:var(--mono);font-size:11px;color:#4ade80;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
        <span>✅ CAE: ${f.fac_cae} &nbsp;·&nbsp; Vto: ${f.fac_cae_vto||'—'}</span>
        <button onclick="facImprimir()" class="btn scs" style="padding:3px 10px;font-size:11px">🖨 Imprimir</button>
      </div>`
    :esBorrador
      ?`<div style="background:#2a2a1a;border-radius:6px;padding:8px 12px;font-size:11px;color:#facc15;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
          <span>⚠️ Borrador — pendiente de autorización AFIP</span>
          <button onclick="facAutorizarAfip('${f.fac_nro}')" class="btn pri" style="padding:3px 10px;font-size:11px;background:#b45309;border-color:#b45309">⚡ Autorizar AFIP</button>
        </div>`
      :'';

  det.innerHTML=`
    <div style="padding:16px;height:100%;overflow-y:auto;box-sizing:border-box">
      <div style="display:grid;grid-template-columns:1fr auto;gap:16px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--b1)">
        <div>
          <div style="font-size:18px;font-weight:700;color:var(--txt);letter-spacing:1px">${esc(empLabel)}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">I.V.A Responsable Inscripto</div>
          ${tipoChar==='C'&&(f.fac_saldo||0)>0?`<button onclick="ncAbrirAplicar('${f.fac_nro}')" class="btn pri" style="margin-top:8px;padding:5px 12px;font-size:12px">📌 Aplicar saldo de NC</button>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:700;font-family:var(--mono);color:${contColor2}">${esc(f.fac_nro||'')}</div>
          <div style="font-size:12px;color:var(--t2)">${TIPO_LABEL[tipoChar]||''}</div>
          <div style="font-size:11px;color:var(--t3)">Fecha: ${fec}</div>
          ${f.fac_usuario?`<div style="font-size:11px;color:var(--t3)">Emitió: ${esc(f.fac_usuario)}</div>`:''}
        </div>
      </div>
      ${caeInfo}
      <div style="background:var(--s2);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          <div><span style="color:var(--t3)">Cliente: </span><strong>${esc(cli?cli.CLI_RAZON:(f.fac_cli||'—').trim())}</strong></div>
          <div><span style="color:var(--t3)">Cód: </span>${esc((f.fac_cli||'').trim())}</div>
          <div><span style="color:var(--t3)">CUIT: </span>${esc(cli?.CLI_CUIT||'—')}</div>
          <div><span style="color:var(--t3)">IVA: </span>${esc(facIvaDesc(f.fac_tiva||cli?.CLI_IVA||''))}</div>
          <div><span style="color:var(--t3)">Dirección: </span>${esc(cli?.CLI_DOMIC||'—')}</div>
          <div><span style="color:var(--t3)">Ciudad: </span>${esc(cli?.CLI_LOCAL||'—')}</div>
          <div><span style="color:var(--t3)">Cond.Pago: </span>${esc(cli?.CLI_CONPAG||f.fac_vcomi||'—')}</div>
          <div><span style="color:var(--t3)">Transporte: </span>${esc(facTranspDesc(f.fac_transp||''))}</div>
          <div><span style="color:var(--t3)">Vendedor: </span>${esc(facVendDesc(f.fac_vend||''))}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-bottom:4px;letter-spacing:1px">ÍTEMS (${items.length})</div>
      <div style="background:var(--s2);border-radius:6px;overflow:hidden;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:100px 1fr 90px 55px 85px 85px 55px;gap:4px;padding:6px 10px;background:var(--s3);font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">
          <span>Código</span><span>Descripción</span><span>Despacho</span><span style="text-align:right">Cant</span><span style="text-align:right">Precio</span><span style="text-align:right">Subtotal</span><span style="text-align:right">Dto</span>
        </div>
        <div style="max-height:220px;overflow-y:auto">
        ${items.length?items.map(it=>{
          const art=ARTS.find(a=>(a.ART_COD||'').trim()===(it.ite_art||'').trim());
          const desArt=art?art.ART_DES:(it.ite_desp||'');
          return `<div style="display:grid;grid-template-columns:100px 1fr 90px 55px 85px 85px 55px;gap:4px;padding:6px 10px;border-bottom:1px solid var(--b1);font-size:12px;align-items:center">
            <span style="font-family:var(--mono);color:var(--acc)">${esc(it.ite_art||'')}</span>
            <span style="color:var(--t2)">${esc(desArt)}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(it.ite_desp||'')}">${esc(it.ite_desp||'')}</span>
            <span style="text-align:right;font-family:var(--mono)">${it.ite_can||0}</span>
            <span style="text-align:right;font-family:var(--mono)">${mon}${fmt(it.ite_uni)}</span>
            <span style="text-align:right;font-family:var(--mono);color:var(--grn)">${mon}${fmt(it.ite_imp)}</span>
            <span style="text-align:right;font-family:var(--mono);font-size:11px">${(()=>{const o=Number(it.ite_preori)||0,u=Number(it.ite_uni)||0; if(o>0&&u<o){const d=Math.round((1-u/o)*100); if(d>=1) return `<span style="color:var(--wrn,#f59e0b)" title="Original: ${mon}${fmt(o)}">-${d}%</span>`;} return '<span style="color:var(--t3)">—</span>';})()}</span>
          </div>`;
        }).join(''):'<div style="padding:12px;text-align:center;color:var(--t3);font-size:12px">Sin ítems</div>'}
        </div>
      </div>
      <div style="background:var(--s2);border-radius:6px;padding:10px 14px">
        ${(f.fac_iva||0)>0?`
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>Subtotal neto</span><span>${mon} ${fmt((f.fac_sub||0)-(f.fac_iva||0))}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>IVA 21%</span><span>${mon} ${fmt(f.fac_iva)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>Subtotal</span><span>${mon} ${fmt(f.fac_sub)}</span></div>
        ${(Array.isArray(f.fac_percep_det)&&f.fac_percep_det.length)
          ? f.fac_percep_det.map(p=>`<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>${esc(p.detalle||'Percepción')} (${fmt(p.pct)}%)</span><span>${mon} ${fmt(p.importe)}</span></div>`).join('')
          : ((f.fac_percib||0)>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0"><span>Percepción IIBB</span><span>${mon} ${fmt(f.fac_percib)}</span></div>`:'')}
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:var(--txt);padding:8px 0 3px;border-top:1px solid var(--b1);margin-top:4px"><span>TOTAL</span><span>${mon} ${fmt(f.fac_total)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0"><span style="color:var(--t3)">Saldo</span><span style="color:${(f.fac_saldo||0)>0?'var(--red)':'var(--grn)'}">${mon} ${fmt(f.fac_saldo)}</span></div>
      </div>
    </div>`;
}

// AUTORIZAR AFIP
// Cartel de error de AFIP: muestra el mensaje original + una explicación clara.
function facAfipError(rawMsg){
  const msg=String(rawMsg||'').trim();
  const low=msg.toLowerCase();
  let trad=null;
  if(/debito o credito|cbteasoc|periodoasoc|comprobante.*asociad/.test(low))
    trad={t:'Falta el comprobante asociado',d:'Estás autorizando una Nota de Crédito o Débito. AFIP exige indicar la factura original asociada. Este sistema todavía no envía ese dato para NC/ND.'};
  else if(/no se corresponde|próximo a autorizar|proximo a autorizar|correlativ|ultimo autorizado|último autorizado/.test(low))
    trad={t:'Numeración o fecha fuera de orden',d:'El número o la fecha no coinciden con lo que espera AFIP. Los comprobantes se autorizan en orden correlativo, y la fecha no puede ser anterior al último autorizado ni tener más de 5 días de diferencia con hoy. Revisá número y fecha.'};
  else if(/cbtefch|n-5|n\+5|rango.*fecha|fecha.*rango/.test(low))
    trad={t:'Fecha fuera de rango',d:'La fecha del comprobante debe estar dentro de los 5 días anteriores o posteriores a hoy, y no puede ser anterior al último comprobante autorizado. Corregí la fecha y reintentá.'};
  else if(/consumidor final|docnro|doctipo|identificar al/.test(low))
    trad={t:'Falta identificar al cliente',d:'Para este importe AFIP no acepta “Consumidor Final” sin datos: hay que identificar al cliente con CUIT o DNI. Cargá el documento del cliente y reintentá.'};
  else if(/cuit|padron|padrón/.test(low))
    trad={t:'Documento del cliente inválido',d:'El CUIT/CUIL del cliente no es válido o no figura en los padrones de AFIP. Verificá el número de documento del cliente.'};
  else if(/token|sign|firma|certific|no autorizado a realizar/.test(low))
    trad={t:'Problema de autenticación',d:'AFIP rechazó el token, la firma o el certificado. Suele ser un tema del certificado digital o de la hora del sistema. Si persiste, revisá el certificado y su vencimiento.'};
  else if(/no respond|timeout|no disponible|caido|caído|50[234]/.test(low))
    trad={t:'AFIP no disponible',d:'El servicio de AFIP no respondió o está caído temporalmente. Esperá unos minutos y reintentá.'};

  const prev=document.getElementById('afip-err-ov'); if(prev) prev.remove();
  const ov=document.createElement('div');
  ov.id='afip-err-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML=
    `<div style="background:var(--s1,#1e1e22);border:1px solid var(--red,#e5484d);border-radius:12px;max-width:480px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,.5);font-family:system-ui,Arial,sans-serif;overflow:hidden">
       <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--red,#e5484d)">
         <span style="color:#fff;font-weight:700;font-size:14px">⚠️ AFIP rechazó el comprobante</span>
         <button id="afip-err-x" style="background:rgba(255,255,255,.22);border:none;color:#fff;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px">✕</button>
       </div>
       <div style="padding:16px;color:var(--txt,#e8e8e8)">
         ${trad?`<div style="font-size:14px;font-weight:700;color:var(--txt,#fff);margin-bottom:5px">${trad.t}</div>
         <div style="font-size:13px;color:var(--t2,#bbb);line-height:1.5;margin-bottom:14px">${trad.d}</div>`:''}
         <div style="font-size:10px;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Mensaje original de AFIP</div>
         <div style="background:var(--s3,#2a2a2e);border-radius:6px;padding:10px 12px;font-family:var(--mono,monospace);font-size:12px;color:var(--t1,#ddd);line-height:1.45;white-space:pre-wrap;word-break:break-word">${esc(msg)}</div>
       </div>
       <div style="padding:0 16px 16px;display:flex;justify-content:flex-end">
         <button id="afip-err-ok" class="btn" style="padding:7px 16px;font-size:13px">Entendido</button>
       </div>
     </div>`;
  document.body.appendChild(ov);
  const close=()=>{ ov.remove(); document.removeEventListener('keydown',onKey); };
  function onKey(e){ if(e.key==='Escape') close(); }
  ov.querySelector('#afip-err-x').onclick=close;
  ov.querySelector('#afip-err-ok').onclick=close;
  ov.onclick=(e)=>{ if(e.target===ov) close(); };
  document.addEventListener('keydown',onKey);
}

async function facAutorizarAfip(facNro) {
  const f = FACS.find(x=>x.fac_nro===facNro);
  if (!f) { toast('Factura no encontrada','err'); return; }
  if (f.fac_cae) { toast('Esta factura ya tiene CAE','err'); return; }
  const btn = document.querySelector('button[onclick*="facAutorizarAfip"]');
  if (btn) { btn.disabled=true; btn.textContent='⏳ Autorizando...'; }
  try {
    const cli = facFindCli(f.fac_cli);
    const empresa = f.fac_empresa || (f.fac_nro||'').substring(0,1);
    const prefijo = facGetPrefijo(f.fac_nro);
    // El tipo sale de la última letra del número (F/C/D/R). Si una factura vieja
    // no tiene letra, se cae al ctip por prefijo+empresa como respaldo.
    // Tipo de DOCUMENTO (Factura/NC/ND) = última letra del número (F/C/D/R)
    let tipoChar = facGetTipo(f.fac_nro);
    if (!['F','C','D'].includes(tipoChar)) {
      const ctipFb = CTIPS.find(c=>c.prefijo===prefijo&&c.empresa===empresa);
      tipoChar = ctipFb ? ctipFb.tipo : 'F';
    }
    const tiva = f.fac_tiva || '';
    // LETRA AFIP (A/B/C) = 2do carácter del prefijo (ej. "HA4" → "A").
    // Si el prefijo no la trae clara, se deduce de la condición de IVA como respaldo.
    let letra = (prefijo.charAt(1) || '').toUpperCase();
    if (!['A','B','C'].includes(letra)) {
      letra = tiva==='I' ? 'A' : (tiva==='C'||tiva==='M'||tiva==='N') ? 'B' : 'C';
    }
    let cbteTipo;
    if (tipoChar === 'F')      cbteTipo = letra==='A' ? 1 : letra==='C' ? 11 : 6;
    else if (tipoChar === 'C') cbteTipo = letra==='A' ? 3 : letra==='C' ? 13 : 8;
    else if (tipoChar === 'D') cbteTipo = letra==='A' ? 2 : letra==='C' ? 12 : 7;
    else throw new Error('Tipo de comprobante no soportado para AFIP');
    const ptoVtaStr = prefijo.replace(/[^0-9]/g,'');
    const ptoVta = parseInt(ptoVtaStr) || 1;
    const docTipo = cli?.CLI_CUIT ? 80 : 99;
    const docNro  = cli?.CLI_CUIT ? parseInt((cli.CLI_CUIT||'').replace(/\D/g,'')) : 0;
    const condIvaMap = { I:1, M:4, C:5, E:6, N:5, L:5 };
    const condIvaReceptor = condIvaMap[tiva] || 5;
    const impTotal = f.fac_total || 0;
    const impIva   = f.fac_iva   || 0;
    const impNeto  = impTotal - impIva;
    const ivas = impIva > 0 ? [{ id:5, baseImp: impNeto, importe: impIva }] : [];
    const esC = cbteTipo===11||cbteTipo===13||cbteTipo===12;
    const payload = {
      empresa,
      factura: {
        ptoVta, cbteTipo, docTipo, docNro, condIvaReceptor,
        impTotal,
        impNeto: esC ? impTotal : impNeto,
        impIva:  esC ? 0 : impIva,
        concepto: 1,
        moneda: f.fac_moneda==='U' ? 'DOL' : 'PES',
        monCotiz: 1,
        ivas: esC ? [] : ivas
      }
    };
    const resp = await fetch(`${SB_URL}/functions/v1/afip-facturar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (await getAuthToken()) },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok || !data.cae) { console.error('AFIP respuesta completa:', data); throw new Error(data.errores || data.error || ('AFIP respondió: ' + JSON.stringify(data))); }
    await apiPost('/facturas/cae', { fac_nro: facNro, cae: data.cae, caeVto: data.caeVto });
    const idx = FACS.findIndex(x=>x.fac_nro===facNro);
    if (idx>=0) {
      FACS[idx].fac_cae     = data.cae;
      FACS[idx].fac_cae_vto = data.caeVto;
      FACS[idx].fac_afip_st = 'autorizado';
    }
    toast(`✅ CAE obtenido: ${data.cae}`, 'scs');
    renderFac();
    const fidx = filtFacs().findIndex(x=>x.fac_nro===facNro);
    if(fidx>=0) selFac(fidx);
  } catch(e) {
    console.error('facAutorizarAfip:', e);
    facAfipError(e.message);
    if (btn) { btn.disabled=false; btn.textContent='⚡ Autorizar AFIP'; }
  }
}

// IMPRESIÓN DE FACTURA CON QR AFIP
async function facImprimir() {
  if(facSelIdx===null){toast('Seleccioná una factura','err');return;}
  const f = filtFacs()[facSelIdx];
  if(!f){toast('Factura no encontrada','err');return;}
  const cli = facFindCli(f.fac_cli);
  const emp = f.fac_empresa || (f.fac_nro||'').substring(0,1);
  const ed  = EMP_DATA[emp] || EMP_DATA['H'];
  const mon = f.fac_moneda==='P'?'$':'u$s';
  const fec = f.fac_fec?f.fac_fec.substring(0,10).split('-').reverse().join('/'):'—';
  const tipoChar = facGetTipo(f.fac_nro);
  const tipoLabel = TIPO_LABEL[tipoChar] || 'Factura';
  const items = await sbLoadItemsFac(f.fac_nro);
  const tiva = f.fac_tiva || cli?.CLI_IVA || '';
  const prefijo = facGetPrefijo(f.fac_nro);
  const ctip = CTIPS.find(c=>c.prefijo===prefijo&&c.empresa===emp);
  let letra = 'C';
  if(ctip?.tipo==='F') {
    if(tiva==='I') letra='A';
    else if(tiva==='C'||tiva==='M'||tiva==='N') letra='B';
    else letra='C';
  } else if(ctip?.tipo==='C') {
    if(tiva==='I') letra='A'; else letra='B';
  }
  let qrUrl = '';
  if(f.fac_cae) {
    const ptoVta = parseInt(prefijo.replace(/[^0-9]/g,''))||1;
    const cuitEmp = parseInt((ed.cuit||'').replace(/\D/g,''));
    const cuitDoc = cli?.CLI_CUIT ? parseInt((cli.CLI_CUIT||'').replace(/\D/g,'')) : 0;
    const cbteTipo = tipoChar==='F' ? (letra==='A'?1:letra==='B'?6:11) :
                     tipoChar==='C' ? (letra==='A'?3:letra==='B'?8:13) : 11;
    const qrData = {
      ver:1, fecha:f.fac_fec?f.fac_fec.substring(0,10):'',
      cuit: cuitEmp, ptoVta, tipoCmp: cbteTipo,
      nroCmp: parseInt((f.fac_nro||'').split('-')[1]||'0'),
      importe: f.fac_total||0, moneda:'PES', ctz:1,
      tipoDocRec: cuitDoc>0?80:99, nroDocRec: cuitDoc||0,
      tipoCodAut:'E', codAut: parseInt(f.fac_cae||'0')
    };
    const qrB64 = btoa(JSON.stringify(qrData));
    qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrB64}`;
  }
  const subtotalNeto = (f.fac_sub||0)-(f.fac_iva||0);
  const tieneIva = (f.fac_iva||0)>0;
  const codComp = letra==='A'?'01':letra==='B'?'06':'11';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${tipoLabel} ${f.fac_nro||''}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:10mm 10mm}
  @page{margin:10mm 10mm}
  .header{display:grid;grid-template-columns:1fr 40mm 1fr;gap:0;margin-bottom:4mm;border:1px solid #000}
  .h-left,.h-right{padding:3mm}
  .h-center{border-left:1px solid #000;border-right:1px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2mm}
  .letra-box{font-size:28px;font-weight:700;border:2px solid #000;width:20mm;height:20mm;display:flex;align-items:center;justify-content:center;margin-bottom:2mm}
  .emp-nombre{font-size:14px;font-weight:700;text-transform:uppercase;margin-bottom:2mm}
  .emp-dato{font-size:9px;line-height:1.4;color:#333}
  .comp-titulo{font-size:13px;font-weight:700;margin-bottom:2mm;text-align:right}
  .comp-nro{font-size:12px;font-weight:700;margin-bottom:2mm;text-align:right}
  .comp-dato{font-size:9px;line-height:1.6;text-align:right}
  .cli-box{border:1px solid #000;padding:3mm;margin-bottom:3mm;display:grid;grid-template-columns:1fr 1fr;gap:1mm 4mm;font-size:10px}
  .cli-row{display:flex;gap:2mm}
  .cli-lbl{color:#555;white-space:nowrap}
  .cli-val{font-weight:600}
  .cli-full{grid-column:1/-1}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:3mm;font-size:9px;table-layout:fixed}
  .items-table th{background:#000;color:#fff;padding:1.5mm 1mm;text-align:left;font-weight:600;font-size:8px;text-transform:uppercase;white-space:nowrap;overflow:hidden}
  .items-table th.r{text-align:right}
  .items-table td{padding:1mm 1mm;border-bottom:1px solid #ddd;vertical-align:middle;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .items-table td.r{text-align:right;font-family:monospace;font-size:8.5px}
  .items-table td.des{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .items-table td.cod{font-family:monospace;font-size:8px;white-space:nowrap}
  .items-table tr:nth-child(even){background:#f9f9f9}
  .footer-grid{display:grid;grid-template-columns:1fr auto;gap:4mm;margin-top:3mm}
  .totales{border:1px solid #000;padding:3mm;min-width:60mm}
  .tot-row{display:flex;justify-content:space-between;padding:1mm 0;font-size:10px;border-bottom:1px solid #eee}
  .tot-row:last-child{border-bottom:none;font-size:13px;font-weight:700;padding-top:2mm}
  .tot-lbl{color:#555}
  .tot-val{font-family:monospace;font-weight:600}
  .cae-box{border:1px solid #000;padding:3mm;font-size:9px;margin-top:3mm;display:flex;gap:4mm;align-items:center}
  .cae-datos{flex:1}
  .cae-dato{margin-bottom:1mm}
  .qr-img{width:22mm;height:22mm}
  .extras-box{font-size:9px;border:1px solid #ddd;padding:2mm 3mm;margin-bottom:2mm}
  @media print{body{margin:0}.page{width:100%;padding:0}.no-print{display:none}}
</style>
</head>
<body>
<div class="page">
  <div class="no-print" style="text-align:right;margin-bottom:4mm">
    <button onclick="window.print()" style="padding:5px 14px;background:#1a56db;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;margin-right:6px">🖨 Imprimir</button>
    <button onclick="window.close()" style="padding:5px 14px;background:#666;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">✕ Cerrar</button>
  </div>
  <div class="header">
    <div class="h-left">
      <div class="emp-nombre">${esc(ed.razon)}</div>
      <div class="emp-dato">${esc(ed.domic)}</div>
      <div class="emp-dato">${esc(ed.ciudad)}</div>
      <div class="emp-dato">${esc(ed.tel)}</div>
      <div class="emp-dato" style="margin-top:1mm">${esc(ed.email)}</div>
      <div class="emp-dato" style="margin-top:2mm;font-weight:600">${esc(ed.iva)}</div>
    </div>
    <div class="h-center">
      <div class="letra-box">${letra}</div>
      <div style="font-size:8px;text-align:center">COD. ${codComp}</div>
    </div>
    <div class="h-right">
      <div class="comp-titulo">${esc(tipoLabel)}</div>
      <div class="comp-nro">${(()=>{
        const nro=f.fac_nro||'';
        const partes=nro.split('-');
        if(partes.length<2) return esc(nro);
        const ptoVtaNum=parseInt(partes[0].replace(/[^0-9]/g,''))||0;
        return String(ptoVtaNum).padStart(4,'0')+'-'+partes.slice(1).join('-');
      })()}</div>
      <div class="comp-dato" style="margin-top:2mm">Buenos Aires, ${fec}</div>
      <div class="comp-dato" style="margin-top:3mm">CUIT: ${esc(ed.cuit)}</div>
      <div class="comp-dato">ING.BRUTOS C.M.: ${esc(ed.iibb)}</div>
      <div class="comp-dato">IMP. INTERNOS INSCRIPTO</div>
      <div class="comp-dato">INICIO ACTIVIDADES: ${esc(ed.inicio)}</div>
    </div>
  </div>
  <div class="cli-box" style="position:relative;min-height:22mm">
    <!-- IZQUIERDA: fluye normal, max 55% del ancho -->
    <div style="max-width:55%;font-size:9px">
      <div style="font-weight:700;font-size:11px">${esc(cli?.CLI_RAZON||'CONSUMIDOR FINAL')} <span style="font-weight:400;font-size:9px;color:#555">(${esc((cli?.CLI_CODIGO||f.fac_cli||'').trim())})</span></div>
      <div style="height:2mm"></div>
      <div style="color:#333">${esc(cli?.CLI_DOMIC||'—')}</div>
      <div style="color:#333">${esc(cli?.CLI_LOCAL||'—')}</div>
      <div style="color:#333">${esc((typeof PCIA!=='undefined'?PCIA[cli?.CLI_PROVIN||'']||cli?.CLI_PROVIN:cli?.CLI_PROVIN)||'—')}</div>
    </div>
    <!-- DERECHA: posición absoluta fija a 110mm del borde izquierdo -->
    <div style="position:absolute;top:8mm;left:110mm;font-size:9px;width:80mm">
      <div><span style="color:#555">CUIT: </span><strong>${esc(cli?.CLI_CUIT||'—')}</strong></div>
      <div><span style="color:#555">IVA: </span>${esc(IVA_DESC[tiva]||tiva||'Consumidor Final')}</div>
      <div><span style="color:#555">Cond. Pago: </span>${(()=>{
        const cpVal=cli?.CLI_CONPAG||f.fac_vcomi||'';
        const cpObj=(TABLAS['CPAG']||[]).find(x=>x.CODIGO===cpVal);
        return esc(cpObj?cpObj.DETALLE:cpVal||'—');
      })()}</div>
    </div>
  </div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:18mm">Código</th>
        <th>Descripción</th>
        <th style="width:20mm">Despacho</th>
        <th class="r" style="width:10mm">Cant</th>
        <th class="r" style="width:20mm">Precio s/IVA</th>
        <th class="r" style="width:20mm">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it=>{
        const art=ARTS.find(a=>(a.ART_COD||'').trim()===(it.ite_art||'').trim());
        const desArt=art?art.ART_DES:(it.ite_desp||'');
        return `<tr>
          <td class="cod">${esc(it.ite_art||'')}</td>
          <td class="des" title="${esc(desArt)}">${esc(desArt)}</td>
          <td class="cod">${esc(it.ite_desp||'')}</td>
          <td class="r">${it.ite_can||0}</td>
          <td class="r">${(()=>{const d=1+(it.ite_iva_porc||21)/100;const n=it.ite_uni/d;return mon+' '+fmtN(n,2);})()}</td>
          <td class="r">${mon} ${fmtN(it.ite_imp||0,2)}</td>
        </tr>`;
      }).join('')}
      ${items.length<8?Array(8-items.length).fill('<tr><td colspan="6" style="height:6mm">&nbsp;</td></tr>').join(''):''}
    </tbody>
  </table>
  <div class="footer-grid">
    <div></div>
    <div class="totales">
      ${tieneIva?`
        <div class="tot-row"><span class="tot-lbl">Subtotal neto</span><span class="tot-val">${mon} ${fmt(subtotalNeto)}</span></div>
        <div class="tot-row"><span class="tot-lbl">IVA 21%</span><span class="tot-val">${mon} ${fmt(f.fac_iva)}</span></div>
      `:''}
      ${(Array.isArray(f.fac_percep_det)&&f.fac_percep_det.length)
        ? f.fac_percep_det.map(p=>`<div class="tot-row"><span class="tot-lbl">${esc(p.detalle||'Perc. IIBB')} (${fmt(p.pct)}%)</span><span class="tot-val">${mon} ${fmt(p.importe)}</span></div>`).join('')
        : ((f.fac_percib||0)>0?`<div class="tot-row"><span class="tot-lbl">Perc. IIBB</span><span class="tot-val">${mon} ${fmt(f.fac_percib)}</span></div>`:'')}
      <div class="tot-row"><span class="tot-lbl">TOTAL</span><span class="tot-val">${mon} ${fmt(f.fac_total)}</span></div>
    </div>
  </div>
  ${f.fac_cae?`
  <div class="cae-box">
    <div class="cae-datos">
      <div class="cae-dato"><strong>CAE N°:</strong> ${esc(f.fac_cae)}</div>
      <div class="cae-dato"><strong>Fecha Vto. CAE:</strong> ${esc(f.fac_cae_vto||'—')}</div>
      <div class="cae-dato" style="margin-top:2mm;font-size:8px;color:#555">
        Comprobante autorizado por A.F.I.P. — Este comprobante es válido como factura.
      </div>
    </div>
    <div style="text-align:center">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrUrl)}" class="qr-img" alt="QR AFIP">
      <div style="font-size:7px;margin-top:1mm">Verificar en AFIP</div>
    </div>
  </div>
  `:`
  <div class="cae-box" style="background:#fffbeb">
    <div style="color:#b45309;font-weight:600">⚠️ BORRADOR — Comprobante no autorizado por AFIP</div>
  </div>
  `}
</div>
</body>
</html>`;

  const win = window.open('','_blank','width=900,height=700');
  if(win){ win.document.write(html); win.document.close(); }
  else { toast('Activá ventanas emergentes en el navegador','err'); }
}

// Permitir navegación al menú sin perder la factura en curso
function facNavegar(fn) {
  // Ocultar temporalmente el panel de factura sin perderlo
  const ov=document.getElementById('ov-nf');
  if(ov&&ov.classList.contains('open')) {
    ov.style.display='none';
    // Restaurar al volver a Facturación
    window._facNavPendiente=true;
  }
  fn();
}

function facAlta() {
  FAC_ITEMS_NUEVA=[]; NF_PERCEP=[];
  FAC_MODO='A';
  renderFacModal(new Date().toISOString().substring(0,10),'H','');
}
function facModif() {
  if(facSelIdx===null){toast('Seleccioná una factura','err');return;}
  toast('Próximamente: Modificar factura','scs');
}
function facBaja() {
  if(facSelIdx===null){toast('Seleccioná una factura','err');return;}
  toast('Próximamente: Anular factura','scs');
}
function facCancelar() {
  nfDesbloquearCtip();
  FAC_MODO=null; FAC_ITEMS_NUEVA=[];
  const ov=document.getElementById('ov-nf');
  if(ov) ov.classList.remove('open');
  const f=filtFacs()[facSelIdx];
  if(f) renderFacDetalle(f);
  else document.getElementById('fac-detalle').innerHTML='<div class="fac-det-placeholder">← Seleccioná una factura</div>';
}


// ══════════════════════════════════════════════════════════
// MODAL FULLSCREEN NUEVA FACTURA
// ══════════════════════════════════════════════════════════
function renderFacModal(fecha, empresa, cliCod) {
  const monesOpts=(TABLAS['MONE']||[]).map(m=>`<option value="${m.CODIGO}">${m.STRING1} ${m.DETALLE}</option>`).join('')||'<option value="P">$ Pesos</option>';
  const ctipOpts=CTIPS.filter(c=>c.empresa===empresa&&['F','C','D'].includes(c.tipo))
    .map(c=>`<option value="${c.prefijo}|${c.tipo}">${c.prefijo} — ${TIPO_LABEL[c.tipo]||c.tipo}</option>`).join('');
  const cpagOpts='<option value="">— Sin especificar —</option>'+(TABLAS['CPAG']||[]).map(c=>`<option value="${c.CODIGO}">${c.CODIGO} — ${c.DETALLE}</option>`).join('');
  const exprOpts='<option value="">— Sin especificar —</option>'+(TABLAS['EXPR']||[]).map(e=>`<option value="${e.CODIGO}">${e.CODIGO} — ${e.DETALLE}</option>`).join('');
  const vendOpts='<option value="">— Sin especificar —</option>'+(TABLAS['VEND']||[]).map(v=>`<option value="${v.CODIGO}">${v.CODIGO} — ${v.DETALLE}</option>`).join('');
  const marcOpts='<option value="">— Todas —</option>'+(TABLAS['MARC']||[]).map(m=>`<option value="${m.CODIGO}">${m.CODIGO} — ${m.DETALLE}</option>`).join('');
  const rubrOpts='<option value="">— Todos —</option>'+(TABLAS['RUBR']||[]).map(r=>`<option value="${r.CODIGO}">${r.CODIGO} — ${r.DETALLE}</option>`).join('');
  const srubOpts='<option value="">— Todos —</option>'+(TABLAS['SRUB']||[]).map(s=>`<option value="${s.CODIGO}">${s.CODIGO} — ${s.DETALLE}</option>`).join('');

  const ov = document.getElementById('ov-nf');
  ov.innerHTML = `
    <div style="display:flex;height:100%;overflow:hidden">

      <!-- IZQUIERDA: encabezado + totales -->
      <div style="width:380px;flex-shrink:0;display:flex;flex-direction:column;overflow-y:auto;border-right:1px solid var(--b1);background:#0a2a3a">
        <!-- título -->
        <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:rgba(0,0,0,0.2)">
          <span style="font-size:14px;font-weight:700;color:var(--acc)">📄 Nueva Factura</span>
          <button class="btn" onclick="facCancelar()" style="padding:3px 10px;font-size:12px">✕ Cancelar</button>
        </div>
        <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;flex:1">
          <!-- Empresa / Tipo / Número -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <label style="font-size:10px;color:rgba(255,255,255,0.5);display:block;margin-bottom:2px">Empresa *</label>
              <select class="finp" id="nf-empresa" onchange="nfOnEmpresaChange()" style="width:100%">
                <option value="H" ${empresa==='H'?'selected':''}>H — Hatsu</option>
                <option value="T" ${empresa==='T'?'selected':''}>T — Tressa</option>
              </select>
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Tipo *</label>
              <select class="finp" id="nf-ctip" onchange="nfOnCtipChange()" style="width:100%">
                <option value="">— Seleccionar —</option>
                ${ctipOpts}
              </select>
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Número</label>
              <input id="nf-num" class="finp" placeholder="—" title="Podés cambiar el número" style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--acc);background:var(--s3);padding:6px 10px;border-radius:4px;display:block;width:100%;text-align:center">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Fecha *</label>
              <input class="finp" id="nf-fecha" type="date" value="${fecha}" style="width:100%">
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Moneda</label>
              <select class="finp" id="nf-moneda" onchange="nfOnMonedaChange()" style="width:100%">${monesOpts}</select>
            </div>
            <div>
              <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Descuento %</label>
              <input class="finp" id="nf-dto" type="number" min="0" max="100" step="0.1" value="0" oninput="nfCalcTotales()" style="width:100%">
            </div>
          </div>
          <!-- Cliente -->
          <div style="background:rgba(255,255,255,0.07);border-radius:6px;padding:8px 10px;border:1px solid rgba(255,255,255,0.12)">
            <div style="font-size:10px;color:rgba(255,255,255,0.5);font-family:var(--mono);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Cliente</div>
            <div style="display:grid;grid-template-columns:80px 1fr;gap:6px;margin-bottom:6px">
              <div>
                <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Código *</label>
                <input class="finp" id="nf-cli-cod" maxlength="6" style="text-transform:uppercase;width:100%" placeholder="Cód." oninput="nfOnCliCodInput()" onblur="nfOnCliCodChange()" onkeydown="if(event.key==='Enter'){this.blur();}">
              </div>
              <div style="position:relative">
                <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Razón Social</label>
                <div style="position:relative;display:flex;align-items:center">
                  <input class="finp" id="nf-cli-busq" list="nf-cli-list" placeholder="Buscar por razón social..." style="width:100%;padding-right:22px"
                    onfocus="nfFillCliList();this.select()" onclick="this.select()"
                    onchange="nfOnCliBusqPick()">
                  <button onclick="nfLimpiarBusqCli()" style="position:absolute;right:4px;background:none;border:none;color:var(--t3);cursor:pointer;font-size:12px;padding:0">✕</button>
                </div>
                <datalist id="nf-cli-list"></datalist>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div>
                <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">IVA</label>
                <input class="finp" id="nf-tiva" readonly style="color:var(--t2);background:var(--s3);width:100%" placeholder="—"><input type="hidden" id="nf-tiva-cod">
              </div>
              <div>
                <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Cond. Pago</label>
                <select class="finp" id="nf-conpag" style="width:100%">${cpagOpts}</select>
              </div>
              <div>
                <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Transporte</label>
                <select class="finp" id="nf-transp" style="width:100%">${exprOpts}</select>
              </div>
              <div>
                <label style="font-size:10px;color:var(--t3);display:block;margin-bottom:2px">Vendedor</label>
                <select class="finp" id="nf-vend" style="width:100%">${vendOpts}</select>
              </div>
            </div>
          </div>
          <!-- Totales -->
          <div style="background:rgba(255,255,255,0.07);border-radius:6px;padding:10px 12px;margin-top:auto;border:1px solid rgba(255,255,255,0.12)">
            <div id="nf-fila-neto" style="display:none;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.6);padding:2px 0"><span>Subtotal neto</span><span id="nf-tot-neto">$ 0,00</span></div>
            <div id="nf-fila-iva21" style="display:none;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.6);padding:2px 0"><span>IVA 21%</span><span id="nf-tot-iva21">$ 0,00</span></div>
            <div id="nf-fila-iva105" style="display:none;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.6);padding:2px 0"><span>IVA 10.5%</span><span id="nf-tot-iva105">$ 0,00</span></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.6);padding:2px 0"><span>Subtotal</span><span id="nf-tot-sub">$ 0,00</span></div>
            <div id="nf-fila-dto" style="display:none;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.6);padding:2px 0"><span>Descuento</span><span id="nf-tot-dto">—</span></div>
            <div class="nf-percep-cont" style="color:rgba(255,255,255,0.8)"></div>
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#fff;padding:6px 0 2px;border-top:1px solid rgba(255,255,255,0.15);margin-top:4px"><span>TOTAL</span><span id="nf-tot-total">$ 0,00</span></div>
            <div class="nf-fila-afip" style="display:none;justify-content:space-between;font-size:12px;color:rgba(255,255,255,0.75);padding:3px 0;font-style:italic"><span class="nf-afip-lbl">Declarado AFIP</span><span class="nf-tot-afip">—</span></div>
          </div>
          <!-- Botones -->
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn pri" onclick="nfGuardar()" style="padding:10px;font-size:13px;width:100%">💾 Guardar borrador</button>
            <button class="btn" onclick="facCancelar()" style="padding:8px;font-size:12px;width:100%">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- DERECHA: ítems -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative">
        <!-- toolbar ítems -->
        <div style="padding:8px 12px;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:6px;flex-shrink:0;background:var(--s2)">
          <span style="font-size:12px;font-weight:600;color:var(--acc);font-family:var(--mono)">ÍTEMS</span>
          <div style="flex:1"></div>
          <button id="nf-btn-grupo" class="btn" onclick="nfAbrirCargaGrupo()" style="padding:3px 10px;font-size:11px">📦 Grupo</button>
          <button id="nf-btn-resumir" class="btn" onclick="nfResumirItems()" style="padding:3px 10px;font-size:11px;color:var(--t2)">✂ Resumir</button>
          <button id="nf-btn-agregar" class="btn pri" onclick="nfAbrirBusqArt()" style="padding:3px 10px;font-size:11px">＋ Agregar</button>
        </div>
        <!-- header fijo + body con scroll -->
        <div id="nf-items-hdr" style="flex-shrink:0"></div>
        <div id="nf-items-body" style="flex:1;overflow-y:auto"></div>

        <!-- Popup buscar artículo — centrado en panel derecho -->
        <div id="nf-art-popup" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:560px;max-width:90%;background:var(--s1);border:1px solid var(--acc);border-radius:8px;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,.5)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--b1)">
        <span style="font-weight:600;color:var(--acc)">🔍 Buscar Artículo</span>
        <button onclick="nfCerrarBusqArt()" style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid var(--b1)">
        <input class="finp" id="nf-art-q" placeholder="Código o descripción..." style="width:100%" oninput="nfFiltrarPopupArt(this.value)" autofocus>
      </div>
      <div id="nf-art-lista" style="max-height:320px;overflow-y:auto">
        <div style="text-align:center;color:var(--t3);padding:20px;font-size:12px">Escribí para buscar artículos</div>
      </div>
    </div>
        <div id="nf-art-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.4);z-index:999" onclick="nfCerrarBusqArt()"></div>

        <!-- Popup cargar grupo — centrado en panel derecho -->
        <div id="nf-grupo-popup" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:500px;max-width:90%;background:var(--s1);border:1px solid var(--acc);border-radius:8px;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,.5)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--b1)">
        <span style="font-weight:600;color:var(--acc)">📦 Cargar por Grupo</span>
        <button onclick="nfCerrarCargaGrupo()" style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Marca</label><select class="finp" id="ng-marc" style="width:100%">${marcOpts}</select></div>
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Rubro</label><select class="finp" id="ng-rubr" style="width:100%">${rubrOpts}</select></div>
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Sub-Rubro</label><select class="finp" id="ng-srub" style="width:100%">${srubOpts}</select></div>
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Solo con stock</label>
            <select class="finp" id="ng-stock" style="width:100%">
              <option value="1">Sí (solo con stock)</option>
              <option value="0">No (todos)</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Descuentos encadenados</label>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 1 %</label><input class="finp" id="ng-dto1" type="number" min="0" max="100" value="0" style="width:100%"></div>
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 2 %</label><input class="finp" id="ng-dto2" type="number" min="0" max="100" value="0" style="width:100%"></div>
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 3 %</label><input class="finp" id="ng-dto3" type="number" min="0" max="100" value="0" style="width:100%"></div>
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 4 %</label><input class="finp" id="ng-dto4" type="number" min="0" max="100" value="0" style="width:100%"></div>
          </div>
        </div>
        <div id="ng-preview" style="font-size:11px;color:var(--t3);min-height:16px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn" onclick="nfCerrarCargaGrupo()">Cancelar</button>
          <button class="btn pri" onclick="nfCargarGrupo()">📦 Cargar artículos</button>
        </div>
      </div>
    </div>
        <div id="nf-grupo-overlay" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.4);z-index:999" onclick="nfCerrarCargaGrupo()"></div>
      </div><!-- /panel items -->
    </div><!-- /flex container -->
  `;
  ov.classList.add('open');
  nfRenderItems();
  nfCalcTotales();
}

function renderFacForm(fecha, empresa, cliCod) {
  const det=document.getElementById('fac-detalle');
  const monesOpts=(TABLAS['MONE']||[]).map(m=>`<option value="${m.CODIGO}">${m.STRING1} ${m.DETALLE}</option>`).join('')||'<option value="P">$ Pesos</option>';
  const ctipOpts=CTIPS.filter(c=>c.empresa===empresa&&['F','C','D'].includes(c.tipo))
    .map(c=>`<option value="${c.prefijo}|${c.tipo}">${c.prefijo} — ${TIPO_LABEL[c.tipo]||c.tipo}</option>`).join('');
  const cpagOpts='<option value="">— Sin especificar —</option>'+(TABLAS['CPAG']||[]).map(c=>`<option value="${c.CODIGO}">${c.CODIGO} — ${c.DETALLE}</option>`).join('');
  const exprOpts='<option value="">— Sin especificar —</option>'+(TABLAS['EXPR']||[]).map(e=>`<option value="${e.CODIGO}">${e.CODIGO} — ${e.DETALLE}</option>`).join('');
  const vendOpts='<option value="">— Sin especificar —</option>'+(TABLAS['VEND']||[]).map(v=>`<option value="${v.CODIGO}">${v.CODIGO} — ${v.DETALLE}</option>`).join('');
  const marcOpts='<option value="">— Todas —</option>'+(TABLAS['MARC']||[]).map(m=>`<option value="${m.CODIGO}">${m.CODIGO} — ${m.DETALLE}</option>`).join('');
  const rubrOpts='<option value="">— Todos —</option>'+(TABLAS['RUBR']||[]).map(r=>`<option value="${r.CODIGO}">${r.CODIGO} — ${r.DETALLE}</option>`).join('');
  const srubOpts='<option value="">— Todos —</option>'+(TABLAS['SRUB']||[]).map(s=>`<option value="${s.CODIGO}">${s.CODIGO} — ${s.DETALLE}</option>`).join('');

  det.innerHTML=`
    <div style="padding:14px;height:100%;overflow-y:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:2px solid var(--acc)">
        <div style="font-size:15px;font-weight:700;color:var(--acc)">📄 Nueva Factura</div>
        <button class="btn" onclick="facCancelar()" style="padding:3px 10px;font-size:12px">✕ Cancelar</button>
      </div>
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
          <select class="finp" id="nf-moneda" onchange="nfOnMonedaChange()" style="width:100%">${monesOpts}</select>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Descuento %</label>
          <input class="finp" id="nf-dto" type="number" min="0" max="100" step="0.1" value="0" oninput="nfCalcTotales()" style="width:100%">
        </div>
      </div>
      <div style="background:var(--s2);border-radius:6px;padding:10px 12px">
        <div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Cliente</div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;margin-bottom:8px">
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Código *</label>
            <input class="finp" id="nf-cli-cod" maxlength="6" style="text-transform:uppercase;width:100%" placeholder="Código" oninput="nfOnCliCodInput()" onblur="nfOnCliCodChange()" onkeydown="if(event.key==='Enter'){this.blur();}">
          </div>
          <div style="position:relative">
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Buscar por Razón Social</label>
            <div style="position:relative;display:flex;align-items:center">
              <input class="finp" id="nf-cli-busq" placeholder="Escribí para buscar..." style="width:100%;padding-right:28px"
                oninput="nfOnCliBusqInput()"
                onblur="setTimeout(()=>{const s=document.getElementById('nf-cli-sug');if(s)s.style.display='none'},200)">
              <button onclick="nfLimpiarBusqCli()" style="position:absolute;right:6px;background:none;border:none;color:var(--t3);cursor:pointer;font-size:14px;padding:0;line-height:1" title="Limpiar">✕</button>
            </div>
            <div id="nf-cli-sug" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--s1);border:1px solid var(--acc);border-radius:0 0 6px 6px;z-index:200;max-height:180px;overflow-y:auto"></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 80px 130px 130px 130px;gap:8px">
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Razón Social</label>
            <input class="finp" id="nf-razon" readonly style="color:var(--t2);background:var(--s3);width:100%" placeholder="—">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">IVA</label>
            <input class="finp" id="nf-tiva" readonly style="color:var(--t2);background:var(--s3);width:100%" placeholder="—"><input type="hidden" id="nf-tiva-cod">
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Cond. de Pago</label>
            <select class="finp" id="nf-conpag" style="width:100%">${cpagOpts}</select>
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Transporte</label>
            <select class="finp" id="nf-transp" style="width:100%">${exprOpts}</select>
          </div>
          <div>
            <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Vendedor</label>
            <select class="finp" id="nf-vend" style="width:100%">${vendOpts}</select>
          </div>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--t3);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px">Ítems</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button id="nf-btn-grupo" class="btn" onclick="nfAbrirCargaGrupo()" style="padding:3px 10px;font-size:12px">📦 Cargar grupo</button>
            <button id="nf-btn-resumir" class="btn" onclick="nfResumirItems()" style="padding:3px 10px;font-size:12px;color:var(--t2)">✂ Resumir</button>
            <button id="nf-btn-agregar" class="btn pri" onclick="nfAbrirBusqArt()" style="padding:3px 10px;font-size:12px">＋ Agregar</button>
          </div>
        </div>
        <div style="background:var(--s2);border-radius:6px;overflow:hidden">
          <div id="nf-items-hdr"></div>
          <div id="nf-items-body"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end">
        <div style="background:var(--s2);border-radius:6px;padding:10px 14px">
          <div id="nf-fila-neto" style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>Subtotal neto</span><span id="nf-tot-neto">$ 0,00</span></div>
          <div id="nf-fila-iva"  style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>IVA</span><span id="nf-tot-iva">$ 0,00</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>Subtotal</span><span id="nf-tot-sub">$ 0,00</span></div>
          <div id="nf-fila-dto"  style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:2px 0"><span>Descuento</span><span id="nf-tot-dto">—</span></div>
          <div id="nf-percep-cont" class="nf-percep-cont" style="color:var(--t2)"></div>
          <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:var(--txt);padding:6px 0 2px;border-top:1px solid var(--b1);margin-top:4px"><span>TOTAL</span><span id="nf-tot-total">$ 0,00</span></div>
          <div class="nf-fila-afip" style="display:none;justify-content:space-between;font-size:12px;color:var(--t2);padding:3px 0;font-style:italic"><span class="nf-afip-lbl">Declarado AFIP</span><span class="nf-tot-afip">—</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn pri" onclick="nfGuardar()" style="padding:8px 18px;font-size:13px">💾 Guardar borrador</button>
          <button class="btn" onclick="facCancelar()" style="padding:8px 18px;font-size:13px">Cancelar</button>
        </div>
      </div>
    </div>
    <div id="nf-art-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;max-width:95vw;background:var(--s1);border:1px solid var(--acc);border-radius:8px;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,.5)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--b1)">
        <span style="font-weight:600;color:var(--acc)">🔍 Buscar Artículo</span>
        <button onclick="nfCerrarBusqArt()" style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid var(--b1)">
        <input class="finp" id="nf-art-q" placeholder="Código o descripción..." style="width:100%"
          oninput="nfFiltrarPopupArt(this.value)" autofocus>
      </div>
      <div id="nf-art-lista" style="max-height:340px;overflow-y:auto">
        <div style="text-align:center;color:var(--t3);padding:20px;font-size:12px">Escribí para buscar artículos</div>
      </div>
    </div>
    <div id="nf-art-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999" onclick="nfCerrarBusqArt()"></div>
    <div id="nf-grupo-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:520px;max-width:95vw;background:var(--s1);border:1px solid var(--acc);border-radius:8px;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,.5)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--b1)">
        <span style="font-weight:600;color:var(--acc)">📦 Cargar por Grupo</span>
        <button onclick="nfCerrarCargaGrupo()" style="background:none;border:none;color:var(--t2);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Marca</label><select class="finp" id="ng-marc" style="width:100%">${marcOpts}</select></div>
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Rubro</label><select class="finp" id="ng-rubr" style="width:100%">${rubrOpts}</select></div>
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Sub-Rubro</label><select class="finp" id="ng-srub" style="width:100%">${srubOpts}</select></div>
          <div><label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Solo con stock</label>
            <select class="finp" id="ng-stock" style="width:100%">
              <option value="1">Sí (solo con stock)</option>
              <option value="0">No (todos)</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:11px;color:var(--t3);display:block;margin-bottom:3px">Descuentos encadenados</label>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 1 %</label><input class="finp" id="ng-dto1" type="number" min="0" max="100" value="0" style="width:100%"></div>
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 2 %</label><input class="finp" id="ng-dto2" type="number" min="0" max="100" value="0" style="width:100%"></div>
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 3 %</label><input class="finp" id="ng-dto3" type="number" min="0" max="100" value="0" style="width:100%"></div>
            <div><label style="font-size:10px;color:var(--t3);display:block">Dto 4 %</label><input class="finp" id="ng-dto4" type="number" min="0" max="100" value="0" style="width:100%"></div>
          </div>
        </div>
        <div id="ng-preview" style="font-size:11px;color:var(--t3);min-height:16px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn" onclick="nfCerrarCargaGrupo()">Cancelar</button>
          <button class="btn pri" onclick="nfCargarGrupo()">📦 Cargar artículos</button>
        </div>
      </div>
    </div>

  `;
  nfRenderItems();
  nfCalcTotales();
}

function nfLimpiarBusqCli() {
  const busqEl=document.getElementById('nf-cli-busq');
  const codEl=document.getElementById('nf-cli-cod');
  const sug=document.getElementById('nf-cli-sug');
  if(busqEl) busqEl.value='';
  if(codEl)  codEl.value='';
  if(sug){sug.innerHTML='';sug.style.display='none';}
  nfLimpiarCliente();
}

let _nfArtPopupIdx = null;

function nfAbrirBusqArt(idx) {
  if(!nfItemsHabilitados()){toast('Completá empresa, tipo y cliente primero','err');return;}
  _nfArtPopupIdx = (idx !== undefined) ? idx : null;
  document.getElementById('nf-art-popup').style.display='block';
  document.getElementById('nf-art-overlay').style.display='block';
  const q=document.getElementById('nf-art-q');
  if(q){q.value='';q.focus();}
  nfFiltrarPopupArt('');
}
function nfCerrarBusqArt() {
  document.getElementById('nf-art-popup').style.display='none';
  document.getElementById('nf-art-overlay').style.display='none';
}
function nfFiltrarPopupArt(q) {
  const lista=document.getElementById('nf-art-lista');
  const empresa=document.getElementById('nf-empresa')?.value||'H';
  const esNC=nfEsNC();
  let arts=ARTS;
  // Factura: solo con stock. NC: todos
  if(!esNC) {
    arts=arts.filter(a=>{
      const disp=empresa==='T'?(a.ART_STKT||0):(a.ART_STK||0);
      return disp>0;
    });
  }
  if(q && q.length>=1) {
    arts=arts.filter(a=>
      (a.ART_COD||'').toLowerCase().includes(q.toLowerCase())||
      (a.ART_DES||'').toLowerCase().includes(q.toLowerCase())
    );
  }
  arts=arts.slice(0,50);
  if(!arts.length){
    lista.innerHTML='<div style="text-align:center;color:var(--t3);padding:20px;font-size:12px">Sin resultados</div>';
    return;
  }
  lista.innerHTML=`
    <div style="display:grid;grid-template-columns:100px 1fr 70px;gap:4px;padding:6px 12px;background:var(--s3);font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase;position:sticky;top:0">
      <span>Código</span><span>Descripción</span><span style="text-align:right">Disp.</span>
    </div>
    ${arts.map(a=>{
      const disp=empresa==='T'?(a.ART_STKT||0):(a.ART_STK||0);
      const dispColor=disp>0?'color:var(--grn)':'color:var(--red)';
      const sinStock=!esNC&&disp===0;
      return `<div onclick="nfSelArtPopup('${a.ART_COD}')"
        style="display:grid;grid-template-columns:100px 1fr 70px;gap:4px;padding:8px 12px;border-bottom:1px solid var(--b1);cursor:pointer;font-size:12px;${sinStock?'opacity:0.5':''}"
        onmouseover="this.style.background='var(--s3)'" onmouseout="this.style.background=''">
        <span style="font-family:var(--mono);color:var(--acc)">${esc(a.ART_COD)}</span>
        <span style="color:var(--t2)">${esc(a.ART_DES||'')}</span>
        <span style="text-align:right;font-family:var(--mono);${dispColor}">${disp}</span>
      </div>`;
    }).join('')}`;
}
function nfSelArtPopup(cod) {
  nfCerrarBusqArt();
  if(_nfArtPopupIdx !== null) {
    const input=document.getElementById(`nf-item-cod-${_nfArtPopupIdx}`);
    if(input) input.value=cod;
    nfItemArtChange(_nfArtPopupIdx, cod);
  } else {
    FAC_ITEMS_NUEVA.push({ite_art:'',ite_desp_art:'',ite_disp:0,ite_desp_nro:'',ite_desp_fec:'',ite_can:1,ite_uni:0,ite_preori:0,ite_moneda:'P',ite_cotiz:1,ite_iva_porc:21,ite_imp:0,ite_iva_imp:0,_desps:null,_desp_id:null});
    const idx=FAC_ITEMS_NUEVA.length-1;
    nfRenderItems();
    nfItemArtChange(idx, cod);
  }
}

function nfAbrirCargaGrupo() {
  if(!nfItemsHabilitados()){toast('Completá empresa, tipo y cliente primero','err');return;}
  document.getElementById('nf-grupo-popup').style.display='block';
  document.getElementById('nf-grupo-overlay').style.display='block';
  const esNC=nfEsNC();
  const stockSel=document.getElementById('ng-stock');
  if(stockSel) stockSel.value=esNC?'0':'1';
}
function nfCerrarCargaGrupo() {
  document.getElementById('nf-grupo-popup').style.display='none';
  document.getElementById('nf-grupo-overlay').style.display='none';
}
function nfAplicarDtos(precio, d1, d2, d3, d4) {
  let p=precio;
  if(d1>0) p=p*(1-d1/100);
  if(d2>0) p=p*(1-d2/100);
  if(d3>0) p=p*(1-d3/100);
  if(d4>0) p=p*(1-d4/100);
  return Math.round(p*100)/100;
}
async function nfCargarGrupo() {
  const marc  = document.getElementById('ng-marc')?.value||'';
  const rubr  = document.getElementById('ng-rubr')?.value||'';
  const srub  = document.getElementById('ng-srub')?.value||'';
  const stock = document.getElementById('ng-stock')?.value==='1';
  const d1    = parseFloat(document.getElementById('ng-dto1')?.value||0)||0;
  const d2    = parseFloat(document.getElementById('ng-dto2')?.value||0)||0;
  const d3    = parseFloat(document.getElementById('ng-dto3')?.value||0)||0;
  const d4    = parseFloat(document.getElementById('ng-dto4')?.value||0)||0;
  const empresa = document.getElementById('nf-empresa')?.value||'H';
  const monFacGrupo=document.getElementById('nf-moneda')?.value||'P';
  let arts=ARTS.filter(a=>{
    if(marc && (a.ART_MARCA||'')!==marc) return false;
    if(rubr && (a.ART_RUB||'')!==rubr)   return false;
    if(srub && (a.ART_SRUB||'')!==srub)  return false;
    if(stock){
      const disp=empresa==='T'?(a.ART_STKT||0):(a.ART_STK||0);
      if(disp<=0) return false;
    }
    // Si factura no es pesos, solo artículos de la misma moneda
    if(monFacGrupo!=='P' && (a.ART_MONEDA||'P')!==monFacGrupo) return false;
    return true;
  });
  if(!arts.length){toast('No hay artículos con ese filtro','err');return;}
  for(const a of arts){
    const yaExiste=FAC_ITEMS_NUEVA.find(it=>it.ite_art===a.ART_COD);
    if(yaExiste) continue;
    const disp=empresa==='T'?(a.ART_STKT||0):(a.ART_STK||0);
    let precioBase=a.ART_PRE||0;
    const monArtGrupo=a.ART_MONEDA||'P';
    let cotizItem=1;
    if(monFacGrupo==='P' && monArtGrupo!=='P') {
      const cotizG=nfGetCotiz(monArtGrupo);
      cotizItem=cotizG;
      precioBase=precioBase*cotizG;
    }
    const precio=nfAplicarDtos(precioBase, d1, d2, d3, d4);
    const ivaPct=a.ART_IVA!==null&&a.ART_IVA!==undefined?Number(a.ART_IVA):21;
    // Buscar despacho automático
    let despNro='', despFec='', despId=null, despsArr=null, depStk=null, depCostk=null;
    try {
      const desps=await sbGet('despachos',`dep_art=eq.${encodeURIComponent(a.ART_COD)}&order=dep_fec.desc`);
      const despsFilt=desps.filter(d=>((d.dep_stk!=null?d.dep_stk:(d.dep_ent||0)-(d.dep_sal||0)))>0);
      despsArr=despsFilt;
      if(despsFilt.length===1){
        const d=despsFilt[0];
        despNro=d.dep_desp+(d.dep_sub||'');
        despFec=d.dep_fec||'';
        depStk=(d.dep_stk!=null)?d.dep_stk:((d.dep_ent||0)-(d.dep_sal||0));
        depCostk=(d.dep_costk!=null)?d.dep_costk:depStk;
        despId=d.dep_id;
      }
    } catch(e){ console.error('nfCargarGrupo desps:',e); }
    const artReal=empresa==='T'?(a.ART_STKT||0):(a.ART_STK||0);
    const artPfac=empresa==='T'?(a.ART_DEPT||0):(a.ART_DEPH||0);
    FAC_ITEMS_NUEVA.push({
      ite_art:a.ART_COD, ite_desp_art:a.ART_DES||'',
      ite_desp_nro:despNro, ite_desp_fec:despFec, ite_can:0,
      ite_uni:precio, ite_preori:precioBase, ite_moneda:monArtGrupo, ite_cotiz:cotizItem, ite_iva_porc:ivaPct, ite_imp:0, ite_iva_imp:0,
      _artReal:artReal, _artPfac:artPfac, _depStk:depStk, _depCostk:depCostk,
      _desps:despsArr, _desp_id:despId
    });
  }
  nfCerrarCargaGrupo();
  nfRenderItems();
  nfCalcTotales();
  toast(`${arts.length} artículos cargados`,'scs');
}

function nfResumirItems() {
  const antes=FAC_ITEMS_NUEVA.length;
  FAC_ITEMS_NUEVA=FAC_ITEMS_NUEVA.filter(it=>(it.ite_can||0)>0 && (it.ite_imp||0)>0);
  const eliminados=antes-FAC_ITEMS_NUEVA.length;
  nfRenderItems();
  nfCalcTotales();
  toast(`${eliminados} ítems con importe/cantidad 0 eliminados`,'scs');
}

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
let _nfCtipBloqueadoId = null;
const _sessionId = 'S' + Math.random().toString(36).slice(2) + Date.now().toString(36);

async function nfDesbloquearCtip() {
  if(_nfCtipBloqueadoId) {
    try {
      await apiPost('/comp_tipos/desbloquear', { id: _nfCtipBloqueadoId, sid: _sessionId });
      const ct=CTIPS.find(x=>x.id===_nfCtipBloqueadoId);
      if(ct){ct.bloqueado=false;ct.bloqueado_por=null;}
    } catch(e){console.error('nfDesbloquearCtip:',e);}
    _nfCtipBloqueadoId=null;
  }
}

async function nfOnCtipChange() {
  const val=document.getElementById('nf-ctip')?.value||'';
  const el=document.getElementById('nf-num');
  // Desbloquear el anterior si había uno
  await nfDesbloquearCtip();
  if(!val){if(el)el.value='';return;}
  const [prefijo,tipo]=val.split('|');
  const emp=document.getElementById('nf-empresa').value;
  // Punto 1: si el 2º carácter del prefijo es "X" permito elegir moneda; si no, fijo Pesos
  (function(){
    const monEl=document.getElementById('nf-moneda'); if(!monEl) return;
    const permite = (prefijo||'').charAt(1).toUpperCase()==='X';
    if(permite){ monEl.disabled=false; }
    else { monEl.value='P'; monEl.disabled=true; if(typeof nfCalcTotales==='function') nfCalcTotales(); }
  })();
  const ct=CTIPS.find(c=>c.empresa===emp&&c.prefijo===prefijo&&c.tipo===tipo);
  if(!ct){if(el)el.value='';return;}
  // Bloqueo atómico en el server (lee estado fresco + bloquea si está libre o es mío)
  const miUsuario=usuarioActual?.codigo||'?';
  try {
    const res=await apiPost('/comp_tipos/bloquear', { id: ct.id, por: miUsuario, sid: _sessionId });
    if(!res.locked) {
      toast(`⚠️ ${res.bloqueado_por} está facturando con este tipo. Esperá un momento.`,'err');
      document.getElementById('nf-ctip').value='';
      if(el) el.value='';
      return;
    }
    ct.bloqueado=true; ct.bloqueado_por=miUsuario;
    if(res.ultimo_nro!==undefined) ct.ultimo_nro=res.ultimo_nro;
    _nfCtipBloqueadoId=ct.id;
  } catch(e){
    console.error('nfOnCtipChange lock:',e);
    toast('No se pudo reservar la numeración','err');
    return;
  }
  if(el) el.value=`${prefijo}-${String((ct.ultimo_nro||0)+1).padStart(6,'0')}${tipo}`;
  nfPercepSync();
  nfRenderItems();
  nfCalcTotales();
}
function nfOnCliCodInput() {
  // Limpia razón social y datos mientras escribe el código
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  s('nf-cli-busq',''); s('nf-razon',''); s('nf-tiva',''); s('nf-tiva-cod','');
  s('nf-conpag',''); s('nf-vend',''); s('nf-transp','');
}
function nfOnCliCodChange() {
  // Se llama en onblur — busca el cliente por código completo
  const cod=(document.getElementById('nf-cli-cod')?.value||'').trim().toUpperCase();
  const sug=document.getElementById('nf-cli-sug');
  if(sug){sug.innerHTML='';sug.style.display='none';}
  if(!cod){nfLimpiarCliente();return;}
  const cli=facFindCli(cod);
  if(cli) {
    nfSetCliente(cli);
  } else {
    toast(`Cliente ${cod} no encontrado`,'err');
    nfLimpiarCliente();
  }
}
function nfOnCliBusqInput() {
  // Solo muestra sugerencias, no toca datos del cliente
  const q=(document.getElementById('nf-cli-busq')?.value||'').toLowerCase().trim();
  const sug=document.getElementById('nf-cli-sug');
  if(!sug) return;
  if(!q||q.length<2){sug.innerHTML='';sug.style.display='none';return;}
  const matches=CLIS.filter(c=>(c.CLI_RAZON||'').toLowerCase().includes(q)||(c.CLI_CODIGO||'').trim().toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){sug.innerHTML='';sug.style.display='none';return;}
  sug.style.display='block';
  sug.innerHTML=matches.map(c=>`<div onclick="nfSelCliSug('${(c.CLI_CODIGO||'').trim()}')"
    style="padding:7px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--b1);display:flex;gap:10px;align-items:center">
    <span style="font-family:var(--mono);color:var(--acc);flex-shrink:0">${esc((c.CLI_CODIGO||'').trim())}</span>
    <span style="color:var(--txt)">${esc(c.CLI_RAZON||'')}</span>
  </div>`).join('');
}
function nfSelCliSug(cod) {
  // Se llama al hacer click en una sugerencia
  const cli=facFindCli(cod);
  if(!cli) return;
  const sug=document.getElementById('nf-cli-sug');
  if(sug){sug.innerHTML='';sug.style.display='none';}
  nfSetCliente(cli);
}
// Búsqueda por razón social con datalist nativo (igual que recibos/ficha)
function nfFillCliList(){
  const dl=document.getElementById('nf-cli-list'); if(!dl || dl.dataset.filled) return;
  dl.innerHTML=(CLIS||[]).map(c=>`<option value="${esc(c.CLI_RAZON||'')}">`).join('');
  dl.dataset.filled='1';
}
function nfOnCliBusqPick(){
  const val=(document.getElementById('nf-cli-busq')?.value||'').trim().toLowerCase();
  if(!val) return;
  const c=(CLIS||[]).find(x=>(x.CLI_RAZON||'').trim().toLowerCase()===val);
  if(c) nfSetCliente(c);
}
function nfSetCliente(cli) {
  // Setea todos los campos del cliente de una vez
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  s('nf-cli-cod',  (cli.CLI_CODIGO||'').trim());
  s('nf-cli-busq', cli.CLI_RAZON||'');
  s('nf-razon',    cli.CLI_RAZON||'');
  s('nf-tiva',     facIvaDesc(cli.CLI_IVA));
  s('nf-tiva-cod', cli.CLI_IVA||'');
  s('nf-dto',      cli.CLI_DTO||0);
  s('nf-conpag',   (cli.CLI_CONPAG||'').trim());
  s('nf-vend',     (cli.CLI_VEND||'').trim());
  s('nf-transp',   (cli.CLI_EXPRE||'').trim());
  window._nfCliActual=cli;
  nfPercepSync(cli);
  nfCalcTotales();
  nfRenderItems();
}
function nfLimpiarCliente() {
  const s=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  window._nfCliActual=null; NF_PERCEP=[];
  s('nf-cli-cod',''); s('nf-cli-busq',''); s('nf-razon','');
  s('nf-tiva',''); s('nf-tiva-cod',''); s('nf-dto',0);
  s('nf-conpag',''); s('nf-vend',''); s('nf-transp','');
}

function nfAgregarItem() { nfAbrirBusqArt(); }
function nfEliminarItem(idx) {
  FAC_ITEMS_NUEVA.splice(idx,1);
  nfRenderItems();
  nfCalcTotales();
}


// Helper para obtener cotización de una moneda
function nfGetCotiz(monCod) {
  if(!monCod||monCod==='P') return 1;
  const m=(TABLAS['MONE']||[]).find(x=>x.CODIGO===monCod);
  if(!m) return 1;
  return parseFloat(m.NUM||m.NUMERO||m.COT||m.STRING2||1)||1;
}
async function nfItemArtChange(idx,cod) {
  const codUp=cod.trim().toUpperCase();
  FAC_ITEMS_NUEVA[idx].ite_art=codUp;
  FAC_ITEMS_NUEVA[idx].ite_desp_art='';
  FAC_ITEMS_NUEVA[idx].ite_disp=0;
  FAC_ITEMS_NUEVA[idx]._artReal=0; FAC_ITEMS_NUEVA[idx]._artPfac=0;
  FAC_ITEMS_NUEVA[idx]._depStk=null; FAC_ITEMS_NUEVA[idx]._depCostk=null;
  FAC_ITEMS_NUEVA[idx].ite_desp_nro='';
  FAC_ITEMS_NUEVA[idx]._desps=null;
  FAC_ITEMS_NUEVA[idx]._desp_id=null;
  if(!codUp){nfRenderItems();return;}
  const art=ARTS.find(a=>(a.ART_COD||'').trim()===codUp);
  if(!art){
    FAC_ITEMS_NUEVA[idx].ite_desp_art='⚠️ Código no encontrado';
    nfRenderItems();
    return;
  }
  const empresa=document.getElementById('nf-empresa')?.value||'H';
  const monFac=document.getElementById('nf-moneda')?.value||'P';
  const monArt=art.ART_MONEDA||'P';
  FAC_ITEMS_NUEVA[idx].ite_desp_art=art.ART_DES||'';
  FAC_ITEMS_NUEVA[idx]._artReal=empresa==='T'?(art.ART_STKT||0):(art.ART_STK||0);
  FAC_ITEMS_NUEVA[idx]._artPfac=empresa==='T'?(art.ART_DEPT||0):(art.ART_DEPH||0);
  // Convertir precio según moneda
  let precio=art.ART_PRE||0;
  let cotizItem=1;
  if(monFac!==monArt) {
    if(monFac==='P' && monArt!=='P') {
      // Factura en pesos, art en otra moneda → multiplico por cotización
      const cotiz=nfGetCotiz(monArt);
      cotizItem=cotiz;
      precio=precio*cotiz;
      toast(`Precio convertido a pesos (cotiz x${cotiz})`, 'scs');
    } else {
      // Factura NO en pesos: solo se pueden facturar artículos de esa misma moneda
      toast(`Con factura en ${monFac} solo podés facturar artículos en ${monFac} (este es ${monArt}).`,'err');
      FAC_ITEMS_NUEVA[idx].ite_art='';
      FAC_ITEMS_NUEVA[idx].ite_desp_art='';
      FAC_ITEMS_NUEVA[idx]._artReal=0; FAC_ITEMS_NUEVA[idx]._artPfac=0;
      FAC_ITEMS_NUEVA[idx]._depStk=null; FAC_ITEMS_NUEVA[idx]._depCostk=null;
      FAC_ITEMS_NUEVA[idx].ite_uni=0; FAC_ITEMS_NUEVA[idx].ite_preori=0;
      FAC_ITEMS_NUEVA[idx].ite_moneda='P'; FAC_ITEMS_NUEVA[idx].ite_cotiz=1;
      FAC_ITEMS_NUEVA[idx]._desps=null; FAC_ITEMS_NUEVA[idx]._desp_id=null;
      FAC_ITEMS_NUEVA[idx].ite_desp_nro='';
      nfRenderItems(); nfCalcTotales();
      return;
    }
  }
  FAC_ITEMS_NUEVA[idx].ite_uni=precio;
  FAC_ITEMS_NUEVA[idx].ite_preori=precio;
  FAC_ITEMS_NUEVA[idx].ite_moneda=monArt;
  FAC_ITEMS_NUEVA[idx].ite_cotiz=cotizItem;
  FAC_ITEMS_NUEVA[idx].ite_iva_porc=art.ART_IVA!==null&&art.ART_IVA!==undefined?Number(art.ART_IVA):21;
  try {
    const esNC=nfEsNC();
    const desps=await sbGet('despachos',`dep_art=eq.${encodeURIComponent(codUp)}&order=dep_fec.desc`);
    const despsFilt=esNC?desps:desps.filter(d=>(d.dep_ent||0)-(d.dep_sal||0)>0);
    FAC_ITEMS_NUEVA[idx]._desps=despsFilt;
    if(despsFilt.length===1){
      const d=despsFilt[0];
      FAC_ITEMS_NUEVA[idx].ite_desp_nro=d.dep_desp+(d.dep_sub||'');
      FAC_ITEMS_NUEVA[idx].ite_desp_fec=d.dep_fec||'';
      const dStk=(d.dep_stk!=null)?d.dep_stk:((d.dep_ent||0)-(d.dep_sal||0));
      FAC_ITEMS_NUEVA[idx]._depStk=dStk;
      FAC_ITEMS_NUEVA[idx]._depCostk=(d.dep_costk!=null)?d.dep_costk:dStk;
      FAC_ITEMS_NUEVA[idx].ite_disp=esNC?null:dStk;
      FAC_ITEMS_NUEVA[idx]._desp_id=d.dep_id;
    }
  } catch(e){console.error('nfItemArtChange desps:',e);}
  nfRenderItems();
  nfCalcTotales();
}

// ── Punto 5: comprobante seleccionado y máximo disponible según flags ──
function nfCtipActual(){
  const val=document.getElementById('nf-ctip')?.value||'';
  const emp=document.getElementById('nf-empresa')?.value||'';
  if(!val) return null;
  const [prefijo,tipo]=val.split('|');
  return CTIPS.find(c=>c.empresa===emp&&c.prefijo===prefijo&&c.tipo===tipo)||null;
}
// Máximo permitido para la cantidad. null = sin control (NC o sin despacho todavía).
function nfItemMax(it){
  if(nfEsNC()) return null;                 // Notas de crédito: no controla stock
  const ct=nfCtipActual();
  const ms=!!(ct&&ct.tab_stk), pf=!!(ct&&ct.tab_fact);
  if(!ms&&!pf) return null;                  // sin flags: no controla stock, pero se puede facturar
  // Contra DEP_COStk solo en "p/Facturar puro" (p/Facturar ✓ y Mueve Stock ✗)
  const usarContable = pf && !ms;
  const v = usarContable ? it._depCostk : it._depStk;
  return (v===null||v===undefined) ? null : v;
}
// Texto de "disponible" según flags (campos del artículo).
function nfItemDispTxt(it){
  if(nfEsNC()) return '—';
  const ct=nfCtipActual();
  const pf=!!(ct&&ct.tab_fact);
  const n=v=>(v===null||v===undefined)?0:v;
  if(!pf) return `${n(it._artReal)}`;                    // p/Facturar false → solo real
  // p/Facturar true → real arriba, p-Facturar abajo (apilado, sin barra)
  return `${n(it._artReal)}<br><span style="color:var(--t3);font-size:9px">${n(it._artPfac)}</span>`;
}

function nfItemDespChange(idx,depId) {
  const desps=FAC_ITEMS_NUEVA[idx]._desps||[];
  const d=desps.find(x=>String(x.dep_id)===String(depId));
  if(!d) return;
  const esNC=nfEsNC();
  FAC_ITEMS_NUEVA[idx].ite_desp_nro=d.dep_desp+(d.dep_sub||'');
  FAC_ITEMS_NUEVA[idx].ite_desp_fec=d.dep_fec||'';
  const dStk=(d.dep_stk!=null)?d.dep_stk:((d.dep_ent||0)-(d.dep_sal||0));
  const dCoStk=(d.dep_costk!=null)?d.dep_costk:dStk;
  FAC_ITEMS_NUEVA[idx]._depStk=dStk;
  FAC_ITEMS_NUEVA[idx]._depCostk=dCoStk;
  FAC_ITEMS_NUEVA[idx].ite_disp=esNC?null:dStk;
  FAC_ITEMS_NUEVA[idx]._desp_id=depId;
  nfRenderItems();
  nfCalcTotales();
}

function nfItemChange(idx,campo,valor) {
  const it=FAC_ITEMS_NUEVA[idx];
  if(campo==='ite_can'){
    const _max=nfItemMax(it);
    if(_max!==null&&valor>_max){
      FAC_ITEMS_NUEVA[idx].ite_can=0;
      toast(`Cantidad máxima para ese despacho: ${_max}. La dejé en 0.`,'err');
      nfRenderItems(); nfCalcTotales();
      return;
    }
  }
  FAC_ITEMS_NUEVA[idx][campo]=valor;
  const esA=nfEsFacturaA();
  const div=1+(it.ite_iva_porc||0)/100;
  const neto=esA?it.ite_uni/div:it.ite_uni;
  const cantAct=FAC_ITEMS_NUEVA[idx].ite_can||0;
  it.ite_imp=Math.round(neto*cantAct*100)/100;
  it.ite_iva_imp=esA?Math.round((it.ite_uni-neto)*cantAct*100)/100:0;
  if(campo==='ite_can') {
    // Solo actualizar el importe en el DOM sin re-renderizar (para no perder el foco)
    const impEl=document.querySelector(`#nf-items-body [data-idx="${idx}"] .nf-imp`);
    if(impEl) impEl.textContent=fmtN(it.ite_imp,2);
    nfCalcTotales();
  } else {
    nfRenderItems();
    nfCalcTotales();
  }
}

function nfItemsHabilitados() {
  const emp=document.getElementById('nf-empresa')?.value||'';
  const ctip=document.getElementById('nf-ctip')?.value||'';
  const cli=document.getElementById('nf-cli-cod')?.value||'';
  return emp && ctip && cli;
}

function nfItemsHabilitados() {
  const emp=document.getElementById('nf-empresa')?.value||'';
  const ctip=document.getElementById('nf-ctip')?.value||'';
  const cli=document.getElementById('nf-cli-cod')?.value||'';
  return emp && ctip && cli;
}

function nfRenderItems() {
  const body=document.getElementById('nf-items-body');
  const hdr=document.getElementById('nf-items-hdr');
  if(!body||!hdr) return;
  if(!nfItemsHabilitados()) {
    hdr.innerHTML='';
    body.innerHTML=`<div style="text-align:center;color:var(--t3);font-size:12px;padding:24px 16px;line-height:1.8">
      🔒 Completá <strong>Empresa</strong>, <strong>Tipo de Comprobante</strong> y <strong>Cliente</strong><br>para habilitar la carga de ítems.
    </div>`;
    ['nf-btn-grupo','nf-btn-resumir','nf-btn-agregar'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    return;
  }
  ['nf-btn-grupo','nf-btn-resumir','nf-btn-agregar'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='';
  });
  // Bloquear items hasta tener empresa, tipo y cliente
  if(!nfItemsHabilitados()) {
    hdr.innerHTML='';
    body.innerHTML=`<div style="text-align:center;color:var(--t3);font-size:12px;padding:24px 16px;line-height:1.8">
      🔒 Completá <strong>Empresa</strong>, <strong>Tipo de Comprobante</strong> y <strong>Cliente</strong><br>para habilitar la carga de ítems.
    </div>`;
    // Ocultar botones de items
    ['nf-btn-grupo','nf-btn-resumir','nf-btn-agregar'].forEach(id=>{
      const el=document.getElementById(id);if(el)el.style.display='none';
    });
    return;
  }
  // Mostrar botones
  ['nf-btn-grupo','nf-btn-resumir','nf-btn-agregar'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.style.display='';
  });
  const esA=nfEsFacturaA();
  const cols=`90px 1fr 50px 100px 65px 90px 45px 90px 90px 28px`;
  hdr.innerHTML=`<div style="display:grid;grid-template-columns:${cols};gap:4px;padding:6px 8px;background:var(--s3);font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">
    <span>Código</span><span>Descripción</span><span style="text-align:right">Disp</span><span>Despacho</span>
    <span style="text-align:right">Cant</span><span style="text-align:right">Precio c/IVA</span>
    <span style="text-align:center">%IVA</span>
    <span style="text-align:right">Precio s/IVA</span>
    <span style="text-align:right">Importe</span><span></span>
  </div>`;
  if(!FAC_ITEMS_NUEVA.length){
    body.innerHTML=`<div style="text-align:center;color:var(--t3);font-size:12px;padding:16px">Sin ítems — usá <strong>＋ Agregar</strong></div>`;
    return;
  }
  const _monFac=document.getElementById('nf-moneda')?.value||'P';
  const _simb=nfMonSimbolo(_monFac);
  body.innerHTML=FAC_ITEMS_NUEVA.map((it,i)=>{
    const ivaPct=it.ite_iva_porc||21;
    const divIva=1+ivaPct/100;
    const precioConIva=it.ite_uni||0;
    const neto=esA?precioConIva/divIva:precioConIva;
    const cant=it.ite_can||0;
    const imp=neto*cant;
    const dispTxt=nfItemDispTxt(it);
    const dispColor=(!nfEsNC()&&it.ite_art&&(it._artReal||0)===0&&(it._artPfac||0)===0)?'color:var(--red)':'color:var(--grn)';
    const _max=nfItemMax(it);
    const _cap=(_max===null||_max===undefined)?99999:_max;
    const esInexistente=it.ite_art&&!ARTS.find(a=>(a.ART_COD||'').trim()===it.ite_art);
    const des30=(it.ite_desp_art||'').substring(0,30);
    const desps=it._desps||[];
    let despHtml='';
    if(desps.length>1&&!it._desp_id){
      despHtml=`<select class="finp" style="font-size:10px;width:100%;padding:2px 4px" onchange="nfItemDespChange(${i},this.value)">
        <option value="">— Elegir —</option>
        ${desps.map(d=>{
          const disp=(d.dep_ent||0)-(d.dep_sal||0);
          const fec=d.dep_fec?d.dep_fec.substring(0,10).split('-').reverse().join('/'):'';
          return `<option value="${d.dep_id}">${d.dep_desp}${d.dep_sub||''} ${fec} (${disp})</option>`;
        }).join('')}
      </select>`;
    } else {
      despHtml=`<span style="font-family:var(--mono);font-size:10px;color:var(--t2)">${esc(it.ite_desp_nro||'—')}</span>`;
    }
    return `<div class="nf-item-row" data-idx="${i}" style="display:grid;grid-template-columns:${cols};gap:4px;padding:5px 8px;border-bottom:1px solid var(--b1);align-items:center;background:${esInexistente?'#2a1a1a':'var(--s2)'}">
      <span style="font-family:var(--mono);font-size:11px;color:var(--acc);cursor:pointer" onclick="nfAbrirBusqArt(${i})" title="Cambiar artículo">${esc(it.ite_art||'—')}</span>
      <span style="font-size:11px;color:${esInexistente?'var(--red)':'var(--t2)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(it.ite_desp_art||'')}">${esc(des30)}</span>
      <span style="text-align:right;font-family:var(--mono);font-size:11px;${dispColor}">${dispTxt}</span>
      <div>${despHtml}</div>
      ${(_max===0)?
        `<span style="text-align:right;font-family:var(--mono);font-size:12px;color:var(--red);width:100%;display:block" title="Sin disponible">0</span>`:
        `<input class="finp" type="number" min="0" step="1" value="${cant}"
          max="${_cap}"
          style="text-align:right;font-size:12px;width:100%;${cant===0?'color:var(--t3)':''}"
          onclick="this.select()"
          onchange="nfItemChange(${i},'ite_can',parseFloat(this.value)||0)">`
      }
      <div style="display:flex;align-items:center;gap:2px;justify-content:flex-end">
        <span style="font-size:9px;color:var(--t3)">${_simb}</span>
        <input class="finp" type="text" value="${fmtN(precioConIva,2)}"
          style="text-align:right;font-family:var(--mono);font-size:11px;width:100%"
          onclick="this.select()"
          onchange="nfItemChange(${i},'ite_uni',nfParseNum(this.value))">
      </div>
      <span style="text-align:center;font-family:var(--mono);font-size:10px;color:var(--t3)">${ivaPct}%</span>
      <span style="text-align:right;font-family:var(--mono);font-size:11px;color:var(--grn)">${fmtN(neto,2)}</span>
      <span class="nf-imp" style="text-align:right;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--txt)">${fmtN(imp,2)}</span>
      <button class="btn dng" onclick="nfEliminarItem(${i})" style="padding:2px 6px;font-size:11px">✕</button>
    </div>`;
  }).join('');
}

// ── Percepciones IIBB en facturación ──
function nfPercDetalle(cod){
  const p=(TABLAS['PERC']||[]).find(x=>x.CODIGO===cod);
  return p ? (p.DETALLE||cod) : cod;
}
function nfCtipTienePercib(){
  const ct=nfCtipActual();
  return !!(ct && ct.tab_percib);
}
// Poblar NF_PERCEP según el cliente actual + flag del comprobante
function nfPercepSync(cli){
  if(!nfCtipTienePercib()){ NF_PERCEP=[]; return; }
  const c = cli || window._nfCliActual;
  const arr = (c && Array.isArray(c.CLI_PERCEP)) ? c.CLI_PERCEP : [];
  // Conservar % ya editado si el código sigue estando
  const prev = {}; NF_PERCEP.forEach(p=>{ prev[p.cod]=p.pct; });
  NF_PERCEP = arr.map(p=>({
    cod:p.cod, detalle:nfPercDetalle(p.cod),
    pct:(prev[p.cod]!==undefined?prev[p.cod]:(Number(p.pct)||0)), importe:0
  }));
}
function nfPercepPct(i,val){
  if(NF_PERCEP[i]){ NF_PERCEP[i].pct=parseFloat(String(val).replace(',','.'))||0; nfCalcTotales(); }
}

// Recalcular precios de los ítems según la moneda actual + regla de monedas
function nfRecalcularItems(){
  const monFac=document.getElementById('nf-moneda')?.value||'P';
  const removidos=[];
  FAC_ITEMS_NUEVA = FAC_ITEMS_NUEVA.filter(it=>{
    if(!it.ite_art) return true;               // ítem vacío, lo dejo
    const a=(typeof ARTS!=='undefined'?ARTS:[]).find(x=>(x.ART_COD||'').trim()===(it.ite_art||'').trim());
    if(!a) return true;
    const monArt=a.ART_MONEDA||'P';
    // Regla de monedas: si la factura no es en pesos, sólo artículos de esa misma moneda
    if(monFac!=='P' && monArt!==monFac){ removidos.push(it.ite_art); return false; }
    let precio=a.ART_PRE||0, cotiz=1;
    if(monFac==='P' && monArt!=='P'){ cotiz=nfGetCotiz(monArt); precio=precio*cotiz; }
    it.ite_uni=precio; it.ite_preori=precio; it.ite_moneda=monArt; it.ite_cotiz=cotiz;
    return true;
  });
  if(removidos.length) toast(`Quitados por moneda (${monFac}): ${removidos.join(', ')}`,'err');
  nfPercepSync();
  nfRenderItems();
  nfCalcTotales();
}
// Handler del selector de moneda: si hay ítems cargados, recalcula
function nfOnMonedaChange(){
  const hayItems=FAC_ITEMS_NUEVA.some(it=>it.ite_art);
  if(hayItems) nfRecalcularItems();
  else { nfPercepSync(); nfCalcTotales(); }
}

function nfCalcTotales() {
  const esA=nfEsFacturaA();
  const dto=parseFloat(document.getElementById('nf-dto')?.value||0)||0;
  let neto=0, iva21=0, iva105=0, ivaOtro=0;
  FAC_ITEMS_NUEVA.forEach(it=>{
    const pct=it.ite_iva_porc||21;
    const div=1+pct/100;
    const n=esA?it.ite_uni/div:it.ite_uni;
    const cant=it.ite_can||0;
    neto+=n*cant;
    if(esA){
      const ivaItem=(it.ite_uni-n)*cant;
      if(pct===21)      iva21+=ivaItem;
      else if(pct===10.5) iva105+=ivaItem;
      else              ivaOtro+=ivaItem;
    }
  });
  const iva=iva21+iva105+ivaOtro;
  const subtotal=neto+iva;
  const dtoImp=subtotal*dto/100;
  // Percepciones IIBB: se calculan sobre el NETO (sin IVA)
  let totalPercep=0;
  NF_PERCEP.forEach(p=>{ p.importe=Math.round(neto*(Number(p.pct)||0)/100*100)/100; totalPercep+=p.importe; });
  // ── SUBFACTURACIÓN: dos juegos de totales ──
  // REAL = base (deuda del cliente, sin el descuento). DECLARADO (AFIP) = real × (1 − dto%).
  const r2 = x => Math.round(x*100)/100;
  const factor = 1 - dto/100;
  const totalReal = r2(subtotal + totalPercep);        // fac_total = REAL
  const netoAfip  = r2(neto*factor);
  const ivaAfip   = r2(iva*factor);
  const percepAfip= r2(totalPercep*factor);
  const totalAfip = r2(netoAfip + ivaAfip + percepAfip); // fac_total_afip = DECLARADO
  const total = totalReal;                              // el TOTAL mostrado = real (deuda)
  const monSel=document.getElementById('nf-moneda')?.value||'P';
  const monObj=(TABLAS['MONE']||[]).find(m=>m.CODIGO===monSel);
  const mon=monObj?monObj.STRING1:'$';
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  const setFlex=(id,show)=>{const el=document.getElementById(id);if(el)el.style.display=show?'flex':'none';};
  set('nf-tot-neto', `${mon} ${fmtN(neto,2)}`);
  set('nf-tot-iva21',`${mon} ${fmtN(iva21,2)}`);
  set('nf-tot-iva105',`${mon} ${fmtN(iva105,2)}`);
  set('nf-tot-sub',  `${mon} ${fmtN(subtotal,2)}`);
  set('nf-tot-dto',  dto>0?`- ${mon} ${fmtN(dtoImp,2)}`:'—');
  set('nf-tot-total',`${mon} ${fmtN(total,2)}`);
  // Línea de subfacturación: total declarado (AFIP) cuando hay descuento
  document.querySelectorAll('.nf-tot-afip').forEach(e=>{ e.textContent=`${mon} ${fmtN(totalAfip,2)}`; });
  const afipLbls=document.querySelectorAll('.nf-afip-lbl'); afipLbls.forEach(e=>{ e.textContent = dto>0?`Declarado AFIP (−${fmtN(dto,2)}%)`:'Declarado AFIP'; });
  setFlex('nf-fila-neto', esA);
  setFlex('nf-fila-iva21', esA&&iva21>0);
  setFlex('nf-fila-iva105',esA&&iva105>0);
  // Panel con fila única de IVA (el que arma renderFacForm)
  set('nf-tot-iva', `${mon} ${fmtN(iva,2)}`);
  setFlex('nf-fila-iva', esA&&iva>0);
  setFlex('nf-fila-dto', false);                 // el descuento ya no reduce el total real
  const setFlexAll=(cls,show)=>document.querySelectorAll(cls).forEach(e=>e.style.display=show?'flex':'none');
  setFlexAll('.nf-fila-afip', dto>0);            // muestro el declarado solo si subfacturás
  // Filas de percepciones (detalle + % editable + importe)
  const contList=document.querySelectorAll('.nf-percep-cont');
  if(contList.length){
    let html='';
    if(NF_PERCEP.length){
      html = `<div style="font-size:10px;color:var(--acc);text-transform:uppercase;letter-spacing:1px;margin:4px 0 2px;border-top:1px dashed rgba(128,128,128,.4);padding-top:4px">Percepciones IIBB (% editable)</div>` +
        NF_PERCEP.map((p,i)=>`
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:inherit;opacity:.85;padding:2px 0">
          <span style="display:flex;align-items:center;gap:4px">${esc(p.detalle)}
            <input class="finp" type="text" value="${fmtN(p.pct,2)}" onclick="this.select()" onchange="nfPercepPct(${i},this.value)" style="width:54px;text-align:right;font-size:11px;padding:1px 4px">%
          </span>
          <span>${mon} ${fmtN(p.importe,2)}</span>
        </div>`).join('');
    } else if(nfCtipTienePercib()){
      html = `<div style="font-size:11px;color:var(--wrn,#f59e0b);padding:3px 0;font-style:italic">⚠️ Este comprobante calcula Perc. IIBB, pero el cliente no tiene percepciones asignadas en su ficha.</div>`;
    }
    contList.forEach(el=>{ el.innerHTML=html; });
  }
  window._nfTotales={neto,iva21,iva105,iva,subtotal,dtoImp,totalPercep,total,totalReal,netoAfip,ivaAfip,percepAfip,totalAfip,factor,dto};
}

async function nfGuardar() {
  const empresa=document.getElementById('nf-empresa')?.value||'';
  const ctipVal=document.getElementById('nf-ctip')?.value||'';
  const cliCod=(document.getElementById('nf-cli-cod')?.value||'').trim().toUpperCase();
  const fecha=document.getElementById('nf-fecha')?.value||'';
  const moneda=document.getElementById('nf-moneda')?.value||'P';
  const tiva=document.getElementById('nf-tiva-cod')?.value||'';
  if(!empresa){toast('Seleccioná una empresa','err');return;}
  if(!ctipVal){toast('Seleccioná un tipo de comprobante','err');return;}
  if(!cliCod){toast('Ingresá un código de cliente','err');return;}
  if(!fecha){toast('Ingresá la fecha','err');return;}
  if(!FAC_ITEMS_NUEVA.length){toast('Agregá al menos un ítem','err');return;}
  const cli=facFindCli(cliCod);
  if(!cli){toast(`Cliente ${cliCod} no encontrado`,'err');return;}
  for(let i=0;i<FAC_ITEMS_NUEVA.length;i++){
    const it=FAC_ITEMS_NUEVA[i];
    if(!it.ite_art?.trim()){toast(`Ítem ${i+1}: falta el código de artículo`,'err');return;}
    if(!ARTS.find(a=>(a.ART_COD||'').trim()===it.ite_art)){toast(`Ítem ${i+1}: código ${it.ite_art} no existe`,'err');return;}
    if(!(it.ite_uni>0)){toast(`Ítem ${i+1}: precio debe ser mayor a 0`,'err');return;}
    if(!nfEsNC()&&!it._desp_id&&(it._desps||[]).length>1){toast(`Ítem ${i+1}: seleccioná un despacho`,'err');return;}
  }
  const [prefijo,tipo]=ctipVal.split('|');
  const ct=CTIPS.find(c=>c.empresa===empresa&&c.prefijo===prefijo&&c.tipo===tipo);
  if(!ct){toast('Tipo de comprobante no encontrado','err');return;}
  const esA=nfEsFacturaA();
  const tot=window._nfTotales||{};
  const dto=parseFloat(document.getElementById('nf-dto')?.value||0)||0;
  const conpag=document.getElementById('nf-conpag')?.value||'';
  const transp=document.getElementById('nf-transp')?.value||'';
  const vend=document.getElementById('nf-vend')?.value||'';
  const remito=document.getElementById('nf-remito')?.value||'';
  // El número lo asigna el server (autoritativo). No mandamos fac_nro.
  const facData={
    fac_fec:fecha,fac_cli:cliCod,
    fac_empresa:empresa,fac_ctip:prefijo,fac_tiva:tiva,fac_moneda:moneda,
    fac_sub:tot.subtotal||0,fac_iva:esA?(tot.iva||0):0,
    fac_total:tot.totalReal||0,fac_saldo:tot.totalReal||0,fac_percib:tot.totalPercep||0,
    fac_neto_afip:tot.netoAfip||0, fac_iva_afip:esA?(tot.ivaAfip||0):0, fac_percep_afip:tot.percepAfip||0, fac_total_afip:tot.totalAfip||0,
    fac_percep_det:NF_PERCEP.map(p=>({cod:p.cod,detalle:p.detalle,pct:p.pct,importe:p.importe})),
    fac_transp:transp,fac_remito:remito,fac_vcomi:conpag,fac_monpor:dto,
    fac_vend:vend,
    fac_tab_stk:!!ct.tab_stk, fac_tab_fact:!!ct.tab_fact,
    fac_afip_st:'pendiente',fac_cae:null,fac_cae_vto:null
  };
  const itemsAGrabar=FAC_ITEMS_NUEVA.filter(it=>(it.ite_can||0)>0&&(it.ite_imp||0)>0).map(it=>{
    const div=1+(it.ite_iva_porc||0)/100;
    const neto=esA?it.ite_uni/div:it.ite_uni;
    return {
      ite_art:it.ite_art||'',
      ite_desp:it.ite_desp_nro||'',
      ite_can:it.ite_can,ite_uni:it.ite_uni,
      ite_preori:it.ite_preori||0,
      ite_moneda:it.ite_moneda||'P',
      ite_cotiz:it.ite_cotiz||1,
      ite_imp:neto*(it.ite_can||1),
      ite_iva_porc:esA?(it.ite_iva_porc||21):0,
      ite_iva_imp:esA?(it.ite_uni-neto)*(it.ite_can||1):0,
      ite_impu:0,ite_costo:it.ite_uni,
      _dep_id:it._desp_id||null
    };
  });
  syncSaving();
  try {
    // número editable (si lo cambiaste); si no, el server usa ultimo_nro+1
    let numeroManual=null;
    const _numEl=document.getElementById('nf-num');
    if(_numEl){ const n=parseInt((String(_numEl.value||'').split('-').pop()||'').trim(),10); if(n>0) numeroManual=n; }
    const res=await apiPost('/facturas/guardar',{ ctId:ct.id, prefijo, tipo, empresa, numero:numeroManual, facData, items:itemsAGrabar });
    if(!res.ok){ syncErr(); toast(res.error||'No se pudo guardar','err'); return; }
    // Aplicar el movimiento de stock a los datos en memoria (para verlo al instante)
    if(res.stockDebug){
      res.stockDebug.forEach(d=>{
        if(d.updArt){
          const a=ARTS.find(x=>(x.ART_COD||'').trim()===(d.art||'').trim());
          if(a){
            if('art_stk'  in d.updArt) a.ART_STK =d.updArt.art_stk;
            if('art_stkt' in d.updArt) a.ART_STKT=d.updArt.art_stkt;
            if('art_deph' in d.updArt) a.ART_DEPH=d.updArt.art_deph;
            if('art_dept' in d.updArt) a.ART_DEPT=d.updArt.art_dept;
          }
        }
        if(d.updDep && d.dep && typeof DESPS!=='undefined' && Array.isArray(DESPS)){
          const dp=DESPS.find(x=>x.dep_id===d.dep);
          if(dp) Object.assign(dp, d.updDep);
        }
      });
      // Diagnóstico: avisar solo si algún ítem NO movió stock
      const fallidos=res.stockDebug.filter(d=>!d.ok);
      if(fallidos.length){
        console.warn('Stock no movido:',fallidos,'| Comprobante:',res.ct);
        alert('⚠️ No se movió stock en:\n\n'+fallidos.map(d=>`• ${d.art}: ${d.motivo||'?'}`).join('\n')+'\n\nComprobante: '+JSON.stringify(res.ct));
      }
    }
    const facNro=res.facNro;
    ct.ultimo_nro=res.nuevoUltimo; ct.bloqueado=false; ct.bloqueado_por=null;
    _nfCtipBloqueadoId=null;
    await sbLoadFacs();
    FAC_MODO=null; FAC_ITEMS_NUEVA=[];
    // Cerrar modal y volver a la grilla
    const ovNf=document.getElementById('ov-nf');
    if(ovNf) ovNf.classList.remove('open');
    renderFac();
    syncOk();
    toast(`✓ Factura ${facNro} guardada como borrador`,'scs');
    const idx=filtFacs().findIndex(f=>f.fac_nro===facNro);
    if(idx>=0) selFac(idx);
  } catch(e){console.error('nfGuardar:',e); syncErr(); toast('Error al guardar: '+e.message,'err');}
}

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

// ══════════ APLICACIÓN DE SALDO DE NOTAS DE CRÉDITO ══════════
async function ncAbrirAplicar(ncNro){
  let data, aplic={aplicaciones:[]};
  try {
    data = await apiGet('/nc/deudores/'+encodeURIComponent(ncNro));
    aplic = await apiGet('/nc/aplicaciones/'+encodeURIComponent(ncNro));
  }
  catch(e){ toast('No se pudieron traer los comprobantes','err'); return; }
  if(!data || !data.ok){ toast((data&&data.error)||'Error','err'); return; }
  const nc=data.nc, deudores=data.deudores||[];
  const mon=nc.fac_moneda==='P'?'$':'u$s';
  const filas = deudores.length ? deudores.map((c,i)=>{
    const sug=Math.min(Number(nc.fac_saldo)||0, Number(c.fac_saldo)||0);
    const fec=c.fac_fec?c.fac_fec.substring(0,10).split('-').reverse().join('/'):'—';
    return `<div style="display:grid;grid-template-columns:1fr 70px 90px 90px 150px;gap:8px;align-items:center;padding:7px 8px;border-bottom:1px solid var(--b1);font-size:12px">
      <span style="font-family:var(--mono);color:var(--acc)">${esc(c.fac_nro)}</span>
      <span style="color:var(--t3);font-size:11px">${fec}</span>
      <span style="text-align:right;color:var(--t2)">${mon} ${fmtN(c.fac_total,2)}</span>
      <span style="text-align:right;color:var(--red)">${mon} ${fmtN(c.fac_saldo,2)}</span>
      <span style="display:flex;gap:4px;align-items:center;justify-content:flex-end">
        <input id="ncimp-${i}" class="finp" type="text" value="${fmtN(sug,2)}" style="width:80px;text-align:right;font-size:11px" onclick="this.select()">
        <button class="btn scs" style="padding:3px 8px;font-size:11px" onclick="ncAplicarComp('${ncNro}','${c.fac_nro}','ncimp-${i}')">Aplicar</button>
      </span>
    </div>`;
  }).join('') : '<div style="padding:20px;text-align:center;color:var(--t3);font-size:12px">No hay comprobantes deudores (misma empresa, moneda y condición) con saldo pendiente.</div>';

  const aps=aplic&&aplic.aplicaciones||[];
  const bloqueAplic = aps.length ? `
    <div style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:1px;margin:14px 0 4px">Aplicaciones realizadas (${aps.length})</div>
    <div style="border:1px solid var(--b1);border-radius:6px;overflow:hidden">
      ${aps.map(a=>{
        const fec=a.fecha?String(a.fecha).substring(0,10).split('-').reverse().join('/'):'—';
        return `<div style="display:grid;grid-template-columns:1fr 90px 90px 90px;gap:8px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--b1);font-size:12px">
          <span style="font-family:var(--mono)">${esc(a.comp_nro)}</span>
          <span style="color:var(--t3);font-size:11px">${fec}</span>
          <span style="text-align:right;color:var(--grn)">${mon} ${fmtN(a.importe,2)}</span>
          <span style="text-align:right"><button class="btn dng" style="padding:2px 8px;font-size:11px" onclick="ncCancelarAplic(${a.id},'${ncNro}')">Cancelar</button></span>
        </div>`;
      }).join('')}
    </div>` : '';

  let ov=document.getElementById('ov-ncap');
  if(!ov){ ov=document.createElement('div'); ov.id='ov-ncap'; ov.className='ov'; document.body.appendChild(ov); }
  ov.innerHTML=`<div class="modal" style="max-width:680px;width:94%">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <strong style="font-size:14px">📌 Aplicar saldo · NC ${esc(ncNro)}</strong>
      <button class="btn" onclick="document.getElementById('ov-ncap').classList.remove('open')" style="padding:3px 9px">✕</button>
    </div>
    <div style="font-size:12px;color:var(--t2);margin-bottom:10px">
      Saldo disponible de la NC: <strong style="color:var(--grn)">${mon} ${fmtN(nc.fac_saldo,2)}</strong>
      &nbsp;·&nbsp; Empresa <strong>${esc(nc.fac_empresa||'')}</strong> &nbsp;·&nbsp; Moneda <strong>${nc.fac_moneda==='P'?'Pesos':nc.fac_moneda}</strong>
    </div>
    <div style="display:grid;grid-template-columns:1fr 70px 90px 90px 150px;gap:8px;padding:5px 8px;font-size:10px;color:var(--t3);text-transform:uppercase;border-bottom:1px solid var(--b1);letter-spacing:1px">
      <span>Comprobante</span><span>Fecha</span><span style="text-align:right">Total</span><span style="text-align:right">Saldo</span><span style="text-align:right">Importe a aplicar</span>
    </div>
    <div style="max-height:280px;overflow:auto">${filas}</div>
    ${bloqueAplic}
  </div>`;
  ov.classList.add('open');
}

async function ncCancelarAplic(id, ncNro){
  if(!confirm('¿Cancelar esta aplicación? El importe vuelve al saldo de la NC y del comprobante.')) return;
  let res;
  try { res=await apiPost('/nc/cancelar-aplic',{ id }); }
  catch(e){ toast('Error al cancelar','err'); return; }
  if(!res || !res.ok){ toast((res&&res.error)||'No se pudo cancelar','err'); return; }
  toast('Aplicación cancelada','scs');
  const upd=(nro,saldo)=>{ if(saldo!=null){ const f=FACS.find(x=>x.fac_nro===nro); if(f) f.fac_saldo=saldo; } };
  upd(res.nc_nro,res.ncSaldo); upd(res.comp_nro,res.compSaldo);
  ncAbrirAplicar(ncNro);
  const f=FACS.find(x=>x.fac_nro===ncNro); if(f) renderFacDetalle(f);
}

async function ncAplicarComp(ncNro, compNro, inpId){
  const imp=nfParseNum(document.getElementById(inpId)?.value||'0');
  if(imp<=0){ toast('Ingresá un importe válido','err'); return; }
  let res;
  try { res=await apiPost('/nc/aplicar',{ nc_nro:ncNro, comp_nro:compNro, importe:imp }); }
  catch(e){ toast('Error al aplicar','err'); return; }
  if(!res || !res.ok){ toast((res&&res.error)||'No se pudo aplicar','err'); return; }
  toast('Saldo aplicado','scs');
  // Actualizar saldos en memoria
  const upd=(nro,saldo)=>{ const f=FACS.find(x=>x.fac_nro===nro); if(f) f.fac_saldo=saldo; };
  upd(ncNro,res.ncSaldo); upd(compNro,res.compSaldo);
  // Si a la NC no le queda saldo, cierro; si no, refresco la lista
  if((res.ncSaldo||0)<=0){ document.getElementById('ov-ncap')?.classList.remove('open'); }
  else { ncAbrirAplicar(ncNro); }
  // Refrescar el detalle si está viendo esta NC
  const f=FACS.find(x=>x.fac_nro===ncNro); if(f) renderFacDetalle(f);
}

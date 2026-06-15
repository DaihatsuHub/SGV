// ═══════════════════════════════════════════════════════════
// RECIBOS — Cobranzas (listado + editor completo)
// Depende de: supabase.js, talonarios.js, retenciones.js,
//             FACS (facturacion.js), CLIS, TABLAS, PCIA
// ═══════════════════════════════════════════════════════════

let RECIS = [];
let RECI_ITEMS = [];
let reciSelIdx = null;
let _reciMode = 'A';
let _reciOrig = null;
let _reciHdr  = {};
let _reciDeud   = [];
let _reciTransf = [];
let _reciCheques= [];
let _reciRetenc = [];

// ── Mapeo moneda del comprobante → origen de la cotización ──
//   'pesos'  → cotización 1
//   'casio'  → cotización U$C del encabezado
//   'tressa' → cotización U$T del encabezado
//   AJUSTAR estas claves según tus códigos reales de fac_moneda:
const RECI_MON_COTIZ = { 'P':'pesos', 'U':'casio', 'C':'casio', 'T':'tressa' };
function reciMonKey(moneda){ return RECI_MON_COTIZ[moneda] || 'casio'; }

function reciMonInfo(facMon, hdr) {
  const key  = RECI_MON_COTIZ[facMon] || 'casio';
  const mone = (TABLAS['MONE']||[]).find(m => m.CODIGO === facMon);
  const simbolo = mone ? (mone.STRING1 || '$') : (key==='pesos' ? '$' : 'U$S');
  let cotiz = 1;
  if (key==='casio')  cotiz = hdr.cotCasio  || 1;
  else if (key==='tressa') cotiz = hdr.cotTressa || 1;
  return { key, simbolo, cotiz: Math.max(1, cotiz) };
}
function reciDefaultCotiz(tipoKey) {
  const cod  = Object.keys(RECI_MON_COTIZ).find(k => RECI_MON_COTIZ[k]===tipoKey);
  const mone = (TABLAS['MONE']||[]).find(m => m.CODIGO===cod);
  return mone ? (parseFloat(mone.STRING2)||1) : 1;
}
// Cotización de una moneda por su código (tabla monedas), robusta a espacios/mayúsculas
function monedaCotiz(cod){
  const m=(TABLAS['MONE']||[]).find(x=>(x.CODIGO||'').trim().toUpperCase()===String(cod).trim().toUpperCase());
  return m ? (parseFloat(m.STRING2)||1) : 1;
}

// ── Utils numéricos ────────────────────────────────────────
function round2(n){ return Math.round((Number(n)||0)*100)/100; }
function reciFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function reciParseNum(s){
  if (typeof s==='number') return s;
  s = String(s||'').trim().replace(/\./g,'').replace(',','.');
  const n = parseFloat(s); return isNaN(n)?0:n;
}
function reciVendDesc(cod){ const v=(TABLAS['VEND']||[]).find(x=>x.CODIGO===cod); return v?v.DETALLE:''; }

// ════════════════ LISTADO ════════════════
async function sbLoadRecis(){
  try { RECIS = await sbGetAll('recibos', 'fecha'); RECIS.sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')); }
  catch(e){ console.error('sbLoadRecis:', e); RECIS=[]; }
}
async function sbLoadReciItems(){
  try { RECI_ITEMS = await sbGetAll('recibo_items', 'id'); }
  catch(e){ console.error('sbLoadReciItems:', e); RECI_ITEMS=[]; }
}
function getReciRows(){
  const q=(document.getElementById('reci-q')?.value||'').toLowerCase();
  const razon=rec=>{ const c=CLIS.find(k=>(k.CLI_CODIGO||'').trim()===(rec.cliente||'').trim()); return (c?c.CLI_RAZON:rec.cliente)||''; };
  let rows=[];
  (RECI_ITEMS||[]).forEach(it=>{
    const rec=(RECIS||[]).find(r=>r.id===it.recibo_id);
    if(!rec || rec.anulado) return;
    rows.push({it, rec});
  });
  if(q) rows=rows.filter(({it,rec})=>
    String(rec.numero||'').includes(q) ||
    (it.comprobante||'').toLowerCase().includes(q) ||
    (rec.cliente||'').toLowerCase().includes(q) ||
    razon(rec).toLowerCase().includes(q));
  const monto=(it,key)=> reciMonKey(it.moneda)===key ? (key==='pesos'?(it.abona||0):(it.abona_orig||0)) : 0;
  const s=(typeof SORT_STATE!=='undefined' && SORT_STATE.reci) ? SORT_STATE.reci : {col:null,asc:true};
  if(s.col){
    rows=rows.slice().sort((A,B)=>{
      let va,vb;
      switch(s.col){
        case 'REC_FEC':   va=A.rec.fecha||''; vb=B.rec.fecha||''; break;
        case 'REC_CLI':   va=razon(A.rec); vb=razon(B.rec); break;
        case 'REC_COMP':  va=A.it.comprobante||''; vb=B.it.comprobante||''; break;
        case 'REC_MON':   va=A.it.moneda||''; vb=B.it.moneda||''; break;
        case 'REC_PESOS': va=monto(A.it,'pesos'); vb=monto(B.it,'pesos'); break;
        case 'REC_CASIO': va=monto(A.it,'casio'); vb=monto(B.it,'casio'); break;
        case 'REC_TRESSA':va=monto(A.it,'tressa');vb=monto(B.it,'tressa'); break;
        case 'REC_NRO':   va=(A.rec.empresa||'')+(A.rec.talonario||'')+String(A.rec.numero||'').padStart(10,'0'); vb=(B.rec.empresa||'')+(B.rec.talonario||'')+String(B.rec.numero||'').padStart(10,'0'); break;
        default: va=''; vb='';
      }
      const r=(typeof va==='number'&&typeof vb==='number')?(va-vb):String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    });
  } else {
    rows=rows.slice().sort((a,b)=>(b.rec.fecha||'').localeCompare(a.rec.fecha||'') || (b.rec.numero||0)-(a.rec.numero||0));
  }
  return rows;
}
function renderReci(){
  const list=getReciRows(); const body=document.getElementById('reci-body'); if(!body) return;
  const cols=(typeof getActiveCols==='function')?getActiveCols('reci'):[
    {field:'REC_FEC',label:'Fecha recibo',width:'100px'},{field:'REC_CLI',label:'Cliente',width:'1fr'},
    {field:'REC_COMP',label:'Comprobante',width:'130px'},{field:'REC_MON',label:'Moneda',width:'95px'},
    {field:'REC_PESOS',label:'Pesos',width:'115px',align:'right'},{field:'REC_CASIO',label:'Casio',width:'115px',align:'right'},
    {field:'REC_TRESSA',label:'Tressa',width:'115px',align:'right'}];
  const gridTpl=cols.map(c=>c.width||'1fr').join(' ');
  const thead=document.getElementById('reci-thead');
  if(thead){
    thead.style.gridTemplateColumns=gridTpl;
    thead.innerHTML=cols.map(c=>`<span class="th-sortable" onclick="toggleSort('reci','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${(typeof sortArrow==='function')?sortArrow('reci',c.field):''}</span>`).join('');
  }
  if(!list.length){ body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML=list.map((row,i)=>{
    const {it,rec}=row;
    const sel=reciSelIdx===i?'sel':'';
    const cli=CLIS.find(c=>(c.CLI_CODIGO||'').trim()===(rec.cliente||'').trim());
    const fec=rec.fecha?rec.fecha.substring(0,10).split('-').reverse().join('/'):'—';
    const key=reciMonKey(it.moneda);
    const mone=(TABLAS['MONE']||[]).find(m=>(m.CODIGO||'')===(it.moneda||''));
    const monLabel=mone?(mone.DETALLE||mone.CODIGO):(it.moneda||'');
    const pesos = key==='pesos'  ? reciFmt(it.abona||0)      : '';
    const casio = key==='casio'  ? reciFmt(it.abona_orig||0) : '';
    const tressa= key==='tressa' ? reciFmt(it.abona_orig||0) : '';
    return `<div class="tr-art ${sel}" data-idx="${i}" style="grid-template-columns:${gridTpl}" onclick="selReci(${i})" ondblclick="reciModif()">`+
      cols.map(c=>{
        if(c.field==='REC_FEC')   return `<span class="col-sm" style="color:var(--t2)">${fec}</span>`;
        if(c.field==='REC_CLI')   return `<span class="col-des">${esc(rec.cliente||'')}${cli?' — '+esc(cli.CLI_RAZON):''}</span>`;
        if(c.field==='REC_COMP')  return `<span class="col-cod" style="color:var(--acc)">${esc(it.comprobante||'')}</span>`;
        if(c.field==='REC_MON')   return `<span class="col-sm">${esc(monLabel)}</span>`;
        if(c.field==='REC_PESOS') return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${pesos}</span>`;
        if(c.field==='REC_CASIO') return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${casio}</span>`;
        if(c.field==='REC_TRESSA')return `<span class="col-num" style="text-align:right;font-family:var(--mono)">${tressa}</span>`;
        if(c.field==='REC_NRO')   return `<span class="col-sm">${esc(rec.empresa||'')}${esc(rec.talonario||'')} ${esc(String(rec.numero||''))}</span>`;
        return `<span></span>`;
      }).join('')+
    `</div>`;
  }).join('');
  body.querySelector('.tr-art.sel')?.scrollIntoView({block:'nearest'});
  reciInstallNav();
}

// Navegación por teclado (flechas + RePág/AvPág + Inicio/Fin), instalada una sola vez.
let _reciNavInstalled=false;
function reciInstallNav(){
  if(_reciNavInstalled) return; _reciNavInstalled=true;
  document.addEventListener('keydown', function(e){
    const page=document.getElementById('page-reci');
    if(!page || !page.classList.contains('active')) return;   // solo en la pantalla de Recibos
    if(document.querySelector('.ov.open')) return;            // no si hay un modal abierto
    const ae=document.activeElement;
    if(ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return; // no interferir al escribir
    const total=getReciRows().length; if(!total) return;
    let next=(reciSelIdx==null)?0:reciSelIdx;
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
    selReci(next);
    document.getElementById('reci-body')?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({block:'nearest'});
  });
}
function selReci(i){ reciSelIdx=i; renderReci(); }

// ════════════════ EDITOR — apertura ════════════════
function reciAlta(){
  _reciMode='A'; _reciOrig=null;
  _reciDeud=[]; _reciTransf=[]; _reciCheques=[]; _reciRetenc=[];
  const emp='H';
  _reciHdr={ empresa:emp, talonario:'', numero:'', fecha:new Date().toISOString().substring(0,10),
    cliente:'', cotCasio:monedaCotiz('C'), cotTressa:monedaCotiz('T') };
  ['rf-emp','rf-talo','rf-cli'].forEach(id=>{const el=document.getElementById(id); if(el) el.disabled=false;});
  reciFillTalonarios(emp);
  document.getElementById('rf-emp').value=emp;
  const tls=talosDeEmpresa(emp); _reciHdr.talonario=tls[0]?.tipo||'';
  document.getElementById('rf-talo').value=_reciHdr.talonario;
  _reciHdr.numero=_reciHdr.talonario?taloNextNumero(emp,_reciHdr.talonario):'';
  const numElA=document.getElementById('rf-num'); if(numElA){ numElA.value=_reciHdr.numero||''; numElA.readOnly=true; }
  document.getElementById('rf-fec').value=_reciHdr.fecha;
  document.getElementById('rf-cli').value='';
  ['rf-domic','rf-local','rf-provin','rf-vend'].forEach(id=>{const el=document.getElementById(id); if(el) el.textContent='—';});
  document.getElementById('rf-cot-casio').value=reciFmt(_reciHdr.cotCasio);
  document.getElementById('rf-cot-tressa').value=reciFmt(_reciHdr.cotTressa);
  document.getElementById('rf-efectivo').value='0,00';
  document.getElementById('rf-ajuste').value='0,00';
  reciFillClienteList();
  renderReciDeud(); renderReciTransf(); renderReciCheques(); renderReciRetenc(); reciReconcile();
  document.getElementById('reci-mtit').textContent='Nuevo Recibo';
  setMtag('reci-mtag','ALTA','tag-a');
  document.getElementById('ov-reci').classList.add('open');
}

async function reciModif(){
  if(reciSelIdx===null){ toast('Seleccioná un recibo','err'); return; }
  const sel=getReciRows()[reciSelIdx]; if(!sel){ toast('Seleccioná un recibo','err'); return; }
  const rc=sel.rec;
  _reciMode='M'; _reciOrig=rc;
  _reciHdr={ empresa:rc.empresa, talonario:rc.talonario, numero:rc.numero, fecha:(rc.fecha||'').substring(0,10),
    cliente:rc.cliente, cotCasio:rc.cot_casio||1, cotTressa:rc.cot_tressa||1 };
  reciFillTalonarios(rc.empresa);
  document.getElementById('rf-emp').value=rc.empresa;  document.getElementById('rf-emp').disabled=true;
  document.getElementById('rf-talo').value=rc.talonario; document.getElementById('rf-talo').disabled=true;
  const numElM=document.getElementById('rf-num'); if(numElM){ numElM.value=rc.numero; numElM.readOnly=true; }
  document.getElementById('rf-fec').value=_reciHdr.fecha;
  document.getElementById('rf-cot-casio').value=reciFmt(_reciHdr.cotCasio);
  document.getElementById('rf-cot-tressa').value=reciFmt(_reciHdr.cotTressa);
  reciFillClienteList();
  const cli=CLIS.find(c=>(c.CLI_CODIGO||'').trim()===(rc.cliente||'').trim());
  document.getElementById('rf-cli').value=cli?cli.CLI_RAZON:rc.cliente; document.getElementById('rf-cli').disabled=true;
  if(cli){
    document.getElementById('rf-domic').textContent=cli.CLI_DOMIC||'—';
    document.getElementById('rf-local').textContent=cli.CLI_LOCAL||'—';
    document.getElementById('rf-provin').textContent=(PCIA[cli.CLI_PROVIN]||cli.CLI_PROVIN||'—');
    document.getElementById('rf-vend').textContent=reciVendDesc(cli.CLI_VEND)||(cli.CLI_VEND||'—');
  }
  document.getElementById('rf-efectivo').value='0,00';
  document.getElementById('rf-ajuste').value='0,00';
  try{
    const items=await sbGet('recibo_items',`recibo_id=eq.${rc.id}&order=id.asc`);
    _reciDeud=items.map(it=>({ fac_nro:it.comprobante, fac_fec:it.fecha, fac_moneda:it.moneda,
      simbolo:reciMonInfo(it.moneda,_reciHdr).simbolo, saldo_orig:it.saldo_orig||0,
      cotizacion:it.cotizacion||1, saldo:it.saldo||0, abona:it.abona||0, abona_orig:it.abona_orig||0 }));
    const pagos=await sbGet('recibo_pagos',`recibo_id=eq.${rc.id}`);
    _reciTransf=pagos.filter(p=>p.tipo==='transferencia').map(p=>({fecha:p.fecha,importe:p.importe||0}));
    _reciRetenc=pagos.filter(p=>p.tipo==='retencion').map(p=>({codigo:p.ret_codigo,importe:p.importe||0}));
    const efe=pagos.find(p=>p.tipo==='efectivo'); document.getElementById('rf-efectivo').value=reciFmt(efe?efe.importe:0);
    const aju=pagos.find(p=>p.tipo==='ajuste');   document.getElementById('rf-ajuste').value=reciFmt(aju?aju.importe:0);
    const chs=await sbGet('cheques',`recibo_id=eq.${rc.id}`);
    _reciCheques=chs.map(c=>({fecha:c.fecha,numero:c.numero,importe:c.importe||0,fisico:!!c.fisico,propio:!!c.propio}));
  }catch(e){ console.error('reciModif load:',e); _reciDeud=[];_reciTransf=[];_reciCheques=[];_reciRetenc=[]; }
  renderReciDeud(); renderReciTransf(); renderReciCheques(); renderReciRetenc(); reciReconcile();
  document.getElementById('reci-mtit').textContent=`Modificar Recibo ${rc.empresa}${rc.talonario} ${rc.numero}`;
  setMtag('reci-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-reci').classList.add('open');
}

function reciBaja(){
  if(reciSelIdx===null){ toast('Seleccioná un recibo','err'); return; }
  const sel=getReciRows()[reciSelIdx]; if(!sel){ toast('Seleccioná un recibo','err'); return; }
  const rc=sel.rec;
  confirm2(`¿Anular el recibo ${rc.empresa}${rc.talonario} ${rc.numero}?`,'Se revertirán los saldos de las facturas imputadas.',async()=>{
    try{
      await reciRevertir(rc);
      await sbDelete('recibos',{id:rc.id});  // cascade borra items/pagos/cheques
      const idx=RECIS.findIndex(x=>x.id===rc.id); if(idx>=0) RECIS.splice(idx,1);
      await sbLoadReciItems();
      reciSelIdx=null; renderReci(); toast('Recibo anulado','scs');
    }catch(e){ console.error(e); toast('Error al anular','err'); }
  });
}

// ════════════════ EDITOR — encabezado ════════════════
function reciFillTalonarios(emp){
  const sel=document.getElementById('rf-talo'); if(!sel) return;
  const tls=talosDeEmpresa(emp);
  sel.innerHTML=tls.length
    ? tls.map(t=>`<option value="${t.tipo}">${esc(t.tipo)} — ${esc(t.descripcion||'')}</option>`).join('')
    : '<option value="">(sin talonarios)</option>';
}
function reciEmpresaChange(){
  const emp=document.getElementById('rf-emp').value; _reciHdr.empresa=emp;
  reciFillTalonarios(emp);
  const tls=talosDeEmpresa(emp); _reciHdr.talonario=tls[0]?.tipo||'';
  document.getElementById('rf-talo').value=_reciHdr.talonario;
  reciSetNumero(); reciLoadDeudores();
}
function reciTaloChange(){ _reciHdr.talonario=document.getElementById('rf-talo').value; reciSetNumero(); }
function reciSetNumero(){
  if(_reciMode!=='A') return;
  _reciHdr.numero=_reciHdr.talonario?taloNextNumero(_reciHdr.empresa,_reciHdr.talonario):'';
  const el=document.getElementById('rf-num'); if(el){ el.value=_reciHdr.numero||''; el.readOnly=true; }
}
// Cuando el número se vuelve editable (por duplicado), reflejar en el estado
function reciNumeroChange(){
  _reciHdr.numero = parseInt(document.getElementById('rf-num').value) || '';
}
// Sugerir el próximo número libre del talonario (mirando recibos + contador)
async function reciSugerirNumero(emp, talo){
  try{
    const rows=await sbGet('recibos',`empresa=eq.${emp}&talonario=eq.${talo}&order=numero.desc&limit=1`);
    const maxRec=rows.length?(Number(rows[0].numero)||0):0;
    const t=taloFind(emp,talo); const ult=t?(Number(t.ultimo_nro)||0):0;
    return Math.max(maxRec,ult)+1;
  }catch(e){ return (parseInt(_reciHdr.numero)||0)+1; }
}
function reciFechaChange(){ _reciHdr.fecha=document.getElementById('rf-fec').value; }
function reciHdrCotizChange(){
  _reciHdr.cotCasio=reciParseNum(document.getElementById('rf-cot-casio')?.value||'1');
  _reciHdr.cotTressa=reciParseNum(document.getElementById('rf-cot-tressa')?.value||'1');
  _reciDeud.forEach(d=>{
    const info=reciMonInfo(d.fac_moneda,_reciHdr);
    d.cotizacion=info.cotiz; d.saldo=round2(d.saldo_orig*info.cotiz);
    if(d.abona>d.saldo) d.abona=d.saldo;
    d.abona_orig=info.cotiz>0?round2(d.abona/info.cotiz):0;
  });
  renderReciDeud(); reciReconcile();
}
function reciFillClienteList(){
  const dl=document.getElementById('rf-cli-list'); if(!dl) return;
  dl.innerHTML=(CLIS||[]).map(c=>`<option value="${esc(c.CLI_RAZON||'')}">`).join('');
}
function reciClienteChange(){
  const val=(document.getElementById('rf-cli').value||'').trim().toLowerCase();
  const c=(CLIS||[]).find(x=>(x.CLI_RAZON||'').trim().toLowerCase()===val);
  if(!c){ _reciHdr.cliente='';
    ['rf-domic','rf-local','rf-provin','rf-vend'].forEach(id=>{const el=document.getElementById(id); if(el) el.textContent='—';});
    _reciDeud=[]; renderReciDeud(); reciReconcile(); return;
  }
  _reciHdr.cliente=c.CLI_CODIGO;
  document.getElementById('rf-domic').textContent=c.CLI_DOMIC||'—';
  document.getElementById('rf-local').textContent=c.CLI_LOCAL||'—';
  document.getElementById('rf-provin').textContent=(PCIA[c.CLI_PROVIN]||c.CLI_PROVIN||'—');
  document.getElementById('rf-vend').textContent=reciVendDesc(c.CLI_VEND)||(c.CLI_VEND||'—');
  reciLoadDeudores();
}

// ════════════════ EDITOR — grilla de deudores ════════════════
function reciLoadDeudores(){
  const cod=_reciHdr.cliente, emp=_reciHdr.empresa; _reciDeud=[];
  if(cod){
    (FACS||[]).forEach(f=>{
      const tipo=(f.fac_nro||'').trim().slice(-1);
      const esDeudor=['F','D','R'].includes(tipo);
      const mismaEmp=(f.fac_empresa? f.fac_empresa===emp : (f.fac_nro||'').startsWith(emp));
      if((f.fac_cli||'').trim()===cod.trim() && mismaEmp && esDeudor && (f.fac_saldo||0)>0){
        const info=reciMonInfo(f.fac_moneda,_reciHdr);
        const saldoOrig=round2(f.fac_saldo||0);
        _reciDeud.push({ fac_nro:f.fac_nro, fac_fec:f.fac_fec, fac_moneda:f.fac_moneda,
          simbolo:info.simbolo, saldo_orig:saldoOrig, cotizacion:info.cotiz,
          saldo:round2(saldoOrig*info.cotiz), abona:0, abona_orig:0 });
      }
    });
  }
  renderReciDeud(); reciReconcile();
}
function renderReciDeud(){
  const body=document.getElementById('rf-deud-body'); if(!body) return;
  if(!_reciDeud.length){ body.innerHTML='<div class="empty" style="padding:14px">Sin comprobantes deudores</div>'; }
  else body.innerHTML=_reciDeud.map((d,i)=>{
    const fec=d.fac_fec?d.fac_fec.substring(0,10).split('-').reverse().join('/'):'';
    const esPeso=(RECI_MON_COTIZ[d.fac_moneda]||'')==='pesos';
    const cotizCell = esPeso
      ? `<span style="text-align:right;color:var(--t3)">1,00</span>`
      : `<input type="text" value="${reciFmt(d.cotizacion)}" onclick="event.stopPropagation()" onchange="reciCotizInput(${i},this.value)" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" style="text-align:right;font-family:var(--mono);font-size:12px;height:24px">`;
    return `<div onclick="reciAplicarFila(${i})" title="Clic para aplicar: ofrece el saldo del comprobante o lo que falta del saldo a aplicar" style="display:grid;grid-template-columns:92px 64px 100px 92px 78px 104px 100px;gap:6px;align-items:center;padding:4px 8px;border-bottom:1px solid var(--b1);font-size:12px;font-family:var(--mono);cursor:pointer">
      <span style="color:var(--acc)">${esc(d.fac_nro)}</span>
      <span style="color:var(--t2)">${fec}</span>
      <span style="text-align:right">${esc(d.simbolo)} ${reciFmt(d.saldo_orig)}</span>
      <span style="text-align:right;color:var(--t3)">${esc(d.simbolo)} ${reciFmt(d.abona_orig)}</span>
      ${cotizCell}
      <span style="text-align:right">$ ${reciFmt(d.saldo)}</span>
      <input type="text" value="${reciFmt(d.abona)}" onclick="event.stopPropagation()" onchange="reciAbonaInput(${i},this.value)" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" style="text-align:right;font-family:var(--mono);font-size:12px;height:24px;background:var(--s3)">
    </div>`;
  }).join('');
  const ts=document.getElementById('rf-tot-saldo'); if(ts) ts.textContent='$ '+reciFmt(_reciDeud.reduce((s,d)=>s+(d.saldo||0),0));
  const ta=document.getElementById('rf-tot-abona'); if(ta) ta.textContent='$ '+reciFmt(reciTotAbonado());
}
function reciAbonaInput(i,val){
  const d=_reciDeud[i]; if(!d) return;
  let a=reciParseNum(val); if(a<0)a=0;
  // tope = menor entre el saldo del comprobante y lo que falta para llegar al total de instrumentos
  const disponible=Math.max(0, round2(reciTotInstrumentos() - (reciTotAbonado() - (d.abona||0))));
  const tope=Math.min(d.saldo, disponible);
  if(a>tope) a=tope;
  d.abona=round2(a); d.abona_orig=d.cotizacion>0?round2(d.abona/d.cotizacion):0;
  renderReciDeud(); reciReconcile();
}
// Al clickear el comprobante: ofrecer el menor entre saldo y lo que falta de instrumentos
function reciAplicarFila(i){
  const d=_reciDeud[i]; if(!d) return;
  const disponible=Math.max(0, round2(reciTotInstrumentos() - (reciTotAbonado() - (d.abona||0))));
  d.abona=round2(Math.min(d.saldo, disponible));
  d.abona_orig=d.cotizacion>0?round2(d.abona/d.cotizacion):0;
  renderReciDeud(); reciReconcile();
}
function reciCotizInput(i,val){
  const d=_reciDeud[i]; if(!d) return;
  let c=reciParseNum(val); if(c<1)c=1; d.cotizacion=c;
  d.saldo=round2(d.saldo_orig*c); if(d.abona>d.saldo)d.abona=d.saldo;
  d.abona_orig=round2(d.abona/c);
  renderReciDeud(); reciReconcile();
}

// ════════════════ EDITOR — instrumentos ════════════════
function reciAddTransf(){ _reciTransf.push({fecha:_reciHdr.fecha,importe:0}); renderReciTransf(); reciReconcile(); }
function reciDelTransf(i){ _reciTransf.splice(i,1); renderReciTransf(); reciReconcile(); }
function reciTransfInput(i,campo,val){ const t=_reciTransf[i]; if(!t) return; if(campo==='importe') t.importe=reciParseNum(val); else t.fecha=val; renderReciTransf(); reciReconcile(); }
function renderReciTransf(){
  const b=document.getElementById('rf-transf-body'); if(!b) return;
  b.innerHTML=_reciTransf.map((t,i)=>`<div style="display:grid;grid-template-columns:1fr 1fr 22px;gap:6px;align-items:center;padding:3px 0">
    <input type="date" value="${t.fecha||''}" onchange="reciTransfInput(${i},'fecha',this.value)" style="height:24px;font-size:12px">
    <input type="text" value="${reciFmt(t.importe)}" onchange="reciTransfInput(${i},'importe',this.value)" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" style="height:24px;text-align:right;font-family:var(--mono);font-size:12px">
    <button class="mcls" onclick="reciDelTransf(${i})" title="Quitar">✕</button>
  </div>`).join('');
  const s=document.getElementById('rf-transf-sub'); if(s) s.textContent='$ '+reciFmt(_reciTransf.reduce((a,x)=>a+(x.importe||0),0));
}
function reciAddCheque(){ _reciCheques.push({fecha:_reciHdr.fecha,numero:'',importe:0,fisico:true,propio:false}); renderReciCheques(); reciReconcile(); }
function reciDelCheque(i){ _reciCheques.splice(i,1); renderReciCheques(); reciReconcile(); }
function reciChequeInput(i,campo,val,checked){
  const c=_reciCheques[i]; if(!c) return;
  if(campo==='importe') c.importe=reciParseNum(val);
  else if(campo==='fisico') c.fisico=checked;
  else if(campo==='propio') c.propio=checked;
  else if(campo==='numero') c.numero=(val||'').replace(/\D/g,'').slice(0,4);
  else c.fecha=val;
  renderReciCheques(); reciReconcile();
}
function renderReciCheques(){
  const b=document.getElementById('rf-cheq-body'); if(!b) return;
  b.innerHTML=_reciCheques.map((c,i)=>`<div style="display:grid;grid-template-columns:1.1fr 0.7fr 1fr 40px 40px 22px;gap:6px;align-items:center;padding:3px 0">
    <input type="date" value="${c.fecha||''}" onchange="reciChequeInput(${i},'fecha',this.value)" style="height:24px;font-size:12px">
    <input type="text" maxlength="4" value="${esc(c.numero||'')}" placeholder="0000" onchange="reciChequeInput(${i},'numero',this.value)" style="height:24px;font-size:12px;font-family:var(--mono)">
    <input type="text" value="${reciFmt(c.importe)}" onchange="reciChequeInput(${i},'importe',this.value)" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" style="height:24px;text-align:right;font-family:var(--mono);font-size:12px">
    <input type="checkbox" ${c.fisico?'checked':''} onchange="reciChequeInput(${i},'fisico',null,this.checked)" title="Físico">
    <input type="checkbox" ${c.propio?'checked':''} onchange="reciChequeInput(${i},'propio',null,this.checked)" title="Propio">
    <button class="mcls" onclick="reciDelCheque(${i})" title="Quitar">✕</button>
  </div>`).join('');
  const s=document.getElementById('rf-cheq-sub'); if(s) s.textContent='$ '+reciFmt(_reciCheques.reduce((a,x)=>a+(x.importe||0),0));
}
function reciAddRetenc(){ _reciRetenc.push({codigo:(RETES[0]?.codigo||''),importe:0}); renderReciRetenc(); reciReconcile(); }
function reciDelRetenc(i){ _reciRetenc.splice(i,1); renderReciRetenc(); reciReconcile(); }
function reciRetencInput(i,campo,val){ const r=_reciRetenc[i]; if(!r) return; if(campo==='importe') r.importe=reciParseNum(val); else r.codigo=val; renderReciRetenc(); reciReconcile(); }
function renderReciRetenc(){
  const b=document.getElementById('rf-reten-body'); if(!b) return;
  b.innerHTML=_reciRetenc.map((r,i)=>{
    const opts=(RETES||[]).map(x=>`<option value="${esc(x.codigo)}" ${x.codigo===r.codigo?'selected':''}>${esc(x.codigo)} — ${esc(x.descripcion||'')}</option>`).join('');
    return `<div style="display:grid;grid-template-columns:1.6fr 1fr 22px;gap:6px;align-items:center;padding:3px 0">
      <select onchange="reciRetencInput(${i},'codigo',this.value)" style="height:24px;font-size:12px">${opts}</select>
      <input type="text" value="${reciFmt(r.importe)}" onchange="reciRetencInput(${i},'importe',this.value)" onfocus="this.select()" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" style="height:24px;text-align:right;font-family:var(--mono);font-size:12px">
      <button class="mcls" onclick="reciDelRetenc(${i})" title="Quitar">✕</button>
    </div>`;
  }).join('');
  const s=document.getElementById('rf-reten-sub'); if(s) s.textContent='$ '+reciFmt(_reciRetenc.reduce((a,x)=>a+(x.importe||0),0));
}

// ════════════════ Reconciliación ════════════════
function reciTotAbonado(){ return round2(_reciDeud.reduce((s,d)=>s+(d.abona||0),0)); }
function reciTotInstrumentos(){
  const efe=reciParseNum(document.getElementById('rf-efectivo')?.value||'0');
  const aju=reciParseNum(document.getElementById('rf-ajuste')?.value||'0');
  const t=_reciTransf.reduce((s,x)=>s+(x.importe||0),0);
  const c=_reciCheques.reduce((s,x)=>s+(x.importe||0),0);
  const r=_reciRetenc.reduce((s,x)=>s+(x.importe||0),0);
  return round2(efe+aju+t+c+r);
}
function reciReconcile(){
  const abonado = reciTotInstrumentos();   // total del recibo = instrumentos
  const aplicado = reciTotAbonado();        // lo repartido en los comprobantes
  const saldoAplicar = round2(abonado - aplicado);
  const elAb=document.getElementById('rf-abonado'); if(elAb) elAb.textContent=reciFmt(abonado);
  const elSa=document.getElementById('rf-saldo-aplicar');
  if(elSa){ elSa.textContent=reciFmt(saldoAplicar); elSa.style.color = Math.abs(saldoAplicar)<0.01 ? 'var(--grn)' : 'var(--red)'; }
  const ok = abonado>0 && Math.abs(saldoAplicar)<0.01;
  const btn=document.getElementById('rf-save'); if(btn){ btn.disabled=!ok; btn.style.opacity= ok?'1':'0.5'; }
}

// ════════════════ Guardar ════════════════
async function reciInsertCabecera(data){
  const token=await getAuthToken();
  const r=await fetch(`${SB_URL}/rest/v1/recibos`,{method:'POST',
    headers:{...SB_HDR,'Authorization':'Bearer '+token,'Prefer':'return=representation'},
    body:JSON.stringify(data)});
  if(!r.ok){ const t=await r.text(); throw new Error('insert recibo '+r.status+': '+t.substring(0,150)); }
  const rows=await r.json(); return rows[0]?.id;
}
async function reciUpdateCabecera(id,data){
  const d={...data}; delete d.id;
  const token=await getAuthToken();
  const r=await fetch(`${SB_URL}/rest/v1/recibos?id=eq.${id}`,{method:'PATCH',
    headers:{...SB_HDR,'Authorization':'Bearer '+token}, body:JSON.stringify(d)});
  if(!r.ok) throw new Error('update recibo '+r.status);
}
async function reciPatchFac(facNro,patch){
  const token=await getAuthToken();
  const r=await fetch(`${SB_URL}/rest/v1/facturas?fac_nro=eq.${encodeURIComponent(facNro)}`,{method:'PATCH',
    headers:{...SB_HDR,'Authorization':'Bearer '+token}, body:JSON.stringify(patch)});
  if(!r.ok){ const t=await r.text(); throw new Error('patch fac '+r.status+': '+t.substring(0,120)); }
}
async function reciDescontarFac(facNro,abonaOrig){
  const f=FACS.find(x=>(x.fac_nro||'').trim()===(facNro||'').trim()); if(!f) return;
  const nuevo=Math.max(0,round2((f.fac_saldo||0)-(abonaOrig||0)));
  await reciPatchFac(facNro,{fac_saldo:nuevo}); f.fac_saldo=nuevo;
}
async function reciRevertir(orig){
  const items=await sbGet('recibo_items',`recibo_id=eq.${orig.id}&order=id.asc`);
  for(const it of items){
    const f=FACS.find(x=>(x.fac_nro||'').trim()===(it.comprobante||'').trim());
    if(f){ const nuevo=round2((f.fac_saldo||0)+(it.abona_orig||0)); await reciPatchFac(it.comprobante,{fac_saldo:nuevo}); f.fac_saldo=nuevo; }
  }
}
async function reciBorrarHijos(reciboId){
  await sbDelete('recibo_items',{recibo_id:reciboId});
  await sbDelete('recibo_pagos',{recibo_id:reciboId});
  await sbDelete('cheques',{recibo_id:reciboId});
}

async function saveReci(){
  const hdr=_reciHdr;
  if(!hdr.cliente){ toast('Seleccioná un cliente','err'); return; }
  if(!hdr.talonario||!hdr.numero){ toast('Falta talonario / número','err'); return; }
  const items=_reciDeud.filter(d=>(d.abona||0)>0);
  const totAbonado=round2(items.reduce((s,d)=>s+(d.abona||0),0));
  if(totAbonado<=0){ toast('Cargá al menos un importe a abonar','err'); return; }
  if(Math.abs(reciTotInstrumentos()-totAbonado)>0.01){ toast('Los instrumentos no coinciden con lo abonado','err'); return; }
  try{
    if(_reciMode==='M' && _reciOrig){ await reciRevertir(_reciOrig); await reciBorrarHijos(_reciOrig.id); }
    const cab={ empresa:hdr.empresa, talonario:hdr.talonario, numero:hdr.numero, fecha:hdr.fecha,
      cliente:hdr.cliente, cot_casio:hdr.cotCasio||0, cot_tressa:hdr.cotTressa||0,
      total_abonado:totAbonado, anulado:false };
    let reciboId;
    if(_reciMode==='M' && _reciOrig){ await reciUpdateCabecera(_reciOrig.id,cab); reciboId=_reciOrig.id; }
    else {
      try { reciboId=await reciInsertCabecera(cab); }
      catch(e){
        const msg=String((e&&e.message)||'');
        if(/409|23505|duplicate|already exists/i.test(msg)){
          const sug=await reciSugerirNumero(hdr.empresa,hdr.talonario);
          toast(`El recibo Nº ${hdr.numero} ya existe (lo tomó otro usuario). Te sugiero el ${sug}: verificá y guardá de nuevo.`,'err');
          const numEl=document.getElementById('rf-num');
          if(numEl){ numEl.readOnly=false; numEl.value=sug; numEl.focus(); }
          _reciHdr.numero=sug;
          return;   // queda el modal abierto con todo cargado; el usuario reintenta
        }
        throw e;
      }
    }
    for(const d of items){
      await sbUpsert('recibo_items',{ recibo_id:reciboId, comprobante:d.fac_nro, fecha:d.fac_fec||null,
        moneda:d.fac_moneda||null, saldo_orig:round2(d.saldo_orig), cotizacion:Math.max(1,d.cotizacion),
        saldo:round2(d.saldo), abona:round2(d.abona), abona_orig:round2(d.abona_orig) });
      await reciDescontarFac(d.fac_nro,d.abona_orig);
    }
    const efe=reciParseNum(document.getElementById('rf-efectivo')?.value||'0');
    const aju=reciParseNum(document.getElementById('rf-ajuste')?.value||'0');
    if(efe>0) await sbUpsert('recibo_pagos',{recibo_id:reciboId,tipo:'efectivo',importe:round2(efe)});
    for(const t of _reciTransf) if((t.importe||0)>0) await sbUpsert('recibo_pagos',{recibo_id:reciboId,tipo:'transferencia',fecha:t.fecha||null,importe:round2(t.importe)});
    for(const r of _reciRetenc) if((r.importe||0)>0) await sbUpsert('recibo_pagos',{recibo_id:reciboId,tipo:'retencion',ret_codigo:r.codigo||null,importe:round2(r.importe)});
    if(Math.abs(aju)>0.001) await sbUpsert('recibo_pagos',{recibo_id:reciboId,tipo:'ajuste',importe:round2(aju)});
    for(const c of _reciCheques) if((c.importe||0)>0) await sbUpsert('cheques',{ recibo_id:reciboId,
      recibo_numero:hdr.numero, fecha_recibo:hdr.fecha, cliente:hdr.cliente, empresa:hdr.empresa,
      fecha:c.fecha||null, numero:c.numero||null, importe:round2(c.importe), fisico:!!c.fisico, propio:!!c.propio,
      fecha_salida:null, observaciones:null, estado:'cartera' });
    if(_reciMode==='A'){ const t=taloFind(hdr.empresa,hdr.talonario); await taloSetUltimo(hdr.empresa,hdr.talonario, Math.max(parseInt(hdr.numero)||0, t?Number(t.ultimo_nro)||0:0)); }
    closeOv('ov-reci');
    await sbLoadRecis(); await sbLoadReciItems(); reciSelIdx=null; renderReci();
    toast(_reciMode==='A'?'Recibo dado de alta':'Recibo modificado','scs');
  }catch(e){ console.error('saveReci:',e); toast('Error al guardar el recibo','err'); }
}

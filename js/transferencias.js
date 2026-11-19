/* ===========================================================================
   TRANSFERENCIAS DE CLIENTES  (Cobranzas → Transferencias de Clientes)
   Ricardo, Nov 2026. Misma mecánica que Gastos Generales:
   - Grilla con TODOS los registros ordenados por fecha, parada en el 1er
     registro del mes en curso (o el anterior). Buscador por fecha.
   - Se edita en la misma grilla; cada renglón se graba al salir de él.
   - "＋ Alta" agrega un renglón al final en azul oscuro.
   - Cuenta bancaria: de la tabla Cuentas Bancarias.
   - Cliente: del maestro, por código o razón social; puede quedar sin definir.
   =========================================================================== */
let _trf = [];
let _trfSel = null;

function _tEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _tFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _tHoy(){ const t=new Date(); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; }
function _tMes(){ return _tHoy().substring(0,8)+'01'; }
function _tFechaTxt(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }
function _tPuede(acc){ return (typeof puedeh!=='function') || puedeh('trf',acc); }
const _tOrden=(a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||'')) || (Number(a.id)||0)-(Number(b.id)||0);
function _tNuevo(){ return { id:null, fecha:_tHoy(), cuenta:'', descripcion:'', origen:'', importe:0, depositante:'', cliente:'', _nuevo:true }; }

// Cliente: se muestra "COD — RAZÓN"; se acepta código, razón social o la opción de la lista
function _tCliTxt(cod){
  const k=String(cod||'').trim(); if(!k) return '';
  const c=(CLIS||[]).find(x=>String(x.CLI_CODIGO||'').trim()===k);
  return c ? `${k} — ${c.CLI_RAZON||''}` : k;
}
function _tCliCod(txt){
  const t=String(txt||'').trim(); if(!t) return '';
  const cod=t.split(' — ')[0].trim();
  let c=(CLIS||[]).find(x=>String(x.CLI_CODIGO||'').trim().toUpperCase()===cod.toUpperCase());
  if(!c) c=(CLIS||[]).find(x=>String(x.CLI_RAZON||'').trim().toUpperCase()===t.toUpperCase());
  return c ? String(c.CLI_CODIGO).trim() : null;   // null = no existe
}
function _tCtaOpts(val){
  const L=(TABLAS['CTAB']||[]);
  const ex=!val || L.some(x=>x.CODIGO===val);
  const emp=e=>e==='T'?'Tressa':(e==='H'?'Hatsu':e||'');
  return '<option value=""></option>'
    + (ex?'':`<option value="${_tEsc(val)}" selected>${_tEsc(val)} — ⚠ no existe</option>`)
    + L.map(x=>`<option value="${_tEsc(x.CODIGO)}"${x.CODIGO===val?' selected':''}>${_tEsc(x.CODIGO)} — ${_tEsc((typeof _tabBancoDesc==='function'?_tabBancoDesc(x.STRING1):x.STRING1)||'')} ${_tEsc(x.DETALLE)} (${emp(x.STRING2)})</option>`).join('');
}

function renderTransferencias(){
  _tStyle();
  const dl=document.getElementById('trf-cli-list');
  if(dl && !dl.childElementCount) dl.innerHTML=(CLIS||[]).map(c=>`<option value="${_tEsc(String(c.CLI_CODIGO||'').trim())} — ${_tEsc(c.CLI_RAZON||'')}">`).join('');
  const df=document.getElementById('trf-f-cli-list');
  if(df && !df.childElementCount) df.innerHTML='<option value="(SIN DEFINIR)">'+(CLIS||[]).map(c=>`<option value="${_tEsc(String(c.CLI_CODIGO||'').trim())} — ${_tEsc(c.CLI_RAZON||'')}">`).join('');
  trfConsultar();
}

async function trfConsultar(){
  const body=document.getElementById('trf-body'); if(!body) return;
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Cargando…</div>';
  try{
    if(typeof sgvTablaFresca==='function') await sgvTablaFresca('CTAB');
    const r=await apiGet('/transferencias');
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_tEsc(r.error||'Error')+'</div>'; return; }
    _trf=(r.transferencias||[]).slice().sort(_tOrden);
    _trfSel=null;
    sgvVigilarBase('page-trf');
    const fc=document.getElementById('trf-f-cta');
    if(fc){ const v=fc.value; fc.innerHTML='<option value="">Todas las cuentas</option>'+(TABLAS['CTAB']||[]).map(x=>`<option value="${_tEsc(x.CODIGO)}">${_tEsc(x.CODIGO)} — ${_tEsc(x.DETALLE)}</option>`).join(''); fc.value=v; }
    _tPintar();
    _tPosicionar(_tMes(), true);
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_tEsc(e.message||'Error')+'</div>'; }
}

function _tFila(g,i){
  const editable = g._nuevo ? _tPuede('alta') : _tPuede('modif');
  const dis = editable ? '' : ' disabled';
  const sel = _trfSel===i ? ' sel' : '';
  return `<div class="t-row${sel}${g._nuevo?' t-nuevo':''}" data-i="${i}" onmousedown="trfSel(${i})">
    <input type="date" class="finp t-in" data-f="fecha" value="${_tEsc(g.fecha||'')}"${dis}>
    <select class="finp t-in" data-f="cuenta"${dis}>${_tCtaOpts(g.cuenta)}</select>
    <input class="finp t-in" data-f="descripcion" value="${_tEsc(g.descripcion||'')}" maxlength="120"${dis}>
    <input class="finp t-in" data-f="origen" value="${_tEsc(g.origen||'')}" maxlength="120"${dis}>
    <input class="finp t-in t-imp" data-f="importe" inputmode="decimal" value="${g.importe?_tFmt(g.importe):''}" placeholder="0,00"${dis}>
    <input class="finp t-in" data-f="depositante" value="${_tEsc(g.depositante||'')}" maxlength="120"${dis}>
    <input class="finp t-in" data-f="cliente" list="trf-cli-list" value="${_tEsc(_tCliTxt(g.cliente))}" placeholder="sin definir"${dis}>
    <span class="t-usr" title="${_tEsc(g.modificado?'Modificado '+String(g.modificado).substring(0,16).replace('T',' '):(g.creado?'Cargado '+String(g.creado).substring(0,16).replace('T',' '):''))}">${_tEsc(g.usuario||'')}</span>
    <span class="t-st">${_tEstHtml(g)}</span>
  </div>`;
}
function _tEstHtml(g){
  return g._st==='guardando' ? '<span title="Grabando…">⏳</span>'
    : g._st==='ok' ? '<span title="Grabado" style="color:var(--grn)">✓</span>'
    : g._st==='error' ? `<span title="${_tEsc(g._err||'Error')}" style="color:var(--red);cursor:help">⚠</span>`
    : g._nuevo ? '<span title="Renglón nuevo">＋</span>' : '';
}
function _tEstado(i){ const el=document.querySelector(`#trf-body .t-row[data-i="${i}"] .t-st`); if(el) el.innerHTML=_tEstHtml(_trf[i]); }

function _tPintar(){
  const body=document.getElementById('trf-body'); if(!body) return;
  if(!_trf.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin transferencias · tocá ＋ Alta para cargar una</div>'; return; }
  _tFiltrosCant();
  const vis=_trf.map((g,i)=>[g,i]).filter(([g])=>_tPasaFiltro(g));
  if(!vis.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Ninguna transferencia con esos filtros</div>'; return; }
  body.innerHTML=vis.map(([g,i])=>_tFila(g,i)).join('');
  body.querySelectorAll('.t-row').forEach(row=>{
    row.addEventListener('focusout', e=>{ if(e.relatedTarget && row.contains(e.relatedTarget)) return; _tSalirFila(+row.dataset.i); });
    row.querySelectorAll('.t-in').forEach(inp=>{
      inp.addEventListener('input', ()=>_tCambio(+row.dataset.i, inp));
      inp.addEventListener('change',()=>_tCambio(+row.dataset.i, inp));
      inp.addEventListener('focus', ()=>{ if(inp.tagName==='INPUT' && inp.type!=='date') inp.select(); });
      inp.addEventListener('keydown', e=>{
        if(e.key!=='Enter') return; e.preventDefault();
        const ins=[...row.querySelectorAll('.t-in:not([disabled])')]; const k=ins.indexOf(inp);
        if(k<ins.length-1) ins[k+1].focus(); else inp.blur();
      });
    });
  });
}
function _tCambio(i, inp){
  const g=_trf[i]; if(!g) return;
  const f=inp.dataset.f;
  if(f==='importe') g.importe=sgvParseNum(inp.value);
  else if(f==='cliente') g._cliTxt=inp.value;
  else g[f]=inp.value;
  g._dirty=true;
  if(g._st==='ok'||g._st==='error'){ g._st=null; _tEstado(i); }
}
async function _tSalirFila(i){
  const g=_trf[i]; if(!g || !g._dirty) return;
  if(g._nuevo && !g.cuenta && !g.importe && !(g.descripcion||'').trim() && !(g.origen||'').trim() && !(g.depositante||'').trim() && !(g._cliTxt||'').trim()){ g._dirty=false; return; }
  if(g._cliTxt!==undefined){
    const c=_tCliCod(g._cliTxt);
    if(c===null){ g._st='error'; g._err='El cliente no existe: elegilo de la lista o dejalo vacío'; _tEstado(i); return; }
    g.cliente=c;
  }
  const falta = !g.fecha?'la fecha' : !g.cuenta?'la cuenta bancaria' : !g.importe?'el importe' : '';
  if(falta){ g._st='error'; g._err='Falta '+falta; _tEstado(i); return; }
  g._st='guardando'; _tEstado(i);
  try{
    const res=await apiPost('/transferencias/guardar',{ id:g.id||undefined, fecha:g.fecha, cuenta:g.cuenta, descripcion:g.descripcion,
      origen:g.origen, importe:g.importe, depositante:g.depositante, cliente:g.cliente||'' });
    if(!res || res.ok===false){ g._st='error'; g._err=(res&&res.error)||'No se pudo grabar'; _tEstado(i); return; }
    Object.assign(g, res.transferencia||{}); delete g._cliTxt;
    g._dirty=false; g._st='ok';
    if(g._nuevo){ delete g._nuevo; document.querySelector(`#trf-body .t-row[data-i="${i}"]`)?.classList.remove('t-nuevo'); }
    const u=document.querySelector(`#trf-body .t-row[data-i="${i}"] .t-usr`); if(u) u.textContent=g.usuario||'';
    _tEstado(i);
  }catch(e){ g._st='error'; g._err=e.message; _tEstado(i); }
}

function trfSel(i){
  if(_trfSel===i) return;
  document.querySelectorAll('#trf-body .t-row.sel').forEach(r=>r.classList.remove('sel'));
  _trfSel=i;
  document.querySelector(`#trf-body .t-row[data-i="${i}"]`)?.classList.add('sel');
}
function _tPosicionar(fecha, arriba){
  if(!_trf.length) return -1;
  let i=_trf.findIndex(g=>!g._nuevo && String(g.fecha||'')>=fecha);
  if(i<0 || String(_trf[i].fecha||'').substring(0,10)!==fecha){
    let j=-1; _trf.forEach((g,k)=>{ if(!g._nuevo && String(g.fecha||'')<fecha) j=k; });
    if(j>=0) i=j; else if(i<0) i=_trf.length-1;
  }
  trfSel(i);
  document.querySelector(`#trf-body .t-row[data-i="${i}"]`)?.scrollIntoView({block: arriba?'start':'center'});
  return i;
}
function trfIrFecha(val){
  const inp=document.getElementById('trf-fecha'); if(inp) inp.value='';
  if(!val) return;
  const i=_tPosicionar(val,false);
  if(i>=0 && String(_trf[i].fecha||'').substring(0,10)!==val) toast(`No hay transferencias del ${_tFechaTxt(val)}: fui a la anterior (${_tFechaTxt(_trf[i].fecha)})`);
}
function trfAlta(){
  if(!_tPuede('alta')){ toast('Sin permiso para cargar transferencias','err'); return; }
  let i=_trf.findIndex(g=>g._nuevo && !g._dirty);
  if(i<0){ _trf.push(_tNuevo()); i=_trf.length-1; }
  _trfSel=i; _tPintar();
  const row=document.querySelector(`#trf-body .t-row[data-i="${i}"]`);
  row?.scrollIntoView({block:'nearest'});
  row?.querySelector('.t-in[data-f="cuenta"]')?.focus();
}
async function trfBorrar(){
  if(!_tPuede('baja')){ toast('Sin permiso para borrar transferencias','err'); return; }
  const g=_trf[_trfSel];
  if(!g || g._nuevo || !g.id){ toast('Seleccioná una transferencia para borrar','err'); return; }
  if(!confirm(`¿Borrar la transferencia del ${_tFechaTxt(g.fecha)} por $ ${_tFmt(g.importe)}?${g.depositante?'\n'+g.depositante:''}`)) return;
  try{
    const res=await apiPost('/transferencias/borrar',{ id:g.id });
    if(!res || res.ok===false){ toast((res&&res.error)||'No se pudo borrar','err'); return; }
    _trf.splice(_trfSel,1); _trfSel=null; _tPintar(); toast('Transferencia borrada','scs');
  }catch(e){ toast('Error al borrar: '+e.message,'err'); }
}

function _tStyle(){
  if(document.getElementById('trf-style')) return;
  const st=document.createElement('style'); st.id='trf-style';
  st.textContent=`
    #trf-head,.t-row{display:grid;grid-template-columns:135px 220px minmax(130px,1.2fr) minmax(100px,1fr) 120px minmax(120px,1fr) minmax(190px,1.3fr) 80px 24px;gap:6px;align-items:center;padding:3px 10px}
    #trf-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3;padding:7px 10px}
    #trf-head .r,.t-imp{text-align:right}
    .t-row{border-bottom:1px solid var(--b1)}
    .t-row.sel{background:var(--s3);box-shadow:inset 3px 0 0 var(--acc)}
    .t-in{height:28px;font-size:13px;padding:2px 6px;width:100%;min-width:0}
    .t-imp{font-family:var(--mono)}
    .t-st{text-align:center;font-size:14px}
    .t-usr{font-size:11px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .t-row.t-nuevo .t-usr{color:#c7d2fe}
    .t-row.t-nuevo{background:#1e3a8a;box-shadow:inset 4px 0 0 #fbbf24}
    .t-row.t-nuevo .t-in{background:#1e3a8a;color:#fff;font-weight:700;border-color:#4f6fc4}
    .t-row.t-nuevo .t-in::placeholder{color:#c7d2fe;font-weight:400}
    .t-row.t-nuevo .t-in:focus{background:#24449e;border-color:#fbbf24;outline:none}
    .t-row.t-nuevo select.t-in option{background:#fff;color:#111;font-weight:400}
    .t-row.t-nuevo input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1)}
    .t-row.t-nuevo .t-st{color:#fff}
  `;
  document.head.appendChild(st);
}

// ── Filtros generales (Ricardo, Nov 2026). Cliente acepta "(SIN DEFINIR)". ──
function _tFVal(id){ return (document.getElementById(id)?.value||'').trim(); }
function _tPasaFiltro(g){
  if(g._nuevo) return true;                         // el renglón que se está cargando siempre se ve
  const d=_tFVal('trf-f-desde'), h=_tFVal('trf-f-hasta'), c=_tFVal('trf-f-cta'), cl=_tFVal('trf-f-cli'), t=_tFVal('trf-f-txt').toUpperCase();
  const f=String(g.fecha||'').substring(0,10);
  if(d && f<d) return false;
  if(h && f>h) return false;
  if(c && g.cuenta!==c) return false;
  if(cl){
    if(cl.toUpperCase()==='(SIN DEFINIR)'){ if(String(g.cliente||'').trim()) return false; }
    else { const cod=_tCliCod(cl); if(cod===null){ const q=cl.toUpperCase(); if(!_tCliTxt(g.cliente).toUpperCase().includes(q)) return false; } else if(String(g.cliente||'').trim()!==cod) return false; }
  }
  if(t && ![g.depositante,g.origen,g.descripcion].some(x=>String(x||'').toUpperCase().includes(t))) return false;
  return true;
}
function _tFiltrosCant(){ if(typeof tbFiltrosCant==='function') tbFiltrosCant('trf-fbtn',['trf-f-desde','trf-f-hasta','trf-f-cta','trf-f-cli','trf-f-txt']); }
function trfFiltrar(){ _trfSel=null; _tPintar(); }
let _tDem=null;
function trfFiltrarDem(){ clearTimeout(_tDem); _tDem=setTimeout(trfFiltrar,300); }
function trfLimpiarFiltros(){ ['trf-f-desde','trf-f-hasta','trf-f-cta','trf-f-cli','trf-f-txt'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; }); trfFiltrar(); _tPosicionar(_tMes(),true); }

// ── Se actualiza sola si otro usuario carga o modifica (regla general) ──
async function trfActualizar(){
  const body=document.getElementById('trf-body'); const top=body?body.scrollTop:0;
  const selId=(_trfSel!==null && _trf[_trfSel]) ? _trf[_trfSel].id : null;
  const r=await apiGet('/transferencias'); if(!r || !r.ok) return;
  const nuevos=_trf.filter(g=>g._nuevo);          // lo que se está cargando no se pierde
  _trf=(r.transferencias||[]).slice().sort(_tOrden).concat(nuevos);
  _trfSel = selId ? _trf.findIndex(g=>g.id===selId) : null; if(_trfSel<0) _trfSel=null;
  _tPintar(); if(body) body.scrollTop=top;
}
sgvVigilar('page-trf', { segs:['transferencias'],
  editando:()=>_trf.some(g=>g._dirty) || !!document.activeElement?.closest?.('#trf-body'),
  actualizar: trfActualizar });

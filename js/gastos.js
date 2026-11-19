/* ===========================================================================
   GASTOS GENERALES  (Compras → Gastos Generales)
   - Comunes a las dos empresas: los agrupa el CENTRO DE COSTOS.
   - Se editan EN LA MISMA GRILLA: cada celda es un campo. Al salir de un
     renglón modificado se graba solo (alta si es nuevo, modificación si no).
   - La grilla muestra desde el día 1 del mes en curso, ordenada por fecha.
   - "＋ Alta" agrega un renglón nuevo al final, en otro color.
   - "Resumen" tiene los parámetros (período, centro, concepto, agrupar).
   - "Duplicar" copia el renglón seleccionado con la fecha de hoy y deja el
     cursor en el importe, que es lo que suele cambiar.
   =========================================================================== */

let _gastos = [];          // renglones en pantalla (el [0] es siempre el nuevo)
let _gastoSel = null;      // índice del renglón seleccionado
let _gastoTotal = 0;

function _gEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _gFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _gNum(v){ return sgvParseNum(v); }
function _gHoy(){ return new Date().toISOString().substring(0,10); }
function _gFechaTxt(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
function _gPuede(acc){ return (typeof puedeh!=='function') || puedeh('gast',acc); }
function _gTabla(k){ return ((typeof TABLAS!=='undefined' && TABLAS[k])||[]); }
function _gDesc(k,cod){ const r=_gTabla(k).find(x=>x.CODIGO===cod); return r?r.DETALLE:''; }

function _gNuevo(){ return { id:null, fecha:_gHoy(), ccos:'', concepto:'', importe:0, detalle:'', _nuevo:true }; }

// La GRILLA muestra los gastos desde el día 1 del mes en curso, ordenados por
// fecha. Los parámetros (período, centro, concepto) van en "Resumen"
// (Ricardo, Nov 2026).
function _gDesdeMes(){ const t=new Date(); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
const _gOrden=(a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||'')) || (Number(a.id)||0)-(Number(b.id)||0);

function renderGastos(){
  _gStyle();
  gastConsultar();
}

async function gastConsultar(){
  const body=document.getElementById('gast-body'); if(!body) return;
  const desde=_gDesdeMes();
  const dt=document.getElementById('gast-desde-txt'); if(dt) dt.textContent=_gFechaTxt(desde);
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Cargando…</div>';
  try{
    const r=await apiGet('/gastos?desde='+desde);
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_gEsc(r.error||'Error')+'</div>'; return; }
    _gastos=(r.gastos||[]).slice().sort(_gOrden);
    _gastoSel=null;
    _gPintar();
    const w=document.getElementById('gast-body'); if(w) w.scrollTop=w.scrollHeight;   // lo último a la vista
  }catch(e){
    body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_gEsc(e.message||'Error')+'</div>';
  }
}

// ALTA: agrega un renglón nuevo al final (en otro color) y pone el cursor ahí
function gastAlta(){
  if(!_gPuede('alta')){ toast('Sin permiso para cargar gastos','err'); return; }
  const vacio=_gastos.findIndex(g=>g._nuevo && !g._dirty);
  if(vacio<0) _gastos.push(_gNuevo());
  const i = vacio<0 ? _gastos.length-1 : vacio;
  _gastoSel=i; _gPintar();
  const row=document.querySelector(`#gast-body .g-row[data-i="${i}"]`);
  row?.scrollIntoView({block:'nearest'});
  row?.querySelector('.g-in[data-f="ccos"]')?.focus();
}

// Opciones de un select de tabla, con el valor elegido marcado
// Si el código no existe en la tabla (p. ej. vino del DOS) igual se muestra,
// en rojo y marcado, para poder verlo y corregirlo (Ricardo, Oct 2026)
function _gOpts(k,val){
  const L=_gTabla(k), existe=!val || L.some(x=>x.CODIGO===val);
  return '<option value=""></option>'
    + (existe ? '' : `<option value="${_gEsc(val)}" selected style="color:#c00">${_gEsc(val)} — ⚠ no existe</option>`)
    + L.map(x=>`<option value="${_gEsc(x.CODIGO)}"${x.CODIGO===val?' selected':''}>${_gEsc(x.CODIGO)} — ${_gEsc(x.DETALLE)}</option>`).join('');
}

function _gFila(g,i){
  const editable = g._nuevo ? _gPuede('alta') : _gPuede('modif');
  const dis = editable ? '' : ' disabled';
  const sel = _gastoSel===i ? ' sel' : '';
  const est = g._st==='guardando' ? '<span title="Grabando…">⏳</span>'
            : g._st==='ok'        ? '<span title="Grabado" style="color:var(--grn)">✓</span>'
            : g._st==='error'     ? `<span title="${_gEsc(g._err||'Error')}" style="color:var(--red);cursor:help">⚠</span>`
            : g._nuevo            ? '<span title="Renglón nuevo" style="color:var(--t3)">＋</span>' : '';
  return `<div class="g-row${sel}${g._nuevo?' g-nuevo':''}" data-i="${i}" onmousedown="gastSel(${i})">
    <input type="date" class="finp g-in" data-f="fecha" value="${_gEsc(g.fecha||'')}"${dis}>
    <select class="finp g-in" data-f="ccos"${dis}>${_gOpts('CCOS',g.ccos)}</select>
    <select class="finp g-in" data-f="concepto"${dis}>${_gOpts('CGAS',g.concepto)}</select>
    <input class="finp g-in g-imp" data-f="importe" value="${g.importe?_gFmt(g.importe):''}" placeholder="0,00"${dis}>
    <input class="finp g-in" data-f="detalle" value="${_gEsc(g.detalle||'')}" placeholder="${g._nuevo?'Nuevo gasto…':''}"${dis}>
    <span class="g-st">${est}</span>
  </div>`;
}

function _gPintar(){
  const body=document.getElementById('gast-body'); if(!body) return;
  if(!_gastos.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin gastos este mes · tocá ＋ Alta para cargar uno</div>'; _gTotales(); return; }
  body.innerHTML=_gastos.map(_gFila).join('');
  // Cada renglón se graba al SALIR de él (no en cada tecla)
  body.querySelectorAll('.g-row').forEach(row=>{
    row.addEventListener('focusout', e=>{
      if(e.relatedTarget && row.contains(e.relatedTarget)) return;   // sigue en el mismo renglón
      _gSalirFila(+row.dataset.i);
    });
    row.querySelectorAll('.g-in').forEach(inp=>{
      inp.addEventListener('input', ()=>_gCambio(+row.dataset.i, inp));
      inp.addEventListener('change',()=>_gCambio(+row.dataset.i, inp));
      inp.addEventListener('focus', ()=>{ if(inp.tagName==='INPUT' && inp.type!=='date') inp.select(); });
      inp.addEventListener('keydown', e=>_gTecla(e, row, inp));
    });
    const imp=row.querySelector('.g-imp');
    if(imp) imp.addEventListener('blur',()=>{ const n=_gNum(imp.value); imp.value=n?_gFmt(n):''; });
  });
  _gTotales();
}

function _gCambio(i, inp){
  const g=_gastos[i]; if(!g) return;
  const f=inp.dataset.f;
  g[f] = f==='importe' ? _gNum(inp.value) : inp.value;
  g._dirty=true;
  if(g._st==='ok'||g._st==='error'){ g._st=null; _gEstado(i); }
}

// Enter pasa al campo siguiente; en el último, al renglón de abajo
function _gTecla(e, row, inp){
  if(e.key!=='Enter') return;
  e.preventDefault();
  const ins=[...row.querySelectorAll('.g-in:not([disabled])')];
  const k=ins.indexOf(inp);
  if(k<ins.length-1){ ins[k+1].focus(); return; }
  const next=row.nextElementSibling?.querySelector('.g-in:not([disabled])');
  if(next) next.focus(); else inp.blur();
}

function _gEstado(i){
  const row=document.querySelector(`#gast-body .g-row[data-i="${i}"] .g-st`);
  if(!row) return;
  const g=_gastos[i];
  row.innerHTML = g._st==='guardando' ? '<span title="Grabando…">⏳</span>'
    : g._st==='ok' ? '<span title="Grabado" style="color:var(--grn)">✓</span>'
    : g._st==='error' ? `<span title="${_gEsc(g._err||'Error')}" style="color:var(--red);cursor:help">⚠</span>`
    : g._nuevo ? '<span title="Renglón nuevo" style="color:var(--t3)">＋</span>' : '';
}

async function _gSalirFila(i){
  const g=_gastos[i]; if(!g || !g._dirty) return;
  // Un renglón nuevo que quedó vacío no se graba ni molesta
  if(g._nuevo && !g.ccos && !g.concepto && !g.importe && !(g.detalle||'').trim()) { g._dirty=false; return; }
  const falta = !g.fecha?'la fecha' : !g.ccos?'el centro de costos' : !g.concepto?'el concepto' : !g.importe?'el importe' : '';
  if(falta){ g._st='error'; g._err='Falta '+falta; _gEstado(i); return; }

  g._st='guardando'; _gEstado(i);
  try{
    const res=await apiPost('/gastos/guardar',{ id:g.id||undefined, fecha:g.fecha, ccos:g.ccos,
      concepto:g.concepto, importe:g.importe, detalle:g.detalle });
    if(!res || res.ok===false){ g._st='error'; g._err=(res&&res.error)||'No se pudo grabar'; _gEstado(i); return; }
    Object.assign(g, res.gasto||{});
    g._dirty=false; g._st='ok';
    if(g._nuevo){
      // Se grabó el renglón nuevo: pasa a ser uno más (deja el color de "nuevo")
      delete g._nuevo;
      document.querySelector(`#gast-body .g-row[data-i="${i}"]`)?.classList.remove('g-nuevo');
      _gEstado(i); _gTotales();
    } else { _gEstado(i); _gTotales(); }
  }catch(e){ g._st='error'; g._err=e.message; _gEstado(i); }
}

function gastSel(i){
  if(_gastoSel===i) return;
  document.querySelectorAll('#gast-body .g-row.sel').forEach(r=>r.classList.remove('sel'));
  _gastoSel=i;
  document.querySelector(`#gast-body .g-row[data-i="${i}"]`)?.classList.add('sel');
}

// DUPLICAR: copia el seleccionado como renglón nuevo, con la fecha de hoy, y
// deja el cursor en el importe. Se graba al salir del renglón, como cualquier alta.
function gastDuplicar(){
  if(!_gPuede('alta')){ toast('Sin permiso para cargar gastos','err'); return; }
  const g=_gastos[_gastoSel];
  if(!g || g._nuevo){ toast('Seleccioná un gasto para duplicar','err'); return; }
  const nuevo={ id:null, fecha:_gHoy(), ccos:g.ccos, concepto:g.concepto, importe:g.importe,
                detalle:g.detalle, _nuevo:true, _dirty:true, _dup:true };
  // Va al final, como un alta; reemplaza un renglón nuevo vacío si había
  const vacio=_gastos.findIndex(x=>x._nuevo && !x._dirty);
  if(vacio>=0) _gastos.splice(vacio,1);
  _gastos.push(nuevo);
  const i=_gastos.length-1;
  _gastoSel=i;
  _gPintar();
  const row=document.querySelector(`#gast-body .g-row[data-i="${i}"]`);
  row?.scrollIntoView({block:'nearest'});
  const imp=row?.querySelector('.g-imp');
  if(imp){ imp.focus(); imp.select(); }
}

async function gastBorrar(){
  if(!_gPuede('baja')){ toast('Sin permiso para borrar gastos','err'); return; }
  const g=_gastos[_gastoSel];
  if(!g || g._nuevo || !g.id){ toast('Seleccioná un gasto para borrar','err'); return; }
  if(!confirm(`¿Borrar el gasto del ${_gFechaTxt(g.fecha)}?\n\n${g.ccos} · ${_gDesc('CGAS',g.concepto)||g.concepto}\n$ ${_gFmt(g.importe)}${g.detalle?'\n'+g.detalle:''}`)) return;
  try{
    const res=await apiPost('/gastos/borrar',{ id:g.id });
    if(!res || res.ok===false){ toast((res&&res.error)||'No se pudo borrar','err'); return; }
    _gastos.splice(_gastoSel,1); _gastoSel=null;
    _gPintar(); toast('Gasto borrado','scs');
  }catch(e){ toast('Error al borrar: '+e.message,'err'); }
}

function _gTotales(){
  _gastoTotal=_gastos.filter(g=>!g._nuevo).reduce((a,g)=>a+(Number(g.importe)||0),0);
  const t=document.getElementById('gast-total'); if(t) t.textContent='$ '+_gFmt(_gastoTotal);
  const c=document.getElementById('gast-count'); if(c) c.textContent=_gastos.filter(g=>!g._nuevo).length;
}

/* ─────────── RESUMEN (Ricardo, Nov 2026) ───────────
   Acá van todos los parámetros: período, centro, concepto y cómo agrupar.
   Los datos se piden al SERVER cada vez. Con Imprimir y Excel. */
let _gRes=null;
function gastResumen(){
  document.getElementById('gres-ov')?.remove();
  const ov=document.createElement('div'); ov.id='gres-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  const opt=k=>_gTabla(k).map(x=>`<option value="${_gEsc(x.CODIGO)}">${_gEsc(x.CODIGO)} — ${_gEsc(x.DETALLE)}</option>`).join('');
  ov.innerHTML=`<div style="background:var(--s1);border-radius:12px;width:100%;max-width:1000px;height:86vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--b1)">
      <span style="font-weight:600;color:var(--acc)">📊 Resumen de Gastos Generales</span>
      <span style="display:flex;gap:6px"><button class="btn" onclick="gastResPrint()">🖨 Imprimir</button>
        <button class="btn" onclick="gastResExcel()">⬇ Excel</button>
        <button class="btn" onclick="document.getElementById('gres-ov').remove()">✕</button></span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;padding:10px 16px;border-bottom:1px solid var(--b1)">
      <div class="fgrp"><label class="flbl2">Desde</label><input class="finp" id="gres-desde" type="date" value="${_gDesdeMes()}"></div>
      <div class="fgrp"><label class="flbl2">Hasta</label><input class="finp" id="gres-hasta" type="date" value="${_gHoy()}"></div>
      <div class="fgrp"><label class="flbl2">Centro de costos</label><select class="finp" id="gres-ccos" style="width:190px"><option value="">Todos los centros</option>${opt('CCOS')}</select></div>
      <div class="fgrp"><label class="flbl2">Concepto</label><select class="finp" id="gres-conc" style="width:190px"><option value="">Todos los conceptos</option>${opt('CGAS')}</select></div>
      <div class="fgrp"><label class="flbl2">Agrupar por</label><select class="finp" id="gres-agr">
        <option value="ccos">Centro de costos</option><option value="concepto">Concepto</option>
        <option value="ccos-concepto">Centro y concepto</option><option value="mes">Mes</option><option value="">Sin agrupar (detalle)</option></select></div>
      <button class="btn pri" onclick="gastResConsultar()">🔍 Ver</button>
    </div>
    <div id="gres-body" style="flex:1;overflow:auto;padding:0 0 10px"><div class="empty" style="margin-top:30px">Elegí los parámetros y tocá Ver</div></div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  ov.addEventListener('keydown',e=>{ if(e.key==='Escape') ov.remove(); });
}
function _gResClave(x, agr){
  const cc=`${x.ccos} ${_gDesc('CCOS',x.ccos)}`.trim(), co=`${x.concepto} ${_gDesc('CGAS',x.concepto)}`.trim();
  if(agr==='ccos') return [cc];
  if(agr==='concepto') return [co];
  if(agr==='ccos-concepto') return [cc, co];
  if(agr==='mes'){ const p=String(x.fecha||'').substring(0,7).split('-'); return [p.length===2?`${p[1]}/${p[0]}`:'—']; }
  return [];
}
async function gastResConsultar(){
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const body=document.getElementById('gres-body'); if(!body) return;
  const qs=[];
  if(g('gres-desde')) qs.push('desde='+g('gres-desde'));
  if(g('gres-hasta')) qs.push('hasta='+g('gres-hasta'));
  if(g('gres-ccos'))  qs.push('ccos='+encodeURIComponent(g('gres-ccos')));
  if(g('gres-conc'))  qs.push('concepto='+encodeURIComponent(g('gres-conc')));
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Calculando…</div>';
  try{
    const r=await apiGet('/gastos'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok) throw new Error(r.error||'Error');
    const agr=g('gres-agr');
    const lista=(r.gastos||[]).slice().sort(_gOrden);
    // grupos (1 o 2 niveles) con subtotales
    const grupos=new Map();
    lista.forEach(x=>{
      const k=_gResClave(x,agr), k1=k[0]||'', k2=k[1]||'';
      if(!grupos.has(k1)) grupos.set(k1,{tot:0,cant:0,sub:new Map(),items:[]});
      const G=grupos.get(k1); G.tot+=Number(x.importe)||0; G.cant++; G.items.push(x);
      if(k2){ if(!G.sub.has(k2)) G.sub.set(k2,{tot:0,cant:0}); const S=G.sub.get(k2); S.tot+=Number(x.importe)||0; S.cant++; }
    });
    const tot=lista.reduce((a,x)=>a+(Number(x.importe)||0),0);
    _gRes={ agr, lista, grupos, tot, desde:g('gres-desde'), hasta:g('gres-hasta'),
      ccos:g('gres-ccos'), conc:g('gres-conc'), agrTxt:document.getElementById('gres-agr').selectedOptions[0].text };
    _gResPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_gEsc(e.message)+'</div>'; }
}
function _gResPintar(){
  const R=_gRes, body=document.getElementById('gres-body'); if(!R||!body) return;
  if(!R.lista.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin gastos con esos parámetros</div>'; return; }
  const row=(a,b,c,st)=>`<div style="display:grid;grid-template-columns:minmax(0,1fr) 70px 150px;gap:8px;padding:6px 16px;border-bottom:1px solid var(--b1);font-size:13px;${st||''}"><span>${a}</span><span style="text-align:right;color:var(--t2)">${b}</span><span style="text-align:right;font-family:var(--mono)">${c}</span></div>`;
  let h=`<div style="display:grid;grid-template-columns:minmax(0,1fr) 70px 150px;gap:8px;padding:7px 16px;background:var(--s2);font-size:11px;color:var(--t2);position:sticky;top:0"><span>${R.agr?_gEsc(R.agrTxt):'Gasto'}</span><span style="text-align:right">Cant.</span><span style="text-align:right">Importe</span></div>`;
  if(!R.agr){
    h+=R.lista.map(x=>row(`<span style="font-family:var(--mono);color:var(--t2)">${_gFechaTxt(x.fecha)}</span> · ${_gEsc(x.ccos)} · ${_gEsc(_gDesc('CGAS',x.concepto)||x.concepto)}${x.detalle?' · <span style="color:var(--t2)">'+_gEsc(x.detalle)+'</span>':''}`,'',_gFmt(x.importe))).join('');
  } else {
    [...R.grupos.entries()].sort((a,b)=>R.agr==='mes'?0:b[1].tot-a[1].tot).forEach(([k,G])=>{
      h+=row(`<b>${_gEsc(k)}</b>`,G.cant,`<b>${_gFmt(G.tot)}</b>`, R.agr==='ccos-concepto'?'background:var(--s2)':'');
      if(R.agr==='ccos-concepto') [...G.sub.entries()].sort((a,b)=>b[1].tot-a[1].tot).forEach(([k2,S])=>{ h+=row(`<span style="padding-left:18px">${_gEsc(k2)}</span>`,S.cant,_gFmt(S.tot)); });
    });
  }
  h+=row('<b>TOTAL</b>',R.lista.length,`<b>${_gFmt(R.tot)}</b>`,'border-top:2px solid var(--acc);background:var(--s2)');
  body.innerHTML=h;
}
function _gResSub(){
  const R=_gRes;
  return `Período ${_gFechaTxt(R.desde)||'inicio'} a ${_gFechaTxt(R.hasta)||'hoy'}`
    + (R.ccos?` · Centro ${R.ccos} ${_gDesc('CCOS',R.ccos)}`:'') + (R.conc?` · Concepto ${R.conc} ${_gDesc('CGAS',R.conc)}`:'')
    + (R.agr?` · Agrupado por ${R.agrTxt.toLowerCase()}`:'');
}
function gastResPrint(){
  const R=_gRes; if(!R||!R.lista.length){ toast('Tocá Ver primero','err'); return; }
  let tb='';
  if(!R.agr){
    tb=R.lista.map(x=>`<tr><td>${_gFechaTxt(x.fecha)}</td><td>${_gEsc(x.ccos)} ${_gEsc(_gDesc('CCOS',x.ccos))}</td><td>${_gEsc(x.concepto)} ${_gEsc(_gDesc('CGAS',x.concepto))}</td><td>${_gEsc(x.detalle||'')}</td><td class="r">${_gFmt(x.importe)}</td></tr>`).join('')
      +`<tr class="fin"><td colspan="4"><b>Total (${R.lista.length})</b></td><td class="r"><b>${_gFmt(R.tot)}</b></td></tr>`;
    tb=`<table><thead><tr><th>Fecha</th><th>Centro de costos</th><th>Concepto</th><th>Detalle</th><th class="r">Importe</th></tr></thead><tbody>${tb}</tbody></table>`;
  } else {
    let filas='';
    [...R.grupos.entries()].sort((a,b)=>R.agr==='mes'?0:b[1].tot-a[1].tot).forEach(([k,G])=>{
      filas+=`<tr${R.agr==='ccos-concepto'?' class="fin"':''}><td><b>${_gEsc(k)}</b></td><td class="r">${G.cant}</td><td class="r"><b>${_gFmt(G.tot)}</b></td></tr>`;
      if(R.agr==='ccos-concepto') [...G.sub.entries()].sort((a,b)=>b[1].tot-a[1].tot).forEach(([k2,S])=>{ filas+=`<tr><td style="padding-left:18px">${_gEsc(k2)}</td><td class="r">${S.cant}</td><td class="r">${_gFmt(S.tot)}</td></tr>`; });
    });
    filas+=`<tr class="fin"><td><b>TOTAL</b></td><td class="r">${R.lista.length}</td><td class="r"><b>${_gFmt(R.tot)}</b></td></tr>`;
    tb=`<table><thead><tr><th>${_gEsc(R.agrTxt)}</th><th class="r">Cant.</th><th class="r">Importe</th></tr></thead><tbody>${filas}</tbody></table>`;
  }
  sgvPrint({ titulo:'Gastos Generales — Resumen', subtitulo:_gResSub(), cuerpo:tb });
}
async function gastResExcel(){
  const R=_gRes; if(!R||!R.lista.length){ toast('Tocá Ver primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const NUM='#,##0.00', wb=new ExcelJS.Workbook();
  if(R.agr){
    const w=wb.addWorksheet('Resumen'); w.columns=[{width:46},{width:8},{width:16}];
    w.addRow(['Gastos Generales — Resumen']).font={bold:true,size:13};
    w.addRow([_gResSub()]).font={italic:true,color:{argb:'FF666666'}}; w.addRow([]);
    const h=w.addRow([R.agrTxt,'Cant.','Importe']); h.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
    [...R.grupos.entries()].sort((a,b)=>R.agr==='mes'?0:b[1].tot-a[1].tot).forEach(([k,G])=>{
      const r=w.addRow([k,G.cant,G.tot]); r.getCell(3).numFmt=NUM; if(R.agr==='ccos-concepto') r.font={bold:true};
      if(R.agr==='ccos-concepto') [...G.sub.entries()].sort((a,b)=>b[1].tot-a[1].tot).forEach(([k2,S])=>{ const s=w.addRow(['    '+k2,S.cant,S.tot]); s.getCell(3).numFmt=NUM; });
    });
    const t=w.addRow(['TOTAL',R.lista.length,R.tot]); t.font={bold:true}; t.getCell(3).numFmt=NUM; t.eachCell(c=>{ c.border={top:{style:'double'}}; });
  }
  const ws=wb.addWorksheet('Detalle');
  ws.columns=[{width:12},{width:10},{width:26},{width:10},{width:26},{width:40},{width:15}];
  const hr=ws.addRow(['Fecha','Centro','Descripción centro','Concepto','Descripción concepto','Detalle','Importe']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  R.lista.forEach(x=>{ const r=ws.addRow([_gFechaTxt(x.fecha), x.ccos, _gDesc('CCOS',x.ccos), x.concepto, _gDesc('CGAS',x.concepto), x.detalle||'', Number(x.importe)||0]); r.getCell(7).numFmt=NUM; });
  const fr=ws.addRow(['','','','','','Total',R.tot]); fr.font={bold:true}; fr.getCell(7).numFmt=NUM;
  ws.views=[{state:'frozen', ySplit:1}];
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Gastos_resumen_${(R.desde||'').replace(/-/g,'')}_${(R.hasta||'').replace(/-/g,'')}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
}

function _gStyle(){
  if(document.getElementById('gast-style')) return;
  const st=document.createElement('style'); st.id='gast-style';
  st.textContent=`
    #gast-head,.g-row{display:grid;grid-template-columns:140px 220px 220px 130px minmax(160px,1fr) 26px;gap:6px;align-items:center;padding:3px 10px}
    #gast-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3;padding:7px 10px}
    #gast-head .r,.g-imp{text-align:right}
    .g-row{border-bottom:1px solid var(--b1)}
    .g-row.sel{background:var(--s3);box-shadow:inset 3px 0 0 var(--acc)}
    .g-row.g-nuevo{background:#fff4d6;box-shadow:inset 3px 0 0 #e0a100}
    .g-in{height:28px;font-size:13px;padding:2px 6px;width:100%;min-width:0}
    .g-imp{font-family:var(--mono)}
    .g-st{text-align:center;font-size:14px}
  `;
  document.head.appendChild(st);
}

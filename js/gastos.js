/* ===========================================================================
   GASTOS GENERALES  (Compras → Gastos Generales)
   - Comunes a las dos empresas: los agrupa el CENTRO DE COSTOS.
   - Se editan EN LA MISMA GRILLA: cada celda es un campo. Al salir de un
     renglón modificado se graba solo (alta si es nuevo, modificación si no).
   - Arriba siempre hay un renglón vacío para cargar uno nuevo.
   - "Duplicar" copia el renglón seleccionado con la fecha de hoy y deja el
     cursor en el importe, que es lo que suele cambiar.
   =========================================================================== */

let _gastos = [];          // renglones en pantalla (el [0] es siempre el nuevo)
let _gastoSel = null;      // índice del renglón seleccionado
let _gastoTotal = 0;

function _gEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _gFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _gNum(v){ const t=String(v==null?'':v).replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'); const n=Number(t); return isNaN(n)?0:n; }
function _gHoy(){ return new Date().toISOString().substring(0,10); }
function _gFechaTxt(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
function _gPuede(acc){ return (typeof puedeh!=='function') || puedeh('gast',acc); }
function _gTabla(k){ return ((typeof TABLAS!=='undefined' && TABLAS[k])||[]); }
function _gDesc(k,cod){ const r=_gTabla(k).find(x=>x.CODIGO===cod); return r?r.DETALLE:''; }

function _gNuevo(){ return { id:null, fecha:_gHoy(), ccos:'', concepto:'', importe:0, detalle:'', _nuevo:true }; }

function gastFillCombos(){
  const put=(id,k,label)=>{
    const sel=document.getElementById(id); if(!sel||sel.options.length>1) return;
    sel.innerHTML=`<option value="">${label}</option>`+_gTabla(k).map(x=>`<option value="${_gEsc(x.CODIGO)}">${_gEsc(x.CODIGO)} — ${_gEsc(x.DETALLE)}</option>`).join('');
  };
  put('gast-f-ccos','CCOS','Todos los centros');
  put('gast-f-conc','CGAS','Todos los conceptos');
}

function renderGastos(){
  gastFillCombos();
  const d=document.getElementById('gast-desde'), h=document.getElementById('gast-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value) h.value=_gHoy();
  _gStyle();
  gastConsultar();
}

async function gastConsultar(){
  const body=document.getElementById('gast-body'); if(!body) return;
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const qs=[];
  if(g('gast-desde')) qs.push('desde='+g('gast-desde'));
  if(g('gast-hasta')) qs.push('hasta='+g('gast-hasta'));
  if(g('gast-f-ccos')) qs.push('ccos='+encodeURIComponent(g('gast-f-ccos')));
  if(g('gast-f-conc')) qs.push('concepto='+encodeURIComponent(g('gast-f-conc')));
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Cargando…</div>';
  try{
    const r=await apiGet('/gastos'+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_gEsc(r.error||'Error')+'</div>'; return; }
    _gastos=[ ...( _gPuede('alta') ? [_gNuevo()] : [] ), ...(r.gastos||[]) ];
    _gastoSel=null;
    _gPintar();
  }catch(e){
    body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_gEsc(e.message||'Error')+'</div>';
  }
}

// Opciones de un select de tabla, con el valor elegido marcado
function _gOpts(k,val){
  return '<option value=""></option>'+_gTabla(k).map(x=>
    `<option value="${_gEsc(x.CODIGO)}"${x.CODIGO===val?' selected':''}>${_gEsc(x.CODIGO)} — ${_gEsc(x.DETALLE)}</option>`).join('');
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
  if(!_gastos.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin gastos en el período</div>'; _gTotales(); return; }
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
      // Se grabó el renglón nuevo: pasa a ser uno más y arriba aparece otro vacío
      delete g._nuevo;
      _gastos.unshift(_gNuevo());
      if(_gastoSel!==null) _gastoSel++;
      _gPintar();
      document.querySelector('#gast-body .g-row[data-i="0"] .g-in[data-f="ccos"]')?.focus();
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
  // Reemplaza al renglón vacío de arriba si no se estaba usando
  const top=_gastos[0];
  if(top && top._nuevo && !top._dirty) _gastos[0]=nuevo; else _gastos.unshift(nuevo);
  _gastoSel=0;
  _gPintar();
  const imp=document.querySelector('#gast-body .g-row[data-i="0"] .g-imp');
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

/* ─────────── Imprimir ─────────── */
function gastPrint(){
  const lista=_gastos.filter(g=>!g._nuevo);
  if(!lista.length){ toast('No hay gastos para imprimir','err'); return; }
  const g=id=>(document.getElementById(id)?.value||'').trim();
  const tb=lista.map(x=>`<tr><td>${_gFechaTxt(x.fecha)}</td><td>${_gEsc(x.ccos)} ${_gEsc(_gDesc('CCOS',x.ccos))}</td>
    <td>${_gEsc(x.concepto)} ${_gEsc(_gDesc('CGAS',x.concepto))}</td><td>${_gEsc(x.detalle||'')}</td>
    <td class="r">${_gFmt(x.importe)}</td></tr>`).join('')
    + `<tr class="fin"><td colspan="4"><b>Total (${lista.length})</b></td><td class="r"><b>${_gFmt(_gastoTotal)}</b></td></tr>`;
  sgvPrint({ titulo:'Gastos Generales',
    subtitulo:`Período ${_gFechaTxt(g('gast-desde'))||'inicio'} a ${_gFechaTxt(g('gast-hasta'))||'hoy'}`,
    cuerpo:`<table><thead><tr><th>Fecha</th><th>Centro de costos</th><th>Concepto</th><th>Detalle</th><th class="r">Importe</th></tr></thead><tbody>${tb}</tbody></table>` });
}

/* ─────────── Excel ─────────── */
async function gastExcel(){
  const lista=_gastos.filter(g=>!g._nuevo);
  if(!lista.length){ toast('No hay gastos para exportar','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Gastos');
  ws.columns=[{width:12},{width:10},{width:26},{width:10},{width:26},{width:40},{width:15}];
  const hr=ws.addRow(['Fecha','Centro','Descripción centro','Concepto','Descripción concepto','Detalle','Importe']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  lista.forEach(x=>{
    const r=ws.addRow([_gFechaTxt(x.fecha), x.ccos, _gDesc('CCOS',x.ccos), x.concepto, _gDesc('CGAS',x.concepto), x.detalle||'', Number(x.importe)||0]);
    r.getCell(7).numFmt='#,##0.00';
  });
  const fr=ws.addRow(['','','','','','Total',_gastoTotal]); fr.font={bold:true}; fr.getCell(7).numFmt='#,##0.00';
  ws.views=[{state:'frozen', ySplit:1}];
  ws.autoFilter={ from:{row:1,column:1}, to:{row:1,column:7} };
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Gastos_${new Date().toISOString().substring(0,10)}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
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
    .g-row.g-nuevo{background:rgba(55,138,221,.06)}
    .g-in{height:28px;font-size:13px;padding:2px 6px;width:100%;min-width:0}
    .g-imp{font-family:var(--mono)}
    .g-st{text-align:center;font-size:14px}
  `;
  document.head.appendChild(st);
}

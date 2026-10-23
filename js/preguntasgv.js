// ═══════════════════════════════════════════════════════════
// PREGUNTALE A SGV (Ricardo, Oct 2026)
// Se escribe la pregunta en castellano, la IA arma un SELECT y la base lo
// ejecuta con un usuario de SÓLO LECTURA (ver ia_consulta.sql y /ia/sql).
// Se muestra cómo la entendió, la consulta y el resultado.
// Por ahora sólo nivel alto: el SQL libre se saltea las reglas de grupo.
// Prefijo propio `psgv` para no chocar con otros archivos.
// ═══════════════════════════════════════════════════════════

let _psgvData = null;

(function(){
  if(document.getElementById('psgv-estilos')) return;
  const st=document.createElement('style'); st.id='psgv-estilos';
  st.textContent=`
    .psgv-caja{display:flex;gap:8px;align-items:center;margin:12px 14px 0}
    .psgv-caja input{flex:1;min-width:0;height:36px;font-size:14px;padding:0 12px;border-radius:8px;
      border:1px solid var(--b1);background:var(--s1);color:var(--txt)}
    .psgv-caja input:focus{outline:2px solid #0a58ca;outline-offset:0}
    .psgv-campo{position:relative;flex:1;min-width:0;display:flex}
    .psgv-campo input{padding-right:34px}
    .psgv-x{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:none;background:none;
      cursor:pointer;font-size:15px;color:var(--t3);padding:2px 4px;line-height:1}
    .psgv-x:hover{color:var(--red)}
    .psgv-expl{margin:10px 14px 0;padding:9px 12px;border-radius:8px;font-size:13px;line-height:1.5;
      background:rgba(55,138,221,.10);color:#185FA5}
    .psgv-sql{margin:6px 14px 0;font-size:12px}
    .psgv-sql summary{cursor:pointer;color:var(--t2)}
    .psgv-sql pre{margin:6px 0 0;padding:8px 10px;background:var(--s2);border:1px solid var(--b1);border-radius:6px;
      white-space:pre-wrap;font-family:var(--mono);font-size:12px;color:var(--txt)}
    .psgv-tabla{margin:10px 14px;overflow:auto;height:calc(100vh - 260px);border:1px solid var(--b1);border-radius:6px;background:var(--s1)}
    .psgv-tabla table{border-collapse:collapse;width:100%;font-size:12px}
    .psgv-tabla th{position:sticky;top:0;background:var(--s3);color:var(--t2);font-weight:600;text-align:left;
      padding:7px 10px;border-bottom:1px solid var(--b1);white-space:nowrap}
    .psgv-tabla td{padding:5px 10px;border-bottom:1px solid var(--b1);white-space:nowrap}
    .psgv-tabla tr:nth-child(even) td{background:var(--s2)}
    .psgv-tabla .n{text-align:right;font-family:var(--mono)}
    .psgv-vacio{color:var(--t3);padding:24px;text-align:center}
    .psgv-nota{margin:6px 14px 0;font-size:12px;color:#854F0B}
    .tnav.tnav-ia{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-weight:700;
      border-radius:999px;padding:4px 14px;margin-left:6px;letter-spacing:.5px;
      box-shadow:0 0 0 1px rgba(255,255,255,.25),0 2px 8px rgba(124,58,237,.45)}
    .tnav.tnav-ia:hover{filter:brightness(1.15)}
    .psgv-charla{margin:10px 14px;padding:12px 14px;border-radius:10px;background:var(--s1);border:1px solid var(--b1)}
    .psgv-ia{font-size:13px;line-height:1.5;color:var(--txt)}
    .psgv-duda{margin-top:6px;padding:8px 12px;border-left:3px solid #7c3aed;background:rgba(124,58,237,.08);font-size:13px;line-height:1.5}
    .psgv-charla textarea,.psgv-chk textarea,.psgv-chk input{width:100%;box-sizing:border-box;margin-top:8px;padding:8px;
      border:1px solid var(--b1);border-radius:6px;background:var(--s2);color:var(--txt);font:inherit;font-size:13px}
    .psgv-chk{margin-top:8px;padding:8px 10px;border:1px solid var(--b1);border-radius:6px;background:var(--s2);font-size:12px;line-height:1.5}
    .psgv-chk-q{font-weight:600;color:var(--t2);margin-bottom:2px}
    .psgv-ok{margin:8px 14px 0;font-size:12px;color:var(--t2);display:flex;gap:8px;align-items:center}
    .psgv-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}
    .psgv-modal{background:var(--s1,#fff);border-radius:12px;width:min(760px,100%);max-height:85vh;display:flex;flex-direction:column;
      box-shadow:0 12px 40px rgba(0,0,0,.35)}
    .psgv-mtit{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--b1);font-weight:700}
    .psgv-mbody{overflow:auto;padding:4px 16px 16px}`;
  document.head.appendChild(st);
})();

function _psgvHoy(){ const h=new Date(); return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0'); }
function _psgvEsNum(v){ return typeof v==='number' || (typeof v==='string' && /^-?\d+(\.\d+)?$/.test(v.trim()) && v.trim().length<16); }
function _psgvEsFecha(v){ return typeof v==='string' && /^\d{4}-\d{2}-\d{2}/.test(v); }
function _psgvVer(v){
  if(v===null || v===undefined) return '';
  if(typeof v==='boolean') return v?'Sí':'No';
  if(_psgvEsFecha(v)) return v.substring(0,10).split('-').reverse().join('/');
  if(_psgvEsNum(v)){ const n=Number(v); return Number.isInteger(n) ? n.toLocaleString('es-AR')
    : n.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  if(typeof v==='object') return JSON.stringify(v);
  return String(v);
}
function _psgvCols(F){ return F.length ? Object.keys(F[0]) : []; }
// Una columna es numérica si todos sus valores con dato lo son
function _psgvColNum(F,c){ const v=F.map(r=>r[c]).filter(x=>x!==null&&x!==undefined&&x!==''); return v.length>0 && v.every(_psgvEsNum); }
function _psgvTitulo(c){ const t=String(c).replace(/_/g,' '); return t.charAt(0).toUpperCase()+t.slice(1); }

function _psgvNivel(){ return (typeof usuarioActual!=='undefined' && usuarioActual) ? (Number(usuarioActual.nivel)||0) : 0; }

async function psgvPreguntar(fraseForzada){
  const inp=document.getElementById('psgv-frase');
  const frase=(typeof fraseForzada==='string' ? fraseForzada : (inp?.value||'')).trim();
  if(!frase){ inp?.focus(); return; }
  if(inp && inp.value.trim()!==frase) inp.value=frase;
  const btn=document.getElementById('psgv-btn'), res=document.getElementById('psgv-res');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Pensando…'; }
  res.innerHTML='<div class="psgv-vacio">⏳ Armando la consulta…</div>';
  try{
    const r=await apiPost('/ia/sql',{ frase, hoy:_psgvHoy() });
    if(!r || !r.ok){
      _psgvData=null;
      res.innerHTML=`<div class="psgv-vacio" style="color:var(--red)">${esc((r&&r.error)||'Error')}</div>`
        + (r&&r.sql ? `<details class="psgv-sql" open><summary>Consulta que intentó</summary><pre>${esc(r.sql)}</pre></details>` : '');
      return;
    }
    _psgvData={ ...r, frase };
    psgvRender();
  }catch(e){
    res.innerHTML=`<div class="psgv-vacio" style="color:var(--red)">Error: ${esc(e.message||'')}</div>`;
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='✨ Preguntar'; }
    _psgvContarPendientes();
  }
}

// La IA no supo qué significa algo: pregunta en vez de adivinar
function _psgvHtmlPregunta(D){
  const P=D.pregunta||{};
  let h=`<div class="psgv-charla"><div class="psgv-ia">🤔 Antes de responder necesito saber algo${P.termino?` sobre <b>"${esc(P.termino)}"</b>`:''}:</div>
    <div class="psgv-duda">${esc(P.duda||'')}</div>`;
  if(D.puedeResponder && P.id){
    h+=`<textarea id="psgv-resp" rows="3" placeholder="Explicale qué significa en SGV (de qué tabla o campo sale el dato)…"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
        <button class="btn" onclick="psgvDescartar(${P.id})">Descartar</button>
        <button class="btn pri" onclick="psgvResponder(${P.id})">✅ Enseñarle y volver a preguntar</button>
      </div>`;
  } else {
    h+=`<div class="psgv-ia" style="margin-top:8px">Le pasé la duda a Ricardo. Cuando me la aclare, volvé a preguntarme y ya voy a saber.</div>`;
  }
  return h+'</div>';
}

// No hubo resultados: la IA explica por qué y muestra lo que revisó
function _psgvHtmlDiagnostico(D){
  const G=D.diagnostico;
  if(!G) return '<div class="psgv-vacio">La consulta no devolvió resultados.</div>';
  let h=`<div class="psgv-charla"><div class="psgv-ia">🔎 ${esc(G.mensaje||'No encontré resultados.')}</div>`;
  (G.chequeos||[]).forEach(c=>{
    let r;
    if(c.error) r='<i>no se pudo verificar</i>';
    else if(!c.filas.length) r='<b>no encontré nada</b>';
    else r=c.filas.map(f=>esc(Object.values(f).map(_psgvVer).join(' · '))).join('<br>');
    h+=`<div class="psgv-chk"><div class="psgv-chk-q">${esc(c.que)}</div><div>${r}</div></div>`;
  });
  return h+'</div>';
}

function psgvRender(){
  const res=document.getElementById('psgv-res'); if(!res) return;
  if(!_psgvData){ res.innerHTML='<div class="psgv-vacio">Escribí tu pregunta y apretá Enter.<br>Por ejemplo: <i>los 10 clientes que más compraron este año en Tressa</i></div>'; return; }
  const D=_psgvData;
  if(D.pregunta){ res.innerHTML=_psgvHtmlPregunta(D); setTimeout(()=>document.getElementById('psgv-resp')?.focus(),50); return; }
  const F=D.filas||[], C=_psgvCols(F);
  const num=Object.fromEntries(C.map(c=>[c,_psgvColNum(F,c)]));
  let html=`<div class="psgv-expl">${esc(D.explicacion||'')}</div>
    <details class="psgv-sql"><summary>Ver la consulta</summary><pre>${esc(D.sql||'')}</pre></details>`;
  if(D.truncado) html+='<div class="psgv-nota">Se muestran las primeras 2000 filas.</div>';
  if(!F.length) html+=_psgvHtmlDiagnostico(D);
  else{
    html+=`<div class="psgv-ok" id="psgv-ok">¿Es lo que buscabas?
        <button class="btn" onclick="psgvBien()">👍 Sí, aprendelo</button>
        <span style="color:var(--t3)">· si no, reformulá la pregunta</span></div>`;
    html+=`<div class="psgv-tabla"><table><thead><tr>${C.map(c=>`<th class="${num[c]?'n':''}">${esc(_psgvTitulo(c))}</th>`).join('')}</tr></thead>
    <tbody>${F.map(r=>`<tr>${C.map(c=>`<td class="${num[c]?'n':''}">${esc(_psgvVer(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  res.innerHTML=html;
}

async function psgvResponder(id){
  const t=(document.getElementById('psgv-resp')?.value||'').trim();
  if(!t){ document.getElementById('psgv-resp')?.focus(); return; }
  try{
    const r=await apiPost('/ia/responder',{ id, respuesta:t });
    if(!r||!r.ok){ sgvAviso({titulo:'No se pudo guardar', texto:(r&&r.error)||'Error', tipo:'err'}); return; }
    toast('Aprendido: "'+(r.termino||'')+'"');
    psgvPreguntar(r.frase || _psgvData?.frase);
  }catch(e){ sgvAviso({titulo:'No se pudo guardar', texto:e.message||'Error', tipo:'err'}); }
}
async function psgvDescartar(id){
  try{ await apiPost('/ia/pendientes/descartar',{ id }); }catch(_){}
  _psgvData=null; psgvRender(); _psgvContarPendientes();
}
async function psgvBien(){
  if(!_psgvData?.sql) return;
  try{
    const r=await apiPost('/ia/ejemplo',{ frase:_psgvData.frase, sql:_psgvData.sql });
    const b=document.getElementById('psgv-ok');
    if(r&&r.ok&&b) b.innerHTML='✅ Gracias, lo aprendí: las preguntas parecidas van a salir mejor.';
  }catch(e){ toast('No se pudo guardar','err'); }
}

// ── Lo que sabe la IA: dudas pendientes y diccionario (sólo Ricardo) ──
async function _psgvContarPendientes(){
  const b=document.getElementById('psgv-btn-pend'); if(!b) return;
  if(_psgvNivel()<99){ b.style.display='none'; document.getElementById('psgv-btn-dic')&&(document.getElementById('psgv-btn-dic').style.display='none'); return; }
  try{ const r=await apiGet('/ia/pendientes'); const n=(r&&r.pendientes||[]).length;
       b.textContent=n?`❓ Dudas (${n})`:'❓ Dudas'; b.classList.toggle('pri', n>0); }catch(_){}
}
function _psgvModal(titulo, cuerpo){
  let ov=document.getElementById('psgv-ov');
  if(!ov){ ov=document.createElement('div'); ov.id='psgv-ov'; ov.className='psgv-ov'; document.body.appendChild(ov);
           ov.addEventListener('click',e=>{ if(e.target===ov) ov.remove(); }); }
  ov.innerHTML=`<div class="psgv-modal"><div class="psgv-mtit"><span>${titulo}</span>
      <button class="psgv-x" style="position:static;transform:none" onclick="document.getElementById('psgv-ov').remove()">✕</button></div>
    <div class="psgv-mbody">${cuerpo}</div></div>`;
}
async function psgvVerPendientes(){
  const r=await apiGet('/ia/pendientes');
  const L=(r&&r.pendientes)||[];
  _psgvModal('❓ Dudas de la IA para Ricardo', !L.length ? '<div class="psgv-vacio">No hay dudas pendientes.</div>' :
    L.map(p=>`<div class="psgv-chk"><div class="psgv-chk-q">${esc(p.usuario||'')} preguntó: "${esc(p.frase)}"</div>
      <div style="margin:4px 0">${esc(p.duda)}</div>
      <textarea id="psgv-pr-${p.id}" rows="2" placeholder="Tu respuesta…"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button class="btn" onclick="psgvPendDescartar(${p.id})">Descartar</button>
        <button class="btn pri" onclick="psgvPendResponder(${p.id})">✅ Responder</button></div></div>`).join(''));
}
async function psgvPendResponder(id){
  const t=(document.getElementById('psgv-pr-'+id)?.value||'').trim(); if(!t) return;
  const r=await apiPost('/ia/responder',{ id, respuesta:t });
  if(r&&r.ok){ toast('Aprendido: "'+(r.termino||'')+'"'); psgvVerPendientes(); _psgvContarPendientes(); }
  else sgvAviso({titulo:'No se pudo guardar', texto:(r&&r.error)||'Error', tipo:'err'});
}
async function psgvPendDescartar(id){ await apiPost('/ia/pendientes/descartar',{ id }); psgvVerPendientes(); _psgvContarPendientes(); }

async function psgvVerDiccionario(){
  const r=await apiGet('/ia/diccionario');
  const L=(r&&r.diccionario)||[];
  _psgvModal(`📚 Lo que sabe la IA <span style="font-weight:400;font-size:12px;color:var(--t2)">· ${L.length} términos · ${r&&r.ejemplos||0} ejemplos aprendidos</span>`,
    `<div class="psgv-chk"><div class="psgv-chk-q">Enseñarle algo nuevo</div>
       <input id="psgv-dn-t" placeholder="Término (como lo dicen los usuarios)">
       <textarea id="psgv-dn-s" rows="2" placeholder="Qué significa en SGV (tabla, campo, regla)…"></textarea>
       <div style="text-align:right;margin-top:4px"><button class="btn pri" onclick="psgvDicGuardar(0)">➕ Agregar</button></div></div>`
    + L.map(d=>`<div class="psgv-chk">
        <input id="psgv-d-t-${d.id}" value="${esc(d.termino)}">
        <textarea id="psgv-d-s-${d.id}" rows="2">${esc(d.significado)}</textarea>
        <div style="display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:4px">
          <span style="font-size:11px;color:var(--t3)">${d.origen==='ricardo'?'✍️ Ricardo':'⚙️ del sistema'}${/A CONFIRMAR/i.test(d.significado)?' · <b style="color:#b45309">a confirmar</b>':''}</span>
          <span><button class="btn" onclick="psgvDicBorrar(${d.id})">🗑</button>
                <button class="btn pri" onclick="psgvDicGuardar(${d.id})">💾 Guardar</button></span></div></div>`).join(''));
}
async function psgvDicGuardar(id){
  const t=(document.getElementById(id?`psgv-d-t-${id}`:'psgv-dn-t')?.value||'').trim();
  const s=(document.getElementById(id?`psgv-d-s-${id}`:'psgv-dn-s')?.value||'').trim();
  const r=await apiPost('/ia/diccionario/guardar',{ id, termino:t, significado:s });
  if(r&&r.ok){ toast('Guardado'); psgvVerDiccionario(); } else sgvAviso({titulo:'No se pudo guardar', texto:(r&&r.error)||'Error', tipo:'err'});
}
async function psgvDicBorrar(id){
  confirm2('¿Borrar este término?','La IA deja de saberlo.', async ()=>{
    const r=await apiPost('/ia/diccionario/borrar',{ id });
    if(r&&r.ok) psgvVerDiccionario();
  });
}
// Botones "Dudas" y "Diccionario" en la barra de la pantalla (sólo Ricardo)
function _psgvBotonesMaestro(){
  const bar=document.querySelector('#page-psgv .toolbar');
  if(!bar || document.getElementById('psgv-btn-pend')) return;
  const sp=bar.querySelector('.spacer');
  const b1=document.createElement('button'); b1.className='btn'; b1.id='psgv-btn-pend'; b1.textContent='❓ Dudas'; b1.onclick=psgvVerPendientes;
  const b2=document.createElement('button'); b2.className='btn'; b2.id='psgv-btn-dic'; b2.textContent='📚 Diccionario'; b2.onclick=psgvVerDiccionario;
  bar.insertBefore(b2, sp ? sp.nextSibling : null); bar.insertBefore(b1, b2);
  _psgvContarPendientes();
}

function psgvImprimir(){
  if(!_psgvData || !(_psgvData.filas||[]).length){ toast('Preguntá primero','err'); return; }
  const F=_psgvData.filas, C=_psgvCols(F), num=Object.fromEntries(C.map(c=>[c,_psgvColNum(F,c)]));
  sgvPrint({ titulo:'Preguntale a SGV', subtitulo:esc(_psgvData.frase),
    cuerpo:`<table><thead><tr>${C.map(c=>`<th${num[c]?' class="r"':''}>${esc(_psgvTitulo(c))}</th>`).join('')}</tr></thead>
      <tbody>${F.map(r=>`<tr>${C.map(c=>`<td${num[c]?' class="r"':''}>${esc(_psgvVer(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table>` });
}

async function psgvExcel(){
  if(!_psgvData || !(_psgvData.filas||[]).length){ toast('Preguntá primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const sc=document.createElement('script');
      sc.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      sc.onload=res; sc.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(sc); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const F=_psgvData.filas, C=_psgvCols(F), num=Object.fromEntries(C.map(c=>[c,_psgvColNum(F,c)]));
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Consulta');
  ws.addRow(['Preguntale a SGV']).font={bold:true,size:13};
  ws.addRow([_psgvData.frase]).font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(C.map(_psgvTitulo));
  hr.eachCell(c=>{ c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EAED'}};
                   c.border={bottom:{style:'thin'}}; });
  F.forEach(r=>{
    const row=ws.addRow(C.map(c=>{ const v=r[c];
      if(v===null||v===undefined) return null;
      if(num[c]) return Number(v);
      if(_psgvEsFecha(v)) return _psgvVer(v);
      return typeof v==='object' ? JSON.stringify(v) : v; }));
    C.forEach((c,i)=>{ if(num[c]) row.getCell(i+1).numFmt='#,##0.##'; });
  });
  ws.columns.forEach((col,i)=>{ const c=C[i]; const largo=Math.max(String(_psgvTitulo(c)).length,
    ...F.slice(0,200).map(r=>String(_psgvVer(r[c])).length)); col.width=Math.min(50,Math.max(10,largo+2)); });
  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Consulta_${_psgvHoy().replace(/-/g,'')}.xlsx`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// "✕" para borrar la pregunta y el resultado
function psgvLimpiar(){
  const inp=document.getElementById('psgv-frase');
  if(inp){ inp.value=''; inp.focus(); }
  _psgvData=null; psgvRender();
}
// Al entrar al campo se selecciona todo: se escribe encima la pregunta nueva.
// La "✕" va DENTRO del campo. Se arma desde acá para no tocar el index.html.
function _psgvCampo(){
  const inp=document.getElementById('psgv-frase');
  if(!inp || inp.dataset.listo) return;
  inp.dataset.listo='1';
  const w=document.createElement('span'); w.className='psgv-campo';
  inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
  const x=document.createElement('button'); x.type='button'; x.className='psgv-x';
  x.textContent='✕'; x.title='Borrar la consulta'; x.tabIndex=-1; x.onclick=psgvLimpiar;
  w.appendChild(x);
  inp.addEventListener('focus', ()=>setTimeout(()=>inp.select(),0));
}

// Al mostrarse la pantalla: mensaje inicial y foco en la pregunta
(function(){
  const arrancar=()=>{
    const pg=document.getElementById('page-psgv');
    if(!pg || !('MutationObserver' in window)) return;
    let visible=pg.offsetParent!==null;
    const alMostrar=()=>{ _psgvCampo(); _psgvBotonesMaestro(); if(!_psgvData) psgvRender(); setTimeout(()=>document.getElementById('psgv-frase')?.focus(),50); };
    const chequear=()=>{ const ahora=pg.offsetParent!==null; if(ahora && !visible) alMostrar(); visible=ahora; };
    const obs=new MutationObserver(chequear);
    obs.observe(pg,{attributes:true,attributeFilter:['class','style']});
    if(pg.parentElement) obs.observe(pg.parentElement,{attributes:true,attributeFilter:['class','style']});
    if(visible) alMostrar();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

// Botón "✨ IA" en la barra principal: sólo lo ve el nivel alto
// (lo que no se puede usar, no se muestra). El usuario logueado está en
// `usuarioActual`; se revisa cada 2 s porque el login llega después de cargar.
function _psgvBoton(){
  const b=document.getElementById('tnav-ia'); if(!b) return;
  const nivel=(typeof usuarioActual!=='undefined' && usuarioActual) ? (Number(usuarioActual.nivel)||0) : 0;
  b.style.display = nivel>=90 ? '' : 'none';
}
setInterval(_psgvBoton, 2000);
document.addEventListener('click', _psgvBoton, true);

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
    .psgv-nota{margin:6px 14px 0;font-size:12px;color:#854F0B}`;
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

async function psgvPreguntar(){
  const inp=document.getElementById('psgv-frase');
  const frase=(inp?.value||'').trim();
  if(!frase){ inp?.focus(); return; }
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
  }
}

function psgvRender(){
  const res=document.getElementById('psgv-res'); if(!res) return;
  if(!_psgvData){ res.innerHTML='<div class="psgv-vacio">Escribí tu pregunta y apretá Enter.<br>Por ejemplo: <i>los 10 clientes que más compraron este año en Tressa</i></div>'; return; }
  const D=_psgvData, F=D.filas||[], C=_psgvCols(F);
  const num=Object.fromEntries(C.map(c=>[c,_psgvColNum(F,c)]));
  let html=`<div class="psgv-expl">${esc(D.explicacion||'')}</div>
    <details class="psgv-sql"><summary>Ver la consulta</summary><pre>${esc(D.sql||'')}</pre></details>`;
  if(D.truncado) html+='<div class="psgv-nota">Se muestran las primeras 2000 filas.</div>';
  if(!F.length) html+='<div class="psgv-vacio">La consulta no devolvió resultados.</div>';
  else html+=`<div class="psgv-tabla"><table><thead><tr>${C.map(c=>`<th class="${num[c]?'n':''}">${esc(_psgvTitulo(c))}</th>`).join('')}</tr></thead>
    <tbody>${F.map(r=>`<tr>${C.map(c=>`<td class="${num[c]?'n':''}">${esc(_psgvVer(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  res.innerHTML=html;
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

// Al mostrarse la pantalla: mensaje inicial y foco en la pregunta
(function(){
  const arrancar=()=>{
    const pg=document.getElementById('page-psgv');
    if(!pg || !('MutationObserver' in window)) return;
    let visible=pg.offsetParent!==null;
    const alMostrar=()=>{ if(!_psgvData) psgvRender(); setTimeout(()=>document.getElementById('psgv-frase')?.focus(),50); };
    const chequear=()=>{ const ahora=pg.offsetParent!==null; if(ahora && !visible) alMostrar(); visible=ahora; };
    const obs=new MutationObserver(chequear);
    obs.observe(pg,{attributes:true,attributeFilter:['class','style']});
    if(pg.parentElement) obs.observe(pg.parentElement,{attributes:true,attributeFilter:['class','style']});
    if(visible) alMostrar();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

// La opción del menú sólo la ve el nivel alto (lo que no se puede usar, no se muestra)
document.addEventListener('click', ()=>{
  const b=document.getElementById('ddi-psgv'); if(!b) return;
  const nivel=(typeof USUARIO!=='undefined' && USUARIO) ? (USUARIO.nivel||0) : 0;
  b.style.display = nivel>=90 ? '' : 'none';
}, true);

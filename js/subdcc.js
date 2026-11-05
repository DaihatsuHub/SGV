/* ===========================================================================
   SUBDIARIO DE IVA POR CENTRO DE COSTOS  (Ventas → Subdiario de IVA x C.Costos)
   Ricardo, Nov 2026. Los mismos comprobantes e importes que el Subdiario de
   IVA (valores declarados), abiertos por centro de costos según el neto de los
   renglones. Un renglón por comprobante y centro. Botón "Resumen General":
   un renglón por centro de costos con los totales.
   =========================================================================== */

let _sccData = null;
function _sccEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _sccFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _sccFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
function _sccCC(c){ if(!c||c==='—') return '— Sin centro'; const t=((typeof TABLAS!=='undefined'&&TABLAS['CCOS'])||[]).find(x=>(x.CODIGO||'').trim()===c); return t?(t.DETALLE||c):c; }
// Columnas de importes (Exento sólo si hay en el período)
function _sccCols(){
  const c=[{k:'neto',l:'Neto'},{k:'ivaTot',l:'IVA'}];
  if(_sccData?.hayExento) c.push({k:'exento',l:'Exento'});
  c.push({k:'percTot',l:'Percep.'},{k:'total',l:'Total'});
  return c;
}
function _sccGrid(n){ return `86px 125px minmax(180px,1fr) 115px 130px repeat(${n},120px)`; }

function renderSubdCC(){
  _sccStyle();
  const d=document.getElementById('scc-desde'), h=document.getElementById('scc-hasta');
  if(d && !d.value){ const t=new Date(); d.value=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-01`; }
  if(h && !h.value) h.value=new Date().toISOString().substring(0,10);
}

async function sccConsultar(){
  const body=document.getElementById('scc-body'); if(!body) return;
  const de=document.getElementById('scc-desde')?.value, ha=document.getElementById('scc-hasta')?.value;
  const em=document.getElementById('scc-empresa')?.value||'';
  if(!de||!ha){ toast('Elegí el período','err'); return; }
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Calculando…</div>';
  try{
    const r=await apiGet(`/informes/subdiario-cc?desde=${de}&hasta=${ha}&empresa=${em}`);
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_sccEsc(r.error||'Error')+'</div>'; return; }
    _sccData=r; _sccPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_sccEsc(e.message||'Error')+'</div>'; }
}

function _sccPintar(){
  const D=_sccData, C=_sccCols(), T=D.totales||{}, filas=D.filas||[];
  const head=document.getElementById('scc-head'), body=document.getElementById('scc-body');
  const G=_sccGrid(C.length);
  head.style.gridTemplateColumns=G;
  head.innerHTML='<span>Fecha</span><span>Comprobante</span><span>Cliente</span><span>CUIT</span><span>Centro de Costos</span>'
    + C.map(c=>`<span class="r">${c.l}</span>`).join('');
  if(!filas.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin comprobantes en el período</div>'; return; }
  const aviso = D.sinCae ? `<div class="scc-nota">⚠️ Hay ${D.sinCae} comprobante(s) SIN CAE en el período (marcados en rojo).</div>` : '';
  body.innerHTML = aviso + filas.map(x=>`<div class="scc-row${x.sinCae?' sincae':''}" style="grid-template-columns:${G}">
      <span>${_sccFecha(x.fec)}</span><span class="t" style="color:var(--acc)">${_sccEsc(x.comp)}</span>
      <span class="t" title="${_sccEsc(x.cli)}">${_sccEsc(x.razon||x.cli)}</span><span class="t">${_sccEsc(x.cuit)}</span>
      <span class="t cc">${_sccEsc(_sccCC(x.ccos))}</span>
      ${C.map(c=>`<span class="r">${_sccFmt(x[c.k])}</span>`).join('')}</div>`).join('')
    + `<div class="scc-row scc-tot" style="grid-template-columns:${G}">
      <span><b>TOTAL</b></span><span></span><span>${new Set(filas.map(x=>x.comp)).size} comprobantes</span><span></span><span></span>
      ${C.map(c=>`<span class="r">${_sccFmt(T[c.k])}</span>`).join('')}</div>`;
}

// Botón "Resumen General": un renglón por centro de costos con los totales
function sccResumen(){
  if(!_sccData||!(_sccData.filas||[]).length){ toast('Consultá primero','err'); return; }
  const D=_sccData, C=_sccCols(), T=D.totales, R=D.resumen||[];
  const G=`minmax(140px,1fr) 60px repeat(${C.length},120px)`;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px';
  ov.innerHTML=`<div style="background:var(--s1,#fff);border-radius:14px;max-width:960px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
    <div style="background:var(--acc,#0a58ca);color:#fff;padding:12px 18px;font-size:16px;font-weight:600">📒 Resumen General por Centro de Costos</div>
    <div style="padding:6px 18px 0;font-size:12px;color:var(--t2)">Período ${_sccFecha(D.desde)} a ${_sccFecha(D.hasta)} · valores declarados a AFIP</div>
    <div style="padding:10px 18px;overflow:auto;max-height:70vh">
      <div class="scc-rr hd" style="grid-template-columns:${G}"><span>Centro de Costos</span><span class="r">Cant.</span>${C.map(c=>`<span class="r">${c.l}</span>`).join('')}</div>
      ${R.map(r=>`<div class="scc-rr" style="grid-template-columns:${G}"><span>${_sccEsc(_sccCC(r.ccos))}</span><span class="r">${r.comprobantes}</span>
        ${C.map(c=>`<span class="r">${_sccFmt(r[c.k])}</span>`).join('')}</div>`).join('')}
      <div class="scc-rr tot" style="grid-template-columns:${G}"><span>TOTAL GENERAL</span><span></span>${C.map(c=>`<span class="r">${_sccFmt(T[c.k])}</span>`).join('')}</div>
    </div>
    <div style="display:flex;justify-content:flex-end;padding:0 18px 16px"><button class="btn pri" id="scc-res-ok">Cerrar</button></div>
  </div>`;
  const cerrar=()=>{ ov.remove(); document.removeEventListener('keydown',tecla); };
  const tecla=e=>{ if(e.key==='Escape'||e.key==='Enter') cerrar(); };
  ov.addEventListener('click',e=>{ if(e.target===ov) cerrar(); });
  document.body.appendChild(ov);
  ov.querySelector('#scc-res-ok').onclick=cerrar;
  document.addEventListener('keydown',tecla);
}

function _sccSub(){
  const D=_sccData, emp=D.empresa==='H'?'Hatsu':(D.empresa==='T'?'Tressa':'Todas las empresas');
  return `Período ${_sccFecha(D.desde)} a ${_sccFecha(D.hasta)} · ${emp} · valores declarados a AFIP`;
}

function sccPrint(){
  if(!_sccData||!(_sccData.filas||[]).length){ toast('No hay nada para imprimir','err'); return; }
  const D=_sccData, C=_sccCols(), T=D.totales, R=D.resumen||[];
  const th='<tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>CUIT</th><th>Centro de Costos</th>'+C.map(c=>`<th class="r">${c.l}</th>`).join('')+'</tr>';
  const filas=D.filas.map(x=>`<tr><td>${_sccFecha(x.fec)}</td><td>${_sccEsc(x.comp)}</td><td>${_sccEsc(sgvCorta(x.razon||x.cli,28))}</td>
    <td>${_sccEsc(x.cuit)}</td><td>${_sccEsc(_sccCC(x.ccos))}</td>${C.map(c=>`<td class="r">${_sccFmt(x[c.k])}</td>`).join('')}</tr>`).join('');
  const tot=`<tr class="fin"><td colspan="5"><b>TOTAL</b></td>${C.map(c=>`<td class="r">${_sccFmt(T[c.k])}</td>`).join('')}</tr>`;
  const res=`<h3>Resumen General por Centro de Costos</h3><table><thead><tr><th>Centro de Costos</th><th class="r">Cant.</th>${C.map(c=>`<th class="r">${c.l}</th>`).join('')}</tr></thead><tbody>
    ${R.map(r=>`<tr><td>${_sccEsc(_sccCC(r.ccos))}</td><td class="r">${r.comprobantes}</td>${C.map(c=>`<td class="r">${_sccFmt(r[c.k])}</td>`).join('')}</tr>`).join('')}
    <tr class="fin"><td>TOTAL GENERAL</td><td></td>${C.map(c=>`<td class="r">${_sccFmt(T[c.k])}</td>`).join('')}</tr></tbody></table>`;
  sgvPrint({ titulo:'Subdiario de IVA Ventas por Centro de Costos', subtitulo:_sccSub(),
    cuerpo:`<table><thead>${th}</thead><tbody>${filas}${tot}</tbody></table><div style="break-inside:avoid">${res}</div>` });
}

async function sccExcel(){
  if(!_sccData||!(_sccData.filas||[]).length){ toast('No hay nada para exportar','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_sccData, C=_sccCols(), T=D.totales, R=D.resumen||[], NUM='#,##0.00';
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Subdiario x CC');
  ws.columns=[{width:12},{width:16},{width:34},{width:15},{width:20},...C.map(()=>({width:16}))];
  ws.addRow(['Subdiario de IVA Ventas por Centro de Costos']).font={bold:true,size:13};
  ws.addRow([_sccSub()]).font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Fecha','Comprobante','Cliente','CUIT','Centro de Costos',...C.map(c=>c.l)]);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  const fmt=(r,desde)=>{ C.forEach((_,i)=>{ r.getCell(desde+i).numFmt=NUM; }); };
  D.filas.forEach(x=>fmt(ws.addRow([_sccFecha(x.fec),x.comp,x.razon||x.cli,x.cuit,_sccCC(x.ccos),...C.map(c=>x[c.k])]),6));
  const rt=ws.addRow(['TOTAL','','','','',...C.map(c=>T[c.k])]); rt.font={bold:true}; fmt(rt,6);
  rt.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
  const w2=wb.addWorksheet('Resumen General');
  w2.columns=[{width:24},{width:8},...C.map(()=>({width:16}))];
  w2.addRow(['Resumen General por Centro de Costos']).font={bold:true,size:13};
  w2.addRow([_sccSub()]).font={italic:true,color:{argb:'FF666666'}};
  w2.addRow([]);
  const h2=w2.addRow(['Centro de Costos','Cant.',...C.map(c=>c.l)]); h2.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  R.forEach(r=>fmt(w2.addRow([_sccCC(r.ccos),r.comprobantes,...C.map(c=>r[c.k])]),3));
  const r2=w2.addRow(['TOTAL GENERAL','',...C.map(c=>T[c.k])]); r2.font={bold:true}; fmt(r2,3);
  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer(), a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`SubdiarioIVA_CC_${(D.desde||'').replace(/-/g,'')}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

function _sccStyle(){
  if(document.getElementById('scc-style')) return;
  const st=document.createElement('style'); st.id='scc-style';
  st.textContent=`
    #scc-head,.scc-row{display:grid;gap:8px;align-items:center;padding:7px 12px}
    #scc-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3}
    #scc-head .r,.scc-row .r,.scc-rr .r{text-align:right}
    .scc-row{font-size:13px;border-bottom:1px solid var(--b1);font-family:var(--mono)}
    .scc-row .t{font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
    .scc-row:hover{background:var(--s2)}
    .scc-row .cc{color:#6A5BD0}
    .scc-row.sincae{color:#b91c1c}
    .scc-tot{background:var(--s2);border-top:2px solid var(--acc);font-weight:700;position:sticky;bottom:0}
    .scc-nota{margin:10px 12px;padding:8px 12px;border-radius:6px;font-size:12px;background:rgba(226,75,74,.10);color:#b91c1c}
    .scc-rr{display:grid;gap:8px;padding:6px 4px;border-top:1px solid var(--b1);font-family:var(--mono);font-size:13px}
    .scc-rr.hd{font-family:inherit;font-size:11px;color:var(--t2);border-top:0}
    .scc-rr.tot{font-weight:700;background:var(--s2);border-top:2px solid var(--acc)}
  `;
  document.head.appendChild(st);
}

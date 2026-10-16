// ═══════════════════════════════════════════════════════════
// SALDOS CONTABLES (Ricardo, Oct 2026)
// Saldo contable de cada cliente de una empresa a una fecha.
// El cálculo lo hace el server: GET /informes/saldos-contables
// ═══════════════════════════════════════════════════════════

let _scData = null;

// Estilos de la pantalla en UN solo lugar
(function(){
  if(document.getElementById('sc-estilos')) return;
  const st=document.createElement('style'); st.id='sc-estilos';
  st.textContent=`
    .sc-grid{display:grid;grid-template-columns:90px minmax(240px,1fr) 140px 160px;gap:8px;
             align-items:center;padding:4px 12px;white-space:nowrap;font-size:12px}
    .sc-head{font-size:11px;font-weight:600;color:var(--t2);background:var(--s3);
             border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:1;padding:7px 12px}
    .sc-row{font-family:var(--mono);border-bottom:1px solid var(--b1)}
    .sc-row:nth-child(even){background:var(--s2)}
    .sc-neg{color:var(--red)}
    .sc-tot{font-family:var(--mono);font-weight:700;border-top:2px solid var(--acc);padding:7px 12px}
    .sc-r{text-align:right}
    .sc-cod{color:var(--acc)}
    .sc-razon{overflow:hidden;text-overflow:ellipsis;font-family:var(--sans,inherit)}
    .sc-vacio{color:var(--t3);padding:24px;text-align:center}`;
  document.head.appendChild(st);
})();

function scHoyIso(){ const h=new Date(); return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0'); }
function scFecha(iso){ return iso ? iso.substring(0,10).split('-').reverse().join('/') : '—'; }
function scFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function scEmpNom(e){ return e==='T' ? 'Tressa Argentina' : 'Hatsu Electronics'; }

function scInit(){
  const h=document.getElementById('sc-hasta');
  if(h && !h.value) h.value=scHoyIso();
  if(!_scData) scRender();
}

async function scConsultar(){
  const emp=document.getElementById('sc-empresa').value;
  const hasta=document.getElementById('sc-hasta').value;
  if(!emp){ sgvAviso({titulo:'Falta la empresa', texto:'Elegí la empresa.', tipo:'adv'}); return; }
  if(!hasta){ sgvAviso({titulo:'Falta la fecha', texto:'Completá hasta qué fecha.', tipo:'adv'}); return; }
  const body=document.getElementById('sc-body');
  body.innerHTML='<div class="sc-vacio">⏳ Calculando saldos…</div>';
  try{
    const r=await apiGet(`/informes/saldos-contables?empresa=${emp}&hasta=${hasta}`);
    if(!r.ok){ body.innerHTML=`<div class="sc-vacio" style="color:var(--red)">${esc(r.error||'Error')}</div>`; return; }
    _scData=r; scRender();
  }catch(e){
    body.innerHTML=`<div class="sc-vacio" style="color:var(--red)">Error: ${esc(e.message||'')}</div>`;
  }
}

function scRender(){
  const body=document.getElementById('sc-body'); if(!body) return;
  if(!_scData){ body.innerHTML='<div class="sc-vacio">Elegí la empresa y la fecha, y apretá Consultar.</div>'; return; }
  const F=_scData.filas||[];
  if(!F.length){ body.innerHTML='<div class="sc-vacio">No hay clientes con saldo contable a esa fecha.</div>'; return; }
  body.innerHTML=
    `<div class="sc-grid sc-head"><span>Código</span><span>Razón social</span><span>CUIT</span><span class="sc-r">Saldo</span></div>`
    + F.map(x=>`<div class="sc-grid sc-row">
        <span class="sc-cod">${esc(x.cod)}</span>
        <span class="sc-razon" title="${esc(x.razon)}">${esc(x.razon)}</span>
        <span>${esc(x.cuit||'')}</span>
        <span class="sc-r${x.saldo<0?' sc-neg':''}">${scFmt(x.saldo)}</span></div>`).join('')
    + `<div class="sc-grid sc-tot"><span></span><span>${F.length} cliente${F.length===1?'':'s'}</span><span></span>
        <span class="sc-r${_scData.total<0?' sc-neg':''}">${scFmt(_scData.total)}</span></div>`;
}

function scSubtitulo(){ return `${scEmpNom(_scData.empresa)} · Al ${scFecha(_scData.hasta)}`; }

function scImprimir(){
  if(!_scData || !(_scData.filas||[]).length){ toast('Consultá primero','err'); return; }
  const F=_scData.filas;
  const filas=F.map(x=>`<tr><td>${esc(x.cod)}</td><td>${esc(sgvCorta(x.razon,40))}</td><td>${esc(x.cuit||'')}</td>
      <td class="r"${x.saldo<0?' style="color:#c00"':''}>${scFmt(x.saldo)}</td></tr>`).join('');
  sgvPrint({ titulo:'Saldos Contables', subtitulo:scSubtitulo(),
    cuerpo:`<table><thead><tr><th>Código</th><th>Razón social</th><th>CUIT</th><th class="r">Saldo</th></tr></thead>
      <tbody>${filas}</tbody>
      <tr class="fin"><td></td><td>${F.length} clientes</td><td></td><td class="r">${scFmt(_scData.total)}</td></tr></table>` });
}

// Excel CON FORMATO
async function scExcel(){
  if(!_scData || !(_scData.filas||[]).length){ toast('Consultá primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const sc=document.createElement('script');
      sc.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      sc.onload=res; sc.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(sc); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_scData, F=D.filas, NUM='#,##0.00;[Red]-#,##0.00';
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Saldos');
  ws.columns=[{width:12},{width:46},{width:16},{width:18}];
  ws.addRow(['Saldos Contables']).font={bold:true,size:13};
  ws.addRow([scSubtitulo()]).font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow(['Código','Razón social','CUIT','Saldo']);
  hr.eachCell(c=>{ c.font={bold:true}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8EAED'}};
                   c.border={bottom:{style:'thin'}}; });
  hr.getCell(4).alignment={horizontal:'right'};
  F.forEach(x=>{ const r=ws.addRow([x.cod, x.razon, x.cuit||'', Number(x.saldo)||0]); r.getCell(4).numFmt=NUM; });
  const rt=ws.addRow(['', `${F.length} clientes`, '', Number(D.total)||0]);
  rt.font={bold:true}; rt.getCell(4).numFmt=NUM;
  rt.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
  ws.views=[{state:'frozen', ySplit:4}];
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`SaldosContables_${D.empresa}_${(D.hasta||'').replace(/-/g,'')}.xlsx`;
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

// Se inicializa sola cada vez que la pantalla pasa a estar visible
(function(){
  const arrancar=()=>{
    const pg=document.getElementById('page-salcont');
    if(!pg || !('MutationObserver' in window)) return;
    let visible=pg.offsetParent!==null;
    const chequear=()=>{ const ahora=pg.offsetParent!==null; if(ahora && !visible) scInit(); visible=ahora; };
    const obs=new MutationObserver(chequear);
    obs.observe(pg,{attributes:true,attributeFilter:['class','style']});
    if(pg.parentElement) obs.observe(pg.parentElement,{attributes:true,attributeFilter:['class','style']});
    if(visible) scInit();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

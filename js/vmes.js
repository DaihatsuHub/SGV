// ═══════════════════════════════════════════════════════════
// VENTAS MENSUALES x ARTÍCULO
// ═══════════════════════════════════════════════════════════

let FAC_ITEMS_ALL = null;   // cache del detalle de ventas (se carga 1 vez)
let _vmesRows = [], _vmesMonths = [];
const VMES_MES3 = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function vmesMonths(n){
  const t=new Date(); let y=t.getFullYear(), m=t.getMonth(); // m: 0-11
  const arr=[];
  for(let i=0;i<n;i++){
    let mm=m-i, yy=y;
    while(mm<0){ mm+=12; yy--; }
    arr.push({ key:`${yy}-${String(mm+1).padStart(2,'0')}`, label:VMES_MES3[mm] });
  }
  return arr; // más reciente primero
}

function vmesRenderMarcas(){
  const box=document.getElementById('vmes-marcas'); if(!box) return;
  const marc=(TABLAS['MARC']||[]);
  box.innerHTML = marc.length
    ? marc.map(m=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--txt);cursor:pointer">
        <input type="checkbox" value="${esc(m.CODIGO)}" style="accent-color:var(--acc);cursor:pointer"> ${esc(m.CODIGO)}</label>`).join('')
    : '<span style="color:var(--t3);font-size:12px">No hay marcas cargadas.</span>';
}
function vmesSetAllMarcas(on){ document.querySelectorAll('#vmes-marcas input').forEach(c=>c.checked=on); }

async function vmesGenerar(){
  const n=parseInt(document.getElementById('vmes-meses').value)||6;
  const marcas=[...document.querySelectorAll('#vmes-marcas input:checked')].map(c=>c.value);
  const status=document.getElementById('vmes-status');
  if(!marcas.length){ toast('Seleccioná al menos una marca','err'); return; }

  if(FAC_ITEMS_ALL===null){
    if(status) status.textContent='Cargando detalle de ventas…';
    try{ FAC_ITEMS_ALL=await sbGetAll('fac_items','id'); }
    catch(e){ console.error('fac_items:', e); toast('Error cargando detalle de ventas','err'); if(status) status.textContent=''; return; }
  }
  if(status) status.textContent='Calculando…';

  const months=vmesMonths(n);
  const monthKeys=new Set(months.map(m=>m.key));

  // facturas dentro del rango: fac_nro -> {mk, tipo}
  const facMap={};
  (FACS||[]).forEach(f=>{
    const mk=(f.fac_fec||'').substring(0,7);
    if(!monthKeys.has(mk)) return;
    facMap[(f.fac_nro||'').trim()]={ mk, tipo:(f.fac_nro||'').trim().slice(-1).toUpperCase() };
  });

  // ventas por artículo y mes (F suma, C resta)
  const ventas={};
  (FAC_ITEMS_ALL||[]).forEach(it=>{
    const fm=facMap[(it.ite_nro||'').trim()]; if(!fm) return;
    const art=(it.ite_art||'').trim(); if(!art) return;
    const q=Number(it.ite_can)||0;
    const signed = fm.tipo==='C' ? -q : (fm.tipo==='F' ? q : 0);
    if(!signed) return;
    (ventas[art]||(ventas[art]={}));
    ventas[art][fm.mk]=(ventas[art][fm.mk]||0)+signed;
  });

  // último despacho por artículo (por fecha)
  const ultDesp={};
  (DESPS||[]).forEach(d=>{
    const art=(d.dep_art||'').trim(); if(!art) return;
    if(!ultDesp[art] || (d.dep_fec||'')>(ultDesp[art].dep_fec||'')) ultDesp[art]=d;
  });

  // filas (filtradas por marca; sin ventas y stock 0 -> no mostrar)
  const marcaSet=new Set(marcas);
  const rows=[];
  (ARTS||[]).forEach(a=>{
    if(!marcaSet.has((a.ART_MARCA||'').trim())) return;
    const art=(a.ART_COD||'').trim();
    const v=ventas[art]||{};
    const stock=(Number(a.ART_STK)||0)+(Number(a.ART_STKT)||0);
    const mes=months.map(m=>v[m.key]||0);
    const totalVentas=mes.reduce((s,q)=>s+q,0);
    if(totalVentas===0 && stock===0) return;
    const d=ultDesp[art];
    const fob=d?Number(d.dep_fob)||0:0;
    const gas2=d?Number(d.dep_gas2)||0:0;
    rows.push({
      cod:art, pr:(a.ART_PROV||'').trim(), marca:(a.ART_MARCA||'').trim(),
      mes, stock,
      dfec:d?d.dep_fec:'', ding:d?(Number(d.dep_ent)||0):0,
      precio:Number(a.ART_PRE)||0, fob, gas2, costo:fob*(1+gas2/100)
    });
  });
  rows.sort((a,b)=>a.cod.localeCompare(b.cod));
  _vmesRows=rows; _vmesMonths=months;
  vmesRender(rows, months);
  if(status) status.textContent=`${rows.length} artículo(s)`;
}

function vmesRender(rows, months){
  const head=document.getElementById('vmes-thead');
  const body=document.getElementById('vmes-body');
  if(!head||!body) return;
  const grid=`120px 46px 100px ${months.map(()=>'58px').join(' ')} 72px 92px 64px 100px 78px 70px 92px`;
  head.style.gridTemplateColumns=grid;
  head.innerHTML=
    `<span>Código</span><span>PR</span><span>Marca</span>`
    + months.map(m=>`<span style="text-align:right">${m.label}</span>`).join('')
    + `<span style="text-align:right">Stock</span><span>DFec</span><span style="text-align:right">DIng</span><span style="text-align:right">Precio</span><span style="text-align:right">FOB</span><span style="text-align:right">Gasto2</span><span style="text-align:right">Costo2</span>`;
  if(!rows.length){ body.innerHTML='<div class="empty">Sin resultados — probá otras marcas o más meses.</div>'; return; }
  const numF=v=>(v||0).toLocaleString('es-AR');
  const fdate=d=>{ if(!d) return ''; const p=d.substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:''; };
  body.innerHTML=rows.map(r=>{
    return `<div class="tr-art" style="grid-template-columns:${grid}">
      <span class="col-cod" style="color:var(--acc)">${esc(r.cod)}</span>
      <span class="col-sm">${esc(r.pr)}</span>
      <span class="col-sm" style="font-family:var(--mono)">${esc(r.marca)}</span>
      ${r.mes.map(q=>`<span style="text-align:right;font-family:var(--mono)">${q?numF(q):''}</span>`).join('')}
      <span style="text-align:right;font-family:var(--mono);${r.stock>0?'color:var(--grn);font-weight:600':''}">${numF(r.stock)}</span>
      <span class="col-sm">${fdate(r.dfec)}</span>
      <span style="text-align:right;font-family:var(--mono)">${r.ding?numF(r.ding):''}</span>
      <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.precio)}</span>
      <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.fob)}</span>
      <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.gas2)}</span>
      <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.costo)}</span>
    </div>`;
  }).join('');
}

// ── Salida a Excel (CSV es-AR: separador ; y coma decimal) ──
function vmesExportar(){
  if(!_vmesRows.length){ toast('Generá el listado primero','err'); return; }
  const rows=_vmesRows.slice().sort((a,b)=> (a.marca||'').localeCompare(b.marca||'') || a.cod.localeCompare(b.cod));
  const sep=';';
  const csvEsc=v=>{ v=(v==null?'':String(v)); return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
  const money=v=>(Number(v)||0).toFixed(2).replace('.',',');
  const qty=v=>{ const n=Number(v)||0; return Number.isInteger(n)?String(n):String(n).replace('.',','); };
  const fdate=d=>{ if(!d) return ''; const p=d.substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:''; };
  const head=['Marca','Código','PR', ..._vmesMonths.map(m=>m.label), 'Stock','DFec','DIng','Precio','FOB','Gasto2','Costo2'];
  const lines=[head.map(csvEsc).join(sep)];
  rows.forEach(r=>{
    const cells=[ r.marca, r.cod, r.pr,
      ...r.mes.map(q=>q?qty(q):''),
      qty(r.stock), fdate(r.dfec), r.ding?qty(r.ding):'',
      money(r.precio), money(r.fob), money(r.gas2), money(r.costo) ];
    lines.push(cells.map(csvEsc).join(sep));
  });
  const csv='\uFEFF'+lines.join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='ventas_mensuales_x_articulo.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

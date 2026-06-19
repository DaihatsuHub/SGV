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
  const marcaSet=new Set(marcas.map(m=>(m||'').trim().toUpperCase()));
  const rows=[];
  (ARTS||[]).forEach(a=>{
    if(!marcaSet.has((a.ART_MARCA||'').trim().toUpperCase())) return;
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

// ── Salida a Excel (.xlsx con ExcelJS) ────────────────────
function vmesLoadExcelJS(){
  if(typeof ExcelJS!=='undefined') return Promise.resolve();
  const urls=[
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
    'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
    'https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js'
  ];
  return new Promise((resolve,reject)=>{
    let i=0;
    const tryNext=()=>{
      if(typeof ExcelJS!=='undefined') return resolve();
      if(i>=urls.length) return reject(new Error('No se pudo cargar ExcelJS'));
      const sc=document.createElement('script');
      sc.src=urls[i++];
      sc.onload=()=>resolve();
      sc.onerror=()=>{ sc.remove(); tryNext(); };
      document.head.appendChild(sc);
    };
    tryNext();
  });
}

async function vmesExportar(){
  if(!_vmesRows.length){ toast('Generá el listado primero','err'); return; }
  const status=document.getElementById('vmes-status');
  try{
    if(status) status.textContent='Generando Excel…';
    await vmesLoadExcelJS();
  }catch(e){ console.error(e); toast('No se pudo cargar Excel (¿sin conexión?)','err'); if(status) status.textContent=''; return; }

  const rows=_vmesRows.slice().sort((a,b)=> (a.marca||'').localeCompare(b.marca||'') || a.cod.localeCompare(b.cod));
  const months=_vmesMonths;
  const nM=months.length;
  const fdate=d=>{ if(!d) return ''; const p=d.substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:''; };

  const ORANGE='FFFFA500', BLACK='FF000000';
  const orangeFill={type:'pattern',pattern:'solid',fgColor:{argb:ORANGE}};
  const blackFill ={type:'pattern',pattern:'solid',fgColor:{argb:BLACK}};
  const thin={style:'thin',color:{argb:BLACK}};
  const allB={top:thin,left:thin,right:thin,bottom:thin};

  // columnas: ... Stock | [COLUMNA NEGRA ~1cm] | DFec ...
  const headers=['Marca','Código','PR', ...months.map(m=>m.label), 'Stock','', 'DFec','DIng','Precio','FOB','Gasto2','Costo2'];
  const widths =[10,16,6, ...months.map(()=>8), 9, 1, 10,9,12,10,9,11];

  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('Ventas mensuales');
  ws.columns=widths.map(w=>({width:w}));

  // posiciones (1-based)
  const cM0=4, cMn=3+nM, cStock=4+nM, cBlack=5+nM, cDFec=6+nM, cDIng=7+nM, cPrecio=8+nM, cFob=9+nM, cGas=10+nM, cCosto=11+nM;
  const totalCols=headers.length;

  // títulos: negrita + centrados + fondo naranja (col negra va negra)
  const hr=ws.addRow(headers);
  hr.eachCell({includeEmpty:true},(cell,col)=>{
    cell.font={bold:true};
    cell.alignment={horizontal:'center',vertical:'middle'};
    cell.fill = (col===cBlack)?blackFill:orangeFill;
    cell.border=allB;
  });

  let prevMarca=null;
  rows.forEach(r=>{
    // separador entre marcas: fila negra a todo el ancho (hasta Costo)
    if(prevMarca!==null && r.marca!==prevMarca){
      const sep=ws.addRow([]); sep.height=7;
      for(let i=1;i<=totalCols;i++){ sep.getCell(i).fill=blackFill; sep.getCell(i).border=allB; }
    }
    prevMarca=r.marca;

    const vals=[ r.marca, r.cod, r.pr,
      ...r.mes.map(q=>q||null),
      r.stock||0, '', fdate(r.dfec), r.ding||null,
      r.precio||0, r.fob||0, r.gas2||0, r.costo||0 ];
    const row=ws.addRow(vals);
    for(let i=cM0;i<=cMn;i++){ row.getCell(i).numFmt='#,##0'; row.getCell(i).alignment={horizontal:'right'}; }
    row.getCell(cStock).numFmt='#,##0'; row.getCell(cStock).alignment={horizontal:'right'};
    row.getCell(cDIng).numFmt='#,##0';  row.getCell(cDIng).alignment={horizontal:'right'};
    [cPrecio,cFob,cGas,cCosto].forEach(ci=>{ row.getCell(ci).numFmt='#,##0.00'; row.getCell(ci).alignment={horizontal:'right'}; });
    row.getCell(cDFec).alignment={horizontal:'center'};
    // fondos naranja en Código y Stock
    row.getCell(2).fill=orangeFill;
    row.getCell(cStock).fill=orangeFill;
    // columna negra separadora
    row.getCell(cBlack).fill=blackFill;
    // borde simple en toda la fila
    for(let i=1;i<=totalCols;i++) row.getCell(i).border=allB;
  });

  ws.views=[{state:'frozen', ySplit:1}];

  try{
    const buf=await wb.xlsx.writeBuffer();
    const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='ventas_mensuales_x_articulo.xlsx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(status) status.textContent=`${rows.length} artículo(s)`;
  }catch(e){ console.error(e); toast('Error generando el Excel','err'); if(status) status.textContent=''; }
}

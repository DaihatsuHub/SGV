// ═══════════════════════════════════════════════════════════
// VENTAS MENSUALES x ARTÍCULO
// ═══════════════════════════════════════════════════════════

let _vmesRows = [], _vmesMonths = [], _vmesFiltrado = false;
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
  vmesMarcasCant();
}
function vmesSetAllMarcas(on){ document.querySelectorAll('#vmes-marcas input').forEach(c=>c.checked=on); vmesMarcasCant(); }

// ── Filtros de cliente y vendedor ─────────────────────────
// Al elegir uno de los dos, el listado deja de ser "qué hay" y pasa a ser
// "qué le vendí a este". Por eso se ocultan Stock y los datos del despacho:
// no son del cliente, y mostrarlos confunde.
function vmesFillFiltros(){
  const cli=document.getElementById('vmes-cli');
  const dl=document.getElementById('vmes-cli-list');
  const sv=document.getElementById('vmes-vend');

  // La RAZÓN SOCIAL va primero: el datalist del navegador filtra por el
  // principio del texto, así que con el código adelante no se puede buscar
  // por nombre. Y autocomplete off para no ofrecer los últimos escritos.
  if(dl) dl.innerHTML=(CLIS||[]).map(c=>
    `<option value="${esc((c.CLI_RAZON||'').trim())} — ${esc((c.CLI_CODIGO||'').trim())}">`).join('');
  if(cli){ cli.setAttribute('autocomplete','off'); cli.removeAttribute('name'); cli.disabled=false; }

  if(sv && sv.options.length<=1){
    sv.innerHTML='<option value="">Todos los vendedores</option>'+
      (TABLAS['VEND']||[]).map(v=>`<option value="${esc(v.CODIGO)}">${esc(v.CODIGO)} — ${esc(v.DETALLE)}</option>`).join('');
  }
  if(sv) sv.disabled=false;
  [['vmes-rubro','RUBR','Todos los rubros'],['vmes-srub','SRUB','Todos los subrubros']].forEach(([id,k,t])=>{
    const e=document.getElementById(id);
    if(e && e.options.length<=1) e.innerHTML=`<option value="">${t}</option>`+
      (TABLAS[k]||[]).map(x=>`<option value="${esc(x.CODIGO)}">${esc(x.CODIGO)} — ${esc(x.DETALLE)}</option>`).join('');
  });

  // Cliente y vendedor son EXCLUYENTES: un cliente pertenece a un vendedor,
  // combinarlos no aporta nada. Se ATENÚA el otro, no se deshabilita:
  // deshabilitar el input rompe el desplegable del datalist.
  if(cli && !cli._vmesSync){
    cli._vmesSync=true;
    ['input','change','keyup','search','blur'].forEach(ev=>cli.addEventListener(ev, vmesSyncFiltros));
  }
  if(sv && !sv._vmesSync){
    sv._vmesSync=true;
    sv.addEventListener('change', function(){ if(sv.value && cli) cli.value=''; vmesSyncFiltros(); });
  }
  vmesSyncFiltros();
  vmesFiltrosCant();
}

function vmesSyncFiltros(){
  const cli=document.getElementById('vmes-cli'), sv=document.getElementById('vmes-vend');
  if(!cli||!sv) return;
  const hayCli=!!vmesCliCod(), hayVend=!!(sv.value||'').trim();
  sv.style.opacity  = hayCli ? .45 : 1;
  cli.style.opacity = hayVend ? .45 : 1;
  cli.placeholder   = hayVend ? '(vendedor seleccionado)' : 'Todos los clientes';
  if(hayCli && sv.value) sv.value='';
}

// Código de cliente a partir del input. El valor visible es "Razón — CÓDIGO".
// Devuelve '' si no matchea ninguno: no se filtra por texto suelto.
function vmesCliCod(){
  const val=(document.getElementById('vmes-cli')?.value||'').trim();
  if(!val) return '';
  const cod=(val.split('—').pop()||'').trim().toUpperCase();
  let c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===cod);
  if(!c) c=(CLIS||[]).find(x=>(x.CLI_RAZON||'').trim().toUpperCase()===val.toUpperCase());
  if(!c) c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===val.toUpperCase());
  return c ? (c.CLI_CODIGO||'').trim() : '';
}
function vmesLimpiarCli(){
  const cli=document.getElementById('vmes-cli'), sv=document.getElementById('vmes-vend');
  if(cli){ cli.value=''; cli.disabled=false; }
  if(sv){ sv.value=''; sv.disabled=false; }
  vmesSyncFiltros();
  if(cli) cli.focus();
}

// El cálculo lo hace el SERVER (/informes/vmes). Antes se bajaban los ~27.000
// fac_items al navegador y se cruzaban en memoria: tardaba lo mismo con filtro
// que sin él, porque el filtro se aplicaba al final. Ahora el server filtra las
// facturas ANTES de traer los ítems, así que con un cliente es inmediato.
async function vmesGenerar(){
  const n=parseInt(document.getElementById('vmes-meses').value)||6;
  const marcas=[...document.querySelectorAll('#vmes-marcas input:checked')].map(c=>c.value);
  const status=document.getElementById('vmes-status');
  if(!marcas.length){ toast('Seleccioná al menos una marca','err'); return; }

  const cli=vmesCliCod();
  const vend=(document.getElementById('vmes-vend')?.value||'').trim();

  if(status) status.textContent='Calculando…';
  try{
    const qs=['meses='+n, 'marcas='+encodeURIComponent(marcas.join(','))];
    if(cli)  qs.push('cli='+encodeURIComponent(cli));
    if(vend) qs.push('vend='+encodeURIComponent(vend));
    const rub=(document.getElementById('vmes-rubro')?.value||'').trim(), srub=(document.getElementById('vmes-srub')?.value||'').trim();
    if(rub)  qs.push('rubro='+encodeURIComponent(rub));
    if(srub) qs.push('srub='+encodeURIComponent(srub));
    const r=await apiGet('/informes/vmes?'+qs.join('&'));
    if(!r.ok){ toast(r.error||'Error al generar','err'); if(status) status.textContent=''; return; }

    _vmesRows=r.filas||[]; _vmesMonths=r.meses||[]; _vmesFiltrado=!!r.filtrado;
    vmesRender(_vmesRows, _vmesMonths);
    if(status){
      const quien=[];
      if(cli)  quien.push('cliente '+cli);
      if(vend) quien.push('vendedor '+vend);
      status.textContent=`${_vmesRows.length} artículo(s)`+(quien.length?' · '+quien.join(' · '):'');
    }
  }catch(e){
    console.error('vmesGenerar:', e);
    toast('Error al generar el listado','err');
    if(status) status.textContent='';
  }
}

function vmesRender(rows, months){
  const head=document.getElementById('vmes-thead');
  const body=document.getElementById('vmes-body');
  if(!head||!body) return;
  // Con filtro de cliente/vendedor se ocultan Stock y los datos del despacho:
  // no son de ese cliente y mostrarlos confunde. Queda "qué le vendí, mes a mes".
  const filt=_vmesFiltrado;
  const grid = filt
    ? `120px 100px ${months.map(()=>'58px').join(' ')} 72px 100px`
    : `120px 100px ${months.map(()=>'58px').join(' ')} 72px 64px 92px 64px 100px 78px 70px 92px`;
  head.style.gridTemplateColumns=grid;
  head.innerHTML=
    `<span>Código</span><span>Marca</span>`
    + months.map(m=>`<span style="text-align:right">${m.label}</span>`).join('')
    + (filt
        ? `<span style="text-align:right">Total</span><span style="text-align:right">Precio</span>`
        : `<span style="text-align:right">Stock</span><span style="text-align:right;background:#000;color:#fff;font-weight:700;padding:0 4px;border-radius:2px">REPO</span><span>DFec</span><span style="text-align:right">DIng</span><span style="text-align:right">Precio</span><span style="text-align:right">FOB</span><span style="text-align:right">Gasto2</span><span style="text-align:right">Costo2</span>`);
  if(!rows.length){ body.innerHTML='<div class="empty">Sin resultados — probá otras marcas, otro cliente o más meses.</div>'; return; }
  const numF=v=>(v||0).toLocaleString('es-AR');
  const fdate=d=>{ if(!d) return ''; const p=d.substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:''; };
  body.innerHTML=rows.map(r=>{
    const tot=r.mes.reduce((s,q)=>s+q,0);
    return `<div class="tr-art" style="grid-template-columns:${grid}">
      <span class="col-cod" style="color:var(--acc)">${esc(r.cod)}</span>
      <span class="col-sm" style="font-family:var(--mono)">${esc(r.marca)}</span>
      ${r.mes.map(q=>`<span style="text-align:right;font-family:var(--mono)">${q?numF(q):''}</span>`).join('')}
      ${filt
        ? `<span style="text-align:right;font-family:var(--mono);font-weight:600;color:var(--grn)">${numF(tot)}</span>
           <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.precio)}</span>`
        : `<span style="text-align:right;font-family:var(--mono);${r.stock>0?'color:var(--grn);font-weight:600':''}">${numF(r.stock)}</span>
           <span style="text-align:right;font-family:var(--mono);font-weight:700">${r.repo?numF(r.repo):''}</span>
           <span class="col-sm">${fdate(r.dfec)}</span>
           <span style="text-align:right;font-family:var(--mono)">${r.ding?numF(r.ding):''}</span>
           <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.precio)}</span>
           <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.fob)}</span>
           <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.gas2)}</span>
           <span style="text-align:right;font-family:var(--mono)">${reciFmt(r.costo)}</span>`}
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
  const filt=_vmesFiltrado;
  const headers = filt
    ? ['Marca','Código', ...months.map(m=>m.label), 'Total','', 'Precio']
    : ['Marca','Código', ...months.map(m=>m.label), 'Stock','REPO','', 'DFec','DIng','Precio','FOB','Gasto2','Costo2'];
  const widths = filt
    ? [10,16, ...months.map(()=>8), 10, 1, 12]
    : [10,16, ...months.map(()=>8), 9, 9, 1, 10,9,12,10,9,11];

  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('Ventas mensuales');
  ws.columns=widths.map(w=>({width:w}));

  // posiciones (1-based)
  // Sin PR; REPO va después de Stock (sólo sin filtro)
  const cM0=3, cMn=2+nM, cStock=3+nM;
  const cRepo = filt ? null : 4+nM;
  const off = filt ? 0 : 1;
  const cBlack=4+nM+off, cDFec=5+nM+off, cDIng=6+nM+off, cPrecio=7+nM+off, cFob=8+nM+off, cGas=9+nM+off, cCosto=10+nM+off;
  const totalCols=headers.length;

  // títulos: negrita + centrados + fondo naranja (col negra va negra)
  const hr=ws.addRow(headers);
  hr.eachCell({includeEmpty:true},(cell,col)=>{
    cell.font={bold:true};
    cell.alignment={horizontal:'center',vertical:'middle'};
    cell.fill = (col===cBlack||col===cRepo)?blackFill:orangeFill;
    if(col===cRepo) cell.font={bold:true,color:{argb:'FFFFFFFF'}};
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

    const vals = filt
      ? [ r.marca, r.cod, ...r.mes.map(q=>q||null),
          r.mes.reduce((s,q)=>s+q,0)||0, '', r.precio||0 ]
      : [ r.marca, r.cod, ...r.mes.map(q=>q||null),
          r.stock||0, r.repo||null, '', fdate(r.dfec), r.ding||null,
          r.precio||0, r.fob||0, r.gas2||0, r.costo||0 ];
    const row=ws.addRow(vals);
    for(let i=cM0;i<=cMn;i++){ row.getCell(i).numFmt='#,##0'; row.getCell(i).alignment={horizontal:'right'}; }
    row.getCell(cStock).numFmt='#,##0'; row.getCell(cStock).alignment={horizontal:'right'};
    if(cRepo){ row.getCell(cRepo).numFmt='#,##0'; row.getCell(cRepo).alignment={horizontal:'right'}; row.getCell(cRepo).font={bold:true}; }
    if(filt){
      row.getCell(cDFec).numFmt='#,##0.00'; row.getCell(cDFec).alignment={horizontal:'right'};
    } else {
      row.getCell(cDIng).numFmt='#,##0';  row.getCell(cDIng).alignment={horizontal:'right'};
      [cPrecio,cFob,cGas,cCosto].forEach(ci=>{ row.getCell(ci).numFmt='#,##0.00'; row.getCell(ci).alignment={horizontal:'right'}; });
      row.getCell(cDFec).alignment={horizontal:'center'};
    }
    // fondos naranja en Código y Stock; Precio naranja + negrita
    row.getCell(2).fill=orangeFill;
    row.getCell(cStock).fill=orangeFill;
    if(!filt){ row.getCell(cPrecio).fill=orangeFill; row.getCell(cPrecio).font={bold:true}; }
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
    a.download='ventas_mensuales_x_articulo'+(filt?'_filtrado':'')+'.xlsx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    if(status) status.textContent=`${rows.length} artículo(s)`;
  }catch(e){ console.error(e); toast('Error generando el Excel','err'); if(status) status.textContent=''; }
}

// Barra en un renglón (Nov 2026): los botones Marcas y Filtros muestran
// cuántos hay elegidos y se pintan si hay alguno
function vmesMarcasCant(){
  const n=document.querySelectorAll('#vmes-marcas input:checked').length;
  const b=document.getElementById('vmes-mbtn'); if(!b) return;
  b.textContent = n ? `🏷 Marcas (${n}) ▾` : '🏷 Marcas ▾';
  b.classList.toggle('tb-act', !!n);
}
function vmesFiltrosCant(){
  const n=['vmes-vend','vmes-rubro','vmes-srub'].filter(id=>document.getElementById(id)?.value).length;
  const b=document.getElementById('vmes-fbtn'); if(!b) return;
  b.textContent = n ? `🔽 Filtros (${n}) ▾` : '🔽 Filtros ▾';
  b.classList.toggle('tb-act', !!n);
}
function vmesLimpiarFiltros(){
  ['vmes-vend','vmes-rubro','vmes-srub'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  vmesSyncFiltros(); vmesFiltrosCant();
}


/* ===========================================================================
   SUGERENCIA DE REPOSICIÓN (Ricardo, Nov 2026)
   Sale de los datos del informe (servidor): ventas por mes, stock, REPO (OC
   pendientes sin derechos pagados) y el último ingreso (fecha y cantidad).
   Por artículo:
   - VENTA MENSUAL: si el último ingreso cae dentro del período, se toma lo
     vendido DESDE ese ingreso dividido los meses que pasaron (así un artículo
     que llegó hace poco no queda subestimado). Si no, el promedio del período,
     contando el mes en curso por los días que van.
   - NECESIDAD = venta mensual × meses a cubrir (3 = un trimestre).
   - SUGERIDO = necesidad − stock − REPO (redondeado hacia arriba).
   - COBERTURA = (stock + REPO) ÷ venta mensual, en meses.
   Se listan sólo los que tienen sugerido > 0, ordenados por código.
   =========================================================================== */
let _vsug=[];
// CÁLCULO "INTELIGENTE" (Ricardo, Nov 2026: "que estime realmente lo que reponer")
//  1) DISCONTINUADOS: si el último ingreso fue hace más de X meses (12 por
//     defecto) se asume que se liquidó y no se repone.
//  2) VENTA MENSUAL REAL:
//     - Si el último ingreso cae en el período y el artículo SE AGOTÓ, se mide
//       cuánto tardó en venderse el ingreso (no se cuentan los meses sin stock,
//       que bajan el promedio aunque no haya habido qué vender).
//     - Si cae en el período y no se agotó: lo vendido desde el ingreso ÷ los
//       meses que pasaron.
//     - Si no: promedio PONDERADO (los últimos 3 meses pesan 60%), para tomar
//       la tendencia.
//  3) BAJA ROTACIÓN: si a ese ritmo un ingreso como el último tarda más de Y
//     meses en venderse (6 por defecto), no se sugiere.
//  4) SUGERIDO = venta mensual × meses a cubrir − stock − REPO.
let _vsExcl={desc:[],lenta:[]};
function _vsCalc(meses, maxSinIng, maxRot){
  const hoy=new Date(), diasMes=new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate();
  const fracHoy=Math.max(hoy.getDate()/diasMes, 0.1);
  const nM=_vmesMonths.length, mesesEf=(nM-1)+fracHoy;
  const desdePer=nM?_vmesMonths[nM-1].key+'-01':'';
  const MS=1000*60*60*24*30.44;
  const out=[]; _vsExcl={desc:[],lenta:[]};
  for(const r of _vmesRows){
    const stock=Number(r.stock)||0, repo=Number(r.repo)||0, ding=Number(r.ding)||0;
    const df=String(r.dfec||'').substring(0,10);
    const mesesDesde = df ? Math.max((hoy-new Date(df+'T00:00:00'))/MS, 0.5) : null;
    let rate=0, base='';
    if(df && desdePer && df>=desdePer){
      const mk=df.substring(0,7);
      const cron=_vmesMonths.map((m,i)=>({k:m.key,v:Number(r.mes[i])||0})).filter(x=>x.k>=mk).reverse();   // del ingreso a hoy
      const vend=cron.reduce((t,x)=>t+x.v,0);
      if(stock<=0 && ding>0 && vend>=ding*0.9){
        // Se agotó: cuánto tardó en venderse
        let acum=0, k=0; for(;k<cron.length;k++){ acum+=cron[k].v; if(acum>=ding*0.9) break; }
        // Los datos son MENSUALES: menos de 1 mes no se puede medir (con 0,5 un
        // ingreso del día 31 daba ritmos absurdos, ej. A168WA-3A → 30/mes).
        const diaIng=Number(df.substring(8,10))||1;
        const tVenta=Math.max(k+1-(diaIng-1)/30, 1);
        const maxMes=Math.max(...cron.map(x=>x.v), 0);                   // nunca más que el mejor mes real
        const ritmoAgote=Math.min(ding/tVenta, maxMes);
        const prom=vend/mesesDesde;                                        // lo vendido desde el ingreso ÷ meses
        rate=Math.max(prom, ritmoAgote);
        base=`se agotó: el ingreso se vendió en ${tVenta.toFixed(1)} meses (ritmo ${ritmoAgote.toFixed(1)}/mes; promedio desde el ingreso ${prom.toFixed(1)}/mes; se toma el mayor)`;
      } else { rate=vend/mesesDesde; base=`desde el ingreso (${mesesDesde.toFixed(1)} meses)`; }
    } else if(nM>3){
      const ult3=(Number(r.mes[0])||0)+(Number(r.mes[1])||0)+(Number(r.mes[2])||0);
      const rest=(Number(r.total)||0)-ult3;
      rate=0.6*(ult3/(2+fracHoy)) + 0.4*(rest/(nM-3)); base='promedio ponderado (los últimos 3 meses pesan más)';
    } else { rate=(Number(r.total)||0)/mesesEf; base=`promedio de ${nM} meses`; }
    if(!(rate>0)) continue;
    const sug=Math.ceil(rate*meses-stock-repo);
    if(sug<=0) continue;
    const cob=(stock+repo)/rate;
    const mesesIng = ding ? ding/rate : null;
    const x={ cod:r.cod, marca:r.marca, des:r.des, dfec:df, ding, mesesIng, rate, stock, repo, cob, sug, base,
      costo:Number(r.costo)||0, impo:sug*(Number(r.costo)||0), mesesDesde };
    if(mesesDesde!==null && mesesDesde>maxSinIng){ x.motivo=`último ingreso hace ${Math.round(mesesDesde)} meses`; _vsExcl.desc.push(x); continue; }
    if(mesesIng!==null && mesesIng>maxRot){ x.motivo=`vender un ingreso como el último tarda ${mesesIng.toFixed(1)} meses`; _vsExcl.lenta.push(x); continue; }
    out.push(x);
  }
  const ord=(a,b)=>String(a.cod||'').localeCompare(String(b.cod||''));   // por código (Ricardo, Nov 2026)
  out.sort(ord); _vsExcl.desc.sort(ord); _vsExcl.lenta.sort(ord);
  return out;
}
function vmesSugerencia(){
  if(!_vmesRows.length){ toast('Generá el listado primero','err'); return; }
  if(_vmesFiltrado){ toast('La sugerencia se calcula sin filtro de cliente ni vendedor','err'); return; }
  document.getElementById('vsug-ov')?.remove();
  const ov=document.createElement('div'); ov.id='vsug-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML=`<div style="background:var(--s1);border-radius:12px;width:100%;max-width:1250px;height:90vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--b1);flex-wrap:wrap">
      <span style="font-weight:600;color:var(--acc)">🛒 Sugerencia de Reposición</span>
      <label style="font-size:12px;color:var(--t2);margin-left:10px">Meses a cubrir</label>
      <input id="vsug-meses" class="finp" type="number" min="1" max="12" step="1" value="3" style="width:56px;text-align:right" onchange="vmesSugRender()">
      <label style="font-size:12px;color:var(--t2)" title="Si el último ingreso es más viejo, se toma como discontinuado/liquidado">Discontinuado si no ingresa hace</label>
      <input id="vsug-maxing" class="finp" type="number" min="3" max="60" step="1" value="12" style="width:56px;text-align:right" onchange="vmesSugRender()"><span style="font-size:12px;color:var(--t2)">meses</span>
      <label style="font-size:12px;color:var(--t2)" title="Si a ese ritmo un ingreso como el último tarda más en venderse, no se sugiere">Baja rotación si el ingreso tarda más de</label>
      <input id="vsug-maxrot" class="finp" type="number" min="1" max="36" step="1" value="6" style="width:56px;text-align:right" onchange="vmesSugRender()"><span style="font-size:12px;color:var(--t2)">meses</span>
      <span id="vsug-res" style="font-size:12px;color:var(--t2)"></span>
      <span style="margin-left:auto;display:flex;gap:6px"><button class="btn" onclick="vmesSugPrint()">🖨 Imprimir</button>
        <button class="btn" onclick="vmesSugExcel()">⬇ Excel</button>
        <button class="btn" onclick="document.getElementById('vsug-ov').remove()">✕</button></span>
    </div>
    <div style="padding:6px 16px;font-size:11px;color:var(--t3);border-bottom:1px solid var(--b1)">Venta mensual: si el último ingreso se agotó, cuánto tardó en venderse; si no, lo vendido desde el ingreso; si el ingreso es anterior al período, promedio con más peso en los últimos 3 meses. Sugerido = venta mensual × meses − stock − REPO. No se sugieren los discontinuados ni los de baja rotación (van abajo, aparte). Pasá el mouse por un renglón para ver cómo se calculó.</div>
    <div id="vsug-body" style="flex:1;overflow:auto"></div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
  ov.addEventListener('keydown',e=>{ if(e.key==='Escape') ov.remove(); });
  vmesSugRender();
}
const _vsCols='110px 80px minmax(180px,1fr) 70px 55px 60px 70px 60px 55px 70px 80px 105px';
const _vsN=(n,d=0)=>(Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:d,maximumFractionDigits:d});
const _vsF=d=>{ if(!d) return '—'; const p=d.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(-2)}`; };
function vmesSugRender(){
  const m=Math.min(12,Math.max(1,parseInt(document.getElementById('vsug-meses')?.value)||3));
  const mi=Math.max(3,parseInt(document.getElementById('vsug-maxing')?.value)||12);
  const mr=Math.max(1,parseInt(document.getElementById('vsug-maxrot')?.value)||6);
  _vsug=_vsCalc(m, mi, mr);
  const body=document.getElementById('vsug-body'); if(!body) return;
  const tot=_vsug.reduce((s,x)=>s+x.impo,0), uni=_vsug.reduce((s,x)=>s+x.sug,0);
  const res=document.getElementById('vsug-res'); if(res) res.textContent=`${_vsug.length} artículo(s) · ${_vsN(uni)} unidades · costo estimado (FOB+gastos) ${_vsN(tot,2)}`;
  const excl=(tit,arr,color)=> !arr.length ? '' : `<details style="margin:10px 16px;border:1px solid var(--b1);border-radius:8px"><summary style="padding:8px 12px;cursor:pointer;font-size:12px;font-weight:600;color:${color}">${tit} · ${arr.length} artículo(s) no sugeridos</summary>`
    + arr.map(x=>`<div style="display:grid;grid-template-columns:110px minmax(180px,1fr) 70px 70px 60px minmax(200px,1.2fr);gap:6px;padding:4px 12px;border-top:1px solid var(--b1);font-size:12px">
        <span style="font-family:var(--mono);font-weight:700">${esc(x.cod)}</span><span class="cond" style="color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.des)}</span>
        <span style="font-family:var(--mono)">${_vsF(x.dfec)}</span><span style="text-align:right">${_vsN(x.rate,1)}/mes</span><span style="text-align:right">st ${_vsN(x.stock)}</span><span style="color:var(--t3)">${esc(x.motivo)}</span></div>`).join('') + '</details>';
  const extra = excl('🗄 Discontinuados / liquidados', _vsExcl.desc, 'var(--t2)') + excl('🐢 Baja rotación', _vsExcl.lenta, '#d97706');
  if(!_vsug.length){ body.innerHTML='<div class="empty" style="margin-top:40px">Con lo que hay y lo que viene alcanza para '+m+' mes(es) 👍</div>'+extra; return; }
  const hd=`<div style="display:grid;grid-template-columns:${_vsCols};gap:6px;padding:7px 16px;background:var(--s2);font-size:11px;color:var(--t2);position:sticky;top:0;z-index:2">
    <span>Código</span><span>Marca</span><span>Descripción</span><span>Últ. ingreso</span><span style="text-align:right">Cant.</span><span style="text-align:right" title="Meses que tarda en venderse un ingreso como el último">Vende en</span>
    <span style="text-align:right">Venta/mes</span><span style="text-align:right">Stock</span><span style="text-align:right">REPO</span><span style="text-align:right" title="Meses que cubre stock + REPO">Cobert.</span>
    <span style="text-align:right">Sugerido</span><span style="text-align:right">Costo est.</span></div>`;
  const filas=_vsug.map(x=>{
    const col=x.cob<1?'var(--red)':(x.cob<2?'#d97706':'var(--t2)');
    return `<div style="display:grid;grid-template-columns:${_vsCols};gap:6px;padding:5px 16px;border-bottom:1px solid var(--b1);font-size:12px;align-items:center" title="Venta mensual ${x.base}">
      <span style="font-family:var(--mono);font-weight:700">${esc(x.cod)}</span><span>${esc(x.marca)}</span>
      <span class="cond" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t2)">${esc(x.des)}</span>
      <span style="font-family:var(--mono)">${_vsF(x.dfec)}</span><span style="text-align:right">${x.ding?_vsN(x.ding):'—'}</span>
      <span style="text-align:right">${x.mesesIng==null?'—':_vsN(x.mesesIng,1)+' m'}</span>
      <span style="text-align:right;font-family:var(--mono)">${_vsN(x.rate,1)}</span><span style="text-align:right">${_vsN(x.stock)}</span>
      <span style="text-align:right">${x.repo?_vsN(x.repo):''}</span>
      <span style="text-align:right;font-weight:600;color:${col}">${_vsN(x.cob,1)}</span>
      <span style="text-align:right;font-weight:700;color:var(--acc);font-size:13px">${_vsN(x.sug)}</span>
      <span style="text-align:right;font-family:var(--mono)">${x.costo?_vsN(x.impo,2):'—'}</span></div>`; }).join('');
  body.innerHTML=hd+filas+extra;
}
function vmesSugPrint(){
  if(!_vsug.length){ toast('No hay sugerencias','err'); return; }
  const m=parseInt(document.getElementById('vsug-meses')?.value)||3;
  const tr=_vsug.map(x=>`<tr><td><b>${esc(x.cod)}</b></td><td>${esc(x.marca)}</td><td>${esc(sgvCorta?sgvCorta(x.des,38):x.des)}</td><td>${_vsF(x.dfec)}</td><td class="n">${x.ding?_vsN(x.ding):''}</td><td class="n">${x.mesesIng==null?'':_vsN(x.mesesIng,1)}</td><td class="n">${_vsN(x.rate,1)}</td><td class="n">${_vsN(x.stock)}</td><td class="n">${x.repo?_vsN(x.repo):''}</td><td class="n">${_vsN(x.cob,1)}</td><td class="n"><b>${_vsN(x.sug)}</b></td><td class="n">${x.costo?_vsN(x.impo,2):''}</td></tr>`).join('');
  const tot=_vsug.reduce((s,x)=>s+x.impo,0), uni=_vsug.reduce((s,x)=>s+x.sug,0);
  sgvPrint({ titulo:'Sugerencia de Reposición', subtitulo:`Para cubrir ${m} mes(es) · ${_vsug.length} artículos · ${_vsN(uni)} unidades · costo estimado (FOB+gastos) ${_vsN(tot,2)}`,
    cuerpo:`<table><thead><tr><th>Código</th><th>Marca</th><th>Descripción</th><th>Últ. ingreso</th><th class="n">Cant.</th><th class="n">Vende en (m)</th><th class="n">Venta/mes</th><th class="n">Stock</th><th class="n">REPO</th><th class="n">Cobert.</th><th class="n">Sugerido</th><th class="n">Costo est.</th></tr></thead><tbody>${tr}</tbody></table>` });
}
async function vmesSugExcel(){
  if(!_vsug.length){ toast('No hay sugerencias','err'); return; }
  try{ await vmesLoadExcelJS(); }catch(e){ toast('No se pudo cargar Excel','err'); return; }
  const m=parseInt(document.getElementById('vsug-meses')?.value)||3;
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Reposición');
  ws.columns=[{width:14},{width:12},{width:40},{width:11},{width:8},{width:8},{width:10},{width:8},{width:8},{width:9},{width:10},{width:14}];
  ws.addRow([`Sugerencia de Reposición — para cubrir ${m} mes(es)`]).font={bold:true,size:13};
  ws.addRow([]);
  const h=ws.addRow(['Código','Marca','Descripción','Últ. ingreso','Cant.','Vende en (meses)','Venta/mes','Stock','REPO','Cobert. (meses)','Sugerido','Costo est. (FOB+gastos)']);
  h.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  _vsug.forEach(x=>{ const r=ws.addRow([x.cod,x.marca,x.des,_vsF(x.dfec),x.ding||null,x.mesesIng==null?null:Math.round(x.mesesIng*10)/10,Math.round(x.rate*10)/10,x.stock,x.repo||null,Math.round(x.cob*10)/10,x.sug,x.costo?Math.round(x.impo*100)/100:null]);
    r.getCell(12).numFmt='#,##0.00'; });
  const t=ws.addRow(['','','Total','','','','','','','',_vsug.reduce((s,x)=>s+x.sug,0),_vsug.reduce((s,x)=>s+x.impo,0)]);
  t.font={bold:true}; t.getCell(12).numFmt='#,##0.00';
  ws.views=[{state:'frozen', ySplit:3}];
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Sugerencia_reposicion_${new Date().toISOString().substring(0,10)}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
}

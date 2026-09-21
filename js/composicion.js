/* ===========================================================================
   COMPOSICIÓN DE SALDO  (Clientes → Composición de Saldo)
   - Cómo se canceló cada comprobante: una fila POR CANCELACIÓN, con el
     comprobante repetido. Formato plano a propósito: así se baja a Excel y se
     puede filtrar, ordenar y armar tablas dinámicas para auditar.
   - Ordenado por fecha del comprobante; dentro de cada uno, por fecha.
   - Los A/Cuenta y las NC sin aplicar van al final: sin ellos el listado no
     cierra contra el saldo del cliente.
   =========================================================================== */

let _compData = null;
let _compContable = false;

function _cpEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _cpFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _cpFmtS(n){ const v=Number(n); return (n===null||n===undefined||isNaN(v))?'':_cpFmt(v); }
function _cpFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0].slice(-2)}`:(f||''); }
// Símbolo real de la moneda, de la tabla MONE
function _cpSimb(m){ const o=((typeof TABLAS!=='undefined'&&TABLAS['MONE'])||[]).find(x=>x.CODIGO===(m||'P')); return o&&o.STRING1?o.STRING1:(m==='P'?'$':m); }

const CP_GRID='104px 62px 92px 40px 104px 104px 104px 132px 62px 110px 110px';

function compFillClientes(){
  const dl=document.getElementById('comp-cli-list'); if(!dl) return;
  // Razón social primero: el datalist filtra por el principio del texto
  dl.innerHTML=(CLIS||[]).map(c=>`<option value="${_cpEsc((c.CLI_RAZON||'').trim())} — ${_cpEsc((c.CLI_CODIGO||'').trim())}">`).join('');
  const inp=document.getElementById('comp-cli');
  if(inp){ inp.setAttribute('autocomplete','off'); inp.removeAttribute('name'); }
}

function _cpCliCod(){
  const val=(document.getElementById('comp-cli')?.value||'').trim();
  if(!val) return '';
  const cod=(val.split('—').pop()||'').trim().toUpperCase();
  let c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===cod);
  if(!c) c=(CLIS||[]).find(x=>(x.CLI_RAZON||'').trim().toUpperCase()===val.toUpperCase());
  if(!c) c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim().toUpperCase()===val.toUpperCase());
  return c?(c.CLI_CODIGO||'').trim():'';
}
function compLimpiarCli(){ const e=document.getElementById('comp-cli'); if(e){ e.value=''; e.focus(); } }

function renderComposicion(){
  compFillClientes();
  if(_compData) _cpPintar();
}

function compToggleContable(){
  _compContable=!_compContable;
  const b=document.getElementById('btn-comp-cont');
  if(b){ b.classList.toggle('pri',_compContable);
         b.textContent=_compContable?'📗 Contable: ON':'📗 Contable: OFF'; }
  if(_compData) compConsultar();
}

async function compConsultar(){
  const body=document.getElementById('comp-body'); if(!body) return;
  const cli=_cpCliCod();
  if(!cli){ toast('Elegí un cliente','err'); return; }
  const qs=[];
  if(_compContable) qs.push('contable=1');
  if(document.getElementById('comp-pend')?.checked) qs.push('pendientes=1');
  body.innerHTML='<div class="empty" style="margin-top:40px">⏳ Cargando…</div>';
  try{
    const r=await apiGet('/composicion/'+encodeURIComponent(cli)+(qs.length?'?'+qs.join('&'):''));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_cpEsc(r.error||'Error')+'</div>'; return; }
    _compData=r;
    _cpPintar();
  }catch(e){
    body.innerHTML='<div class="empty" style="margin-top:40px">⚠️ '+_cpEsc(e.message||'Error')+'</div>';
  }
}

function _cpNombre(cod){
  const c=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim()===(cod||'').trim());
  return c?(c.CLI_RAZON||''):(cod||'');
}

function _cpPintar(){
  const body=document.getElementById('comp-body'); if(!body||!_compData) return;
  const D=_compData, filas=D.filas||[], cred=D.credito||[], T=D.totales||{};

  const head=document.getElementById('comp-head');
  if(head){
    head.style.gridTemplateColumns=CP_GRID;
    head.innerHTML=`<span>Comprobante</span><span>Fecha</span><span>Tipo</span><span>Mon</span>`
      + `<span class="r">Total</span><span class="r">Saldo</span>`
      + `<span>Cancelación</span><span>Número</span><span>Fecha</span>`
      + `<span class="r">Importe</span><span class="r">Pendiente</span>`;
  }

  if(!filas.length && !cred.length){
    body.innerHTML='<div class="empty" style="margin-top:40px">Sin movimientos para este cliente</div>';
    return;
  }

  // Una línea separadora al cambiar de comprobante, para leerlo de un vistazo
  let prev=null;
  let html=filas.map(f=>{
    const nuevo = f.comp!==prev; prev=f.comp;
    const sim=_cpSimb(f.moneda);
    return `<div class="cp-row${nuevo?' cp-new':''}" style="grid-template-columns:${CP_GRID}">
      <span class="mono acc">${nuevo?_cpEsc(f.comp):''}</span>
      <span class="sm">${nuevo?_cpFecha(f.fec):''}</span>
      <span class="sm">${nuevo?_cpEsc(f.tipoComp):''}</span>
      <span class="sm">${nuevo?_cpEsc(sim):''}</span>
      <span class="r mono">${nuevo?_cpFmt(f.total):''}</span>
      <span class="r mono ${(f.saldoComp||0)>0.005?'deuda':''}">${nuevo?_cpFmt(f.saldoComp):''}</span>
      <span class="sm ${f.cancTipo==='Nota de Crédito'?'nc':'rec'}">${_cpEsc(f.cancTipo)}</span>
      <span class="mono sm">${_cpEsc(f.cancNro)}</span>
      <span class="sm">${_cpFecha(f.cancFec)}</span>
      <span class="r mono">${_cpFmtS(f.importe)}</span>
      <span class="r mono">${_cpFmt(f.acum)}</span>
    </div>`;
  }).join('');

  if(cred.length){
    html+=`<div class="cp-sec">Crédito sin aplicar</div>`
      + cred.map(c=>`<div class="cp-row" style="grid-template-columns:${CP_GRID}">
          <span class="mono acc">${_cpEsc(c.nro)}</span>
          <span class="sm">${_cpFecha(c.fecha)}</span>
          <span class="sm nc">${_cpEsc(c.tipo)}</span>
          <span></span><span></span><span></span><span></span><span></span><span></span>
          <span class="r mono grn">${_cpFmt(c.importe)}</span><span></span>
        </div>`).join('');
  }

  html+=`<div class="cp-tot">
      <div><span>Total comprobantes pendientes</span><b>${_cpFmt(T.pendientes)}</b></div>
      <div><span>Crédito sin aplicar</span><b class="grn">− ${_cpFmt(T.credito)}</b></div>
      <div class="fin"><span>Saldo del cliente</span><b>${_cpFmt(T.saldo)}</b></div>
    </div>`;

  body.innerHTML=html;
  _cpStyle();
}

function _cpStyle(){
  if(document.getElementById('cp-style')) return;
  const st=document.createElement('style'); st.id='cp-style';
  st.textContent=`
    #comp-head{display:grid;gap:6px;padding:6px 10px;background:var(--s2);font-size:11px;color:var(--t2);
               border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:4}
    #comp-head .r{text-align:right}
    .cp-row{display:grid;gap:6px;padding:4px 10px;align-items:center;font-size:12px;border-bottom:1px solid var(--b1)}
    .cp-row:hover{background:var(--s2)}
    .cp-new{border-top:2px solid var(--b2,#8ab4f8)}
    .cp-row .r{text-align:right}
    .cp-row .mono{font-family:var(--mono)}
    .cp-row .sm{font-size:11px;color:var(--t2)}
    .cp-row .acc{color:var(--acc)}
    .cp-row .deuda{color:var(--red);font-weight:600}
    .cp-row .nc{color:var(--wrn,#f59e0b)}
    .cp-row .rec{color:var(--grn)}
    .cp-row .grn{color:var(--grn)}
    .cp-sec{padding:7px 10px;margin-top:10px;background:var(--s3);font-size:12px;font-weight:600;color:var(--txt);
            border-top:2px solid var(--acc)}
    .cp-tot{margin:14px 10px;padding:10px 14px;background:var(--s2);border-radius:6px;max-width:420px}
    .cp-tot div{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
    .cp-tot b{font-family:var(--mono)}
    .cp-tot .fin{border-top:2px solid var(--acc);margin-top:4px;padding-top:7px;font-weight:700;font-size:14px}
    .cp-tot .grn{color:var(--grn)}
  `;
  document.head.appendChild(st);
}

/* ─────────── Imprimir ─────────── */
function compPrint(){
  if(!_compData){ toast('Consultá primero','err'); return; }
  const D=_compData, T=D.totales||{};
  const th=`<tr><th>Comprobante</th><th>Fecha</th><th>Tipo</th><th>Mon</th>
      <th class="r">Total</th><th class="r">Saldo</th>
      <th>Cancelación</th><th>Número</th><th>Fecha</th>
      <th class="r">Importe</th><th class="r">Pendiente</th></tr>`;
  let tb=(D.filas||[]).map(f=>`<tr>
      <td>${_cpEsc(f.comp)}</td><td>${_cpFecha(f.fec)}</td><td>${_cpEsc(f.tipoComp)}</td>
      <td>${_cpEsc(_cpSimb(f.moneda))}</td>
      <td class="r">${_cpFmt(f.total)}</td><td class="r">${_cpFmt(f.saldoComp)}</td>
      <td>${_cpEsc(f.cancTipo)}</td><td>${_cpEsc(f.cancNro)}</td><td>${_cpFecha(f.cancFec)}</td>
      <td class="r">${_cpFmtS(f.importe)}</td><td class="r">${_cpFmt(f.acum)}</td></tr>`).join('');
  (D.credito||[]).forEach(c=>{
    tb+=`<tr><td>${_cpEsc(c.nro)}</td><td>${_cpFecha(c.fecha)}</td><td>${_cpEsc(c.tipo)}</td>
      <td></td><td></td><td></td><td></td><td></td><td></td>
      <td class="r">${_cpFmt(c.importe)}</td><td></td></tr>`;
  });
  tb+=`<tr class="fin"><td colspan="9"><b>Saldo del cliente</b></td>
       <td class="r"><b>${_cpFmt(T.saldo)}</b></td><td></td></tr>`;
  sgvPrint({
    titulo:`Composición de Saldo — ${_cpEsc(_cpCliCod())} ${_cpEsc(_cpNombre(_cpCliCod()))}`,
    subtitulo:(D.contable?'Vista contable (importes declarados)':'Importes reales')
      + ` · Pendientes ${_cpFmt(T.pendientes)} · Crédito ${_cpFmt(T.credito)} · Saldo ${_cpFmt(T.saldo)}`,
    cuerpo:`<table><thead>${th}</thead><tbody>${tb}</tbody></table>`,
    apaisado:true
  });
}

/* ─────────── Excel ─────────── */
async function _cpLoadExcelJS(){
  if(window.ExcelJS) return window.ExcelJS;
  await new Promise((res,rej)=>{ const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); });
  return window.ExcelJS;
}
async function compExcel(){
  if(!_compData){ toast('Consultá primero','err'); return; }
  let ExcelJS; try{ ExcelJS=await _cpLoadExcelJS(); }catch(e){ toast(e.message,'err'); return; }
  const D=_compData, T=D.totales||{}, cod=_cpCliCod();
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Composición');
  ws.columns=[{width:15},{width:11},{width:16},{width:7},{width:15},{width:15},
              {width:17},{width:18},{width:11},{width:15},{width:15}];

  const t1=ws.addRow([`Composición de Saldo — ${cod} ${_cpNombre(cod)}`]); t1.font={bold:true,size:13};
  const t2=ws.addRow([D.contable?'Vista contable (importes declarados)':'Importes reales']);
  t2.font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);

  const hr=ws.addRow(['Comprobante','Fecha','Tipo','Mon','Total','Saldo',
                      'Cancelación','Número','Fecha canc.','Importe','Pendiente']);
  hr.eachCell(c=>{ c.font={bold:true}; c.alignment={horizontal:'center'}; c.border={bottom:{style:'thin'}}; });

  const NUM='#,##0.00';
  // Comprobante repetido en CADA fila: así se puede filtrar y hacer dinámicas
  (D.filas||[]).forEach(f=>{
    const r=ws.addRow([f.comp,_cpFecha(f.fec),f.tipoComp,_cpSimb(f.moneda),
      f.total,f.saldoComp,f.cancTipo,f.cancNro,_cpFecha(f.cancFec),
      (f.importe===null||f.importe===undefined)?null:f.importe, f.acum]);
    [5,6,10,11].forEach(i=>{ r.getCell(i).numFmt=NUM; });
  });
  if((D.credito||[]).length){
    ws.addRow([]);
    const sc=ws.addRow(['Crédito sin aplicar']); sc.font={bold:true};
    (D.credito||[]).forEach(c=>{
      const r=ws.addRow([c.nro,_cpFecha(c.fecha),c.tipo,'','','','','','',c.importe,'']);
      r.getCell(10).numFmt=NUM;
    });
  }
  ws.addRow([]);
  const f1=ws.addRow(['','','','','','','','','Total pendientes',T.pendientes]); f1.getCell(10).numFmt=NUM;
  const f2=ws.addRow(['','','','','','','','','Crédito sin aplicar',T.credito]); f2.getCell(10).numFmt=NUM;
  const f3=ws.addRow(['','','','','','','','','Saldo del cliente',T.saldo]);
  f3.getCell(10).numFmt=NUM; f3.font={bold:true};
  f3.eachCell(c=>{ c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });

  ws.views=[{state:'frozen', ySplit:4}];
  ws.autoFilter={ from:{row:4,column:1}, to:{row:4,column:11} };

  const buf=await wb.xlsx.writeBuffer();
  const blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`Composicion_${cod}_${new Date().toISOString().substring(0,10)}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

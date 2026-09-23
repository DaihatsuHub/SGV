/* ===========================================================================
   ARMÁ TU INFORME  (Ventas → Armá tu informe)
   - Resuelve lo que los informes con pantalla propia NO hacen: cruzar dos
     dimensiones cualesquiera y combinar filtros libremente.
   - Los filtros que aparecen dependen de lo que se está mirando; los que se
     dejan vacíos no filtran.
   - Arriba se escribe sola la pregunta en castellano, para que el usuario vea
     qué está pidiendo sin tener que interpretar los controles.
   =========================================================================== */

let _armData = null;

function _amEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _amFmt(n){ return (Number(n)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function _amFmt0(n){ return (Number(n)||0).toLocaleString('es-AR',{maximumFractionDigits:2}); }
function _amFecha(f){ const p=(f||'').substring(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:(f||''); }
function _amTabla(k){ return ((typeof TABLAS!=='undefined' && TABLAS[k])||[]); }
function _amVal(id){ return (document.getElementById(id)?.value||'').trim(); }

// Las dimensiones para agrupar. Las marcadas con art salen del artículo: si se
// usan, los comprobantes sin renglones (NC por leyenda) no se pueden imputar.
const ARM_DIMS = [
  ['cliente','Cliente'], ['vendedor','Vendedor'], ['marca','Marca'], ['rubro','Rubro'],
  ['subrubro','Sub-rubro'], ['grupo','Grupo'], ['articulo','Artículo'],
  ['ccos','Centro de costos'], ['provincia','Provincia'], ['moneda','Moneda'],
  ['empresa','Empresa'], ['mes','Mes'], ['trimestre','Trimestre'], ['comprobante','Comprobante']
];
const ARM_DIM_LBL = Object.fromEntries(ARM_DIMS);

function renderArmador(){
  _amStyle();
  _amFillCombos();
  if(!_amVal('am-desde')) armPeriodo('mes');
  _amFrase();
}

function _amOpts(k, label){
  return `<option value="">${label}</option>`+_amTabla(k)
    .map(x=>`<option value="${_amEsc(x.CODIGO)}">${_amEsc(x.CODIGO)} — ${_amEsc(x.DETALLE)}</option>`).join('');
}

function _amFillCombos(){
  const set=(id,html)=>{ const e=document.getElementById(id); if(e&&e.options.length<=1) e.innerHTML=html; };
  set('am-vend', _amOpts('VEND','Todos los vendedores'));
  set('am-marca',_amOpts('MARC','Todas las marcas'));
  set('am-rubro',_amOpts('RUBR','Todos los rubros'));
  set('am-grupo',_amOpts('GRUP','Todos los grupos'));
  set('am-ccos', _amOpts('CCOS','Todos los centros'));
  set('am-prov', _amOpts('PCIA','Todas las provincias'));
  set('am-moneda',_amOpts('MONE','Todas las monedas'));
  // Agrupaciones
  const g1=document.getElementById('am-g1'), g2=document.getElementById('am-g2');
  if(g1 && !g1.options.length){
    g1.innerHTML=ARM_DIMS.map(([k,l])=>`<option value="${k}"${k==='cliente'?' selected':''}>${l}</option>`).join('');
    g2.innerHTML='<option value="">— nada —</option>'+ARM_DIMS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('');
  }
  // Clientes y artículos con búsqueda incremental
  const dlc=document.getElementById('am-cli-list');
  if(dlc && !dlc.options.length)
    dlc.innerHTML=(CLIS||[]).map(c=>`<option value="${_amEsc((c.CLI_RAZON||'').trim())} — ${_amEsc((c.CLI_CODIGO||'').trim())}">`).join('');
  const dla=document.getElementById('am-art-list');
  if(dla && !dla.options.length)
    dla.innerHTML=(ARTS||[]).slice(0,3000).map(a=>`<option value="${_amEsc((a.ART_COD||'').trim())} — ${_amEsc(a.ART_DES||'')}">`).join('');
}

// Atajos de período
function armPeriodo(cual){
  const hoy=new Date(), y=hoy.getFullYear(), m=hoy.getMonth();
  const iso=d=>d.toISOString().substring(0,10);
  let d1,d2;
  if(cual==='mes'){ d1=new Date(y,m,1); d2=hoy; }
  else if(cual==='ant'){ d1=new Date(y,m-1,1); d2=new Date(y,m,0); }
  else if(cual==='anio'){ d1=new Date(y,0,1); d2=hoy; }
  else return _amFrase();
  document.getElementById('am-desde').value=iso(d1);
  document.getElementById('am-hasta').value=iso(d2);
  document.querySelectorAll('.am-per').forEach(b=>b.classList.toggle('pri', b.dataset.p===cual));
  _amFrase();
}

function _amCod(id){
  const v=_amVal(id); if(!v) return '';
  // "RAZÓN — CÓDIGO" o "CÓDIGO — DESCRIPCIÓN"
  const p=v.split('—').map(x=>x.trim());
  return p.length>1 ? (id==='am-cli' ? p[p.length-1] : p[0]) : v;
}

// La pregunta, escrita en castellano: es lo que evita elegir mal sin darse cuenta
function _amFrase(){
  const el=document.getElementById('am-frase'); if(!el) return;
  const d=_amVal('am-desde'), h=_amVal('am-hasta');
  let s='Ventas';
  s += (d||h) ? ` del ${_amFecha(d)||'inicio'} al ${_amFecha(h)||'hoy'}` : ' de todo el histórico';
  const fs=[];
  // El texto de la opción elegida, no el valor: "CASIO — CASIO" → "CASIO"
  const nom=(id,pre)=>{
    const el=document.getElementById(id); if(!el||!el.value) return;
    const t=(el.selectedOptions?.[0]?.textContent||el.value).split('—')[1]||el.value;
    fs.push(pre+' '+t.trim());
  };
  if(_amCod('am-cli'))  fs.push('del cliente '+(_amVal('am-cli').split('—')[0]||'').trim());
  nom('am-vend','del vendedor'); nom('am-marca','de la marca'); nom('am-rubro','del rubro');
  nom('am-grupo','del grupo'); nom('am-ccos','del centro'); nom('am-prov','de');
  nom('am-moneda','en'); 
  const emp=_amVal('am-empresa'); if(emp) fs.push('de '+(emp==='H'?'Hatsu':'Tressa'));
  if(_amCod('am-art')) fs.push('del artículo '+_amCod('am-art'));
  if(fs.length) s+=', '+fs.join(', ');
  s+=`, agrupadas por ${ARM_DIM_LBL[_amVal('am-g1')]||'cliente'}`.toLowerCase().replace('agrupadas por','agrupadas por');
  const g2=_amVal('am-g2'); if(g2) s+=` y dentro por ${ARM_DIM_LBL[g2].toLowerCase()}`;
  const ord={importe:'de mayor a menor importe',unidades:'de mayor a menor cantidad',margen:'de mayor a menor margen',nombre:'por nombre'}[_amVal('am-orden')||'importe'];
  s+=', '+ord;
  const lim=_amVal('am-limite'); if(lim) s+=` (los primeros ${lim})`;
  el.textContent=s+'.';
}

async function armConsultar(){
  const body=document.getElementById('am-body'); if(!body) return;
  const qs=[];
  const add=(k,v)=>{ if(v) qs.push(k+'='+encodeURIComponent(v)); };
  add('desde',_amVal('am-desde')); add('hasta',_amVal('am-hasta'));
  add('cli',_amCod('am-cli'));     add('art',_amCod('am-art'));
  add('vend',_amVal('am-vend'));   add('marca',_amVal('am-marca'));
  add('rubro',_amVal('am-rubro')); add('grupo',_amVal('am-grupo'));
  add('ccos',_amVal('am-ccos'));   add('prov',_amVal('am-prov'));
  add('moneda',_amVal('am-moneda'));add('empresa',_amVal('am-empresa'));
  add('g1',_amVal('am-g1')||'cliente'); add('g2',_amVal('am-g2'));
  add('orden',_amVal('am-orden')); add('limite',_amVal('am-limite'));
  body.innerHTML='<div class="empty" style="margin-top:30px">⏳ Calculando…</div>';
  try{
    const r=await apiGet('/informes/armador?'+qs.join('&'));
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_amEsc(r.error||'Error')+'</div>'; return; }
    _armData=r; _amPintar();
  }catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_amEsc(e.message||'Error')+'</div>'; }
}

function _amPintar(){
  const body=document.getElementById('am-body'); if(!body||!_armData) return;
  const D=_armData, F=D.filas||[], T=D.totales||{};
  const hayG2=!!D.g2;
  const grid=hayG2 ? '1fr 1fr 90px 140px 140px 140px 90px' : '1fr 90px 140px 140px 140px 90px';

  const head=document.getElementById('am-head');
  if(head){
    head.style.gridTemplateColumns=grid;
    head.innerHTML=`<span>${_amEsc(ARM_DIM_LBL[D.g1]||D.g1)}</span>`
      + (hayG2?`<span>${_amEsc(ARM_DIM_LBL[D.g2]||D.g2)}</span>`:'')
      + '<span class="r">Unid.</span><span class="r">Importe</span><span class="r">Costo</span>'
      + '<span class="r">Resultado</span><span class="r">Margen</span>';
  }
  if(!F.length){ body.innerHTML='<div class="empty" style="margin-top:30px">Sin ventas con esos filtros</div>'; return; }

  const fila=(f,cls)=>`<div class="am-row${cls||''}" style="grid-template-columns:${grid}">
      <span class="am-t">${_amEsc(f.t1)}</span>
      ${hayG2?`<span class="am-t">${_amEsc(f.t2||'—')}</span>`:''}
      <span class="r">${_amFmt0(f.unidades)}</span>
      <span class="r${f.importe<0?' neg':''}">${_amFmt(f.importe)}</span>
      <span class="r">${_amFmt(f.costo)}</span>
      <span class="r res${f.resultado<0?' neg':''}">${_amFmt(f.resultado)}</span>
      <span class="r${f.margen!==null&&f.margen<0?' neg':''}">${f.margen===null?'—':_amFmt(f.margen)+' %'}</span>
    </div>`;

  let html='';
  if(hayG2){
    // Subtotal por cada grupo del primer nivel
    const porG1={};
    F.forEach(f=>{ (porG1[f.k1]||(porG1[f.k1]={t:f.t1,filas:[],u:0,i:0,c:0})); const g=porG1[f.k1];
      g.filas.push(f); g.u+=f.unidades; g.i+=f.importe; g.c+=f.costo; });
    for(const g of Object.values(porG1)){
      const res=g.i-g.c;
      html+=fila({t1:g.t,t2:'',unidades:g.u,importe:g.i,costo:g.c,resultado:res,
                  margen:Math.abs(g.i)>0.005?res/g.i*100:null},' am-g1');
      html+=g.filas.map(f=>fila({...f,t1:''})).join('');
    }
  } else html=F.map(f=>fila(f)).join('');

  html+=fila({t1:'TOTAL',t2:'',...T},' am-tot');

  let pie='';
  if(Math.abs(D.sinRenglones||0)>0.005){
    pie=`<div class="am-nota">Quedaron afuera ${_amFmt(D.sinRenglones)} de comprobantes sin artículos
      —notas de crédito por leyenda— porque la agrupación elegida depende del artículo.
      Agrupando por cliente, vendedor o mes se incluyen.</div>`;
  }
  if((D.sinCosto||0)>0) pie+=`<div class="am-nota">${_amFmt0(D.sinCosto)} unidad(es) sin costo: el margen sale más alto de lo real.</div>`;
  if(D.truncado) pie+=`<div class="am-nota">Se muestran los primeros ${_amVal('am-limite')} de la lista.</div>`;
  body.innerHTML=html+pie;
}

function armLimpiar(){
  ['am-cli','am-art','am-vend','am-marca','am-rubro','am-grupo','am-ccos','am-prov','am-moneda','am-empresa','am-g2','am-limite']
    .forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  const g1=document.getElementById('am-g1'); if(g1) g1.value='cliente';
  const o=document.getElementById('am-orden'); if(o) o.value='importe';
  armPeriodo('mes');
  _armData=null;
  const b=document.getElementById('am-body'); if(b) b.innerHTML='<div class="empty" style="margin-top:30px">Elegí lo que querés ver y tocá Ver informe</div>';
}

/* ─────────── Imprimir ─────────── */
function armPrint(){
  if(!_armData){ toast('Consultá primero','err'); return; }
  const D=_armData, T=D.totales||{}, hayG2=!!D.g2;
  const th=`<tr><th>${_amEsc(ARM_DIM_LBL[D.g1]||D.g1)}</th>${hayG2?`<th>${_amEsc(ARM_DIM_LBL[D.g2])}</th>`:''}
    <th class="r">Unid.</th><th class="r">Importe</th><th class="r">Costo</th><th class="r">Resultado</th><th class="r">Margen</th></tr>`;
  const tr=(f,b)=>`<tr${b?' class="fin"':''}><td>${_amEsc(f.t1)}</td>${hayG2?`<td>${_amEsc(f.t2||'')}</td>`:''}
    <td class="r">${_amFmt0(f.unidades)}</td><td class="r">${_amFmt(f.importe)}</td><td class="r">${_amFmt(f.costo)}</td>
    <td class="r">${_amFmt(f.resultado)}</td><td class="r">${f.margen===null?'—':_amFmt(f.margen)+' %'}</td></tr>`;
  sgvPrint({ titulo:'Informe de ventas',
    subtitulo:document.getElementById('am-frase')?.textContent||'',
    cuerpo:`<table><thead>${th}</thead><tbody>${(D.filas||[]).map(f=>tr(f)).join('')}${tr({t1:'TOTAL',t2:'',...T},true)}</tbody></table>`,
    apaisado:true });
}

/* ─────────── Excel ─────────── */
async function armExcel(){
  if(!_armData){ toast('Consultá primero','err'); return; }
  if(!window.ExcelJS){
    try{ await new Promise((res,rej)=>{ const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar ExcelJS')); document.head.appendChild(s); }); }
    catch(e){ toast(e.message,'err'); return; }
  }
  const D=_armData, T=D.totales||{}, hayG2=!!D.g2;
  const wb=new ExcelJS.Workbook(); const ws=wb.addWorksheet('Informe');
  ws.columns=[{width:32},...(hayG2?[{width:28}]:[]),{width:11},{width:16},{width:16},{width:16},{width:10}];
  ws.addRow(['Informe de ventas']).font={bold:true,size:13};
  ws.addRow([document.getElementById('am-frase')?.textContent||'']).font={italic:true,color:{argb:'FF666666'}};
  ws.addRow([]);
  const hr=ws.addRow([ARM_DIM_LBL[D.g1]||D.g1, ...(hayG2?[ARM_DIM_LBL[D.g2]]:[]),
    'Unidades','Importe','Costo','Resultado','Margen %']);
  hr.eachCell(c=>{ c.font={bold:true}; c.border={bottom:{style:'thin'}}; });
  const NUM='#,##0.00';
  const add=(f,b)=>{
    const r=ws.addRow([f.t1, ...(hayG2?[f.t2||'']:[]), f.unidades, f.importe, f.costo, f.resultado, f.margen]);
    const off=hayG2?1:0;
    [3+off,4+off,5+off,6+off].forEach(i=>{ r.getCell(i).numFmt=NUM; });
    if(b) r.eachCell(c=>{ c.font={bold:true}; c.border={top:{style:'medium',color:{argb:'FF0A58CA'}}}; });
  };
  (D.filas||[]).forEach(f=>add(f)); add({t1:'TOTAL',t2:'',...T},true);
  ws.views=[{state:'frozen', ySplit:4}];
  ws.autoFilter={ from:{row:4,column:1}, to:{row:4,column:hayG2?7:6} };
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`Informe_${_amVal('am-g1')}${_amVal('am-g2')?'_'+_amVal('am-g2'):''}_${new Date().toISOString().substring(0,10)}.xlsx`;
  a.click(); URL.revokeObjectURL(a.href);
}

function _amStyle(){
  if(document.getElementById('am-style')) return;
  const st=document.createElement('style'); st.id='am-style';
  st.textContent=`
    .am-wrap{margin:10px 14px}
    .am-paso{border-top:1px solid var(--b1);padding-top:9px;margin-top:9px}
    .am-lbl{font-size:12px;color:var(--t2);margin-bottom:5px}
    .am-lbl small{color:var(--t3)}
    .am-filtros{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}
    .am-filtros .fsel,.am-filtros .finp{width:100%}
    .am-frase{margin-top:10px;padding:9px 12px;border-radius:8px;font-size:13px;line-height:1.5;
      background:rgba(55,138,221,.10);color:#185FA5}
    #am-head,.am-row{display:grid;gap:8px;align-items:center;padding:6px 12px}
    #am-head{background:var(--s2);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1);position:sticky;top:0;z-index:3}
    #am-head .r,.am-row .r{text-align:right}
    .am-row{font-size:13px;border-bottom:1px solid var(--b1);font-family:var(--mono)}
    .am-row .am-t{font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .am-row:hover{background:var(--s2)}
    .am-row.am-g1{background:var(--s2);font-weight:600}
    .am-row.am-tot{background:var(--s2);border-top:2px solid var(--acc);font-weight:700}
    .am-row .res{font-weight:600}
    .am-row .neg{color:var(--red)}
    .am-nota{margin:10px 12px;padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.5;
      background:rgba(239,159,39,.12);color:#854F0B;border-left:3px solid #EF9F27}
  `;
  document.head.appendChild(st);
}

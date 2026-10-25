// ═══════════════════════════════════════════════════════════
// EDITOR DE DATOS (Utilidades) — Ricardo, Oct 2026
// Las tablas de la base como una planilla: filtrar, editar celdas, pegar desde
// Excel, copiar y hacer cambios globales. SIN las reglas de SGV, a riesgo del
// usuario. Sólo nivel 99. Cada cambio queda registrado en el server (datos_log).
// Prefijo propio `edd` para no chocar con ningún otro archivo.
// ═══════════════════════════════════════════════════════════

const EDD_TABLAS_UI = [
  ['articulos','Artículos'], ['clientes','Clientes'], ['despachos','Despachos'],
  ['facturas','Comprobantes (cabecera)'], ['fac_items','Comprobantes (renglones)'],
  ['recibos','Recibos'], ['recibo_items','Recibos (aplicaciones)'], ['recibo_pagos','Recibos (pagos)'],
  ['cheques','Cheques'], ['cheques_rechazados','Cheques rechazados'], ['nc_aplicac','Aplicaciones de NC'],
  ['movimientos_stock','Movimientos de stock'],
  ['marcas','Marcas'], ['rubros','Rubros'], ['subrubros','Subrubros'], ['proveedores','Proveedores'],
  ['vendedores','Vendedores'], ['condpago','Condiciones de pago'], ['provincias','Provincias'],
  ['grupos','Grupos'], ['categorias','Categorías'], ['expresos','Transportes'], ['monedas','Monedas'],
  ['centros_costos','Centros de costos'], ['percepciones','Percepciones'], ['bancos','Bancos'],
  ['estuches','Estuches'], ['retenciones','Retenciones'], ['conceptos_gasto','Conceptos de gasto'],
  ['comp_tipos','Tipos de comprobantes'], ['talonarios','Talonarios'],
  ['ordenes_compra','Órdenes de compra'], ['oc_items','Órdenes de compra (renglones)'], ['gastos','Gastos']
];

// Descripción de cada campo (se muestra al lado del nombre). Lo que no está acá
// se toma de las columnas configurables de cada pantalla (COL_DEFS).
const EDD_DESC = {
  art_cod:'Código', art_des:'Descripción', art_rub:'Rubro', art_srub:'Subrubro', art_marca:'Marca',
  art_pre:'Precio de lista', art_stk:'Stock Hatsu', art_stkt:'Stock Tressa', art_deph:'Depósito Hatsu',
  art_dept:'Depósito Tressa', art_act:'Activo (S/N)', art_estu:'Estuche', art_grup:'Grupo', art_sex:'Sexo',
  art_prov:'Proveedor', art_moneda:'Moneda', codcasio:'Código Casio', art_ccos:'Centro de costos',
  art_iva:'% IVA', art_updated:'Última modificación',
  cli_codigo:'Código', cli_razon:'Razón social', cli_domic:'Domicilio', cli_local:'Localidad',
  cli_codpos:'Código postal', cli_provin:'Provincia', cli_telef:'Teléfono', cli_vend:'Vendedor',
  cli_expre:'Transporte', cli_cuit:'CUIT', cli_iva:'Condición de IVA', cli_nroib:'N° Ingresos Brutos',
  cli_tipoib:'Tipo IIBB', cli_percib:'Percibe IIBB (S/N)', cli_conpag:'Condición de pago', cli_dto:'% Descuento',
  cli_obs:'Observaciones', cli_ufec:'Última compra', cli_incob:'Incobrable', cli_nodar:'No darle mercadería',
  cli_preinc:'Pre-incobrable', cli_abc:'Clasificación ABC', cli_icred:'Límite de crédito', cli_fcred:'Fecha del crédito',
  cli_estado:'Estado', cli_email:'Email', cli_cate:'Categoría', cli_percep:'Percepciones',
  dep_id:'Id', dep_desp:'Despacho', dep_sub:'Sub-despacho', dep_fec:'Fecha', dep_art:'Artículo',
  dep_proc:'Procedencia', dep_adua:'Aduana', dep_ent:'Entradas', dep_sal:'Salidas', dep_stk:'Stock',
  dep_fob:'FOB unitario', dep_gas:'Gastos 1', dep_gas2:'% Gasto', dep_moneda:'Moneda', dep_costo:'Costo (FOB + gasto)',
  dep_cotiz:'Cotización', dep_coent:'Entradas contables', dep_cosal:'Salidas contables', dep_costk:'Stock contable',
  fac_nro:'N° comprobante', fac_fec:'Fecha', fac_cli:'Cliente', fac_vend:'Vendedor', fac_tiva:'Condición IVA',
  fac_sub:'Subtotal', fac_iva:'IVA', fac_percib:'Percepciones', fac_total:'Total', fac_saldo:'Saldo',
  fac_salida:'Fecha de entrega', fac_transp:'Transporte', fac_remito:'Remito', fac_vcomi:'% Comisión',
  fac_moneda:'Moneda', fac_cotiz:'Cotización', fac_monpor:'% Descuento', fac_empresa:'Empresa (H/T)',
  fac_ctip:'Tipo de comprobante (id)', fac_usuario:'Usuario', fac_tab_stk:'Baja stock', fac_tab_fact:'Fiscal / depósito',
  fac_anul:'Anulado', fac_neto_afip:'Neto contable', fac_iva_afip:'IVA contable', fac_percep_afip:'Percepciones contables',
  fac_total_afip:'Total contable', fac_saldo_afip:'Saldo contable', fac_coment:'Comentario interno',
  fac_leyenda:'Leyenda', fac_ley_neto:'Leyenda: neto', fac_ley_exento:'Leyenda: exento', fac_ley_alic:'Leyenda: % IVA',
  fac_cae:'CAE', fac_cae_vto:'Vencimiento CAE', fac_afip_st:'Estado AFIP',
  ite_nro:'N° comprobante', ite_art:'Artículo', ite_can:'Cantidad', ite_uni:'Precio unitario', ite_imp:'Importe',
  ite_iva_imp:'IVA', ite_desp:'Despacho', ite_dep_id:'Despacho (id)', ite_costo:'Precio de lista',
  ite_preori:'Precio original', ite_moneda:'Moneda', ite_cotiz:'Cotización',
  empresa:'Empresa (H/T)', talonario:'Talonario', numero:'Número', fecha:'Fecha', cliente:'Cliente',
  importe:'Importe', moneda:'Moneda', cotizacion:'Cotización', usuario:'Usuario', estado:'Estado',
  observaciones:'Observaciones / destino', fecha_salida:'Fecha de salida', fisico:'Físico (no e-cheq)',
  propio:'Propio', recibo_id:'Recibo (id)', recibo_numero:'N° recibo', fecha_recibo:'Fecha del recibo',
  imputa_afip:'Imputado a contable', comprobante:'Comprobante', abona:'Abona (pesos)', abona_orig:'Abona (moneda orig.)',
  abona_afip:'Abona contable', saldo:'Saldo', saldo_orig:'Saldo (moneda orig.)', a_cuenta:'A cuenta',
  tipo:'Tipo', ret_codigo:'Código de retención', total_abonado:'Total abonado', anulado:'Anulado',
  cot_casio:'Cotización Casio', cot_tressa:'Cotización Tressa', usuario_alta:'Usuario alta',
  nc_nro:'N° NC', comp_nro:'Comprobante aplicado', importe_afip:'Importe contable',
  codigo:'Código', detalle:'Descripción', descripcion:'Descripción', signo:'Signo', contable:'Contable',
  prefijo:'Prefijo', ultimo_nro:'Último número', tab_stk:'Baja stock', tab_fact:'Fiscal / depósito',
  articulo:'Artículo', despacho:'Despacho', cantidad:'Cantidad', concepto:'Concepto',
  mueve_stk:'Mueve stock', mueve_dep:'Mueve depósito', banco:'Banco', librador:'Librador',
  cuenta:'Cuenta', localidad:'Localidad', gasto:'Gasto', fecha_pago:'Fecha de pago', fac_nro_r:'Comprobante'
};
function eddDesc(c){
  if(EDD_DESC[c]) return EDD_DESC[c];
  if(typeof COL_DEFS!=='undefined'){
    for(const k in COL_DEFS){ const d=(COL_DEFS[k]||[]).find(x=>(x.field||'').toLowerCase()===c); if(d && d.label) return d.label; }
  }
  return '';
}
// En un combo no se puede poner negrita: el campo va en MAYÚSCULAS para que resalte
const _eddOpt = c => { const d=eddDesc(c); return `<option value="${c}">${esc(c.toUpperCase()+(d ? ' — '+d : ''))}</option>`; };

let _edd = { tabla:'', pk:'', cols:[], filas:[], total:0, cambios:{} };   // cambios: 'fila|col' → valor

(function(){
  if(document.getElementById('edd-estilos')) return;
  const st=document.createElement('style'); st.id='edd-estilos';
  st.textContent=`
    #edd-grid{border-collapse:collapse;font-size:12px;font-family:var(--mono)}
    #edd-grid th{position:sticky;top:0;background:var(--s2);color:var(--t2);font-weight:600;padding:5px 8px;
      border:1px solid var(--b1);white-space:nowrap;text-align:left;z-index:1}
    #edd-grid td{border:1px solid var(--b1);padding:3px 8px;white-space:nowrap;max-width:320px;overflow:hidden;
      text-overflow:ellipsis;color:var(--txt);background:var(--s1)}
    #edd-grid td[contenteditable]:focus{outline:2px solid #0a58ca;outline-offset:-2px;background:var(--s3);max-width:none}
    #edd-grid td.edd-pk,#edd-grid td.edd-ro{color:var(--t3);background:var(--s2)}
    /* El código (🔑) queda siempre visible al desplazarse a la derecha */
    #edd-grid td.edd-pk{position:sticky;left:0;z-index:1;color:var(--txt);font-weight:600;box-shadow:2px 0 0 var(--b1)}
    #edd-grid th.edd-pkh{position:sticky;left:0;z-index:3;box-shadow:2px 0 0 var(--b1)}
    #edd-grid td.edd-mod{background:#fff3b0;color:#1a1a1a}
    .edd-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--b1)}
    .edd-bar .finp,.edd-bar .fsel{height:30px}
    .edd-aviso{padding:6px 14px;font-size:12px;color:#854F0B;background:rgba(239,159,39,.12)}`;
  document.head.appendChild(st);
})();

function renderEdd(){
  const pg=document.getElementById('page-edd'); if(!pg) return;
  if(document.getElementById('edd-tabla')) return;     // ya armada: se conserva lo que había
  pg.innerHTML=`
    <div class="toolbar">
      <span style="font-weight:600;font-size:14px;color:var(--acc)">🧮 Editor de datos</span>
      <div class="spacer"></div>
      <button class="btn" onclick="eddCopiar()" title="Copia la grilla para pegarla en Excel">📋 Copiar grilla</button>
      <button class="btn pri" id="edd-guardar" onclick="eddGuardar()" disabled>💾 Grabar cambios</button>
    </div>
    <div class="edd-aviso">⚠️ Sin controles de SGV: lo que se graba acá va directo a la base. Cada cambio queda registrado.
      Para pegar desde Excel, hacé clic en la celda donde empieza y Ctrl+V.</div>
    <div class="edd-bar">
      <select class="fsel" id="edd-tabla" onchange="eddCambiarTabla()">
        <option value="">— Elegí la tabla —</option>
        ${EDD_TABLAS_UI.map(([t,n])=>`<option value="${t}">${n}</option>`).join('')}
      </select>
      <select class="fsel" id="edd-f1c"><option value="">Filtro…</option></select>
      <select class="fsel" id="edd-f1o">
        <option value="contiene">contiene</option><option value="igual">es igual a</option>
        <option value="empieza">empieza con</option><option value="mayor">desde (≥)</option>
        <option value="menor">hasta (≤)</option><option value="vacio">está vacío</option>
      </select>
      <input class="finp" id="edd-f1v" style="width:170px" placeholder="valor" onkeydown="if(event.key==='Enter')eddLeer()">
      <span style="color:var(--t3)">y</span>
      <select class="fsel" id="edd-f2c"><option value="">Filtro…</option></select>
      <select class="fsel" id="edd-f2o">
        <option value="contiene">contiene</option><option value="igual">es igual a</option>
        <option value="empieza">empieza con</option><option value="mayor">desde (≥)</option>
        <option value="menor">hasta (≤)</option><option value="vacio">está vacío</option>
      </select>
      <input class="finp" id="edd-f2v" style="width:170px" placeholder="valor" onkeydown="if(event.key==='Enter')eddLeer()">
      <select class="fsel" id="edd-lim"><option>500</option><option>2000</option><option>5000</option></select>
      <button class="btn pri" onclick="eddLeer()">🔍 Buscar</button>
      <span id="edd-info" style="font-size:12px;color:var(--t2)"></span>
    </div>
    <div class="edd-bar">
      <span style="font-size:12px;color:var(--t2)">Cambio global — a todos los filtrados, poner</span>
      <select class="fsel" id="edd-gc"><option value="">campo…</option></select>
      <span style="font-size:12px;color:var(--t2)">=</span>
      <input class="finp" id="edd-gv" style="width:170px" placeholder="valor (vacío = borrar)">
      <button class="btn" onclick="eddGlobal()">⚡ Aplicar</button>
    </div>
    <div id="edd-wrap" style="overflow:auto;height:calc(100vh - 270px);padding:0 14px 14px"></div>`;
}

const _eddFiltros = () => [1,2].map(n=>({
  campo: document.getElementById('edd-f'+n+'c').value,
  op: document.getElementById('edd-f'+n+'o').value,
  valor: document.getElementById('edd-f'+n+'v').value
})).filter(f=>f.campo);

function _eddPendientes(){ return Object.keys(_edd.cambios).length; }
// Grabar sólo se activa si hay cambios sin grabar
function eddBoton(){
  const b=document.getElementById('edd-guardar'); if(!b) return;
  const n=_eddPendientes();
  b.disabled=!n;
  b.textContent='💾 Grabar cambios'+(n?' ('+n+')':'');
}

async function eddCambiarTabla(){
  if(_eddPendientes() && !confirm('Hay cambios sin grabar. ¿Descartarlos?')){
    document.getElementById('edd-tabla').value=_edd.tabla; return;
  }
  ['edd-f1v','edd-f2v','edd-gv'].forEach(id=>document.getElementById(id).value='');
  _edd={ tabla:document.getElementById('edd-tabla').value, pk:'', cols:[], filas:[], total:0, cambios:{} };
  document.getElementById('edd-wrap').innerHTML='';
  eddBoton();
  if(_edd.tabla) await eddLeer(true);
}

async function eddLeer(primera){
  if(!_edd.tabla){ toast('Elegí la tabla','err'); return; }
  if(!primera && _eddPendientes() && !confirm('Hay cambios sin grabar. ¿Descartarlos?')) return;
  const info=document.getElementById('edd-info'); info.textContent='⏳ Buscando…';
  try{
    const r=await apiPost('/datos/leer',{ tabla:_edd.tabla, filtros:_eddFiltros(),
      limite:document.getElementById('edd-lim').value });
    if(!r.ok){ info.textContent=''; sgvAviso({ titulo:'No se pudo leer', texto:r.error||'Error', tipo:'err' }); return; }
    // El código va primero (y queda fijo a la izquierda)
    _edd.pk=r.pk; _edd.cols=[r.pk].concat(r.columnas.filter(c=>c!==r.pk)); _edd.filas=r.filas; _edd.total=r.total; _edd.cambios={};
    // Los combos de campos se arman con las columnas de la tabla
    const opts=_edd.cols.map(_eddOpt).join('');
    ['edd-f1c','edd-f2c'].forEach(id=>{ const e=document.getElementById(id), v=e.value;
      e.innerHTML='<option value="">Filtro…</option>'+opts; e.value=_edd.cols.includes(v)?v:''; });
    const g=document.getElementById('edd-gc'), gv=g.value;
    g.innerHTML='<option value="">campo…</option>'+_edd.cols.filter(c=>c!==_edd.pk).map(_eddOpt).join('');
    g.value=_edd.cols.includes(gv)?gv:'';
    info.textContent=`${_edd.filas.length} de ${_edd.total} registros`+(_edd.filas.length<_edd.total?' (afiná el filtro o subí el límite)':'');
    eddPintar();
  }catch(e){ info.textContent=''; sgvAviso({ titulo:'No se pudo leer', texto:e.message, tipo:'err' }); }
}

function _eddTxt(v){
  if(v===null||v===undefined) return '';
  return (typeof v==='object') ? JSON.stringify(v) : String(v);
}

function eddPintar(){
  const w=document.getElementById('edd-wrap');
  if(!_edd.cols.length){ w.innerHTML='<div class="empty">Sin registros</div>'; return; }
  const esObj=c=>_edd.filas.some(f=>f[c]!==null && typeof f[c]==='object');
  const ro=Object.fromEntries(_edd.cols.map(c=>[c, c===_edd.pk || esObj(c)]));
  w.innerHTML=`<table id="edd-grid"><thead><tr>${_edd.cols.map(c=>`<th${c===_edd.pk?' class="edd-pkh"':''} title="${esc(eddDesc(c)||c)}"><b>${esc(c.toUpperCase())}</b>${c===_edd.pk?' 🔑':''}<div style="font-weight:400;font-size:10px;color:var(--t3)">${esc(eddDesc(c))}</div></th>`).join('')}</tr></thead>
    <tbody>${_edd.filas.map((f,i)=>`<tr>${_edd.cols.map((c,j)=>{
      const k=i+'|'+c, mod=k in _edd.cambios, v=mod?_edd.cambios[k]:_eddTxt(f[c]);
      return `<td data-i="${i}" data-j="${j}" class="${c===_edd.pk?'edd-pk':(ro[c]?'edd-ro':'')}${mod?' edd-mod':''}"
        ${ro[c]?'':'contenteditable="plaintext-only"'} title="${esc(v)}">${esc(v)}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
  const t=document.getElementById('edd-grid');
  eddAjustarAlto(); eddBoton();
  t.addEventListener('input', eddInput);
  t.addEventListener('paste', eddPegar);
  t.addEventListener('keydown', eddTecla);
}

function _eddMarcar(td, valor){
  const i=+td.dataset.i, c=_edd.cols[+td.dataset.j], k=i+'|'+c;
  if(valor===_eddTxt(_edd.filas[i][c])){ delete _edd.cambios[k]; td.classList.remove('edd-mod'); }
  else { _edd.cambios[k]=valor; td.classList.add('edd-mod'); }
  td.title=valor;
  eddBoton();
}
function eddInput(e){ const td=e.target.closest('td[contenteditable]'); if(td) _eddMarcar(td, td.textContent); }

// Pegar desde Excel: filas con Enter, columnas con Tab; arranca en la celda elegida
function eddPegar(e){
  const td=e.target.closest('td'); if(!td) return;
  e.preventDefault();
  const txt=(e.clipboardData||window.clipboardData).getData('text').replace(/\r/g,'').replace(/\n$/,'');
  const filas=txt.split('\n').map(l=>l.split('\t'));
  const i0=+td.dataset.i, j0=+td.dataset.j;
  let n=0;
  filas.forEach((fila,di)=>fila.forEach((v,dj)=>{
    const c=document.querySelector(`#edd-grid td[data-i="${i0+di}"][data-j="${j0+dj}"]`);
    if(c && c.hasAttribute('contenteditable')){ c.textContent=v; _eddMarcar(c, v); n++; }
  }));
  if(n>1) toast(`${n} celdas pegadas (falta grabar)`,'scs');
}

// Enter baja a la fila siguiente; Esc deshace la celda
function eddTecla(e){
  const td=e.target.closest('td'); if(!td) return;
  if(e.key==='Enter'){
    e.preventDefault();
    const sig=document.querySelector(`#edd-grid td[data-i="${+td.dataset.i+(e.shiftKey?-1:1)}"][data-j="${td.dataset.j}"]`);
    if(sig){ sig.focus(); const r=document.createRange(); r.selectNodeContents(sig); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }
  } else if(e.key==='Escape'){
    const i=+td.dataset.i, c=_edd.cols[+td.dataset.j];
    td.textContent=_eddTxt(_edd.filas[i][c]); _eddMarcar(td, td.textContent);
  }
}

async function eddGuardar(){
  const n=_eddPendientes();
  if(!n){ toast('No hay cambios','err'); return; }
  if(!confirm(`¿Grabar ${n} cambio${n===1?'':'s'} en ${_edd.tabla}?\n\nVa directo a la base, sin los controles de SGV.`)) return;
  const cambios=Object.entries(_edd.cambios).map(([k,valor])=>{
    const [i,campo]=k.split('|'); return { pk:_edd.filas[+i][_edd.pk], campo, valor };
  });
  const btn=document.getElementById('edd-guardar'); btn.disabled=true; btn.textContent='⏳ Grabando…';
  try{
    const r=await apiPost('/datos/guardar',{ tabla:_edd.tabla, cambios });
    if(r.errores && r.errores.length)
      sgvAviso({ titulo:`Se grabaron ${r.grabados}, fallaron ${r.errores.length}`, texto:r.errores.slice(0,15).join('\n'), tipo:'adv' });
    else toast(`${r.grabados} cambio${r.grabados===1?'':'s'} grabado${r.grabados===1?'':'s'}`,'scs');
    _edd.cambios={};
    await eddLeer(true);
  }catch(e){ sgvAviso({ titulo:'No se pudo grabar', texto:e.message, tipo:'err' }); }
  finally{ eddBoton(); }
}

async function eddGlobal(){
  const campo=document.getElementById('edd-gc').value, valor=document.getElementById('edd-gv').value;
  const filtros=_eddFiltros();
  if(!_edd.tabla||!campo){ toast('Elegí la tabla y el campo','err'); return; }
  if(!filtros.length){ toast('Poné al menos un filtro','err'); return; }
  try{
    const c=await apiPost('/datos/global',{ tabla:_edd.tabla, filtros, campo, valor });
    if(!c.ok){ sgvAviso({ titulo:'No se pudo', texto:c.error, tipo:'err' }); return; }
    if(!c.cantidad){ toast('Ningún registro cumple el filtro','err'); return; }
    const desc=filtros.map(f=>`${f.campo} ${f.op} "${f.valor}"`).join(' y ');
    if(!confirm(`¿Poner ${campo} = "${valor||'(vacío)'}" en ${c.cantidad} registro${c.cantidad===1?'':'s'} de ${_edd.tabla}?\n\nFiltro: ${desc}\n\nVa directo a la base, sin los controles de SGV.`)) return;
    const r=await apiPost('/datos/global',{ tabla:_edd.tabla, filtros, campo, valor, confirmar:true });
    if(!r.ok){ sgvAviso({ titulo:'No se pudo', texto:r.error, tipo:'err' }); return; }
    toast(`${r.cantidad} registros actualizados`,'scs');
    _edd.cambios={};
    await eddLeer(true);
  }catch(e){ sgvAviso({ titulo:'No se pudo', texto:e.message, tipo:'err' }); }
}

// Copia la grilla (lo que se ve, con los cambios) como texto con tabulaciones: se pega en Excel
async function eddCopiar(){
  if(!_edd.cols.length){ toast('No hay datos','err'); return; }
  const lineas=[_edd.cols.join('\t')].concat(_edd.filas.map((f,i)=>_edd.cols.map(c=>{
    const k=i+'|'+c; return (k in _edd.cambios ? _edd.cambios[k] : _eddTxt(f[c])).replace(/[\t\n]/g,' ');
  }).join('\t')));
  try{ await navigator.clipboard.writeText(lineas.join('\n')); toast(`${_edd.filas.length} filas copiadas: pegalas en Excel`,'scs'); }
  catch(e){ toast('No se pudo copiar: '+e.message,'err'); }
}

// La grilla termina donde termina la ventana: así se ve la barra de desplazamiento de abajo
function eddAjustarAlto(){
  const w=document.getElementById('edd-wrap'); if(!w || !w.offsetParent) return;
  w.style.height=Math.max(200, window.innerHeight - w.getBoundingClientRect().top - 12)+'px';
}
window.addEventListener('resize', eddAjustarAlto);

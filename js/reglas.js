/* ===========================================================================
   REGLAS DE VISIBILIDAD  (Utilidades → Qué ve cada grupo)
   - El NIVEL del usuario decide qué PUEDE HACER (ver/alta/baja/modif).
   - El GRUPO DE TRABAJO decide qué NO VE dentro de lo que ya puede ver.
   - Las reglas son POR LA NEGATIVA: lo que no esté tildado acá, se ve.
   - El campo oculto NO SE MANDA al navegador: no alcanza con esconderlo en
     pantalla, porque el dato se vería igual desde la consola.
   =========================================================================== */

// Qué campos se pueden ocultar de cada tabla. El nombre es el de la COLUMNA en
// la base, que es lo que el server usa para filtrar.
const REGL_CAMPOS = {
  articulos: { label:'Artículos', campos:[
    ['art_pre',   'Precio de venta'],
    ['art_costo', 'Costo'],
    ['art_stk',   'Stock Hatsu'],
    ['art_stkt',  'Stock Tressa'],
    ['art_deph',  'Depósito Hatsu'],
    ['art_dept',  'Depósito Tressa'],
    ['art_prov',  'Proveedor'],
    ['codcasio',  'Código Casio']
  ]},
  clientes: { label:'Clientes', campos:[
    ['cli_cuit',   'CUIT'],
    ['cli_icred',  'Límite de crédito'],
    ['cli_dto',    'Descuento'],
    ['cli_obs',    'Observaciones'],
    ['cli_incob',  'Marca de incobrable'],
    ['cli_nodar',  'Marca de no vender'],
    ['cli_abc',    'Grupo de Compras'],
    ['cli_cate',   'Categoría'],
    ['cli_fcred',  'Vencimiento del crédito'],
    ['cli_ent_domic', 'Domicilio de entrega'],
    ['cli_email',  'E-mail']
  ]},
  facturas: { label:'Facturas', campos:[
    ['fac_saldo_afip', 'Saldo contable'],
    ['fac_total_afip', 'Total contable'],
    ['fac_neto_afip',  'Neto contable'],
    ['fac_iva_afip',   'IVA contable'],
    ['fac_comis',      'Comisión'],
    ['fac_cotiz',      'Cotización']
  ]},
  despachos: { label:'Despachos', campos:[
    ['dep_fob',    'FOB'],
    ['dep_gas2',   '% de gastos'],
    ['dep_costo',  'Costo'],
    ['dep_cotiz',  'Cotización'],
    ['dep_proc',   'Procedencia']
  ]}
};

let _reglData = null, _reglGrupo = '', _reglTabla = 'articulos', _reglSolapa = 'campos';

// PANTALLA elegida (Ricardo, Nov 2026): manda en las dos solapas.
//   Campos    → los campos de la tabla de esa pantalla (si tiene)
//   Pantallas → si entra a la pantalla + TODOS sus botones
let _reglPant = 'art';
const REGL_TABLA_DE = { art:'articulos', cli:'clientes', ficha:'clientes', ctacte:'clientes', fac:'facturas', desp:'despachos' };
// Botones que se arman al abrir la pantalla (no están en el HTML de entrada)
const REGL_BTN_DIN = { fac:[['fac-afip','⚡ Autorizar AFIP'],['fac-imprimir','🖨 Imprimir factura autorizada'],
   ['fac-verformato','🖨 Ver formato factura (antes de autorizar)'],['fac-impborrador','🖨 Imprimir Borrador'],
   ['fac-anular','🚫 Anular'],['fac-eliminar','🗑 Eliminar'],['fac-aplicarnc','📌 Aplicar NC'],
   ['fac-remito','🚚 Remito'],['fac-firmar','✍ Firmar'],['fac-comentario','💬 Comentario'],
   ['fac-borrador','📄 Factura de Borrador (al cargar)'],['fac-importar','📥 Importar Excel (al cargar)']] };

function reglPantallas(){
  return [...document.querySelectorAll('.dd-item[id^="ddi-"]')].map(b=>({
    sub: b.id.replace('ddi-',''), label:(b.textContent||'').trim(),
    menu:(b.closest('.dd-wrap')?.querySelector('.dd-btn')?.textContent||'').trim() }));
}
// Botones de UNA pantalla
function reglBotones(sub){
  if(typeof sgvMarcarBotones==='function') sgvMarcarBotones();
  const out=[], vistos=new Set();
  document.querySelectorAll(`#page-${sub} [data-regla]`).forEach(b=>{
    const id=b.dataset.regla; if(vistos.has(id)) return; vistos.add(id);
    out.push({ id:'btn:'+id, label:(b.textContent||'').trim()||id });
  });
  (REGL_BTN_DIN[sub]||[]).forEach(([id,l])=>{ if(!vistos.has(id)) out.push({ id:'btn:'+id, label:l }); });
  return out;
}

function _rgEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function renderReglas(){
  _rgStyle();
  // Grupos
  const gs=document.getElementById('regl-grupo');
  if(gs && gs.options.length<=1){
    gs.innerHTML='<option value="">— Elegí un grupo —</option>'
      + (((typeof TABLAS!=='undefined'&&TABLAS['GRTR'])||[])
         .map(g=>`<option value="${_rgEsc(g.CODIGO)}">${_rgEsc(g.CODIGO)} — ${_rgEsc(g.DETALLE)}</option>`).join(''));
  }
  // Pantallas, agrupadas por menú
  const ts=document.getElementById('regl-tabla');
  if(ts && !ts.options.length){
    const porMenu={}; reglPantallas().forEach(p=>{ (porMenu[p.menu]||(porMenu[p.menu]=[])).push(p); });
    ts.innerHTML=Object.entries(porMenu).map(([m,l])=>`<optgroup label="${_rgEsc(m)}">`+
      l.map(p=>`<option value="${p.sub}"${p.sub===_reglPant?' selected':''}>${_rgEsc(p.label)}</option>`).join('')+'</optgroup>').join('');
  }
  reglCargar();
}

async function reglCargar(){
  const body=document.getElementById('regl-body'); if(!body) return;
  try{
    const r=await apiGet('/reglas');
    if(!r.ok){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_rgEsc(r.error||'Error')+'</div>'; return; }
    _reglData=r; _rgPintar();
  }catch(e){
    body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+_rgEsc(e.message||'Error')+'</div>';
  }
}

function reglOnCambio(){
  _reglGrupo=(document.getElementById('regl-grupo')?.value||'').trim();
  _reglPant=(document.getElementById('regl-tabla')?.value||'art').trim();
  _reglTabla=REGL_TABLA_DE[_reglPant]||'';
  _rgPintar();
}

function reglSolapa(cual){
  _reglSolapa=cual;
  document.querySelectorAll('.regl-tab').forEach(b=>b.classList.toggle('pri', b.dataset.s===cual));
  // El selector de tabla sólo aplica a los campos
  const ts=document.getElementById('regl-tabla');
  if(ts) ts.style.display = cual==='campos' ? '' : 'none';
  _rgPintar();
}

function _rgMenuOculto(id){
  return (_reglData?.grupo||[]).some(r =>
    r.grupo===_reglGrupo && (r.tipo||'')==='menu' && r.campo===id);
}

async function reglToggleMenu(id, ocultar){
  if(!_reglGrupo){ toast('Elegí un grupo','err'); return; }
  try{
    const r=await apiPost('/reglas/guardar',{ grupo:_reglGrupo, tabla:'menu', tipo:'menu', campo:id, quitar:!ocultar });
    if(!r || r.ok===false){ toast((r&&r.error)||'No se pudo guardar','err'); return; }
    _reglData.grupo=(_reglData.grupo||[]).filter(x =>
      !(x.grupo===_reglGrupo && (x.tipo||'')==='menu' && x.campo===id));
    if(ocultar) _reglData.grupo.push({ grupo:_reglGrupo, tabla:'menu', tipo:'menu', campo:id });
    _rgPintar();
    toast(ocultar ? 'Pantalla oculta para el grupo' : 'Pantalla visible de nuevo','scs');
  }catch(e){ toast('Error: '+e.message,'err'); }
}

function _rgOculto(campo){
  return (_reglData?.grupo||[]).some(r =>
    r.grupo===_reglGrupo && r.tabla===_reglTabla && (r.tipo||'campo')==='campo' && r.campo===campo);
}

function _rgPintar(){
  const body=document.getElementById('regl-body'); if(!body) return;
  if(!_reglGrupo){
    body.innerHTML='<div class="empty" style="margin-top:30px">Elegí un grupo para ver y cambiar sus reglas</div>';
    return;
  }
  // ── Solapa PANTALLAS: a qué ítems del menú no entra ──
  const pant=reglPantallas().find(p=>p.sub===_reglPant)||{ sub:_reglPant, label:_reglPant };
  if(_reglSolapa==='menu'){
    // La PANTALLA elegida: si entra, y TODOS sus botones
    const items=[{ id:pant.sub, label:'Entrar a '+pant.label, menu:'Pantalla' },
                 ...reglBotones(pant.sub).map(b=>({ ...b, menu:'Botones' }))];
    const ocul=items.filter(i=>_rgMenuOculto(i.id)).length;
    body.innerHTML=`
      <div class="rg-cab">
        <b>${_rgEsc(pant.label)}</b>: tildá lo que el grupo <b>${_rgEsc(_reglGrupo)}</b> <b>NO</b> puede usar.
        <span class="rg-cnt">${ocul} oculto(s)</span>
      </div>`
      + ['Pantalla','Botones'].map(men=>{ const lista=items.filter(i=>i.menu===men); if(!lista.length) return '';
        return `<div class="rg-men">${men}</div>`+lista.map(i=>{
          const on=_rgMenuOculto(i.id);
          return `<label class="rg-fila${on?' on':''}" style="grid-template-columns:28px 1fr 160px 90px">
            <input type="checkbox" ${on?'checked':''} onchange="reglToggleMenu('${i.id}',this.checked)">
            <span class="rg-lbl">${_rgEsc(i.label)}</span>
            <span class="rg-col">${_rgEsc(i.id)}</span>
            <span class="rg-est">${on?'No':'Sí'}</span>
          </label>`; }).join(''); }).join('')
      + (items.length===1?'<div class="empty" style="margin-top:20px">Esta pantalla no tiene botones para ocultar</div>':'');
    return;
  }

  if(!REGL_CAMPOS[_reglTabla]){ body.innerHTML=`<div class="empty" style="margin-top:30px">${_rgEsc(pant.label)} no tiene campos configurables. Mirá la solapa Pantallas.</div>`; return; }
  const def=REGL_CAMPOS[_reglTabla];
  if(!def){ body.innerHTML='<div class="empty" style="margin-top:30px">Tabla sin campos configurables</div>'; return; }

  const ocultos=def.campos.filter(([c])=>_rgOculto(c)).length;
  body.innerHTML=`
    <div class="rg-cab">
      Tildá lo que el grupo <b>${_rgEsc(_reglGrupo)}</b> <b>NO</b> tiene que ver de ${_rgEsc(def.label)}.
      Lo que quede sin tildar, se ve. <span class="rg-cnt">${ocultos} oculto(s)</span>
    </div>
    ${def.campos.map(([campo,lbl])=>{
      const on=_rgOculto(campo);
      return `<label class="rg-fila${on?' on':''}">
        <input type="checkbox" ${on?'checked':''} onchange="reglToggle('${campo}',this.checked)">
        <span class="rg-lbl">${_rgEsc(lbl)}</span>
        <span class="rg-col">${_rgEsc(campo)}</span>
        <span class="rg-est">${on?'No lo ve':'Lo ve'}</span>
      </label>`;
    }).join('')}`;
}

async function reglToggle(campo, ocultar){
  if(!_reglGrupo){ toast('Elegí un grupo','err'); return; }
  try{
    const r=await apiPost('/reglas/guardar',{ grupo:_reglGrupo, tabla:_reglTabla, campo, quitar:!ocultar });
    if(!r || r.ok===false){ toast((r&&r.error)||'No se pudo guardar','err'); return; }
    // Se refleja en memoria sin volver a pedir todo
    _reglData.grupo=(_reglData.grupo||[]).filter(x =>
      !(x.grupo===_reglGrupo && x.tabla===_reglTabla && x.campo===campo));
    if(ocultar) _reglData.grupo.push({ grupo:_reglGrupo, tabla:_reglTabla, tipo:'campo', campo });
    _rgPintar();
    toast(ocultar ? 'Campo oculto para el grupo' : 'Campo visible de nuevo','scs');
  }catch(e){ toast('Error: '+e.message,'err'); }
}

function _rgStyle(){
  if(document.getElementById('regl-style')) return;
  const st=document.createElement('style'); st.id='regl-style';
  st.textContent=`
    .rg-cab{margin:12px 14px;padding:9px 12px;border-radius:8px;font-size:13px;line-height:1.6;
      background:rgba(55,138,221,.10);color:#185FA5}
    .rg-cnt{float:right;font-size:12px;color:var(--t2)}
    .rg-fila{display:grid;grid-template-columns:28px 1fr 180px 90px;gap:8px;align-items:center;
      margin:0 14px;padding:9px 12px;border-bottom:1px solid var(--b1);font-size:13px;cursor:pointer}
    .rg-fila:hover{background:var(--s2)}
    .rg-fila.on{background:rgba(226,75,74,.06)}
    .rg-fila input{width:16px;height:16px;cursor:pointer}
    .rg-col{font-family:var(--mono);font-size:11px;color:var(--t3)}
    .rg-est{text-align:right;font-size:12px;color:var(--t2)}
    .rg-fila.on .rg-est{color:var(--red);font-weight:600}
    .rg-men{margin:14px 14px 0;padding:6px 12px;font-size:11px;text-transform:uppercase;
      letter-spacing:.5px;color:var(--t3);background:var(--s2);border-radius:6px}
  `;
  document.head.appendChild(st);
}

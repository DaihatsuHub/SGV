// ═══════════════════════════════════════════════════════════
// ARMÁ TU INFORME CON TEXTO (Ricardo, Oct 2026)
// Se escribe la pregunta en castellano ("los 5 artículos de Tressa más
// vendidos este mes al cliente X") y la IA la traduce a los FILTROS del
// armador. Después se consulta como si el usuario los hubiera elegido a mano:
// las reglas de cada grupo las sigue aplicando el server.
//
// Archivo APARTE del armador a propósito: no lo toca. Para apagarlo alcanza
// con sacar su <script> del index.html.
// Prefijo propio `iaArm` para no chocar con ningún otro archivo.
// ═══════════════════════════════════════════════════════════

(function(){
  if(document.getElementById('iaarm-estilos')) return;
  const st=document.createElement('style'); st.id='iaarm-estilos';
  st.textContent=`
    .iaarm-caja{display:flex;gap:8px;align-items:center;margin:10px 14px 0}
    .iaarm-caja input{flex:1;min-width:0;height:34px;font-size:14px;padding:0 12px;border-radius:8px;
      border:1px solid var(--b1);background:var(--s1);color:var(--txt)}
    .iaarm-caja input:focus{outline:2px solid #0a58ca;outline-offset:0}
    .iaarm-nota{margin:6px 14px 0;font-size:12px;color:#854F0B}`;
  document.head.appendChild(st);
})();

// Catálogo que se le pasa a la IA: sólo códigos y descripciones de tablas
function _iaArmCatalogo(){
  const T=(typeof TABLAS!=='undefined' && TABLAS) || {};
  return ['VEND','MARC','RUBR','GRUP','CCOS','PCIA','MONE'].map(k=>
    (T[k]||[]).map(x=>`${k}|${String(x.CODIGO||'').trim()}=${String(x.DETALLE||'').trim()}`).join('\n')
  ).filter(Boolean).join('\n');
}
function _iaArmHoy(){ const h=new Date(); return h.getFullYear()+'-'+String(h.getMonth()+1).padStart(2,'0')+'-'+String(h.getDate()).padStart(2,'0'); }
const _iaArmNorm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();

// Busca en una lista por código exacto o por texto contenido.
// Devuelve { uno } si hay un solo candidato, { varios } si hay más.
function _iaArmBuscar(lista, texto, cod, desc){
  const t=_iaArmNorm(texto); if(!t) return {};
  const exacto=lista.find(x=>_iaArmNorm(cod(x))===t);
  if(exacto) return { uno:exacto };
  const L=lista.filter(x=>_iaArmNorm(desc(x)).includes(t) || _iaArmNorm(cod(x)).includes(t));
  if(L.length===1) return { uno:L[0] };
  const igual=L.filter(x=>_iaArmNorm(desc(x))===t);
  if(igual.length===1) return { uno:igual[0] };
  return L.length ? { varios:L } : {};
}

function _iaArmPoner(id, val){
  const e=document.getElementById(id); if(!e) return true;
  if(!val){ e.value=''; return true; }
  e.value=val;
  return e.value===val;        // en un <select>, si la opción no existe queda vacío
}

async function iaArmPreguntar(){
  const inp=document.getElementById('iaarm-frase'), nota=document.getElementById('iaarm-nota');
  const frase=(inp?.value||'').trim();
  if(!frase){ inp?.focus(); return; }
  const btn=document.getElementById('iaarm-btn');
  if(btn){ btn.disabled=true; btn.textContent='⏳ Pensando…'; }
  if(nota) nota.textContent='';
  try{
    const r=await apiPost('/ia/armador',{ frase, hoy:_iaArmHoy(), catalogo:_iaArmCatalogo() });
    if(!r || !r.ok){ sgvAviso({ titulo:'No se pudo interpretar', texto:(r&&r.error)||'Error del servidor', tipo:'err' }); return; }
    _iaArmAplicar(r.filtros||{});
  }catch(e){
    sgvAviso({ titulo:'No se pudo interpretar', texto:e.message||'Error de conexión', tipo:'err' });
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='✨ Preguntar'; }
  }
}

function _iaArmAplicar(f){
  if(typeof renderArmador==='function') renderArmador();     // combos cargados
  if(typeof armLimpiar==='function') armLimpiar();
  const avisos=[];

  if(f.desde) _iaArmPoner('am-desde', f.desde);
  if(f.hasta) _iaArmPoner('am-hasta', f.hasta);
  document.querySelectorAll('.am-per').forEach(b=>b.classList.remove('pri'));

  // Cliente y artículo: vuelven como texto y se buscan acá
  if(f.cliente){
    const b=_iaArmBuscar(CLIS||[], f.cliente, c=>c.CLI_CODIGO, c=>c.CLI_RAZON);
    if(b.uno) _iaArmPoner('am-cli', `${(b.uno.CLI_RAZON||'').trim()} — ${(b.uno.CLI_CODIGO||'').trim()}`);
    else if(b.varios) avisos.push(`Hay ${b.varios.length} clientes que coinciden con "${f.cliente}": `
      + b.varios.slice(0,5).map(c=>(c.CLI_RAZON||'').trim()).join(', ')+(b.varios.length>5?'…':'')+'. Elegilo en el filtro.');
    else avisos.push(`No encontré el cliente "${f.cliente}".`);
  }
  if(f.articulo){
    const b=_iaArmBuscar(ARTS||[], f.articulo, a=>a.ART_COD, a=>a.ART_DES);
    if(b.uno) _iaArmPoner('am-art', `${(b.uno.ART_COD||'').trim()} — ${b.uno.ART_DES||''}`);
    else if(b.varios) avisos.push(`Hay ${b.varios.length} artículos que coinciden con "${f.articulo}". Elegilo en el filtro.`);
    else avisos.push(`No encontré el artículo "${f.articulo}".`);
  }

  // Tablas: el código tiene que existir en el selector
  [['am-vend','vend','vendedor'],['am-marca','marca','marca'],['am-rubro','rubro','rubro'],
   ['am-grupo','grupo','grupo'],['am-ccos','ccos','centro de costos'],['am-prov','prov','provincia'],
   ['am-moneda','moneda','moneda']].forEach(([id,k,nom])=>{
    if(f[k] && !_iaArmPoner(id, f[k])) avisos.push(`No reconocí ${nom} "${f[k]}".`);
  });
  _iaArmPoner('am-empresa', f.empresa||'');
  _iaArmPoner('am-g1', f.g1||'cliente');
  _iaArmPoner('am-g2', f.g2||'');
  _iaArmPoner('am-orden', f.orden||'importe');
  // El límite es un selector con 10/20/50: si pide otro número ("los 5"), se agrega la opción
  const lim=f.limite ? String(f.limite) : '', selLim=document.getElementById('am-limite');
  if(lim && selLim && ![...selLim.options].some(o=>o.value===lim)){
    const op=document.createElement('option'); op.value=lim; op.textContent='Primeros '+lim; selLim.appendChild(op);
  }
  _iaArmPoner('am-limite', lim);

  if(f.aclaracion) avisos.push(f.aclaracion);
  const nota=document.getElementById('iaarm-nota');
  if(nota) nota.textContent=avisos.join(' ');

  if(typeof _amFrase==='function') _amFrase();
  if(typeof armConsultar==='function') armConsultar();
}

// Pone la caja de texto arriba de la frase del armador
function _iaArmInstalar(){
  const ref=document.getElementById('am-frase');
  if(!ref || document.getElementById('iaarm-frase')) return;
  const caja=document.createElement('div');
  caja.className='iaarm-caja';
  caja.innerHTML=`<input id="iaarm-frase" type="text" autocomplete="off" maxlength="500"
      placeholder="Preguntá en castellano: los 5 artículos de Tressa más vendidos este mes…"
      onkeydown="if(event.key==='Enter'){event.preventDefault();iaArmPreguntar()}">
    <button class="btn pri" id="iaarm-btn" onclick="iaArmPreguntar()">✨ Preguntar</button>`;
  const nota=document.createElement('div'); nota.id='iaarm-nota'; nota.className='iaarm-nota';
  ref.parentNode.insertBefore(caja, ref);
  ref.parentNode.insertBefore(nota, ref);
}

(function(){
  const arrancar=()=>{
    _iaArmInstalar();
    if(!document.getElementById('iaarm-frase') && 'MutationObserver' in window){
      const obs=new MutationObserver(()=>{ _iaArmInstalar(); if(document.getElementById('iaarm-frase')) obs.disconnect(); });
      obs.observe(document.body,{childList:true,subtree:true});
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

/* ===========================================================================
   QUÉ VE CADA GRUPO — versión SIMPLE (prueba, Ricardo, Nov 2026)
   Utilidades → 🧪 Qué ve cada grupo (nuevo). Convive con la actual: usa LAS
   MISMAS reglas guardadas (grupo_reglas), así que no se pierde nada.
   - Se elige el grupo y se ve el árbol: MENÚ → pantallas → Campos y Botones.
   - Todo lo tildado = "No lo ve".
   - Tildar un MENÚ (ej. Cobranzas) tilda todo lo que tiene adentro; tildar
     una PANTALLA tilda sus campos y botones. Destildar, al revés.
   =========================================================================== */

let _r2Data = null, _r2Grupo = '', _r2Abiertos = new Set(), _r2MenuAb = new Set();
// Primero sólo los MENÚS (Artículos, Clientes, Compras…); al abrir uno, sus submenús

function renderReglas2(){
  _r2Style();
  const gs=document.getElementById('r2-grupo');
  if(gs && gs.options.length<=1){
    gs.innerHTML='<option value="">— Elegí un grupo —</option>'
      +(((typeof TABLAS!=='undefined'&&TABLAS['GRTR'])||[]).map(g=>`<option value="${esc(g.CODIGO)}">${esc(g.CODIGO)} — ${esc(g.DETALLE)}</option>`).join(''));
  }
  r2Cargar();
}
async function r2Cargar(){
  const body=document.getElementById('r2-body'); if(!body) return;
  try{ const r=await apiGet('/reglas'); if(!r.ok) throw new Error(r.error||'Error'); _r2Data=r; r2Pintar(); }
  catch(e){ body.innerHTML='<div class="empty" style="margin-top:30px">⚠️ '+esc(e.message)+'</div>'; }
}
function r2OnGrupo(){ _r2Grupo=(document.getElementById('r2-grupo')?.value||'').trim(); r2Pintar(); _r2Corregir(); }

// ── Qué hay en cada pantalla ──
// Tabla de cada pantalla y TODOS sus campos: los de la lista de reglas más
// todas las columnas de su grilla (Ricardo, Nov 2026: faltaban campos).
const _R2_TABLA = { art:'articulos', cli:'clientes', ficha:'clientes', ctacte:'clientes', comp:'clientes',
  fac:'facturas', desp:'despachos', reci:'recibos', cart:'cheques', oc:'ordenes_compra', ctip:'comp_tipos' };
const _R2_GRILLA = { art:'art', cli:'cli', desp:'desp', reci:'reci', cart:'cart', oc:'oc', ctip:'ctip' };
const _R2_CLAVES = new Set(['art_cod','cli_codigo','dep_id','fac_nro']);   // la clave no se oculta
function _r2TablaDe(sub){ return _R2_TABLA[sub] || ((typeof REGL_TABLA_DE!=='undefined'&&REGL_TABLA_DE[sub])||''); }
function _r2Campos(sub, tabla){
  if(!tabla) return [];
  const out=[], vistos=new Set();
  const add=(c,l)=>{ c=String(c||'').toLowerCase(); if(!c||vistos.has(c)||_R2_CLAVES.has(c)) return; vistos.add(c); out.push({ tabla, campo:c, label:l||c }); };
  ((typeof REGL_CAMPOS!=='undefined'&&REGL_CAMPOS[tabla]?.campos)||[]).forEach(([c,l])=>add(c,l));
  const g=_R2_GRILLA[sub] || Object.keys(_R2_GRILLA).find(k=>_R2_TABLA[k]===tabla && _R2_GRILLA[k]);
  ((typeof COL_DEFS!=='undefined'&&COL_DEFS[g])||[]).forEach(d=>add(d.field, d.label));
  return out;
}
// MENÚS = los de la barra de arriba (Artículos, Clientes, Compras, Ventas,
// Cobranzas, Dashboard, Utilidades, IA) y adentro sus submenús.
function r2Menus(){
  const out=[];
  document.querySelectorAll('.topnav .tnav, nav .tnav, .tnav').forEach(t=>{
    if(out.some(m=>m.el===t)) return;
    const lbl=(t.childNodes[0]?.textContent||t.textContent||'').replace('▼','').trim();
    const dd=(t.getAttribute('onclick')||'').match(/toggleDD\('([^']+)'/);
    if(dd){
      const subs=[...document.querySelectorAll('#'+dd[1]+' .dd-item[id^="ddi-"]')].map(b=>({ sub:b.id.replace('ddi-',''), label:(b.textContent||'').trim() }));
      if(subs.length) out.push({ el:t, menu:lbl, subs });
    } else if(t.id==='ddi-dash') out.push({ el:t, menu:lbl, subs:[{ sub:'dash', label:lbl }] });
    else if(t.id==='tnav-ia')    out.push({ el:t, menu:lbl, subs:[{ sub:'psgv', label:'✨ Preguntale a SGV' }] });
  });
  return out;
}
function _r2Arbol(){
  return r2Menus().map(m=>({ menu:m.menu, pants:m.subs.map(p=>{
    const tabla=_r2TablaDe(p.sub);
    return { sub:p.sub, label:p.label, campos:_r2Campos(p.sub, tabla), botones:(typeof reglBotones==='function'?reglBotones(p.sub):[]) };
  }) }));
}

// ── Estado ──
const _r2MenuOc  = id => (_r2Data?.grupo||[]).some(r=>r.grupo===_r2Grupo&&(r.tipo||'')==='menu'&&r.campo===id);
const _r2CampoOc = (t,c) => (_r2Data?.grupo||[]).some(r=>r.grupo===_r2Grupo&&r.tabla===t&&(r.tipo||'campo')==='campo'&&r.campo===c);
// Todo lo de una pantalla: ella, sus campos y sus botones
const _r2Todo = p => [{ k:'m', id:p.sub }, ...p.botones.map(b=>({ k:'m', id:b.id })), ...p.campos.map(c=>({ k:'c', t:c.tabla, id:c.campo }))];
const _r2Oc = x => x.k==='m' ? _r2MenuOc(x.id) : _r2CampoOc(x.t, x.id);
function _r2Estado(lista){ const n=lista.filter(_r2Oc).length; return n===0?'no':(n===lista.length?'si':'parcial'); }
// Una pantalla: si la ENTRADA está apagada, no la ve (aunque tenga cosas tildadas adentro)
function _r2EstPant(p){ return _r2MenuOc(p.sub) ? 'si' : _r2Estado(_r2Todo(p)); }
function _r2EstMenu(m){ const e=m.pants.map(_r2EstPant); return e.every(x=>x==='si')?'si':(e.every(x=>x==='no')?'no':'parcial'); }

// ── Guardar (una o muchas reglas, de una sola vez) ──
async function _r2Set(lista, ocultar){
  if(!_r2Grupo){ toast('Elegí un grupo','err'); return; }
  const cambiar=lista.filter(x=>_r2Oc(x)!==ocultar);
  if(!cambiar.length) return;
  const body=document.getElementById('r2-body'); body.style.opacity='.6';
  try{
    const items=cambiar.map(x=>x.k==='m'?{ tabla:'menu', tipo:'menu', campo:x.id }:{ tabla:x.t, tipo:'campo', campo:x.id });
    const r=await apiPost('/reglas/lote',{ grupo:_r2Grupo, ocultar, items });
    if(!r||r.ok===false) throw new Error((r&&r.error)||'No se pudo guardar');
    items.forEach(it=>{
      _r2Data.grupo=(_r2Data.grupo||[]).filter(g=>!(g.grupo===_r2Grupo&&g.tabla===it.tabla&&(g.tipo||'campo')===it.tipo&&g.campo===it.campo));
      if(ocultar) _r2Data.grupo.push({ grupo:_r2Grupo, ...it });
    });
    toast(ocultar?`${items.length} oculto(s)`:`${items.length} visible(s)`,'scs');
  }catch(e){ toast('Error: '+e.message,'err'); }
  body.style.opacity=''; r2Pintar();
}
// MODO (Ricardo, Nov 2026): marcar lo que NO ve, o ir por la negativa y
// marcar lo que SÍ ve. Sólo cambia qué significa el tilde; lo guardado es igual.
// MODO POR MENÚ (Ricardo, Nov 2026): en cada menú se elige si se marca lo que
// NO ve o lo que SÍ ve. Pasar un menú a "SÍ ve" lo oculta entero y después se
// tilda lo que sí ve. Se recuerda por grupo y menú en esta PC.
let _r2Modo='no';
const _r2ModoKey = m => 'sgv_r2modo|'+_r2Grupo+'|'+m;
function _r2ModoDe(m){ try{ return localStorage.getItem(_r2ModoKey(m))||'no'; }catch(_){ return 'no'; } }
async function r2ModoMenu(i, modo){
  const m=_R2[i]; if(!m) return;
  try{ localStorage.setItem(_r2ModoKey(m.menu), modo); }catch(_){}
  if(modo==='si'){
    const todo=m.pants.flatMap(_r2Todo);
    if(todo.some(x=>!_r2Oc(x)) && confirm(`${m.menu}: ¿ocultar todo y marcar después lo que SÍ ve?`)) { await _r2Set(todo, true); return; }
  }
  r2Pintar();
}
// El tilde → ocultar o mostrar según el modo del menú
// Criterio ÚNICO (Ricardo, Nov 2026): tildado = LO VE (permitido); destildado = no lo ve.
const _r2OcultarEn = (modo, checked) => !checked;
let _R2 = [];   // árbol pintado (para los onclick)
function r2Menu(i, on){ _r2Set(_R2[i].pants.flatMap(_r2Todo), _r2OcultarEn(_r2ModoDe(_R2[i].menu), on)); }
function r2Pant(i, j, on){ _r2Set(_r2Todo(_R2[i].pants[j]), _r2OcultarEn(_r2ModoDe(_R2[i].menu), on)); }
function r2Item(i, j, k, on){
  const p=_R2[i].pants[j], it=_r2Todo(p).slice(1)[k];
  // Habilitar un campo o botón habilita también ENTRAR a la pantalla (si no, no serviría)
  _r2Set(on && _r2MenuOc(p.sub) ? [it, { k:'m', id:p.sub }] : [it], !on);
}
// Apagar la entrada apaga todo lo de adentro; prenderla sólo habilita entrar
function r2Entrar(i, j, on){ const p=_R2[i].pants[j]; _r2Set(on ? [{ k:'m', id:p.sub }] : _r2Todo(p), !on); }

// "EN PARTE" = ENTRA y sólo no ve lo destildado (Ricardo, Nov 2026). Si una
// pantalla tiene algo habilitado adentro pero la entrada apagada (quedó así de
// antes), se le habilita la entrada.
async function _r2Corregir(){
  if(!_r2Grupo) return;
  const fix=[];
  _r2Arbol().forEach(m=>m.pants.forEach(p=>{
    if(_r2MenuOc(p.sub) && _r2Todo(p).slice(1).some(x=>!_r2Oc(x))) fix.push({ k:'m', id:p.sub });
  }));
  if(fix.length){ await _r2Set(fix, false); toast(`${fix.length} pantalla(s) "en parte" quedaron con entrada habilitada`,'scs'); }
}
function r2AbrirMenu(i){ const m=_R2[i]?.menu; if(!m) return; _r2MenuAb.has(m)?_r2MenuAb.delete(m):_r2MenuAb.add(m); r2Pintar(); }
function r2Abrir(sub){ _r2Abiertos.has(sub)?_r2Abiertos.delete(sub):_r2Abiertos.add(sub); r2Pintar(); }

function r2Pintar(){
  const body=document.getElementById('r2-body'); if(!body) return;
  if(!_r2Grupo){ body.innerHTML='<div class="empty" style="margin-top:30px">Elegí un grupo</div>'; return; }
  _R2=_r2Arbol();
  // est = 'si' (oculto), 'no' (visible), 'parcial'. En modo "lo que SÍ ve" el tilde es lo visible.
  const chk=(est,fn)=>{ const on=est==='no';   // tildado = lo ve
    return `<input type="checkbox" ${on?'checked':''} onclick="event.stopPropagation()" onchange="${fn}" data-parcial="${est==='parcial'?1:0}">`; };
  const tag=est=>est==='si'?'<span class="r2-tag no">No lo ve</span>':est==='parcial'?'<span class="r2-tag par">En parte</span>':'<span class="r2-tag si">Lo ve</span>';
  body.innerHTML=``
   + `<div class="r2-cab">✔ Tildado = el grupo <b>${esc(_r2Grupo)}</b> lo ve. Destildar un menú apaga todo lo que tiene adentro;
     después podés volver a tildar sólo lo que sí tiene que ver.</div>`
   + _R2.map((m,i)=>{
      const em=_r2EstMenu(m);
      const abM=_r2MenuAb.has(m.menu);
      const md='';
      return `<div class="r2-menu"><div class="r2-mrow">${chk(em,`r2Menu(${i},this.checked)`)}
          <b class="r2-mlbl" onclick="r2AbrirMenu(${i})">${abM?'▾':'▸'} ${esc(m.menu)}</b>
          ${md}<span class="r2-cnt" style="color:rgba(255,255,255,.8)">${m.pants.length} pantallas</span>${tag(em)}</div>`
      + (!abM ? '' : m.pants.map((p,j)=>{
          const todo=_r2Todo(p), ep=_r2EstPant(p), ab=_r2Abiertos.has(p.sub), hijos=todo.slice(1);
          return `<div class="r2-pant"><div class="r2-prow">${chk(ep,`r2Pant(${i},${j},this.checked)`)}
              <span class="r2-plbl" onclick="r2Abrir('${p.sub}')">${ab?'▾':'▸'} ${esc(p.label)}</span>
              <span class="r2-cnt">${p.campos.length?p.campos.length+' campos · ':''}${p.botones.length} botones</span>${tag(ep)}</div>`
            + (ab ? `<div class="r2-hijos">`
                + `<label class="r2-hrow" style="font-weight:700">${chk(_r2MenuOc(p.sub)?'si':'no',`r2Entrar(${i},${j},this.checked)`)}🚪 Entrar a la pantalla${tag(_r2MenuOc(p.sub)?'si':'no')}</label>`
                + (p.campos.length?`<div class="r2-sub">Campos</div>`+p.campos.map((c,k)=>{ const on=_r2CampoOc(c.tabla,c.campo);
                    return `<label class="r2-hrow">${chk(on?'si':'no',`r2Item(${i},${j},${p.botones.length+k},this.checked)`)}${esc(c.label)}${tag(on?'si':'no')}</label>`; }).join(''):'')
                + (p.botones.length?`<div class="r2-sub">Botones</div>`+p.botones.map((b,k)=>{ const on=_r2MenuOc(b.id);
                    return `<label class="r2-hrow">${chk(on?'si':'no',`r2Item(${i},${j},${k},this.checked)`)}${esc(b.label)}${tag(on?'si':'no')}</label>`; }).join(''):'')
              + `</div>` : '')
            + `</div>`;
        }).join('')) + `</div>`;
    }).join('');
  body.querySelectorAll('input[data-parcial="1"]').forEach(x=>{ x.indeterminate=true; });
}

function _r2Style(){
  document.getElementById('r2-style')?.remove();
  const st=document.createElement('style'); st.id='r2-style';
  st.textContent=`
    .r2-cab{padding:10px 14px;font-size:12px;color:var(--t2)}
    .r2-solo{display:flex;align-items:center;gap:8px;margin:10px 12px 0;padding:10px 12px;border-radius:8px;font-size:13px;cursor:pointer;
      background:rgba(239,159,39,.10);border:1px solid rgba(239,159,39,.4)}
    .r2-solo.on{background:rgba(239,159,39,.25);border-width:2px}
    /* MENÚ: barra azul, mayúsculas */
    .r2-menu{margin:10px 12px;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.15)}
    .r2-mrow{display:flex;align-items:center;gap:10px;padding:11px 14px;background:#1a5bd6;color:#fff;
      font-size:15px;text-transform:uppercase;letter-spacing:.6px;cursor:pointer}
    .r2-mlbl{flex:1;cursor:pointer}
    .r2-md{font-size:11px;text-transform:none;letter-spacing:0;display:flex;gap:4px;align-items:center}
    .r2-md button{font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;cursor:pointer}
    .r2-md button.on{background:#fff;color:#1a5bd6;font-weight:700}
    .r2-mrow .r2-tag{background:#fff}
    /* SUBMENÚ: renglón blanco con raya azul a la izquierda, metido adentro */
    .r2-pant{margin:0;border-left:6px solid #1a5bd6;border-bottom:1px solid #b9cdf3;background:#dbe7fc}
    .r2-prow{display:flex;align-items:center;gap:10px;padding:8px 12px 8px 26px;font-size:13px;font-weight:600;text-transform:none;color:#163a7a}
    .r2-plbl{flex:1;cursor:pointer}
    .r2-cnt{font-size:11px;color:var(--t3);font-weight:400;text-transform:none;letter-spacing:0}
    /* CAMPOS y BOTONES: más adentro, letra chica */
    .r2-hijos{padding:4px 12px 8px 60px;background:var(--s1,#fff);border-top:1px solid #b9cdf3}
    .r2-sub{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--t3);margin:6px 0 2px}
    .r2-hrow{display:flex;align-items:center;gap:10px;padding:3px 0;font-size:12px;cursor:pointer;font-weight:400}
    .r2-tag{margin-left:auto;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;white-space:nowrap;text-transform:none;letter-spacing:0}
    .r2-tag.si{background:rgba(29,158,117,.12);color:#0F6E56}
    .r2-tag.no{background:rgba(226,75,74,.12);color:#A32D2D}
    .r2-tag.par{background:rgba(239,159,39,.15);color:#854F0B}
  `;
  document.head.appendChild(st);
}

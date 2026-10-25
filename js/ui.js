// HELPERS
// ═══════════════════════════════════════════════════════════
function closeOv(id){document.getElementById(id).classList.remove('open');}
function confirm2(tit,msg,cb){
  document.getElementById('conf-tit').textContent=tit;
  document.getElementById('conf-msg').textContent=msg;
  document.getElementById('conf-ok').onclick=()=>{closeOv('ov-conf');cb();};
  document.getElementById('ov-conf').classList.add('open');
}
function togBtn(btnId,hidId){
  const on=document.getElementById(btnId).classList.toggle('on');
  document.getElementById(hidId).value=on?'1':'0';
}
function setTog(btnId,hidId,on){
  document.getElementById(btnId).classList.toggle('on',on);
  document.getElementById(hidId).value=on?'1':'0';
}
function setMtag(id,txt,cls){const el=document.getElementById(id);el.textContent=txt;el.className='mtag '+cls;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmt(n){return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function toast(msg,type='scs'){
  const el=document.getElementById('toast');
  el.className='toast '+type;
  document.getElementById('toast-msg').textContent=msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2800);
}
// openPrint vive ahora en js/sgvprint.js: delega en sgvPrint() y así los
// listados de artículos y clientes heredan el estándar de impresión
// (renglón de 18px, escalado al ancho de la hoja, cebra, títulos por hoja).
// La versión vieja estaba acá y, al cargarse ui.js DESPUÉS de sgvprint.js,
// la pisaba. No volver a definirla en este archivo.

// ── CAMPOS FECHA CON MÁSCARA ───────────────────────────────────────
// REGLA (Ricardo, Oct 2026): la fecha se ve y se escribe dd/mm/aa, COMO EN DOS.
//   · 161026 → 16/10/26 (las barras las pone el formato).
//   · Lo que se escribe PISA desde el día y lo que no se escribe QUEDA:
//     parado en 16/10/26, "14" + Enter → 14/10/26; "1411" + Enter → 14/11/26.
//   · Campo vacío: lo que no se escribe sale de HOY.
//   · ENTER acepta y pasa al campo siguiente, igual que TAB.
//   · Retroceso borra lo último tipeado; Supr deja la fecha vacía; Esc
//     descarta lo tipeado. Fecha inexistente (31/02) se rechaza y vuelve.
//   · Años 70-99 → 19xx; el resto → 20xx.
//   · El 📅 va ADENTRO del recuadro, a la derecha, y el campo es angosto
//     (del ancho de dd/mm/aa): así no corre las grillas ni desalinea títulos.
//   · TODO campo type=date se convierte SOLO, incluidos los que se arman al
//     abrir una ventana (cheques, filtros, modales): no hace falta llamarlo.
//
// POR QUÉ NO SE USA `type=date`: se intentó capturarle las teclas y NO
// funcionó (el campo nativo maneja sus segmentos por su cuenta). La solución
// es un campo de TEXTO con máscara más el calendario.
//
// CÓMO NO ROMPE LO QUE YA ESTÁ: al campo convertido se le redefine `value`,
// así que todo el código que hace `el.value` sigue recibiendo y aceptando
// 'AAAA-MM-DD' como antes. Lo único que cambia es lo que se ve.
//
// El teclado se escucha en CAPTURA para correr ANTES que los onkeydown de
// cada pantalla (Enter = consultar): así la fecha ya está aceptada.
function sgvFecha(el){
  if(!el || el._mask || el.dataset.sgvCal) return el;
  const P=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  const ver=t=>P.set.call(el,t), leer=()=>P.get.call(el);
  const iso2d=v=>{const p=String(v||'').split('-');return p.length===3?p[2]+p[1]+p[0].slice(2):'';};
  const vis=d=>d.replace(/^(\d{2})(\d{2})(\d{2})$/,'$1/$2/$3');
  const hoy=()=>{const h=new Date();return String(h.getDate()).padStart(2,'0')+String(h.getMonth()+1).padStart(2,'0')+String(h.getFullYear()).slice(2);};
  const aa4=a=>(+a>=70?'19':'20')+a;
  const ok=d=>{const dd=+d.slice(0,2),mm=+d.slice(2,4),aa=+aa4(d.slice(4,6)),f=new Date(aa,mm-1,dd);
    return f.getFullYear()===aa&&f.getMonth()===mm-1&&f.getDate()===dd;};
  const base=()=>iso2d(el._iso)||hoy();
  // Muestra lo tipeado encima de la fecha que había, con el cursor detrás
  const pintar=()=>{const n=el._buf.length;ver(vis(el._buf+base().slice(n)));
    const p=n+(n>=2)+(n>=4);el.setSelectionRange(p,p);};
  const confirmar=()=>{
    if(!el._buf) return true;
    const d=el._buf+base().slice(el._buf.length); el._buf='';
    if(!ok(d)){ ver(vis(iso2d(el._iso))); if(typeof toast==='function') toast('Fecha inválida','err'); return false; }
    const iso=aa4(d.slice(4,6))+'-'+d.slice(2,4)+'-'+d.slice(0,2), cambio=iso!==el._iso;
    el.value=iso; if(cambio) el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  };
  // Enter = Tab: pasa al siguiente campo de la misma ventana o pantalla
  const siguiente=()=>{
    const raiz=el.closest('.ov.open')||el.closest('[id^=page-]')||document;
    const l=[...raiz.querySelectorAll('input,select,textarea,button,[tabindex]')]
      .filter(x=>!x.disabled&&x.tabIndex>=0&&x.offsetParent!==null&&x.getBoundingClientRect().width>0);
    const s=l[l.indexOf(el)+1]; s?s.focus():el.blur();
  };

  el._mask=true; el._iso=el.value||''; el._buf='';
  el.type='text'; el.placeholder='dd/mm/aa'; el.autocomplete='off';
  // `value` sigue hablando en AAAA-MM-DD hacia afuera
  Object.defineProperty(el,'value',{configurable:true,get(){return el._iso;},
    set(v){el._iso=v||'';el.setAttribute('value',el._iso);ver(vis(iso2d(el._iso)));}});
  ver(vis(iso2d(el._iso)));

  el.addEventListener('keydown',e=>{
    if(/^\d$/.test(e.key)&&!e.ctrlKey&&!e.altKey){
      e.preventDefault(); if(el._buf.length>=6) el._buf='';
      el._buf+=e.key; pintar(); if(el._buf.length===6) confirmar(); return;
    }
    if(e.key==='Backspace'){ e.preventDefault(); el._buf=el._buf.slice(0,-1);
      el._buf?pintar():ver(vis(iso2d(el._iso))); return; }
    if(e.key==='Delete'){ e.preventDefault(); el._buf=''; el.value='';
      el.dispatchEvent(new Event('change',{bubbles:true})); return; }
    if(e.key==='Enter'){ e.preventDefault(); e.stopPropagation(); if(confirmar()) siguiente(); return; }
    if(e.key==='Tab'){ confirmar(); return; }
    if(e.key==='Escape'&&el._buf){ el._buf=''; ver(vis(iso2d(el._iso))); e.stopPropagation(); return; }
    if(e.key.length===1&&!e.ctrlKey&&!e.metaKey) e.preventDefault();   // sólo dígitos
  },true);
  // Pegar: acepta 161026 o 16/10/2026
  el.addEventListener('input',()=>{ let d=leer().replace(/\D/g,''); if(d.length===8) d=d.slice(0,4)+d.slice(6);
    el._buf=d.slice(0,6); el._buf.length===6?confirmar():pintar(); });
  el.addEventListener('focus',()=>{ el._buf=''; setTimeout(()=>el.setSelectionRange(0,0),0); });
  el.addEventListener('blur',()=>confirmar());

  // Fecha angosta con el calendario ADENTRO del recuadro
  const caja=document.createElement('span');
  caja.style.cssText='position:relative;display:inline-flex;align-items:center;justify-self:start;align-self:center;flex:none;max-width:100%';
  if(el.parentNode){ el.parentNode.insertBefore(caja,el); caja.appendChild(el); }
  el.style.boxSizing='border-box'; el.style.width='calc(8ch + 34px)'; el.style.paddingRight='24px';
  const btn=document.createElement('button'); btn.type='button'; btn.textContent='📅'; btn.tabIndex=-1;
  btn.title='Elegir del calendario';
  btn.style.cssText='position:absolute;right:3px;top:50%;transform:translateY(-50%);border:none;background:none;cursor:pointer;font-size:13px;padding:0;line-height:1';
  // El calendario oculto se marca para que NO se convierta él también
  const oc=document.createElement('input'); oc.type='date'; oc.dataset.sgvCal='1'; oc.tabIndex=-1;
  oc.style.cssText='position:absolute;left:0;bottom:0;opacity:0;width:0;height:0;pointer-events:none';
  oc.addEventListener('change',()=>{ if(!oc.value) return; el.value=oc.value; el.dispatchEvent(new Event('change',{bubbles:true})); });
  btn.onclick=()=>{ oc.value=el._iso||''; oc.showPicker?oc.showPicker():oc.click(); };
  caja.appendChild(btn); caja.appendChild(oc);
  return el;
}

// Convierte los campos fecha de una pantalla (o de todo el documento).
// Ya no hace falta llamarlo: se queda por compatibilidad.
function sgvFechas(sel){
  const raiz = sel ? document.querySelector(sel) : document;
  if(!raiz) return 0;
  const l = raiz.querySelectorAll('input[type=date]:not([data-sgv-cal])');
  l.forEach(sgvFecha);
  return l.length;
}

// Conversión AUTOMÁTICA de todo campo fecha, también los que se crean después
(function(){
  const arrancar=()=>{
    sgvFechas();
    if('MutationObserver' in window)
      new MutationObserver(()=>sgvFechas()).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.querySelectorAll('.ov.open').forEach(o=>o.classList.remove('open'));
  if(e.key==='F2'){document.getElementById('page-art').classList.contains('active')?aAlta():cAlta();}
  if(e.key==='F4'&&artSelIdx!==null&&document.getElementById('page-art').classList.contains('active'))aModif();
  if(e.key==='F4'&&cliSelIdx!==null&&document.getElementById('page-cli').classList.contains('active'))cModif();
});


// ── AVISO GRANDE ───────────────────────────────────────────────────
// Para lo que el usuario NO puede pasar por alto (registro tomado por otro,
// validaciones que frenan una operación). El toast de abajo es chico y se va
// solo; esto queda hasta que se cierra (Ricardo, Sep 2026).
//   sgvAviso({titulo, texto, tipo:'err'|'adv'|'ok', accion:{texto, fn}})
function sgvAviso(op){
  const o = typeof op === 'string' ? { texto: op } : (op || {});
  const col = o.tipo==='ok' ? '#1D9E75' : (o.tipo==='adv' ? '#EF9F27' : '#E24B4A');
  const ico = o.tipo==='ok' ? '✓' : (o.tipo==='adv' ? '⚠' : '⛔');
  const ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;'
    +'justify-content:center;z-index:10000;padding:20px';
  ov.innerHTML=`<div style="background:var(--s1,#fff);border-radius:14px;max-width:520px;width:100%;
      box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
    <div style="background:${col};color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">${ico}</span>
      <span style="font-size:17px;font-weight:600">${esc(o.titulo||'Atención')}</span>
    </div>
    <div style="padding:18px 20px;font-size:15px;line-height:1.6;color:var(--txt,#1b2a36);white-space:pre-wrap">${esc(o.texto||'')}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;padding:0 20px 18px">
      ${o.accion?`<button class="btn" id="sgvav-ac" style="padding:7px 16px;font-size:14px">${esc(o.accion.texto||'Aceptar')}</button>`:''}
      <button class="btn pri" id="sgvav-ok" style="padding:7px 20px;font-size:14px">Entendido</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  const cerrar=()=>{ if(ov.parentNode) document.body.removeChild(ov); document.removeEventListener('keydown',esc2); };
  const esc2=e=>{ if(e.key==='Escape'||e.key==='Enter') cerrar(); };
  document.addEventListener('keydown',esc2);
  ov.querySelector('#sgvav-ok').onclick=cerrar;
  const ac=ov.querySelector('#sgvav-ac');
  if(ac) ac.onclick=()=>{ cerrar(); try{ o.accion.fn(); }catch(e){ console.error(e); } };
  setTimeout(()=>ov.querySelector('#sgvav-ok')?.focus(),30);
  return cerrar;
}

// ── LO QUE NO SE PUEDE HACER, NO SE MUESTRA ────────────────────────
// REGLA (Ricardo, Oct 2026): si el usuario no tiene permiso para algo, la
// opción NO SE LE MUESTRA. Nada de botones visibles que después avisan "no
// tenés permiso".
//
// Los botones cuyo id sigue el patrón `btn-<modulo>-<accion>` ya los esconde
// `aplicarPermisos()`. Para los que NO siguen ese patrón —Duplicar, Importar,
// Anular, Aplicar NC— alcanza con marcarlos en el HTML:
//     <button data-perm="art:alta" …>⧉ Duplicar</button>
//     <button data-perm="fac:baja" …>🚫 Anular</button>
// Acepta varios permisos separados por coma: basta con tener UNO.
function sgvPermisosVista(raiz){
  const r = raiz || document;
  r.querySelectorAll('[data-perm]').forEach(el=>{
    const pide = String(el.dataset.perm||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(!pide.length) return;
    const puede = (typeof puedeh!=='function') || pide.some(p=>{
      const [mod,acc] = p.split(':');
      return mod && acc && puedeh(mod.trim(), acc.trim());
    });
    el.style.display = puede ? '' : 'none';
  });
}

// ── BLOQUEO DE EDICIÓN (maestros y tablas) ─────────────────────────
// Una sola llamada al abrir Modificar: trae el registro FRESCO del server y lo
// reserva. Si lo tiene otro usuario, avisa con cartel grande y no deja entrar.
// Se libera al confirmar o cancelar — nunca por tiempo.
const SGV_SID = (()=>{ try{ let s=sessionStorage.getItem('sgv_sid');
  if(!s){ s=Math.random().toString(36).slice(2)+Date.now().toString(36); sessionStorage.setItem('sgv_sid',s); }
  return s; }catch(_){ return Math.random().toString(36).slice(2); } })();

async function sgvEditarAbrir(tabla, cod){
  try{
    const r = await apiPost('/editar/abrir', { tabla, cod, sid: SGV_SID });
    if(r && r.ok) return r.registro;
    if(r && r.bloqueado){
      const desde = r.desde ? new Date(r.desde).toLocaleString('es-AR') : '';
      const puedeForzar = (typeof usuarioActual!=='undefined' && (usuarioActual?.nivel||0) >= 90);
      sgvAviso({ titulo:'Registro en uso',
        texto:`${r.por} está modificando este registro${desde?' desde el '+desde:''}.\n\n`
             +`Para evitar que se pisen los cambios, no se puede abrir hasta que termine.`,
        tipo:'adv',
        accion: puedeForzar ? { texto:'Desbloquear igual', fn: async ()=>{
          const f = await apiPost('/editar/forzar', { tabla, cod });
          if(f && f.ok) sgvAviso({ titulo:'Desbloqueado', texto:'Ya podés modificarlo.', tipo:'ok' });
          else sgvAviso({ titulo:'No se pudo desbloquear', texto:(f&&f.error)||'Error', tipo:'err' });
        } } : null });
      return null;
    }
    sgvAviso({ titulo:'No se pudo abrir', texto:(r&&r.error)||'Error del servidor', tipo:'err' });
    return null;
  }catch(e){
    sgvAviso({ titulo:'No se pudo abrir', texto:e.message||'Error de conexión', tipo:'err' });
    return null;
  }
}
function sgvEditarCerrar(tabla, cod){
  if(!cod) return;
  try{ apiPost('/editar/cerrar', { tabla, cod, sid: SGV_SID }); }catch(_){}
}

// ── DROPDOWN CLICK ─────────────────────────────────────────────────
function toggleDD(menuId, btn) {
  const menu = document.getElementById(menuId);
  const arrow = btn.querySelector('.dd-arrow');
  const isOpen = menu.classList.contains('open');
  // Cerrar todos
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
  // Abrir este si estaba cerrado
  if (!isOpen) {
    menu.classList.add('open');
    if(arrow) arrow.classList.add('open');
  }
}
// Click fuera cierra los dropdowns
document.addEventListener('click', function(e) {
  if (!e.target.closest('.dd-wrap')) {
    document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
    document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
  }
});

document.addEventListener('DOMContentLoaded', function(){
  const lp = document.getElementById('l-pass');
  if(lp) lp.addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  const lu = document.getElementById('l-user');
  if(lu) lu.addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('l-pass').focus(); });
});

// ── Limpiar buscador ──────────────────────────────────────
function clrSrch(inputId, renderFn) {
  const el = document.getElementById(inputId);
  if (el) { el.value = ''; el.focus(); }
  if (typeof renderFn === 'function') renderFn();
  // Ocultar botón X
  const clr = document.getElementById(inputId + '-clr');
  if (clr) clr.style.display = 'none';
}

// Mostrar/ocultar botón X según contenido del input
document.addEventListener('input', function(e) {
  if (e.target.classList.contains('srch')) {
    const clr = document.getElementById(e.target.id + '-clr');
    if (clr) clr.style.display = e.target.value ? 'flex' : 'none';
  }
});

// ── SIN AUTOCOMPLETADO DEL NAVEGADOR ─────────────────────
// Chrome guarda lo que se escribe en los campos y después lo ofrece en un
// globo. En un sistema de gestión eso confunde: al buscar un cliente aparecen
// los últimos escritos, que no tienen nada que ver con lo que se está haciendo.
// Se apaga en TODOS los campos, incluidos los que se crean después (grillas,
// modales, filtros que se arman al vuelo).
(function(){
  function apagarAutocomplete(){
    document.querySelectorAll('input:not([type=checkbox]):not([type=radio]),textarea')
      .forEach(i=>{ if(i.getAttribute('autocomplete')!=='off') i.setAttribute('autocomplete','off'); });
  }
  const arrancar=()=>{
    apagarAutocomplete();
    if('MutationObserver' in window){
      new MutationObserver(apagarAutocomplete).observe(document.body,{childList:true,subtree:true});
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();

// ── EXPORTAR A EXCEL ─────────────────────────────────────
function exportToXls(titulo, headers, rows) {
  const sep = '\t';
  const nl  = '\r\n';
  let csv = headers.join(sep) + nl;
  rows.forEach(row => {
    csv += row.map(v => {
      if(v === null || v === undefined) return '';
      const s = String(v);
      if(s.includes(sep) || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    }).join(sep) + nl;
  });
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], {type:'text/tab-separated-values;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = titulo.replace(/[^a-zA-Z0-9_\-\.]/g,'_') + '.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Exportado: ' + rows.length + ' registros', 'scs');
}
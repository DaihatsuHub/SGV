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
// REGLA (Ricardo, Sep 2026): la fecha se escribe SEGUIDA, sin barras y con el
// año de 2 dígitos: 210926 → 21/09/2026.
//
// POR QUÉ NO SE USA `type=date`: se intentó capturarle las teclas y NO
// funcionó (el campo nativo maneja sus segmentos por su cuenta y no siempre
// entrega el teclado). La solución definitiva es un campo de TEXTO con máscara
// más un botón de calendario al lado.
//
// CÓMO NO ROMPE LO QUE YA ESTÁ: al campo convertido se le redefine `value`,
// así que todo el código que hace `el.value` sigue recibiendo y aceptando
// 'AAAA-MM-DD' como antes. Lo único que cambia es lo que se ve.
//
// SE APLICA MÓDULO POR MÓDULO, a medida que se toca cada programa:
//     sgvFechas('#page-reci');     // una pantalla entera
//     sgvFecha(document.getElementById('rf-fecha'));   // un campo puntual
function sgvFecha(el){
  if(!el || el._mask) return el;
  const iso2vis = v => { const p=String(v||'').split('-'); return p.length===3 ? `${p[2]}/${p[1]}/${p[0]}` : ''; };

  el._mask = true;
  el._iso  = el.value || '';
  el.type = 'text';
  el.placeholder = el.placeholder || 'dd/mm/aaaa';
  el.autocomplete = 'off';
  el.value = iso2vis(el._iso);

  // `value` sigue hablando en AAAA-MM-DD hacia afuera
  Object.defineProperty(el, 'value', {
    configurable: true,
    get(){ return el._iso; },
    set(v){ el._iso = v || ''; el.setAttribute('value', el._iso); el.defaultValue = el._iso;
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, iso2vis(el._iso)); }
  });
  const verTexto = t => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, t);
  const leerTexto = () => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el);

  el.addEventListener('input', () => {
    // Sólo dígitos; se arma dd/mm/aaaa a medida que se escribe
    const d = leerTexto().replace(/\D/g,'').slice(0,8);
    let t = d;
    if(d.length > 4) t = d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4);
    else if(d.length > 2) t = d.slice(0,2)+'/'+d.slice(2);
    verTexto(t);
    if(d.length === 6 || d.length === 8){
      const dd=d.slice(0,2), mm=d.slice(2,4);
      let aa=d.slice(4); if(aa.length===2) aa='20'+aa;
      if(+dd>=1 && +dd<=31 && +mm>=1 && +mm<=12){
        el._iso = `${aa}-${mm}-${dd}`;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if(!d.length){
      el._iso = '';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Al salir, se normaliza lo que quedó a medias
  el.addEventListener('blur', () => {
    const d = leerTexto().replace(/\D/g,'');
    if(d.length===6 || d.length===8){ verTexto(iso2vis(el._iso)); }
    else if(!d.length){ el._iso=''; verTexto(''); }
    else { verTexto(iso2vis(el._iso)); }   // incompleto: vuelve a lo último válido
  });
  el.addEventListener('focus', () => el.select());

  // Botón de calendario, para el que lo prefiera
  const btn = document.createElement('button');
  btn.type = 'button'; btn.textContent = '📅'; btn.tabIndex = -1; btn.title = 'Elegir del calendario';
  btn.style.cssText = 'border:none;background:none;cursor:pointer;font-size:14px;padding:0 4px;line-height:1';
  const oculto = document.createElement('input');
  oculto.type = 'date';
  oculto.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none';
  oculto.addEventListener('change', () => {
    if(!oculto.value) return;
    el.value = oculto.value;                       // pasa por el setter
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  btn.onclick = () => { oculto.value = el._iso || ''; if(oculto.showPicker) oculto.showPicker(); else oculto.click(); };
  if(el.parentNode){ el.parentNode.insertBefore(oculto, el.nextSibling); el.parentNode.insertBefore(btn, oculto); }
  return el;
}

// Convierte todos los campos fecha de una pantalla (o de todo el documento)
function sgvFechas(sel){
  const raiz = sel ? document.querySelector(sel) : document;
  if(!raiz) return 0;
  const l = raiz.querySelectorAll('input[type=date]');
  l.forEach(sgvFecha);
  return l.length;
}

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
      const puedeForzar = (typeof USUARIO!=='undefined' && (USUARIO?.nivel||0) >= 90);
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
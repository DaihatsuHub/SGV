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

// ── CAMPOS FECHA: TIPEAR DE CORRIDO ────────────────────────────────
// REGLA (Ricardo, Sep 2026): en TODOS los campos fecha se escribe la fecha
// seguida, sin barras y con el año de 2 dígitos: 210926 → 21/09/2026.
//
// Se ve EN EL CAMPO mientras se escribe, no en un globo aparte. Para que eso
// sea posible, lo que todavía no se tipeó se completa con lo que el campo YA
// TENÍA cargado (o con la fecha de hoy si estaba vacío): así la fecha siempre
// es válida y el campo la puede mostrar.
//   Ej.: el campo dice 25/09/26, se escribe "27" → queda 27/09/2026.
//        Sigue con "10" → 27/10/2026. Y con "27" → 27/10/2027.
// Enter cierra la carga. Backspace vuelve a lo que había.
(function(){
  const esFecha = el => el && el.tagName === 'INPUT' && el.type === 'date' && !el.disabled && !el.readOnly;
  const dosDig = n => String(n).padStart(2, '0');

  function base(i) {
    // Lo que el campo tiene cargado; si está vacío, hoy
    const v = (i.value || '').split('-');
    if (v.length === 3) return { a: v[0], m: v[1], d: v[2] };
    const h = new Date();
    return { a: String(h.getFullYear()), m: dosDig(h.getMonth() + 1), d: dosDig(h.getDate()) };
  }

  document.addEventListener('focusin',  e => { if (esFecha(e.target)) { e.target._fbuf = ''; e.target._fbase = base(e.target); } });
  document.addEventListener('focusout', e => { if (esFecha(e.target)) e.target._fbuf = ''; });

  document.addEventListener('keydown', e => {
    const i = e.target;
    if (!esFecha(i) || e.ctrlKey || e.altKey || e.metaKey) return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (!i._fbase) i._fbase = base(i);
      const b = i._fbuf = ((i._fbuf || '') + e.key).slice(0, 8);
      const B = i._fbase;

      // Día desde el 1er dígito, mes desde el 4º, año desde el 6º. Lo que
      // falta se toma de lo que había, así la fecha siempre es completa.
      const d = b.length >= 2 ? b.slice(0, 2) : dosDig(b);
      const m = b.length >= 4 ? b.slice(2, 4) : B.m;
      const a = b.length >= 8 ? b.slice(4, 8) : (b.length >= 6 ? '20' + b.slice(4, 6) : B.a);

      const dd = +d, mm = +m;
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
        i.value = `${a}-${m}-${d}`;
        i.dispatchEvent(new Event('input',  { bubbles: true }));
        i.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (b.length === 8) i._fbuf = '';   // completa: la próxima empieza de nuevo
      return;
    }

    if (e.key === 'Enter') { i._fbuf = ''; i._fbase = base(i); return; }   // sigue su curso

    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      // Vuelve a lo que había antes de empezar a escribir; si no había nada, vacía
      i._fbuf = '';
      const B = i._fbase;
      i.value = (B && B.a) ? `${B.a}-${B.m}-${B.d}` : '';
      i.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (e.key === 'Escape') i._fbuf = '';
  }, true);
})();

document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.querySelectorAll('.ov.open').forEach(o=>o.classList.remove('open'));
  if(e.key==='F2'){document.getElementById('page-art').classList.contains('active')?aAlta():cAlta();}
  if(e.key==='F4'&&artSelIdx!==null&&document.getElementById('page-art').classList.contains('active'))aModif();
  if(e.key==='F4'&&cliSelIdx!==null&&document.getElementById('page-cli').classList.contains('active'))cModif();
});


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
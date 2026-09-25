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
// REGLA (Ricardo, Sep 2026): en TODOS los campos fecha se puede escribir la
// fecha seguida, sin barras y con el año de 2 dígitos: 210926 → 21/09/2026.
// También acepta 8 dígitos (21092026). El calendario sigue estando.
//
// El campo `type=date` nativo NO permite esto: pide el año de 4 dígitos y cada
// segmento por separado. Por eso se capturan las teclas y se arma la fecha acá.
// Vale para los campos que ya existen y para los que se creen después, porque
// el enganche es a nivel documento.
(function(){
  const esFecha = el => el && el.tagName === 'INPUT' && el.type === 'date' && !el.disabled && !el.readOnly;

  // OJO: NO interceptar el mousedown para "reposicionar el cursor". Se probó y
  // ROMPE el tipeo: al hacer preventDefault el campo queda sin ningún segmento
  // activo y el teclado deja de responder. El clic tiene que ser el normal.
  document.addEventListener('focusin', e => { if (esFecha(e.target)) e.target._fbuf = ''; });

  document.addEventListener('keydown', e => {
    const i = e.target;
    if (!esFecha(i)) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      i._fbuf = ((i._fbuf || '') + e.key).slice(0, 8);
      const b = i._fbuf;
      // Se arma al llegar a 6 (ddmmaa) o a 8 dígitos (ddmmaaaa)
      if (b.length === 6 || b.length === 8) {
        const d = b.slice(0, 2), m = b.slice(2, 4);
        let a = b.slice(4);
        if (a.length === 2) a = '20' + a;
        const dd = +d, mm = +m;
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
          i.value = `${a}-${m}-${d}`;
          i.dispatchEvent(new Event('input',  { bubbles: true }));
          i.dispatchEvent(new Event('change', { bubbles: true }));
        }
        i._fbuf = '';
      }
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      i._fbuf = (i._fbuf || '').slice(0, -1);
      if (!i._fbuf) { i.value = ''; i.dispatchEvent(new Event('change', { bubbles: true })); }
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
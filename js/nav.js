// ═══════════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════════

// Ejecuta una acción del menú Utilidades (cierra el desplegable primero).
function utilRun(fn){
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
  if(typeof fn==='function') fn();
}

function _setPageTitle(sub){
  const tb = document.getElementById('page-titlebar');
  if(!tb) return;
  const t = (typeof tituloDeSub==='function') ? tituloDeSub(sub) : '';
  if(t){ tb.textContent = t; tb.style.display=''; }
  else { tb.style.display='none'; }
}

function showPage(pg, el){
  if (typeof accesoSubPermitido==='function' && !accesoSubPermitido(pg)) {
    if (typeof toast==='function') toast('🔒 Sin acceso a esta pantalla','err');
    return;
  }
  _setPageTitle(pg);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tnav').forEach(t=>t.classList.remove('active'));
  const pageEl = document.getElementById('page-'+pg);
  if(pageEl) pageEl.classList.add('active');
  if(el) el.classList.add('active');
  if(pg==='art') renderArts();
  else if(pg==='usua') renderUsua();
}

function showSubPage(menu, sub) {
  if (typeof accesoSubPermitido==='function' && !accesoSubPermitido(sub)) {
    if (typeof toast==='function') toast('🔒 Sin acceso a esta pantalla','err');
    return;
  }
  _setPageTitle(sub);
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tnav').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.dd-item').forEach(t=>t.classList.remove('active'));
  document.getElementById('tnav-'+menu)?.classList.add('active');
  document.getElementById('ddi-'+sub)?.classList.add('active');
  document.getElementById('page-'+sub)?.classList.add('active');
  if      (sub==='art')  renderArts();
  else if (sub==='marc') renderTabGral('MARC');
  else if (sub==='rubr') renderTabGral('RUBR');
  else if (sub==='ccos') renderTabGral('CCOS');
  else if (sub==='prov') renderTabGral('PROV');
  else if (sub==='desp') renderDesp();
  else if (sub==='cli')  renderClis();
  else if (sub==='cpag') renderTabGral('CPAG');
  else if (sub==='vend') renderTabGral('VEND');
  else if (sub==='cate') renderTabGral('CATE');
  else if (sub==='grup') renderTabGral('GRUP');
  else if (sub==='perc') renderTabGral('PERC');
  else if (sub==='usua') renderUsua();
  else if (sub==='fac')  renderFac();
  else if (sub==='reci') renderReci();
  else if (sub==='cart') renderCart();
  else if (sub==='ficha') renderFicha();
  else if (sub==='ctacte') { if(typeof ctacteFillClientes==='function') ctacteFillClientes(); /* se renderiza al Consultar */ }
  else if (sub==='listcob') { /* se renderiza al consultar */ }
  else if (sub==='histart') { if(typeof ensureArts==='function') ensureArts(); /* se renderiza al consultar */ }
  else if (sub==='ctip') renderCtip();
  else if (sub==='mone') renderTabGral('MONE');
}

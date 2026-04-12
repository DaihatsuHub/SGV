// ═══════════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════════

function showPage(pg, el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tnav').forEach(t=>t.classList.remove('active'));
  const pageEl = document.getElementById('page-'+pg);
  if(pageEl) pageEl.classList.add('active');
  if(el) el.classList.add('active');
  if(pg==='art') renderArts();
  else if(pg==='usua') renderUsua();
}

function showSubPage(menu, sub) {
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
  else if (sub==='prov') renderTabGral('PROV');
  else if (sub==='desp') renderDesp();
  else if (sub==='cli')  renderClis();
  else if (sub==='cpag') renderTabGral('CPAG');
  else if (sub==='vend') renderTabGral('VEND');
  else if (sub==='cate') renderTabGral('CATE');
  else if (sub==='grup') renderTabGral('GRUP');
  else if (sub==='usua') renderUsua();
  else if (sub==='fac')  renderFac();
  else if (sub==='ctip') renderCtip();
}

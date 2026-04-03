// ═══════════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════════

// ─── NAVIGATION ──────────────────────────────────────────
function showPage(pg,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tnav').forEach(t=>t.classList.remove('active'));
  const pageEl = document.getElementById('page-'+pg);
  if(pageEl) pageEl.classList.add('active');
  if(el) el.classList.add('active');
  if(pg==='art') renderArts();
  else if(pg==='usua') { renderUsua(); }
}

// ═══════════════════════════════════════════════════════════
// ARTÍCULOS
// ═══════════════════════════════════════════════════════════
function filtArts(){
  const q=document.getElementById('art-q').value.toLowerCase();
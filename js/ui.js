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
function openPrint(title,tableHtml,count){
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial;font-size:12px;margin:20px}h2{border-bottom:2px solid #4f8ef7;padding-bottom:8px;color:#1a1a2e}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1a1a2e;color:#fff;padding:8px;text-align:left;font-size:12px}td{padding:7px 8px;border-bottom:1px solid #eee}tr:hover td{background:#f0f4ff}.footer{margin-top:20px;font-size:12px;color:#999}</style></head><body><h2>${title}</h2><p style="color:#666;font-size:12px">${new Date().toLocaleString('es-AR')} — ${count} registros</p>${tableHtml}<div class="footer">SGV-Gestión</div><script>window.print();<\/script></div><!-- /app -->
</body></html>`);
  w.document.close();
}
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

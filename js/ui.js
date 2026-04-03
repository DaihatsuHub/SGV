// ═══════════════════════════════════════════════════════════
// UI HELPERS — Toast, confirm, print, keyboard, dropdown
// ═══════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════
// TABLAS
// ══════════════════════════════════════════════

  const sv = document.getElementById('desp-nro').value;
  const nros = [...new Map(DESPS.map(d=>[d.DEP_DESP+d.DEP_SUB, d])).values()]
    .sort((a,b)=>b.DEP_FEC.localeCompare(a.DEP_FEC));
  document.getElementById('desp-nro').innerHTML =
    '<option value="">Todos los despachos</option>' +
    nros.map(d=>{
      const k=d.DEP_DESP+(d.DEP_SUB?'-'+d.DEP_SUB:'');
      const fec=d.DEP_FEC?d.DEP_FEC.substring(0,10).split('-').reverse().join('/'):'';
      return `<option value="${d.DEP_DESP+d.DEP_SUB}"${d.DEP_DESP+d.DEP_SUB===sv?' selected':''}>${k} (${fec})</option>`;
    }).join('');
}

function selDesp(i) { despSelIdx=i; renderDesp(); }

function fillDespArtSelect(selVal) {
  const sorted = [...ARTS].sort((a,b)=>(a.ART_COD||'').localeCompare(b.ART_COD||''));
  document.getElementById('df-art').innerHTML =
    '<option value="">— Seleccionar artículo —</option>' +
    sorted.map(a=>`<option value="${a.ART_COD}"${a.ART_COD===selVal?' selected':''}>${a.ART_COD} — ${a.ART_DES}</option>`).join('');
}

function clrDespForm() {
  document.getElementById('df-desp').value='';
  document.getElementById('df-sub').value='';
  document.getElementById('df-fec').value=new Date().toISOString().substring(0,10);
  document.getElementById('df-adua').value='';
  document.getElementById('df-proc').value='';
  document.getElementById('df-moneda').value='';
  document.getElementById('df-ent').value=0;
  document.getElementById('df-fob').value=0;
  document.getElementById('df-gas').value=0;
  document.getElementById('df-gas2').value=0;
  fillDespArtSelect('');
}

function fillDespForm(d) {
  document.getElementById('df-desp').value=d.DEP_DESP;
  document.getElementById('df-sub').value=d.DEP_SUB||'';
  document.getElementById('df-fec').value=d.DEP_FEC?d.DEP_FEC.substring(0,10):'';
  document.getElementById('df-adua').value=d.DEP_ADUA||'';
  document.getElementById('df-proc').value=d.DEP_PROC||'';
  document.getElementById('df-moneda').value=d.DEP_MONEDA||'';
  document.getElementById('df-ent').value=d.DEP_ENT||0;
  document.getElementById('df-fob').value=d.DEP_FOB||0;
  document.getElementById('df-gas').value=d.DEP_GAS||0;
  document.getElementById('df-gas2').value=d.DEP_GAS2||0;
  fillDespArtSelect(d.DEP_ART);
}

function despAlta() {
  clrDespForm();
  document.getElementById('df-desp').disabled=false;
  document.getElementById('df-art').disabled=false;
  document.getElementById('desp-mtit').textContent='Nuevo Despacho';
  setMtag('desp-mtag','ALTA','tag-a');
  document.getElementById('ov-desp').classList.add('open');
  window._de='A';
}

function despModif() {
  if(despSelIdx===null){toast('Seleccioná un registro','err');return;}
  fillDespForm(DESPS[despSelIdx]);
  document.getElementById('df-desp').disabled=true;
  document.getElementById('df-art').disabled=true;
  document.getElementById('desp-mtit').textContent='Modificar despacho';
  setMtag('desp-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-desp').classList.add('open');
  window._de='M';
}

function despBaja() {
  if(despSelIdx===null){toast('Seleccioná un registro','err');return;}
  const d=DESPS[despSelIdx];
  confirm2(`¿Dar de baja "${d.DEP_DESP}" — ${d.DEP_ART}?`,
    'Se eliminará el registro y se revertirá el stock.', async ()=>{
      // Revertir stock
      const art = ARTS.find(a=>a.ART_COD===d.DEP_ART);
      if(art) {
        const cant = d.DEP_ENT - d.DEP_SAL;
        if(d.DEP_DESP.startsWith('H')||d.DEP_DESP.startsWith('h'))
          art.ART_STK = (art.ART_STK||0) - cant;
        else
          art.ART_STKT = (art.ART_STKT||0) - cant;
        sbSaveArt(art);
      }
      await sbDeleteDesp(d.id);
      DESPS.splice(despSelIdx,1);
      despSelIdx=null;
      renderDesp();
      toast('Despacho eliminado','scs');
    });
}

async function saveDesp() {
  const desp = document.getElementById('df-desp').value.trim().toUpperCase();
  const art  = document.getElementById('df-art').value;
  const ent  = parseInt(document.getElementById('df-ent').value)||0;
  const fec  = document.getElementById('df-fec').value;
  if(!desp||!art){toast('Despacho y artículo son obligatorios','err');return;}
  if(ent<=0){toast('El ingreso debe ser mayor a 0','err');return;}

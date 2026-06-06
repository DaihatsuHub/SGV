// ═══════════════════════════════════════════════════════════
// DESPACHOS — Listado, filtros, ABM
// ═══════════════════════════════════════════════════════════

let DESPS = [];
let despSelIdx = null;

async function sbLoadDesps() {
  try {
    DESPS = await sbGetAll('despachos', 'dep_desp');
  } catch(e) { console.error('sbLoadDesps:', e); DESPS = []; }
}

function despEmpresa(depDesp) {
  return (depDesp||'').trim().toUpperCase().charAt(0);
}

function filtDesps() {
  const q   = (document.getElementById('desp-q')?.value||'').toLowerCase();
  const nro = document.getElementById('desp-nro')?.value||'';
  const srt = document.getElementById('desp-sort')?.value||'fec-desc';

  let list = DESPS.filter(d => {
    const mn = !nro || (d.dep_desp||'').trim() === nro;
    const mq = !q ||
      (d.dep_desp||'').toLowerCase().includes(q) ||
      (d.dep_art||'').toLowerCase().includes(q)  ||
      (d.dep_proc||'').toLowerCase().includes(q);
    return mn && mq;
  });

  list = list.slice().sort((a,b) => {
    if(srt==='fec-desc') return (b.dep_fec||'').localeCompare(a.dep_fec||'');
    if(srt==='fec-asc')  return (a.dep_fec||'').localeCompare(b.dep_fec||'');
    if(srt==='nro-asc')  return (a.dep_desp||'').localeCompare(b.dep_desp||'');
    if(srt==='nro-desc') return (b.dep_desp||'').localeCompare(a.dep_desp||'');
    return 0;
  });
  return list;
}

function renderDesp() {
  const list  = filtDesps();
  const body  = document.getElementById('desp-body');
  const cols  = getActiveCols('desp');
  const gridTpl = cols.map(c => c.width||'1fr').join(' ');

  // Actualizar selector de despacho
  const nroSel = document.getElementById('desp-nro');
  if (nroSel) {
    const cur = nroSel.value;
    const despNros = [...new Set(DESPS.map(d=>(d.dep_desp||'').trim()).filter(Boolean))].sort();
    nroSel.innerHTML = '<option value="">Todos los despachos</option>' +
      despNros.map(n=>`<option value="${n}"${n===cur?' selected':''}>${n}</option>`).join('');
  }

  const thDesp = document.querySelector('.th-desp');
  if (thDesp) {
    thDesp.style.gridTemplateColumns = gridTpl;
    thDesp.innerHTML = cols.map(c =>
      `<span class="th-sortable" onclick="toggleSort('desp','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('desp',c.field)}</span>`
    ).join('');
  }

  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }

  body.innerHTML = list.map((d,i) => {
    const sel = despSelIdx===i ? 'sel' : '';
    const art = ARTS.find(a=>(a.ART_COD||'').trim()===(d.dep_art||'').trim());
    const stk = (d.dep_ent||0) - (d.dep_sal||0);
    const fec = d.dep_fec ? d.dep_fec.substring(0,10).split('-').reverse().join('/') : '—';
    return `<div class="tr-art ${sel}" style="grid-template-columns:${gridTpl}" onclick="selDesp(${i})" ondblclick="despModif()">` +
      cols.map(c => {
        if(c.field==='DEP_DESP')   return `<span class="col-cod">${esc(d.dep_desp||'')}${d.dep_sub?'<span style="color:var(--t3);font-size:10px"> '+esc(d.dep_sub)+'</span>':''}</span>`;
        if(c.field==='DEP_SUB')    return `<span class="col-sm">${esc(d.dep_sub||'')}</span>`;
        if(c.field==='DEP_FEC')    return `<span style="font-size:12px;color:var(--t2)">${fec}</span>`;
        if(c.field==='DEP_ART')    return `<span class="col-cod">${esc(d.dep_art||'')}</span>`;
        if(c.field==='DEP_DES')    return `<span class="col-des">${esc(art?art.ART_DES:'—')}</span>`;
        if(c.field==='DEP_PROC')   return `<span class="col-sm">${esc(d.dep_proc||'')}</span>`;
        if(c.field==='DEP_ENT')    return `<span class="col-num">${d.dep_ent||0}</span>`;
        if(c.field==='DEP_SAL')    return `<span class="col-num">${d.dep_sal||0}</span>`;
        if(c.field==='DEP_STK')    return `<span class="col-num" style="color:${stk<=0?'var(--red)':'var(--grn)'};font-weight:${stk>0?'600':'400'}">${stk}</span>`;
        if(c.field==='DEP_ADUA')   return `<span class="col-sm">${esc(d.dep_adua||'')}</span>`;
        if(c.field==='DEP_FOB')    return `<span class="col-num">${d.dep_fob||0}</span>`;
        if(c.field==='DEP_GAS')    return `<span class="col-num">${d.dep_gas||0}</span>`;
        if(c.field==='DEP_GAS2')   return `<span class="col-num">${d.dep_gas2||0}</span>`;
        if(c.field==='DEP_MONEDA') return `<span class="col-sm">${esc(d.dep_moneda||'$')}</span>`;
        if(c.field==='DEP_COSTO')  return `<span class="col-num">${d.dep_costo||0}</span>`;
        return `<span>${esc(String(d[c.field.toLowerCase()]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');
}

function selDesp(i) { despSelIdx=i; renderDesp(); }

// ── Alta ──────────────────────────────────────────────────
function despAlta() {
  clrDespForm();
  document.getElementById('df-desp').disabled = false;
  document.getElementById('df-art').disabled  = false;
  document.getElementById('desp-mtit').textContent = 'Nuevo Despacho';
  setMtag('desp-mtag','ALTA','tag-a');
  fillDespArtSelect('');
  document.getElementById('ov-desp').classList.add('open');
  window._de = 'A';
}

// ── Modificar ─────────────────────────────────────────────
function despModif() {
  if(despSelIdx===null){ toast('Seleccioná un despacho','err'); return; }
  const d = filtDesps()[despSelIdx];
  fillDespForm(d);
  document.getElementById('df-desp').disabled = true;
  document.getElementById('df-art').disabled  = true;
  document.getElementById('desp-mtit').textContent = `Modificar: ${d.dep_desp}${d.dep_sub?' '+d.dep_sub:''}`;
  setMtag('desp-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-desp').classList.add('open');
  window._de = 'M';
  window._despOrig = { ...d }; // guardar original para revertir stock si es necesario
}

// ── Baja ──────────────────────────────────────────────────
function despBaja() {
  if(despSelIdx===null){ toast('Seleccioná un despacho','err'); return; }
  const d = filtDesps()[despSelIdx];
  confirm2(
    `¿Dar de baja "${d.dep_desp}${d.dep_sub?' '+d.dep_sub:''}"?`,
    `Artículo: ${d.dep_art} — Se revertirá el stock.`,
    async () => {
      try {
        // Revertir stock del artículo
        await despActualizarStock(d, true);
        // Eliminar de Supabase
        await fetch(`${SB_URL}/rest/v1/despachos?dep_desp=eq.${encodeURIComponent(d.dep_desp)}&dep_art=eq.${encodeURIComponent(d.dep_art)}`,{
          method:'DELETE', headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
        });
        // Eliminar de memoria
        const idx = DESPS.findIndex(x=>x.dep_desp===d.dep_desp&&x.dep_art===d.dep_art);
        if(idx>=0) DESPS.splice(idx,1);
        despSelIdx=null;
        renderDesp();
        toast('Despacho eliminado','scs');
      } catch(e){ console.error(e); toast('Error al eliminar','err'); }
    }
  );
}

function clrDespForm() {
  ['df-desp','df-sub','df-adua','df-proc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('df-fec').value = new Date().toISOString().substring(0,10);
  document.getElementById('df-ent').value = 0;
  document.getElementById('df-fob').value = 0;
  document.getElementById('df-gas2').value = 0;
  const monEl=document.getElementById('df-moneda'); if(monEl) monEl.value='';
  const depEntEl=document.getElementById('df-depent'); if(depEntEl) depEntEl.value=0;
}

function fillDespForm(d) {
  document.getElementById('df-desp').value  = d.dep_desp||'';
  document.getElementById('df-sub').value   = d.dep_sub||'';
  document.getElementById('df-fec').value   = d.dep_fec||'';
  document.getElementById('df-adua').value  = d.dep_adua||'';
  document.getElementById('df-proc').value  = d.dep_proc||'';
  document.getElementById('df-fob').value   = d.dep_fob||0;
  document.getElementById('df-gas2').value  = d.dep_gas2||0;
  document.getElementById('df-ent').value   = d.dep_ent||0;
  const monEl=document.getElementById('df-moneda'); if(monEl) monEl.value=d.dep_moneda||'';
  const depEntEl=document.getElementById('df-depent'); if(depEntEl) depEntEl.value=d.dep_depent||0;
  fillDespArtSelect(d.dep_art||'');
}

function fillDespArtSelect(selArt) {
  const sel = document.getElementById('df-art');
  if(!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar artículo —</option>' +
    ARTS.map(a=>`<option value="${a.ART_COD}"${a.ART_COD===selArt?' selected':''}>${a.ART_COD} — ${a.ART_DES}</option>`).join('');
}

// Al cambiar ingreso, proponer mismo valor en dep_depent
function dfEntChange() {
  const val = document.getElementById('df-ent')?.value||0;
  const depEntEl = document.getElementById('df-depent');
  if(depEntEl && depEntEl.value==0) depEntEl.value = val;
}

// ── Actualizar stock del artículo ─────────────────────────
async function despActualizarStock(d, revertir=false) {
  const emp   = despEmpresa(d.dep_desp);
  const art   = ARTS.find(a=>(a.ART_COD||'').trim()===(d.dep_art||'').trim());
  if(!art) return;

  const signo = revertir ? -1 : 1;
  const ent    = (d.dep_ent||0)    * signo;
  const sal    = (d.dep_sal||0)    * signo;
  const depEnt = (d.dep_depent||0) * signo;
  const depSal = (d.dep_depsal||0) * signo;

  let patch = {};
  if(emp==='H') {
    patch.art_stk  = Math.max(0, (art.ART_STK||0)  + ent - sal);
    patch.art_deph = Math.max(0, (art.ART_DEPH||0) + depEnt - depSal);
  } else if(emp==='T') {
    patch.art_stkt = Math.max(0, (art.ART_STKT||0)  + ent - sal);
    patch.art_dept = Math.max(0, (art.ART_DEPT||0)  + depEnt - depSal);
  }

  if(!Object.keys(patch).length) return;

  await fetch(`${SB_URL}/rest/v1/articulos?art_cod=eq.${encodeURIComponent(d.dep_art)}`,{
    method:'PATCH',
    headers:{...SB_HDR},
    body:JSON.stringify(patch)
  });

  // Actualizar en memoria
  if(emp==='H') {
    art.ART_STK  = patch.art_stk;
    art.ART_DEPH = patch.art_deph;
  } else {
    art.ART_STKT = patch.art_stkt;
    art.ART_DEPT = patch.art_dept;
  }
}

// ── Guardar ───────────────────────────────────────────────
async function saveDesp() {
  const desp  = document.getElementById('df-desp').value.trim().toUpperCase();
  const sub   = document.getElementById('df-sub').value.trim().toUpperCase();
  const fec   = document.getElementById('df-fec').value;
  const art   = document.getElementById('df-art').value;
  const ent   = parseInt(document.getElementById('df-ent').value)||0;
  const fob   = parseFloat(document.getElementById('df-fob').value)||0;
  const gas2  = parseFloat(document.getElementById('df-gas2').value)||0;
  const adua  = document.getElementById('df-adua').value.trim().toUpperCase();
  const proc  = document.getElementById('df-proc').value.trim().toUpperCase();
  const mone  = document.getElementById('df-moneda').value;
  const depEntEl = document.getElementById('df-depent');
  const depent = depEntEl ? (parseInt(depEntEl.value)||ent) : ent;

  if(!desp){ toast('Ingresá el número de despacho','err'); return; }
  if(!art){  toast('Seleccioná un artículo','err'); return; }
  if(!fec){  toast('Ingresá la fecha','err'); return; }
  if(ent<=0){ toast('El ingreso debe ser mayor a 0','err'); return; }

  // Verificar duplicado en alta
  if(window._de==='A') {
    const existe = DESPS.find(d=>d.dep_desp===desp&&d.dep_art===art);
    if(existe){ toast('Ya existe ese artículo en ese despacho','err'); return; }
  }

  const data = {
    dep_desp:desp, dep_sub:sub||null, dep_fec:fec, dep_art:art,
    dep_proc:proc||null, dep_adua:adua||null,
    dep_ent:ent, dep_sal:0, dep_fob:fob, dep_gas:0, dep_gas2:gas2,
    dep_moneda:mone||null, dep_costo:0,
    dep_depent:depent, dep_depsal:0
  };

  try {
    if(window._de==='A') {
      await sbUpsert('despachos', data);
      DESPS.push(data);
      await despActualizarStock(data);
      toast('Despacho dado de alta','scs');
    } else {
      const orig = window._despOrig;
      // Revertir stock anterior
      await despActualizarStock(orig, true);
      // Actualizar datos (no cambiar dep_ent en modif, solo otros campos)
      const patchData = {
        dep_sub:sub||null, dep_fec:fec, dep_proc:proc||null, dep_adua:adua||null,
        dep_fob:fob, dep_gas2:gas2, dep_moneda:mone||null,
        dep_ent:ent, dep_depent:depent
      };
      await fetch(`${SB_URL}/rest/v1/despachos?dep_desp=eq.${encodeURIComponent(desp)}&dep_art=eq.${encodeURIComponent(art)}`,{
        method:'PATCH', headers:{...SB_HDR}, body:JSON.stringify(patchData)
      });
      // Actualizar en memoria
      const idx=DESPS.findIndex(d=>d.dep_desp===desp&&d.dep_art===art);
      if(idx>=0) Object.assign(DESPS[idx], patchData);
      // Aplicar nuevo stock con objeto completo (orig + nuevos valores)
      const updated = { ...orig, ...patchData };
      await despActualizarStock(updated);
      toast('Despacho modificado','scs');
    }
    closeOv('ov-desp');
    despSelIdx=null;
    renderDesp();
  } catch(e){ console.error(e); toast('Error al guardar','err'); }
}

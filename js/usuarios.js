// ═══════════════════════════════════════════════════════════
// USUARIOS, AUTH y DESPACHOS
// ═══════════════════════════════════════════════════════════

if (!TABLAS['USUA']) TABLAS['USUA'] = [];

let usuaSelIdx  = null;
let usuarioActual = null;

// ── LOGIN ─────────────────────────────────────────────────
function doLogin() {
  const cod  = document.getElementById('l-user').value.trim().toUpperCase();
  const pass = document.getElementById('l-pass').value.trim();
  document.getElementById('l-err').textContent = '';
  if (!cod) { document.getElementById('l-err').textContent = 'Ingresá un usuario'; return; }

  if (cod === 'RGRDELTA') {
    usuarioActual = { codigo: cod, nivel: 99 };
    loginOk(); return;
  }

  const usuarios = TABLAS['USUA'] || [];
  if (usuarios.length === 0) {
    usuarioActual = { codigo: cod, nivel: 99 };
    loginOk(); return;
  }

  const u = usuarios.find(r => r.CODIGO === cod && r.DETALLE === pass);
  if (!u) {
    document.getElementById('l-err').textContent = 'Usuario o contraseña incorrectos';
    document.getElementById('l-pass').value = '';
    return;
  }
  usuarioActual = { codigo: u.CODIGO, nivel: parseInt(u.NIVEL)||0 };
  loginOk();
}

function loginOk() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('b-user').textContent = usuarioActual.codigo;
  const ddiUsua = document.getElementById('ddi-usua');
  if (ddiUsua) ddiUsua.style.display = usuarioActual.nivel > 80 ? 'block' : 'none';
  ['btn-cfg-art','btn-cfg-cli'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = usuarioActual.codigo === 'RGRDELTA' ? '' : 'none';
  });
  // Mostrar pantalla de bienvenida
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-welcome')?.classList.add('active');
  renderUsua && renderUsua();
}

function cerrarSistema() {
  usuarioActual = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('l-err').textContent = '';
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
}

// ── ABM USUARIOS ──────────────────────────────────────────
function getUsuaRows() {
  const q = (document.getElementById('usua-q')?.value||'').toLowerCase();
  return (TABLAS['USUA']||[]).filter(r =>
    !q || r.CODIGO.toLowerCase().includes(q)
  ).sort((a,b)=>(a.CODIGO||'').localeCompare(b.CODIGO||''));
}

function renderUsua() {
  const list = getUsuaRows();
  const body = document.getElementById('usua-body');
  if (!list.length) { body.innerHTML='<div class="empty">👥 Sin usuarios</div>'; return; }
  body.innerHTML = list.map((r,i) => {
    const sel = usuaSelIdx===i ? 'sel' : '';
    const nivelColor = parseInt(r.NIVEL)>80 ? 'ps' : 'po';
    return `<div class="tr-tab ${sel}" style="display:grid;grid-template-columns:120px 1fr 80px;gap:8px;padding:11px 16px;font-size:14px;cursor:pointer;transition:background .1s" onclick="selUsua(${i})">
      <span class="col-cod">${esc(r.CODIGO)}</span>
      <span style="color:var(--t2);font-size:13px">${'•'.repeat(Math.min(r.DETALLE.length,12))}</span>
      <span style="text-align:center"><span class="pill ${nivelColor}">${r.NIVEL}</span></span>
    </div>`;
  }).join('');
}

function selUsua(i) { usuaSelIdx=i; renderUsua(); }

function usuaAlta() {
  document.getElementById('uf-cod').value='';
  document.getElementById('uf-pass').value='';
  document.getElementById('uf-nivel').value='';
  document.getElementById('uf-cod').disabled=false;
  document.getElementById('usua-mtit').textContent='Nuevo Usuario';
  setMtag('usua-mtag','ALTA','tag-a');
  document.getElementById('ov-usua').classList.add('open');
  window._ue='A';
}

function usuaModif() {
  if (usuaSelIdx===null) { toast('Seleccioná un usuario','err'); return; }
  const r = getUsuaRows()[usuaSelIdx];
  document.getElementById('uf-cod').value=r.CODIGO;
  document.getElementById('uf-cod').disabled=true;
  document.getElementById('uf-pass').value=r.DETALLE;
  document.getElementById('uf-nivel').value=r.NIVEL;
  document.getElementById('usua-mtit').textContent='Modificar: '+r.CODIGO;
  setMtag('usua-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-usua').classList.add('open');
  window._ue='M';
}

function usuaBaja() {
  if (usuaSelIdx===null) { toast('Seleccioná un usuario','err'); return; }
  const r = getUsuaRows()[usuaSelIdx];
  if (r.CODIGO === usuarioActual?.codigo) { toast('No podés eliminar tu propio usuario','err'); return; }
  confirm2('¿Dar de baja "'+r.CODIGO+'"?', 'El usuario será eliminado.', ()=>{
    const idx=(TABLAS['USUA']||[]).findIndex(x=>x.CODIGO===r.CODIGO);
    if(idx>=0) TABLAS['USUA'].splice(idx,1);
    usuaSelIdx=null; deleteUsuario(r.CODIGO); renderUsua();
    toast('Usuario eliminado','scs');
  });
}

function saveUsua() {
  const cod   = document.getElementById('uf-cod').value.trim().toUpperCase();
  const pass  = document.getElementById('uf-pass').value.trim();
  const nivel = parseInt(document.getElementById('uf-nivel').value)||0;
  if (!cod||!pass) { toast('Usuario y contraseña son obligatorios','err'); return; }
  if (nivel<1||nivel>99) { toast('El nivel debe ser entre 1 y 99','err'); return; }
  if (!TABLAS['USUA']) TABLAS['USUA']=[];
  if (window._ue==='A') {
    if (TABLAS['USUA'].find(r=>r.CODIGO===cod)) { toast('Usuario ya existe','err'); return; }
    TABLAS['USUA'].push({ TABLA:'USUA', CODIGO:cod, DETALLE:pass, NIVEL:nivel, STRING1:'', STRING2:'', STRING3:'', FECHA1:'' });
    toast('Usuario dado de alta','scs');
  } else {
    const idx = TABLAS['USUA'].findIndex(r=>r.CODIGO===cod);
    if(idx>=0) TABLAS['USUA'][idx].DETALLE=pass, TABLAS['USUA'][idx].NIVEL=nivel;
    toast('Usuario modificado','scs');
  }
  saveUsuario(cod, pass, nivel);
  closeOv('ov-usua'); renderUsua();
}

// ═══════════════════════════════════════════════════════════
// DESPACHOS — usando Supabase
// ═══════════════════════════════════════════════════════════
let DESPS = [];
let despSelIdx = null;

async function sbLoadDesps() {
  try {
    const rows = await sbGetAll('despachos', 'dep_fec');
    DESPS = rows.map(r => ({
      dep_id:    r.dep_id,
      DEP_DESP:  r.dep_desp||'',
      DEP_SUB:   r.dep_sub||'',
      DEP_FEC:   r.dep_fec||'',
      DEP_PROC:  r.dep_proc||'',
      DEP_ADUA:  r.dep_adua||'',
      DEP_ART:   r.dep_art||'',
      DEP_ENT:   r.dep_ent||0,
      DEP_SAL:   r.dep_sal||0,
      DEP_FOB:   r.dep_fob||0,
      DEP_GAS:   r.dep_gas||0,
      DEP_GAS2:  r.dep_gas2||0,
      DEP_MONEDA:r.dep_moneda||''
    }));
    // Ordenar por fecha desc
    DESPS.sort((a,b) => (b.DEP_FEC||'').localeCompare(a.DEP_FEC||''));
  } catch(e) { console.error('sbLoadDesps:', e); }
}

async function sbSaveDesp(d) {
  syncStatus('💾 Guardando...', '#93b4d8');
  try {
    const dep_id = `${d.DEP_DESP}|${d.DEP_SUB||''}|${d.DEP_ART}`;
    await sbUpsertOnConflict('despachos', {
      dep_id,
      dep_desp:   d.DEP_DESP,
      dep_sub:    d.DEP_SUB||null,
      dep_fec:    d.DEP_FEC||null,
      dep_proc:   d.DEP_PROC||null,
      dep_adua:   d.DEP_ADUA||null,
      dep_art:    d.DEP_ART,
      dep_ent:    d.DEP_ENT||0,
      dep_sal:    d.DEP_SAL||0,
      dep_fob:    d.DEP_FOB||0,
      dep_gas:    d.DEP_GAS||0,
      dep_gas2:   d.DEP_GAS2||0,
      dep_moneda: d.DEP_MONEDA||null
    }, 'dep_id');
    syncStatus('☁️ Guardado ✓', '#4ade80');
    setTimeout(()=>syncStatus('☁️ Supabase','#93b4d8'), 2000);
  } catch(e) { syncStatus('⚠️ Error al guardar','#f87171'); console.error(e); }
}

async function sbDeleteDesp(dep_id) {
  try { await sbDelete('despachos', { dep_id }); }
  catch(e) { console.error('sbDeleteDesp:', e); }
}

function filtDesps() {
  const q   = document.getElementById('desp-q').value.toLowerCase();
  const nro = document.getElementById('desp-nro').value;
  return DESPS.filter(d => {
    const mq = !q || (d.DEP_DESP+(d.DEP_SUB?'-'+d.DEP_SUB:'')).toLowerCase().includes(q) ||
               (d.DEP_ART||'').toLowerCase().includes(q) ||
               (d.DEP_PROC||'').toLowerCase().includes(q);
    const mn = !nro || (d.DEP_DESP+(d.DEP_SUB||'')) === nro;
    return mq && mn;
  });
}

function renderDesp() {
  const list = filtDesps();
  const body = document.getElementById('desp-body');
  const cols = getActiveCols('desp');
  const gridTpl = cols.map(c => c.width||'1fr').join(' ');

  // Cabecera dinámica
  const thDesp = document.querySelector('.th-desp');
  if (thDesp) {
    thDesp.style.gridTemplateColumns = gridTpl;
    thDesp.innerHTML = cols.map(c =>
      `<span class="th-sortable" onclick="toggleSort('desp','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('desp',c.field)}</span>`
    ).join('');
  }

  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; updDespNros(); return; }

  body.innerHTML = list.map(d => {
    const idx = DESPS.indexOf(d);
    const sel = despSelIdx===idx ? 'sel' : '';
    const fec = d.DEP_FEC ? d.DEP_FEC.substring(0,10).split('-').reverse().join('/') : '—';
    const art = ARTS.find(a => a.ART_COD === d.DEP_ART);
    const des = art ? art.ART_DES : d.DEP_ART;
    const stk = (d.DEP_ENT||0) - (d.DEP_SAL||0);
    return `<div class="tr-desp ${sel}" style="grid-template-columns:${gridTpl}" onclick="selDesp(${idx})">` +
      cols.map(c => {
        if(c.field==='DEP_DESP')   return `<span class="col-desp-nro">${esc(d.DEP_DESP)}</span>`;
        if(c.field==='DEP_SUB')    return `<span class="col-desp-fec">${esc(d.DEP_SUB||'')}</span>`;
        if(c.field==='DEP_FEC')    return `<span class="col-desp-fec">${fec}</span>`;
        if(c.field==='DEP_ART')    return `<span class="col-cod">${esc(d.DEP_ART)}</span>`;
        if(c.field==='DEP_DES')    return `<span class="col-des">${esc(des)}</span>`;
        if(c.field==='DEP_PROC')   return `<span class="col-desp-proc">${esc(d.DEP_PROC||'')}</span>`;
        if(c.field==='DEP_ADUA')   return `<span class="col-sm">${esc(d.DEP_ADUA||'')}</span>`;
        if(c.field==='DEP_ENT')    return `<span class="col-desp-num">${d.DEP_ENT}</span>`;
        if(c.field==='DEP_SAL')    return `<span class="col-desp-num">${d.DEP_SAL}</span>`;
        if(c.field==='DEP_STK')    return `<span class="col-desp-num" style="color:${stk>0?'var(--grn)':stk<0?'var(--red)':'var(--t3)'}">${stk}</span>`;
        if(c.field==='DEP_FOB')    return `<span class="col-desp-num">$${fmt(d.DEP_FOB)}</span>`;
        if(c.field==='DEP_GAS')    return `<span class="col-desp-num">$${fmt(d.DEP_GAS)}</span>`;
        if(c.field==='DEP_GAS2')   return `<span class="col-desp-num">$${fmt(d.DEP_GAS2)}</span>`;
        if(c.field==='DEP_MONEDA') return `<span class="col-sm">${esc(d.DEP_MONEDA||'$')}</span>`;
        return `<span>${esc(String(d[c.field]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');
  updDespNros();
}

function updDespNros() {
  const sv = document.getElementById('desp-nro').value;
  const nros = [...new Map(DESPS.map(d=>[d.DEP_DESP+(d.DEP_SUB||''), d])).values()]
    .sort((a,b)=>(b.DEP_FEC||'').localeCompare(a.DEP_FEC||''));
  document.getElementById('desp-nro').innerHTML =
    '<option value="">Todos los despachos</option>' +
    nros.map(d => {
      const k = d.DEP_DESP + (d.DEP_SUB ? '-'+d.DEP_SUB : '');
      const fec = d.DEP_FEC ? d.DEP_FEC.substring(0,10).split('-').reverse().join('/') : '';
      const key = d.DEP_DESP+(d.DEP_SUB||'');
      return `<option value="${key}"${key===sv?' selected':''}>${k} (${fec})</option>`;
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
  ['df-desp','df-sub','df-adua','df-proc'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('df-fec').value = new Date().toISOString().substring(0,10);
  document.getElementById('df-moneda').value='';
  document.getElementById('df-ent').value=0;
  document.getElementById('df-fob').value=0;
  document.getElementById('df-gas').value=0;
  document.getElementById('df-gas2').value=0;
  fillDespArtSelect('');
}

function fillDespForm(d) {
  document.getElementById('df-desp').value   = d.DEP_DESP;
  document.getElementById('df-sub').value    = d.DEP_SUB||'';
  document.getElementById('df-fec').value    = d.DEP_FEC ? d.DEP_FEC.substring(0,10) : '';
  document.getElementById('df-adua').value   = d.DEP_ADUA||'';
  document.getElementById('df-proc').value   = d.DEP_PROC||'';
  document.getElementById('df-moneda').value = d.DEP_MONEDA||'';
  document.getElementById('df-ent').value    = d.DEP_ENT||0;
  document.getElementById('df-fob').value    = d.DEP_FOB||0;
  document.getElementById('df-gas').value    = d.DEP_GAS||0;
  document.getElementById('df-gas2').value   = d.DEP_GAS2||0;
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
  const d = DESPS[despSelIdx];
  confirm2(`¿Dar de baja "${d.DEP_DESP}" — ${d.DEP_ART}?`, 'Se eliminará el registro.', async ()=>{
    await sbDeleteDesp(d.dep_id);
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

  const d = {
    DEP_DESP:   desp,
    DEP_SUB:    document.getElementById('df-sub').value.trim().toUpperCase(),
    DEP_FEC:    fec||null,
    DEP_ADUA:   document.getElementById('df-adua').value.trim().toUpperCase(),
    DEP_PROC:   document.getElementById('df-proc').value.trim().toUpperCase(),
    DEP_MONEDA: document.getElementById('df-moneda').value,
    DEP_ART:    art,
    DEP_ENT:    ent,
    DEP_SAL:    window._de==='M' ? (DESPS[despSelIdx]?.DEP_SAL||0) : 0,
    DEP_FOB:    parseFloat(document.getElementById('df-fob').value)||0,
    DEP_GAS:    parseFloat(document.getElementById('df-gas').value)||0,
    DEP_GAS2:   parseFloat(document.getElementById('df-gas2').value)||0,
  };

  if(window._de==='A') {
    const existe = DESPS.find(x=>x.DEP_DESP===d.DEP_DESP&&(x.DEP_SUB||'')===d.DEP_SUB&&x.DEP_ART===d.DEP_ART);
    if(existe){toast('Ya existe ese artículo en ese despacho','err');return;}
    DESPS.unshift(d); despSelIdx=0;
    toast('Despacho dado de alta','scs');
  } else {
    d.dep_id = DESPS[despSelIdx].dep_id;
    DESPS[despSelIdx]=d;
    toast('Despacho modificado','scs');
  }
  await sbSaveDesp(d);
  closeOv('ov-desp');
  renderDesp();
}

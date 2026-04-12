// ═══════════════════════════════════════════════════════════
// ARTÍCULOS — Listado, filtros, ABM
// ═══════════════════════════════════════════════════════════

let artSoloStock = false;

function filtArts(){
  const q = document.getElementById('art-q').value.toLowerCase();
  let list = ARTS.filter(a => {
    const mq = !q || a.ART_COD.toLowerCase().includes(q) || a.ART_DES.toLowerCase().includes(q);
    const ms = !artSoloStock || ((a.ART_STK||0) + (a.ART_STKT||0)) > 0;
    return mq && ms;
  });
  const s = SORT_STATE['art'];
  if (s && s.col) {
    list = list.slice().sort((a,b) => {
      const va=a[s.col]||'', vb=b[s.col]||'';
      const r = typeof va==='number' ? va-vb : String(va).localeCompare(String(vb));
      return s.asc ? r : -r;
    });
  } else {
    list = list.slice().sort((a,b) => (a.ART_COD||'').localeCompare(b.ART_COD||''));
  }
  return list;
}

function renderArts(){
  const list = filtArts();
  const body = document.getElementById('art-body');
  const cols  = getActiveCols('art');
  const gridTpl = cols.map(c => c.width||'1fr').join(' ');

  // Cabecera dinámica
  const thArt = document.querySelector('.th-art');
  if (thArt) {
    thArt.style.gridTemplateColumns = gridTpl;
    thArt.innerHTML = cols.map(c =>
      `<span class="th-sortable" onclick="toggleSort('art','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('art',c.field)}</span>`
    ).join('');
  }

  if (!list.length) {
    body.innerHTML = '<div class="empty">🔍 Sin resultados</div>';
    const bArt = document.getElementById('b-art'); if(bArt) bArt.textContent = ARTS.length + ' artículos';
    return;
  }

  body.innerHTML = list.map(a => {
    const idx = ARTS.indexOf(a);
    const sel = artSelIdx===idx ? 'sel' : '';
    const sH  = a.ART_STK||0, sT = a.ART_STKT||0;
    return `<div class="tr-art ${sel}" style="grid-template-columns:${gridTpl}" onclick="selArt(${idx})" ondblclick="artDetail(${idx})">` +
      cols.map(c => {
        if(c.field==='ART_COD')   return `<span class="col-cod">${esc(a.ART_COD)}</span>`;
        if(c.field==='ART_DES')   return `<span class="col-des">${esc(a.ART_DES)}</span>`;
        if(c.field==='ART_RUB')   return `<span style="font-family:var(--mono);font-size:12px;color:var(--t2)">${esc(a.ART_RUB||'')}</span>`;
        if(c.field==='ART_SRUB')  return `<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">${esc(a.ART_SRUB||'')}</span>`;
        if(c.field==='ART_PRE')   return `<span class="col-num" style="color:var(--grn)">$${fmt(a.ART_PRE)}</span>`;
        if(c.field==='ART_STK')   return `<span class="col-num" style="${sH===0?'color:var(--red)':''}">${sH}</span>`;
        if(c.field==='ART_STKT')  return `<span class="col-num" style="${sT===0?'color:var(--red)':''}">${sT}</span>`;
        if(c.field==='ART_ESTU')  return `<span class="col-ctr"><span class="pill ${a.ART_ESTU==='S'?'pi':'pn'}">${a.ART_ESTU||'—'}</span></span>`;
        if(c.field==='ART_ACT')   return `<span class="col-ctr"><span class="pill ${a.ART_ACT==='S'?'ps':'pn'}">${a.ART_ACT||'N'}</span></span>`;
        if(c.field==='ART_GRUP')  return `<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">${esc((a.ART_GRUP||'')+(a.ART_SEX?'-'+a.ART_SEX:''))}</span>`;
        if(c.field==='ART_SEX')   return `<span class="col-sm">${esc(a.ART_SEX||'')}</span>`;
        if(c.field==='ART_MARCA') return `<span class="col-sm">${esc(a.ART_MARCA||'')}</span>`;
        if(c.field==='ART_PROV')  return `<span class="col-sm">${esc(a.ART_PROV||'')}</span>`;
        if(c.field==='CODCASIO')  return `<span class="col-sm">${esc(a.CODCASIO||'')}</span>`;
        return `<span>${esc(String(a[c.field]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');
  const bArt = document.getElementById('b-art'); if(bArt) bArt.textContent = ARTS.length + ' artículos';
}

function togArtStock() {
  artSoloStock = !artSoloStock;
  const btn = document.getElementById('af-stock');
  btn.classList.toggle('on', artSoloStock);
  btn.textContent = artSoloStock ? '📦 Todos' : '📦 Con Stock';
  renderArts();
}

function selArt(i){ artSelIdx=i; renderArts(); }
function setArtFilt(v){
  artFilt=v;
  ['todos','s','n'].forEach(k=>document.getElementById('af-'+k)?.classList.remove('on'));
  document.getElementById('af-'+v.toLowerCase())?.classList.add('on');
  renderArts();
}

function artDetail(idx){
  const a = ARTS[idx];
  document.getElementById('art-dp-tit').textContent = a.ART_COD + ' — ' + a.ART_DES;
  document.getElementById('art-dp-body').innerHTML = [
    ['Código',a.ART_COD],['Rubro',a.ART_RUB||'—'],['Sub-Rubro',a.ART_SRUB||'—'],
    ['Marca',a.ART_MARCA||'—'],['Proveedor',a.ART_PROV||'—'],
    ['Precio','$'+fmt(a.ART_PRE)],
    ['Stock Hatsu',a.ART_STK||0],['Stock Tressa',a.ART_STKT||0],
    ['Grupo',a.ART_GRUP||'—'],['Sexo',a.ART_SEX||'—'],['Estuche',a.ART_ESTU||'—'],
    ['Activo',a.ART_ACT==='S'?'Sí':'No'],['Cód.Casio',a.CODCASIO||'—'],
  ].map(([l,v])=>`<div class="dpi"><span class="dpi-lbl">${l}</span><span class="dpi-val">${esc(String(v))}</span></div>`).join('');
  document.getElementById('art-dp').classList.add('open');
}

function aAlta(){
  clrArtForm();
  document.getElementById('af-cod').disabled = false;
  document.getElementById('art-mtit').textContent = 'Nuevo Artículo';
  setMtag('art-mtag','ALTA','tag-a');
  document.getElementById('ov-art').classList.add('open');
  window._ae = 'A';
}
function aModif(){
  if(artSelIdx===null){ toast('Seleccioná un artículo','err'); return; }
  fillArtForm(ARTS[artSelIdx]);
  document.getElementById('af-cod').disabled = true;
  document.getElementById('art-mtit').textContent = 'Modificar: ' + ARTS[artSelIdx].ART_COD;
  setMtag('art-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-art').classList.add('open');
  window._ae = 'M';
}
function aBaja(){
  if(artSelIdx===null){ toast('Seleccioná un artículo','err'); return; }
  const a = ARTS[artSelIdx];
  confirm2('¿Dar de baja "'+a.ART_COD+'"?','"'+a.ART_DES+'" será eliminado.',()=>{
    const cod = a.ART_COD;
    ARTS.splice(artSelIdx,1); artSelIdx=null; deleteArt(cod); renderArts(); toast('Artículo eliminado','scs');
  });
}

function fillArtSelects(selMarc, selRub, selSrub, selProv) {
  const opts = (tab, sel) => '<option value="">— Sin —</option>' +
    (TABLAS[tab]||[]).map(r=>`<option value="${r.CODIGO}"${r.CODIGO===sel?' selected':''}>${r.CODIGO} — ${r.DETALLE}</option>`).join('');
  document.getElementById('af-marc').innerHTML = opts('MARC', selMarc);
  document.getElementById('af-rub').innerHTML  = opts('RUBR', selRub);
  document.getElementById('af-srub').innerHTML = opts('SRUB', selSrub);
  document.getElementById('af-prov').innerHTML = opts('PROV', selProv);
}

function clrArtForm(){
  ['af-cod','af-des','af-grup','af-sex','af-estu','af-codcasio'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=''; });
  ['af-pre','af-stk','af-stkt'].forEach(i=>{ const el=document.getElementById(i); if(el) el.value=0; });
  const act = document.getElementById('af-act'); if(act) act.value='S';
  const tog = document.getElementById('atog-act'); if(tog) tog.classList.add('on');
  fillArtSelects('','','','');
}

function fillArtForm(a){
  document.getElementById('af-cod').value     = a.ART_COD||'';
  document.getElementById('af-des').value     = a.ART_DES||'';
  document.getElementById('af-pre').value     = a.ART_PRE||0;
  document.getElementById('af-stk').value     = a.ART_STK||0;
  document.getElementById('af-stkt').value    = a.ART_STKT||0;
  document.getElementById('af-estu').value    = a.ART_ESTU||'';
  document.getElementById('af-grup').value    = a.ART_GRUP||'';
  document.getElementById('af-sex').value     = a.ART_SEX||'';
  const cc = document.getElementById('af-codcasio'); if(cc) cc.value = a.CODCASIO||'';
  // Toggle activo
  const actVal = a.ART_ACT||'S';
  const actInp = document.getElementById('af-act');
  const actTog = document.getElementById('atog-act');
  if(actInp) actInp.value = actVal;
  if(actTog) actTog.classList.toggle('on', actVal==='S');
  fillArtSelects(a.ART_MARCA, a.ART_RUB, a.ART_SRUB, a.ART_PROV);
}

function saveArt(){
  const cod = document.getElementById('af-cod').value.trim().toUpperCase();
  const des = document.getElementById('af-des').value.trim().toUpperCase();
  if(!cod||!des){ toast('Código y descripción son obligatorios','err'); return; }
  const d = {
    ART_COD:   cod,
    ART_DES:   des,
    ART_RUB:   document.getElementById('af-rub').value,
    ART_SRUB:  document.getElementById('af-srub')?.value||null,
    ART_MARCA: document.getElementById('af-marc').value,
    ART_PRE:   parseFloat(document.getElementById('af-pre').value)||0,
    ART_STK:   parseInt(document.getElementById('af-stk').value)||0,
    ART_STKT:  parseInt(document.getElementById('af-stkt').value)||0,
    ART_ACT:   document.getElementById('af-act').value||'S',
    ART_ESTU:  document.getElementById('af-estu').value,
    ART_GRUP:  document.getElementById('af-grup').value.trim().toUpperCase(),
    ART_SEX:   document.getElementById('af-sex').value.trim().toUpperCase(),
    ART_PROV:  document.getElementById('af-prov').value,
    CODCASIO:  document.getElementById('af-codcasio')?.value.trim()||null,
  };
  if(window._ae==='A'){
    if(ARTS.find(a=>a.ART_COD===cod)){ toast('Código ya existe','err'); return; }
    ARTS.unshift(d); artSelIdx=0; toast('Artículo dado de alta','scs');
  } else {
    ARTS[artSelIdx]=d; toast('Artículo modificado','scs');
  }
  sbSaveArt(d); closeOv('ov-art'); renderArts();
}

function printArt(){
  const list = filtArts();
  const rows = list.map(a=>`<tr><td style="font-family:monospace;color:#4f8ef7">${esc(a.ART_COD)}</td><td>${esc(a.ART_DES||'')}</td><td>${esc(a.ART_RUB||'')}</td><td style="text-align:right">$${fmt(a.ART_PRE)}</td><td style="text-align:right">${a.ART_STK||0}</td><td style="text-align:right">${a.ART_STKT||0}</td></tr>`).join('');
  openPrint('📦 Listado de Artículos',`<table><thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th>RUBRO</th><th>PRECIO</th><th>STK HAT</th><th>STK TRE</th></tr></thead><tbody>${rows}</tbody></table>`,list.length);
}

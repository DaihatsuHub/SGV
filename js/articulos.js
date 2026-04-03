// ═══════════════════════════════════════════════════════════
// ARTÍCULOS — Listado, filtros, ABM
// ═══════════════════════════════════════════════════════════

  let list=ARTS.filter(a=>!q||a.ART_COD.toLowerCase().includes(q)||a.ART_DES.toLowerCase().includes(q));
  // Ordenar por columna activa
  const s=SORT_STATE['art'];
  if(s&&s.col){
    list=list.slice().sort((a,b)=>{
      const va=a[s.col]||'', vb=b[s.col]||'';
      const r=typeof va==='number'?va-vb:String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    });
  } else {
    list=list.slice().sort((a,b)=>(a.ART_COD||'').localeCompare(b.ART_COD||''));
  }
  return list;
}
function renderArts(){
  const list=filtArts();
  const body=document.getElementById('art-body');
  const cols=getActiveCols('art');
  // Render cabecera
  const gridTpl=cols.map(c=>c.width||'1fr').join(' ');
  document.querySelector('.th-art').style.gridTemplateColumns=gridTpl;
  document.querySelector('.th-art').innerHTML=cols.map(c=>
    `<span class="th-sortable" onclick="toggleSort('art','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('art',c.field)}</span>`
  ).join('');
  if(!list.length){body.innerHTML='<div class="empty">🔍 Sin resultados</div>';document.getElementById('b-art').textContent=ARTS.length+' artículos';return;}
  body.innerHTML=list.map(a=>{
    const idx=ARTS.indexOf(a);
    const sel=artSelIdx===idx?'sel':'';
    const ofe=(a.ART_OFERTA===true||a.ART_OFERTA==='T')?'oferta':'';
    const sH=a.ART_STK||0,sT=a.ART_STKT||0;
    const row=document.createElement('div');
    return `<div class="tr-art ${sel} ${ofe}" style="grid-template-columns:${gridTpl}" onclick="selArt(${idx})" ondblclick="artDetail(${idx})">`+
      cols.map(c=>{
        if(c.field==='ART_COD') return `<span class="col-cod">${esc(a.ART_COD)}</span>`;
        if(c.field==='ART_DES') return `<span class="col-des">${esc(a.ART_DES)}</span>`;
        if(c.field==='ART_RUB') return `<span style="font-family:var(--mono);font-size:12px;color:var(--t2)">${esc(a.ART_RUB||'')}</span>`;
        if(c.field==='ART_PRE') return `<span class="col-num" style="color:var(--grn)">$${fmt(a.ART_PRE)}</span>`;
        if(c.field==='ART_STK') return `<span class="col-num" style="${sH===0?'color:var(--red)':''}">${sH}</span>`;
        if(c.field==='ART_STKT') return `<span class="col-num" style="${sT===0?'color:var(--red)':''}">${sT}</span>`;
        if(c.field==='ART_ESTU') return `<span class="col-ctr"><span class="pill ${a.ART_ESTU==='S'?'pi':'pn'}">${a.ART_ESTU||'—'}</span></span>`;
        if(c.field==='ART_ACT') return `<span class="col-ctr"><span class="pill ${a.ART_ACT==='S'?'ps':'pn'}">${a.ART_ACT||'N'}</span></span>`;
        if(c.field==='ART_GRUP') return `<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">${esc((a.ART_GRUP||'')+(a.ART_SEX?'-'+a.ART_SEX:''))}</span>`;
        if(c.field==='ART_MARCA') return `<span class="col-sm">${esc(a.ART_MARCA||'')}</span>`;
        if(c.field==='ART_PROV') return `<span class="col-sm">${esc(a.ART_PROV||'')}</span>`;
        if(c.field==='ART_PREMAY') return `<span class="col-num">$${fmt(a.ART_PREMAY)}</span>`;
        if(c.field==='ART_PREESP') return `<span class="col-num">$${fmt(a.ART_PREESP)}</span>`;
        return `<span>${esc(String(a[c.field]||''))}</span>`;
      }).join('')+`</div>`;
  }).join('');
  document.getElementById('b-art').textContent=ARTS.length+' artículos';
}
function updArtRubs(){}
function selArt(i){artSelIdx=i;renderArts();}
function setArtFilt(v){
  artFilt=v;
  ['todos','s','n'].forEach(k=>document.getElementById('af-'+k).classList.remove('on'));
  document.getElementById('af-'+v.toLowerCase()).classList.add('on');
  renderArts();
}
function togArtOfe(){artOfe=!artOfe;document.getElementById('af-ofe').classList.toggle('on',artOfe);renderArts();}

function artDetail(idx){
  const a=ARTS[idx];
  document.getElementById('art-dp-tit').textContent=a.ART_COD+' — '+a.ART_DES;
  document.getElementById('art-dp-body').innerHTML=[
    ['Código',a.ART_COD],['Sub-Código',a.ART_SUBCOD||'—'],['Rubro',a.ART_RUB||'—'],['Proveedor',a.ART_PROV||'—'],
    ['Precio Lista','$'+fmt(a.ART_PRE)],['Precio Franq.','$'+fmt(a.ART_FRANQ)],['Precio Esp.','$'+fmt(a.ART_PREESP)],['Precio Mayor','$'+fmt(a.ART_PREMAY)],
    ['Stock Hatsu',a.ART_STK||0],['Stock Tressa',a.ART_STKT||0],['Reservado',a.ART_RESERV||0],['Pedido',a.ART_PED||0],
    ['Dto %',a.ART_DTO||0],['Grupo',a.ART_GRUP||'—'],['Sexo',a.ART_SEX||'—'],['Estuche',a.ART_ESTU||'—'],
    ['Activo',a.ART_ACT==='S'?'Sí':'No'],['Oferta',(a.ART_OFERTA===true||a.ART_OFERTA==='T')?'Sí':'No'],['Tapa',a.ART_TAPA||'—'],['Cód.Casio',a.CODCASIO||'—'],
  ].map(([l,v])=>`<div class="dpi"><span class="dpi-lbl">${l}</span><span class="dpi-val">${esc(String(v))}</span></div>`).join('');
  document.getElementById('art-dp').classList.add('open');
}

// ART ABM
function aAlta(){
  clrArtForm();document.getElementById('af-cod').disabled=false;
  document.getElementById('art-mtit').textContent='Nuevo Artículo';
  setMtag('art-mtag','ALTA','tag-a');
  document.getElementById('ov-art').classList.add('open');window._ae='A';
}
function aModif(){
  if(artSelIdx===null){toast('Seleccioná un artículo','err');return;}
  fillArtForm(ARTS[artSelIdx]);document.getElementById('af-cod').disabled=true;
  document.getElementById('art-mtit').textContent='Modificar: '+ARTS[artSelIdx].ART_COD;
  setMtag('art-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-art').classList.add('open');window._ae='M';
}
function aBaja(){
  if(artSelIdx===null){toast('Seleccioná un artículo','err');return;}
  const a=ARTS[artSelIdx];
  confirm2('¿Dar de baja "'+a.ART_COD+'"?','"'+a.ART_DES+'" será eliminado.',()=>{
    const cod = a.ART_COD;
    ARTS.splice(artSelIdx,1);artSelIdx=null;deleteArt(cod);renderArts();toast('Artículo eliminado','scs');
  });
}
function fillArtSelects(selMarc, selRub, selProv) {
  const opts = (tab, sel) => '<option value="">— Sin —</option>' +
    (TABLAS[tab]||[]).map(r=>`<option value="${r.CODIGO}"${r.CODIGO===sel?' selected':''}>${r.CODIGO} — ${r.DETALLE}</option>`).join('');
  document.getElementById('af-marc').innerHTML = opts('MARC', selMarc);
  document.getElementById('af-rub').innerHTML  = opts('RUBR', selRub);
  document.getElementById('af-prov').innerHTML = opts('PROV', selProv);
}
function clrArtForm(){
  ['af-cod','af-sub','af-des','af-casio','af-grup','af-tapa','af-estu'].forEach(i=>document.getElementById(i).value='');
  ['af-pre','af-franq','af-preesp','af-premay','af-stk','af-stkt','af-dto'].forEach(i=>document.getElementById(i).value=0);
  document.getElementById('af-sex').value='';
  fillArtSelects('','','');
  setTog('atog-act','af-act',true);setTog('atog-ofe','af-ofe',false);
}
function fillArtForm(a){
  document.getElementById('af-cod').value=a.ART_COD;
  document.getElementById('af-sub').value=a.ART_SUBCOD||'';
  document.getElementById('af-des').value=a.ART_DES;
  fillArtSelects(a.ART_MARCA||'', a.ART_RUB||'', a.ART_PROV||'');
  document.getElementById('af-casio').value=a.CODCASIO||'';
  document.getElementById('af-grup').value=a.ART_GRUP||'';
  document.getElementById('af-sex').value=a.ART_SEX||'';
  document.getElementById('af-pre').value=a.ART_PRE||0;
  document.getElementById('af-franq').value=a.ART_FRANQ||0;
  document.getElementById('af-preesp').value=a.ART_PREESP||0;
  document.getElementById('af-premay').value=a.ART_PREMAY||0;
  document.getElementById('af-tapa').value=a.ART_TAPA||'';
  document.getElementById('af-dto').value=a.ART_DTO||0;
  document.getElementById('af-stk').value=a.ART_STK||0;
  document.getElementById('af-stkt').value=a.ART_STKT||0;
  document.getElementById('af-estu').value=a.ART_ESTU||'';
  setTog('atog-act','af-act',a.ART_ACT==='S');
  setTog('atog-ofe','af-ofe',a.ART_OFERTA===true||a.ART_OFERTA==='T');
}
function saveArt(){
  const cod=document.getElementById('af-cod').value.trim().toUpperCase();
  const des=document.getElementById('af-des').value.trim();
  if(!cod||!des){toast('Código y descripción son obligatorios','err');return;}
  const d={
    ART_COD:cod,ART_DES:des,
    ART_MARCA:document.getElementById('af-marc').value,
    ART_SUBCOD:document.getElementById('af-sub').value.trim(),
    ART_RUB:document.getElementById('af-rub').value,
    ART_PROV:document.getElementById('af-prov').value,
    CODCASIO:document.getElementById('af-casio').value.trim(),
    ART_GRUP:document.getElementById('af-grup').value.trim().toUpperCase(),
    ART_SEX:document.getElementById('af-sex').value,
    ART_PRE:parseFloat(document.getElementById('af-pre').value)||0,
    ART_FRANQ:parseFloat(document.getElementById('af-franq').value)||0,
    ART_PREESP:parseFloat(document.getElementById('af-preesp').value)||0,
    ART_PREMAY:parseFloat(document.getElementById('af-premay').value)||0,
    ART_TAPA:document.getElementById('af-tapa').value.trim(),
    ART_DTO:parseInt(document.getElementById('af-dto').value)||0,
    ART_STK:parseInt(document.getElementById('af-stk').value)||0,
    ART_STKT:parseInt(document.getElementById('af-stkt').value)||0,
    ART_ESTU:document.getElementById('af-estu').value.trim().toUpperCase(),
    ART_ACT:document.getElementById('af-act').value,
    ART_OFERTA:document.getElementById('af-ofe').value==='1',
    ART_PED:0,ART_SERVIC:0,ART_RESERV:0,
  };
  if(window._ae==='A'){
    if(ARTS.find(a=>a.ART_COD===cod)){toast('Código ya existe','err');return;}
    ARTS.unshift(d);artSelIdx=0;toast('Artículo dado de alta','scs');
  }else{ARTS[artSelIdx]=d;toast('Artículo modificado','scs');}
  sbSaveArt(d);closeOv('ov-art');renderArts();
}
function printArt(){
  const list=filtArts();
  const rows=list.map(a=>`<tr><td style="font-family:monospace;color:#4f8ef7">${esc(a.ART_COD)}</td><td>${esc(a.ART_DES)}</td><td>${a.ART_RUB||''}</td><td style="text-align:right;font-family:monospace">$${fmt(a.ART_PRE)}</td><td style="text-align:right">${a.ART_STK||0}</td><td style="text-align:right">${a.ART_STKT||0}</td><td>${a.ART_ACT}</td></tr>`).join('');
  openPrint('📦 Listado de Artículos',`<table><thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th>RUBRO</th><th>PRECIO</th><th>STK HAT</th><th>STK TRE</th><th>ACT</th></tr></thead><tbody>${rows}</tbody></table>`,list.length);
}

// ═══════════════════════════════════════════════════════════
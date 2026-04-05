// ═══════════════════════════════════════════════════════════
// CLIENTES — Listado, filtros, ABM
// ═══════════════════════════════════════════════════════════

function filtClis(){
  const q=document.getElementById('cli-q').value.toLowerCase();
  const pv=document.getElementById('cli-prov').value;
  const vd=document.getElementById('cli-vend').value;
  return CLIS.filter(c=>{
    const mq=!q||c.CLI_CODIGO.toLowerCase().includes(q)||(c.CLI_RAZON||'').toLowerCase().includes(q);
    const me=cliFilt==='todos'
      ||(cliFilt==='ok'&&!c.CLI_INCOB&&!c.CLI_NODAR&&!c.CLI_PREINC)
      ||(cliFilt==='inc'&&c.CLI_INCOB)
      ||(cliFilt==='nov'&&c.CLI_NODAR);
    const mp=!pv||c.CLI_PROVIN===pv;
    const mv=!vd||c.CLI_VEND===vd;
    return mq&&me&&mp&&mv;
  }).sort((a,b)=>{
    const s=SORT_STATE['cli'];
    if(s&&s.col){
      const va=a[s.col]||'', vb=b[s.col]||'';
      const r=typeof va==='number'?va-vb:String(va).localeCompare(String(vb));
      return s.asc?r:-r;
    }
    return (a.CLI_CODIGO||'').localeCompare(b.CLI_CODIGO||'');
  });
}

function renderClis(){
  const list=filtClis();
  const body=document.getElementById('cli-body');
  const cols=getActiveCols('cli');
  const gridTpl=cols.map(c=>c.width||'1fr').join(' ');

  // Render cabecera dinámica
  const thCli=document.querySelector('.th-cli');
  if(thCli){
    thCli.style.gridTemplateColumns=gridTpl;
    thCli.innerHTML=cols.map(c=>
      `<span class="th-sortable" onclick="toggleSort('cli','${c.field}')" style="${c.align?'text-align:'+c.align:''}">${c.label}${sortArrow('cli',c.field)}</span>`
    ).join('');
  }

  if(!list.length){body.innerHTML='<div class="empty">🔍 Sin resultados</div>';updCliFilts();return;}

  body.innerHTML=list.map(c=>{
    const idx=CLIS.indexOf(c);
    const sel=cliSelIdx===idx?'sel':'';
    const cls=c.CLI_INCOB?'incob':c.CLI_NODAR?'nodar':'';
    const st=c.CLI_INCOB?`<span class="pill pn">INCOB</span>`:c.CLI_PREINC?`<span class="pill po">PRE-INC</span>`:c.CLI_NODAR?`<span class="pill pp">NO DAR</span>`:`<span class="pill ps">OK</span>`;

    return `<div class="tr-cli ${sel} ${cls}" style="grid-template-columns:${gridTpl}" onclick="selCli(${idx})" ondblclick="cliDetail(${idx})">` +
      cols.map(col=>{
        if(col.field==='CLI_CODIGO') return `<span class="col-cod">${esc(c.CLI_CODIGO)}</span>`;
        if(col.field==='CLI_RAZON')  return `<span class="col-des">${esc(c.CLI_RAZON||'')}</span>`;
        if(col.field==='CLI_DOMIC')  return `<span class="col-sm">${esc(c.CLI_DOMIC||'')}</span>`;
        if(col.field==='CLI_LOCAL')  return `<span class="col-sm">${esc(c.CLI_LOCAL||'')}</span>`;
        if(col.field==='CLI_CODPOS') return `<span class="col-sm">${esc(c.CLI_CODPOS||'')}</span>`;
        if(col.field==='CLI_PROVIN') return `<span class="col-sm">${esc(PCIA[c.CLI_PROVIN]||c.CLI_PROVIN||'')}</span>`;
        if(col.field==='CLI_CUIT')   return `<span style="font-family:var(--mono);font-size:12px;color:var(--t2)">${esc(c.CLI_CUIT||'')}</span>`;
        if(col.field==='CLI_IVA')    return `<span class="col-sm">${IVA[c.CLI_IVA]||c.CLI_IVA||'—'}</span>`;
        if(col.field==='CLI_CONPAG') return `<span style="font-family:var(--mono);font-size:12px;text-align:center">${esc(c.CLI_CONPAG||'—')}</span>`;
        if(col.field==='CLI_ESTADO') return `<span class="col-ctr">${st}</span>`;
        if(col.field==='CLI_VEND')   return `<span class="col-sm">${esc(c.CLI_VEND||'')}</span>`;
        if(col.field==='CLI_EXPRE')  return `<span class="col-sm">${esc(c.CLI_EXPRE||'')}</span>`;
        if(col.field==='CLI_TELEF')  return `<span class="col-sm">${esc(c.CLI_TELEF||'')}</span>`;
        if(col.field==='CLI_EMAIL')  return `<span class="col-sm">${esc(c.CLI_EMAIL||'')}</span>`;
        if(col.field==='CLI_ABC')    return `<span class="col-sm">${esc(c.CLI_ABC||'')}</span>`;
        if(col.field==='CLI_DTO')    return `<span class="col-num">${c.CLI_DTO||0}%</span>`;
        if(col.field==='CLI_ICRED')  return `<span class="col-num">$${fmt(c.CLI_ICRED)}</span>`;
        return `<span class="col-sm">${esc(String(c[col.field]||''))}</span>`;
      }).join('') +
    `</div>`;
  }).join('');

  updCliFilts();
  document.getElementById('b-cli').textContent=CLIS.length+' clientes';
}

function updCliFilts(){
  const pv=document.getElementById('cli-prov');
  const vd=document.getElementById('cli-vend');
  if(!pv||!vd) return;
  const curPv=pv.value, curVd=vd.value;
  const provs=[...new Set(CLIS.map(c=>c.CLI_PROVIN).filter(Boolean))].sort();
  const vends=[...new Set(CLIS.map(c=>c.CLI_VEND).filter(Boolean))].sort();
  pv.innerHTML='<option value="">Todas las provincias</option>'+provs.map(p=>`<option value="${p}"${p===curPv?' selected':''}>${PCIA[p]||p}</option>`).join('');
  vd.innerHTML='<option value="">Todos los vendedores</option>'+vends.map(v=>`<option value="${v}"${v===curVd?' selected':''}>${v}</option>`).join('');
}

function selCli(i){cliSelIdx=i;renderClis();}
function setCliFilt(v){
  cliFilt=v;
  ['todos','ok','inc','nov'].forEach(k=>document.getElementById('cf-'+k)?.classList.remove('on'));
  document.getElementById('cf-'+v)?.classList.add('on');
  renderClis();
}

function cliDetail(idx){
  const c=CLIS[idx];
  document.getElementById('cli-dp-tit').textContent=c.CLI_CODIGO+' — '+c.CLI_RAZON;
  document.getElementById('cli-dp-body').innerHTML=[
    ['Código',c.CLI_CODIGO],['CUIT',c.CLI_CUIT||'—'],['Razón Social',c.CLI_RAZON||'—'],
    ['Domicilio',c.CLI_DOMIC||'—'],['Localidad',c.CLI_LOCAL||'—'],['CP',c.CLI_CODPOS||'—'],
    ['Provincia',PCIA[c.CLI_PROVIN]||c.CLI_PROVIN||'—'],['Teléfono',c.CLI_TELEF||'—'],['E-mail',c.CLI_EMAIL||'—'],
    ['IVA',IVA[c.CLI_IVA]||'—'],['Cond.Pago',c.CLI_CONPAG||'—'],['Dto %',c.CLI_DTO||0],
    ['Vendedor',c.CLI_VEND||'—'],['Expreso',c.CLI_EXPRE||'—'],['Crédito','$'+fmt(c.CLI_ICRED||0)],
    ['Nro IB',c.CLI_NROIB||'—'],['ABC',c.CLI_ABC||'—'],['Observ.',c.CLI_OBS||'—'],
  ].map(([l,v])=>`<div class="dpi"><span class="dpi-lbl">${l}</span><span class="dpi-val">${esc(String(v))}</span></div>`).join('');
  document.getElementById('cli-dp').classList.add('open');
}

function cAlta(){
  clrCliForm();document.getElementById('cf-cod').disabled=false;
  document.getElementById('cli-mtit').textContent='Nuevo Cliente';
  setMtag('cli-mtag','ALTA','tag-a');
  document.getElementById('ov-cli').classList.add('open');window._ce='A';
}
function cModif(){
  if(cliSelIdx===null){toast('Seleccioná un cliente','err');return;}
  fillCliForm(CLIS[cliSelIdx]);document.getElementById('cf-cod').disabled=true;
  document.getElementById('cli-mtit').textContent='Modificar: '+CLIS[cliSelIdx].CLI_CODIGO;
  setMtag('cli-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-cli').classList.add('open');window._ce='M';
}
function cBaja(){
  if(cliSelIdx===null){toast('Seleccioná un cliente','err');return;}
  const c=CLIS[cliSelIdx];
  confirm2('¿Dar de baja "'+c.CLI_CODIGO+'"?','"'+c.CLI_RAZON+'" será eliminado.',()=>{
    const cod = c.CLI_CODIGO;
    CLIS.splice(cliSelIdx,1);cliSelIdx=null;deleteCli(cod);renderClis();toast('Cliente eliminado','scs');
  });
}
function clrCliForm(){
  ['cf-cod','cf-razon','cf-domic','cf-local','cf-cp','cf-tel','cf-email','cf-vend','cf-expre','cf-cuit','cf-conpag','cf-nroib','cf-obs'].forEach(i=>document.getElementById(i).value='');
  ['cf-dto','cf-icred'].forEach(i=>document.getElementById(i).value=0);
  document.getElementById('cf-fcred').value='';
  ['cf-abc','cf-prov','cf-cate'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('cf-iva').value='I';
  document.getElementById('cf-tipoib').value='0';
  ['ctog-inc','ctog-preinc','ctog-nodar','ctog-perc'].forEach(t=>setTog(t,t.replace('ctog-','cf-'),false));
}
function fillCliForm(c){
  document.getElementById('cf-cod').value=c.CLI_CODIGO;
  document.getElementById('cf-razon').value=c.CLI_RAZON||'';
  document.getElementById('cf-domic').value=c.CLI_DOMIC||'';
  document.getElementById('cf-local').value=c.CLI_LOCAL||'';
  document.getElementById('cf-cp').value=c.CLI_CODPOS||'';
  document.getElementById('cf-prov').value=c.CLI_PROVIN||'';
  document.getElementById('cf-tel').value=c.CLI_TELEF||'';
  document.getElementById('cf-email').value=c.CLI_EMAIL||'';
  document.getElementById('cf-vend').value=c.CLI_VEND||'';
  document.getElementById('cf-expre').value=c.CLI_EXPRE||'';
  document.getElementById('cf-cuit').value=c.CLI_CUIT||'';
  document.getElementById('cf-iva').value=c.CLI_IVA||'I';
  document.getElementById('cf-conpag').value=c.CLI_CONPAG||'';
  document.getElementById('cf-dto').value=c.CLI_DTO||0;
  document.getElementById('cf-nroib').value=c.CLI_NROIB||'';
  document.getElementById('cf-tipoib').value=c.CLI_TIPOIB||'0';
  document.getElementById('cf-obs').value=c.CLI_OBS||'';
  document.getElementById('cf-icred').value=c.CLI_ICRED||0;
  document.getElementById('cf-abc').value=c.CLI_ABC||'';
  document.getElementById('cf-cate').value=c.CLI_CATE||'';
  setTog('ctog-inc','cf-inc',!!c.CLI_INCOB);
  setTog('ctog-preinc','cf-preinc',!!c.CLI_PREINC);
  setTog('ctog-nodar','cf-nodar',!!c.CLI_NODAR);
  setTog('ctog-perc','cf-perc',c.CLI_PERCIB==='S');
}
function saveCli(){
  const cod=document.getElementById('cf-cod').value.trim();
  const razon=document.getElementById('cf-razon').value.trim();
  if(!cod||!razon){toast('Código y razón social son obligatorios','err');return;}
  const d={
    CLI_CODIGO:cod,CLI_RAZON:razon.toUpperCase(),
    CLI_DOMIC:document.getElementById('cf-domic').value.trim(),
    CLI_LOCAL:document.getElementById('cf-local').value.trim(),
    CLI_CODPOS:document.getElementById('cf-cp').value.trim(),
    CLI_PROVIN:document.getElementById('cf-prov').value,
    CLI_TELEF:document.getElementById('cf-tel').value.trim(),
    CLI_EMAIL:document.getElementById('cf-email').value.trim(),
    CLI_VEND:document.getElementById('cf-vend').value.trim().toUpperCase(),
    CLI_EXPRE:document.getElementById('cf-expre').value.trim().toUpperCase(),
    CLI_CUIT:document.getElementById('cf-cuit').value.trim(),
    CLI_IVA:document.getElementById('cf-iva').value,
    CLI_CONPAG:document.getElementById('cf-conpag').value.trim().toUpperCase(),
    CLI_DTO:parseFloat(document.getElementById('cf-dto').value)||0,
    CLI_NROIB:document.getElementById('cf-nroib').value.trim(),
    CLI_TIPOIB:document.getElementById('cf-tipoib').value,
    CLI_PERCIB:document.getElementById('cf-perc').value==='1'?'S':'N',
    CLI_OBS:document.getElementById('cf-obs').value.trim(),
    CLI_ICRED:parseFloat(document.getElementById('cf-icred').value)||0,
    CLI_ABC:document.getElementById('cf-abc').value,
    CLI_CATE:document.getElementById('cf-cate').value,
    CLI_INCOB:document.getElementById('cf-inc').value==='1',
    CLI_PREINC:document.getElementById('cf-preinc').value==='1',
    CLI_NODAR:document.getElementById('cf-nodar').value==='1',
  };
  if(window._ce==='A'){
    if(CLIS.find(c=>c.CLI_CODIGO===cod)){toast('Código ya existe','err');return;}
    CLIS.unshift(d);cliSelIdx=0;toast('Cliente dado de alta','scs');
  }else{CLIS[cliSelIdx]=d;toast('Cliente modificado','scs');}
  sbSaveCli(d);closeOv('ov-cli');renderClis();
}
function printCli(){
  const list=filtClis();
  const rows=list.map(c=>`<tr><td style="font-family:monospace">${esc(c.CLI_CODIGO)}</td><td>${esc(c.CLI_RAZON||'')}</td><td>${esc(c.CLI_DOMIC||'')}</td><td>${esc(c.CLI_LOCAL||'')}</td><td style="font-family:monospace">${esc(c.CLI_CUIT||'')}</td><td>${IVA[c.CLI_IVA]||'—'}</td><td>${esc(c.CLI_CONPAG||'')}</td></tr>`).join('');
  openPrint('👥 Listado de Clientes',`<table><thead><tr><th>CÓDIGO</th><th>RAZÓN SOCIAL</th><th>DOMICILIO</th><th>LOCALIDAD</th><th>CUIT</th><th>IVA</th><th>COND.PAGO</th></tr></thead><tbody>${rows}</tbody></table>`,list.length);
}

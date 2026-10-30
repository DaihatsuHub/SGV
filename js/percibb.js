// ═══════════════════════════════════════════════════════════
// PERCEPCIONES DE IIBB DESDE EL PADRÓN (Clientes) — Ricardo, Oct 2026
// AFIP/ARBA manda periódicamente un .txt separado por ";" con los % de cada
// contribuyente: campo 4 = CUIT sin guiones, campo 8 = %.
// Se elige la percepción (tabla) y el archivo; la grilla muestra los clientes
// que HOY tienen esa percepción y los que figuran en el archivo, con el %
// actual y el % nuevo (0 si no figura). Al grabar:
//   cambió el %  → se actualiza · % nuevo 0 → se quita · no la tenía → se agrega
// Prefijo propio `pib`.
// ═══════════════════════════════════════════════════════════

let _pib = { perc:'', filas:[], archivo:'' };

function renderPib(){
  const pg=document.getElementById('page-pib'); if(!pg) return;
  if(!document.getElementById('pib-perc')){
    pg.innerHTML=`
      <div class="toolbar" style="flex-wrap:wrap;row-gap:8px">
        <span style="font-weight:600;font-size:14px;color:var(--acc)">🧾 Percepciones de IIBB</span>
        <select class="fsel" id="pib-perc" style="min-width:220px"></select>
        <input type="file" id="pib-file" accept=".txt,.csv,text/plain" style="font-size:12px;color:var(--t2)">
        <button class="btn pri" onclick="pibProcesar()">▶ Procesar</button>
        <label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--t2);cursor:pointer">
          <input type="checkbox" id="pib-solocamb" checked onchange="pibPintar()"> Sólo los que cambian</label>
        <span id="pib-info" style="font-size:12px;color:var(--t2)"></span>
        <div class="spacer"></div>
        <button class="btn" onclick="pibCancelar()">Cancelar</button>
        <button class="btn pri" id="pib-grabar" onclick="pibGrabar()" disabled>💾 Grabar</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 110px 110px;gap:8px;padding:8px 14px;background:var(--s2);border-bottom:1px solid var(--b1);font-size:11px;color:var(--t2);font-weight:600">
        <span>Cliente</span><span style="text-align:right">% Actual</span><span style="text-align:right">% Nuevo</span></div>
      <div id="pib-body" style="overflow:auto;height:calc(100vh - 210px)"></div>`;
  }
  const sel=document.getElementById('pib-perc');
  if(sel && sel.options.length<=1)
    sel.innerHTML='<option value="">— Elegí la percepción —</option>'+(TABLAS['PERC']||[]).map(p=>
      `<option value="${esc(p.CODIGO)}">${esc(p.CODIGO)} — ${esc(p.DETALLE)}</option>`).join('');
}

const _pibCuit = v => String(v||'').replace(/\D/g,'');
const _pibNum  = v => { const n=parseFloat(String(v||'').trim().replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; };
const _pibPctDe = (c,perc) => { const p=(Array.isArray(c.CLI_PERCEP)?c.CLI_PERCEP:[]).find(x=>String(x.cod||'').trim()===perc); return p ? (Number(p.pct)||0) : null; };

async function pibProcesar(){
  const perc=document.getElementById('pib-perc').value;
  const file=document.getElementById('pib-file').files[0];
  if(!perc){ toast('Elegí la percepción','err'); return; }
  if(!file){ toast('Elegí el archivo del padrón','err'); return; }
  const info=document.getElementById('pib-info');
  // CUIT → clientes (puede haber más de un cliente con el mismo CUIT)
  const porCuit={};
  (CLIS||[]).forEach(c=>{ const k=_pibCuit(c.CLI_CUIT); if(k.length===11) (porCuit[k]=porCuit[k]||[]).push(c); });
  // El padrón puede ser enorme: se lee de a pedazos y sólo se guardan los CUIT de nuestros clientes
  const enArchivo={};
  let lineas=0, resto='';
  const dec=new TextDecoder('latin1');
  const proc=l=>{
    if(!l) return; lineas++;
    const c=l.split(';');
    const cuit=_pibCuit(c[3]);
    if(porCuit[cuit]) enArchivo[cuit]=_pibNum(c[7]);
  };
  try{
    info.textContent='⏳ Leyendo el archivo…';
    const rd=file.stream().getReader();
    for(;;){
      const { value, done } = await rd.read();
      if(done) break;
      const txt=resto+dec.decode(value,{stream:true});
      const ls=txt.split(/\r?\n/); resto=ls.pop();
      ls.forEach(proc);
      if(lineas%200000<2000) info.textContent=`⏳ Leyendo… ${lineas.toLocaleString('es-AR')} líneas`;
    }
    proc(resto);
  }catch(e){ info.textContent=''; sgvAviso({ titulo:'No se pudo leer el archivo', texto:e.message, tipo:'err' }); return; }

  // Clientes que hoy la tienen + clientes que figuran en el archivo
  const filas=[];
  (CLIS||[]).forEach(c=>{
    const act=_pibPctDe(c,perc), k=_pibCuit(c.CLI_CUIT);
    const enArch = k in enArchivo;
    if(act===null && !enArch) return;
    const nuevo = enArch ? enArchivo[k] : 0;
    filas.push({ cod:(c.CLI_CODIGO||'').trim(), razon:c.CLI_RAZON||'', act, nuevo });
  });
  filas.sort((a,b)=>a.razon.localeCompare(b.razon));
  _pib={ perc, filas, archivo:file.name };
  const camb=filas.filter(_pibCambia).length;
  info.textContent=`${lineas.toLocaleString('es-AR')} líneas leídas · ${filas.length} clientes · ${camb} con cambios`;
  pibPintar();
}

function _pibCambia(f){
  if(f.act===null) return f.nuevo>0;            // alta
  if(f.nuevo===0) return true;                  // baja
  return Math.abs(f.act-f.nuevo)>0.00001;       // cambio de %
}

function pibPintar(){
  const body=document.getElementById('pib-body'); if(!body) return;
  const solo=document.getElementById('pib-solocamb')?.checked;
  const L=_pib.filas.filter(f=>!solo||_pibCambia(f));
  const fmt=v=>v===null?'—':(Number(v)||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:4});
  body.innerHTML = L.length ? L.map(f=>{
    const camb=_pibCambia(f);
    const col = !camb ? 'var(--t3)' : (f.act===null ? 'var(--grn)' : (f.nuevo===0 ? 'var(--red)' : 'var(--wrn,#f59e0b)'));
    const tag = !camb ? '' : (f.act===null ? ' (alta)' : (f.nuevo===0 ? ' (se quita)' : ''));
    return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 110px 110px;gap:8px;padding:4px 14px;border-bottom:1px solid var(--b1);font-size:12px">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span style="font-family:var(--mono);color:var(--acc)">${esc(f.cod)}</span> ${esc(f.razon)}</span>
      <span style="text-align:right;font-family:var(--mono)">${fmt(f.act)}</span>
      <span style="text-align:right;font-family:var(--mono);color:${col};font-weight:${camb?700:400}">${fmt(f.nuevo)}${tag}</span></div>`;
  }).join('') : `<div class="empty">${_pib.filas.length?'No hay cambios':'Elegí la percepción y el archivo, y apretá Procesar'}</div>`;
  const b=document.getElementById('pib-grabar');
  if(b) b.disabled=!_pib.filas.some(_pibCambia);
}

async function pibGrabar(){
  const cambios=_pib.filas.filter(_pibCambia).map(f=>({ cli:f.cod, pct:f.nuevo }));
  if(!cambios.length){ toast('No hay cambios','err'); return; }
  if(!confirm(`¿Actualizar la percepción ${_pib.perc} en ${cambios.length} cliente(s)?\n\nArchivo: ${_pib.archivo}`)) return;
  const b=document.getElementById('pib-grabar'); b.disabled=true; b.textContent='⏳ Grabando…';
  try{
    const r=await apiPost('/clientes/percepciones/aplicar',{ perc:_pib.perc, cambios });
    if(!r.ok){ sgvAviso({ titulo:'No se pudo grabar', texto:r.error||'Error', tipo:'err' }); return; }
    // La memoria de clientes se refresca con lo grabado
    cambios.forEach(c=>{
      const cl=(CLIS||[]).find(x=>(x.CLI_CODIGO||'').trim()===c.cli); if(!cl) return;
      let L=Array.isArray(cl.CLI_PERCEP)?cl.CLI_PERCEP.slice():[];
      const i=L.findIndex(p=>String(p.cod||'').trim()===_pib.perc);
      if(c.pct>0){ if(i>=0) L[i]={...L[i],pct:c.pct}; else L.push({cod:_pib.perc,pct:c.pct}); } else if(i>=0) L.splice(i,1);
      cl.CLI_PERCEP=L;
    });
    sgvAviso({ titulo:'Percepciones actualizadas', tipo:'ok',
      texto:`Agregadas: ${r.agregados} · Cambiadas: ${r.cambiados} · Quitadas: ${r.borrados}`+(r.errores&&r.errores.length?`\n\nErrores:\n${r.errores.join('\n')}`:'') });
    pibCancelar();
  }catch(e){ sgvAviso({ titulo:'No se pudo grabar', texto:e.message, tipo:'err' }); }
  finally{ b.textContent='💾 Grabar'; pibPintar(); }
}

function pibCancelar(){
  _pib={ perc:'', filas:[], archivo:'' };
  const f=document.getElementById('pib-file'); if(f) f.value='';
  const i=document.getElementById('pib-info'); if(i) i.textContent='';
  pibPintar();
}

// ═══════════════════════════════════════════════════════════
// HISTORIA POR ARTÍCULO
// ═══════════════════════════════════════════════════════════

let _histArtCod = '';

function histArtBusq() {
  const q = (document.getElementById('histart-q')?.value||'').toLowerCase().trim();
  const sug = document.getElementById('histart-sug');
  if(!sug) return;
  if(q.length < 2) { sug.style.display='none'; sug.innerHTML=''; return; }
  const matches = ARTS.filter(a =>
    (a.ART_COD||'').toLowerCase().includes(q) ||
    (a.ART_DES||'').toLowerCase().includes(q)
  ).slice(0, 12);
  if(!matches.length) { sug.style.display='none'; return; }
  sug.style.display = 'block';
  sug.innerHTML = matches.map(a =>
    `<div onclick="histArtSeleccionar('${esc(a.ART_COD)}')"
      style="padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--b1);display:flex;gap:10px">
      <span style="font-family:var(--mono);color:var(--acc);flex-shrink:0">${esc(a.ART_COD)}</span>
      <span style="color:var(--t2)">${esc(a.ART_DES||'')}</span>
    </div>`
  ).join('');
}

function histArtSeleccionar(cod) {
  _histArtCod = cod;
  const art = ARTS.find(a=>(a.ART_COD||'').trim()===cod);
  const el = document.getElementById('histart-q');
  if(el) el.value = cod + (art?' — '+art.ART_DES:'');
  const sug = document.getElementById('histart-sug');
  if(sug) { sug.style.display='none'; sug.innerHTML=''; }
  // Mostrar botón X
  const clr = document.getElementById('histart-clr');
  if(clr) clr.style.display='inline';
}

function histArtLimpiar() {
  _histArtCod = '';
  const el = document.getElementById('histart-q');
  if(el) { el.value=''; el.focus(); }
  const clr = document.getElementById('histart-clr');
  if(clr) clr.style.display='none';
  const sug = document.getElementById('histart-sug');
  if(sug) { sug.style.display='none'; sug.innerHTML=''; }
  const body = document.getElementById('histart-body');
  if(body) body.innerHTML='<div class="empty" style="margin-top:40px">Buscá un artículo para ver su historia</div>';
  const tit = document.getElementById('histart-tit');
  if(tit) tit.textContent='📈 Historia por Artículo';
}

// Cerrar sugerencias al hacer click afuera
document.addEventListener('click', e => {
  if(!e.target.closest('#histart-q') && !e.target.closest('#histart-sug')) {
    const sug = document.getElementById('histart-sug');
    if(sug) sug.style.display='none';
  }
});

async function renderHistArt() {
  const cod = _histArtCod || (document.getElementById('histart-q')?.value||'').trim().toUpperCase().split(' ')[0].split('—')[0].trim();
  if(!cod) { toast('Seleccioná un artículo','err'); return; }
  const emp = document.getElementById('histart-empresa')?.value||'';
  const body = document.getElementById('histart-body');
  body.innerHTML = '<div class="empty" style="margin-top:40px">⏳ Cargando...</div>';

  const art = ARTS.find(a=>(a.ART_COD||'').trim()===cod);
  const artDes = art?art.ART_DES:cod;

  // Actualizar título
  const tit = document.getElementById('histart-tit');
  if(tit) tit.textContent = `📈 Historia — ${cod} ${artDes}`;

  try {
    // ── Traer despachos del artículo ──
    const desps = await sbGet('despachos', `dep_art=eq.${encodeURIComponent(cod)}&order=dep_fec.asc`);

    // ── Traer items de facturas del artículo ──
    const hdrs = {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
    const items = [];
    let offset = 0;
    while(true) {
      const r = await fetch(`${SB_URL}/rest/v1/fac_items?ite_art=eq.${encodeURIComponent(cod)}&select=ite_nro,ite_art,ite_can,ite_uni,ite_imp&limit=1000&offset=${offset}`, {headers:hdrs});
      const pg = await r.json();
      if(!pg||!pg.length) break;
      items.push(...pg);
      if(pg.length < 1000) break;
      offset += 1000;
    }
    // Traer facturas correspondientes
    const nros = [...new Set(items.map(i=>i.ite_nro).filter(Boolean))];
    const facsMap = {};
    if(nros.length) {
      // Fetch en lotes de 50
      for(let i=0; i<nros.length; i+=50) {
        const lote = nros.slice(i,i+50).map(n=>`"${n}"`).join(',');
        const rf = await fetch(`${SB_URL}/rest/v1/facturas?fac_nro=in.(${lote})&select=fac_nro,fac_fec,fac_cli`, {headers:hdrs});
        const pf = await rf.json();
        if(pf&&pf.length) pf.forEach(f=>facsMap[f.fac_nro]=f);
      }
    }

    // ── Construir filas unificadas ──
    const filas = [];

    // Despachos
    desps.forEach(d => {
      const empDesp = (d.dep_desp||'').charAt(0).toUpperCase();
      if(emp && empDesp !== emp) return;
      filas.push({
        fec:   d.dep_fec||'',
        comp:  'DESP ' + (d.dep_desp||'') + (d.dep_sub?' '+d.dep_sub:''),
        det:   '',
        ing:   d.dep_ent||0,
        egr:   0,
        imp:   null,
        tipo:  'desp'
      });
    });

    // Ventas
    items.forEach(it => {
      const fac = facsMap[it.ite_nro];
      if(!fac) return;
      const empFac = (fac.fac_nro||'').charAt(0).toUpperCase();
      if(emp && empFac !== emp) return;
      const tipo = saldoClasificar ? saldoClasificar(fac.fac_nro) : ((fac.fac_nro||'').slice(-1).toUpperCase()==='C'?'nc':'fac');
      const esNC = tipo === 'nc';
      const cli = CLIS.find(c=>(c.CLI_CODIGO||'').trim()===(fac.fac_cli||'').trim());
      filas.push({
        fec:  fac.fac_fec||'',
        comp: fac.fac_nro||'',
        det:  cli?cli.CLI_RAZON:fac.fac_cli||'',
        ing:  esNC ? (it.ite_can||0) : 0,
        egr:  esNC ? 0 : (it.ite_can||0),
        imp:  it.ite_uni||0,
        tipo: esNC ? 'nc' : 'fac'
      });
    });

    // Ordenar por fecha
    filas.sort((a,b) => (a.fec||'').localeCompare(b.fec||''));

    if(!filas.length) {
      body.innerHTML = '<div class="empty" style="margin-top:40px">Sin movimientos para este artículo</div>';
      return;
    }

    // Calcular stock acumulado
    let stk = 0;
    filas.forEach(f => { stk += f.ing - f.egr; f.stk = stk; });

    // Render tabla
    const fmtN2 = v => v===0||v===null||v===undefined?'':Number(v).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const fmtFec = s => s?s.substring(0,10).split('-').reverse().join('/'):'—';

    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:var(--s3)">
          <th style="text-align:left;padding:6px 10px;width:90px">Fecha</th>
          <th style="text-align:left;padding:6px 10px;width:160px">Comprobante</th>
          <th style="text-align:left;padding:6px 10px">Detalle</th>
          <th style="text-align:right;padding:6px 8px;width:70px">Ingreso</th>
          <th style="text-align:right;padding:6px 8px;width:70px">Egreso</th>
          <th style="text-align:right;padding:6px 8px;width:70px">Stock</th>
          <th style="text-align:right;padding:6px 8px;width:100px">Importe</th>
        </tr>
      </thead>
      <tbody>`;

    filas.forEach((f,i) => {
      const bg = i%2===0?'':'background:rgba(255,255,255,0.03)';
      const stkColor = f.stk<=0?'color:var(--red)':'color:var(--grn)';
      const compColor = f.tipo==='desp'?'color:var(--acc)':f.tipo==='nc'?'color:var(--red)':'color:var(--txt)';
      html += `<tr style="${bg}">
        <td style="padding:4px 10px;font-family:var(--mono);font-size:11px;color:var(--t2)">${fmtFec(f.fec)}</td>
        <td style="padding:4px 10px;font-family:var(--mono);font-size:11px;${compColor}">${esc(f.comp)}</td>
        <td style="padding:4px 10px;font-size:11px;color:var(--t2)">${esc(f.det)}</td>
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px;color:var(--grn)">${f.ing||''}</td>
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px;color:var(--red)">${f.egr||''}</td>
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px;font-weight:600;${stkColor}">${f.stk}</td>
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px">${f.imp!==null?fmtN2(f.imp):''}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;

  } catch(e) {
    console.error('renderHistArt:', e);
    body.innerHTML = `<div class="empty" style="margin-top:40px;color:var(--red)">Error: ${e.message}</div>`;
  }
}

function printHistArt() {
  const body = document.getElementById('histart-body');
  const table = body.querySelector('table');
  if(!table) { toast('Primero consultá la historia','err'); return; }
  const tit = document.getElementById('histart-tit')?.textContent||'Historia por Artículo';
  const hoy = new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const win = window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${tit}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:9px;color:#000}
    .hdr{display:flex;justify-content:space-between;margin-bottom:4mm}
    .hdr h3{font-size:12px}
    table{width:100%;border-collapse:collapse}
    thead th{background:#000;color:#fff;padding:3px 5px;text-align:right;font-size:9px}
    thead th:nth-child(1),thead th:nth-child(2),thead th:nth-child(3){text-align:left}
    td{padding:2px 5px;border-bottom:1px solid #eee;font-size:9px}
    tr:nth-child(even) td{background:#f9f9f9}
    @media print{@page{margin:8mm}body{margin:0}}
  </style></head><body>
  <div class="hdr"><h3>${tit}</h3><span>${hoy}</span></div>
  ${table.outerHTML}
  </body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),500);
}
function exportHistArt() {
  const body = document.getElementById('histart-body');
  const rowsDivs = body.querySelectorAll('.tbl-body > div');
  if(!rowsDivs.length) { toast('Primero consultá la historia','err'); return; }
  const thSpans = body.querySelectorAll('div[style*="background:var(--s3)"] span');
  const headers = [...thSpans].map(s=>s.textContent.trim());
  const rows = [...rowsDivs].map(div => {
    const spans = div.querySelectorAll('span');
    return [...spans].map(s=>s.textContent.trim());
  });
  const tit = document.getElementById('histart-tit')?.textContent||'Historia';
  exportToXls(tit, headers, rows);
}

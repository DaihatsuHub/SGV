// ═══════════════════════════════════════════════════════════
// SALDOS POR MES — Anticuación de saldos por cliente
// ═══════════════════════════════════════════════════════════

function saldoFmt(v) {
  if(!v || v===0) return '';
  return Math.round(v).toLocaleString('es-AR');
}

function saldoGetMeses(n) {
  const meses = [];
  const now = new Date();
  for(let i=0; i<n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    meses.push({
      anio: d.getFullYear(),
      mes:  d.getMonth()+1,
      label: d.toLocaleString('es-AR',{month:'short'}).toUpperCase().substring(0,3)
    });
  }
  return meses;
}

function saldoClasificar(facNro) {
  const last = (facNro||'').trim().slice(-1).toUpperCase();
  if(last==='R') return 'cheq';
  if(last==='C') return 'nc';
  return 'fac';
}

async function renderSaldos() {
  const body    = document.getElementById('saldo-body');
  const nMeses  = parseInt(document.getElementById('saldo-meses')?.value||3);
  const empFilt = (document.getElementById('saldo-empresa')?.value||'').toUpperCase();
  document.getElementById('saldo-fixed-hdr')?.remove();
  body.innerHTML = '<div class="empty" style="margin-top:40px">⏳ Cargando...</div>';

  try {
    // Paginación automática — Supabase limita a 1000 por request
    const baseUrl = `${SB_URL}/rest/v1/facturas?fac_saldo=gt.0&select=fac_nro,fac_fec,fac_cli,fac_saldo,fac_moneda,fac_vend`;
    const hdrs = {'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
    const facs = [];
    let offset = 0;
    while(true) {
      body.innerHTML = `<div class="empty" style="margin-top:40px">⏳ Cargando... (${facs.length} registros)</div>`;
      const r = await fetch(`${baseUrl}&limit=1000&offset=${offset}`, {headers:hdrs});
      const page = await r.json();
      if(!page||!page.length) break;
      facs.push(...page);
      if(page.length < 1000) break;
      offset += 1000;
    }

    // Filtrar por empresa según primer carácter de fac_nro
    const facsFilt = empFilt
      ? facs.filter(f=>(f.fac_nro||'').trim().toUpperCase().charAt(0)===empFilt)
      : facs;

    if(!facsFilt.length) {
      body.innerHTML = '<div class="empty" style="margin-top:40px">Sin facturas con saldo</div>';
      return;
    }

    const meses   = saldoGetMeses(nMeses);
    const MONEDAS = TABLAS['MONE']||[];
    const monSign = cod => { const m=MONEDAS.find(x=>x.CODIGO===cod); return m?m.STRING1:cod; };

    // Agrupar por cliente + moneda
    const clientes = {};
    facsFilt.forEach(f => {
      const cod = (f.fac_cli||'').trim();
      const mon = f.fac_moneda||'P';
      const key = `${cod}|${mon}`;
      if(!clientes[key]) {
        const cli = (typeof CLIS!=='undefined') ? CLIS.find(c=>(c.CLI_CODIGO||'').trim()===cod) : null;
        clientes[key] = {
          cod, mon,
          razon: cli?.CLI_RAZON||cod,
          vend:  (cli?.CLI_VEND||f.fac_vend||'').trim(),
          mes:   Array(nMeses).fill(0),
          otros: 0,
          total: 0,
          cheq:  0
        };
      }
      const fecDate = f.fac_fec ? new Date(f.fac_fec) : null;
      const fecAnio = fecDate ? fecDate.getFullYear() : 0;
      const fecMes  = fecDate ? fecDate.getMonth()+1  : 0;
      const tipo    = saldoClasificar(f.fac_nro);
      const saldo   = f.fac_saldo||0;

      if(tipo==='cheq') {
        clientes[key].cheq += saldo;
        return;
      }

      const importe = tipo==='nc' ? -saldo : saldo;

      let encontrado = false;
      meses.forEach((m,i) => {
        if(fecAnio===m.anio && fecMes===m.mes) {
          clientes[key].mes[i] += importe;
          clientes[key].total  += importe;
          encontrado = true;
        }
      });
      if(!encontrado) {
        clientes[key].otros += importe;
        clientes[key].total += importe;
      }
    });

    // Ordenar por vendedor + razón social
    const lista = Object.values(clientes)
      .filter(r => r.total!==0 || r.cheq!==0 || r.otros!==0)
      .sort((a,b) => {
        const v = (a.vend||'').localeCompare(b.vend||'');
        return v!==0 ? v : (a.razon||'').localeCompare(b.razon||'');
      });

    if(!lista.length) {
      body.innerHTML = '<div class="empty" style="margin-top:40px">Sin saldos</div>';
      return;
    }

    const thMeses = meses.map(m=>`<th style="text-align:right;padding:6px 8px;min-width:85px">${m.label}</th>`).join('');
    const hoy = new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});

    // Actualizar título en toolbar
    const salTit = document.getElementById('saldo-tit');
    if(salTit) salTit.textContent = `📊 Saldos por Mes — ${hoy}`;
    body.innerHTML = '';

    const NCOLS = 4 + nMeses + 2;

    // Encabezado fijo duplicado con position:fixed
    const pageHdr = document.querySelector('#page-saldo .page-hdr');
    const hdrTop = pageHdr ? (pageHdr.getBoundingClientRect().bottom) : 96;
    const fixedHdr = document.createElement('div');
    fixedHdr.id = 'saldo-fixed-hdr';
    fixedHdr.style.cssText = `position:fixed;top:${hdrTop}px;left:0;right:0;z-index:100;overflow:hidden;pointer-events:none`;
    fixedHdr.innerHTML = `<table id="saldo-fixed-table" style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed">
      <thead>
        <tr style="background:var(--s3)">
          <th style="text-align:left;padding:6px 10px;width:75px">Código</th>
          <th style="text-align:left;padding:6px 10px">Razón Social</th>
          <th style="text-align:center;padding:6px 6px;width:35px">Mon</th>
          ${thMeses}
          <th style="text-align:right;padding:6px 8px;min-width:85px">Otros</th>
          <th style="text-align:right;padding:6px 8px;min-width:90px;border-left:2px solid var(--acc)">Total</th>
          <th style="text-align:right;padding:6px 8px;min-width:80px">Cheq.</th>
        </tr>
      </thead>
    </table>`;
    // Quitar anterior si existe
    document.getElementById('saldo-fixed-hdr')?.remove();
    document.body.appendChild(fixedHdr);
    // Sincronizar anchos cuando la tabla principal esté en el DOM
    setTimeout(()=>{
      const mainTable = document.querySelector('#saldo-body table');
      const fixedTable = document.getElementById('saldo-fixed-table');
      if(mainTable && fixedTable) {
        const mainW = mainTable.getBoundingClientRect().width;
        fixedTable.style.width = mainW + 'px';
        fixedTable.style.marginLeft = mainTable.getBoundingClientRect().left + 'px';
      }
    }, 100);

    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:var(--s3)">
          <th style="text-align:left;padding:6px 10px;width:75px">Código</th>
          <th style="text-align:left;padding:6px 10px">Razón Social</th>
          <th style="text-align:center;padding:6px 6px;width:35px">Mon</th>
          ${thMeses}
          <th style="text-align:right;padding:6px 8px;min-width:85px">Otros</th>
          <th style="text-align:right;padding:6px 8px;min-width:90px;border-left:2px solid var(--acc)">Total</th>
          <th style="text-align:right;padding:6px 8px;min-width:80px">Cheq.</th>
        </tr>
      </thead>
      <tbody>`;

    let lastVend = null;
    let rowToggle = false;
    let lastCod = null;

    lista.forEach(r => {
      if(r.vend !== lastVend) {
        if(lastVend !== null) {
          html += `<tr><td colspan="${NCOLS}" style="background:#1a6be0;height:4px;padding:0"></td></tr>`;
        }
        const vObj = (TABLAS['VEND']||[]).find(v=>v.CODIGO===r.vend);
        const vLabel = vObj ? `${vObj.CODIGO} — ${vObj.DETALLE}` : (r.vend||'Sin vendedor asignado');
        html += `<tr><td colspan="${NCOLS}" style="padding:6px 10px;font-size:12px;font-weight:700;color:var(--acc);font-family:var(--mono);background:var(--s3);border-top:3px solid #1a6be0">${esc(vLabel)}</td></tr>`;
        lastVend = r.vend;
        rowToggle = false;
        lastCod = null;
      }

      if(r.cod !== lastCod) {
        rowToggle = !rowToggle;
        lastCod = r.cod;
      }
      const bg = rowToggle ? 'background:rgba(255,255,255,0.06)' : 'background:rgba(0,0,0,0.12)';

      const mesCols = r.mes.map(v=>`<td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px;color:${v<0?'var(--red)':''}">${saldoFmt(v)}</td>`).join('');

      html += `<tr style="${bg}">
        <td style="padding:4px 10px;font-family:var(--mono);font-size:11px;color:var(--acc)">${esc(r.cod)}</td>
        <td style="padding:4px 10px;font-size:12px">${esc(r.razon)}</td>
        <td style="text-align:center;padding:4px 6px;font-family:var(--mono);font-size:10px;color:var(--t3)">${esc(monSign(r.mon))}</td>
        ${mesCols}
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px;color:${r.otros<0?'var(--red)':''}">${saldoFmt(r.otros)}</td>
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:12px;font-weight:700;color:${r.total<0?'var(--red)':'var(--txt)'};border-left:2px solid var(--acc)">${saldoFmt(r.total)}</td>
        <td style="text-align:right;padding:4px 8px;font-family:var(--mono);font-size:11px;color:var(--red)">${saldoFmt(r.cheq)}</td>
      </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;

  } catch(e) {
    console.error('renderSaldos:', e);
    body.innerHTML = `<div class="empty" style="margin-top:40px;color:var(--red)">Error: ${e.message}</div>`;
  }
}

function printSaldos() {
  const body = document.getElementById('saldo-body');
  const table = body.querySelector('table');
  if(!table) { toast('Primero consultá los saldos','err'); return; }
  const hoy = new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const win = window.open('','_blank','width=1100,height=700');
  const t = table.cloneNode(true);
  let tog=false, lastC='';
  t.querySelectorAll('tbody tr').forEach(tr=>{
    if(tr.querySelector('td[colspan]')) return;
    const cod = tr.querySelector('td:first-child')?.textContent?.trim()||'';
    if(cod && cod!==lastC){tog=!tog;lastC=cod;}
    tr.setAttribute('data-bg', tog?'on':'off');
  });
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Saldos por Mes</title><style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Arial,sans-serif;font-size:9px;color:#000}' +
    '.hdr{display:flex;justify-content:space-between;margin-bottom:3mm}' +
    '.hdr h3{font-size:12px}' +
    'table{width:100%;border-collapse:collapse}' +
    'thead th{background:#000;color:#fff;padding:3px 5px;text-align:right;font-size:9px}' +
    'thead th:nth-child(1),thead th:nth-child(2){text-align:left}' +
    'td{padding:2px 5px;border-bottom:1px solid #eee;font-size:9px}' +
    'tr[data-bg="on"] td{background:#eef2ff}' +
    'tr[data-bg="off"] td{background:#fff}' +
    'tr.sep-vend td{background:#000!important;height:4px;padding:0;border:none}' +
    'tr td[colspan]{background:#ddd!important;font-weight:700;font-size:10px;padding:4px 5px;border-top:3px solid #000}' +
    '@media print{@page{margin:8mm}body{margin:0}}' +
    '</style></head><body>' +
    '<div class="hdr"><h3>Saldos por Mes — ' + hoy + '</h3><span id="pnum" style="font-size:9px;color:#555"></span></div>' +
    t.outerHTML +
    '<script>window.onbeforeprint=function(){document.getElementById("pnum").textContent="Hoja: 1";};<\/script>' +
    '</body></html>');
  win.document.close();
  setTimeout(()=>win.print(),600);
}

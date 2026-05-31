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
  // Devuelve: 'fac'=factura/debito, 'nc'=nota credito, 'cheq'=cheque rechazado
  const last = (facNro||'').slice(-1).toUpperCase();
  if(last==='R') return 'cheq';
  if(last==='C') return 'nc';
  return 'fac';
}

async function renderSaldos() {
  const body    = document.getElementById('saldo-body');
  const nMeses  = parseInt(document.getElementById('saldo-meses')?.value||3);
  const empFilt = document.getElementById('saldo-empresa')?.value||'';
  body.innerHTML = '<div class="empty" style="margin-top:40px">⏳ Cargando...</div>';

  try {
    let url = `${SB_URL}/rest/v1/facturas?fac_saldo=gt.0&select=fac_nro,fac_fec,fac_cli,fac_saldo,fac_moneda,fac_empresa,fac_vend&limit=10000`;
    if(empFilt) url += `&fac_empresa=eq.${empFilt}`;
    const resp = await fetch(url, {headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});
    const facs = await resp.json();

    if(!facs||!facs.length) {
      body.innerHTML = '<div class="empty" style="margin-top:40px">Sin facturas con saldo</div>';
      return;
    }

    const meses   = saldoGetMeses(nMeses);
    const MONEDAS = TABLAS['MONE']||[];
    const monSign = cod => { const m=MONEDAS.find(x=>x.CODIGO===cod); return m?m.STRING1:cod; };

    // Agrupar por cliente + moneda
    const clientes = {};
    facs.forEach(f => {
      const cod = (f.fac_cli||'').trim();
      const mon = f.fac_moneda||'P';
      const key = `${cod}|${mon}`;
      if(!clientes[key]) {
        const cli = (typeof CLIS!=='undefined') ? CLIS.find(c=>(c.CLI_CODIGO||'').trim()===cod) : null;
        clientes[key] = {
          cod, mon,
          razon: cli?.CLI_RAZON||cod,
          vend:  cli?.CLI_VEND||f.fac_vend||'',
          mes:   Array(nMeses).fill(0),  // meses[0]=actual, meses[1]=anterior...
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
      const signo   = tipo==='nc' ? -1 : 1;
      const importe = saldo * signo;

      if(tipo==='cheq') {
        clientes[key].cheq += saldo;
        return;
      }

      // Buscar en qué mes cae
      let encontrado = false;
      meses.forEach((m,i) => {
        if(fecAnio===m.anio && fecMes===m.mes) {
          clientes[key].mes[i] += importe;
          clientes[key].total  += importe;
          encontrado = true;
        }
      });
      if(!encontrado) {
        // Va a OTROS (más antiguo que los meses mostrados)
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

    // Encabezados de columnas de meses
    const thMeses = meses.map(m=>`<th style="text-align:right;padding:6px 8px;min-width:85px">${m.label}</th>`).join('');

    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:var(--s3);position:sticky;top:0;z-index:2">
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

    lista.forEach((r,i) => {
      // Separador + cabecera de vendedor
      if(r.vend !== lastVend) {
        if(lastVend !== null) {
          html += `<tr><td colspan="${4+nMeses+2}" style="background:#000;height:3px;padding:0"></td></tr>`;
        }
        const vObj = (TABLAS['VEND']||[]).find(v=>v.CODIGO===r.vend);
        const vLabel = vObj ? `${vObj.CODIGO} — ${vObj.DETALLE}` : (r.vend||'Sin vendedor asignado');
        html += `<tr style="background:var(--s2)"><td colspan="${4+nMeses+2}" style="padding:5px 10px;font-size:11px;font-weight:700;color:var(--acc);font-family:var(--mono);letter-spacing:1px">${esc(vLabel)}</td></tr>`;
        lastVend = r.vend;
        rowToggle = false;
        lastCod = null;
      }

      // Alternar fondo por cliente
      if(r.cod !== lastCod) {
        rowToggle = !rowToggle;
        lastCod = r.cod;
      }
      const bg = rowToggle ? 'background:rgba(255,255,255,0.03)' : '';

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
  const win = window.open('','_blank','width=1100,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Saldos por Mes</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:9px;color:#000}
  h3{margin-bottom:4mm;font-size:12px}
  table{width:100%;border-collapse:collapse}
  th{background:#000;color:#fff;padding:3px 5px}
  th:first-child,th:nth-child(2){text-align:left}
  th{text-align:right}
  td{padding:2px 5px;border-bottom:1px solid #eee}
  .sep td{background:#000;height:2px;padding:0}
  .vend td{background:#ddd;font-weight:700;font-size:10px;padding:3px 5px}
  @media print{@page{margin:8mm}}
</style>
</head><body>
<h3>Saldos por Mes</h3>
${table.outerHTML}
</body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

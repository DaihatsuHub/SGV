// ═══════════════════════════════════════════════════════════
// SALDOS POR MES — Anticuación de saldos por cliente
// ═══════════════════════════════════════════════════════════

let _saldoLista = [], _saldoMeses = [], _saldoMonSign = c=>c;

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
    // Paginación automática — el server limita a 1000 por request
    const baseRead = `/read/facturas?fac_saldo=gt.0&select=fac_nro,fac_fec,fac_cli,fac_saldo,fac_moneda,fac_vend`;
    const facs = [];
    let offset = 0;
    while(true) {
      body.innerHTML = `<div class="empty" style="margin-top:40px">⏳ Cargando... (${facs.length} registros)</div>`;
      const res = await apiGet(`${baseRead}&limit=1000&offset=${offset}`);
      const page = res.rows || [];
      if(!page.length) break;
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

    // Encabezado en div fijo (como th-art en maestros)
    const thHdr = document.getElementById('saldo-hdr');
    if(thHdr) {
      thHdr.style.cssText = 'display:flex;background:var(--s3);font-family:var(--mono);font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid var(--b1)';
      thHdr.innerHTML =
        '<span style="flex:0 0 75px;padding:8px 10px">Código</span>' +
        '<span style="flex:1;padding:8px 10px">Razón Social</span>' +
        '<span style="flex:0 0 35px;padding:8px 6px;text-align:center">Mon</span>' +
        meses.map(m=>'<span style="flex:0 0 85px;padding:8px 8px;text-align:right">'+m.label+'</span>').join('') +
        '<span style="flex:0 0 85px;padding:8px 8px;text-align:right">Antes</span>' +
        '<span style="flex:0 0 90px;padding:8px 8px;text-align:right;border-left:2px solid var(--acc)">Total</span>' +
        '<span style="flex:0 0 80px;padding:8px 8px;text-align:right">Cheq.</span>';
    }

    _saldoLista = lista; _saldoMeses = meses; _saldoMonSign = monSign;

    let html = '';
    let lastVend = null;
    let rowToggle = false;
    let lastCod = null;

    lista.forEach(r => {
      if(r.vend !== lastVend) {
        if(lastVend !== null) {
          html += '<div style="height:3px;background:#1a6be0;margin:0"></div>';
        }
        const vObj = (TABLAS['VEND']||[]).find(v=>v.CODIGO===r.vend);
        const vLabel = vObj ? vObj.CODIGO+' — '+vObj.DETALLE : (r.vend||'Sin vendedor asignado');
        html += '<div style="padding:6px 10px;font-size:12px;font-weight:700;color:var(--acc);font-family:var(--mono);background:var(--s3);border-top:3px solid #1a6be0">'+esc(vLabel)+'</div>';
        lastVend = r.vend;
        rowToggle = false;
        lastCod = null;
      }
      if(r.cod !== lastCod) { rowToggle=!rowToggle; lastCod=r.cod; }
      const bg = rowToggle ? 'background:rgba(255,255,255,0.04)' : '';
      const mesCols = r.mes.map(v=>'<span style="flex:0 0 85px;text-align:right;padding:5px 8px;font-family:var(--mono);font-size:11px;color:'+(v<0?'var(--red)':'')+'">'+saldoFmt(v)+'</span>').join('');
      html += '<div style="display:flex;align-items:center;border-bottom:1px solid var(--b1);'+bg+'">' +
        '<span style="flex:0 0 75px;padding:5px 10px;font-family:var(--mono);font-size:11px;color:var(--acc)">'+esc(r.cod)+'</span>' +
        '<span style="flex:1;padding:5px 10px;font-size:12px">'+esc(r.razon)+'</span>' +
        '<span style="flex:0 0 35px;padding:5px 6px;text-align:center;font-family:var(--mono);font-size:10px;color:var(--t3)">'+esc(monSign(r.mon))+'</span>' +
        mesCols +
        '<span style="flex:0 0 85px;text-align:right;padding:5px 8px;font-family:var(--mono);font-size:11px;color:'+(r.otros<0?'var(--red)':'')+'">'+saldoFmt(r.otros)+'</span>' +
        '<span style="flex:0 0 90px;text-align:right;padding:5px 8px;font-family:var(--mono);font-size:12px;font-weight:700;color:'+(r.total<0?'var(--red)':'var(--txt)')+';border-left:2px solid var(--acc)">'+saldoFmt(r.total)+'</span>' +
        '<span style="flex:0 0 80px;text-align:right;padding:5px 8px;font-family:var(--mono);font-size:11px;color:var(--red)">'+saldoFmt(r.cheq)+'</span>' +
      '</div>';
    });

    body.innerHTML = html;

  } catch(e) {
    console.error('renderSaldos:', e);
    body.innerHTML = `<div class="empty" style="margin-top:40px;color:var(--red)">Error: ${e.message}</div>`;
  }
}

// La pantalla arma el listado con divs, así que la impresión se construye
// desde los datos guardados (_saldoLista), no leyendo el DOM.
function printSaldos() {
  if(!_saldoLista.length){ toast('Primero consultá los saldos','err'); return; }
  const hoy = new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
  const nM = _saldoMeses.length;
  const _e = (typeof esc==='function') ? esc : (x=>String(x==null?'':x));

  let cuerpo = '', lastVend = null;
  const T = { mes:Array(nM).fill(0), otros:0, total:0, cheq:0 };
  const V = () => ({ mes:Array(nM).fill(0), otros:0, total:0, cheq:0 });
  let sub = V();

  const filaSub = etiqueta => `<tr class="tot"><td colspan="3">${etiqueta}</td>`+
    sub.mes.map(v=>`<td class="n">${saldoFmt(v)}</td>`).join('')+
    `<td class="n">${saldoFmt(sub.otros)}</td><td class="n">${saldoFmt(sub.total)}</td><td class="n">${saldoFmt(sub.cheq)}</td></tr>`;

  _saldoLista.forEach(r => {
    if(r.vend !== lastVend){
      if(lastVend !== null){ cuerpo += filaSub('Subtotal vendedor'); sub = V(); }
      const vObj = (TABLAS['VEND']||[]).find(v=>v.CODIGO===r.vend);
      const vLabel = vObj ? vObj.CODIGO+' — '+vObj.DETALLE : (r.vend||'Sin vendedor asignado');
      cuerpo += `<tr class="grp"><td colspan="${3+nM+3}">${_e(vLabel)}</td></tr>`;
      lastVend = r.vend;
    }
    r.mes.forEach((v,i)=>{ sub.mes[i]+=v; T.mes[i]+=v; });
    sub.otros+=r.otros; sub.total+=r.total; sub.cheq+=r.cheq;
    T.otros+=r.otros;   T.total+=r.total;   T.cheq+=r.cheq;
    cuerpo += `<tr><td>${_e(r.cod)}</td><td>${_e(sgvCorta(r.razon))}</td><td>${_e(_saldoMonSign(r.mon))}</td>`+
      r.mes.map(v=>`<td class="n">${saldoFmt(v)}</td>`).join('')+
      `<td class="n">${saldoFmt(r.otros)}</td><td class="n"><b>${saldoFmt(r.total)}</b></td><td class="n">${saldoFmt(r.cheq)}</td></tr>`;
  });
  if(lastVend !== null) cuerpo += filaSub('Subtotal vendedor');

  const cab = `<tr><th>Cód</th><th>Razón Social</th><th>Mon</th>`+
    _saldoMeses.map(m=>`<th class="n">${m.label}</th>`).join('')+
    `<th class="n">Antes</th><th class="n">Total</th><th class="n">Cheq.</th></tr>`;
  const totGral = `<tr class="fin"><td colspan="3"><b>TOTAL GENERAL</b></td>`+
    T.mes.map(v=>`<td class="n"><b>${saldoFmt(v)}</b></td>`).join('')+
    `<td class="n"><b>${saldoFmt(T.otros)}</b></td><td class="n"><b>${saldoFmt(T.total)}</b></td><td class="n"><b>${saldoFmt(T.cheq)}</b></td></tr>`;

  sgvPrint({
    titulo:'Saldos por Mes',
    subtitulo:`Daihatsu Electronics — ${hoy} · ${_saldoLista.length} cliente(s)`,
    estilos:`tr.grp td{background:#dde3ea !important;font-weight:bold;border-top:2px solid #8a9099}`,
    cuerpo:`<table><thead>${cab}</thead><tbody>${cuerpo}${totGral}</tbody></table>`
  });
}

/* ===========================================================================
   REMITO PREIMPRESO  (Facturación → detalle → 🚚 Remito)   — Ricardo, Nov 2026
   - Popup: CAJAS (cantidad) y VALOR DECLARADO (se ofrece el importe en pesos
     SIN IVA NI PERCEPCIONES, se puede cambiar).
   - Se imprime sobre el remito PREIMPRESO (A4): el número ya viene impreso,
     sólo se completan los datos. Transporte con NOMBRE y DIRECCIÓN.
     "FACTURA N.°" sólo si el comprobante es CONTABLE.
   - Las posiciones (en mm) están estimadas sobre el modelo. Para calibrar la
     impresora hay un AJUSTE general X/Y en mm, que queda guardado en la PC.
   =========================================================================== */

// Posiciones en mm desde el borde superior izquierdo de la hoja A4
const REM_POS = {
  fecha:    { x:188, y:25 },      // +4 cm (prueba 05/11)
  razon:    { x:29,  y:51 },
  domic:    { x:29,  y:59 },
  local:    { x:29,  y:63 },
  provin:   { x:34,  y:67 },
  iva:      { x:181, y:50 },      // +5 cm
  cuit:     { x:186, y:58 },      // +5 cm
  transp:   { x:30,  y:75 },     // TRANSPORTE: nombre — dirección
  // +4 renglones; descripción +2 caracteres; código y despacho +12 (1 caracter ≈ 2,33 mm)
  items:    { y:105.4, alto:4.6, max:20, can:{x:33}, des:{x:41.7}, cod:{x:138}, desp:{x:166} },
  cajas:    { x:66,  y:209 },
  valor:    { x:66,  y:215 },
  factura:  { x:66,  y:221 },
  piezas:   { x:33,  y:236 },
  origen:   { x:61,  y:236 },
  aduana:   { x:61,  y:240 },
  leyenda:  { x:105, y:236 },     // en el renglón de las piezas
  web:      { x:105, y:240 }
};
const REM_LEYENDA = 'Distribuidor oficial de calculadoras Casio';

// Número en letras (enteros), para "2 (DOS) CAJAS" y "$ 100.000 (CIEN MIL)"
function remLetras(n){
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return 'CERO';
  const U = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE',
             'DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDOS','VEINTITRES','VEINTICUATRO',
             'VEINTICINCO','VEINTISEIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  const D = ['','','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  const C = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  const menor1000 = x => {
    if (x === 100) return 'CIEN';
    const c = Math.floor(x / 100), r = x % 100;
    const dec = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : '');
    return [C[c], dec].filter(Boolean).join(' ');
  };
  const partes = [];
  const mill = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
  if (mill) partes.push(mill === 1 ? 'UN MILLON' : menor1000(mill).replace(/UNO$/, 'UN') + ' MILLONES');
  if (miles) partes.push(miles === 1 ? 'MIL' : menor1000(miles).replace(/UNO$/, 'UN') + ' MIL');
  if (resto) partes.push(menor1000(resto));
  return partes.join(' ');
}

function _remAjuste(){ try { return JSON.parse(localStorage.getItem('sgv_rem_ajuste') || '{}'); } catch(_) { return {}; } }
function _remGuardarAjuste(a){ try { localStorage.setItem('sgv_rem_ajuste', JSON.stringify(a)); } catch(_) {} }

async function remAbrir(facNro){
  try {
    // Datos FRESCOS del server (regla de SGV)
    const fr = await sbGet('facturas', 'fac_nro=eq.' + encodeURIComponent(facNro));
    const f = fr && fr[0]; if (!f) { toast('No se encontró el comprobante','err'); return; }
    const items = (await sbLoadItemsFac(f.fac_nro)) || [];
    const nro = String(f.fac_nro).trim();
    const ct = (CTIPS||[]).find(c => c.prefijo === nro.substring(0,3) && c.tipo === nro.slice(-1));
    const contable = !!(ct && ct.contable);
    // Valor declarado sugerido: en pesos, sin IVA ni percepciones
    let valor;
    if (contable && Number(f.fac_neto_afip) > 0) valor = Number(f.fac_neto_afip);
    else {
      const cot = Number(f.fac_cotiz) || 1;
      valor = items.reduce((t, i) => t + (Number(i.ite_uni)||0) * (Number(i.ite_can)||0) * cot / (1 + (Number(i.ite_iva_porc) || 21)/100), 0);
    }
    valor = Math.round(valor);
    const aj = _remAjuste();
    document.getElementById('rem-modal')?.remove();
    const m = document.createElement('div'); m.id = 'rem-modal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = `<div style="background:var(--s1);border:1px solid var(--b1);border-radius:12px;width:100%;max-width:420px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
      <div style="background:var(--acc);color:#fff;padding:12px 18px;font-size:15px;font-weight:600">🚚 Remito · ${esc(nro)}</div>
      <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:10px">
          <div style="flex:0 0 110px"><label class="flbl2">Cajas</label>
            <input id="rem-cajas" class="finp" type="number" min="1" step="1" value="1" style="width:100%;text-align:right"></div>
          <div style="flex:1"><label class="flbl2">Valor declarado $ (sin IVA ni percep.)</label>
            <input id="rem-valor" class="finp" type="number" min="0" step="1" value="${valor}" style="width:100%;text-align:right"></div>
        </div>
        <div style="font-size:11px;color:var(--t2)">${contable ? 'Lleva el número de factura.' : 'Comprobante no contable: no lleva número de factura.'}</div>
        <details style="font-size:11px;color:var(--t2)"><summary style="cursor:pointer">Ajuste de impresión (mm)</summary>
          <div style="display:flex;gap:10px;margin-top:6px;align-items:center">
            ← → <input id="rem-ajx" class="finp" type="number" step="0.5" value="${Number(aj.x)||0}" style="width:70px;text-align:right">
            ↑ ↓ <input id="rem-ajy" class="finp" type="number" step="0.5" value="${Number(aj.y)||0}" style="width:70px;text-align:right">
            <span>positivo = a la derecha / hacia abajo</span>
          </div></details>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding:0 18px 16px">
        <button class="btn" onclick="document.getElementById('rem-modal').remove()">Cancelar</button>
        <button class="btn pri" id="rem-ok">🖨 Imprimir remito</button>
      </div></div>`;
    document.body.appendChild(m);
    m.addEventListener('keydown', e => { if (e.key === 'Escape') m.remove(); });
    m.querySelector('#rem-ok').onclick = () => {
      const cajas = parseInt(document.getElementById('rem-cajas').value, 10) || 0;
      const val = Math.round(Number(document.getElementById('rem-valor').value) || 0);
      if (cajas <= 0) { toast('Indicá la cantidad de cajas','err'); return; }
      const ajuste = { x: Number(document.getElementById('rem-ajx').value) || 0, y: Number(document.getElementById('rem-ajy').value) || 0 };
      _remGuardarAjuste(ajuste);
      m.remove();
      remImprimir(f, items, { cajas, valor: val, contable, ajuste });
    };
    setTimeout(() => { const c = document.getElementById('rem-cajas'); c?.focus(); c?.select(); }, 50);
  } catch (e) { console.error('remAbrir:', e); toast('No se pudo armar el remito: ' + e.message, 'err'); }
}

async function remImprimir(f, items, o){
  const P = REM_POS, ax = o.ajuste.x || 0, ay = o.ajuste.y || 0;
  const cli = (CLIS||[]).find(c => (c.CLI_CODIGO||'').trim() === (f.fac_cli||'').trim()) || {};
  const tr = (TABLAS['EXPR']||[]).find(e => e.CODIGO === (f.fac_transp||'').trim());
  const ivaTxt = (typeof IVA_DESC !== 'undefined' && IVA_DESC[(f.fac_tiva || cli.CLI_IVA || '').trim()]) || (f.fac_tiva || cli.CLI_IVA || '');
  const pcia = (typeof PCIA !== 'undefined' ? PCIA[cli.CLI_PROVIN] : '') || cli.CLI_PROVIN || '';
  // Origen y aduana: del despacho de los renglones
  const depIds = [...new Set(items.map(i => i.ite_dep_id).filter(Boolean))];
  let desps = [];
  try { if (depIds.length) desps = await sbGet('despachos', `dep_id=in.(${depIds.join(',')})&select=dep_id,dep_proc,dep_adua`) || []; } catch(_) {}
  const uniq = k => [...new Set(desps.map(d => (d[k]||'').trim()).filter(Boolean))].join(' / ');
  const fecha = (() => { const p = (f.fac_fec||'').substring(0,10).split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : ''; })();
  const piezas = items.reduce((t, i) => t + (Number(i.ite_can) || 0), 0);
  const fmtMil = n => Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const t = (pos, txt, extra) => `<div class="c" style="left:${pos.x + ax}mm;top:${pos.y + ay}mm;${extra||''}">${esc(String(txt||''))}</div>`;

  let html = '';
  html += t(P.fecha, fecha);
  // Razón social en negrita y más grande, con el código de cliente a continuación
  html += `<div class="c" style="left:${P.razon.x + ax}mm;top:${P.razon.y - 1 + ay}mm"><b style="font-size:13pt">${esc(cli.CLI_RAZON || f.fac_cli || '')}</b> ( ${esc((f.fac_cli||'').trim())})</div>`;
  html += t(P.domic, cli.CLI_DOMIC);
  html += t(P.local, [cli.CLI_CODPOS ? '(' + String(cli.CLI_CODPOS).trim() + ')' : '', (cli.CLI_LOCAL||'').trim()].filter(Boolean).join('-'));
  html += t(P.provin, pcia);
  html += t(P.iva, ivaTxt);
  html += t(P.cuit, cli.CLI_CUIT);
  html += t(P.transp, 'TRANSPORTE: ' + (tr ? [tr.DETALLE, tr.STRING1].filter(x => (x||'').trim()).join(' — ') : (f.fac_transp||'')));
  items.slice(0, P.items.max).forEach((it, i) => {
    const y = P.items.y + i * P.items.alto;
    html += t({ x: P.items.can.x - 12, y }, it.ite_can, 'width:12mm;text-align:right');
    const art = (ARTS||[]).find(x => (x.ART_COD||'').trim() === (it.ite_art||'').trim());
    html += t({ x: P.items.des.x, y }, art ? art.ART_DES : '', 'max-width:70mm;overflow:hidden;white-space:nowrap');
    html += t({ x: P.items.cod.x, y }, (it.ite_art||'').trim());
    html += t({ x: P.items.desp.x, y }, (it.ite_desp||'').trim());
  });
  html += t(P.cajas, `•  ${o.cajas} (${remLetras(o.cajas)}) CAJA${o.cajas === 1 ? '' : 'S'}`, 'font-family:Arial,sans-serif;font-weight:bold;font-size:13pt');
  html += t(P.valor, `•  VALOR DECLARADO: $ ${fmtMil(o.valor)}`, 'font-family:Arial,sans-serif;font-weight:bold;font-size:13pt');
  if (o.contable) html += t(P.factura, `•  FACTURA N.° ${String(f.fac_nro).trim()}`, 'font-family:Arial,sans-serif;font-weight:bold;font-size:13pt');
  html += t(P.piezas, `${piezas} Piezas`);
  if (uniq('dep_proc')) html += t(P.origen, 'Origen: ' + uniq('dep_proc'));
  if (uniq('dep_adua')) html += t(P.aduana, 'Aduana: ' + uniq('dep_adua'));
  html += t(P.leyenda, REM_LEYENDA);
  html += t(P.web, String(f.fac_nro||'').trim().charAt(0).toUpperCase() === 'T' ? 'www.tressa.com.ar' : 'www.daihatsu.com.ar');
  if (items.length > P.items.max) toast(`El remito tiene lugar para ${P.items.max} renglones: van los primeros`, 'err');

  const w = window.open('', '_blank');
  if (!w) { toast('El navegador bloqueó la ventana de impresión','err'); return; }
  w.document.write(`<html><head><meta charset="utf-8"><title>Remito ${esc(String(f.fac_nro).trim())}</title>
    <style>@page{size:210mm 297mm;margin:0} html,body{margin:0;padding:0;width:210mm;height:297mm}
      body{position:relative;font-family:"Courier New",Courier,monospace;font-size:11pt;color:#000}
      .c{position:absolute;white-space:nowrap;line-height:1}</style></head>
    <body>${html}<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script></body></html>`);
  w.document.close(); w.focus();
}

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
// 1 caracter (Courier 11pt) ≈ 2,33 mm. Ajustes de las pruebas del 05/11.
const REM_CH = 2.33;
const REM_RG = 4.23;   // 1 renglón (6 por pulgada)
// Ajustes de las pruebas del 11/11: encabezado -5, cantidad -3, descripción -4
// (condensada), código -10, despacho -15; pie -3 y 5 renglones abajo; cajas -6
// y 6 renglones abajo, con el valor declarado en el mismo renglón.
const REM_POS = {
  fecha:    { x:188 - 10*REM_CH, y:25 },
  razon:    { x:29  - 10*REM_CH, y:51 },
  domic:    { x:29  - 10*REM_CH, y:59 },
  local:    { x:29  - 10*REM_CH, y:63 },     // la provincia va en este mismo renglón
  iva:      { x:181 - 10*REM_CH, y:50 },
  cuit:     { x:186 - 10*REM_CH, y:58 },
  transp:   { x:30  - 10*REM_CH, y:75 },     // TRANSPORTE: nombre — dirección
  items:    { y:105.4, alto:4.6, max:20, desMax:45,
              can:{x:33 - 5*REM_CH}, des:{x:41.7 - 6*REM_CH}, cod:{x:138 - 19*REM_CH}, desp:{x:166 - 24*REM_CH} },
  cajas:    { x:66  - 8*REM_CH, y:209 + 6*REM_RG },   // + valor declarado en el mismo renglón
  factura:  { x:66  - 8*REM_CH, y:215 + 6*REM_RG },
  piezas:   { x:33  - 5*REM_CH, y:236 + 5*REM_RG },
  origen:   { x:61  - 5*REM_CH, y:236 + 5*REM_RG },
  aduana:   { x:61  - 5*REM_CH, y:240 + 5*REM_RG },
  leyenda:  { x:105 - 5*REM_CH, y:236 + 5*REM_RG },
  web:      { x:105 - 5*REM_CH, y:240 + 5*REM_RG }
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

function _remCopias(){ try { return parseInt(localStorage.getItem('sgv_rem_copias'), 10) || 2; } catch(_) { return 2; } }

// Valor declarado con separador de miles mientras se escribe
const _remMiles = n => (Math.round(Number(n) || 0)).toLocaleString('es-AR');
const _remNum = v => parseInt(String(v || '').replace(/\D/g, ''), 10) || 0;
function _remValorInput(el){
  const n = _remNum(el.value);
  el.value = n ? _remMiles(n) : '';
  el.setSelectionRange(el.value.length, el.value.length);
}

// Renglones repartidos en remitos de P.items.max renglones
function remTramos(items){
  const max = REM_POS.items.max, out = [];
  for (let i = 0; i < items.length; i += max) out.push(items.slice(i, i + max));
  return out.length ? out : [[]];
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
      <div style="padding:16px 18px 6px;display:flex;flex-direction:column;gap:12px">
        <div style="display:grid;grid-template-columns:80px 80px 1fr;gap:12px;align-items:end">
          <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">Copias</div>
            <input id="rem-copias" class="finp" type="number" min="1" max="9" step="1" value="${_remCopias()}" style="width:100%;text-align:right;font-family:var(--mono)"></div>
          <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">Cajas</div>
            <input id="rem-cajas" class="finp" type="number" min="1" step="1" value="1" style="width:100%;text-align:right;font-family:var(--mono)"></div>
          <div><div style="font-size:11px;color:var(--t2);margin-bottom:4px">Valor declarado <span style="color:var(--t3)">· $ sin IVA ni percepciones</span></div>
            <input id="rem-valor" class="finp" inputmode="numeric" value="${_remMiles(valor)}" style="width:100%;text-align:right;font-family:var(--mono)"
                   onfocus="this.select()" oninput="_remValorInput(this)"></div>
        </div>
        ${remTramos(items).length > 1 ? `<div style="font-size:12px;padding:8px 10px;border-radius:6px;background:rgba(239,159,39,.15);color:#854F0B;font-weight:600">
          ⚠️ Son ${items.length} renglones y en un remito entran ${REM_POS.items.max}: van a ser <b>${remTramos(items).length} remitos</b>
          (cada uno con las copias que pidas). Preparalos en la impresora.</div>` : ''}
        <div style="font-size:11px;padding:6px 10px;border-radius:6px;${contable ? 'background:rgba(29,158,117,.10);color:#0F6E56' : 'background:var(--s2);color:var(--t2)'}">
          ${contable ? '✓ Lleva el número de factura' : 'Comprobante no contable: no lleva número de factura'}</div>
        <details style="font-size:11px;color:var(--t2)"><summary style="cursor:pointer;user-select:none">Ajuste de impresión</summary>
          <div style="display:grid;grid-template-columns:auto 80px auto 80px;gap:8px 10px;align-items:center;margin-top:8px">
            <span>Horizontal</span><input id="rem-ajx" class="finp" type="number" step="0.5" value="${Number(aj.x)||0}" style="width:100%;text-align:right">
            <span>Vertical</span><input id="rem-ajy" class="finp" type="number" step="0.5" value="${Number(aj.y)||0}" style="width:100%;text-align:right">
          </div>
          <div style="margin-top:6px;color:var(--t3)">En milímetros. Positivo = a la derecha / hacia abajo. Queda guardado en esta PC.</div>
        </details>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding:0 18px 16px">
        <button class="btn" onclick="document.getElementById('rem-modal').remove()">Cancelar</button>
        <button class="btn pri" id="rem-ok">🖨 Imprimir remito</button>
      </div></div>`;
    document.body.appendChild(m);
    m.addEventListener('keydown', e => { if (e.key === 'Escape') m.remove(); });
    m.querySelector('#rem-ok').onclick = () => {
      const cajas = parseInt(document.getElementById('rem-cajas').value, 10) || 0;
      const val = _remNum(document.getElementById('rem-valor').value);
      if (cajas <= 0) { toast('Indicá la cantidad de cajas','err'); return; }
      const copias = Math.min(9, Math.max(1, parseInt(document.getElementById('rem-copias').value, 10) || 1));
      try { localStorage.setItem('sgv_rem_copias', String(copias)); } catch(_) {}
      const ajuste = { x: Number(document.getElementById('rem-ajx').value) || 0, y: Number(document.getElementById('rem-ajy').value) || 0 };
      _remGuardarAjuste(ajuste);
      m.remove();
      remImprimir(f, items, { cajas, valor: val, contable, ajuste, copias });
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

  // Encabezado: se repite en cada remito
  let cab = '';
  cab += t(P.fecha, fecha);
  // Razón social en negrita y más grande, con el código de cliente a continuación
  cab += `<div class="c" style="left:${P.razon.x + ax}mm;top:${P.razon.y - 1 + ay}mm"><b style="font-size:13pt">${esc(cli.CLI_RAZON || f.fac_cli || '')}</b> ( ${esc((f.fac_cli||'').trim())})</div>`;
  // Domicilio de ENTREGA si el cliente lo tiene cargado; si no, el fiscal
  const ent = (cli.CLI_ENT_DOMIC||'').trim();
  const dom = ent ? { d: cli.CLI_ENT_DOMIC, l: cli.CLI_ENT_LOCAL, cp: cli.CLI_ENT_CODPOS, p: (typeof PCIA !== 'undefined' ? PCIA[cli.CLI_ENT_PROVIN] : '') || cli.CLI_ENT_PROVIN || '' }
                  : { d: cli.CLI_DOMIC, l: cli.CLI_LOCAL, cp: cli.CLI_CODPOS, p: pcia };
  cab += t(P.domic, dom.d);
  cab += t(P.local, [dom.cp ? '(' + String(dom.cp).trim() + ')' : '', (dom.l||'').trim()].filter(Boolean).join('-')
                     + (dom.p ? '   ' + String(dom.p).toUpperCase() : ''));
  cab += t(P.iva, ivaTxt);
  cab += t(P.cuit, cli.CLI_CUIT);
  cab += t(P.transp, 'TRANSPORTE: ' + (tr ? [tr.DETALLE, tr.STRING1].filter(x => (x||'').trim()).join(' — ') : (f.fac_transp||'')));
  const web = String(f.fac_nro||'').trim().charAt(0).toUpperCase() === 'T' ? 'www.tressa.com.ar' : 'www.daihatsu.com.ar';
  const NEG = 'font-family:Arial,sans-serif;font-weight:bold;font-size:13pt';
  const COND = 'transform:scaleX(.6);transform-origin:left top';   // letra condensada

  // Si los renglones no entran en un remito, se reparten en varios (Ricardo, Nov 2026):
  // en los que no son el último va "Continúa en el próximo remito..." y el pie
  // (cajas, valor, factura, piezas) va sólo en el último.
  const tramos = remTramos(items);
  const paginas = tramos.map((tr8, n) => {
    const ultimo = n === tramos.length - 1;
    let h = cab;
    tr8.forEach((it, i) => {
      const y = P.items.y + i * P.items.alto;
      h += t({ x: P.items.can.x - 12, y }, it.ite_can, 'width:12mm;text-align:right');
      const art = (ARTS||[]).find(x => (x.ART_COD||'').trim() === (it.ite_art||'').trim());
      h += t({ x: P.items.des.x, y }, String(art ? art.ART_DES || '' : '').substring(0, P.items.desMax), COND);
      h += t({ x: P.items.cod.x, y }, (it.ite_art||'').trim());
      // Despacho sin la letra de empresa (T/H) adelante, condensado
      h += t({ x: P.items.desp.x, y }, (it.ite_desp||'').trim().replace(/^[TH]/i, ''), COND);
    });
    if (!ultimo) {
      h += t({ x: P.items.des.x, y: P.items.y + P.items.max * P.items.alto + 2 },
             `Continúa en el próximo remito...   (${n + 1} de ${tramos.length})`, NEG);
    } else {
      if (tramos.length > 1) h += t({ x: P.items.des.x, y: P.items.y + P.items.max * P.items.alto + 2 }, `(${n + 1} de ${tramos.length})`);
      h += t(P.cajas, `•  ${o.cajas} (${remLetras(o.cajas)}) CAJA${o.cajas === 1 ? '' : 'S'}     VALOR DECLARADO: $ ${fmtMil(o.valor)}`, NEG + ';white-space:pre');
      if (o.contable) h += t(P.factura, `•  FACTURA N.° ${String(f.fac_nro).trim()}`, NEG);
      h += t(P.piezas, `${piezas} Piezas`);
      if (uniq('dep_proc')) h += t(P.origen, 'Origen: ' + uniq('dep_proc'));
      if (uniq('dep_adua')) h += t(P.aduana, 'Aduana: ' + uniq('dep_adua'));
    }
    h += t(P.leyenda, REM_LEYENDA);
    h += t(P.web, web);
    return h;
  });
  // Primero las N copias del primer remito, después las del segundo, y así
  const copias = Math.max(1, o.copias || 1);
  const hojas = [];
  paginas.forEach(pg => { for (let c = 0; c < copias; c++) hojas.push(`<div class="hoja">${pg}</div>`); });
  const html = hojas.join('');

  const w = window.open('', '_blank');
  if (!w) { toast('El navegador bloqueó la ventana de impresión','err'); return; }
  w.document.write(`<html><head><meta charset="utf-8"><title>Remito ${esc(String(f.fac_nro).trim())}</title>
    <style>@page{size:210mm 297mm;margin:0} html,body{margin:0;padding:0}
      body{font-family:"Courier New",Courier,monospace;font-size:11pt;color:#000}
      .hoja{position:relative;width:210mm;height:296.5mm;overflow:hidden;page-break-after:always;break-after:page}
      .hoja:last-child{page-break-after:auto;break-after:auto}
      .c{position:absolute;white-space:nowrap;line-height:1}</style></head>
    <body>${html}<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script></body></html>`);
  w.document.close(); w.focus();
}

/* ===========================================================================
   FACTURA DE BORRADOR  (Facturación → Nueva → Ítems)   — Ricardo, Nov 2026
   - Se pide el TIPO y NÚMERO de un comprobante "borrador" (ej. HXX 204368) y
     se traen sus ítems para facturar, PESIFICADOS con la cotización de HOY
     (tabla Monedas). Los ítems se pueden modificar (cantidades y precios).
   - El comprobante que se graba es SÓLO CONTABLE: el talonario tiene que ser un
     tipo Contable que baja depósito y NO stock (ej. HA6). Con eso hereda todo:
     no mueve stock (ya lo movió el borrador), baja depósito, no es deuda real
     y se cancela con recibos sólo contables.
   - El tipo y número del borrador se guardan en facturas.fac_borrador y se ven
     en el detalle. Un mismo borrador se puede usar en varias facturas.
   =========================================================================== */

let NF_BORRADOR = null;          // fac_nro del borrador usado en la factura en curso

function nfbReset(){ NF_BORRADOR = null; document.getElementById('nfb-modal')?.remove(); nfbPintarMarca(); }

const _nfbSoloCont = ct => !!(ct && ct.contable && ct.tab_fact && !ct.tab_stk);

function nfbPintarMarca(){
  const el = document.getElementById('nf-borr-marca');
  if (el) el.innerHTML = NF_BORRADOR
    ? `📄 Desde borrador <b>${esc(NF_BORRADOR)}</b> <a href="#" onclick="nfbQuitar();return false" style="color:var(--red);margin-left:4px">✕</a>`
    : '';
}
function nfbQuitar(){ NF_BORRADOR = null; nfbPintarMarca(); toast('Se quitó la referencia al borrador (los ítems quedan cargados)'); }

function nfbAbrir(){
  const ct = nfCtipActual();
  if (!ct) { toast('Elegí primero el tipo de comprobante','err'); return; }
  if (!_nfbSoloCont(ct)) {
    const sc = [...new Set((CTIPS||[]).filter(_nfbSoloCont).map(c => c.prefijo))].join(', ');
    sgvAviso({ titulo:'Factura de Borrador', tipo:'adv',
      texto:'La factura de un borrador es SÓLO CONTABLE.\n\nElegí un tipo de comprobante Sólo contable' + (sc ? ` (${sc})` : '') +
            '.\n\nEn Tipos de Comprobantes: Contable y p/Facturar marcados, Mueve stock sin marcar.' });
    return;
  }
  const prefs = [...new Set((CTIPS||[]).filter(c => (c.tipo||'') === 'F').map(c => c.prefijo))].sort();
  document.getElementById('nfb-modal')?.remove();
  const m = document.createElement('div'); m.id = 'nfb-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML = `<div style="background:var(--s1);border:1px solid var(--b1);border-radius:12px;width:100%;max-width:440px;box-shadow:0 12px 40px rgba(0,0,0,.35);overflow:hidden">
    <div style="background:var(--acc);color:#fff;padding:12px 18px;font-size:15px;font-weight:600">📄 Factura de Borrador</div>
    <div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">
      <div style="font-size:12px;color:var(--t2);line-height:1.5">Se traen los ítems del borrador pesificados con la cotización de hoy. Después se pueden modificar.</div>
      <div style="display:flex;gap:10px">
        <div style="flex:0 0 110px"><label class="flbl2">Tipo</label>
          <input id="nfb-pref" class="finp" list="nfb-pref-list" maxlength="3" style="width:100%;text-transform:uppercase" placeholder="HXX">
          <datalist id="nfb-pref-list">${prefs.map(p => `<option value="${esc(p)}">`).join('')}</datalist></div>
        <div style="flex:1"><label class="flbl2">Número</label>
          <input id="nfb-num" class="finp" inputmode="numeric" style="width:100%" placeholder="204368"
                 onkeydown="if(event.key==='Enter'){event.preventDefault();nfbTraer()}"></div>
      </div>
      <div id="nfb-msg" style="font-size:12px;min-height:16px"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;padding:0 18px 16px">
      <button class="btn" onclick="document.getElementById('nfb-modal').remove()">Cancelar</button>
      <button class="btn pri" id="nfb-ok" onclick="nfbTraer()">⬇ Traer ítems</button>
    </div></div>`;
  document.body.appendChild(m);
  m.addEventListener('keydown', e => { if (e.key === 'Escape') m.remove(); });
  setTimeout(() => document.getElementById('nfb-pref')?.focus(), 50);
}

// Busca el comprobante por tipo + número, sin depender del formato del número
// ("HXX204368F", "HA4-001030F", "HB4  6076F")
async function _nfbBuscar(pref, num){
  const rows = await sbGet('facturas', `fac_nro=like.${encodeURIComponent(pref + '*' + num + 'F')}&select=*`) || [];
  return rows.filter(f => {
    const n = String(f.fac_nro||'').trim().toUpperCase();
    return n.startsWith(pref) && n.endsWith('F') && parseInt(n.slice(3, -1).replace(/\D/g,''), 10) === parseInt(num, 10);
  });
}

async function nfbTraer(){
  const pref = (document.getElementById('nfb-pref')?.value||'').trim().toUpperCase();
  const num  = (document.getElementById('nfb-num')?.value||'').replace(/\D/g,'');
  const msg  = document.getElementById('nfb-msg');
  const err  = t => { if (msg) { msg.style.color = 'var(--red)'; msg.textContent = t; } };
  if (pref.length !== 3 || !num) { err('Escribí el tipo (3 letras) y el número'); return; }
  if (msg) { msg.style.color = 'var(--t2)'; msg.textContent = '⏳ Buscando…'; }
  try {
    const encontrados = await _nfbBuscar(pref, num);
    if (!encontrados.length) { err(`No existe la factura ${pref} ${num}`); return; }
    const f = encontrados[0];
    if (f.fac_anul) { err(`La factura ${f.fac_nro.trim()} está anulada`); return; }
    const items = await sbLoadItemsFac(f.fac_nro);
    if (!(items||[]).length) { err('Ese comprobante no tiene ítems'); return; }

    // Cotización de HOY de la moneda del borrador
    const monB = f.fac_moneda || 'P';
    const mone = (TABLAS['MONE']||[]).find(x => x.CODIGO === monB);
    const cotiz = monB === 'P' ? 1 : (parseFloat(mone?.STRING2) || 0);
    if (!cotiz) { err(`No hay cotización cargada para la moneda ${mone?.DETALLE || monB} (tabla Monedas)`); return; }

    if (msg) msg.textContent = '⏳ Armando los renglones…';
    await _nfbCargar(f, items, cotiz);
    NF_BORRADOR = String(f.fac_nro).trim();
    nfbPintarMarca();
    document.getElementById('nfb-modal')?.remove();
    toast(`Ítems de ${NF_BORRADOR} cargados` + (cotiz !== 1 ? ` (cotización ${cotiz})` : ''), 'scs');
  } catch (e) { console.error('nfbTraer:', e); err(e.message || 'Error al traer el borrador'); }
}

// Arma los renglones con despachos (el comprobante BAJA DEPÓSITO): primero los
// del borrador si tienen depósito libre, si no los más viejos con depósito.
async function _nfbCargar(f, items, cotiz){
  const ct = nfCtipActual(), ms = !!ct.tab_stk, pf = !!ct.tab_fact;
  const emp = document.getElementById('nf-empresa')?.value || 'H';
  const libre = d => { const s = (d.dep_stk!=null) ? d.dep_stk : ((d.dep_ent||0)-(d.dep_sal||0)); const c = (d.dep_costk!=null) ? d.dep_costk : s;
    return ms && pf ? Math.min(s, c) : (pf ? c : s); };
  const norm = v => String(v ?? '').trim().toUpperCase();
  const cods = [...new Set(items.map(i => norm(i.ite_art)).filter(Boolean))];
  const desps = {};
  for (let i = 0; i < cods.length; i += 200) {
    const lista = cods.slice(i, i+200).map(c => '"' + c.replace(/"/g,'') + '"').join(',');
    const rows = await sbGet('despachos', `dep_art=in.(${encodeURIComponent(lista)})&order=dep_fec.asc`);
    (rows||[]).forEach(d => (desps[norm(d.dep_art)] = desps[norm(d.dep_art)] || []).push({ ...d, _libre: libre(d) }));
  }
  const esA = nfEsFacturaA(), nuevos = [], faltan = [];
  for (const it of items) {
    const cod = norm(it.ite_art), can = Number(it.ite_can) || 0;
    if (!cod || can <= 0) continue;
    const a = (ARTS||[]).find(x => norm(x.ART_COD) === cod) || {};
    const iva = (a.ART_IVA!==null && a.ART_IVA!==undefined) ? Number(a.ART_IVA) : (Number(it.ite_iva_porc) || 21);
    const pre = Math.round((Number(it.ite_uni) || 0) * cotiz * 100) / 100;      // PESIFICADO
    const todos = desps[cod] || [];
    // El despacho del borrador primero, después los más viejos
    const orden = [...todos.filter(d => it.ite_dep_id && String(d.dep_id) === String(it.ite_dep_id)),
                   ...todos.filter(d => !(it.ite_dep_id && String(d.dep_id) === String(it.ite_dep_id)))];
    const renglon = (d, c) => {
      const neto = esA ? pre/(1+iva/100) : pre;
      const dStk = d ? ((d.dep_stk!=null) ? d.dep_stk : ((d.dep_ent||0)-(d.dep_sal||0))) : null;
      return { ite_art: a.ART_COD ? String(a.ART_COD).trim() : cod, ite_desp_art: a.ART_DES || it.ite_desp_art || '',
        ite_desp_nro: d ? d.dep_desp + (d.dep_sub||'') : '', ite_desp_fec: d ? (d.dep_fec||'') : '', ite_can: c,
        ite_uni: pre, ite_preori: pre, ite_moneda: 'P', ite_cotiz: 1, ite_iva_porc: iva,
        ite_imp: Math.round(neto*c*100)/100, ite_iva_imp: esA ? Math.round((pre-neto)*c*100)/100 : 0,
        _artReal: emp==='T' ? (a.ART_STKT||0) : (a.ART_STK||0), _artPfac: emp==='T' ? (a.ART_DEPT||0) : (a.ART_DEPH||0),
        _depStk: dStk, _depCostk: d ? ((d.dep_costk!=null) ? d.dep_costk : dStk) : null,
        _desps: todos.slice().reverse(), _desp_id: d ? d.dep_id : null, ite_disp: d ? libre(d) : null };
    };
    if (!ms && !pf) { nuevos.push(renglon(orden[0] || null, can)); continue; }
    let resta = can;
    for (const d of orden.filter(d => d._libre > 0)) {
      if (resta <= 0) break;
      const usa = Math.min(resta, d._libre); d._libre -= usa; resta -= usa;
      nuevos.push(renglon(d, usa));
    }
    if (resta > 0) faltan.push(`${cod}: faltan ${resta} en depósito`);
  }
  if (faltan.length) throw new Error('No alcanza el depósito para facturar:\n' + faltan.join('\n'));
  // Moneda de la factura: PESOS
  const mon = document.getElementById('nf-moneda');
  if (mon && mon.value !== 'P') { mon.value = 'P'; if (typeof nfOnMonedaChange === 'function') nfOnMonedaChange(); }
  FAC_ITEMS_NUEVA.push(...nuevos);
  nfRenderItems(); nfCalcTotales();
}

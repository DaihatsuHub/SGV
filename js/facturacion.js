// ═══════════════════════════════════════════════════════════
// FACTURACIÓN — Facturas, Items, Tipos de Comprobante
// ═══════════════════════════════════════════════════════════

let FACS   = [];
let CTIPS  = [];
let facSelIdx  = null;
let ctipSelIdx = null;

// ── Cargar datos desde Supabase ───────────────────────────
async function sbLoadFacs() {
  try {
    FACS = await sbGetAll('facturas', 'fac_fec');
    FACS.sort((a,b) => (b.fac_fec||'').localeCompare(a.fac_fec||''));
  } catch(e) { console.error('sbLoadFacs:', e); }
}

async function sbLoadCtips() {
  try {
    CTIPS = await sbGet('comp_tipos', 'order=empresa.asc,prefijo.asc,tipo.asc');
  } catch(e) { console.error('sbLoadCtips:', e); }
}

async function sbLoadItemsFac(nro) {
  try {
    return await sbGet('fac_items', `ite_nro=eq.${encodeURIComponent(nro)}&order=id.asc`);
  } catch(e) { console.error('sbLoadItemsFac:', e); return []; }
}

// ── TIPOS DE COMPROBANTE ──────────────────────────────────
const TIPO_LABEL = { F:'Factura', C:'Nota de Crédito', D:'Nota de Débito', R:'Cheque Rechazado' };

function filtCtip() {
  const q = (document.getElementById('ctip-q')?.value||'').toLowerCase();
  return CTIPS.filter(c =>
    !q || c.prefijo.toLowerCase().includes(q) ||
    c.empresa.toLowerCase().includes(q) ||
    (TIPO_LABEL[c.tipo]||'').toLowerCase().includes(q)
  );
}

function renderCtip() {
  const list = filtCtip();
  const body = document.getElementById('ctip-body');
  if (!list.length) { body.innerHTML='<div class="empty">🔍 Sin resultados</div>'; return; }
  body.innerHTML = list.map((c,i) => {
    const sel = ctipSelIdx===i ? 'sel' : '';
    return `<div class="tr-tab ${sel}" style="display:grid;grid-template-columns:60px 80px 80px 1fr 80px 80px;gap:8px;padding:11px 16px;font-size:13px;cursor:pointer" onclick="selCtip(${i})">
      <span class="col-cod">${esc(c.empresa)}</span>
      <span class="col-cod">${esc(c.prefijo)}</span>
      <span class="col-sm">${esc(TIPO_LABEL[c.tipo]||c.tipo)}</span>
      <span style="color:var(--t2);font-size:12px">${c.empresa==='H'?'Hatsu Electronics SA':'Tressa Argentina SA'}</span>
      <span style="text-align:right;font-family:var(--mono)">${c.ultimo_nro||0}</span>
      <span style="text-align:center"><span class="pill ${c.contable?'ps':'pn'}">${c.contable?'Sí':'No'}</span></span>
    </div>`;
  }).join('');
}

function selCtip(i) { ctipSelIdx=i; renderCtip(); }

function ctipAlta() {
  document.getElementById('ctip-empresa').value = 'H';
  document.getElementById('ctip-prefijo').value = '';
  document.getElementById('ctip-tipo').value    = 'F';
  document.getElementById('ctip-ultimo').value  = 0;
  setTog('ctip-tog-cont','ctip-contable',true);
  document.getElementById('ctip-mtit').textContent = 'Nuevo Tipo de Comprobante';
  setMtag('ctip-mtag','ALTA','tag-a');
  document.getElementById('ov-ctip').classList.add('open');
  window._ctipe = 'A';
}

function ctipModif() {
  if(ctipSelIdx===null){toast('Seleccioná un tipo','err');return;}
  const c = filtCtip()[ctipSelIdx];
  document.getElementById('ctip-empresa').value = c.empresa;
  document.getElementById('ctip-prefijo').value = c.prefijo;
  document.getElementById('ctip-tipo').value    = c.tipo;
  document.getElementById('ctip-ultimo').value  = c.ultimo_nro||0;
  setTog('ctip-tog-cont','ctip-contable',!!c.contable);
  document.getElementById('ctip-mtit').textContent = `Modificar: ${c.empresa}${c.prefijo} ${TIPO_LABEL[c.tipo]||c.tipo}`;
  setMtag('ctip-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-ctip').classList.add('open');
  window._ctipe = 'M';
}

function ctipBaja() {
  if(ctipSelIdx===null){toast('Seleccioná un tipo','err');return;}
  const c = filtCtip()[ctipSelIdx];
  confirm2(`¿Eliminar tipo "${c.empresa}${c.prefijo} ${TIPO_LABEL[c.tipo]||c.tipo}"?`,
    'El tipo de comprobante será eliminado.', async () => {
      try {
        await sbDelete('comp_tipos', { id: c.id });
        const idx = CTIPS.findIndex(x=>x.id===c.id);
        if(idx>=0) CTIPS.splice(idx,1);
        ctipSelIdx=null; renderCtip();
        toast('Tipo eliminado','scs');
      } catch(e) { toast('Error al eliminar','err'); }
    });
}

async function saveCtip() {
  const empresa  = document.getElementById('ctip-empresa').value;
  const prefijo  = document.getElementById('ctip-prefijo').value.trim().toUpperCase();
  const tipo     = document.getElementById('ctip-tipo').value;
  const ultimo   = parseInt(document.getElementById('ctip-ultimo').value)||0;
  const contable = document.getElementById('ctip-contable').value === '1';
  if(!prefijo||prefijo.length!==3){toast('El prefijo debe tener exactamente 3 caracteres','err');return;}
  const data = { empresa, prefijo, tipo, ultimo_nro: ultimo, contable };
  try {
    if(window._ctipe==='A') {
      const existe = CTIPS.find(c=>c.empresa===empresa&&c.prefijo===prefijo&&c.tipo===tipo);
      if(existe){toast('Ya existe ese tipo de comprobante','err');return;}
      await sbUpsert('comp_tipos', data);
      await sbLoadCtips();
      toast('Tipo dado de alta','scs');
    } else {
      const c = filtCtip()[ctipSelIdx];
      await fetch(`${SB_URL}/rest/v1/comp_tipos?id=eq.${c.id}`, {
        method: 'PATCH', headers: { ...SB_HDR }, body: JSON.stringify(data)
      });
      await sbLoadCtips();
      toast('Tipo modificado','scs');
    }
    closeOv('ov-ctip'); ctipSelIdx=null; renderCtip();
  } catch(e) { console.error(e); toast('Error al guardar','err'); }
}

// Generar próximo número de comprobante
function proximoNro(empresa, prefijo, tipo) {
  const ct = CTIPS.find(c=>c.empresa===empresa&&c.prefijo===prefijo&&c.tipo===tipo);
  if(!ct) return null;
  const nro = (ct.ultimo_nro||0) + 1;
  // Formato: prefijo + espacio(s) + numero 6 dig sin ceros + tipo
  const nroStr = String(nro).padStart(6, ' ');
  return { nro, str: `${empresa}${prefijo}${nroStr}${tipo}`, ctip: ct };
}

// ── FACTURACIÓN ────────────────────────────────────────────
function filtFacs() {
  const emp = document.getElementById('fac-empresa')?.value||'';
  // Filtrar solo por empresa, nunca por búsqueda (búsqueda es posicional)
  return FACS.filter(f => !emp || (f.fac_nro||'').startsWith(emp));
}

function buscarFac() {
  const q = (document.getElementById('fac-q')?.value||'').toLowerCase().trim();
  if (!q) { facSelIdx = 0; renderFac(); return; }
  const list = filtFacs();
  const idx = list.findIndex(f =>
    (f.fac_nro||'').toLowerCase().includes(q) ||
    (f.fac_cli||'').toLowerCase().includes(q) ||
    (CLIS.find(c=>c.CLI_CODIGO===(f.fac_cli||'').trim())?.CLI_RAZON||'').toLowerCase().includes(q)
  );
  if (idx >= 0) {
    facSelIdx = idx;
    renderFac();
    // Scroll al elemento encontrado
    const body = document.getElementById('fac-body');
    const el = body.querySelector(`[data-idx="${idx}"]`);
    if (el) el.scrollIntoView({ block: 'center' });
  }
}

function renderFac() {
  const list = filtFacs();
  const body = document.getElementById('fac-body');
  if(!list.length){body.innerHTML='<div class="empty">🔍 Sin resultados</div>';return;}

  // Si no hay selección, seleccionar el primero (ya viene ordenado por fecha desc)
  if (facSelIdx === null || facSelIdx >= list.length) facSelIdx = 0;

  body.innerHTML = list.map((f,i) => {
    const sel = facSelIdx===i ? 'sel' : '';
    const fec = f.fac_fec ? f.fac_fec.substring(0,10).split('-').reverse().join('/') : '—';
    const cli = CLIS.find(c=>c.CLI_CODIGO===(f.fac_cli||'').trim());
    const nomCli = cli ? cli.CLI_RAZON : f.fac_cli||'—';
    const prefijo = (f.fac_nro||'').substring(0,3);
    const ctip = CTIPS.find(c=>c.prefijo === prefijo);
    const contColor = ctip ? (ctip.contable ? 'var(--acc)' : 'var(--red)') : 'var(--t2)';
    return `<div class="tr-fac ${sel}" data-idx="${i}" onclick="selFac(${i})">
      <span style="font-size:12px;color:var(--t2);flex-shrink:0">${fec}</span>
      <span class="col-cod" style="font-family:var(--mono);color:${contColor};flex-shrink:0">${esc(f.fac_nro||'')}</span>
      <span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(nomCli)}</span>
    </div>`;
  }).join('');

  // Scroll al elemento seleccionado
  const selEl = body.querySelector('.tr-fac.sel');
  if (selEl) selEl.scrollIntoView({ block: 'nearest' });

  // Mostrar detalle del primero si es la carga inicial
  const f = list[facSelIdx];
  if (f) renderFacDetalle(f);

  // Navegación con teclado
  document.onkeydown = function(e) {
    const page = document.getElementById('page-fac');
    if (!page || !page.classList.contains('active')) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const total = filtFacs().length;
    if (!total) return;
    let next = e.key === 'ArrowDown' ? (facSelIdx||0) + 1 : (facSelIdx||0) - 1;
    next = Math.max(0, Math.min(next, total - 1));
    selFac(next);
    const el = body.querySelector(`[data-idx="${next}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  };
}

async function selFac(i) {
  facSelIdx = i;
  // Update highlight
  document.querySelectorAll('#fac-body .tr-fac').forEach((el,idx) => {
    el.classList.toggle('sel', idx===i);
  });
  const f = filtFacs()[i];
  if(!f) return;
  await renderFacDetalle(f);
}

async function renderFacDetalle(f) {
  const det = document.getElementById('fac-detalle');
  const fec = f.fac_fec ? f.fac_fec.substring(0,10).split('-').reverse().join('/') : '—';
  const cli = CLIS.find(c=>c.CLI_CODIGO===(f.fac_cli||'').trim());
  const mon = f.fac_moneda==='P' ? '$' : 'u$s';

  // Cargar items
  const items = await sbLoadItemsFac(f.fac_nro);

  const tipoLabel = { F:'Factura', C:'Nota de Crédito', D:'Nota de Débito', R:'Cheque Rechazado' };
  const tipoChar = (f.fac_nro||'').slice(-1);

  const prefijo2 = (f.fac_nro||'').substring(0,3);
  const ctip2 = CTIPS.find(c=>c.prefijo === prefijo2);
  const contColor2 = ctip2 ? (ctip2.contable ? 'var(--acc)' : 'var(--red)') : 'var(--acc)';

  det.innerHTML = `
    <div class="fac-det-hdr" style="position:sticky;top:0;background:var(--s1);z-index:1;padding-bottom:8px">
      <div class="fac-det-nro" style="color:${contColor2}">${esc(f.fac_nro||'')} &nbsp;<span style="font-size:13px;color:var(--t2)">${tipoLabel[tipoChar]||''}</span></div>
      <div class="fac-det-cli">${cli?cli.CLI_RAZON:f.fac_cli||'—'}</div>
      <div class="fac-det-sub">${cli?cli.CLI_DOMIC+' — '+cli.CLI_LOCAL:''}</div>
      <div class="fac-det-sub" style="margin-top:4px">
        ${cli?'Cond.Pago: '+( cli.CLI_CONPAG||'—'):''}
        &nbsp;·&nbsp; IVA: (${f.fac_tiva||'—'})
        &nbsp;·&nbsp; Fecha: ${fec}
      </div>
    </div>

    <div style="margin-bottom:12px">
      <div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-bottom:6px;letter-spacing:1px">ITEMS (${items.length})</div>
      <div style="background:var(--s2);border-radius:6px;overflow:hidden;max-height:200px;overflow-y:auto">
        <div style="display:grid;grid-template-columns:110px 1fr 60px 90px 90px 65px;gap:6px;padding:6px 10px;background:var(--s3);font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase;position:sticky;top:0;z-index:1">
          <span>Artículo</span><span>Despacho</span><span style="text-align:right">Cant</span><span style="text-align:right">P.Unit</span><span style="text-align:right">Importe</span><span style="text-align:right">Dto%</span>
        </div>
        ${items.length ? items.map(it => {
          const art = ARTS.find(a=>a.ART_COD===it.ite_art);
          const dto = it.ite_costo && it.ite_costo > 0
            ? ((1 - it.ite_uni / it.ite_costo) * 100).toFixed(1)
            : '—';
          const dtoColor = parseFloat(dto) > 0 ? 'color:var(--grn)' : 'color:var(--t3)';
          return `<div style="display:grid;grid-template-columns:110px 1fr 60px 90px 90px 65px;gap:6px;padding:7px 10px;border-bottom:1px solid var(--b1);font-size:12px">
            <span class="col-cod">${esc(it.ite_art||'')}</span>
            <span style="color:var(--t2);font-size:11px">${esc(it.ite_desp||'')}</span>
            <span style="text-align:right;font-family:var(--mono)">${it.ite_can||0}</span>
            <span style="text-align:right;font-family:var(--mono)">${mon}${fmt(it.ite_uni)}</span>
            <span style="text-align:right;font-family:var(--mono);color:var(--grn)">${mon}${fmt(it.ite_imp)}</span>
            <span style="text-align:right;font-family:var(--mono);${dtoColor}">${dto}%</span>
          </div>`;
        }).join('') : '<div style="padding:12px;text-align:center;color:var(--t3);font-size:12px">Sin ítems</div>'}
      </div>
    </div>

    <div class="fac-det-totales">
      <div class="fac-det-row"><span>Subtotal</span><span>${mon} ${fmt(f.fac_sub)}</span></div>
      ${(f.fac_percib||0)>0?`<div class="fac-det-row"><span>Percepción IIBB</span><span>${mon} ${fmt(f.fac_percib)}</span></div>`:''}
      <div class="fac-det-row"><span>Total</span><span>${mon} ${fmt(f.fac_total)}</span></div>
      <div class="fac-det-row"><span>Saldo</span><span style="color:${(f.fac_saldo||0)>0?'var(--red)':'var(--grn)'}">${mon} ${fmt(f.fac_saldo)}</span></div>
    </div>
  `;
}

function facAlta()    { toast('Próximamente: Alta de factura','scs'); }
function facModif()   { if(facSelIdx===null){toast('Seleccioná una factura','err');return;} toast('Próximamente: Modificar factura','scs'); }
function facBaja()    { if(facSelIdx===null){toast('Seleccioná una factura','err');return;} toast('Próximamente: Anular factura','scs'); }
function facImprimir(){ if(facSelIdx===null){toast('Seleccioná una factura','err');return;} toast('Próximamente: Imprimir factura','scs'); }

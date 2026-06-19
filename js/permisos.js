// ═══════════════════════════════════════════════════════════
// PERMISOS — Control de acceso por nivel de usuario
// ═══════════════════════════════════════════════════════════

let _permisos = [];

async function loadPermisos() {
  try {
    _permisos = await sbGet('permisos', 'order=modulo.asc,accion.asc');
  } catch(e) {
    console.warn('loadPermisos:', e);
    _permisos = [];
  }
}

function puedeh(modulo, accion) {
  if (!usuarioActual) return false;
  if (usuarioActual.codigo === 'RGRDELTA') return true;
  const p = _permisos.find(x => x.modulo === modulo && x.accion === accion);
  if (!p) return false;
  return (usuarioActual.nivel || 0) >= (p.nivel_min || 99);
}

function _setBtn(id, visible) {
  const el = document.getElementById(id);
  if (el) el.style.display = visible ? '' : 'none';
}

function aplicarPermisos() {
  if (!usuarioActual) return;

  // ── Artículos ─────────────────────────────────────────
  _setBtn('btn-art-alta',   puedeh('art','alta'));
  _setBtn('btn-art-modif',  puedeh('art','modif'));
  _setBtn('btn-art-baja',   puedeh('art','baja'));
  _setBtn('btn-cfg-art',    puedeh('art','columnas'));

  // ── Clientes ──────────────────────────────────────────
  _setBtn('btn-cli-alta',   puedeh('cli','alta'));
  _setBtn('btn-cli-modif',  puedeh('cli','modif'));
  _setBtn('btn-cli-baja',   puedeh('cli','baja'));
  _setBtn('btn-cfg-cli',    puedeh('cli','columnas'));

  // ── Tablas (página unificada) ──────────────────────────
  _setBtn('btn-tab-alta',   puedeh('tablas','alta'));
  _setBtn('btn-tab-modif',  puedeh('tablas','modif'));
  _setBtn('btn-tab-baja',   puedeh('tablas','baja'));

  // ── Tablas auxiliares individuales ────────────────────
  const pTab = puedeh('tablas','alta');
  const pTabM = puedeh('tablas','modif');
  const pTabB = puedeh('tablas','baja');
  ['marc','rubr','prov','cpag','vend','cate','grup','mone'].forEach(t => {
    _setBtn(`btn-${t}-alta`,  pTab);
    _setBtn(`btn-${t}-modif`, pTabM);
    _setBtn(`btn-${t}-baja`,  pTabB);
  });

  // ── Facturación ───────────────────────────────────────
  _setBtn('btn-fac-alta',   puedeh('fac','alta'));
  _setBtn('btn-fac-modif',  puedeh('fac','modif'));
  _setBtn('btn-fac-baja',   puedeh('fac','baja'));

  // ── Tipos de Comprobantes ─────────────────────────────
  _setBtn('btn-ctip-alta',  puedeh('ctip','alta'));
  _setBtn('btn-ctip-modif', puedeh('ctip','modif'));
  _setBtn('btn-ctip-baja',  puedeh('ctip','baja'));

  // ── Despachos ─────────────────────────────────────────
  _setBtn('btn-desp-alta',  puedeh('desp','alta'));
  _setBtn('btn-desp-modif', puedeh('desp','modif'));
  _setBtn('btn-desp-baja',  puedeh('desp','baja'));
  _setBtn('btn-cfg-desp',   puedeh('desp','columnas'));

  // ── Cobranzas: Recibos ────────────────────────────────
  _setBtn('btn-reci-ver',   puedeh('reci','ver'));
  _setBtn('btn-reci-alta',  puedeh('reci','alta'));
  _setBtn('btn-reci-modif', puedeh('reci','modif'));
  _setBtn('btn-reci-baja',  puedeh('reci','baja'));
  _setBtn('btn-cfg-reci',   puedeh('reci','columnas'));

  // ── Cobranzas: Talonarios ─────────────────────────────
  _setBtn('btn-talo-alta',  puedeh('talo','alta'));
  _setBtn('btn-talo-modif', puedeh('talo','modif'));
  _setBtn('btn-talo-baja',  puedeh('talo','baja'));

  // ── Cobranzas: Tipo de Retenciones ────────────────────
  _setBtn('btn-rete-alta',  puedeh('rete','alta'));
  _setBtn('btn-rete-modif', puedeh('rete','modif'));
  _setBtn('btn-rete-baja',  puedeh('rete','baja'));

  // ── Cobranzas: Cartera de Valores ─────────────────────
  _setBtn('btn-cart-edit',    puedeh('cart','modif'));
  _setBtn('btn-cart-confirm', puedeh('cart','modif'));
  _setBtn('btn-cfg-cart',     puedeh('cart','columnas'));

  // ── Usuarios ──────────────────────────────────────────
  _setBtn('ddi-usua',       puedeh('usuarios','ver'));
  _setBtn('btn-permisos',   usuarioActual.nivel >= 88 || usuarioActual.codigo === 'RGRDELTA');

  // ── Menús completos ───────────────────────────────────
  _setBtn('tnav-art', puedeh('art','ver'));
  _setBtn('tnav-cli', puedeh('cli','ver'));
  _setBtn('ddi-ficha', puedeh('cli','ver'));
  _setBtn('tnav-cmp', puedeh('desp','ver'));
  _setBtn('tnav-ven', puedeh('fac','ver') || puedeh('ctip','ver'));
  _setBtn('tnav-cob', puedeh('reci','ver') || puedeh('talo','ver') || puedeh('rete','ver') || puedeh('cart','ver'));

  // ── Subitems Ventas ───────────────────────────────────
  _setBtn('ddi-fac',  puedeh('fac','ver'));
  _setBtn('ddi-vmes', puedeh('fac','ver'));
  _setBtn('ddi-ctip', puedeh('ctip','ver'));
  _setBtn('ddi-desp', puedeh('desp','ver'));

  // ── Subitems Cobranzas ────────────────────────────────
  _setBtn('ddi-reci', puedeh('reci','ver'));
  _setBtn('ddi-talo', puedeh('talo','ver'));
  _setBtn('ddi-rete', puedeh('rete','ver'));
  _setBtn('ddi-cart', puedeh('cart','ver'));
}

// ── Panel interactivo de permisos ─────────────────────────
const MODULOS_PERM = [
  { key:'art',      label:'📦 Artículos' },
  { key:'cli',      label:'👥 Clientes' },
  { key:'desp',     label:'🚢 Despachos' },
  { key:'fac',      label:'🧾 Facturación' },
  { key:'ctip',     label:'📋 Tipos de Comprobantes' },
  { key:'reci',     label:'🧾 Recibos' },
  { key:'talo',     label:'📓 Talonarios' },
  { key:'rete',     label:'🧮 Tipo de Retenciones' },
  { key:'cart',     label:'💼 Cartera de Valores' },
  { key:'tablas',   label:'📋 Tablas Auxiliares' },
  { key:'usuarios', label:'🔑 Usuarios' },
];
const ACCIONES_PERM = [
  { key:'ver',      label:'Ver' },
  { key:'alta',     label:'Alta' },
  { key:'modif',    label:'Modificar' },
  { key:'baja',     label:'Baja' },
  { key:'columnas', label:'⚙️ Columnas' },
];

function openPermisos() {
  if (!usuarioActual || (usuarioActual.nivel < 88 && usuarioActual.codigo !== 'RGRDELTA')) {
    toast('Sin acceso','err'); return;
  }
  const ov = document.getElementById('ov-permisos');
  if (!ov) return;
  renderPermisosPanel();
  ov.classList.add('open');
}

function renderPermisosPanel() {
  const body = document.getElementById('permisos-body');
  if (!body) return;
  body.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:var(--s3)">
          <th style="padding:8px 12px;text-align:left;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">Módulo</th>
          ${ACCIONES_PERM.map(a=>`<th style="padding:8px;text-align:center;font-family:var(--mono);font-size:11px;color:var(--t2);border-bottom:1px solid var(--b1)">${a.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${MODULOS_PERM.map(m => `
          <tr style="border-bottom:1px solid var(--b1)">
            <td style="padding:10px 12px;font-weight:500;color:var(--txt)">${m.label}</td>
            ${ACCIONES_PERM.map(a => {
              const p = _permisos.find(x => x.modulo === m.key && x.accion === a.key);
              const nivel = p ? p.nivel_min : 99;
              return `<td style="padding:6px;text-align:center">
                <input type="number" min="1" max="99"
                  data-modulo="${m.key}"
                  data-accion="${a.key}"
                  value="${nivel}"
                  style="width:52px;text-align:center;background:var(--s2);border:1px solid var(--b1);border-radius:4px;padding:4px;font-size:13px;font-family:var(--mono);color:var(--txt);outline:none"
                  onfocus="this.style.borderColor='var(--acc)'"
                  onblur="this.style.borderColor='var(--b1)'"
                  title="Nivel mínimo para ${a.label}">
              </td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top:12px;font-size:12px;color:var(--t3);font-family:var(--mono)">
      💡 Nivel 1 = todos &nbsp;·&nbsp; 50 = nivel medio &nbsp;·&nbsp; 80 = admin &nbsp;·&nbsp; 88+ = administrador &nbsp;·&nbsp; 99 = solo RGRDELTA
    </div>
  `;
}

async function savePermisos() {
  const inputs = document.querySelectorAll('#permisos-body input[data-modulo]');
  const updates = [];
  inputs.forEach(inp => {
    const modulo    = inp.dataset.modulo;
    const accion    = inp.dataset.accion;
    const nivel_min = parseInt(inp.value) || 1;
    if (modulo && accion && accion !== 'undefined') {
      updates.push({ modulo, accion, nivel_min });
    }
  });

  if (!updates.length) { toast('No hay datos para guardar','err'); return; }

  try {
    for (const u of updates) {
      await fetch(`${SB_URL}/rest/v1/permisos?modulo=eq.${u.modulo}&accion=eq.${u.accion}`, {
        method: 'PATCH',
        headers: { ...SB_HDR },
        body: JSON.stringify({ nivel_min: u.nivel_min })
      });
      const idx = _permisos.findIndex(x => x.modulo===u.modulo && x.accion===u.accion);
      if (idx >= 0) _permisos[idx].nivel_min = u.nivel_min;
    }
    document.getElementById('ov-permisos').classList.remove('open');
    toast('Permisos guardados', 'scs');
    aplicarPermisos();
  } catch(e) {
    console.error('savePermisos:', e);
    toast('Error al guardar permisos', 'err');
  }
}

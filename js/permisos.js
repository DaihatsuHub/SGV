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

function aplicarPermisos() {
  if (!usuarioActual) return;
  const controles = [
    { selector: '#page-art .btn.pri',          modulo:'art',      accion:'alta' },
    { selector: '#page-art .btn:nth-child(2)',  modulo:'art',      accion:'modif' },
    { selector: '#page-art .btn.dng',           modulo:'art',      accion:'baja' },
    { selector: '#btn-cfg-art',                 modulo:'art',      accion:'columnas' },
    { selector: '#page-cli .btn.pri',           modulo:'cli',      accion:'alta' },
    { selector: '#page-cli .btn:nth-child(2)',  modulo:'cli',      accion:'modif' },
    { selector: '#page-cli .btn.dng',           modulo:'cli',      accion:'baja' },
    { selector: '#btn-cfg-cli',                 modulo:'cli',      accion:'columnas' },
    { selector: '#page-desp .btn.pri',          modulo:'desp',     accion:'alta' },
    { selector: '#page-desp .btn:nth-child(2)', modulo:'desp',     accion:'modif' },
    { selector: '#page-desp .btn.dng',          modulo:'desp',     accion:'baja' },
    { selector: '#btn-cfg-desp',                modulo:'desp',     accion:'columnas' },
    { selector: '#ddi-usua',                    modulo:'usuarios', accion:'ver' },
  ];
  controles.forEach(({ selector, modulo, accion }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    if (accion === 'columnas' && usuarioActual.codigo !== 'RGRDELTA') {
      el.style.display = 'none'; return;
    }
    if (accion !== 'columnas') {
      el.style.display = puedeh(modulo, accion) ? '' : 'none';
    }
  });
}

// ── Panel interactivo de permisos ─────────────────────────
const MODULOS_PERM = [
  { key:'art',      label:'📦 Artículos' },
  { key:'cli',      label:'👥 Clientes' },
  { key:'desp',     label:'🚢 Despachos' },
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
  if (!usuarioActual || usuarioActual.nivel < 88) { toast('Sin acceso','err'); return; }
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
    const modulo   = inp.dataset.modulo;
    const accion   = inp.dataset.accion;
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

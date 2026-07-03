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

  // ── Página genérica "Tablas": visible si hay permiso en alguna tabla auxiliar ──
  const _auxMods = ['marc','rubr','prov','cpag','vend','cate','grup','mone'];
  _setBtn('btn-tab-alta',  _auxMods.some(t=>puedeh(t,'alta')));
  _setBtn('btn-tab-modif', _auxMods.some(t=>puedeh(t,'modif')));
  _setBtn('btn-tab-baja',  _auxMods.some(t=>puedeh(t,'baja')));
  // (Los botones btn-<tabla>-alta/modif/baja de cada tabla se setean en el loop de MENU_DEF, más abajo.)

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

  // ── Compras: Ordenes de Compra ────────────────────────
  _setBtn('btn-oc-ver',   puedeh('oc','ver'));
  _setBtn('btn-oc-alta',  puedeh('oc','alta'));
  _setBtn('btn-oc-modif', puedeh('oc','modif'));
  _setBtn('btn-oc-baja',  puedeh('oc','baja'));
  _setBtn('btn-cfg-oc',   puedeh('oc','columnas'));

  // ── Usuarios ──────────────────────────────────────────
  _setBtn('ddi-usua',       puedeh('usuarios','ver'));
  _setBtn('btn-permisos',   usuarioActual.nivel >= 88 || usuarioActual.codigo === 'RGRDELTA');

  // ── Menú: cada ítem visible según su permiso 'ver' (driven by MENU_DEF) ──
  // Cada ítem del menú tiene su módulo propio. Para agregar uno nuevo,
  // sumalo a MENU_DEF (más abajo) y queda contemplado acá y en el panel.
  MENU_DEF.forEach(g => {
    let algunoVisible = false;
    g.items.forEach(it => {
      const ve = puedeh(it.mod, 'ver');
      _setBtn(it.id, ve);
      if (ve) algunoVisible = true;
      if (it.tabla) {   // botones alta/modif/baja de la tabla → su propio módulo
        _setBtn(`btn-${it.mod}-alta`,  puedeh(it.mod,'alta'));
        _setBtn(`btn-${it.mod}-modif`, puedeh(it.mod,'modif'));
        _setBtn(`btn-${it.mod}-baja`,  puedeh(it.mod,'baja'));
      }
    });
    if (g.tnav) _setBtn(g.tnav, algunoVisible);  // el grupo se ve si algún ítem adentro es visible
  });
}

// ── Panel interactivo de permisos ─────────────────────────
// ═══════════════════════════════════════════════════════════
//  MENU_DEF — fuente ÚNICA del menú y los permisos (1 por ítem).
//  Para agregar un ítem nuevo al menú: sumalo acá con su id (ddi-*)
//  y su módulo. Queda contemplado en el menú Y en el panel de permisos,
//  en este mismo orden. Sin tocar nada más.
//    tabla:true → además controla los botones btn-<mod>-alta/modif/baja.
// ═══════════════════════════════════════════════════════════
const MENU_DEF = [
  { grupo:'📦 Artículos', tnav:'tnav-art', items:[
    { id:'ddi-art',  mod:'art',  label:'📋 Maestro de Artículos' },
    { id:'ddi-marc', mod:'marc', label:'🏷️ Marcas',      tabla:true },
    { id:'ddi-rubr', mod:'rubr', label:'📦 Rubros',      tabla:true },
    { id:'ddi-prov', mod:'prov', label:'🏭 Proveedores', tabla:true },
    { id:'ddi-mone', mod:'mone', label:'💱 Monedas',     tabla:true },
  ]},
  { grupo:'👥 Clientes', tnav:'tnav-cli', items:[
    { id:'ddi-cli',   mod:'cli',   label:'📋 Maestro de Clientes' },
    { id:'ddi-ficha', mod:'ficha', label:'🪪 Ficha del Cliente' },
    { id:'ddi-cpag',  mod:'cpag',  label:'💳 Condiciones de Pago', tabla:true },
    { id:'ddi-vend',  mod:'vend',  label:'👤 Vendedores',          tabla:true },
    { id:'ddi-cate',  mod:'cate',  label:'🏷️ Categorías',          tabla:true },
    { id:'ddi-grup',  mod:'grup',  label:'📂 Grupos',              tabla:true },
  ]},
  { grupo:'🛒 Compras', tnav:'tnav-cmp', items:[
    { id:'ddi-oc',   mod:'oc',   label:'📋 Ordenes de Compra' },
    { id:'ddi-desp', mod:'desp', label:'🚢 Despachos' },
  ]},
  { grupo:'🧾 Ventas', tnav:'tnav-ven', items:[
    { id:'ddi-fac',     mod:'fac',     label:'📄 Facturación' },
    { id:'ddi-vmes',    mod:'vmes',    label:'📅 Ventas mensuales x Artículo' },
    { id:'ddi-histart', mod:'histart', label:'📈 Historia por Artículo' },
    { id:'ddi-saldo',   mod:'saldo',   label:'📊 Saldos por Mes' },
    { id:'ddi-ctip',    mod:'ctip',    label:'📋 Tipos de Comprobantes' },
  ]},
  { grupo:'💼 Cobranzas', tnav:'tnav-cob', items:[
    { id:'ddi-reci', mod:'reci', label:'🧾 Recibos' },
    { id:'ddi-talo', mod:'talo', label:'📓 Talonarios' },
    { id:'ddi-rete', mod:'rete', label:'🧮 Tipo de Retenciones' },
    { id:'ddi-cart', mod:'cart', label:'💼 Cartera de Valores' },
  ]},
  { grupo:'🔑 Sistema', tnav:null, items:[
    { id:'ddi-usua', mod:'usuarios', label:'🔑 Usuarios' },
  ]},
];

// Módulos del panel de permisos, DERIVADOS del menú (mismo orden).
const MODULOS_PERM = MENU_DEF.flatMap(g => g.items.map(it => ({ key:it.mod, label:it.label })));

// Mapa pantalla→módulo (derivado de MENU_DEF: id 'ddi-<sub>' → mod).
const SUB_MODULO = {};
MENU_DEF.forEach(g => g.items.forEach(it => { SUB_MODULO[it.id.replace(/^ddi-/, '')] = it.mod; }));

// ¿El usuario puede VER esta pantalla? Lo usa la navegación (nav.js) para no
// abrir una pantalla sin permiso, aunque se fuerce el menú. (Sin módulo → permitida.)
function accesoSubPermitido(sub){
  const mod = SUB_MODULO[sub];
  if (!mod) return true;
  return puedeh(mod, 'ver');
}
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
    const res = await apiPost('/permisos', { updates });
    if (res.permisos) _permisos = res.permisos;   // refrescar con lo que devolvió el server
    document.getElementById('ov-permisos').classList.remove('open');
    toast('Permisos guardados', 'scs');
    aplicarPermisos();
  } catch(e) {
    console.error('savePermisos:', e);
    toast('Error al guardar permisos: '+e.message, 'err');
  }
}

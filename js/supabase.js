// ═══════════════════════════════════════════════════════════
// SUPABASE — Conexión y persistencia en la nube
// ═══════════════════════════════════════════════════════════

const IVA = {I:'Inscripto',N:'No Inscripto',C:'Cons. Final',E:'Exento',M:'Monotributo',L:'Ley 19640'};
const PCIA = {B:'Bs. As.',C:'C.A.B.A.',X:'Córdoba',F:'Santa Fe',M:'Mendoza',T:'Tucumán',E:'Entre Ríos',S:'Salta',J:'San Juan',H:'Chaco',K:'Misiones',Q:'Neuquén',N:'Río Negro',I:'Corrientes',L:'La Pampa',A:'Catamarca',U:'Chubut',O:'Formosa',Y:'Jujuy',R:'La Rioja',Z:'Santa Cruz',W:'San Luis',D:'Santiago del Estero',V:'Tierra del Fuego',G:'Uruguay'};

const SB_URL = 'https://blwxnrzrsgxscmsquwlz.supabase.co';
const SB_KEY = 'sb_publishable_ClOenbz_NYB1iAPn0VqOAw_Fe6RTlGR';
const SB_HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

function syncStatus(txt, color='#93b4d8') {
  const el = document.getElementById('b-sync');
  if (el) { el.textContent = txt; el.style.color = color; }
}

// Estado de guardado centralizado (usado por sbUpsert/sbDelete)
let _syncTimer = null;
function syncSaving() { syncStatus('💾 Guardando...', '#93b4d8'); }
function syncOk() {
  syncStatus('☁️ Guardado ✓', '#4ade80');
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => syncStatus('☁️ Conectado', '#93b4d8'), 2000);
}
function syncErr() { syncStatus('⚠️ Error al guardar', '#f87171'); }

async function getAuthToken() {
  const { data } = await sbClient.auth.getSession();
  return data.session?.access_token || SB_KEY;
}

// ── Acceso a la base SIEMPRE a través del server (cierre de seguridad) ──
// Lecturas vía GET /read/:tabla ; escrituras vía POST /write.
// El navegador YA NO toca Supabase directo: lo hace el server con service_role.

async function sbGet(table, params='') {
  const res = await apiGet('/read/' + table + (params ? ('?' + params) : ''));
  return res.rows;
}

async function sbGetAll(table, orderField, extraParams='') {
  const PAGE = 1000;
  let all = [], offset = 0;
  while (true) {
    const params = `order=${orderField}.asc&limit=${PAGE}&offset=${offset}${extraParams ? '&'+extraParams : ''}`;
    const rows = await sbGet(table, params);
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function sbUpsert(table, data) {
  syncSaving();
  try { await apiPost('/write', { op:'upsert', tabla:table, data }); syncOk(); }
  catch(e) { syncErr(); throw e; }
}

async function sbUpsertOnConflict(table, data, conflictCol) {
  syncSaving();
  try { await apiPost('/write', { op:'upsert', tabla:table, data, onConflict:conflictCol }); syncOk(); }
  catch(e) { syncErr(); throw e; }
}

async function sbDelete(table, match) {
  syncSaving();
  try { await apiPost('/write', { op:'delete', tabla:table, match }); syncOk(); }
  catch(e) { syncErr(); throw e; }
}

// ── Mapeo DB → objeto JS ─────────────────────────────────
function dbToArt(r) {
  return {
    ART_COD:   r.art_cod,
    ART_DES:   r.art_des,
    ART_RUB:   r.art_rub,
    ART_SRUB:  r.art_srub,
    ART_MARCA: r.art_marca,
    ART_PRE:   r.art_pre,
    ART_STK:   r.art_stk,
    ART_STKT:  r.art_stkt,
    ART_DEPH:  r.art_deph || 0,   // Stock depósito Hatsu
    ART_DEPT:  r.art_dept || 0,   // Stock depósito Tressa
    ART_ACT:   r.art_act,
    ART_ESTU:  r.art_estu,
    ART_GRUP:  r.art_grup,
    ART_SEX:   r.art_sex,
    ART_PROV:  r.art_prov,
    ART_MONEDA:r.art_moneda||'P',
    CODCASIO:  r.codcasio
  };
}

function artToDb(a) {
  return {
    art_cod:   a.ART_COD,
    art_des:   a.ART_DES,
    art_rub:   a.ART_RUB   || null,
    art_srub:  a.ART_SRUB  || null,
    art_marca: a.ART_MARCA || null,
    art_pre:   a.ART_PRE   || null,
    art_stk:   a.ART_STK   || 0,
    art_stkt:  a.ART_STKT  || 0,
    art_deph:  a.ART_DEPH  || 0,
    art_dept:  a.ART_DEPT  || 0,
    art_act:   a.ART_ACT   || 'S',
    art_estu:  a.ART_ESTU  || null,
    art_grup:  a.ART_GRUP  || null,
    art_sex:   a.ART_SEX   || null,
    art_prov:  a.ART_PROV  || null,
    art_moneda:a.ART_MONEDA|| 'P',
    codcasio:  a.CODCASIO  || null
  };
}

function dbToCli(r) {
  return { CLI_CODIGO:r.cli_codigo, CLI_RAZON:r.cli_razon, CLI_DOMIC:r.cli_domic,
    CLI_LOCAL:r.cli_local, CLI_CODPOS:r.cli_codpos, CLI_PROVIN:r.cli_provin,
    CLI_TELEF:r.cli_telef, CLI_VEND:r.cli_vend, CLI_EXPRE:r.cli_expre, CLI_CUIT:r.cli_cuit,
    CLI_IVA:r.cli_iva, CLI_NROIB:r.cli_nroib, CLI_TIPOIB:r.cli_tipoib, CLI_PERCIB:r.cli_percib,
    CLI_CONPAG:r.cli_conpag, CLI_DTO:r.cli_dto, CLI_OBS:r.cli_obs, CLI_UFEC:r.cli_ufec,
    CLI_PERCEP:r.cli_percep||[],
    CLI_INCOB:r.cli_incob, CLI_NODAR:r.cli_nodar, CLI_PREINC:r.cli_preinc,
    CLI_ABC:r.cli_abc, CLI_ICRED:r.cli_icred, CLI_FCRED:r.cli_fcred,
    CLI_ESTADO:r.cli_estado, CLI_EMAIL:r.cli_email, CLI_CATE:r.cli_cate };
}

function cliToDb(c) {
  return { cli_codigo:c.CLI_CODIGO, cli_razon:c.CLI_RAZON||null, cli_domic:c.CLI_DOMIC||null,
    cli_local:c.CLI_LOCAL||null, cli_codpos:c.CLI_CODPOS||null, cli_provin:c.CLI_PROVIN||null,
    cli_telef:c.CLI_TELEF||null, cli_vend:c.CLI_VEND||null, cli_expre:c.CLI_EXPRE||null,
    cli_cuit:c.CLI_CUIT||null, cli_iva:c.CLI_IVA||null, cli_nroib:c.CLI_NROIB||null,
    cli_tipoib:c.CLI_TIPOIB||null, cli_percib:c.CLI_PERCIB||null, cli_conpag:c.CLI_CONPAG||null,
    cli_dto:c.CLI_DTO||0, cli_obs:c.CLI_OBS||null, cli_ufec:c.CLI_UFEC||null,
    cli_percep: Array.isArray(c.CLI_PERCEP)?c.CLI_PERCEP:[],
    cli_incob:!!c.CLI_INCOB, cli_nodar:!!c.CLI_NODAR, cli_preinc:!!c.CLI_PREINC,
    cli_abc:c.CLI_ABC||null, cli_icred:c.CLI_ICRED||0, cli_fcred:c.CLI_FCRED||null,
    cli_estado:c.CLI_ESTADO||null, cli_email:c.CLI_EMAIL||null, cli_cate:c.CLI_CATE||null };
}

// ── Carga inicial ─────────────────────────────────────────
let _artsLoaded = false;
async function sbLoad() {
  syncStatus('☁️ Cargando...');
  try {
    const [resClis, resTabs] = await Promise.all([
      apiGet('/clientes'),                  // ← clientes desde TU server Fastify
      apiGet('/tablas'),                    // ← tablas auxiliares desde TU server Fastify
    ]);
    CLIS = resClis.clientes;    // ya vienen mapeados (CLI_*) desde el server
    TABLAS = resTabs.tablas;    // tablas auxiliares ya mapeadas desde el server
    // ARTÍCULOS: ya NO se cargan en el login (7726 filas). Se cargan diferidos
    // la primera vez que se abre un módulo que los usa (ensureArts()).
    ARTS = [];
    // Resetear TODOS los flags de carga diferida: cada login arranca limpio, así
    // los ensure*() vuelven a traer datos frescos (si no, quedan en 0 tras re-login).
    _artsLoaded = false; _artsLoading = false; _artsPromise = null;
    _recisLoaded = false; _recisLoading = false; _recisPromise = null;
    window._facsLoaded = false;
    window._despLoaded = false; window._despLoading = false;
    window._ocLoaded = false;   window._ocLoading = false;
    if (typeof _lcobPagos !== 'undefined') _lcobPagos = null;
    if (typeof _lcobCheq  !== 'undefined') _lcobCheq  = null;
    syncStatus(`☁️ ${CLIS.length} cli`, '#4ade80');
    setTimeout(()=>syncStatus('☁️ Conectado', '#93b4d8'), 3000);
    return true;
  } catch(e) {
    syncStatus('⚠️ Sin conexión', '#fbbf24');
    console.warn('Supabase load error:', e);
    return false;
  }
}

// Carga diferida de artículos: trae ARTS una sola vez, la primera vez que
// un módulo que los usa (artículos, despachos, facturación, histart, OC) los necesita.
let _artsLoading = false, _artsPromise = null;
function ensureArts() {
  if (_artsLoaded) return Promise.resolve();
  if (_artsPromise) return _artsPromise;
  _artsPromise = (async () => {
    try {
      const r = await apiGet('/articulos');
      ARTS = r.articulos || [];
    } catch(e) { console.error('ensureArts:', e); }
    _artsLoaded = true;
  })();
  return _artsPromise;
}

// Fuerza recargar los artículos frescos del server (ignora el cache _artsLoaded).
// Útil cuando pudo haber altas en otra sesión (ej. antes de importar despachos).
function reloadArts() {
  _artsLoaded = false; _artsPromise = null;
  return ensureArts();
}

// Carga diferida de recibos + cheques: trae RECIS, RECI_ITEMS y CHEQUES una sola
// vez, la primera vez que se abre un módulo que los usa (Recibos, Cartera, Ficha,
// Listado de Cobranzas). Antes se cargaban en el login (más lento).
let _recisLoaded = false, _recisLoading = false, _recisPromise = null;
function ensureRecibos() {
  if (_recisLoaded) return Promise.resolve();
  if (_recisPromise) return _recisPromise;
  _recisPromise = (async () => {
    try {
      if (typeof sbLoadRecis==='function')     await sbLoadRecis();
      if (typeof sbLoadReciItems==='function') await sbLoadReciItems();
      if (typeof sbLoadCheques==='function')   await sbLoadCheques();
    } catch(e) { console.error('ensureRecibos:', e); }
    _recisLoaded = true;
  })();
  return _recisPromise;
}

async function sbSaveArt(art, modo, ver) {
  syncSaving();
  try { const r = await apiPost('/articulos/guardar', { articulo: art, modo, ver }); syncOk(); return r; }
  catch(e) { syncErr(); throw e; }
}

async function sbSaveCli(cli) {
  syncSaving();
  try { await apiPost('/clientes/guardar', { cliente: cli }); syncOk(); }
  catch(e) { console.error('sbSaveCli:', e); syncErr(); }
}

async function deleteArt(cod) {
  syncSaving();
  try { await apiPost('/articulos/borrar', { codigo: cod }); syncOk(); }
  catch(e) { console.error('deleteArt:', e); syncErr(); }
}
async function deleteCli(cod) {
  syncSaving();
  try { await apiPost('/clientes/borrar', { codigo: cod }); syncOk(); }
  catch(e) { console.error('deleteCli:', e); syncErr(); }
}

const TAB_MAP = {
  RUBR:'rubros', SRUB:'subrubros', MARC:'marcas', PROV:'proveedores',
  VEND:'vendedores', CPAG:'condpago', PCIA:'provincias',
  GRUP:'grupos', CATE:'categorias', EXPR:'expresos', MONE:'monedas',
  CCOS:'centros_costos', PERC:'percepciones'
};

async function saveTabRow(row) {
  const tbl = TAB_MAP[row.TABLA];
  if (!tbl) return;
  syncSaving();
  try {
    await apiPost('/tablas/guardar', {
      tabla: row.TABLA, codigo: row.CODIGO, detalle: row.DETALLE||'',
      string1: row.STRING1||'', string2: row.STRING2||''
    });
    syncOk();
  } catch(e) { console.error('saveTabRow:', e); syncErr(); }
}

async function deleteTabRow(tabla, codigo) {
  const tbl = TAB_MAP[tabla];
  if (!tbl) return;
  syncSaving();
  try {
    await apiPost('/tablas/borrar', { tabla, codigo });
    syncOk();
  } catch(e) { console.error('deleteTabRow:', e); syncErr(); }
}

async function saveUsuario(cod, pass, nivel) {
  try { await sbUpsert('usuarios', { codigo: cod, password: pass, nivel }); }
  catch(e) { console.error('saveUsuario:', e); }
}
async function deleteUsuario(cod) {
  try { await sbDelete('usuarios', { codigo: cod }); }
  catch(e) { console.error('deleteUsuario:', e); }
}
async function loadUsuarios() {
  try {
    const res = await apiGet('/usuarios');
    if (!TABLAS['USUA']) TABLAS['USUA'] = [];
    TABLAS['USUA'] = res.usuarios.map(r => ({ TABLA:'USUA', CODIGO:r.codigo, DETALLE:'••••••', NIVEL:r.nivel||0, user_id:r.user_id, STRING1:'', STRING2:'', STRING3:'', FECHA1:'' }));
  } catch(e) { console.warn('loadUsuarios:', e); }
}

// ── CONFIG UI ─────────────────────────────────────────────
const _configUICache = {};

async function loadAllConfigUI() {
  try {
    const rows = await sbGet('config_ui');
    rows.forEach(r => {
      _configUICache[r.pantalla] = { orden: r.orden||[], activas: r.activas||[], labels: r.labels||{} };
    });
  } catch(e) { console.warn('loadAllConfigUI:', e); }
}

function getConfigUI(pantalla) { return _configUICache[pantalla] || null; }

async function saveConfigUI(pantalla, orden, activas, labels, chars) {
  const fila = { pantalla, orden, activas, labels };
  if (chars !== undefined) fila.chars = chars;
  await sbUpsertOnConflict('config_ui', fila, 'pantalla');
  _configUICache[pantalla] = { orden, activas, labels, chars: chars || {} };
}

function save() {}
function saveTablas() {}
function syncNow() { sbLoad().then(ok => { if(ok){ renderArts(); renderClis(); renderTab&&renderTab(); renderUsua&&renderUsua(); }}); }
// ═══════════════════════════════════════════════════════════
// SUPABASE — Conexión y persistencia en la nube
// ═══════════════════════════════════════════════════════════

const IVA = {I:'Inscripto',N:'No Inscripto',C:'Cons. Final',E:'Exento',M:'Monotributo',L:'Ley 19640'};
const PCIA = {B:'Bs. As.',C:'C.A.B.A.',X:'Córdoba',S:'Santa Fe',M:'Mendoza',T:'Tucumán',E:'Entre Ríos',A:'Salta',J:'San Juan',H:'Chaco',N:'Misiones',Q:'Neuquén',R:'Río Negro',W:'Corrientes',P:'Formosa',U:'Chubut',V:'T. del Fuego',Z:'Sta. Cruz'};

const SB_URL  = 'https://blwxnrzrsgxscmsquwlz.supabase.co';
const SB_KEY  = 'sb_publishable_ClOenbz_NYB1iAPn0VqOAw_Fe6RTlGR';
const SB_HDR  = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

function syncStatus(txt, color='#93b4d8') {
  const el = document.getElementById('b-sync');
  if (el) { el.textContent = txt; el.style.color = color; }
}

async function sbGet(table, params='') {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  if (!r.ok) throw new Error(`sbGet ${r.status}`);
  return r.json();
}

async function sbUpsert(table, data) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...SB_HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(data)
  });
  if (!r.ok) { const t=await r.text(); throw new Error(`sbUpsert ${r.status}: ${t.substring(0,150)}`); }
}

async function sbDelete(table, match) {
  const params = Object.entries(match).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, {
    method: 'DELETE',
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  if (!r.ok) throw new Error(`sbDelete ${r.status}`);
}

function dbToArt(r) {
  return { ART_COD:r.art_cod, ART_DES:r.art_des, ART_RUB:r.art_rub, ART_MARCA:r.art_marca,
    ART_PRE:r.art_pre, ART_PREMAY:r.art_premay, ART_PREESP:r.art_preesp,
    ART_STK:r.art_stk, ART_STKT:r.art_stkt, ART_PED:r.art_ped, ART_DTO:r.art_dto,
    ART_ACT:r.art_act, ART_ESTU:r.art_estu, ART_SERVIC:r.art_servic, ART_RESERV:r.art_reserv,
    ART_OFERTA:r.art_oferta, ART_SUBCOD:r.art_subcod, ART_GRUP:r.art_grup, ART_SEX:r.art_sex,
    ART_PROV:r.art_prov, ART_FRANQ:r.art_franq, ART_TAPA:r.art_tapa, CODCASIO:r.codcasio };
}
function artToDb(a) {
  return { art_cod:a.ART_COD, art_des:a.ART_DES, art_rub:a.ART_RUB, art_marca:a.ART_MARCA,
    art_pre:a.ART_PRE||null, art_premay:a.ART_PREMAY||null, art_preesp:a.ART_PREESP||null,
    art_stk:a.ART_STK||0, art_stkt:a.ART_STKT||0, art_ped:a.ART_PED||0, art_dto:a.ART_DTO||0,
    art_act:a.ART_ACT||'S', art_estu:a.ART_ESTU||null, art_servic:!!a.ART_SERVIC, art_reserv:!!a.ART_RESERV,
    art_oferta:!!(a.ART_OFERTA===true||a.ART_OFERTA==='T'), art_subcod:a.ART_SUBCOD||null,
    art_grup:a.ART_GRUP||null, art_sex:a.ART_SEX||null, art_prov:a.ART_PROV||null,
    art_franq:a.ART_FRANQ||null, art_tapa:a.ART_TAPA||null, codcasio:a.CODCASIO||null };
}
function dbToCli(r) {
  return { CLI_CODIGO:r.cli_codigo, CLI_RAZON:r.cli_razon, CLI_DOMIC:r.cli_domic,
    CLI_LOCAL:r.cli_local, CLI_CODPOS:r.cli_codpos, CLI_PROVIN:r.cli_provin,
    CLI_TELEF:r.cli_telef, CLI_VEND:r.cli_vend, CLI_EXPRE:r.cli_expre, CLI_CUIT:r.cli_cuit,
    CLI_IVA:r.cli_iva, CLI_NROIB:r.cli_nroib, CLI_TIPOIB:r.cli_tipoib, CLI_PERCIB:r.cli_percib,
    CLI_CONPAG:r.cli_conpag, CLI_DTO:r.cli_dto, CLI_OBS:r.cli_obs, CLI_UFEC:r.cli_ufec,
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
    cli_incob:!!c.CLI_INCOB, cli_nodar:!!c.CLI_NODAR, cli_preinc:!!c.CLI_PREINC,
    cli_abc:c.CLI_ABC||null, cli_icred:c.CLI_ICRED||0, cli_fcred:c.CLI_FCRED||null,
    cli_estado:c.CLI_ESTADO||null, cli_email:c.CLI_EMAIL||null, cli_cate:c.CLI_CATE||null };
}

async function sbLoad() {
  syncStatus('☁️ Cargando...');
  try {
    const [dArts, dClis, dRubr, dMarc, dProv, dVend, dCpag, dPcia, dGrup, dCate, dExpr] = await Promise.all([
      sbGet('articulos',   'order=art_cod.asc&limit=5000'),
      sbGet('clientes',    'order=cli_codigo.asc&limit=5000'),
      sbGet('rubros',      'order=codigo.asc'),
      sbGet('marcas',      'order=codigo.asc'),
      sbGet('proveedores', 'order=codigo.asc'),
      sbGet('vendedores',  'order=codigo.asc'),
      sbGet('condpago',    'order=codigo.asc'),
      sbGet('provincias',  'order=codigo.asc'),
      sbGet('grupos',      'order=codigo.asc'),
      sbGet('categorias',  'order=codigo.asc'),
      sbGet('expresos',    'order=codigo.asc'),
    ]);
    ARTS = dArts.map(dbToArt);
    CLIS = dClis.map(dbToCli);
    TABLAS = {};
    const mapTab = (key, rows, extra) => {
      TABLAS[key] = rows.map(r => ({
        TABLA: key, CODIGO: r.codigo, DETALLE: r.detalle||'',
        STRING1: extra ? (r[extra]||'') : '', STRING2:'', STRING3:'', FECHA1:'', NIVEL:0
      }));
    };
    mapTab('RUBR', dRubr); mapTab('MARC', dMarc); mapTab('PROV', dProv, 'direccion');
    mapTab('VEND', dVend); mapTab('CPAG', dCpag); mapTab('PCIA', dPcia, 'alicuota');
    mapTab('GRUP', dGrup); mapTab('CATE', dCate); mapTab('EXPR', dExpr, 'direccion');
    syncStatus('☁️ Conectado', '#4ade80');
    setTimeout(()=>syncStatus('☁️ Supabase', '#93b4d8'), 2500);
    return true;
  } catch(e) {
    syncStatus('⚠️ Sin conexión', '#fbbf24');
    console.warn('Supabase load error:', e);
    return false;
  }
}

async function sbSaveArt(art) {
  syncStatus('💾 Guardando...', '#93b4d8');
  try {
    await sbUpsert('articulos', artToDb(art));
    syncStatus('☁️ Guardado ✓', '#4ade80');
    setTimeout(()=>syncStatus('☁️ Supabase', '#93b4d8'), 2000);
  } catch(e) { syncStatus('⚠️ Error al guardar', '#f87171'); console.error(e); }
}

async function sbSaveCli(cli) {
  syncStatus('💾 Guardando...', '#93b4d8');
  try {
    await sbUpsert('clientes', cliToDb(cli));
    syncStatus('☁️ Guardado ✓', '#4ade80');
    setTimeout(()=>syncStatus('☁️ Supabase', '#93b4d8'), 2000);
  } catch(e) { syncStatus('⚠️ Error al guardar', '#f87171'); console.error(e); }
}

async function deleteArt(cod) {
  try { await sbDelete('articulos', { art_cod: cod }); }
  catch(e) { console.error('deleteArt:', e); }
}

async function deleteCli(cod) {
  try { await sbDelete('clientes', { cli_codigo: cod }); }
  catch(e) { console.error('deleteCli:', e); }
}

const TAB_MAP = {
  RUBR:'rubros', MARC:'marcas', PROV:'proveedores', VEND:'vendedores',
  CPAG:'condpago', PCIA:'provincias', GRUP:'grupos', CATE:'categorias', EXPR:'expresos'
};

async function saveTabRow(row) {
  const tbl = TAB_MAP[row.TABLA];
  if (!tbl) return;
  const data = { codigo: row.CODIGO, detalle: row.DETALLE||'' };
  if (tbl === 'proveedores' || tbl === 'expresos') data.direccion = row.STRING1||'';
  if (tbl === 'provincias') data.alicuota = parseFloat(row.STRING1)||0;
  try { await sbUpsert(tbl, data); }
  catch(e) { console.error('saveTabRow:', e); }
}

async function deleteTabRow(tabla, codigo) {
  const tbl = TAB_MAP[tabla];
  if (!tbl) return;
  try { await sbDelete(tbl, { codigo }); }
  catch(e) { console.error('deleteTabRow:', e); }
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
    const d = await sbGet('usuarios');
    if (!TABLAS['USUA']) TABLAS['USUA'] = [];
    TABLAS['USUA'] = d.map(r => ({ TABLA:'USUA', CODIGO:r.codigo, DETALLE:r.password||'', NIVEL:r.nivel||50, STRING1:'', STRING2:'', STRING3:'', FECHA1:'' }));
  } catch(e) { console.warn('loadUsuarios:', e); }
}

// ═══════════════════════════════════════════════════════════
// CONFIG UI — Configuración global de pantallas en Supabase
// Una fila por pantalla: orden, columnas activas y títulos
// ═══════════════════════════════════════════════════════════
const _configUICache = {};

async function loadAllConfigUI() {
  try {
    const rows = await sbGet('config_ui');
    rows.forEach(r => {
      _configUICache[r.pantalla] = {
        orden:   r.orden   || [],
        activas: r.activas || [],
        labels:  r.labels  || {}
      };
    });
  } catch(e) { console.warn('loadAllConfigUI:', e); }
}

function getConfigUI(pantalla) {
  return _configUICache[pantalla] || null;
}

async function saveConfigUI(pantalla, orden, activas, labels) {
  const r = await fetch(`${SB_URL}/rest/v1/config_ui?on_conflict=pantalla`, {
    method: 'POST',
    headers: { ...SB_HDR, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ pantalla, orden, activas, labels })
  });
  if (!r.ok) { const t=await r.text(); throw new Error(`saveConfigUI ${r.status}: ${t.substring(0,150)}`); }
  _configUICache[pantalla] = { orden, activas, labels };
}
function save() {}
function saveTablas() {}
function syncNow() { sbLoad().then(ok => { if(ok){ renderArts(); renderClis(); renderTab&&renderTab(); renderUsua&&renderUsua(); }}); }

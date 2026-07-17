// ═══════════════════════════════════════════════════════════
// USUARIOS, AUTH y DESPACHOS
// ═══════════════════════════════════════════════════════════

if (!TABLAS['USUA']) TABLAS['USUA'] = [];

let usuaSelIdx  = null;
let usuarioActual = null;

// ── LOGIN ─────────────────────────────────────────────────
async function doLogin() {
  const cod  = document.getElementById('l-user').value.trim().toUpperCase();
  const pass = document.getElementById('l-pass').value.trim();
  const errEl = document.getElementById('l-err');
  errEl.textContent = '';
  if (!cod) { errEl.textContent = 'Ingresá un usuario'; return; }
  if (!pass) { errEl.textContent = 'Ingresá la contraseña'; return; }

  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.style.cursor = 'wait'; }
  errEl.textContent = '⏳ Verificando...';

  try {
    const email = cod.toLowerCase() + '@sgv.local';
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password: pass });

    if (error) {
      errEl.textContent = 'Usuario o contraseña incorrectos';
      document.getElementById('l-pass').value = '';
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
      return;
    }

    const { data: uData } = await sbClient
      .from('usuarios')
      .select('codigo, nivel')
      .eq('user_id', data.user.id)
      .single();

    const nivel = uData ? parseInt(uData.nivel)||0 : 0;
    const codigo = uData ? uData.codigo : cod;

    usuarioActual = { codigo, nivel, user_id: data.user.id };
    errEl.textContent = '';
    loginOk();

  } catch(e) {
    console.error('doLogin:', e);
    errEl.textContent = 'Error al conectar';
    if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = ''; }
  }
}

// ─────────────────────────────────────────────────────────
//  Sesión fijada por navegador: si ya hay una sesión activa,
//  el usuario queda fijo (no editable) y solo se pide la clave.
//  Evita que convivan dos usuarios distintos en el mismo navegador.
// ─────────────────────────────────────────────────────────
async function initLoginScreen(){
  try{
    const { data:{ session } } = await sbClient.auth.getSession();
    const inp  = document.getElementById('l-user');
    const hint = document.getElementById('l-fija');
    if(session && session.user){
      const { data: u } = await sbClient.from('usuarios')
        .select('codigo').eq('user_id', session.user.id).maybeSingle();
      const cod = (u && u.codigo) ? u.codigo : '';
      if(cod && inp){
        inp.value = cod;
        inp.readOnly = true;
        inp.style.opacity = '0.65';
        inp.style.cursor = 'not-allowed';
        if(hint) hint.style.display = '';
        const pass = document.getElementById('l-pass'); if(pass) pass.focus();
        return;
      }
    }
    // sin sesión activa → login normal (usuario editable)
    if(inp){ inp.readOnly=false; inp.style.opacity=''; inp.style.cursor=''; }
    if(hint) hint.style.display='none';
  }catch(e){ console.warn('initLoginScreen:', e); }
}

// Ejecutar al cargar la página
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initLoginScreen);
else initLoginScreen();

// Si en OTRA pestaña cambia la sesión (login/logout), re-evaluar el bloqueo
window.addEventListener('storage', ()=>{
  const ls=document.getElementById('login-screen');
  if(ls && ls.style.display!=='none') initLoginScreen();
});

async function loginOk() {
  document.getElementById('login-screen').style.display = 'none';
  // Mostrar pantalla de carga ANTES de revelar la app
  showAppLoading(true);
  try {
    // Cargar TODOS los datos antes de mostrar la app (token ya disponible)
    if (typeof iniciarApp === 'function') await iniciarApp();
  } catch (e) {
    console.error('iniciarApp:', e);
    showAppLoadingError('No se pudieron cargar los datos. Revisá la conexión con el servidor e intentá de nuevo.');
    return;
  }
  // Datos cargados → preparar y revelar la app
  document.getElementById('b-user').textContent = usuarioActual.codigo;
  const ddiUsua = document.getElementById('ddi-usua');
  if (ddiUsua) ddiUsua.style.display = usuarioActual.nivel > 80 ? 'block' : 'none';
  const btnPerm = document.getElementById('btn-permisos');
  if (btnPerm) btnPerm.style.display = usuarioActual.codigo === 'RGRDELTA' ? '' : 'none';
  if (typeof aplicarPermisos === 'function') aplicarPermisos();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-welcome')?.classList.add('active');
  renderUsua && renderUsua();
  showAppLoading(false);
  document.getElementById('app').style.display = 'block';
  inactStart();  // control de inactividad (auto-logout a los 60 min)
}

// Pantalla de carga entre login y app
function showAppLoading(on) {
  const el = document.getElementById('app-loading');
  if (!el) return;
  if (on) {
    const txt = document.getElementById('app-loading-txt');
    if (txt) txt.textContent = 'Cargando datos…';
    const spin = el.querySelector('.app-load-spin');
    if (spin) spin.style.display = '';
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}
function showAppLoadingError(msg) {
  const el = document.getElementById('app-loading');
  if (!el) return;
  const spin = el.querySelector('.app-load-spin');
  if (spin) spin.style.display = 'none';
  const txt = document.getElementById('app-loading-txt');
  if (txt) txt.innerHTML =
    `<div style="color:#f87171;max-width:340px;text-align:center;line-height:1.5">${msg}</div>` +
    `<button onclick="location.reload()" style="margin-top:14px;padding:8px 18px;background:#4f8ef7;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Reintentar</button>`;
  el.style.display = 'flex';
}

async function cerrarSistema() {
  inactStop();  // frenar el control de inactividad
  await sbClient.auth.signOut();
  usuarioActual = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  const _lu=document.getElementById('l-user'); if(_lu){ _lu.value=''; _lu.readOnly=false; _lu.style.opacity=''; _lu.style.cursor=''; }
  document.getElementById('l-pass').value = '';
  document.getElementById('l-err').textContent = '';
  const _lf=document.getElementById('l-fija'); if(_lf) _lf.style.display='none';
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
}

// ─────────────────────────────────────────────────────────
//  Auto-logout por inactividad: 60 min, con aviso 1 min antes
// ─────────────────────────────────────────────────────────
const INACT_MS      = 60*60*1000;   // cierra a los 60 min sin actividad
const INACT_WARN_MS = 59*60*1000;   // avisa al minuto 59 (1 min antes)
let _inactTimer=null, _inactWarn=null, _inactLast=0;

function inactStart(){
  ['mousemove','mousedown','keydown','scroll','touchstart','click'].forEach(ev=>
    document.addEventListener(ev, inactReset, { passive:true }));
  inactReset();
}
function inactStop(){
  clearTimeout(_inactTimer); clearTimeout(_inactWarn);
  inactHideWarn();
}
function inactReset(){
  if(!usuarioActual) return;
  const warnVisible = document.getElementById('inact-warn')?.style.display==='flex';
  const now=Date.now();
  if(!warnVisible && now-_inactLast < 3000) return;   // throttle de actividad normal
  _inactLast=now;
  clearTimeout(_inactTimer); clearTimeout(_inactWarn);
  inactHideWarn();
  _inactWarn  = setTimeout(inactShowWarn, INACT_WARN_MS);
  _inactTimer = setTimeout(()=>{ inactStop(); if(typeof cerrarSistema==='function') cerrarSistema(); }, INACT_MS);
}
function inactShowWarn(){
  let ov=document.getElementById('inact-warn');
  if(!ov){
    ov=document.createElement('div');
    ov.id='inact-warn';
    ov.style.cssText='position:fixed;inset:0;z-index:10000;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font-family:system-ui,Arial,sans-serif';
    ov.innerHTML='<div style="background:#1a1d24;border:1px solid #333;border-radius:12px;padding:26px 30px;max-width:360px;text-align:center;color:#cfd6e4">'+
      '<div style="font-size:16px;margin-bottom:8px">Tu sesión está por cerrarse</div>'+
      '<div style="font-size:13px;color:#9aa6ba;line-height:1.5;margin-bottom:18px">Por inactividad vas a salir en 1 minuto. ¿Querés seguir conectado?</div>'+
      '<button id="inact-stay" style="padding:9px 22px;background:#4f8ef7;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">Seguir conectado</button>'+
      '</div>';
    document.body.appendChild(ov);
    document.getElementById('inact-stay').addEventListener('click', inactReset);
  }
  ov.style.display='flex';
}
function inactHideWarn(){
  const ov=document.getElementById('inact-warn');
  if(ov) ov.style.display='none';
}

// ── ABM USUARIOS ──────────────────────────────────────────
function getUsuaRows() {
  const q = (document.getElementById('usua-q')?.value||'').toLowerCase();
  return (TABLAS['USUA']||[]).filter(r =>
    !q || r.CODIGO.toLowerCase().includes(q)
  ).sort((a,b)=>(a.CODIGO||'').localeCompare(b.CODIGO||''));
}

function renderUsua() {
  const list = getUsuaRows();
  const body = document.getElementById('usua-body');
  if (!list.length) { body.innerHTML='<div class="empty">👥 Sin usuarios</div>'; return; }
  body.innerHTML = list.map((r,i) => {
    const sel = usuaSelIdx===i ? 'sel' : '';
    const nivelColor = parseInt(r.NIVEL)>80 ? 'ps' : 'po';
    return `<div class="tr-tab ${sel}" style="display:grid;grid-template-columns:120px 1fr 80px;gap:8px;padding:11px 16px;font-size:14px;cursor:pointer;transition:background .1s" onclick="selUsua(${i})">
      <span class="col-cod">${esc(r.CODIGO)}</span>
      <span style="color:var(--t2);font-size:13px">${'•'.repeat(Math.min(r.DETALLE.length,12))}</span>
      <span style="text-align:center"><span class="pill ${nivelColor}">${r.NIVEL}</span></span>
    </div>`;
  }).join('');
}

function selUsua(i) { usuaSelIdx=i; renderUsua(); }

function usuaAlta() {
  document.getElementById('uf-cod').value='';
  document.getElementById('uf-pass').value='';
  document.getElementById('uf-pass').placeholder='';
  document.getElementById('uf-nivel').value='';
  document.getElementById('uf-cod').disabled=false;
  document.getElementById('usua-mtit').textContent='Nuevo Usuario';
  setMtag('usua-mtag','ALTA','tag-a');
  document.getElementById('ov-usua').classList.add('open');
  window._ue='A';
}

function usuaModif() {
  if (usuaSelIdx===null) { toast('Seleccioná un usuario','err'); return; }
  const r = getUsuaRows()[usuaSelIdx];
  document.getElementById('uf-cod').value=r.CODIGO;
  document.getElementById('uf-cod').disabled=true;
  document.getElementById('uf-pass').value='';                                   // vacío: la clave NO se toca salvo que escribas una nueva
  document.getElementById('uf-pass').placeholder='(dejar vacío para no cambiarla)';
  document.getElementById('uf-nivel').value=r.NIVEL;
  document.getElementById('usua-mtit').textContent='Modificar: '+r.CODIGO;
  setMtag('usua-mtag','MODIFICACIÓN','tag-m');
  document.getElementById('ov-usua').classList.add('open');
  window._ue='M';
}

function usuaBaja() {
  if (usuaSelIdx===null) { toast('Seleccioná un usuario','err'); return; }
  const r = getUsuaRows()[usuaSelIdx];
  if (r.CODIGO === usuarioActual?.codigo) { toast('No podés eliminar tu propio usuario','err'); return; }
  confirm2('¿Dar de baja "'+r.CODIGO+'"?', 'El usuario será eliminado.', async ()=>{
    try {
      await apiPost('/usuarios/baja', { codigo:r.CODIGO });
      const idx=(TABLAS['USUA']||[]).findIndex(x=>x.CODIGO===r.CODIGO);
      if(idx>=0) TABLAS['USUA'].splice(idx,1);
      usuaSelIdx=null; renderUsua();
      toast('Usuario eliminado','scs');
    } catch(e) {
      toast('Error al eliminar: '+e.message,'err');
    }
  });
}

async function saveUsua() {
  const cod   = document.getElementById('uf-cod').value.trim().toUpperCase();
  const pass  = document.getElementById('uf-pass').value.trim();
  const nivel = parseInt(document.getElementById('uf-nivel').value)||0;
  if (!cod) { toast('El usuario es obligatorio','err'); return; }
  if (window._ue==='A' && !pass) { toast('La contraseña es obligatoria','err'); return; }
  if (nivel<1||nivel>99) { toast('El nivel debe ser entre 1 y 99','err'); return; }

  try {
    if (window._ue==='A') {
      const res = await apiPost('/usuarios/alta', { codigo:cod, password:pass, nivel });
      if (!TABLAS['USUA']) TABLAS['USUA']=[];
      TABLAS['USUA'].push({ TABLA:'USUA', CODIGO:cod, DETALLE:'••••••', NIVEL:nivel, user_id:res.user_id, STRING1:'', STRING2:'', STRING3:'', FECHA1:'' });
      toast('Usuario dado de alta','scs');
    } else {
      // pass vacío = NO se cambia la contraseña (solo el nivel)
      await apiPost('/usuarios/modificar', { codigo:cod, password:pass, nivel });
      const idx = TABLAS['USUA'].findIndex(r=>r.CODIGO===cod);
      if(idx>=0) { TABLAS['USUA'][idx].NIVEL=nivel; }
      toast(pass ? 'Usuario y contraseña actualizados' : 'Usuario modificado','scs');
    }
    closeOv('ov-usua'); renderUsua();
  } catch(e) {
    console.error('saveUsua:', e);
    toast('Error: '+e.message,'err');
  }
}


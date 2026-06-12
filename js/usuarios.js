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

  errEl.textContent = '⏳ Verificando...';

  try {
    // Autenticar con Supabase Auth
    const email = cod.toLowerCase() + '@sgv.local';
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password: pass });

    if (error) {
      errEl.textContent = 'Usuario o contraseña incorrectos';
      document.getElementById('l-pass').value = '';
      return;
    }

    // Obtener nivel desde tabla usuarios
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
  }
}

function loginOk() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('b-user').textContent = usuarioActual.codigo;
  const ddiUsua = document.getElementById('ddi-usua');
  if (ddiUsua) ddiUsua.style.display = usuarioActual.nivel > 80 ? 'block' : 'none';
  // Botón permisos solo para RGRDELTA
  const btnPerm = document.getElementById('btn-permisos');
  if (btnPerm) btnPerm.style.display = usuarioActual.codigo === 'RGRDELTA' ? '' : 'none';
  // Aplicar permisos a la UI
  if (typeof aplicarPermisos === 'function') aplicarPermisos();
  // Mostrar pantalla de bienvenida
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-welcome')?.classList.add('active');
  renderUsua && renderUsua();
}

async function cerrarSistema() {
  await sbClient.auth.signOut();
  usuarioActual = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-user').value = '';
  document.getElementById('l-pass').value = '';
  document.getElementById('l-err').textContent = '';
  document.querySelectorAll('.dd-menu').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.dd-arrow').forEach(a=>a.classList.remove('open'));
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
  document.getElementById('uf-pass').value=r.DETALLE;
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
  confirm2('¿Dar de baja "'+r.CODIGO+'"?', 'El usuario será eliminado.', ()=>{
    const idx=(TABLAS['USUA']||[]).findIndex(x=>x.CODIGO===r.CODIGO);
    if(idx>=0) TABLAS['USUA'].splice(idx,1);
    usuaSelIdx=null; deleteUsuario(r.CODIGO); renderUsua();
    toast('Usuario eliminado','scs');
  });
}

function saveUsua() {
  const cod   = document.getElementById('uf-cod').value.trim().toUpperCase();
  const pass  = document.getElementById('uf-pass').value.trim();
  const nivel = parseInt(document.getElementById('uf-nivel').value)||0;
  if (!cod||!pass) { toast('Usuario y contraseña son obligatorios','err'); return; }
  if (nivel<1||nivel>99) { toast('El nivel debe ser entre 1 y 99','err'); return; }
  if (!TABLAS['USUA']) TABLAS['USUA']=[];
  if (window._ue==='A') {
    if (TABLAS['USUA'].find(r=>r.CODIGO===cod)) { toast('Usuario ya existe','err'); return; }
    TABLAS['USUA'].push({ TABLA:'USUA', CODIGO:cod, DETALLE:pass, NIVEL:nivel, STRING1:'', STRING2:'', STRING3:'', FECHA1:'' });
    toast('Usuario dado de alta','scs');
  } else {
    const idx = TABLAS['USUA'].findIndex(r=>r.CODIGO===cod);
    if(idx>=0) TABLAS['USUA'][idx].DETALLE=pass, TABLAS['USUA'][idx].NIVEL=nivel;
    toast('Usuario modificado','scs');
  }
  saveUsuario(cod, pass, nivel);
  closeOv('ov-usua'); renderUsua();
}


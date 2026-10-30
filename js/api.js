// ═══════════════════════════════════════════════════════════
// API del servidor (modelo cliente-servidor)
// Pega al server Fastify usando el token de Supabase Auth que la
// app ya obtiene al loguearse.
// ═══════════════════════════════════════════════════════════

// En producción (GitHub Pages) pega al server público de Render.
// En tu máquina (local / file://) sigue usando localhost:3000.
const API_BASE = location.hostname.endsWith('github.io')
  ? 'https://sgv-server.onrender.com'
  : 'http://localhost:3000';

// Hace un GET autenticado a tu server y devuelve el JSON
// Token de la sesión. Si no está (la PC se suspendió, se cerró sesión en otra
// pestaña, venció la renovación) se intenta RENOVAR antes de dar error, para no
// perder lo que se está cargando (Ricardo, Oct 2026).
async function _apiToken(forzar) {
  if (!forzar) {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session?.access_token) return session.access_token;
  }
  try {
    const { data } = await sbClient.auth.refreshSession();
    if (data?.session?.access_token) return data.session.access_token;
  } catch (_) {}
  throw new Error('Se cerró la sesión. Abrí SGV en otra pestaña, ingresá, y volvé a esta para seguir (no recargues esta).');
}

// Hace un GET autenticado a tu server y devuelve el JSON
async function apiGet(ruta) {
  let token = await _apiToken();
  let r = await fetch(API_BASE + ruta, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) {                       // token vencido: se renueva y se reintenta una vez
    token = await _apiToken(true);
    r = await fetch(API_BASE + ruta, { headers: { Authorization: 'Bearer ' + token } });
  }
  if (!r.ok) {
    const txt = await r.text();
    throw new Error('API ' + r.status + ': ' + txt);
  }
  return r.json();
}

// Hace un POST autenticado a tu server y devuelve el JSON
async function apiPost(ruta, body) {
  const enviar = tk => fetch(API_BASE + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
    body: JSON.stringify(body || {})
  });
  let r = await enviar(await _apiToken());
  if (r.status === 401) r = await enviar(await _apiToken(true));
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('API ' + r.status));
  return data;
}

// ── TEST temporal (para correr en la consola del navegador) ──
async function probarArticulosServer() {
  const res = await apiGet('/articulos');
  console.log('✅ Artículos desde el server:', res.total);
  console.log('Primero:', res.articulos[0]);
  return res.total;
}

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
async function apiGet(ruta) {
  const { data: { session } } = await sbClient.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No hay sesión activa (¿estás logueado?)');

  const r = await fetch(API_BASE + ruta, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error('API ' + r.status + ': ' + txt);
  }
  return r.json();
}

// Hace un POST autenticado a tu server y devuelve el JSON
async function apiPost(ruta, body) {
  const { data: { session } } = await sbClient.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No hay sesión activa (¿estás logueado?)');

  const r = await fetch(API_BASE + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body || {})
  });
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

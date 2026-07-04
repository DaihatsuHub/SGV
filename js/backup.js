// ══════════════════════════════════════════════════════════
//  BACKUP — descarga 2 ZIP (uno con JSON, otro con CSV) de todas las tablas
//  Datos desde GET /backup/data (server, permiso 'backup')
// ══════════════════════════════════════════════════════════

// Carga JSZip desde CDN bajo demanda (igual patrón que ExcelJS).
function _bkLoadJSZip(){
  return new Promise((resolve, reject)=>{
    if(window.JSZip) return resolve(window.JSZip);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload  = ()=> resolve(window.JSZip);
    s.onerror = ()=> reject(new Error('No se pudo cargar JSZip'));
    document.head.appendChild(s);
  });
}

// Convierte un array de objetos a CSV (encabezados = claves de la 1ª fila).
function _bkToCSV(rows){
  if(!rows || !rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v)=>{
    if(v===null || v===undefined) return '';
    let s = (typeof v==='object') ? JSON.stringify(v) : String(v);
    if(/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  let out = cols.join(',') + '\r\n';
  for(const r of rows) out += cols.map(c=>esc(r[c])).join(',') + '\r\n';
  return out;
}

function _bkDownload(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
}

// Diálogo: pregunta qué formato descargar. Resuelve 'json' | 'csv' | 'both' | null (cancelar).
function _bkAskFormato(){
  return new Promise(resolve=>{
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--s2,#fff);color:var(--t1,#111);border:1px solid var(--b1,#ccc);border-radius:10px;padding:22px;min-width:300px;max-width:90vw;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:sans-serif';
    box.innerHTML = '<div style="font-size:16px;font-weight:700;margin-bottom:4px">🗄️ Backup</div>'
      + '<div style="font-size:13px;color:var(--t2,#777);margin-bottom:16px">¿Qué formato querés descargar?</div>';
    const cierra = (val)=>{ if(ov.parentNode) document.body.removeChild(ov); resolve(val); };
    const mk = (label, val, cls)=>{
      const b = document.createElement('button');
      b.textContent = label; b.className = 'btn ' + (cls||'');
      b.style.cssText = 'display:block;width:100%;margin:6px 0;padding:9px;border-radius:7px;cursor:pointer;font-size:14px';
      b.onclick = ()=> cierra(val);
      return b;
    };
    box.appendChild(mk('📄 JSON (fiel, para restaurar)', 'json', 'pri'));
    box.appendChild(mk('📊 CSV (se abre en Excel)',      'csv',  'pri'));
    box.appendChild(mk('📦 Los dos (JSON + CSV)',        'both', 'pri'));
    box.appendChild(mk('✕ Cancelar', null, ''));
    ov.appendChild(box);
    ov.onclick = (e)=>{ if(e.target===ov) cierra(null); };   // click afuera = cancelar
    document.body.appendChild(ov);
  });
}

// Genera y descarga el ZIP de JSON
async function _bkZipJson(JSZip, data, tablas, fecha){
  const z = new JSZip();
  for(const t of tablas) z.file(t + '.json', JSON.stringify(data[t] || [], null, 1));
  const blob = await z.generateAsync({ type:'blob', compression:'DEFLATE' });
  _bkDownload(blob, 'SGV_backup_JSON_' + fecha + '.zip');
}
// Genera y descarga el ZIP de CSV
async function _bkZipCsv(JSZip, data, tablas, fecha){
  const z = new JSZip();
  for(const t of tablas) z.file(t + '.csv', '\uFEFF' + _bkToCSV(data[t] || []));
  const blob = await z.generateAsync({ type:'blob', compression:'DEFLATE' });
  _bkDownload(blob, 'SGV_backup_CSV_' + fecha + '.zip');
}

async function hacerBackup(){
  // 1) Preguntar el formato ANTES de traer nada
  const fmt = await _bkAskFormato();
  if(!fmt) return;   // canceló

  // 2) Cargar el compresor
  let JSZip;
  try{ JSZip = await _bkLoadJSZip(); }
  catch(e){ if(typeof toast==='function') toast('No se pudo cargar el compresor','err'); return; }

  // 3) Traer los datos
  if(typeof toast==='function') toast('⏳ Generando backup…');
  let data;
  try{
    const r = await apiGet('/backup/data');
    if(!r || !r.ok || !r.tables) throw new Error('respuesta inválida');
    data = r.tables;
  }catch(e){
    console.error('backup:', e);
    if(typeof toast==='function') toast('Error al traer los datos del backup','err');
    return;
  }

  const fecha  = new Date().toISOString().slice(0,10);
  const tablas = Object.keys(data);

  // 4) Generar solo el/los ZIP elegidos
  if(fmt==='json' || fmt==='both'){
    try{ await _bkZipJson(JSZip, data, tablas, fecha); }
    catch(e){ console.error('zip json:', e); if(typeof toast==='function') toast('Error armando el ZIP JSON','err'); }
  }
  if(fmt==='both') await new Promise(res=>setTimeout(res, 600));   // pausa entre 2 descargas
  if(fmt==='csv' || fmt==='both'){
    try{ await _bkZipCsv(JSZip, data, tablas, fecha); }
    catch(e){ console.error('zip csv:', e); if(typeof toast==='function') toast('Error armando el ZIP CSV','err'); }
  }

  if(typeof toast==='function') toast('✅ Backup descargado (' + tablas.length + ' tablas)');
}

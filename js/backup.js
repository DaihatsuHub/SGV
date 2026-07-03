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

async function hacerBackup(){
  if(typeof toast==='function') toast('⏳ Generando backup…');

  let JSZip;
  try{ JSZip = await _bkLoadJSZip(); }
  catch(e){ if(typeof toast==='function') toast('No se pudo cargar el compresor','err'); return; }

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

  // ── ZIP 1: JSON ──
  try{
    const z = new JSZip();
    for(const t of tablas) z.file(t + '.json', JSON.stringify(data[t] || [], null, 1));
    const blob = await z.generateAsync({ type:'blob', compression:'DEFLATE' });
    _bkDownload(blob, 'SGV_backup_JSON_' + fecha + '.zip');
  }catch(e){ console.error('zip json:', e); if(typeof toast==='function') toast('Error armando el ZIP JSON','err'); }

  // pequeña pausa para que el navegador no bloquee la 2ª descarga
  await new Promise(res=>setTimeout(res, 600));

  // ── ZIP 2: CSV ──
  try{
    const z = new JSZip();
    for(const t of tablas) z.file(t + '.csv', '\uFEFF' + _bkToCSV(data[t] || []));
    const blob = await z.generateAsync({ type:'blob', compression:'DEFLATE' });
    _bkDownload(blob, 'SGV_backup_CSV_' + fecha + '.zip');
  }catch(e){ console.error('zip csv:', e); if(typeof toast==='function') toast('Error armando el ZIP CSV','err'); }

  if(typeof toast==='function') toast('✅ Backup descargado (' + tablas.length + ' tablas)');
}

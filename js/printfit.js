/* ===========================================================================
   IMPRESIÓN CON AUTO-AJUSTE  —  regla general de todos los listados de SGV
   ---------------------------------------------------------------------------
   REGLAS (Ricardo, Ago 2026):
   1. Hoja A4 VERTICAL. Sólo si no entra ni achicando, gira a apaisado.
   2. Objetivo de 70 RENGLONES POR HOJA: la letra se achica hasta lograrlo.
   3. Se ve como planilla de Excel: cebra, encabezado gris, totales destacados.
   4. Todos los listados muestran títulos de columna (thead, se repite por hoja).
   5. La razón social se corta a 30 caracteres (helper sgvCorta).

   CÓMO: la tabla toma su ancho NATURAL (width:auto + celdas nowrap, así nunca
   se parte un número). Se mide y se achica la LETRA — no zoom, que rompe la
   paginación y corta renglones al medio. Primero para que entre a lo ancho,
   después para llegar a los 70 renglones. Los padding van en em, así achican
   junto con la letra.

   Uso:
     sgvPrint({ titulo, subtitulo, cuerpo, estilos });
   =========================================================================== */

// Anchos y altos imprimibles en px (96 dpi) con márgenes de 10 mm.
// Se toma el MENOR entre A4 y Carta, así entra con cualquiera de las dos.
const SGV_PRINT_W = { vertical: 718, apaisado: 979 };
const SGV_PRINT_H = { vertical: 979, apaisado: 718 };
const SGV_PRINT_FILAS_HOJA = 70;   // objetivo de renglones por hoja
const SGV_PRINT_FS_BASE = 11;
const SGV_PRINT_FS_MIN  = 5.5;
const SGV_PRINT_DIAG    = false;   // true = imprime una línea de diagnóstico

// Corta textos largos para que no estiren la tabla (razón social: 30).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrintEstilosBase(){
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;margin:0;color:#111;line-height:1.15}
    h2{margin:0 0 2px;font-size:1.5em;white-space:normal;overflow-wrap:anywhere}
    .sub{color:#666;font-size:1em;margin-bottom:8px;white-space:normal;overflow-wrap:anywhere}
    h3{margin:12px 0 4px;color:#0a58ca;border-bottom:1px solid #ccc;padding-bottom:2px;font-size:1.15em}
    table{border-collapse:collapse;margin-bottom:8px;width:auto}
    th,td{padding:.16em .6em;border-bottom:1px solid #e5e5e5;text-align:left;white-space:nowrap;line-height:1.15}
    th{background:#e8eaed;font-weight:bold;border-bottom:1.5px solid #999}
    .n,.r{text-align:right;font-variant-numeric:tabular-nums}
    tbody tr:nth-child(even) td, table > tr:nth-child(even) td{background:#f4f5f7}
    tr.tot td,tr.fin td,tr.ant td{font-weight:bold;border-top:2px solid #0a58ca;background:#e8eaed}
    tr{page-break-inside:avoid;break-inside:avoid}
    thead{display:table-header-group}
    @media print{
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      th{background:#e8eaed !important}
      tbody tr:nth-child(even) td, table > tr:nth-child(even) td{background:#f4f5f7 !important}
      tr.tot td,tr.fin td,tr.ant td{background:#e8eaed !important}
    }
  `;
}

// Código que corre DENTRO de la ventana de impresión.
function sgvPrintScript(){
  return `
(function(){
  var W_V=${SGV_PRINT_W.vertical}, W_H=${SGV_PRINT_W.apaisado};
  var H_V=${SGV_PRINT_H.vertical}, H_H=${SGV_PRINT_H.apaisado};
  var FILAS=${SGV_PRINT_FILAS_HOJA}, FS0=${SGV_PRINT_FS_BASE}, FSMIN=${SGV_PRINT_FS_MIN};
  var D={};

  function setFs(fs){ document.body.style.fontSize=fs+'px'; }

  // Ancho natural: mide SÓLO las tablas. Un título largo no debe decidir
  // si la hoja va vertical o apaisada; el título se parte en varias líneas.
  function anchoTabla(){
    var ts=document.querySelectorAll('table'), w=0;
    for(var i=0;i<ts.length;i++){ if(ts[i].scrollWidth>w) w=ts[i].scrollWidth; }
    return w;
  }

  // Alto promedio de las primeras filas de datos
  function altoFila(){
    var trs=document.querySelectorAll('table tr');
    var n=Math.min(trs.length,12), suma=0, c=0;
    for(var i=0;i<n;i++){
      var h=trs[i].getBoundingClientRect().height;
      if(h>0){ suma+=h; c++; }
    }
    return c ? suma/c : 0;
  }

  function apaisar(){
    document.getElementById('sgv-page').textContent='@page{size:landscape;margin:10mm}';
  }
  function esApaisada(){
    return document.getElementById('sgv-page').textContent.indexOf('landscape')>=0;
  }

  // Achica la letra hasta que la tabla entre en el ancho dado
  function entrarEnAncho(target){
    var fs=FS0; setFs(fs);
    var w=anchoTabla();
    while(w>target && fs>FSMIN){
      fs=Math.round((fs-0.25)*100)/100;
      setFs(fs);
      w=anchoTabla();
    }
    return { fs:fs, ancho:w, entra:(w<=target) };
  }

  // Sigue achicando hasta llegar al objetivo de renglones por hoja
  function entrarEnAlto(fs, altoHoja){
    for(var i=0;i<5;i++){
      var h=altoFila();
      if(!h) break;
      if(Math.floor(altoHoja/h) >= FILAS) break;
      var nuevo=Math.max(FSMIN, Math.round(fs*(altoHoja/FILAS)/h*100)/100);
      if(nuevo >= fs) break;
      fs=nuevo; setFs(fs);
    }
    return fs;
  }

  function ajustar(){
    var r=entrarEnAncho(W_V);
    D.vAncho=r.ancho; D.vFs=r.fs; D.vEntra=r.entra;
    if(!r.entra){ apaisar(); r=entrarEnAncho(W_H); D.hAncho=r.ancho; D.hFs=r.fs; }
    var ap=esApaisada();
    D.fs=entrarEnAlto(r.fs, ap?H_H:H_V);
    D.ap=ap;
    // Si sobra ancho, estirar las tablas para que ocupen la hoja
    document.body.style.width=(ap?W_H:W_V)+'px';
    if(anchoTabla() < (ap?W_H:W_V)){
      var ts=document.querySelectorAll('table');
      for(var i=0;i<ts.length;i++) ts[i].style.width='100%';
    }
  }

  function diagnostico(){
    var d=document.getElementById('sgv-diag'); if(!d) return;
    var trs=document.querySelectorAll('table tr');
    var altoHoja=D.ap?H_H:H_V, h=altoFila();
    d.textContent='DIAG · '+(D.ap?'APAISADA':'VERTICAL')
      +' · vertical: '+Math.round(D.vAncho)+'/'+W_V+'px con letra '+D.vFs+' → '+(D.vEntra?'ENTRA':'NO ENTRA')
      +(D.ap?(' · apaisada: '+Math.round(D.hAncho)+'/'+W_H+'px con letra '+D.hFs):'')
      +' · letra final: '+D.fs+'px · alto fila: '+(Math.round(h*10)/10)+'px'
      +' · filas: '+trs.length+' · por hoja: '+(h?Math.floor(altoHoja/h):0);
  }

  window.onload=function(){
    try{ ajustar(); diagnostico(); }catch(e){ console.error('sgvPrint:',e); }
    setTimeout(function(){ window.print(); }, 200);
  };
})();
`;
}

function sgvPrint(opt){
  const o = opt || {};
  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  const diagDiv = SGV_PRINT_DIAG
    ? '<div id="sgv-diag" style="margin-top:10px;font-size:9px;color:#b45309;border-top:1px dashed #b45309;padding-top:4px"></div>'
    : '';

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style id="sgv-page">@page{size:portrait;margin:10mm}</style>' +
    '<style>' + sgvPrintEstilosBase() + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') + diagDiv +
    '<' + 'script>' + sgvPrintScript() + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

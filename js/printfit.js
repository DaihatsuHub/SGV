/* ===========================================================================
   IMPRESIÓN DE LISTADOS — SGV
   ---------------------------------------------------------------------------
   MODELO (acordado con Ricardo, Ago 2026):

   · 72 LÍNEAS POR HOJA — regla dura. El alto de fila se fija en
     alto_imprimible / 72, así siempre entran 72 renglones exactos.

   · Fuente PROPORCIONAL (Arial) con números tabulares. Arial mete ~30% más
     contenido que una monoespaciada al mismo cuerpo, así que más listados
     entran en vertical y con letra grande. `font-variant-numeric:tabular-nums`
     mantiene los números alineados en columna, que era lo único que aportaba
     la monoespaciada.

   · Dos escalones de letra, como en las matriciales:
       NORMAL     → el cuerpo más grande que permite el alto de fila
       COMPRIMIDA → se achica hasta que la tabla entre a lo ancho
     El corte lo decide si entra o no, no un número fijo de caracteres.

   · Hoja VERTICAL. Sólo si ni comprimida entra, gira a apaisado.

   OTRAS REGLAS: cebra tipo planilla · títulos de columna siempre (thead, se
   repite en cada hoja) · razón social a 30 caracteres (helper sgvCorta).

   Uso: sgvPrint({ titulo, subtitulo, cuerpo, estilos });
   =========================================================================== */

// Hoja A4 FORZADA por medidas exactas (Chrome respeta `size: 210mm 297mm`
// aunque el driver — p. ej. Microsoft Print to PDF — venga por defecto en Carta).
const SGV_PAGE_A4 = { vertical: '210mm 297mm', apaisado: '297mm 210mm' };
// Área imprimible en px (96 dpi) de una A4 con márgenes de 10 mm:
//   vertical  → 190mm x 277mm ≈ 718 x 1047
//   apaisado  → 277mm x 190mm ≈ 1047 x 718
const SGV_PRINT_W = { vertical: 718, apaisado: 1047 };
const SGV_PRINT_H = { vertical: 1047, apaisado: 718 };

const SGV_LINEAS_HOJA  = 72;     // líneas por página — regla dura
const SGV_PRINT_FS_MIN = 5;      // piso del cuerpo de letra
const SGV_PRINT_DIAG   = false;  // true = línea de diagnóstico al pie

// Corta textos largos para que no estiren la tabla (razón social: 30).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrintEstilosBase(){
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:11px;margin:0;color:#111;
         font-variant-numeric:tabular-nums}
    h2{margin:0 0 2px;font-size:1.4em;white-space:normal;overflow-wrap:anywhere}
    .sub{color:#555;font-size:1em;margin-bottom:6px;white-space:normal;overflow-wrap:anywhere}
    h3{margin:10px 0 3px;color:#0a58ca;border-bottom:1px solid #ccc;font-size:1.1em}
    table{border-collapse:collapse;margin-bottom:6px;width:auto}
    th,td{padding:0 .6em;border-bottom:1px solid #e5e5e5;text-align:left;white-space:nowrap;overflow:hidden}
    th{background:#e8eaed;font-weight:bold;border-bottom:1.5px solid #999}
    .n,.r{text-align:right}
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
  var LINEAS=${SGV_LINEAS_HOJA}, FS_MIN=${SGV_PRINT_FS_MIN};
  var D={};

  function setFs(fs){ document.body.style.fontSize=fs+'px'; }

  // Alto de fila fijo: garantiza las 72 líneas por hoja.
  // Devuelve también el cuerpo de letra máximo que entra en esa línea.
  function fijarAltoFila(altoHoja){
    var h=Math.floor(altoHoja/LINEAS*100)/100;
    document.getElementById('sgv-filas').textContent=
      'th,td{height:'+h+'px;line-height:'+(h-1)+'px;padding-top:0;padding-bottom:0}';
    // La letra ocupa ~70% del alto de fila: el resto es el espacio entre
    // renglones. Si se le da casi todo el alto, los renglones se pisan.
    return { alto:h, fsMax:Math.floor(h*0.70*100)/100 };
  }

  function anchoTabla(){
    var ts=document.querySelectorAll('table'), w=0;
    for(var i=0;i<ts.length;i++){ if(ts[i].scrollWidth>w) w=ts[i].scrollWidth; }
    return w;
  }

  function apaisar(){
    document.getElementById('sgv-page').textContent='@page{size:${SGV_PAGE_A4.apaisado};margin:10mm}';
  }
  function esApaisada(){
    return document.getElementById('sgv-page').textContent.indexOf('297mm 210mm')>=0;
  }

  // Arranca con la letra más grande que permite la línea y achica hasta entrar
  function ajustarEn(anchoHoja, altoHoja){
    var f=fijarAltoFila(altoHoja);
    var fs=f.fsMax;
    setFs(fs);
    var w=anchoTabla();
    var normal=(w<=anchoHoja);
    while(w>anchoHoja && fs>FS_MIN){
      fs=Math.round((fs-0.25)*100)/100;
      setFs(fs);
      w=anchoTabla();
    }
    return { fs:fs, fsMax:f.fsMax, alto:f.alto, ancho:w,
             modo:(normal?'NORMAL':'COMPRIMIDA'), entra:(w<=anchoHoja) };
  }

  function ajustar(){
    var r=ajustarEn(W_V, H_V);
    D.v=r;
    if(!r.entra){ apaisar(); r=ajustarEn(W_H, H_H); D.h=r; }
    D.r=r; D.ap=esApaisada();
    var anchoHoja=D.ap?W_H:W_V;
    document.body.style.width=anchoHoja+'px';
    if(anchoTabla()<anchoHoja){
      var ts=document.querySelectorAll('table');
      for(var i=0;i<ts.length;i++) ts[i].style.width='100%';
    }
  }

  function diagnostico(){
    var d=document.getElementById('sgv-diag'); if(!d) return;
    var trs=document.querySelectorAll('table tr');
    var anchoHoja=D.ap?W_H:W_V, altoHoja=D.ap?H_H:H_V;
    d.textContent='DIAG · '+(D.ap?'APAISADA':'VERTICAL')+' · letra '+D.r.modo
      +' · cuerpo '+D.r.fs+'px (máx '+D.r.fsMax+')'
      +' · alto fila '+D.r.alto+'px → líneas/hoja: '+Math.floor(altoHoja/D.r.alto)
      +' · tabla '+Math.round(D.r.ancho)+'/'+anchoHoja+'px'
      +' · filas totales: '+trs.length;
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
    ? '<div id="sgv-diag" style="margin-top:8px;font-size:9px;color:#b45309;border-top:1px dashed #b45309;padding-top:3px"></div>'
    : '';

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style id="sgv-page">@page{size:' + SGV_PAGE_A4.vertical + ';margin:10mm}</style>' +
    '<style>' + sgvPrintEstilosBase() + (o.estilos || '') + '</style>' +
    '<style id="sgv-filas"></style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') + diagDiv +
    '<' + 'script>' + sgvPrintScript() + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

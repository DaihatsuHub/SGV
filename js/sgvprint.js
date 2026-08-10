/* ===========================================================================
   IMPRESIÓN DE LISTADOS — SGV
   ---------------------------------------------------------------------------
   REGLAS (Ricardo, Ago 2026):
     · Hoja A4 VERTICAL siempre (forzada por medidas exactas en mm).
     · 72 LÍNEAS por hoja: alto de renglón fijo = alto_util / 72.
     · Si la tabla no entra a lo ancho, se ACHICA LA LETRA. No se gira la hoja.
     · Cada columna toma el ancho que necesita: nada se corta ni se aplasta.
     · Se ve como planilla: cebra, encabezado gris, totales destacados,
       títulos de columna repetidos en cada hoja.

   Uso: sgvPrint({ titulo, subtitulo, cuerpo, estilos })
   =========================================================================== */

// A4 con márgenes de 10 mm → útil 190 x 277 mm ≈ 718 x 1047 px a 96 dpi
const SGV_PAGE_SIZE = '210mm 297mm';
const SGV_PAGE_W    = 718;
const SGV_PAGE_H    = 1047;
const SGV_LINEAS    = 72;    // líneas por hoja
const SGV_FS        = 10;    // cuerpo de letra inicial (px)
const SGV_FS_MIN    = 5;     // hasta acá puede achicar

// Corta textos largos (razón social: 30 caracteres).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrintEstilos(){
  const h = Math.floor(SGV_PAGE_H / SGV_LINEAS * 100) / 100;
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${SGV_FS}px;margin:0;color:#111;
         font-variant-numeric:tabular-nums;width:${SGV_PAGE_W}px}

    /* Título fijo: no encoge cuando se achica la letra de la tabla */
    h2{margin:0 0 2px;font-size:15px}
    .sub{color:#555;font-size:10px;margin-bottom:6px}
    h3{margin:8px 0 3px;color:#0a58ca;border-bottom:1px solid #ccc;font-size:12px}

    /* max-content = cada columna toma lo que necesita. min-width:100% para
       que, si sobra, la tabla igual ocupe el ancho de la hoja. */
    table{width:max-content;min-width:100%;border-collapse:collapse;margin-bottom:6px}
    th,td{padding:0 6px;border-bottom:1px solid #e5e5e5;text-align:left;
          white-space:nowrap;height:${h}px;line-height:${h - 1}px}
    .n,.r{text-align:right}

    th{background:#e8eaed;font-weight:bold;border-bottom:1.5px solid #999}
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

// Corre DENTRO de la ventana de impresión: achica la letra hasta que entre.
function sgvPrintScript(){
  return `
(function(){
  var W=${SGV_PAGE_W}, FS=${SGV_FS}, FSMIN=${SGV_FS_MIN};
  function ancho(){
    var ts=document.querySelectorAll('table'), w=0;
    for(var i=0;i<ts.length;i++){
      ts[i].style.minWidth='0';                 // medir sin el estirado al 100%
      var a=ts[i].getBoundingClientRect().width;
      ts[i].style.minWidth='100%';
      if(a>w) w=a;
    }
    return w;
  }
  function ajustar(){
    var fs=FS;
    document.body.style.fontSize=fs+'px';
    while(ancho()>W && fs>FSMIN){
      fs=Math.round((fs-0.25)*100)/100;
      document.body.style.fontSize=fs+'px';
    }
  }
  window.onload=function(){
    try{ ajustar(); }catch(e){ console.error('sgvPrint:',e); }
    setTimeout(function(){ window.print(); }, 200);
  };
})();
`;
}

function sgvPrint(opt){
  const o = opt || {};
  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style>@page{size:' + SGV_PAGE_SIZE + ';margin:10mm}</style>' +
    '<style>' + sgvPrintEstilos() + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') +
    '<' + 'script>' + sgvPrintScript() + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

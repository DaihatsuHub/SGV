/* ===========================================================================
   IMPRESIÓN DE LISTADOS — SGV
   ---------------------------------------------------------------------------
   MODELO (Ricardo, Ago 2026):
     · Hoja A4 VERTICAL siempre (forzada por medidas exactas en mm).
     · 72 LÍNEAS por hoja: el alto de renglón es fijo = alto_util / 72.
     · Letra de cuerpo fijo y legible. NO se achica sola.
     · Se ve como planilla: cebra, encabezado gris, totales destacados,
       títulos de columna repetidos en cada hoja.

   POR QUÉ NO MIDE NADA:
     Las versiones anteriores medían el ancho de la tabla para decidir cuánto
     achicar la letra o si girar la hoja. Esa medición resultó poco confiable
     (el ancho no bajaba al achicar la letra) y terminaba con letras de 5px o
     girando hojas sin necesidad. Ahora la tabla SIEMPRE ocupa el ancho de la
     hoja y son las COLUMNAS las que se adaptan:
       · las columnas de números (.n / .r) conservan su ancho natural,
         así ninguna cifra se corta nunca;
       · las columnas de texto se reparten lo que queda y, si no entran,
         cortan con puntos suspensivos.
     Resultado: entra siempre, sin medir, sin girar y con letra legible.

   Uso:   sgvPrint({ titulo, subtitulo, cuerpo, estilos })
   Ancho: si un listado es realmente muy ancho, pasarle apaisado:true.
   =========================================================================== */

const SGV_PAGE = {
  vertical: { size:'210mm 297mm', alto: 1047 },   // A4 vertical, útil 190x277mm
  apaisado: { size:'297mm 210mm', alto:  718 }    // A4 apaisada, útil 277x190mm
};
const SGV_LINEAS_HOJA = 72;   // líneas por hoja en A4 vertical
const SGV_FS = 10;            // cuerpo de letra de los listados (px)

// Corta textos largos (razón social: 30 caracteres).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrintEstilos(apaisado){
  const alto  = apaisado ? SGV_PAGE.apaisado.alto : SGV_PAGE.vertical.alto;
  // El alto de renglón sale SIEMPRE de la hoja vertical: así el renglón mide
  // igual en las dos orientaciones y en apaisado simplemente entran menos.
  const hFila = Math.floor(SGV_PAGE.vertical.alto / SGV_LINEAS_HOJA * 100) / 100;
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${SGV_FS}px;margin:0;color:#111;
         font-variant-numeric:tabular-nums}

    /* Título fijo: no depende del tamaño de la tabla */
    h2{margin:0 0 2px;font-size:15px}
    .sub{color:#555;font-size:10px;margin-bottom:6px}
    h3{margin:10px 0 3px;color:#0a58ca;border-bottom:1px solid #ccc;font-size:12px}

    /* La tabla ocupa el ancho de la hoja; se adaptan las columnas */
    table{width:100%;border-collapse:collapse;margin-bottom:6px;table-layout:auto}
    th,td{padding:0 6px;border-bottom:1px solid #e5e5e5;text-align:left;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          max-width:0;                      /* columnas de texto: se reparten */
          height:${hFila}px;line-height:${hFila - 1}px}
    /* Columnas de números: ancho natural, nunca se cortan */
    .n,.r{text-align:right;width:1%;max-width:none;white-space:nowrap}

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

function sgvPrint(opt){
  const o = opt || {};
  const ap = !!o.apaisado;
  const pg = ap ? SGV_PAGE.apaisado : SGV_PAGE.vertical;
  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style>@page{size:' + pg.size + ';margin:10mm}</style>' +
    '<style>' + sgvPrintEstilos(ap) + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') +
    '<' + 'script>window.onload=function(){setTimeout(function(){window.print();},200);};<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

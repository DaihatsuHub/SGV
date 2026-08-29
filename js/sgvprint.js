/* ===========================================================================
   IMPRESIÓN DE LISTADOS — SGV
   ---------------------------------------------------------------------------
   REGLAS (Ricardo, Ago 2026):
     · Hoja A4 VERTICAL (forzada por medidas exactas en mm).
     · 72 LÍNEAS por hoja: alto de renglón FIJO = alto_util / 72.
     · Si la tabla no entra a lo ancho, se ACHICA LA LETRA hasta que entren
       TODAS las columnas.
     · ACHICAR LA LETRA NO SIGNIFICA APRETAR LOS RENGLONES: el alto de fila y
       el interlineado van en px FIJOS y NO dependen del cuerpo de letra. Al
       achicar sólo se angosta el texto; siguen entrando 72 renglones por hoja.
     · Se ve como planilla: cebra, encabezado gris, totales destacados,
       títulos de columna repetidos en cada hoja.

   CÓMO SE CALCULA EL TAMAÑO DE LETRA
     ANTES de abrir la ventana de impresión. Se parsea el HTML del listado, se
     recorre cada tabla, se mide el texto real de cada celda con canvas y se
     resuelve el cuerpo de letra que hace entrar la tabla más ancha. El número
     ya resuelto se escribe en el CSS de la ventana.

     Se hace acá y no adentro de la ventana porque acá es verificable: si algo
     falla, se ve en la consola de la aplicación. Las versiones anteriores
     calculaban dentro de la ventana de impresión y no había forma de saber si
     el cálculo llegó a ejecutarse.

   Uso: sgvPrint({ titulo, subtitulo, cuerpo, estilos, apaisado })
   =========================================================================== */

// A4 con márgenes de 10 mm.
//   vertical → útil 190 x 277 mm ≈  718 x 1047 px a 96 dpi
//   apaisado → útil 277 x 190 mm ≈ 1047 x  718 px
const SGV_PAGE = {
  vertical: { size:'210mm 297mm', ancho: 718  },
  apaisado: { size:'297mm 210mm', ancho: 1047 }
};
const SGV_PAGE_H = 1047;   // alto útil de la A4 vertical: define las 72 líneas
const SGV_LINEAS = 72;     // líneas por hoja — REGLA DURA
const SGV_FS     = 9;      // cuerpo de letra máximo
const SGV_FS_MIN = 4.5;    // hasta acá puede achicar para que entre todo
const SGV_PAD    = 12;     // relleno horizontal de cada celda (6px por lado)
const SGV_BORDE  = 1;      // borde entre columnas
const SGV_HOLGURA= 1.06;   // 6% de reserva: kerning, redondeos, bordes

// Corta textos largos (razón social: 30 caracteres).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

// ── Medición de texto ──────────────────────────────────────
// Devuelve el ancho en px de un texto en Arial a font-size 1px.
let _sgvCtx = null;
function sgvAnchoTexto(txt, negrita){
  if(!_sgvCtx) _sgvCtx = document.createElement('canvas').getContext('2d');
  const REF = 100;
  _sgvCtx.font = (negrita ? 'bold ' : '') + REF + 'px Arial, Helvetica, sans-serif';
  return _sgvCtx.measureText(String(txt == null ? '' : txt)).width / REF;
}

// Recorre una tabla y devuelve cuánto texto tiene la columna más ancha de cada
// una (en px por cada px de cuerpo) y cuántas columnas son.
function sgvMedirTabla(tabla){
  const anchoCol = [];
  let nCols = 0;
  const filas = tabla.rows || [];
  for(const fila of filas){
    let col = 0;
    for(const celda of (fila.cells || [])){
      const span = celda.colSpan || 1;
      if(span > 1){ col += span; continue; }        // las combinadas no mandan
      const txt = (celda.textContent || '').trim();
      const w = sgvAnchoTexto(txt, celda.tagName === 'TH');
      if(anchoCol[col] === undefined || w > anchoCol[col]) anchoCol[col] = w;
      col++;
    }
    if(col > nCols) nCols = col;
  }
  let texto = 0;
  for(let k = 0; k < nCols; k++) texto += (anchoCol[k] || 0);
  return { texto, cols: nCols };
}

// Cuerpo de letra con el que TODAS las tablas del listado entran a lo ancho.
// Ancho de una tabla = texto × fs × holgura + columnas × (padding + borde)
function sgvCuerpoQueEntra(htmlCuerpo, anchoHoja){
  let fs = SGV_FS;
  try{
    const doc = new DOMParser().parseFromString('<body>' + (htmlCuerpo || '') + '</body>', 'text/html');
    const tablas = doc.querySelectorAll('table');
    for(const t of tablas){
      const m = sgvMedirTabla(t);
      if(m.texto <= 0 || m.cols <= 0) continue;
      const fijo = m.cols * (SGV_PAD + SGV_BORDE);
      const disp = anchoHoja - fijo;
      if(disp <= 0){ fs = SGV_FS_MIN; continue; }
      const cabe = disp / (m.texto * SGV_HOLGURA);
      if(cabe < fs) fs = cabe;
    }
  }catch(e){
    console.error('sgvPrint: no se pudo calcular el tamaño de letra', e);
    return SGV_FS_MIN;                              // ante la duda, la más chica
  }
  fs = Math.floor(fs * 4) / 4;                      // redondear a 0.25 hacia abajo
  return Math.max(SGV_FS_MIN, Math.min(SGV_FS, fs));
}

function sgvPrintEstilos(ancho, fs){
  // Alto de renglón: SIEMPRE el de la hoja vertical. Va en px fijos, así que
  // NO se achica junto con la letra.
  const h = Math.floor(SGV_PAGE_H / SGV_LINEAS * 100) / 100;
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${fs}px;margin:0;color:#111;
         font-variant-numeric:tabular-nums;width:${ancho}px}

    /* Título fijo: no encoge cuando se achica la letra de la tabla */
    h2{margin:0 0 2px;font-size:15px}
    .sub{color:#555;font-size:10px;margin-bottom:6px}
    h3{margin:8px 0 3px;color:#0a58ca;border-bottom:1px solid #ccc;font-size:12px}

    table{width:max-content;min-width:100%;max-width:${ancho}px;
          border-collapse:collapse;margin-bottom:6px;table-layout:auto}

    /* ALTO DE RENGLÓN FIJO EN PX: achicar la letra nunca aprieta los renglones */
    th,td{padding:0 ${SGV_PAD / 2}px;border-bottom:1px solid #e5e5e5;text-align:left;
          white-space:nowrap;height:${h}px;line-height:${h - 1}px;vertical-align:middle}
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

function sgvPrint(opt){
  const o = opt || {};
  const pg = o.apaisado ? SGV_PAGE.apaisado : SGV_PAGE.vertical;

  // El tamaño de letra se resuelve ACÁ, antes de abrir la ventana
  const fs = sgvCuerpoQueEntra(o.cuerpo, pg.ancho);

  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style>@page{size:' + pg.size + ';margin:10mm}</style>' +
    '<style>' + sgvPrintEstilos(pg.ancho, fs) + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') +
    '<' + 'script>window.onload=function(){setTimeout(function(){window.print();},250);};<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

// Diagnóstico: qué letra elegiría para un listado, sin imprimir.
// Desde la consola:  sgvPrintDiag(_sdData ? document.getElementById('sd-body').innerHTML : '')
function sgvPrintDiag(htmlCuerpo, apaisado){
  const ancho = apaisado ? SGV_PAGE.apaisado.ancho : SGV_PAGE.vertical.ancho;
  const doc = new DOMParser().parseFromString('<body>' + (htmlCuerpo || '') + '</body>', 'text/html');
  const out = [];
  for(const t of doc.querySelectorAll('table')){
    const m = sgvMedirTabla(t);
    const fs = sgvCuerpoQueEntra(t.outerHTML, ancho);
    out.push({ columnas: m.cols, textoPorPx: Math.round(m.texto * 100) / 100,
               letra: fs, anchoFinal: Math.round(m.texto * fs * SGV_HOLGURA + m.cols * (SGV_PAD + SGV_BORDE)),
               hoja: ancho });
  }
  return { letraElegida: sgvCuerpoQueEntra(htmlCuerpo, ancho), tablas: out };
}

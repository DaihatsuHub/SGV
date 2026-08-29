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
const SGV_HOLGURA= 1.06;   // 6% de reserva de la estimación (respaldo)
// RESERVA sobre el ancho de la hoja. La medición del listado en la página da
// un ancho algo menor que el que termina produciendo la impresora: con el
// cálculo justo, la última columna quedaba cortada. Este margen lo cubre.
// Cuesta medio punto de letra y garantiza que entren TODAS las columnas.
const SGV_RESERVA= 0.95;

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

// Estimación por medición de texto. Se usa como punto de partida y como
// respaldo si la medición real no está disponible.
function sgvEstimar(htmlCuerpo, anchoHoja){
  let fs = SGV_FS;
  try{
    const doc = new DOMParser().parseFromString('<body>' + (htmlCuerpo || '') + '</body>', 'text/html');
    for(const t of doc.querySelectorAll('table')){
      const m = sgvMedirTabla(t);
      if(m.texto <= 0 || m.cols <= 0) continue;
      const disp = anchoHoja - m.cols * (SGV_PAD + SGV_BORDE);
      if(disp <= 0){ fs = SGV_FS_MIN; continue; }
      const cabe = disp / (m.texto * SGV_HOLGURA);
      if(cabe < fs) fs = cabe;
    }
  }catch(e){
    console.error('sgvPrint: no se pudo estimar el tamaño de letra', e);
    return SGV_FS_MIN;
  }
  fs = Math.floor(fs * 4) / 4;
  return Math.max(SGV_FS_MIN, Math.min(SGV_FS, fs));
}

// ── Medición REAL ──────────────────────────────────────────
// Se arma el listado en un contenedor invisible de ESTA página, con las mismas
// reglas de ancho que va a tener al imprimir, y se mide la tabla de verdad.
// Acá la medición de layout SÍ es confiable (la ventana de impresión no lo era)
// y además es verificable desde la consola con sgvPrintDiag().
//
// Devuelve el ancho de la tabla más ancha a ese cuerpo de letra, o 0 si el
// entorno no calcula layout (por ejemplo en pruebas fuera del navegador).
function sgvMedirReal(htmlCuerpo, fs, estilosExtra){
  const ID = 'sgv-medidor';
  document.getElementById(ID)?.remove();
  const cont = document.createElement('div');
  cont.id = ID;
  // Sólo las reglas que afectan el ANCHO, acotadas al medidor para no tocar la app
  cont.innerHTML =
    '<style>' +
    `#${ID}{position:fixed;left:-99999px;top:0;width:auto;visibility:hidden;` +
      `font-family:Arial,Helvetica,sans-serif;font-size:${fs}px;font-variant-numeric:tabular-nums}` +
    `#${ID} table{width:max-content;border-collapse:collapse}` +
    `#${ID} th,#${ID} td{padding:0 ${SGV_PAD / 2}px;white-space:nowrap;border-bottom:1px solid #eee}` +
    `#${ID} th{font-weight:bold}` +
    (estilosExtra || '').replace(/(^|\})\s*([^@{}]+)\{/g, (m0, cierre, sel) =>
      cierre + sel.split(',').map(x => `#${ID} ` + x.trim()).join(',') + '{') +
    '</style>' + (htmlCuerpo || '');
  document.body.appendChild(cont);
  let max = 0;
  for(const t of cont.querySelectorAll('table')){
    const w = t.getBoundingClientRect().width;
    if(w > max) max = w;
  }
  cont.remove();
  return Math.ceil(max);
}

// Cuerpo de letra con el que el listado entra a lo ancho — REGLA GENERAL,
// vale para cualquier listado sin ajustes por módulo.
//
// El ancho de una tabla es LINEAL respecto del cuerpo de letra:
//     ancho(fs) = fijo + pendiente × fs
// donde `fijo` son los paddings y bordes (no dependen de la letra) y
// `pendiente` es el texto. Verificado midiendo el subdiario real:
//     9px→761   8px→691   7px→621   6px→551      (exactamente 70px por punto)
//
// Con DOS mediciones se despejan las dos incógnitas y el tamaño exacto sale de
// una cuenta, sin iterar ni estimar:
//     fs = (anchoHoja − fijo) / pendiente
//
// Se redondea hacia abajo a 0.25 y se verifica una vez.
function sgvCuerpoQueEntra(htmlCuerpo, anchoHoja, estilosExtra){
  try{
    const A = 10, B = 5;                       // dos cuerpos de referencia
    const wA = sgvMedirReal(htmlCuerpo, A, estilosExtra);
    const wB = sgvMedirReal(htmlCuerpo, B, estilosExtra);

    // Sin layout (pruebas fuera del navegador): queda la estimación por texto
    if(!wA || !wB) return sgvEstimar(htmlCuerpo, anchoHoja);

    const pendiente = (wA - wB) / (A - B);     // px de ancho por px de letra
    const fijo      = wA - pendiente * A;      // paddings y bordes
    if(pendiente <= 0) return SGV_FS;

    const objetivo = anchoHoja * SGV_RESERVA;
    let fs = (objetivo - fijo) / pendiente;
    fs = Math.floor(fs * 4) / 4;               // a 0.25 hacia abajo
    fs = Math.max(SGV_FS_MIN, Math.min(SGV_FS, fs));

    // Verificación: si por redondeo del navegador todavía se pasa, bajar.
    let vueltas = 0;
    while(fs > SGV_FS_MIN && vueltas < 20 &&
          sgvMedirReal(htmlCuerpo, fs, estilosExtra) > objetivo){
      fs = Math.round((fs - 0.25) * 100) / 100;
      vueltas++;
    }
    return fs;
  }catch(e){
    console.error('sgvPrint: falló la medición, queda la estimación', e);
    return sgvEstimar(htmlCuerpo, anchoHoja);
  }
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

    /* SIN max-width: con las celdas en nowrap la tabla no puede achicarse, así
       que un max-width no la comprime — sólo la hace desbordar en silencio.
       El ancho se resuelve con el tamaño de letra, ya calculado antes de abrir
       esta ventana. */
    table{width:max-content;min-width:100%;border-collapse:collapse;margin-bottom:6px}

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
  const fs = sgvCuerpoQueEntra(o.cuerpo, pg.ancho, o.estilos);

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
function sgvPrintDiag(htmlCuerpo, apaisado, estilosExtra){
  const ancho = apaisado ? SGV_PAGE.apaisado.ancho : SGV_PAGE.vertical.ancho;
  const wA = sgvMedirReal(htmlCuerpo, 10, estilosExtra);
  const wB = sgvMedirReal(htmlCuerpo, 5,  estilosExtra);
  const pendiente = (wA - wB) / 5;
  const fijo = wA - pendiente * 10;
  const fs = sgvCuerpoQueEntra(htmlCuerpo, ancho, estilosExtra);
  return {
    hoja: ancho,
    medido: { a10px: wA, a5px: wB },
    pendiente: Math.round(pendiente * 100) / 100,   // px de ancho por px de letra
    fijo: Math.round(fijo),                          // paddings y bordes
    letraFinal: fs,
    anchoConEsaLetra: sgvMedirReal(htmlCuerpo, fs, estilosExtra),
    entra: sgvMedirReal(htmlCuerpo, fs, estilosExtra) <= ancho
  };
}

/* ===========================================================================
   IMPRESIÓN DE LISTADOS — SGV
   ---------------------------------------------------------------------------
   REGLAS (Ricardo, Ago 2026):
     · Hoja A4 VERTICAL (forzada por medidas exactas en mm).
     · 72 LÍNEAS por hoja: alto de renglón FIJO = alto_util / 72.
     · Si la tabla no entra a lo ancho, se ACHICA LA LETRA hasta que entren
       TODAS las columnas.
     · ACHICAR LA LETRA NO SIGNIFICA APRETAR LOS RENGLONES: el alto de fila y
       el interlineado son constantes y NO dependen del cuerpo de letra. Al
       achicar sólo cambia el ancho del texto; el renglón sigue midiendo lo
       mismo y siguen entrando 72 por hoja.
     · Cada columna toma el ancho que necesita: nada se corta ni se aplasta.
     · Se ve como planilla: cebra, encabezado gris, totales destacados,
       títulos de columna repetidos en cada hoja.

   CÓMO CALCULA EL ANCHO
     Mide el texto real de cada celda con canvas.measureText a un cuerpo de
     referencia (100px) y lo divide: obtiene los px que ocupa esa columna por
     cada px de cuerpo de letra. Con eso despeja el cuerpo más grande que hace
     entrar la tabla. Es una medición de TEXTO, no de LAYOUT: el layout dentro
     de la ventana de impresión resultó poco confiable (ver notas del proyecto),
     measureText no.

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

// Corta textos largos (razón social: 30 caracteres).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrintEstilos(ancho){
  // Alto de renglón: SIEMPRE el de la hoja vertical, así el renglón mide igual
  // en las dos orientaciones y NO se achica junto con la letra.
  const h = Math.floor(SGV_PAGE_H / SGV_LINEAS * 100) / 100;
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${SGV_FS}px;margin:0;color:#111;
         font-variant-numeric:tabular-nums;width:${ancho}px}

    /* Título fijo: no encoge cuando se achica la letra de la tabla */
    h2{margin:0 0 2px;font-size:15px}
    .sub{color:#555;font-size:10px;margin-bottom:6px}
    h3{margin:8px 0 3px;color:#0a58ca;border-bottom:1px solid #ccc;font-size:12px}

    /* max-content = cada columna toma lo que necesita. min-width:100% para
       que, si sobra, la tabla igual ocupe el ancho de la hoja. */
    table{width:max-content;min-width:100%;border-collapse:collapse;margin-bottom:6px}

    /* ALTO DE RENGLÓN FIJO EN PX: no está en em ni depende del font-size, así
       que achicar la letra NUNCA aprieta los renglones. */
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

// Corre DENTRO de la ventana de impresión.
function sgvPrintScript(ancho){
  return `
(function(){
  var W=${ancho}, FS=${SGV_FS}, FSMIN=${SGV_FS_MIN}, PAD=${SGV_PAD};
  var REF=100;              // cuerpo de referencia para medir
  var MARGEN=0.985;         // reserva mínima por redondeos

  var ctx=null;
  function medir(txt, negrita){
    if(!ctx) ctx=document.createElement('canvas').getContext('2d');
    ctx.font=(negrita?'bold ':'')+REF+'px Arial, Helvetica, sans-serif';
    return ctx.measureText(txt||'').width;
  }

  // Para una tabla: px de texto por cada px de cuerpo de letra, y cuántas
  // columnas tiene. El ancho total será  texto*fs + columnas*PAD.
  function medirTabla(tabla){
    var filas=tabla.rows, anchoCol=[], nCols=0;
    for(var r=0;r<filas.length;r++){
      var celdas=filas[r].cells, col=0;
      for(var c=0;c<celdas.length;c++){
        var span=celdas[c].colSpan||1;
        if(span>1){ col+=span; continue; }          // las combinadas no mandan
        var txt=(celdas[c].textContent||'').trim();
        var w=medir(txt, celdas[c].tagName==='TH')/REF;
        if(anchoCol[col]===undefined||w>anchoCol[col]) anchoCol[col]=w;
        col++;
      }
      if(col>nCols) nCols=col;
    }
    var texto=0;
    for(var k=0;k<nCols;k++) texto+=(anchoCol[k]||0);
    return { texto:texto, cols:nCols };
  }

  // Cuerpo de letra más grande con el que TODAS las tablas entran a lo ancho
  function cuerpoQueEntra(){
    var tablas=document.querySelectorAll('table');
    var fs=FS;
    for(var t=0;t<tablas.length;t++){
      var m=medirTabla(tablas[t]);
      if(m.texto<=0) continue;
      var disp=W*MARGEN - m.cols*PAD;              // lo que queda para el texto
      if(disp<=0){ fs=FSMIN; continue; }
      var cabe=disp/m.texto;
      if(cabe<fs) fs=cabe;
    }
    fs=Math.floor(fs*4)/4;                          // redondear a 0.25 hacia abajo
    return Math.max(FSMIN, Math.min(FS, fs));
  }

  function ajustar(){
    var fs=cuerpoQueEntra();
    document.body.style.fontSize=fs+'px';

    // Red de seguridad: si aun así el navegador reporta desborde, bajar más.
    // Sólo puede achicar, nunca agrandar. El alto de renglón no se toca.
    var vueltas=0;
    while(fs>FSMIN && vueltas<40 &&
          Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > W+1){
      fs=Math.round((fs-0.25)*100)/100;
      document.body.style.fontSize=fs+'px';
      vueltas++;
    }
    return fs;
  }

  function arrancar(){
    try{ ajustar(); }catch(e){ console.error('sgvPrint:',e); }
    setTimeout(function(){ window.print(); }, 250);
  }

  if(document.readyState==='complete') arrancar();
  else window.onload=arrancar;
})();
`;
}

function sgvPrint(opt){
  const o = opt || {};
  const pg = o.apaisado ? SGV_PAGE.apaisado : SGV_PAGE.vertical;
  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style>@page{size:' + pg.size + ';margin:10mm}</style>' +
    '<style>' + sgvPrintEstilos(pg.ancho) + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') +
    '<' + 'script>' + sgvPrintScript(pg.ancho) + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

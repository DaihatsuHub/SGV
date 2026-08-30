/* ===========================================================================
   IMPRESIÓN DE LISTADOS — SGV
   ---------------------------------------------------------------------------
   REGLAS (Ricardo, Ago 2026):
     · Hoja A4 VERTICAL (forzada por medidas exactas en mm).
     · Alto de renglón FIJO, elegido para que se lea cómodo. La cantidad de
       líneas por hoja sale de ahí (con 18px, unas 58 en A4 vertical).
     · Agrandar el renglón NO agranda la letra: son independientes.
     · TODAS las columnas tienen que entrar. Si la tabla se pasa del ancho de
       la hoja, se ESCALA lo justo para que entre.
     · ACHICAR NO SIGNIFICA APRETAR LOS RENGLONES: se escala el bloque entero
       (letra y renglones en la misma proporción), nunca sólo la letra.
     · Se ve como planilla: cebra, encabezado gris, totales destacados,
       títulos de columna repetidos en cada hoja.

   CÓMO ENTRA TODO — y por qué así
     El ancho útil se mide DENTRO de la ventana de impresión, con una regla
     invisible declarada en MILÍMETROS. Ése es el único ancho confiable: los
     píxeles no sirven como referencia porque al generar el PDF el navegador
     no siempre usa 96 dpi, así que 190mm no equivalen a 718px.

     Con ese ancho real se compara la tabla y, si se pasa, se escala el
     contenedor con `transform: scale()`. Es exactamente lo que se haría a mano
     bajando el porcentaje en el diálogo de impresión, pero automático y sólo
     en la medida necesaria.

     Se intentó antes calcular el cuerpo de letra que hiciera entrar la tabla
     (contando caracteres, midiendo con canvas, midiendo el layout). NINGUNA
     de esas vías funcionó: el ancho medido en la página no coincide con el que
     produce la impresora. NO volver por ese camino.

   Uso: sgvPrint({ titulo, subtitulo, cuerpo, estilos, apaisado })
   =========================================================================== */

// A4 con márgenes de 10 mm → útil 190mm (vertical) / 277mm (apaisado)
const SGV_PAGE = {
  vertical: { size:'210mm 297mm', util:'190mm' },
  apaisado: { size:'297mm 210mm', util:'277mm' }
};
// Alto de RENGLÓN y cuerpo de LETRA son independientes: el renglón se elige
// para que el listado se lea cómodo, no al revés. Con 18px entran ~58 líneas
// en una A4 vertical. (Las "72 líneas" venían de la matricial y quedaban
// demasiado apretadas.)
const SGV_FILA   = 18;     // alto de renglón en px
const SGV_FS     = 9;      // cuerpo de letra — NO cambia si cambia el renglón

// Corta textos largos (razón social: 30 caracteres).
function sgvCorta(txt, n){
  const t = String(txt == null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrintEstilos(util){
  const h = SGV_FILA;
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:${SGV_FS}px;margin:0;color:#111;
         font-variant-numeric:tabular-nums;width:${util}}

    h2{margin:0 0 2px;font-size:15px}
    .sub{color:#555;font-size:10px;margin-bottom:6px}
    h3{margin:8px 0 3px;color:#0a58ca;border-bottom:1px solid #ccc;font-size:12px}

    /* La tabla toma su ancho natural; si se pasa, la escala el script */
    table{width:max-content;border-collapse:collapse;margin-bottom:6px}
    /* El renglón mide ${h}px y la letra ${SGV_FS}px: agrandar el renglón NO
       agranda la letra, que es lo que dejaba el listado apretado. */
    th,td{padding:0 6px;border-bottom:1px solid #e5e5e5;text-align:left;
          white-space:nowrap;height:${h}px;line-height:${h}px;
          font-size:${SGV_FS}px;vertical-align:middle}
    .n,.r{text-align:right}

    th{background:#e8eaed;font-weight:bold;border-bottom:1.5px solid #999}
    tbody tr:nth-child(even) td, table > tr:nth-child(even) td{background:#f4f5f7}
    tr.tot td,tr.fin td,tr.ant td{font-weight:bold;border-top:2px solid #0a58ca;background:#e8eaed}
    tr{page-break-inside:avoid;break-inside:avoid}
    thead{display:table-header-group}

    #sgv-fit{transform-origin:left top}

    @media print{
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      th{background:#e8eaed !important}
      tbody tr:nth-child(even) td, table > tr:nth-child(even) td{background:#f4f5f7 !important}
      tr.tot td,tr.fin td,tr.ant td{background:#e8eaed !important}
    }
  `;
}

// Corre DENTRO de la ventana: mide la hoja en mm y escala si hace falta.
function sgvPrintScript(util){
  return `
(function(){
  function ajustar(){
    // Ancho útil REAL de la hoja, medido en milímetros (única referencia
    // confiable: los px no equivalen a mm al generar el PDF)
    var regla=document.createElement('div');
    regla.style.cssText='position:absolute;visibility:hidden;width:${util}';
    document.body.appendChild(regla);
    var hoja=regla.getBoundingClientRect().width;
    regla.parentNode.removeChild(regla);

    var cont=document.getElementById('sgv-fit');
    var ancho=0;
    if(cont){
      var tablas=cont.querySelectorAll('table');
      for(var i=0;i<tablas.length;i++){
        var w=tablas[i].getBoundingClientRect().width;
        if(w>ancho) ancho=w;
      }
      if(hoja>0 && ancho>hoja){
        var esc=hoja/ancho;
        cont.style.transform='scale('+esc+')';
        // Compensar el alto que se pierde al escalar, para no dejar hueco
        cont.style.height=(cont.getBoundingClientRect().height*esc)+'px';
      }
    }
    if(window.SGV_PRINT_DIAG){
      console.log('sgvPrint · hoja', Math.round(hoja),
                  '· tabla', Math.round(ancho),
                  '· escala', (hoja>0&&ancho>hoja)?(hoja/ancho).toFixed(3):1);
    }
    setTimeout(function(){ window.print(); }, 300);
  }
  if(document.readyState==='complete') ajustar();
  else window.onload=ajustar;
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
    '<style>' + sgvPrintEstilos(pg.util) + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    '<div id="sgv-fit">' + (o.cuerpo || '') + '</div>' +
    '<' + 'script>' + sgvPrintScript(pg.util) + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}


// ── Compatibilidad: listados que todavía llaman al helper viejo ─────────────
// printArt y printCli arman la tabla y se la pasan a openPrint. En vez de
// tocar cada uno, openPrint delega en sgvPrint y así heredan todo el estándar
// (nowrap, escalado al ancho de la hoja, cebra, títulos repetidos).
function openPrint(titulo, cuerpo, n){
  sgvPrint({
    titulo: String(titulo || '').replace(/^[^\w\dÁÉÍÓÚÑ]+\s*/, ''),
    subtitulo: 'Daihatsu Electronics — ' + new Date().toLocaleDateString('es-AR')
             + (n !== undefined ? ' · ' + n + ' registros' : ''),
    // Se sacan los estilos inline: traen colores de pantalla que en papel no
    // se leen, y alineaciones que ya resuelve el estándar.
    cuerpo: String(cuerpo || '').replace(/\sstyle="[^"]*"/g, ''),
    estilos: 'td:nth-child(1){font-family:Consolas,monospace;color:#0a58ca}'
           + 'td:nth-child(n+4),th:nth-child(n+4){text-align:right}'
  });
}

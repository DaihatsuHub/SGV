/* ===========================================================================
   IMPRESIÓN CON AUTO-AJUSTE  —  regla general de todos los listados de SGV
   ---------------------------------------------------------------------------
   REGLA (Ricardo, Ago 2026): todos los listados se imprimen en A4 VERTICAL.
   Si no entran a lo ancho, se ACHICA hasta que entren. Recién si aun achicado
   al mínimo legible no entran, la hoja gira sola a APAISADO.
   NO forzar apaisado de entrada.

   CÓMO: la tabla toma su ancho NATURAL (nada de width:100%, y las celdas con
   white-space:nowrap para que nunca corten un número en dos líneas). Se mide
   ese ancho real y se escala todo con `zoom` hasta que entre justo en la hoja.
   El zoom achica proporcionalmente letra y columnas, así que el listado se ve
   igual, sólo que más chico.

   REGLA (Ricardo, Ago 2026): los listados impresos se ven como una planilla de
   Excel — renglones alternados sombreados (cebra), encabezado gris y fila de
   totales destacada. Ya viene en los estilos base: no hace falta hacer nada en
   cada listado, sólo usar sgvPrint().

   Uso:
     sgvPrint({
       titulo:   'Listado de Cobranzas',
       subtitulo:'Daihatsu Electronics — 09/08/2026 · 42 recibos',
       cuerpo:   '<table>…</table>',
       estilos:  'td.x{color:red}'      // opcional, se suma a los de base
     });
   =========================================================================== */

// Ancho imprimible en px (96 dpi) de una A4 con márgenes de 10 mm
const SGV_PRINT_W = { vertical: 718, apaisado: 1047 };
// Por debajo de esto la letra ya no se lee: antes de achicar más, gira la hoja
const SGV_PRINT_ZOOM_MIN = 0.62;

function sgvPrintEstilosBase(){
  return `
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;margin:0;color:#111;display:inline-block}
    h2{margin:0 0 2px;font-size:1.5em;white-space:normal;overflow-wrap:anywhere}
    .sub{color:#666;font-size:1em;margin-bottom:10px;white-space:normal;overflow-wrap:anywhere}
    h3{margin:14px 0 4px;color:#0a58ca;border-bottom:1px solid #ccc;padding-bottom:2px;font-size:1.2em}
    table{border-collapse:collapse;margin-bottom:8px;width:auto}
    /* padding en em: al achicar la letra, achican también las celdas */
    th,td{padding:.28em .62em;border-bottom:1px solid #e5e5e5;text-align:left;white-space:nowrap}
    th{background:#e8eaed;font-weight:bold;border-bottom:1.5px solid #999}
    .n,.r{text-align:right;font-variant-numeric:tabular-nums}
    /* Cebra tipo planilla: renglones alternados sombreados */
    tbody tr:nth-child(even) td, table > tr:nth-child(even) td{background:#f4f5f7}
    tr.tot td,tr.fin td,tr.ant td{font-weight:bold;border-top:2px solid #0a58ca;background:#e8eaed}
    /* Nunca partir un renglón entre dos hojas */
    tr{page-break-inside:avoid;break-inside:avoid}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    @media print{
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      th{background:#e8eaed !important}
      tbody tr:nth-child(even) td, table > tr:nth-child(even) td{background:#f4f5f7 !important}
      tr.tot td,tr.fin td,tr.ant td{background:#e8eaed !important}
    }
  `;
}

// Recorta un texto largo (razón social, descripción) para que no estire la
// tabla. REGLA (Ricardo, Ago 2026): la razón social se limita a 30 caracteres
// en TODOS los listados, en pantalla y en impresión.
function sgvCorta(txt, n){
  const t = String(txt==null ? '' : txt).trim();
  const max = n || 30;
  return t.length > max ? t.substring(0, max).trim() + '…' : t;
}

function sgvPrint(opt){
  const o = opt || {};
  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  const ajuste = `
    (function(){
      var W_V=${SGV_PRINT_W.vertical}, W_H=${SGV_PRINT_W.apaisado}, ZMIN=${SGV_PRINT_ZOOM_MIN}, BASE_FS=11;
      // Mide SOLO las tablas. El título o el subtítulo pueden ser largos y no
      // deben decidir si la hoja va vertical o apaisada: ellos se parten solos.
      function natural(){
        var ts=document.querySelectorAll('table'), w=0;
        for(var i=0;i<ts.length;i++){ if(ts[i].scrollWidth>w) w=ts[i].scrollWidth; }
        return w || document.body.scrollWidth;
      }
      function apaisar(){
        document.getElementById('sgv-page').textContent='@page{size:A4 landscape;margin:10mm}';
      }
      // Escala por FONT-SIZE, no por zoom: el zoom hace que el navegador
      // calcule mal los saltos de página y parta renglones al medio.
      function achicarHasta(target){
        var fs=BASE_FS;
        document.body.style.fontSize=fs+'px';
        var nat=natural();
        while(nat>target && fs>BASE_FS*ZMIN){
          fs=Math.round((fs-0.25)*100)/100;
          document.body.style.fontSize=fs+'px';
          nat=natural();
        }
        return { fs:fs, nat:nat, entra: nat<=target };
      }
      function ajustar(){
        var r=achicarHasta(W_V);
        if(!r.entra){                 // no entra en vertical ni achicado: girar
          apaisar();
          r=achicarHasta(W_H);
        }
        var apais = document.getElementById('sgv-page').textContent.indexOf('landscape')>=0;
        var target = apais ? W_H : W_V;
        document.body.style.display='block';
        document.body.style.width=target+'px';
        if(r.nat < target){
          var ts=document.querySelectorAll('table');
          for(var i=0;i<ts.length;i++) ts[i].style.width='100%';
        }
      }
      window.onload=function(){ ajustar(); setTimeout(function(){ window.print(); }, 150); };
    })();
  `;

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style id="sgv-page">@page{size:A4 portrait;margin:10mm}</style>' +
    '<style>' + sgvPrintEstilosBase() + (o.estilos || '') + '</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') +
    '<' + 'script>' + ajuste + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

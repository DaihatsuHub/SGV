/* ===========================================================================
   IMPRESIÓN CON AUTO-AJUSTE  —  regla general de todos los listados de SGV
   ---------------------------------------------------------------------------
   Problema: cuando un listado tiene muchas columnas, al imprimir se corta.
   Solución: se fija el ancho del cuerpo al ancho REAL imprimible de la hoja
   y se va achicando la letra hasta que todo entre. Si aun con la letra mínima
   no entra, se gira automáticamente a horizontal (si venía en vertical).

   Uso:
     sgvPrint({
       titulo:   'Listado de Cobranzas',
       subtitulo:'Daihatsu Electronics — 09/08/2026 · 42 recibos',
       cuerpo:   '<table>…</table>',
       estilos:  'td.x{color:red}',     // opcional, se suma a los de base
       apaisado: true                   // opcional (default: false = vertical)
     });
   =========================================================================== */

// Ancho imprimible en px (96 dpi) de una A4 con márgenes de 10 mm
const SGV_PRINT_W = { vertical: 718, apaisado: 1047 };

function sgvPrintEstilosBase(){
  return `
    body{font-family:Arial,sans-serif;font-size:11px;margin:0;color:#111}
    h2{margin:0 0 2px;font-size:16px}
    .sub{color:#666;font-size:11px;margin-bottom:10px}
    h3{margin:14px 0 4px;color:#0a58ca;border-bottom:1px solid #ccc;padding-bottom:2px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px;table-layout:auto}
    th,td{padding:3px 6px;border-bottom:1px solid #e5e5e5;text-align:left;white-space:nowrap}
    th{background:#f0f0f0;font-size:.95em}
    .n,.r{text-align:right;font-variant-numeric:tabular-nums}
    tr.tot td,tr.fin td{font-weight:bold;border-top:2px solid #0a58ca}
    @media print{ th{background:#f0f0f0 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact} }
  `;
}

function sgvPrint(opt){
  const o = opt || {};
  const apaisado = !!o.apaisado;
  const anchoIni = apaisado ? SGV_PRINT_W.apaisado : SGV_PRINT_W.vertical;
  const w = window.open('', '_blank');
  if(!w){ if(typeof toast==='function') toast('El navegador bloqueó la ventana de impresión','err'); return; }

  // El script de ajuste corre en la ventana nueva, antes de imprimir
  const ajuste = `
    (function(){
      var W_V=${SGV_PRINT_W.vertical}, W_H=${SGV_PRINT_W.apaisado};
      var apaisado=${apaisado};
      function ancho(){ return apaisado ? W_H : W_V; }
      function excede(){ return document.body.scrollWidth > ancho()+1; }
      function girar(){
        apaisado=true;
        document.getElementById('sgv-page').textContent='@page{size:A4 landscape;margin:10mm}';
        document.body.style.width=W_H+'px';
      }
      function ajustar(){
        var fs=11;
        document.body.style.fontSize=fs+'px';
        // 1) achicar la letra hasta 6px
        while(excede() && fs>6){ fs-=0.25; document.body.style.fontSize=fs+'px'; }
        // 2) si sigue sin entrar y estaba vertical, girar la hoja y reintentar
        if(excede() && !apaisado){
          girar(); fs=11; document.body.style.fontSize=fs+'px';
          while(excede() && fs>6){ fs-=0.25; document.body.style.fontSize=fs+'px'; }
        }
        // 3) último recurso: dejar que las celdas corten palabras
        if(excede()){
          var st=document.createElement('style');
          st.textContent='th,td{white-space:normal;word-break:break-word}';
          document.head.appendChild(st);
        }
      }
      window.onload=function(){ ajustar(); setTimeout(function(){ window.print(); }, 120); };
    })();
  `;

  w.document.write(
    '<html><head><meta charset="utf-8"><title>' + (o.titulo || 'Listado') + '</title>' +
    '<style id="sgv-page">@page{size:A4 ' + (apaisado ? 'landscape' : 'portrait') + ';margin:10mm}</style>' +
    '<style>' + sgvPrintEstilosBase() + (o.estilos || '') +
    'body{width:' + anchoIni + 'px}</style></head><body>' +
    (o.titulo ? '<h2>' + o.titulo + '</h2>' : '') +
    (o.subtitulo ? '<div class="sub">' + o.subtitulo + '</div>' : '') +
    (o.cuerpo || '') +
    '<' + 'script>' + ajuste + '<' + '/script>' +
    '</body></html>'
  );
  w.document.close();
  w.focus();
}

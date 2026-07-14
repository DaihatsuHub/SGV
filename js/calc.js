// ═══════════════════════════════════════════════════════════
// CALCULADORA con impresora de papel (cinta) — módulo autónomo
// Se inyecta sola en el DOM. Abrir: openCalc()  ·  Cerrar: closeCalc() / Esc / ✕
// Pegar el último resultado en el campo enfocado: botón "Pegar" o Ctrl+Shift+V
// No depende de ningún otro módulo de SGV.
// ═══════════════════════════════════════════════════════════
(function(){
  'use strict';

  // ── Estado ──────────────────────────────────────────────
  let cur='0';            // entrada actual (string crudo, coma decimal, sin miles)
  let acc=null;           // acumulador
  let pend=null;          // operación pendiente: '+','-','*','/'
  let fresh=true;         // el próximo dígito empieza una entrada nueva
  let justEq=false;       // se acaba de tocar '='
  let mem=0;              // memoria
  let lastResult=null;    // último resultado numérico (para pegar)
  let tape=[];            // líneas de la cinta de papel
  let lastFocused=null;   // último input/textarea de SGV enfocado

  const SYM={'+':'+','-':'−','*':'×','/':'÷'};

  // ── Formato (es-AR: miles con punto, decimales con coma) ──
  function fmtNum(n){
    if(n===null||n===undefined||!isFinite(n)) return 'Error';
    const neg=n<0; let v=Math.abs(n);
    v=Math.round(v*100)/100;
    let [ent,dec]=v.toFixed(2).split('.');
    ent=ent.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    return (neg?'-':'')+ent+','+dec;
  }
  // formatea la entrada que se está tipeando (agrega miles al entero)
  function fmtCur(s){
    let neg=s.startsWith('-'); if(neg) s=s.slice(1);
    let [ent,dec]=s.split(',');
    ent=(ent||'0').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
    return (neg?'-':'')+ent+(dec!==undefined?(','+dec):'');
  }
  function toNum(s){ return parseFloat(String(s).replace(/\./g,'').replace(',','.'))||0; }

  // ── Lógica ──────────────────────────────────────────────
  function setDisplay(){
    const d=document.getElementById('calc-lcd');
    if(d){
      // Si cur es un resultado (no se está tipeando) → 2 decimales; si se tipea → tal cual
      if(fresh && cur!=='Error') d.textContent=fmtNum(toNum(cur));
      else d.textContent=fmtCur(cur);
    }
    const m=document.getElementById('calc-mem');
    if(m) m.style.visibility = (mem!==0)?'visible':'hidden';
  }
  function pushTape(line){
    tape.push(line);
    const t=document.getElementById('calc-tape');
    if(t){ t.innerHTML=tape.map(l=>`<div>${l}</div>`).join(''); t.scrollTop=t.scrollHeight; }
  }
  function clearTape(){ tape=[]; const t=document.getElementById('calc-tape'); if(t) t.innerHTML=''; }

  function inputDigit(d){
    if(justEq){ cur='0'; acc=null; pend=null; justEq=false; fresh=true; }
    if(fresh){ cur=(d==='00'||d==='.')?'0':''; fresh=false; }
    if(d==='00'){ if(cur===''||cur==='0') cur='0'; else cur+='00'; }
    else { if(cur==='0') cur=''; cur+=d; }
    if(cur==='') cur='0';
    setDisplay();
  }
  function inputDot(){
    if(justEq||fresh){ cur='0'; fresh=false; justEq=false; }
    if(cur.indexOf(',')<0) cur=(cur||'0')+',';
    setDisplay();
  }
  function backspace(){
    if(justEq||fresh){ return; }
    cur=cur.slice(0,-1);
    if(cur===''||cur==='-') cur='0';
    setDisplay();
  }
  function negate(){
    if(cur==='0'||cur==='Error') return;
    cur = cur.startsWith('-')?cur.slice(1):('-'+cur);
    setDisplay();
  }
  function clearEntry(){ cur='0'; fresh=true; setDisplay(); }
  function clearAll(){ cur='0'; acc=null; pend=null; fresh=true; justEq=false; lastResult=null; clearTape(); setDisplay(); }

  function operator(opc){
    const n=toNum(cur);
    if(fresh && pend!==null){ pend=opc; justEq=false; return; } // sólo cambia el operador
    if(pend!==null) acc=compute(acc,n,pend);
    else acc=n;
    pushTape(rightLine(fmtNum(n), SYM[opc]));
    cur=String(acc).replace('.',',');
    pend=opc; fresh=true; justEq=false;
    setDisplay();
  }
  function compute(a,b,o){
    a=(a===null?0:a);
    switch(o){
      case '+': return a+b;
      case '-': return a-b;
      case '*': return a*b;
      case '/': return b===0?NaN:a/b;
    }
    return b;
  }
  function equals(){
    const n=toNum(cur);
    if(pend!==null){
      pushTape(rightLine(fmtNum(n),''));
      const res=compute(acc,n,pend);
      pushTape('<span style="color:#bdbbb2">──────────</span>');
      pushTape(rightLine(fmtNum(res),'✱'));
      acc=null; pend=null; lastResult=res;
      cur=String(res).replace('.',',');
    } else {
      lastResult=n;
    }
    fresh=true; justEq=true;
    setDisplay();
  }
  function percent(){
    const n=toNum(cur);
    let r;
    if(acc!==null && (pend==='+'||pend==='-')) r=acc*n/100;
    else r=n/100;
    cur=String(r).replace('.',','); fresh=true; justEq=false;
    setDisplay();
  }
  function sqrtFn(){
    const n=toNum(cur);
    const r=(n<0)?NaN:Math.sqrt(n);
    pushTape(rightLine('√ '+fmtNum(n),''));
    pushTape(rightLine(fmtNum(r),'✱'));
    cur=String(r).replace('.',','); lastResult=r; fresh=true; justEq=true;
    setDisplay();
  }
  function memPlus(){ mem+=toNum(cur); fresh=true; setDisplay(); }
  function memRecall(){ cur=String(mem).replace('.',','); fresh=true; justEq=false; setDisplay(); }
  function memClear(){ mem=0; setDisplay(); }

  function rightLine(txt,sym){
    return `<div style="display:flex;justify-content:space-between"><span></span><span>${txt} ${sym||'&nbsp;'}</span></div>`;
  }

  // ── Pegar resultado en el campo enfocado de SGV ─────────
  function pasteResult(){
    if(lastResult===null){ if(typeof toast==='function') toast('No hay un resultado para pegar','err'); return; }
    const val=String(Math.round(lastResult*100)/100).replace('.',',');
    const el=lastFocused;
    if(el && (el.tagName==='INPUT'||el.tagName==='TEXTAREA') && !el.disabled && !el.readOnly){
      el.value=val;
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      closeCalc();
      el.focus();
      if(typeof toast==='function') toast('Resultado pegado','scs');
    } else {
      // sin campo: copia al portapapeles como respaldo
      if(navigator.clipboard) navigator.clipboard.writeText(val);
      if(typeof toast==='function') toast('No había un campo activo. Resultado copiado al portapapeles','err');
    }
  }
  function copyResult(){
    const val=String(Math.round((lastResult!==null?lastResult:toNum(cur))*100)/100).replace('.',',');
    if(navigator.clipboard) navigator.clipboard.writeText(val);
    if(typeof toast==='function') toast('Resultado copiado','scs');
  }

  // ── Construcción del panel ──────────────────────────────
  const KEYS=[
    ['C','ce'],['CE','ce'],['%','op'],['÷','op'],['×','op'],
    ['7','num'],['8','num'],['9','num'],['−','op'],['⌫','bk'],
    ['4','num'],['5','num'],['6','num'],['+','op'],['√','op'],
    ['1','num'],['2','num'],['3','num'],['±','op'],['M+','mem'],
    ['0','num'],['00','num'],[',','num'],['=','eq'],['MR','mem']
  ];
  const COLOR={
    num:'background:linear-gradient(#fdfcf8,#e3e0d4);color:#3a3833',
    op :'background:linear-gradient(#f4b04a,#db8a1e);color:#5a3a08',
    ce :'background:linear-gradient(#d8d4c8,#bbb7aa);color:#4a4843',
    bk :'background:linear-gradient(#ec6f66,#c63a34);color:#fff',
    eq :'background:linear-gradient(#ec6f66,#c63a34);color:#fff;font-weight:700',
    mem:'background:linear-gradient(#d8d4c8,#bbb7aa);color:#4a4843;font-size:13px'
  };

  function build(){
    if(document.getElementById('sgv-calc')) return;
    const wrap=document.createElement('div');
    wrap.id='sgv-calc';
    wrap.style.cssText='display:none;position:fixed;z-index:9999;top:90px;left:50%;transform:translateX(-50%);width:300px;'+
      'background:linear-gradient(#eceae1,#c6c3b6);border:1px solid #aeab9e;border-radius:16px;'+
      'box-shadow:0 12px 40px rgba(0,0,0,.35);font-family:system-ui,Arial,sans-serif;user-select:none';

    let keysHtml='';
    KEYS.forEach(([k,t])=>{
      keysHtml+=`<button class="calc-k" data-k="${k}" style="${COLOR[t]};border:none;border-radius:7px;height:40px;`+
        `font-size:17px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.18);transition:transform .03s">${k}</button>`;
    });

    wrap.innerHTML=
      `<div id="calc-bar" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:move">
         <span style="font-size:12px;color:#5f5d56;font-weight:600">🧮 Calculadora</span>
         <button id="calc-x" title="Cerrar (Esc)" style="width:24px;height:24px;border:none;border-radius:6px;background:#b4b1a4;color:#4a4843;cursor:pointer;font-size:13px">✕</button>
       </div>
       <div style="margin:0 12px;display:flex;justify-content:flex-end">
         <div style="width:120px;background:#fff;border:1px solid #dcdad2;border-bottom:none;border-radius:4px 4px 0 0;position:relative">
           <button id="calc-tape-clr" title="Limpiar cinta" style="position:absolute;top:2px;left:2px;border:none;background:transparent;color:#c2c0b8;cursor:pointer;font-size:11px">🗑</button>
           <div id="calc-tape" style="height:78px;overflow:auto;padding:4px 8px;font-family:monospace;font-size:11px;color:#7a786f;text-align:right"></div>
         </div>
       </div>
       <div style="margin:0 12px 10px;background:#2c2c2a;border-radius:0 0 9px 9px;padding:8px 10px;display:flex;align-items:center;gap:8px">
         <span id="calc-mem" style="visibility:hidden;color:#7fae4e;font-size:11px;font-weight:700">M</span>
         <div style="flex:1;background:linear-gradient(#cdd6bb,#aeba98);border:1px solid #869274;border-radius:4px;padding:6px 10px;text-align:right">
           <span id="calc-lcd" style="font-family:monospace;font-size:24px;font-weight:700;color:#2c3522">0</span>
         </div>
       </div>
       <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:7px;padding:0 12px 10px">${keysHtml}</div>
       <div style="display:flex;gap:7px;padding:0 12px 10px">
         <button id="calc-paste" style="flex:1;border:none;border-radius:7px;height:34px;background:linear-gradient(#7fae4e,#5c8a32);color:#fff;cursor:pointer;font-size:13px;font-weight:600">⤵ Pegar en el campo</button>
         <button id="calc-copy" title="Copiar al portapapeles" style="border:none;border-radius:7px;height:34px;width:42px;background:linear-gradient(#d8d4c8,#bbb7aa);color:#4a4843;cursor:pointer;font-size:14px">📋</button>
       </div>
       <div style="padding:0 12px 10px;font-size:10.5px;color:#6a6862;display:flex;justify-content:space-between">
         <span>Esc / ✕ cerrar</span><span style="font-family:monospace">Ctrl+Shift+V pegar</span>
       </div>`;
    document.body.appendChild(wrap);

    // clicks de teclas
    wrap.querySelectorAll('.calc-k').forEach(b=>{
      b.addEventListener('click',()=>handleKey(b.dataset.k));
      b.addEventListener('mousedown',()=>b.style.transform='translateY(1px)');
      b.addEventListener('mouseup',()=>b.style.transform='');
      b.addEventListener('mouseleave',()=>b.style.transform='');
    });
    document.getElementById('calc-x').addEventListener('click',closeCalc);
    document.getElementById('calc-paste').addEventListener('click',pasteResult);
    document.getElementById('calc-copy').addEventListener('click',copyResult);
    document.getElementById('calc-tape-clr').addEventListener('click',clearTape);
    makeDraggable(wrap,document.getElementById('calc-bar'));
  }

  function handleKey(k){
    if(/^\d$/.test(k)||k==='00') inputDigit(k);
    else if(k===',') inputDot();
    else if(k==='+') operator('+');
    else if(k==='−') operator('-');
    else if(k==='×') operator('*');
    else if(k==='÷') operator('/');
    else if(k==='=') equals();
    else if(k==='%') percent();
    else if(k==='√') sqrtFn();
    else if(k==='±') negate();
    else if(k==='⌫') backspace();
    else if(k==='C') clearAll();
    else if(k==='CE') clearEntry();
    else if(k==='M+') memPlus();
    else if(k==='MR') memRecall();
  }

  // ── Drag por la barra de título ─────────────────────────
  function makeDraggable(panel,handle){
    let sx,sy,ox,oy,drag=false;
    handle.addEventListener('mousedown',e=>{
      if(e.target.id==='calc-x') return;
      drag=true; sx=e.clientX; sy=e.clientY;
      const r=panel.getBoundingClientRect();
      ox=r.left; oy=r.top; panel.style.transform='none'; panel.style.left=ox+'px'; panel.style.top=oy+'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove',e=>{
      if(!drag) return;
      panel.style.left=(ox+e.clientX-sx)+'px';
      panel.style.top=(oy+e.clientY-sy)+'px';
    });
    document.addEventListener('mouseup',()=>drag=false);
  }

  // ── API pública ─────────────────────────────────────────
  window.openCalc=function(){
    build();
    const w=document.getElementById('sgv-calc');
    w.style.display='block';
    setDisplay();
  };
  window.closeCalc=function(){
    const w=document.getElementById('sgv-calc');
    if(w) w.style.display='none';
  };
  window.toggleCalc=function(){
    const w=document.getElementById('sgv-calc');
    if(w && w.style.display!=='none') closeCalc(); else openCalc();
  };

  // ── Teclado global ──────────────────────────────────────
  document.addEventListener('focusin',e=>{
    const t=e.target;
    if((t.tagName==='INPUT'||t.tagName==='TEXTAREA') && !t.closest('#sgv-calc')) lastFocused=t;
  });
  document.addEventListener('keydown',e=>{
    // Ctrl+Shift+V: pegar el último resultado en el campo enfocado
    if((e.ctrlKey||e.metaKey) && e.shiftKey && (e.key==='V'||e.key==='v')){
      if(lastResult!==null){ e.preventDefault(); pasteResult(); }
      return;
    }
    const w=document.getElementById('sgv-calc');
    const open = w && w.style.display!=='none';
    if(!open) return;
    if(e.key==='Escape'){ e.preventDefault(); closeCalc(); return; }
    if(e.key>='0'&&e.key<='9'){ e.preventDefault(); inputDigit(e.key); }
    else if(e.key==='.'||e.key===','){ e.preventDefault(); inputDot(); }
    else if(e.key==='+'){ e.preventDefault(); operator('+'); }
    else if(e.key==='-'){ e.preventDefault(); operator('-'); }
    else if(e.key==='*'){ e.preventDefault(); operator('*'); }
    else if(e.key==='/'){ e.preventDefault(); operator('/'); }
    else if(e.key==='Enter'||e.key==='='){ e.preventDefault(); equals(); }
    else if(e.key==='Backspace'){ e.preventDefault(); backspace(); }
    else if(e.key==='%'){ e.preventDefault(); percent(); }
    else if(e.key==='Delete'){ e.preventDefault(); clearEntry(); }
    else if(e.key==='Escape'){ e.preventDefault(); closeCalc(); }
  });
})();

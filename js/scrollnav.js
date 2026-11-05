/* ===========================================================================
   FLECHAS IR AL PRINCIPIO / AL FINAL  (Ricardo, Nov 2026)
   Para TODOS los informes y grillas largas, sin tocar cada pantalla: dos
   botones flotantes a la derecha que aparecen sólo cuando lo que se ve tiene
   scroll. Toman la zona con scroll más grande de la pantalla activa (la
   grilla), o la página entera si es la que se desplaza.
   =========================================================================== */
(function(){
  if (window._sgvScrollNav) return; window._sgvScrollNav = true;

  const st = document.createElement('style');
  st.textContent = `
    #sgv-snav{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:900;
      display:none;flex-direction:column;gap:8px}
    #sgv-snav button{width:38px;height:38px;border-radius:50%;border:1px solid var(--b1,#ccc);
      background:var(--s1,#fff);color:var(--acc,#0a58ca);font-size:18px;line-height:1;cursor:pointer;
      box-shadow:0 2px 8px rgba(0,0,0,.18);opacity:.75;transition:opacity .15s}
    #sgv-snav button:hover{opacity:1}
    #sgv-snav button:disabled{opacity:.25;cursor:default}
    @media print{#sgv-snav{display:none!important}}`;
  document.head.appendChild(st);

  const nav = document.createElement('div'); nav.id = 'sgv-snav';
  nav.innerHTML = '<button id="sgv-snav-up" title="Ir al principio">⤒</button><button id="sgv-snav-dn" title="Ir al final">⤓</button>';
  document.body.appendChild(nav);
  const bUp = nav.querySelector('#sgv-snav-up'), bDn = nav.querySelector('#sgv-snav-dn');

  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  const scrolleable = el => {
    if (el.scrollHeight - el.clientHeight < 60) return false;
    const o = getComputedStyle(el).overflowY; return o === 'auto' || o === 'scroll';
  };
  // La zona con scroll a usar: si hay un modal/popup abierto, nada
  function objetivo(){
    const modal = [...document.querySelectorAll('body > div')].some(d => d !== nav && d.id !== 'sgv-snav' &&
      getComputedStyle(d).position === 'fixed' && d.offsetWidth >= innerWidth * .9 && d.offsetHeight >= innerHeight * .9);
    if (modal) return null;
    const pag = document.querySelector('.page.active') || document.body;
    let mejor = null, area = 0;
    for (const el of pag.querySelectorAll('*')) {
      if (!scrolleable(el) || !visible(el)) continue;
      const a = el.clientWidth * el.clientHeight;
      if (a > area) { area = a; mejor = el; }
    }
    if (mejor) return mejor;
    const se = document.scrollingElement;
    return (se && se.scrollHeight - innerHeight > 60) ? se : null;
  }

  let actual = null;
  function revisar(){
    actual = objetivo();
    nav.style.display = actual ? 'flex' : 'none';
    if (actual) {
      bUp.disabled = actual.scrollTop <= 2;
      bDn.disabled = actual.scrollTop + actual.clientHeight >= actual.scrollHeight - 2;
    }
  }
  bUp.onclick = () => { if (actual) actual.scrollTo({ top: 0, behavior: 'smooth' }); };
  bDn.onclick = () => { if (actual) actual.scrollTo({ top: actual.scrollHeight, behavior: 'smooth' }); };
  document.addEventListener('scroll', () => requestAnimationFrame(revisar), true);
  addEventListener('resize', revisar);
  setInterval(revisar, 800);       // cambia de pantalla, se carga un informe, etc.
  revisar();
})();

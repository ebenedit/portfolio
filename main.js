// Home proposal 03: menu, fitted name and scroll reveals.
(() => {
  // Always open on the first screen: don't let the browser restore an old scroll position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const toTop = () => { if (!location.hash) window.scrollTo(0, 0); };
  toTop();
  window.addEventListener('load', toTop);

  // Preview control: the circle shows the next colour in the palette; a click moves the page to it.
  const swatch = document.querySelector('.next-ground');
  if (swatch && window.GROUNDS) {
    const current = () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    const next = () => GROUNDS[(GROUNDS.indexOf(current()) + 1) % GROUNDS.length];
    const paint = () => swatch.style.setProperty('--next', next());
    swatch.addEventListener('click', () => {
      setGround(next()); paint();
      const w = swatch.querySelector('.coin');
      if (w) { w.style.animation = 'none'; void w.offsetWidth; w.style.animation = ''; }
    });
    paint();
  }

  // Phone menu
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('open', open);
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); menu.classList.remove('open'); }
    });
  }

  // Fit the name to the page width on desktop (measured, not guessed).
  const name = document.querySelector('.name');
  const fit = () => {
    if (!name) return;
    if (window.innerWidth <= 760) { name.style.fontSize = ''; return; }
    const box = name.parentElement.clientWidth - parseFloat(getComputedStyle(name.parentElement).paddingLeft) * 2;
    name.style.fontSize = '100px'; name.style.width = 'max-content';
    const w = name.getBoundingClientRect().width;
    name.style.width = '';
    name.style.fontSize = `${(100 * box / w) * 0.995}px`;
  };
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);

  // Parallax: the big name moves at about half the scroll speed, so How I work
  // passes over it. Off for people who ask for reduced motion.
  const hero = document.querySelector('.hero');
  if (name && hero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let pending = false;
    const drift = () => {
      pending = false;
      const y = Math.min(window.scrollY, hero.offsetHeight);
      name.style.transform = `translate3d(0, ${y * 0.5}px, 0)`;
    };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();
  }

  // Once the big name scrolls away, it reappears in the sticky bar.
  const bar = document.querySelector('.bar');
  if (bar && name) {
    let ticking = false;
    const check = () => {
      ticking = false;
      // The name is gone once it has scrolled under the bar or slid fully under How I work.
      const n = name.getBoundingClientRect(), h = name.closest('.hero').getBoundingClientRect();
      bar.classList.toggle('is-stuck', n.bottom < bar.offsetHeight || n.top >= h.bottom - 1);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
    check();
  }

  // Hands-on strip: arrows move one project at a time.
  const strip = document.querySelector('.ho-track');
  const [back, fwd] = document.querySelectorAll('.ho-arrows button');
  if (strip && back && fwd) {
    const step = () => strip.querySelector('.ho-slide').getBoundingClientRect().width + parseFloat(getComputedStyle(strip).columnGap);
    back.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: 'smooth' }));
    fwd.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: 'smooth' }));
    const ends = () => {
      back.disabled = strip.scrollLeft < 4;
      fwd.disabled = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 4;
    };
    strip.addEventListener('scroll', ends, { passive: true });

    // Mouse drag (touch already swipes natively). A real drag doesn't open the project.
    let startX = 0, startLeft = 0, moved = false, dragging = false;
    strip.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = false; startX = e.clientX; startLeft = strip.scrollLeft;
    });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; strip.classList.add('dragging'); }
      if (moved) strip.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      // Settle on the nearest project, as the snap would
      const s = step(), target = Math.round(strip.scrollLeft / s) * s;
      strip.classList.remove('dragging');
      strip.scrollLeft = strip.scrollLeft; // keep position while snap returns
      strip.scrollTo({ left: target, behavior: 'smooth' });
    });
    strip.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
    strip.addEventListener('dragstart', e => e.preventDefault());
    window.addEventListener('resize', ends);
    ends();
  }

  // Email me: also copy the address, for visitors without a mail app set up.
  const mail = document.querySelector('[data-copy]');
  if (mail) {
    const label = mail.querySelector('span');
    const status = document.getElementById('copy-status');
    const copy = async (text) => {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
      try { // fallback where the clipboard API is blocked
        const t = Object.assign(document.createElement('textarea'), { value: text });
        t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        const ok = document.execCommand('copy'); t.remove(); return ok;
      } catch (e) { return false; }
    };
    let timer;
    mail.addEventListener('click', async () => {
      if (!(await copy(mail.dataset.copy))) return;
      label.textContent = 'Email copied';
      if (status) status.textContent = 'Email address copied';
      clearTimeout(timer);
      timer = setTimeout(() => { label.textContent = 'Email me'; if (status) status.textContent = ''; }, 2200);
    });
  }

  // Reveal once on entering; stagger siblings.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }) : null;
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--stagger', `${Math.min(sibs.indexOf(el), 5) * 70}ms`);
    if (io) io.observe(el); else el.classList.add('is-in');
  });
})();

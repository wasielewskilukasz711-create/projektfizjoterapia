/* ═══════════════════════════════════════════════════════════════════════
   skrypt.js — wspólny dla wszystkich podstron
   Dołączaj na KAŻDEJ stronie: <script src="skrypt.js" defer></script>
   ═══════════════════════════════════════════════════════════════════════

   ZASADA: każdy moduł działa niezależnie i sam sprawdza, czy jego
   elementy istnieją na danej podstronie. Awaria jednego nigdy nie
   zatrzyma pozostałych — to właśnie ten mechanizm zapobiega sytuacji,
   w której brakujący przycisk menu wygasza całą treść strony.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Izolacja modułu: błąd trafia do konsoli, reszta strony żyje dalej.
     onFail pozwala modułowi zostawić stronę w bezpiecznym stanie.      */
  const init = (name, fn, onFail) => {
    try {
      fn();
    } catch (err) {
      console.error(`[skrypt.js → ${name}]`, err);
      if (onFail) { try { onFail(); } catch (_) {} }
    }
  };


  /* ── 1. Animacja wejścia sekcji ──────────────────────────────────────
     Uruchamiana JAKO PIERWSZA. CSS ukrywa .reveal dopóki JS nie doda
     .is-in, więc ten moduł ma najwyższy priorytet — gdyby padł,
     onFail natychmiast odsłania całą treść.                            */
  function modReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = Math.min(i * 70, 280) + 'ms';
        entry.target.classList.add('is-in');
        o.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(el => obs.observe(el));
  }


  /* ── 2. Cień nagłówka po przewinięciu ─────────────────────────────── */
  function modStickyHeader() {
    const header = $('#header');
    if (!header) return;

    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  /* ── 3. Menu mobilne ──────────────────────────────────────────────── */
  function modMobileMenu() {
    const burger = $('#burger');
    const mnav   = $('#mobileNav');
    if (!burger || !mnav) return;

    const setMenu = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      mnav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };

    burger.addEventListener('click', () => {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    mnav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    matchMedia('(min-width:1081px)').addEventListener('change', (e) => {
      if (e.matches) setMenu(false);
    });
  }


  /* ── 4. Podświetlenie aktywnej sekcji w menu ──────────────────────────
     Dotyczy tylko kotwic (#sekcja) na bieżącej stronie. Linki do innych
     podstron oznaczaj ręcznie klasą .is-active w HTML.                 */
  function modActiveNav() {
    const links = $$('.nav a[href^="#"]');
    const sections = links
      .map(a => $(a.getAttribute('href')))
      .filter(Boolean);
    if (!('IntersectionObserver' in window) || !sections.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(a => {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(s => obs.observe(s));
  }


  /* ── 5. Wyróżnienie dzisiejszego dnia w godzinach otwarcia ────────── */
  function modOpeningHours() {
    const row = $(`#hours li[data-day="${new Date().getDay()}"]`);
    if (!row || !row.firstElementChild) return;

    row.classList.add('today');
    row.firstElementChild.insertAdjacentHTML('beforeend', ' · dziś');
  }


  /* ── 6. Rok w stopce ──────────────────────────────────────────────── */
  function modFooterYear() {
    const el = $('#year');
    if (!el) return;
    el.textContent = new Date().getFullYear();
  }


  /* ── 7. Formularz kontaktowy ──────────────────────────────────────────
     Brak backendu. Podłącz jedno z:
       • własny endpoint PHP / Node (fetch POST poniżej)
       • Formspree / Getform / Basin — ustaw action i method na <form>
       • Netlify Forms lub funkcję serverless hostingu                  */
  function modContactForm() {
    const form   = $('#contactForm');
    const status = $('#formStatus');
    if (!form || !status) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = '';
        return;
      }
      status.textContent = 'Dziękuję — wiadomość została wysłana. Odpowiem w ciągu [X] h.';
      form.reset();
      // TODO: await fetch('/api/kontakt', { method:'POST', body:new FormData(form) });
    });
  }


  /* ── 8. Pomiar kliknięć w rezerwację (GA4) ────────────────────────── */
  function modAnalytics() {
    $$('[data-cta]').forEach(el => {
      el.addEventListener('click', () => {
        if (typeof gtag === 'function') {
          gtag('event', 'rezerwacja_klik', { miejsce: el.dataset.cta });
        }
      });
    });
  }


  /* ── Start ────────────────────────────────────────────────────────── */
  init('reveal', modReveal, () => $$('.reveal').forEach(el => el.classList.add('is-in')));
  init('sticky-header', modStickyHeader);
  init('menu-mobilne',  modMobileMenu);
  init('aktywna-sekcja', modActiveNav);
  init('godziny',       modOpeningHours);
  init('rok-w-stopce',  modFooterYear);
  init('formularz',     modContactForm);
  init('analityka',     modAnalytics);
})();

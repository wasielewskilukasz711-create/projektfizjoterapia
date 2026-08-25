/* ═══════════════════════════════════════════════════════════════════════
   kalendarz.js — kalendarz rezerwacji
   Dołączaj TYLKO na podstronie z rezerwacją:
       <script src="kalendarz.js" defer></script>
   ═══════════════════════════════════════════════════════════════════════

   Kalendarz pokazuje DNI PRZYJĘĆ wyliczone z godzin otwarcia poniżej,
   a nie wolne godziny — tych Booksy nie udostępnia publicznie przez API.
   Konkretną godzinę pacjent wybiera już w oknie Booksy.

   CAŁA KONFIGURACJA SIEDZI W OBIEKCIE `BOOKING`. Nic poniżej niego
   nie trzeba ruszać.
   ═══════════════════════════════════════════════════════════════════════ */

const BOOKING = {
  booksyUrl:  '[LINK BOOKSY]',
  phone:      '+48607051191',
  phoneLabel: '607 051 191',

  services: ['Pierwsza wizyta', 'Wizyta kolejna', 'Terapia kompleksowa'],
  times:    ['Rano', 'Południe', 'Popołudnie'],

  // klucz = dzień tygodnia (0 = niedziela). null = nieczynne, dzień wyszarzony.
  hours: {
    1: '[GODZ-PN]',
    2: '[GODZ-WT]',
    3: '[GODZ-SR]',
    4: '[GODZ-CZ]',
    5: '[GODZ-PT]',
    6: '[GODZ-SO]',
    0: null
  },

  weeksAhead: 10   // jak daleko w przód można wybrać termin
};


(() => {
  'use strict';

  const grid = document.getElementById('calGrid');
  if (!grid) return;                       // ta podstrona nie ma kalendarza

  const $ = (sel) => document.querySelector(sel);

  const MONTHS = ['styczeń','luty','marzec','kwiecień','maj','czerwiec',
                  'lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
  const DOW = ['Pn','Wt','Śr','Cz','Pt','So','Nd'];

  const elMonth = document.getElementById('calMonth');
  const elPrev  = document.getElementById('calPrev');
  const elNext  = document.getElementById('calNext');
  const elSum   = document.getElementById('calSum');
  const elMsg   = document.getElementById('calMsg');
  const elGo    = document.getElementById('calGo');

  if (!elMonth || !elPrev || !elNext || !elSum || !elGo) {
    console.error('[kalendarz.js] Brakuje elementów kalendarza w HTML.');
    return;
  }

  const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const today = midnight(new Date());
  const last  = midnight(new Date(Date.now() + BOOKING.weeksAhead * 7 * 864e5));

  const isOpen   = (d) => Boolean(BOOKING.hours[d.getDay()]);
  const pickable = (d) => isOpen(d) && d >= today && d <= last;
  const fmtDay   = (d) => d.toLocaleDateString('pl-PL', { weekday:'long', day:'numeric', month:'long' });

  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const state = { service: BOOKING.services[0], day: null, time: null };


  /* ── Pigułki wyboru (usługa, pora dnia) ───────────────────────────── */
  function buildPills(id, items, key) {
    const box = document.getElementById(id);
    if (!box) return;

    box.innerHTML = '';
    items.forEach(value => {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.type = 'button';
      btn.textContent = value;
      btn.setAttribute('aria-pressed', String(state[key] === value));

      btn.addEventListener('click', () => {
        state[key] = state[key] === value ? null : value;
        [...box.children].forEach(c => {
          c.setAttribute('aria-pressed', String(c.textContent === state[key]));
        });
        summarise();
      });

      box.appendChild(btn);
    });
  }


  /* ── Siatka miesiąca ──────────────────────────────────────────────── */
  function render() {
    elMonth.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    elPrev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    elNext.disabled = view >= new Date(last.getFullYear(),  last.getMonth(),  1);

    grid.innerHTML = '';

    DOW.forEach(name => {
      const head = document.createElement('div');
      head.className = 'cal-dow';
      head.textContent = name;
      grid.appendChild(head);
    });

    // puste pola przed 1. dniem miesiąca (tydzień zaczyna się w poniedziałek)
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const lead  = (first.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) {
      const pad = document.createElement('div');
      pad.className = 'cal-day pad';
      grid.appendChild(pad);
    }

    const total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= total; n++) {
      const date = new Date(view.getFullYear(), view.getMonth(), n);
      const can  = pickable(date);
      const btn  = document.createElement('button');

      btn.type = 'button';
      btn.textContent = n;
      btn.disabled = !can;
      btn.className = 'cal-day'
        + (can ? ' open' : '')
        + (date.getTime() === today.getTime() ? ' is-today' : '');
      btn.setAttribute('aria-pressed', String(Boolean(state.day) && state.day.getTime() === date.getTime()));
      btn.setAttribute('aria-label', n + ' ' + MONTHS[view.getMonth()] + (can ? '' : ', nieczynne'));

      if (can) {
        btn.addEventListener('click', () => {
          const same = state.day && state.day.getTime() === date.getTime();
          state.day = same ? null : date;
          render();
          summarise();
        });
      }

      grid.appendChild(btn);
    }
  }


  /* ── Podsumowanie wyboru ──────────────────────────────────────────── */
  function summarise() {
    const bits = [];
    if (state.service) bits.push('<b>' + state.service + '</b>');
    if (state.day)     bits.push(fmtDay(state.day));
    if (state.time)    bits.push(state.time.toLowerCase());

    const hrs = state.day ? BOOKING.hours[state.day.getDay()] : null;

    elSum.innerHTML = bits.length
      ? bits.join(' · ') + (hrs
          ? '<span class="hint">Przyjmuję tego dnia ' + hrs +
            '. Konkretną godzinę wybierzesz w kalendarzu Booksy.</span>'
          : '')
      : '<span class="hint">Wybierz rodzaj wizyty i dzień — resztę ustalisz w kalendarzu Booksy.</span>';
  }


  /* ── Otwarcie rezerwacji ──────────────────────────────────────────────
     Najpierw szukamy oficjalnego widgetu Booksy osadzonego na stronie —
     wtedy okno rezerwacji otwiera się bez opuszczania witryny.
     Dopiero gdy go nie ma, przechodzimy na profil Booksy.              */
  function openBooking() {
    const widget = $('[data-booksy-widget], .booksy-widget-button, #booksy-widget button, a[href*="booksy"][class*="widget"]');
    if (widget) { widget.click(); return true; }
    if (typeof window.BooksyWidget?.open === 'function') { window.BooksyWidget.open(); return true; }
    return false;
  }

  elGo.addEventListener('click', () => {
    if (elMsg) elMsg.textContent = '';

    if (!state.day) {
      if (elMsg) elMsg.textContent = 'Wybierz najpierw dzień w kalendarzu.';
      return;
    }
    if (openBooking()) return;

    if (BOOKING.booksyUrl.startsWith('http')) {
      window.open(BOOKING.booksyUrl, '_blank', 'noopener');
    } else if (elMsg) {
      elMsg.innerHTML = 'Rezerwacja online nie jest jeszcze podłączona. Zadzwoń: '
        + '<a href="tel:' + BOOKING.phone + '">' + BOOKING.phoneLabel + '</a>';
    }
  });


  /* ── Start ────────────────────────────────────────────────────────── */
  buildPills('calServices', BOOKING.services, 'service');
  buildPills('calTimes',    BOOKING.times,    'time');
  elPrev.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
  elNext.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
  render();
  summarise();
})();

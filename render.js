/* Sealwheels — data loading, rendering, and form wiring.
 *
 * Design/content separation: this file never hardcodes a car. It reads cars.json
 * and paints the DOM. If you later swap in a redesigned index.html, keep the same
 * element ids/classes (or update the SELECTORS block) and the loading + form logic
 * below is reusable as-is.
 */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. CONFIG — the only things you edit in this file
   * ------------------------------------------------------------------ */

  // Two SEPARATE Formspree endpoints so buyer leads and content votes land apart.
  // Create two forms at https://formspree.io, then paste each form's endpoint here.
  const FORMSPREE_LEADS = 'https://formspree.io/f/REPLACE_LEADS_ID'; // "Find me a car"
  const FORMSPREE_VOTES = 'https://formspree.io/f/REPLACE_VOTES_ID'; // "Film it next"

  const DATA_URL = 'cars.json';

  // ── FUTURE: swap the JSON source for a Google Sheet ──────────────────
  // To drive the list from a Google Sheet instead of cars.json, publish the
  // sheet as CSV/JSON (e.g. an Apps Script web app or the gviz endpoint) and
  // replace loadCars() below so it fetches that URL and maps the rows to the
  // same car objects. Nothing else here needs to change. Not implemented now.
  //   const SHEET_URL = 'https://script.google.com/macros/s/XXXX/exec';
  // ─────────────────────────────────────────────────────────────────────

  /* ------------------------------------------------------------------ *
   * 2. DATA LOADING (reusable across templates)
   * ------------------------------------------------------------------ */

  async function loadCars() {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return Array.isArray(data.cars) ? data.cars : [];
  }

  /* ------------------------------------------------------------------ *
   * 3. FORMATTING + VIEW MODEL
   * ------------------------------------------------------------------ */

  // Precise GBP, no decimals: 60950 -> "£60,950"
  const fmtGBP = (n) => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB');

  // Show just the 4-digit model year — drop dealership plate codes and trim text,
  // e.g. "2023 (73) Vorsprung" -> "2023", "2021 Assetto Fiorano" -> "2021".
  const yearOf = (y) => {
    const m = String(y || '').match(/\b(\d{4})\b/);
    return m ? m[1] : String(y || '');
  };

  // Best-effort brand for the filter dropdown: use an explicit `brand` field if
  // present, otherwise infer from the name (handling the multi-word marques).
  const MULTIWORD_BRANDS = ['Aston Martin', 'Rolls-Royce', 'Mercedes-AMG', 'Mercedes-Benz', 'Land Rover', 'Alfa Romeo'];
  function brandOf(car) {
    if (car.brand) return car.brand;
    const n = car.name || '';
    for (const b of MULTIWORD_BRANDS) if (n.startsWith(b)) return b;
    return n.split(' ')[0] || '';
  }

  // Stable hue per car name -> the gradient poster used as a thumbnail fallback.
  function hueFor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
  }

  function toView(car) {
    const isSold = car.status === 'sold';
    const href = car.listingUrl && car.listingUrl.length ? car.listingUrl : car.fallbackUrl;
    const hasVideo = !!(car.videoUrl && car.videoUrl.length);
    const hue = hueFor(car.name || '');
    return {
      name: car.name || '',
      year: yearOf(car.year),
      priceLabel: fmtGBP(car.price),
      netLabel: fmtGBP(car.salaryNet),
      // Assumed annual mileage the figures are based on. Default 5,000; only the
      // early cars (M3, RS6) were worked out at 10,000. Shown as e.g. "10k".
      miles: Math.round((Number(car.milesPerYear) || 5000) / 1000) + 'k',
      isSold,
      href,
      ctaLabel: isSold ? 'Find similar' : (car.dealer ? 'View at ' + car.dealer : 'View listing'),
      hasVideo,
      videoUrl: car.videoUrl || '',
      platformLabel: car.platform === 'instagram' ? 'INSTAGRAM' : 'TIKTOK',
      image: car.image || '',
      poster: `linear-gradient(155deg, hsl(${hue} 42% 30%), hsl(${hue} 46% 13%))`,
    };
  }

  /* ------------------------------------------------------------------ *
   * 4. RENDERING
   * ------------------------------------------------------------------ */

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function cardHTML(v) {
    // Thumbnail: a link when there's a video, otherwise a static "clip soon" tile.
    const thumbInner = `
      <span class="thumb-badge">${esc(v.platformLabel)}</span>
      ${v.hasVideo ? `
        ${v.image ? `<img class="thumb-img" src="images/${esc(v.image)}" alt="" loading="lazy" onerror="this.remove()">` : ``}
        <span class="thumb-play-wrap"><span class="thumb-play">&#9654;</span></span>
        <span class="thumb-watch">WATCH</span>
      ` : `
        <span class="thumb-soon">
          <span class="thumb-soon-icon">&#9654;</span>
          <span class="thumb-soon-lbl">CLIP SOON</span>
        </span>
      `}`;

    const thumb = v.hasVideo
      ? `<a class="thumb" style="--poster:${v.poster}" href="${esc(v.videoUrl)}" target="_blank" rel="noopener">${thumbInner}</a>`
      : `<div class="thumb" style="--poster:${v.poster}">${thumbInner}</div>`;

    const soldOverlay = v.isSold ? `
      <a class="sold-overlay" href="${esc(v.href)}" target="_blank" rel="noopener">
        <span class="sold-word">SOLD</span>
        <span class="sold-sub">${esc(v.name)} — find similar &rarr;</span>
      </a>` : ``;

    return `
      <article class="card">
        <div class="card-main">
          ${thumb}
          <div class="card-body">
            <div class="car-name">${esc(v.name)}</div>
            <div class="car-meta">${esc(v.year)} · ${esc(v.priceLabel)} · ${esc(v.miles)} mi/yr</div>
            <div class="car-salary">
              <span class="salary-net">${esc(v.netLabel)}</span>
              <span class="salary-unit">/yr net to own</span>
            </div>
          </div>
        </div>
        <a class="card-cta" href="${esc(v.href)}" target="_blank" rel="noopener">
          <span class="cta-label">${esc(v.ctaLabel)}</span>
          <span class="cta-arrow">&rarr;</span>
        </a>
        ${soldOverlay}
      </article>`;
  }

  function renderCars(cars, mount, countEl) {
    if (countEl) countEl.textContent = cars.length;
    if (!cars.length) {
      mount.innerHTML = `<div class="state">No cars match — try widening your filters.</div>`;
      return;
    }
    mount.innerHTML = cars.map((c) => cardHTML(toView(c))).join('');
  }

  /* ------------------------------------------------------------------ *
   * 5. FORMS (reusable across templates)
   * ------------------------------------------------------------------ */

  function wireForm(form) {
    if (!form) return;
    const endpoint = form.getAttribute('data-endpoint') || '';
    const msg = form.querySelector('.form-msg');
    const say = (text, ok) => { if (msg) { msg.textContent = text; msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); } };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (endpoint.includes('REPLACE_')) {
        say('Form not connected yet — paste your Formspree endpoint in render.js.', false);
        return;
      }

      const btn = form.querySelector('button[type="submit"], button:not([type])');
      const label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      say('', true);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          form.reset();
          say(form.getAttribute('data-ok') || 'Thanks — got it.', true);
        } else {
          say('Something went wrong — please try again.', false);
        }
      } catch (_) {
        say('Network error — please try again.', false);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = label; }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. INIT
   * ------------------------------------------------------------------ */

  document.addEventListener('DOMContentLoaded', async () => {
    // Attach the Formspree endpoints declared above to the two forms.
    const leadForm = document.getElementById('find-form');
    const voteForm = document.getElementById('suggest-form');
    if (leadForm) leadForm.setAttribute('data-endpoint', FORMSPREE_LEADS);
    if (voteForm) voteForm.setAttribute('data-endpoint', FORMSPREE_VOTES);
    wireForm(leadForm);
    wireForm(voteForm);

    // "Find me a car" dock button -> smooth-scroll to the form.
    document.querySelectorAll('[data-scroll]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = document.getElementById(el.getAttribute('data-scroll'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Load + render the car list, with brand + max-salary filtering.
    const mount = document.getElementById('car-list');
    const countEl = document.getElementById('car-count');
    const searchEl = document.getElementById('search-q');
    const brandSel = document.getElementById('filter-brand');
    const salarySel = document.getElementById('filter-salary');
    const filterToggle = document.getElementById('filter-toggle');
    const filterPanel = document.getElementById('filter-panel');

    const applyFilters = (cars) => {
      const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
      const brand = brandSel && brandSel.value;
      const maxSalary = salarySel && salarySel.value ? Number(salarySel.value) : 0;
      const shown = cars.filter((c) =>
        (!q || (c.name || '').toLowerCase().includes(q)) &&
        (!brand || brandOf(c) === brand) &&
        (!maxSalary || Number(c.salaryNet) <= maxSalary));
      renderCars(shown, mount, countEl);
      // Lime dot on the filter icon when a brand/salary filter is active.
      if (filterToggle) filterToggle.classList.toggle('active', !!(brand || maxSalary));
    };

    // Filter icon reveals the brand/salary popover; clicking away closes it.
    if (filterToggle && filterPanel) {
      const setOpen = (open) => {
        filterPanel.hidden = !open;
        filterToggle.classList.toggle('open', open);
        filterToggle.setAttribute('aria-expanded', String(open));
      };
      filterToggle.addEventListener('click', () => setOpen(filterPanel.hidden));
      document.addEventListener('click', (e) => {
        if (!filterPanel.hidden && !e.target.closest('.search')) setOpen(false);
      });
    }

    try {
      const cars = await loadCars();

      // Populate the brand dropdown from the data (unique, alphabetical).
      if (brandSel) {
        [...new Set(cars.map(brandOf))].sort().forEach((b) => {
          const o = document.createElement('option');
          o.value = b;
          o.textContent = b;
          brandSel.appendChild(o);
        });
      }

      const run = () => applyFilters(cars);
      if (searchEl) searchEl.addEventListener('input', run);
      if (brandSel) brandSel.addEventListener('change', run);
      if (salarySel) salarySel.addEventListener('change', run);
      run(); // initial paint, no filters applied
    } catch (err) {
      if (mount) mount.innerHTML = `<div class="state">Couldn't load the car list. Refresh to try again.</div>`;
      console.error('[sealwheels] failed to load cars.json:', err);
    }
  });
})();

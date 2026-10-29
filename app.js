(() => {
  'use strict';

  // Anonymous usage totals via Abacus (https://abacus.jasoncameron.dev), a free counter
  // with no sign-up. Only two numbers are sent: +1 on "started" and +1 on "completed".
  // Check them at https://abacus.jasoncameron.dev/get/<COUNTER_NAMESPACE>/started (or /completed).
  // Set to '' to disable.
  const COUNTER_NAMESPACE = 'bret-a-homer-value-cards';

  const STORE_KEY = 'value-cards:v1';
  const NAME_MAX = 24;
  const DEF_MAX = 90;

  const PICKS = {
    1: { from: null, key: 'ten', target: 10, title: 'Choose your ten',
         hint: 'Look through the deck and set aside the ten values that matter most to you. Tap a card again to put it back.' },
    2: { from: 'ten', key: 'five', target: 5, title: 'Narrow it to five',
         hint: 'If you could keep only five of these, which would they be?' },
    3: { from: 'five', key: 'three', target: 3, title: 'Find your core three',
         hint: 'Of these five, which three sit at the very center?' },
  };
  const DEFINE = 4;
  const RESULT = 5;

  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const tray = $('#tray');
  const backBtn = $('#back');
  const progress = $('#progress');
  const toastEl = $('#toast');

  // ---------- State ----------

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fresh() {
    return { step: 1, order: shuffle(VALUES), ten: [], five: [], three: [], names: {}, defs: {}, counted: false };
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      const sameDeck = s && Array.isArray(s.order) && s.order.length === VALUES.length &&
        s.order.every(v => VALUES.includes(v));
      if (sameDeck) return s;
    } catch (e) { /* storage unavailable or corrupt */ }
    return null;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  let state = load() || fresh();
  let view = 0; // 0 = intro; otherwise mirrors state.step

  function go(step) {
    state.step = step;
    view = step;
    save();
    render();
    window.scrollTo({ top: 0 });
  }

  const finals = () => [...state.three, ...state.five.filter(v => !state.three.includes(v))];
  const nameOf = v => (state.names[v] || '').trim() || v;
  const defOf = v => (state.defs[v] || '').trim();

  // ---------- Helpers ----------

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // A small, stable tilt per card so the table looks hand-dealt.
  function tilt(v) {
    let h = 0;
    for (const ch of v) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return ((Math.abs(h) % 33) - 16) / 10; // -1.6 .. 1.6 deg
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // Shrink a card's label until its longest word fits.
  function fitLabels(root) {
    root.querySelectorAll('.card .label').forEach(l => {
      l.style.fontSize = '';
      let fs = parseFloat(getComputedStyle(l).fontSize);
      while (l.scrollWidth > l.clientWidth + 1 && fs > 10) {
        fs -= 0.5;
        l.style.fontSize = fs + 'px';
      }
    });
  }

  // Once a card has dealt in, drop the deal animation so a later shake doesn't replay it.
  app.addEventListener('animationend', e => {
    if (e.animationName === 'deal') e.target.classList.add('dealt');
    if (e.animationName === 'nope') e.target.classList.remove('nope');
  });

  // ---------- Usage counting ----------

  const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  function countEvent(name) {
    if (!COUNTER_NAMESPACE || isLocal) return;
    try {
      fetch(`https://abacus.jasoncameron.dev/hit/${COUNTER_NAMESPACE}/${name}`, { mode: 'no-cors', keepalive: true })
        .catch(() => {});
    } catch (e) { /* ignore */ }
  }

  // ---------- Rendering ----------

  function render() {
    app.oninput = null;
    backBtn.hidden = view === 0;
    tray.hidden = !(view >= 1 && view <= DEFINE);
    progress.innerHTML = view >= 1 && view <= DEFINE
      ? `<span>Step ${view} of 4</span><span class="dots">${[1, 2, 3, 4].map(i => `<i class="${i <= view ? 'on' : ''}"></i>`).join('')}</span>`
      : '';

    if (view === 0) renderIntro();
    else if (PICKS[view]) renderPick(view);
    else if (view === DEFINE) renderDefine();
    else renderResult();
  }

  function renderIntro() {
    const inProgress = state.step > 1 || state.ten.length > 0;
    app.innerHTML = `
      <section class="intro">
        <div class="fan" aria-hidden="true">
          <div class="card" style="--r:-10deg;--d:0ms"><span class="label">Curiosity</span></div>
          <div class="card" style="--r:1deg;--d:90ms"><span class="label">Honesty</span></div>
          <div class="card" style="--r:11deg;--d:180ms"><span class="label">Family</span></div>
        </div>
        <h1>Value Cards</h1>
        <p class="lede">A deck of fifty values. Sort through it to find the five that matter most to you, and the three at your core.</p>
        <ol class="steps">
          <li><span><b>Choose 10</b> from the deck of 50</span></li>
          <li><span><b>Narrow to 5</b></span></li>
          <li><span><b>Pick your core 3</b></span></li>
          <li><span><b>Make them yours:</b> rename them if you like, and say in one line what each means to you</span></li>
        </ol>
        <div class="intro-actions">
          ${inProgress
            ? `<button class="btn primary" data-act="resume">Pick up where you left off</button>
               <button class="btn ghost" data-act="restart">Start over</button>`
            : `<button class="btn primary" data-act="begin">Begin</button>`}
        </div>
        <p class="fine">About ten minutes. Your choices stay on this device.</p>
        <details class="about">
          <summary>Where these values come from</summary>
          <p>The deck is adapted from the <i>Personal Values Card Sort</i> (Miller, C'de Baca, Matthews &amp; Wilbourne, 2001), which is in the public domain. It was cross-checked against Shalom Schwartz's theory of basic human values (1992, 2012) and the Rokeach Value Survey (1973), so that every broad family of human values has at least one card.</p>
          <p>There are no right answers. Pick what's true for you now, not what you think you should value.</p>
        </details>
      </section>`;
  }

  function renderPick(n) {
    const cfg = PICKS[n];
    const pool = cfg.from ? state.order.filter(v => state[cfg.from].includes(v)) : state.order;
    state[cfg.key] = state[cfg.key].filter(v => pool.includes(v));
    const size = pool.length <= 3 ? 'few three' : pool.length <= 10 ? 'few' : '';

    app.innerHTML = `
      <section class="pick">
        <h2>${cfg.title}</h2>
        <p class="hint">${cfg.hint}</p>
        <div class="table ${size}" id="table" role="group" aria-label="${cfg.title}">
          ${pool.map((v, i) => `
            <button class="card" type="button" data-v="${esc(v)}" aria-pressed="${state[cfg.key].includes(v)}"
              style="--r:${tilt(v)}deg;--d:${Math.min(i * 16, 640)}ms"><span class="label">${esc(v)}</span></button>`).join('')}
        </div>
      </section>`;

    tray.innerHTML = `
      <div class="tray-inner">
        <div class="stack" id="stack" aria-hidden="true"></div>
        <div class="tray-text"><b id="count"></b><span>set aside</span></div>
        <button class="btn primary" id="next" type="button">Continue</button>
      </div>`;

    const table = $('#table');
    const update = () => {
      const k = state[cfg.key].length;
      $('#count').textContent = `${k} of ${cfg.target}`;
      $('#stack').innerHTML = k === 0
        ? '<i class="empty"></i>'
        : Array.from({ length: k }, (_, i) => `<i style="translate:${i * 1.2}px ${-i * 2}px"></i>`).join('');
      $('#next').disabled = k !== cfg.target;
      table.classList.toggle('full', k === cfg.target);
    };

    table.addEventListener('click', e => {
      const card = e.target.closest('.card');
      if (!card) return;
      const v = card.dataset.v;
      const list = state[cfg.key];
      const at = list.indexOf(v);
      if (at >= 0) {
        list.splice(at, 1);
        card.setAttribute('aria-pressed', 'false');
      } else if (list.length < cfg.target) {
        list.push(v);
        card.setAttribute('aria-pressed', 'true');
        const stack = $('#stack');
        stack.classList.remove('bump');
        void stack.offsetWidth;
        stack.classList.add('bump');
      } else {
        card.classList.add('nope');
        toast(`You've set aside ${cfg.target}. Put one back to swap.`);
        return;
      }
      save();
      update();
    });

    $('#next').addEventListener('click', () => {
      if (state[cfg.key].length === cfg.target) go(n + 1);
    });

    update();
    fitLabels(table);
  }

  function renderDefine() {
    const list = finals();
    app.innerHTML = `
      <section class="define">
        <h2>Make them yours</h2>
        <p class="hint">These are your five. Rename any card if another word fits you better, then write one line about what it means to you.</p>
        <div class="vlist">
          ${list.map((v, i) => `
            <article class="vcard ${i < 3 ? 'core' : ''}" style="--r:${tilt(v) / 2}deg;--d:${i * 70}ms">
              ${i < 3 ? '<span class="badge">Core</span>' : ''}
              <label class="name-wrap">
                <span class="sr">Name for ${esc(v)}</span>
                <input class="name" data-v="${esc(v)}" value="${esc(nameOf(v))}" maxlength="${NAME_MAX}" autocomplete="off" enterkeyhint="next">
                <span class="pen" aria-hidden="true">&#9998;</span>
              </label>
              <span class="orig" data-orig="${esc(v)}">${nameOf(v) !== v ? `originally ${esc(v)}` : ''}</span>
              <label class="sr" for="def-${i}">What ${esc(v)} means to you</label>
              <textarea class="def" id="def-${i}" data-v="${esc(v)}" maxlength="${DEF_MAX}" rows="2"
                enterkeyhint="next" placeholder="To me, this means…">${esc(state.defs[v] || '')}</textarea>
              <span class="chars"><span>${(state.defs[v] || '').length}</span>/${DEF_MAX}</span>
            </article>`).join('')}
        </div>
      </section>`;

    tray.innerHTML = `
      <div class="tray-inner">
        <div class="tray-text"><b id="count"></b><span>defined</span></div>
        <button class="btn primary" id="next" type="button">See my values</button>
      </div>`;

    const update = () => {
      const done = list.filter(v => defOf(v)).length;
      $('#count').textContent = `${done} of 5`;
      $('#next').disabled = done !== 5;
    };

    app.oninput = e => {
      const el = e.target;
      const v = el.dataset.v;
      if (el.classList.contains('name')) {
        state.names[v] = el.value;
        const orig = app.querySelector(`.orig[data-orig="${CSS.escape(v)}"]`);
        orig.textContent = nameOf(v) !== v ? `originally ${v}` : '';
      } else if (el.classList.contains('def')) {
        el.value = el.value.replace(/\n/g, ' ');
        state.defs[v] = el.value;
        el.nextElementSibling.firstElementChild.textContent = el.value.length;
      }
      save();
      update();
    };

    // Enter moves to the next field rather than adding a line break.
    const fields = [...app.querySelectorAll('.name, .def')];
    fields.forEach((f, i) => f.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (fields[i + 1]) fields[i + 1].focus();
      else f.blur();
    }));
    app.querySelectorAll('.name').forEach(f => f.addEventListener('blur', () => {
      if (!f.value.trim()) { f.value = f.dataset.v; state.names[f.dataset.v] = ''; save(); }
    }));

    $('#next').addEventListener('click', () => {
      if (list.every(defOf)) go(RESULT);
    });
    update();
  }

  const canShareFiles = (() => {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
    } catch (e) { return false; }
  })();

  function renderResult() {
    const list = finals();
    const card = (v, i) => `
      <article class="vcard ${i < 3 ? 'core' : ''}" style="--r:${tilt(v) / 1.5}deg;--d:${i * 90}ms">
        <h3>${esc(nameOf(v))}</h3>
        <p>${esc(defOf(v))}</p>
      </article>`;

    app.innerHTML = `
      <section class="result">
        <p class="eyebrow">Your core values</p>
        <div class="core-row">${list.slice(0, 3).map(card).join('')}</div>
        <p class="eyebrow">Also guiding you</p>
        <div class="other-row">${list.slice(3).map((v, i) => card(v, i + 3)).join('')}</div>
        <div class="result-actions">
          <button class="btn primary" data-act="share">${canShareFiles ? 'Share image' : 'Save image'}</button>
          <button class="btn ghost" data-act="edit">Edit</button>
          <button class="btn ghost" data-act="restart">Start over</button>
        </div>
      </section>`;

    if (!state.counted) {
      state.counted = true;
      save();
      countEvent('completed');
    }
  }

  // ---------- Shareable image ----------

  function roundRect(x, X, Y, w, h, r) {
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + w, Y, X + w, Y + h, r);
    x.arcTo(X + w, Y + h, X, Y + h, r);
    x.arcTo(X, Y + h, X, Y, r);
    x.arcTo(X, Y, X + w, Y, r);
    x.closePath();
  }

  function wrap(x, text, maxWidth, maxLines) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (x.measureText(test).width <= maxWidth || !line) line = test;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last && x.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = last.trimEnd() + '…';
    }
    return lines;
  }

  function drawCard(x, X, Y, w, h, name, def, opts) {
    x.save();
    x.shadowColor = 'rgba(70, 45, 20, 0.16)';
    x.shadowBlur = 26;
    x.shadowOffsetY = 8;
    x.fillStyle = '#fffdf7';
    roundRect(x, X, Y, w, h, 22);
    x.fill();
    x.restore();

    x.lineWidth = 2;
    x.strokeStyle = opts.core ? 'rgba(180, 83, 42, 0.5)' : 'rgba(43, 38, 34, 0.13)';
    roundRect(x, X, Y, w, h, 22);
    x.stroke();
    x.lineWidth = 1.5;
    x.strokeStyle = 'rgba(43, 38, 34, 0.08)';
    roundRect(x, X + 10, Y + 10, w - 20, h - 20, 14);
    x.stroke();

    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#2b2622';
    x.font = `600 ${opts.nameSize}px Fraunces, Georgia, serif`;
    const nameLine = wrap(x, name, w - 60, 1)[0];

    x.font = `400 ${opts.defSize}px Inter, system-ui, sans-serif`;
    const lines = wrap(x, def, w - 64, opts.maxLines);
    const lineH = opts.defSize * 1.35;
    const block = opts.nameSize + 18 + lines.length * lineH;
    let y = Y + (h - block) / 2 + opts.nameSize * 0.85;

    x.font = `600 ${opts.nameSize}px Fraunces, Georgia, serif`;
    x.fillText(nameLine, X + w / 2, y);
    y += 18 + lineH;
    x.font = `400 ${opts.defSize}px Inter, system-ui, sans-serif`;
    x.fillStyle = '#4a423b';
    lines.forEach((l, i) => x.fillText(l, X + w / 2, y + i * lineH - lineH * 0.25));
  }

  async function makeImage() {
    try {
      await Promise.all([
        document.fonts.load('600 56px Fraunces'),
        document.fonts.load('400 30px Inter'),
        document.fonts.load('600 24px Inter'),
      ]);
    } catch (e) { /* fall back to system fonts */ }

    const W = 1080, H = 1440, M = 80;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');

    x.fillStyle = '#efe8dc';
    x.fillRect(0, 0, W, H);
    const glow = x.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W * 0.8);
    glow.addColorStop(0, 'rgba(255,255,255,0.5)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = glow;
    x.fillRect(0, 0, W, H);

    const label = (text, y) => {
      x.fillStyle = '#7a6f63';
      x.font = '600 24px Inter, system-ui, sans-serif';
      x.textAlign = 'center';
      if ('letterSpacing' in x) x.letterSpacing = '5px';
      x.fillText(text, W / 2, y);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    };

    const list = finals();
    label('MY CORE VALUES', 120);
    const coreH = 252, gap = 28;
    list.slice(0, 3).forEach((v, i) => {
      drawCard(x, M, 160 + i * (coreH + gap), W - 2 * M, coreH, nameOf(v), defOf(v),
        { core: true, nameSize: 56, defSize: 30, maxLines: 3 });
    });

    const top = 160 + 3 * coreH + 2 * gap;
    label('ALSO GUIDING ME', top + 66);
    const smallW = (W - 2 * M - gap) / 2;
    list.slice(3).forEach((v, i) => {
      drawCard(x, M + i * (smallW + gap), top + 100, smallW, 250, nameOf(v), defOf(v),
        { core: false, nameSize: 40, defSize: 24, maxLines: 4 });
    });

    return new Promise(resolve => c.toBlob(resolve, 'image/png'));
  }

  async function shareImage(btn) {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Making image…';
    try {
      const blob = await makeImage();
      const file = new File([blob], 'my-values.png', { type: 'image/png' });
      if (canShareFiles && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'My values' }); }
        catch (e) { if (e.name !== 'AbortError') throw e; }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'my-values.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch (e) {
      toast("Sorry, the image couldn't be made on this device.");
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  // ---------- Global actions ----------

  app.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'begin') { countEvent('started'); go(1); }
    else if (act === 'resume') go(state.step);
    else if (act === 'restart') {
      if (!confirm('Start over with a freshly shuffled deck? Your current choices will be cleared.')) return;
      state = fresh();
      countEvent('started');
      go(1);
    }
    else if (act === 'edit') go(DEFINE);
    else if (act === 'share') shareImage(btn);
  });

  backBtn.addEventListener('click', () => {
    if (view <= 1) { view = 0; render(); window.scrollTo({ top: 0 }); }
    else go(view - 1);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => fitLabels(app), 150);
  });
  document.fonts && document.fonts.ready.then(() => fitLabels(app));

  render();
})();

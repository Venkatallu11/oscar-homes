/* ============================================================
   OSCAR HOMES — AI Project Estimator
   Ballpark engine using South Jersey market cost data.
   Estimates only — never quotes.
   ============================================================ */
(function () {
  'use strict';

  /* ---- NJ market cost data: $/sqft [low, high] ---- */
  var PROJECTS = {
    kitchen:    { label: 'Kitchen Remodel',   icon: '🍳', range: [175, 325], sizeMin: 60,  sizeMax: 400,  sizeDef: 150,  sizeUnit: 'sq ft', weeks: [4, 8] },
    bathroom:   { label: 'Bathroom Remodel',  icon: '🛁', range: [200, 400], sizeMin: 30,  sizeMax: 200,  sizeDef: 60,   sizeUnit: 'sq ft', weeks: [3, 6] },
    addition:   { label: 'Home Addition',     icon: '🏗️', range: [225, 375], sizeMin: 200, sizeMax: 1500, sizeDef: 400,  sizeUnit: 'sq ft', weeks: [10, 20] },
    roofing:    { label: 'Roof Replacement', icon: '🏠', range: [6, 13],    sizeMin: 800, sizeMax: 4000, sizeDef: 1800, sizeUnit: 'sq ft of roof', weeks: [1, 2] },
    deck:       { label: 'Deck / Porch',      icon: '🪵', range: [35, 75],   sizeMin: 100, sizeMax: 1000, sizeDef: 350,  sizeUnit: 'sq ft', weeks: [2, 4] },
    basement:   { label: 'Basement Finish',   icon: '🛋️', range: [85, 165],  sizeMin: 300, sizeMax: 1500, sizeDef: 700,  sizeUnit: 'sq ft', weeks: [6, 12] },
    siding:     { label: 'Siding / Exterior', icon: '🧱', range: [8, 17],    sizeMin: 800, sizeMax: 3500, sizeDef: 1600, sizeUnit: 'sq ft of wall', weeks: [2, 4] },
    commercial: { label: 'Commercial Buildout', icon: '🏢', range: [120, 280], sizeMin: 500, sizeMax: 10000, sizeDef: 2000, sizeUnit: 'sq ft', weeks: [8, 16] }
  };

  var TIERS = {
    essential: { label: 'Essential',   desc: 'Quality basics, smart value',        mult: 0.88 },
    signature: { label: 'Signature',  desc: 'Our most popular finish level',      mult: 1.0 },
    luxe:      { label: 'Luxe',       desc: 'Premium materials & custom details',  mult: 1.38 }
  };

  var SPEEDS = {
    flexible: { label: 'Flexible',   desc: 'Best pricing, we schedule around you', mult: 0.95, tmult: 1.25 },
    standard: { label: 'Standard',   desc: 'Normal scheduling & pacing',           mult: 1.0,  tmult: 1.0 },
    priority: { label: 'Priority',   desc: 'Fast-tracked crew & permits',         mult: 1.12, tmult: 0.8 }
  };

  var PHASES = [
    { label: 'Design & Permits',        pct: 8 },
    { label: 'Demolition & Prep',       pct: 10 },
    { label: 'Materials',              pct: 38 },
    { label: 'Skilled Labor',          pct: 34 },
    { label: 'Finishing & Walkthrough', pct: 10 }
  ];

  var STEPS = ['Project', 'Size', 'Finish Level', 'Timeline'];

  var state = { step: 0, type: null, size: null, tier: null, speed: null };

  var $ = function (id) { return document.getElementById(id); };
  var body = $('estBody'), stepsEl = $('estSteps'), fill = $('estProgressFill'),
      backBtn = $('estBack'), resultEl = $('estResult'), cardEl = $('estimatorCard');

  /* ---------- render ---------- */
  function renderSteps() {
    stepsEl.innerHTML = STEPS.map(function (s, i) {
      var cls = 'est-step' + (i === state.step ? ' active' : '') + (i < state.step ? ' done' : '');
      return '<span class="' + cls + '">' + (i + 1) + '. ' + s + '</span>';
    }).join('');
    fill.style.width = ((state.step) / STEPS.length * 100) + '%';
    backBtn.disabled = state.step === 0;
  }

  function optCard(key, icon, label, desc) {
    return '<button class="est-opt" data-val="' + key + '">' +
      '<span class="opt-icon">' + icon + '</span><strong>' + label + '</strong>' +
      (desc ? '<small>' + desc + '</small>' : '') + '</button>';
  }

  function render() {
    renderSteps();
    var h = '';
    if (state.step === 0) {
      h = '<p class="est-q">What are we building?</p><div class="est-opts">' +
        Object.keys(PROJECTS).map(function (k) {
          var p = PROJECTS[k];
          return optCard(k, p.icon, p.label, '$' + p.range[0] + '–$' + p.range[1] + ' / ' + p.sizeUnit.replace('sq ft of ', '') + ' typical');
        }).join('') + '</div>';
    } else if (state.step === 1) {
      var p = PROJECTS[state.type];
      h = '<p class="est-q">How big is the ' + p.label.toLowerCase() + '?</p>' +
        '<div class="est-slider-wrap"><div class="est-slider-val"><span id="sizeVal">' + p.sizeDef + '</span> <small>' + p.sizeUnit + '</small></div>' +
        '<input type="range" class="est-slider" id="sizeSlider" min="' + p.sizeMin + '" max="' + p.sizeMax + '" step="10" value="' + p.sizeDef + '">' +
        '<div class="est-slider-labels"><span>' + p.sizeMin + '</span><span>' + p.sizeMax + ' ' + p.sizeUnit + '</span></div></div>' +
        '<div class="est-opts">' +
          optCard('continue', '➜', 'Continue', 'Fine-tune later in consultation') + '</div>';
    } else if (state.step === 2) {
      h = '<p class="est-q">What finish level fits your vision?</p><div class="est-opts">' +
        Object.keys(TIERS).map(function (k) {
          return optCard(k, '✦', TIERS[k].label, TIERS[k].desc);
        }).join('') + '</div>';
    } else if (state.step === 3) {
      h = '<p class="est-q">When do you want to start?</p><div class="est-opts">' +
        Object.keys(SPEEDS).map(function (k) {
          return optCard(k, '◷', SPEEDS[k].label, SPEEDS[k].desc);
        }).join('') + '</div>';
    }
    body.innerHTML = h;
    wireStep();
  }

  function wireStep() {
    body.querySelectorAll('.est-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.dataset.val;
        if (state.step === 0) { state.type = v; state.size = PROJECTS[v].sizeDef; }
        else if (state.step === 1 && v === 'continue') { state.size = parseInt($('sizeSlider').value, 10); }
        else if (state.step === 2) { state.tier = v; }
        else if (state.step === 3) { state.speed = v; finish(); return; }
        state.step++;
        render();
      });
    });
    var slider = $('sizeSlider');
    if (slider) {
      var paint = function () {
        var pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.setProperty('--fill', pct + '%');
        $('sizeVal').textContent = slider.value;
      };
      slider.addEventListener('input', paint); paint();
    }
  }

  backBtn.addEventListener('click', function () {
    if (state.step > 0) { state.step--; render(); }
  });

  /* ---------- result ---------- */
  function money(n) {
    n = Math.round(n / 500) * 500;
    return '$' + n.toLocaleString('en-US');
  }

  function finish() {
    var p = PROJECTS[state.type], t = TIERS[state.tier], s = SPEEDS[state.speed];
    var mult = t.mult * s.mult;
    var low = p.range[0] * state.size * mult, high = p.range[1] * state.size * mult;
    var wLow = Math.max(1, Math.round(p.weeks[0] * s.tmult)), wHigh = Math.round(p.weeks[1] * s.tmult);

    $('estResultTitle').textContent = p.label + ' — ' + t.label + ' finish';
    $('estResultSub').textContent = state.size.toLocaleString() + ' ' + p.sizeUnit + ' · ' + s.label + ' timeline';
    $('estLow').textContent = money(low);
    $('estHigh').textContent = money(high);
    $('estTimeline').textContent = 'typical build ' + wLow + '–' + wHigh + ' weeks';

    var mid = (low + high) / 2;
    $('estBars').innerHTML = PHASES.map(function (ph) {
      var amt = money(mid * ph.pct / 100);
      return '<div class="est-bar"><div class="est-bar-top"><span>' + ph.label + '</span><strong>' + amt + ' <small style="color:var(--mut2)">(' + ph.pct + '%)</small></strong></div>' +
        '<div class="est-bar-track"><div class="est-bar-fill" data-w="' + ph.pct + '"></div></div></div>';
    }).join('');

    cardEl.hidden = true;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    requestAnimationFrame(function () {
      resultEl.querySelectorAll('.est-bar-fill').forEach(function (el) {
        el.style.width = (parseInt(el.dataset.w, 10) * 2.4) + '%';
      });
    });

    /* expose to chat for the "refine" handoff */
    window.__lastEstimate = { type: p.label, tier: t.label, speed: s.label, size: state.size, low: money(low), high: money(high) };
    var book = $('estBookBtn');
    if (book) book.addEventListener('click', function () {
      var sel = $('fType');
      if (sel) { for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].text === p.label) { sel.selectedIndex = i; break; } } }
    }, { once: true });
  }

  $('estRestart').addEventListener('click', function () {
    state = { step: 0, type: null, size: null, tier: null, speed: null };
    resultEl.hidden = true; cardEl.hidden = false; render();
    cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* allow chat widget to pre-select a project type */
  window.OscarEstimator = {
    preselect: function (typeKey) {
      if (PROJECTS[typeKey]) {
        state = { step: 1, type: typeKey, size: PROJECTS[typeKey].sizeDef, tier: null, speed: null };
        resultEl.hidden = true; cardEl.hidden = false; render();
        document.getElementById('estimator').scrollIntoView({ behavior: 'smooth' });
      }
    },
    types: PROJECTS
  };

  render();
})();

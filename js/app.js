/* ============================================================
   OSCAR HOMES — app.js
   Nav, scroll reveals, before/after sliders, lead capture,
   owner leads dashboard.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- sticky nav ---------- */
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById('navToggle'), links = document.getElementById('navLinks');
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { links.classList.remove('open'); toggle.classList.remove('open'); });
  });

  /* ---------- scroll reveals ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
    io.observe(el);
  });

  /* ---------- before / after sliders ---------- */
  document.querySelectorAll('[data-ba]').forEach(function (frame) {
    var before = frame.querySelector('.ba-before'),
        handle = frame.querySelector('.ba-handle');
    var set = function (clientX) {
      var r = frame.getBoundingClientRect();
      var pct = Math.max(4, Math.min(96, (clientX - r.left) / r.width * 100));
      before.style.width = pct + '%';
      handle.style.left = pct + '%';
    };
    var dragging = false;
    frame.addEventListener('pointerdown', function (e) { dragging = true; frame.setPointerCapture(e.pointerId); set(e.clientX); });
    frame.addEventListener('pointermove', function (e) { if (dragging) set(e.clientX); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      frame.addEventListener(ev, function () { dragging = false; });
    });
  });

  /* ---------- lead capture form ---------- */
  var form = document.getElementById('leadForm'),
      err = document.getElementById('formErr'),
      success = document.getElementById('formSuccess');

  function validPhone(v) { return v.replace(/\D/g, '').length >= 10; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('fName').value.trim(),
        phone = document.getElementById('fPhone').value.trim(),
        email = document.getElementById('fEmail').value.trim(),
        type = document.getElementById('fType').value,
        timeline = document.getElementById('fTimeline').value,
        msg = document.getElementById('fMsg').value.trim();

    err.textContent = '';
    if (!name) { err.textContent = 'Please tell us your name.'; return; }
    if (!validPhone(phone)) { err.textContent = 'Please enter a valid 10-digit phone number.'; return; }
    if (!type) { err.textContent = 'Please choose a project type.'; return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'That email doesn\'t look quite right.'; return; }

    var lead = { name: name, phone: phone, email: email, projectType: type, timeline: timeline, message: msg, source: 'Website form', date: new Date().toISOString() };
    try {
      var leads = JSON.parse(localStorage.getItem('oscar_leads') || '[]');
      leads.push(lead);
      localStorage.setItem('oscar_leads', JSON.stringify(leads));
    } catch (ex) { /* private mode */ }

    document.getElementById('successMsg').textContent =
      'Thanks ' + name.split(' ')[0] + ' — we\'ll call ' + phone + ' within one business day about your ' + type.toLowerCase() + '.';
    success.hidden = false;
  });

  document.getElementById('formReset').addEventListener('click', function () {
    form.reset(); success.hidden = true;
  });

  /* ---------- owner leads dashboard ---------- */
  var modal = document.getElementById('ownerModal'),
      list = document.getElementById('leadsList');

  function getLeads() {
    try { return JSON.parse(localStorage.getItem('oscar_leads') || '[]'); }
    catch (e) { return []; }
  }

  function renderLeads() {
    var leads = getLeads();
    if (!leads.length) {
      list.innerHTML = '<div class="leads-empty">No leads captured on this device yet.<br>New consultation requests will appear here automatically.</div>';
      return;
    }
    list.innerHTML = leads.slice().reverse().map(function (l) {
      var d = new Date(l.date);
      return '<div class="lead-item"><strong>' + esc(l.name) + '</strong> · ' + esc(l.phone) +
        (l.projectType ? ' · ' + esc(l.projectType) : '') +
        (l.message ? '<br>' + esc(l.message) : '') +
        '<small>' + d.toLocaleString() + ' · via ' + esc(l.source || 'website') + (l.email ? ' · ' + esc(l.email) : '') + '</small></div>';
    }).join('');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  document.getElementById('ownerLink').addEventListener('click', function () { renderLeads(); modal.hidden = false; });
  document.getElementById('ownerClose').addEventListener('click', function () { modal.hidden = true; });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });

  document.getElementById('leadsExport').addEventListener('click', function () {
    var leads = getLeads();
    if (!leads.length) return;
    var csv = 'Name,Phone,Email,Project Type,Timeline,Message,Source,Date\n' + leads.map(function (l) {
      return [l.name, l.phone, l.email, l.projectType, l.timeline, l.message, l.source, l.date]
        .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'oscar-homes-leads.csv';
    a.click();
  });

  document.getElementById('leadsClear').addEventListener('click', function () {
    if (confirm('Delete all captured leads on this device?')) {
      localStorage.removeItem('oscar_leads');
      renderLeads();
    }
  });

  /* ---------- footer year ---------- */
  document.querySelector('.footer-base span').textContent =
    '© ' + new Date().getFullYear() + ' Oscar Homes Improvements. All rights reserved.';
})();

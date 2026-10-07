/* ============================================================
   OSCAR HOMES — "Oscar AI" chat assistant
   Rule-based with smart keyword matching. No API key needed.
   Handles FAQs, estimate handoff, callback capture, booking.
   ============================================================ */
(function () {
  'use strict';

  var panel = document.getElementById('chatPanel'),
      fab = document.getElementById('chatFab'),
      closeBtn = document.getElementById('chatClose'),
      body = document.getElementById('chatBody'),
      chips = document.getElementById('chatChips'),
      form = document.getElementById('chatForm'),
      input = document.getElementById('chatText');

  var context = { projectType: null, awaiting: null, name: null, greeted: false };

  var TYPE_WORDS = {
    kitchen: ['kitchen'], bathroom: ['bathroom', 'bath '], addition: ['addition', 'extension', 'add a room'],
    roofing: ['roof'], deck: ['deck', 'porch', 'patio'], basement: ['basement'],
    siding: ['siding', 'exterior'], commercial: ['commercial', 'office', 'retail', 'business']
  };

  function detectType(text) {
    for (var k in TYPE_WORDS) {
      for (var i = 0; i < TYPE_WORDS[k].length; i++) {
        if (text.indexOf(TYPE_WORDS[k][i]) !== -1) return k;
      }
    }
    return null;
  }

  /* ---------- UI helpers ---------- */
  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addMsg(text, who) {
    var d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerHTML = text;
    body.appendChild(d); scrollDown();
    return d;
  }

  function botSay(text, delay) {
    delay = delay == null ? 500 : delay;
    var t = document.createElement('div');
    t.className = 'msg bot typing';
    t.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(t); scrollDown();
    setTimeout(function () {
      t.remove();
      addMsg(text, 'bot');
    }, delay);
  }

  function setChips(list) {
    chips.innerHTML = '';
    if (!list || !list.length) { chips.hidden = true; return; }
    chips.hidden = false;
    list.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = c.label;
      b.addEventListener('click', function () { handleAction(c.action, c.data); });
      chips.appendChild(b);
    });
  }

  function openChat(ctx) {
    panel.hidden = false;
    if (!context.greeted) {
      context.greeted = true;
      var est = window.__lastEstimate;
      if (ctx === 'estimate' && est) {
        botSay('I see your estimate — a <strong>' + est.type + '</strong> (' + est.tier + ') around <strong>' + est.low + '–' + est.high + '</strong>. Want me to break down what drives that number, or book you a free consultation to lock in real pricing?', 400);
        setChips([
          { label: 'Explain the breakdown', action: 'explain' },
          { label: 'Book consultation', action: 'book' },
          { label: 'Talk to a human', action: 'callback' }
        ]);
      } else {
        botSay('Hey! I\'m <strong>Oscar AI</strong> — I can answer questions about our services, pricing, and timelines, give you a ballpark estimate, or book your free consultation. What are you dreaming up?', 400);
        setChips([
          { label: '💰 Get an estimate', action: 'estimator' },
          { label: '🔨 Our services', action: 'faq', data: 'services' },
          { label: '📅 Book consultation', action: 'book' }
        ]);
      }
    }
    setTimeout(function () { input.focus(); }, 350);
  }

  function closeChat() { panel.hidden = true; }
  fab.addEventListener('click', function () { panel.hidden ? openChat() : closeChat(); });
  closeBtn.addEventListener('click', closeChat);
  document.querySelectorAll('[data-chat-open]').forEach(function (el) {
    el.addEventListener('click', function () { openChat(el.dataset.chatContext); });
  });

  /* ---------- actions ---------- */
  function handleAction(action, data) {
    if (action === 'estimator') {
      botSay('Great choice — tap below and I\'ll walk you there. It takes about 60 seconds.', 300);
      setTimeout(function () {
        document.getElementById('estimator').scrollIntoView({ behavior: 'smooth' });
      }, 900);
      setChips([]);
    } else if (action === 'faq') {
      respond(faqAnswer(data).text, faqAnswer(data).chips);
    } else if (action === 'book') {
      var type = context.projectType ? ' for your ' + window.OscarEstimator.types[context.projectType].label.toLowerCase() : '';
      botSay('Love it. I\'ve opened our booking form below' + type + ' — it takes 30 seconds, and we\'ll call you back within one business day.', 300);
      setChips([]);
      setTimeout(function () {
        closeChat();
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        if (context.projectType) {
          var label = window.OscarEstimator.types[context.projectType].label;
          var sel = document.getElementById('fType');
          for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].text === label) { sel.selectedIndex = i; break; }
          }
        }
      }, 1400);
    } else if (action === 'callback') {
      context.awaiting = 'name';
      botSay('Of course — a real human from our Woodbury team will call you. What\'s your <strong>first name</strong>?', 300);
      setChips([]);
    } else if (action === 'explain') {
      var est = window.__lastEstimate;
      botSay('Here\'s what typically drives a ' + (est ? est.type.toLowerCase() : 'project') + ' estimate: <strong>materials</strong> (~38% — your finish level matters most here), <strong>skilled labor</strong> (~34%), plus design/permits, prep, and finishing. The fastest way to sharpen the number? A free on-site consultation.', 600);
      setChips([{ label: '📅 Book consultation', action: 'book' }, { label: 'Start a new estimate', action: 'estimator' }]);
    } else if (action === 'type-estimate') {
      window.OscarEstimator.preselect(data);
      botSay('Perfect — I\'ve loaded the estimator for <strong>' + window.OscarEstimator.types[data].label + '</strong>. Just answer the steps and I\'ll crunch your numbers.', 300);
      setChips([]);
      setTimeout(function () { closeChat(); }, 900);
    }
  }

  /* ---------- FAQ brain ---------- */
  function faqAnswer(topic) {
    var A = {
      services: {
        text: 'We handle <strong>carpentry, masonry, and concrete</strong>, plus <strong>kitchen &amp; bath remodels, home additions, basement finishes, roofing, decks, siding</strong> — and <strong>commercial buildouts</strong>. Basically, if it\'s a building in South Jersey, we can build or rebuild it.',
        chips: [{ label: '💰 Estimate my project', action: 'estimator' }, { label: '📅 Book consultation', action: 'book' }]
      },
      pricing: {
        text: 'Every project is different, but our <strong>AI estimator</strong> gives you an honest ballpark in 60 seconds using real South Jersey market data — no email required, no sales call. Final fixed pricing comes after a free on-site consultation.',
        chips: [{ label: '💰 Open the estimator', action: 'estimator' }]
      },
      timeline: {
        text: 'Typical timelines: <strong>bathrooms 3–6 weeks, kitchens 4–8, decks 2–4, additions 10–20 weeks</strong>. Permits in NJ usually add 2–4 weeks, and we handle all of that for you.',
        chips: [{ label: '📅 Book consultation', action: 'book' }]
      },
      license: {
        text: 'Yes — we\'re <strong>fully licensed and insured in New Jersey</strong>, and a proud member of the <strong>Builders League of South Jersey (BLSJ)</strong>. Every project includes written warranties on workmanship.',
        chips: [{ label: '📅 Book consultation', action: 'book' }]
      },
      area: {
        text: 'We\'re based in <strong>Woodbury, NJ</strong> and build across <strong>Gloucester, Camden, and Burlington counties</strong> — Deptford, Cherry Hill, Marlton, Voorhees, Haddonfield, Glassboro, Sewell, Mullica Hill, and beyond.',
        chips: [{ label: '💰 Estimate my project', action: 'estimator' }, { label: '📞 Request a callback', action: 'callback' }]
      },
      contact: {
        text: 'You can reach our Woodbury team at <strong><a href="tel:+15189020079" style="color:var(--gold2)">(518) 902-0079</a></strong> — call or text, 7 days a week. Or I can have someone call <em>you</em>.',
        chips: [{ label: '📞 Request a callback', action: 'callback' }, { label: '📅 Book consultation', action: 'book' }]
      },
      human: {
        text: 'Absolutely — I\'m the AI, but there are real craftspeople behind me. Want a callback from our team?',
        chips: [{ label: '📞 Yes, call me', action: 'callback' }, { label: '📅 Book consultation', action: 'book' }]
      }
    };
    return A[topic];
  }

  function classify(raw) {
    var t = ' ' + raw.toLowerCase() + ' ';
    var has = function () { for (var i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) !== -1) return true; return false; };
    if (has('price', 'cost', 'how much', 'expensive', 'budget', 'quote', 'estimate')) return 'pricing';
    if (has('service', 'what do you do', 'offer', 'carpentry', 'masonry', 'concrete', 'renovat')) return 'services';
    if (has('how long', 'timeline', 'duration', 'take', 'schedule', 'when can')) return 'timeline';
    if (has('licens', 'insur', 'bonded', 'certif', 'blsj')) return 'license';
    if (has('where', 'area', 'serve', 'location', 'town', 'county', 'come to')) return 'area';
    if (has('book', 'consult', 'appointment', 'schedule a', 'visit')) return 'book';
    if (has('call me', 'callback', 'call back', 'phone me', 'reach me')) return 'callback';
    if (has('phone', 'number', 'email', 'address', 'contact', 'talk to')) return 'contact';
    if (has('human', 'real person', 'someone real', 'person')) return 'human';
    if (has('hi', 'hello', 'hey', 'yo', 'morning', 'afternoon') && t.trim().length < 12) return 'greet';
    if (has('thank', 'thanks', 'great', 'awesome', 'perfect')) return 'thanks';
    if (has('commercial', 'office', 'retail', 'business')) return 'services';
    return null;
  }

  function respond(text, chipsList) {
    botSay(text, 600);
    setChips(chipsList || [
      { label: '💰 Get an estimate', action: 'estimator' },
      { label: '📅 Book consultation', action: 'book' }
    ]);
  }

  /* ---------- callback capture flow ---------- */
  function handleCallbackFlow(text) {
    if (context.awaiting === 'name') {
      context.name = text.trim().split(' ')[0].replace(/[^a-zA-Z'-]/g, '') || 'there';
      context.awaiting = 'phone';
      botSay('Nice to meet you, <strong>' + context.name + '</strong>! What\'s the best <strong>phone number</strong> to reach you at?', 400);
      return true;
    }
    if (context.awaiting === 'phone') {
      var digits = text.replace(/\D/g, '');
      if (digits.length < 10) {
        botSay('Hmm, that doesn\'t look like a full number — could you double-check it? (10 digits is perfect.)', 400);
        return true;
      }
      saveLead({ name: context.name, phone: text.trim(), source: 'AI chat callback', projectType: context.projectType || '' });
      context.awaiting = null;
      botSay('You\'re all set, <strong>' + context.name + '</strong>! ✅ Someone from our Woodbury team will call <strong>' + text.trim() + '</strong> within one business day. Anything else I can help with meanwhile?', 500);
      setChips([{ label: '💰 Get an estimate', action: 'estimator' }, { label: '🔨 Our services', action: 'faq', data: 'services' }]);
      return true;
    }
    return false;
  }

  function saveLead(lead) {
    try {
      var leads = JSON.parse(localStorage.getItem('oscar_leads') || '[]');
      lead.date = new Date().toISOString();
      leads.push(lead);
      localStorage.setItem('oscar_leads', JSON.stringify(leads));
    } catch (e) { /* storage unavailable */ }
  }

  /* ---------- main input ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    addMsg(text.replace(/</g, '&lt;'), 'user');
    input.value = '';
    setChips([]);

    if (handleCallbackFlow(text)) return;

    var foundType = detectType(' ' + text.toLowerCase() + ' ');
    if (foundType) context.projectType = foundType;

    var topic = classify(text);
    if (topic === 'greet') {
      respond('Hey there! 👋 Planning a project? I can estimate costs, explain our process, or book your free consultation.');
    } else if (topic === 'thanks') {
      respond('Anytime! If inspiration strikes at 2am, I\'m here. 😄');
    } else if (topic === 'book') {
      handleAction('book');
    } else if (topic === 'callback') {
      handleAction('callback');
    } else if (topic) {
      var a = faqAnswer(topic);
      if (foundType && topic === 'pricing') {
        botSay('For a <strong>' + window.OscarEstimator.types[foundType].label.toLowerCase() + '</strong> specifically — want me to run the numbers right now?', 500);
        setChips([{ label: '▶ Run the estimate', action: 'type-estimate', data: foundType }, { label: '📅 Book consultation', action: 'book' }]);
      } else {
        respond(a.text, a.chips);
      }
    } else if (foundType) {
      botSay('A <strong>' + window.OscarEstimator.types[foundType].label.toLowerCase() + '</strong> — excellent project. Want a ballpark number? I can run it in about 60 seconds.', 500);
      setChips([{ label: '▶ Run the estimate', action: 'type-estimate', data: foundType }, { label: '📅 Book consultation', action: 'book' }]);
    } else {
      botSay('I want to make sure I get this right — I\'m best at <strong>services, pricing, timelines, licensing, and service area</strong>. Could you rephrase? Or tap below and I\'ll point you the right way.', 500);
      setChips([
        { label: '💰 Get an estimate', action: 'estimator' },
        { label: '🔨 Our services', action: 'faq', data: 'services' },
        { label: '📞 Talk to a human', action: 'callback' }
      ]);
    }
  });

  /* expose for estimator handoff */
  window.OscarChat = { open: openChat };
})();

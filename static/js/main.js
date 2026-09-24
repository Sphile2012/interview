/**
 * Blade & Bone Barbershop — main.js
 * Handles: popup, mobile menu (slide from right), header scroll,
 *          4-step booking form, live summary panel, flatpickr,
 *          URL param pre-selection, contact form.
 */

document.addEventListener('DOMContentLoaded', function () {

  // ─────────────────────────────────────────────────────────────
  // 1. WELCOME POPUP
  // Shows once per session via localStorage.
  // ─────────────────────────────────────────────────────────────
  var popup      = document.getElementById('welcome-overlay');
  var closeBtn   = document.getElementById('popup-close-btn');
  var dismissBtn = document.getElementById('popup-dismiss-btn');

  if (popup) {
    if (!localStorage.getItem('bb_popup_seen')) {
      setTimeout(function () {
        popup.hidden = false;
        document.body.style.overflow = 'hidden';
      }, 2400);
    }

    function closePopup() {
      popup.hidden = true;
      document.body.style.overflow = '';
      localStorage.setItem('bb_popup_seen', '1');
    }

    if (closeBtn)   closeBtn.addEventListener('click', closePopup);
    if (dismissBtn) dismissBtn.addEventListener('click', closePopup);

    popup.addEventListener('click', function (e) {
      if (e.target === popup) closePopup();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !popup.hidden) closePopup();
    });
  }


  // ─────────────────────────────────────────────────────────────
  // 2. MOBILE MENU — slides in from the right
  // ─────────────────────────────────────────────────────────────
  var hamburger  = document.getElementById('hamburger-btn');
  var mobileMenu = document.getElementById('mobile-menu');
  var overlay    = document.getElementById('mobile-overlay');

  function openMenu() {
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    if (overlay) overlay.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.contains('open') ? closeMenu() : openMenu();
    });

    if (overlay) overlay.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('.mobile-nav-link, .mobile-book-link').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hamburger.classList.contains('open')) closeMenu();
    });
  }


  // ─────────────────────────────────────────────────────────────
  // 3. HEADER SCROLL SHADOW
  // ─────────────────────────────────────────────────────────────
  var header = document.getElementById('site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }


  // ─────────────────────────────────────────────────────────────
  // 4. BOOKING FORM — 4-step navigation
  // ─────────────────────────────────────────────────────────────
  var bookingForm = document.getElementById('booking-form');

  if (bookingForm) {
    var currentStep = 1;

    function showStep(n) {
      document.querySelectorAll('.booking-step').forEach(function (s) {
        s.classList.toggle('hidden', parseInt(s.dataset.step) !== n);
      });
      currentStep = n;
      updateStepper(n);
      bookingForm.closest('.booking-layout').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateStepper(active) {
      for (var i = 1; i <= 4; i++) {
        var el  = document.getElementById('stepper-' + i);
        var dot = el ? el.querySelector('.stepper-dot') : null;
        if (!el) continue;
        el.classList.remove('active', 'done');
        if (i === active) {
          el.classList.add('active');
          if (dot) dot.textContent = i;
        } else if (i < active) {
          el.classList.add('done');
          if (dot) dot.textContent = '✓';
        } else {
          if (dot) dot.textContent = i;
        }
      }
    }

    function validateStep(n) {
      if (n === 1) return !!bookingForm.querySelector('input[name="service"]:checked');
      if (n === 2) return !!bookingForm.querySelector('input[name="barber"]:checked');
      if (n === 3) {
        var d = bookingForm.querySelector('input[name="date"]');
        var t = bookingForm.querySelector('input[name="time"]:checked');
        return !!(d && d.value.trim() && t);
      }
      return true;
    }

    function showStepError(msg) {
      var existing = bookingForm.querySelector('.step-inline-error');
      if (existing) existing.remove();
      var div = document.createElement('div');
      div.className = 'step-inline-error form-errors';
      div.setAttribute('role', 'alert');
      div.textContent = msg;
      var activeStep = bookingForm.querySelector('#step-' + currentStep);
      if (activeStep) activeStep.prepend(div);
      setTimeout(function () { div.remove(); }, 4000);
    }

    bookingForm.querySelectorAll('.step-next-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!validateStep(currentStep)) {
          var msgs = { 1: 'Please select a service.', 2: 'Please choose a barber.', 3: 'Please select a date and time.' };
          showStepError(msgs[currentStep] || 'Please complete this step.');
          return;
        }
        var next = parseInt(btn.dataset.next);
        if (next === 4) updateSummaryPanel();
        showStep(next);
      });
    });

    bookingForm.querySelectorAll('.step-back-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showStep(parseInt(btn.dataset.back));
      });
    });

    bookingForm.addEventListener('submit', function (e) {
      var missing = [];
      if (!bookingForm.querySelector('#first_name').value.trim()) missing.push('first name');
      if (!bookingForm.querySelector('#last_name').value.trim())  missing.push('last name');
      if (!bookingForm.querySelector('#email').value.trim())      missing.push('email');
      if (!bookingForm.querySelector('#phone').value.trim())      missing.push('phone');
      if (!bookingForm.querySelector('#agree-terms').checked)     missing.push('terms agreement');
      if (missing.length) {
        e.preventDefault();
        showStepError('Please fill in: ' + missing.join(', ') + '.');
      }
    });

    // If server returned errors, jump to step 4
    if (document.querySelector('.form-errors')) showStep(4);
  }


  // ─────────────────────────────────────────────────────────────
  // 5. LIVE SUMMARY PANEL — updates as user selects options
  // ─────────────────────────────────────────────────────────────
  function showSummaryRow(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function setSummaryVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateSummaryPanel() {
    var svc  = document.querySelector('input[name="service"]:checked');
    var brb  = document.querySelector('input[name="barber"]:checked');
    var date = document.querySelector('input[name="date"]');
    var time = document.querySelector('input[name="time"]:checked');
    var empty = document.getElementById('summary-empty');

    if (!svc) return;

    if (empty) empty.style.display = 'none';

    showSummaryRow('summary-service-row');
    setSummaryVal('summary-service-val', svc.dataset.name || svc.value);

    showSummaryRow('summary-total-row');
    setSummaryVal('summary-total-val', 'R' + (svc.dataset.price || '—'));

    showSummaryRow('summary-duration-row');
    setSummaryVal('summary-duration-val', (svc.dataset.duration || '—') + ' min');

    if (brb) {
      showSummaryRow('summary-barber-row');
      setSummaryVal('summary-barber-val', brb.dataset.name || brb.value);
    }

    if (date && date.value) {
      showSummaryRow('summary-date-row');
      setSummaryVal('summary-date-val', date.value);
    }

    if (time) {
      showSummaryRow('summary-time-row');
      setSummaryVal('summary-time-val', time.value);
    }
  }

  // Update summary whenever any radio or date changes
  document.querySelectorAll('input[name="service"], input[name="barber"], input[name="time"]').forEach(function (input) {
    input.addEventListener('change', updateSummaryPanel);
  });
  var dateInput = document.querySelector('input[name="date"]');
  if (dateInput) {
    dateInput.addEventListener('change', updateSummaryPanel);
  }


  // ─────────────────────────────────────────────────────────────
  // 6. SERVICE & BARBER CARD SELECTION HIGHLIGHTING
  // ─────────────────────────────────────────────────────────────
  function wireSelectionCards(selector, groupSelector) {
    document.querySelectorAll(selector).forEach(function (card) {
      var radio = card.querySelector('input[type="radio"]');
      if (!radio) return;
      if (radio.checked) card.classList.add('selected');
      card.addEventListener('click', function () {
        document.querySelectorAll(groupSelector).forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); card.click(); }
      });
    });
  }

  wireSelectionCards('.service-choice-card', '.service-choice-card');
  wireSelectionCards('.barber-choice-card',  '.barber-choice-card');


  // ─────────────────────────────────────────────────────────────
  // 7. TIME SLOT HIGHLIGHTING
  // ─────────────────────────────────────────────────────────────
  document.querySelectorAll('.time-slot-label').forEach(function (label) {
    var radio = label.querySelector('input[type="radio"]');
    if (!radio) return;
    if (radio.checked) label.classList.add('selected');
    label.addEventListener('click', function () {
      document.querySelectorAll('.time-slot-label').forEach(function (l) { l.classList.remove('selected'); });
      label.classList.add('selected');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });


  // ─────────────────────────────────────────────────────────────
  // 8. FLATPICKR DATE PICKER
  // ─────────────────────────────────────────────────────────────
  var fp = document.querySelector('.date-flatpickr');
  if (fp && typeof flatpickr !== 'undefined') {
    flatpickr(fp, {
      minDate:    'today',
      maxDate:    new Date().fp_incr(90),
      dateFormat: 'Y-m-d',
      altInput:   true,
      altFormat:  'D, d M Y',
      onChange:   function () { updateSummaryPanel(); },
    });
  }


  // ─────────────────────────────────────────────────────────────
  // 9. URL PARAM PRE-SELECTION
  // /booking?service=skin-fade  or  /booking?barber=jordan
  // ─────────────────────────────────────────────────────────────
  if (document.getElementById('booking-form')) {
    var params  = new URLSearchParams(window.location.search);
    var pSvc    = params.get('service');
    var pBarber = params.get('barber');

    if (pSvc) {
      var svcRadio = document.querySelector('input[name="service"][value="' + pSvc + '"]');
      if (svcRadio) {
        svcRadio.checked = true;
        var svcCard = svcRadio.closest('.service-choice-card');
        if (svcCard) svcCard.classList.add('selected');
        updateSummaryPanel();
      }
    }

    if (pBarber) {
      var brbRadio = document.querySelector('input[name="barber"][value="' + pBarber + '"]');
      if (brbRadio) {
        brbRadio.checked = true;
        var brbCard = brbRadio.closest('.barber-choice-card');
        if (brbCard) brbCard.classList.add('selected');
      }
    }
  }


  // ─────────────────────────────────────────────────────────────
  // 10. CONTACT FORM — simulate submit
  // ─────────────────────────────────────────────────────────────
  var contactForm    = document.getElementById('contact-form');
  var contactSuccess = document.getElementById('contact-success');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      contactForm.querySelectorAll('[required]').forEach(function (f) {
        if (!f.value.trim()) { f.style.borderColor = 'var(--error)'; valid = false; }
        else f.style.borderColor = '';
      });
      if (!valid) return;
      if (contactSuccess) { contactSuccess.hidden = false; }
      contactForm.reset();
      setTimeout(function () { if (contactSuccess) contactSuccess.hidden = true; }, 6000);
    });
  }

});

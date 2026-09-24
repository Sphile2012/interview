/**
 * Blade & Bone Barbershop — main.js
 *
 * Covers:
 *  1. Welcome popup (first-visit discount)
 *  2. Mobile navigation (hamburger menu)
 *  3. Sticky header shadow on scroll
 *  4. Booking form — multi-step navigation + validation
 *  5. Booking summary panel — live updates as user selects options
 *  6. Service/barber card radio selection highlighting
 *  7. Time slot selection highlighting
 *  8. Flatpickr date picker initialisation
 *  9. URL param pre-selection (service or barber from other pages)
 * 10. Contact form — client-side submit simulation
 */

document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // 1. WELCOME POPUP
  // Shows once per browser session using localStorage.
  // The user can close it with the X button or the dismiss link.
  // ============================================================

  var popup           = document.getElementById('welcome-overlay');
  var popupCloseBtn   = document.getElementById('popup-close-btn');
  var popupDismissBtn = document.getElementById('popup-dismiss-btn');

  if (popup) {
    var alreadySeen = localStorage.getItem('bb_popup_seen');

    // Delay the popup slightly so the page has time to render nicely
    if (!alreadySeen) {
      setTimeout(function () {
        popup.hidden = false;
        popup.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // lock scroll while open
      }, 2200);
    }

    function closePopup() {
      popup.hidden = true;
      popup.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      localStorage.setItem('bb_popup_seen', '1');
    }

    if (popupCloseBtn)   popupCloseBtn.addEventListener('click', closePopup);
    if (popupDismissBtn) popupDismissBtn.addEventListener('click', closePopup);

    // Also close if the user clicks the dark overlay behind the card
    popup.addEventListener('click', function (e) {
      if (e.target === popup) closePopup();
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !popup.hidden) closePopup();
    });
  }


  // ============================================================
  // 2. MOBILE NAVIGATION
  // Toggles the mobile menu open/closed and updates ARIA attrs.
  // ============================================================

  var hamburgerBtn = document.getElementById('hamburger-btn');
  var mobileMenu   = document.getElementById('mobile-menu');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', function () {
      var isOpen = hamburgerBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      mobileMenu.style.display = isOpen ? 'block' : '';
    });

    // Close the mobile menu when any link inside it is clicked
    mobileMenu.querySelectorAll('.mobile-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburgerBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      });
    });
  }


  // ============================================================
  // 3. HEADER SHADOW ON SCROLL
  // Adds a slightly stronger shadow when the user scrolls down.
  // ============================================================

  var siteHeader = document.getElementById('site-header');

  if (siteHeader) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 20) {
        siteHeader.style.boxShadow = '0 4px 20px rgba(0,0,0,.4)';
      } else {
        siteHeader.style.boxShadow = '';
      }
    }, { passive: true });
  }


  // ============================================================
  // 4. BOOKING FORM — MULTI-STEP NAVIGATION
  // Each step is shown/hidden by toggling the .hidden class.
  // Progress dots are updated to reflect current position.
  // ============================================================

  var bookingForm = document.getElementById('booking-form');

  if (bookingForm) {

    var steps      = bookingForm.querySelectorAll('.booking-step');
    var currentStep = 1;

    // Show step N and hide all others
    function showStep(n) {
      steps.forEach(function (step) {
        var stepNum = parseInt(step.getAttribute('data-step'), 10);
        step.classList.toggle('hidden', stepNum !== n);
      });
      currentStep = n;
      updateProgressDots(n);

      // Scroll back to top of the form so the user can see the new step
      bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Update the progress indicator dots
    function updateProgressDots(activeStep) {
      for (var i = 1; i <= 4; i++) {
        var dot = document.getElementById('progress-' + i);
        if (!dot) continue;
        dot.classList.remove('active', 'done');
        if (i === activeStep) {
          dot.classList.add('active');
        } else if (i < activeStep) {
          dot.classList.add('done');
          // Replace the number with a tick for completed steps
          var dotEl = dot.querySelector('.progress-dot');
          if (dotEl) dotEl.textContent = '✓';
        }
      }
    }

    // Validate the current step before allowing the user to move forward
    function validateStep(stepNum) {
      var errors = [];

      if (stepNum === 1) {
        var serviceSelected = bookingForm.querySelector('input[name="service"]:checked');
        if (!serviceSelected) errors.push('Please choose a service to continue.');
      }

      if (stepNum === 2) {
        var barberSelected = bookingForm.querySelector('input[name="barber"]:checked');
        if (!barberSelected) errors.push('Please choose a barber to continue.');
      }

      if (stepNum === 3) {
        var dateVal = bookingForm.querySelector('input[name="date"]');
        var timeVal = bookingForm.querySelector('input[name="time"]:checked');
        if (!dateVal || !dateVal.value.trim()) errors.push('Please select a date.');
        if (!timeVal) errors.push('Please select a time slot.');
      }

      return errors;
    }

    // Show an inline error message at the top of the current step
    function showStepError(stepEl, message) {
      var existing = stepEl.querySelector('.step-inline-error');
      if (existing) existing.remove();

      var errDiv = document.createElement('div');
      errDiv.className = 'step-inline-error form-errors';
      errDiv.setAttribute('role', 'alert');
      errDiv.textContent = message;
      stepEl.insertBefore(errDiv, stepEl.querySelector('.step-heading').nextSibling);

      // Auto-remove after 4 seconds
      setTimeout(function () { errDiv.remove(); }, 4000);
    }

    // Wire up all "Next" buttons
    bookingForm.querySelectorAll('.step-next-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextStep = parseInt(btn.getAttribute('data-next'), 10);
        var currentStepEl = bookingForm.querySelector('#step-' + currentStep);

        var errors = validateStep(currentStep);
        if (errors.length > 0) {
          showStepError(currentStepEl, errors[0]);
          return;
        }

        // If moving to step 4, refresh the summary panel before showing it
        if (nextStep === 4) updateSummaryPanel();

        showStep(nextStep);
      });
    });

    // Wire up all "Back" buttons
    bookingForm.querySelectorAll('.step-back-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var prevStep = parseInt(btn.getAttribute('data-back'), 10);
        showStep(prevStep);
      });
    });

    // Final form submission validation
    bookingForm.addEventListener('submit', function (e) {
      var firstName = bookingForm.querySelector('#first_name');
      var lastName  = bookingForm.querySelector('#last_name');
      var email     = bookingForm.querySelector('#email');
      var phone     = bookingForm.querySelector('#phone');
      var terms     = bookingForm.querySelector('#agree-terms');

      var missing = [];
      if (!firstName || !firstName.value.trim()) missing.push('first name');
      if (!lastName  || !lastName.value.trim())  missing.push('last name');
      if (!email     || !email.value.trim())      missing.push('email');
      if (!phone     || !phone.value.trim())      missing.push('phone number');
      if (!terms     || !terms.checked)           missing.push('terms agreement');

      if (missing.length > 0) {
        e.preventDefault();
        var step4El = bookingForm.querySelector('#step-4');
        showStepError(step4El, 'Please fill in: ' + missing.join(', ') + '.');
      }
    });

    // If there were server-side errors, jump straight to step 4
    // so the user lands on the problem fields, not step 1 again
    var serverErrors = bookingForm.closest('.booking-section')
                        ? bookingForm.closest('.booking-section').querySelector('.form-errors')
                        : null;
    if (serverErrors) {
      showStep(4);
    }
  }


  // ============================================================
  // 5. BOOKING SUMMARY PANEL — live updates
  // Reads the selected values and updates the summary card text
  // before the user reaches step 4.
  // ============================================================

  function updateSummaryPanel() {
    var summaryService  = document.getElementById('summary-service');
    var summaryPrice    = document.getElementById('summary-price');
    var summaryBarber   = document.getElementById('summary-barber');
    var summaryDatetime = document.getElementById('summary-datetime');

    if (!summaryService) return;

    var serviceInput = document.querySelector('input[name="service"]:checked');
    var barberInput  = document.querySelector('input[name="barber"]:checked');
    var dateInput    = document.querySelector('input[name="date"]');
    var timeInput    = document.querySelector('input[name="time"]:checked');

    if (serviceInput) {
      summaryService.textContent = serviceInput.getAttribute('data-name') || serviceInput.value;
      summaryPrice.textContent   = '£' + (serviceInput.getAttribute('data-price') || '—');
    }

    if (barberInput) {
      summaryBarber.textContent = barberInput.getAttribute('data-name') || barberInput.value;
    }

    if (dateInput && dateInput.value && timeInput) {
      summaryDatetime.textContent = dateInput.value + ' at ' + timeInput.value;
    } else if (dateInput && dateInput.value) {
      summaryDatetime.textContent = dateInput.value + ' — time not selected';
    }
  }


  // ============================================================
  // 6. SERVICE & BARBER CARD SELECTION HIGHLIGHTING
  // Adds/removes the .selected class on the card wrapper when
  // the hidden radio inside is checked.
  // ============================================================

  // Service cards
  document.querySelectorAll('.service-choice-card').forEach(function (card) {
    var radio = card.querySelector('input[type="radio"]');
    if (!radio) return;

    card.addEventListener('click', function () {
      // Deselect all others in the same group
      document.querySelectorAll('.service-choice-card').forEach(function (c) {
        c.classList.remove('selected');
      });
      card.classList.add('selected');
      radio.checked = true;
    });

    // Keyboard support — space/enter selects
    card.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        card.click();
      }
    });

    // If the radio is already checked on page load (back-fill from errors), mark selected
    if (radio.checked) card.classList.add('selected');
  });

  // Barber cards
  document.querySelectorAll('.barber-choice-card').forEach(function (card) {
    var radio = card.querySelector('input[type="radio"]');
    if (!radio) return;

    card.addEventListener('click', function () {
      document.querySelectorAll('.barber-choice-card').forEach(function (c) {
        c.classList.remove('selected');
      });
      card.classList.add('selected');
      radio.checked = true;
    });

    card.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        card.click();
      }
    });

    if (radio.checked) card.classList.add('selected');
  });


  // ============================================================
  // 7. TIME SLOT SELECTION
  // Highlights the selected slot label.
  // ============================================================

  document.querySelectorAll('.time-slot-label').forEach(function (label) {
    var radio = label.querySelector('input[type="radio"]');
    if (!radio) return;

    label.addEventListener('click', function () {
      document.querySelectorAll('.time-slot-label').forEach(function (l) {
        l.classList.remove('selected');
      });
      label.classList.add('selected');
    });

    if (radio.checked) label.classList.add('selected');
  });


  // ============================================================
  // 8. FLATPICKR DATE PICKER
  // Restricts selection to today onwards. Sundays have reduced
  // hours in the data but are still bookable.
  // ============================================================

  var dateInput = document.querySelector('.date-flatpickr');

  if (dateInput && typeof flatpickr !== 'undefined') {
    flatpickr(dateInput, {
      // Only let people book from tomorrow onwards — you can't book for today
      minDate: 'today',
      // Don't allow bookings more than 3 months ahead
      maxDate: new Date().fp_incr(90),
      // Date format stored in the hidden input value
      dateFormat: 'Y-m-d',
      // Format shown to the user
      altInput: true,
      altFormat: 'D, d M Y',
      // Disable specific days if needed — empty for now
      disable: [],
      // Show the calendar inline or as a popup
      inline: false,
      // Trigger a custom event so we can update the summary
      onChange: function (selectedDates, dateStr) {
        // Let the summary know the date changed
        var summaryDatetime = document.getElementById('summary-datetime');
        if (summaryDatetime && summaryDatetime.textContent !== '—') {
          updateSummaryPanel();
        }
      },
    });
  }


  // ============================================================
  // 9. URL PARAM PRE-SELECTION
  // If arriving from a "Book This" link on another page, the
  // service or barber query param pre-selects that option.
  // e.g. /booking?service=skin-fade  or  /booking?barber=jordan
  // ============================================================

  var urlParams    = new URLSearchParams(window.location.search);
  var paramService = urlParams.get('service');
  var paramBarber  = urlParams.get('barber');

  if (paramService) {
    var serviceRadio = document.querySelector('input[name="service"][value="' + paramService + '"]');
    if (serviceRadio) {
      serviceRadio.checked = true;
      var card = serviceRadio.closest('.service-choice-card');
      if (card) {
        document.querySelectorAll('.service-choice-card').forEach(function (c) {
          c.classList.remove('selected');
        });
        card.classList.add('selected');
      }
    }
  }

  if (paramBarber) {
    var barberRadio = document.querySelector('input[name="barber"][value="' + paramBarber + '"]');
    if (barberRadio) {
      barberRadio.checked = true;
      var bCard = barberRadio.closest('.barber-choice-card');
      if (bCard) {
        document.querySelectorAll('.barber-choice-card').forEach(function (c) {
          c.classList.remove('selected');
        });
        bCard.classList.add('selected');
      }
    }
    // If barber was pre-selected from a URL, skip to step 2 to save time
    if (paramBarber && !paramService) {
      var firstStep = document.getElementById('step-1');
      if (firstStep) {
        // Don't auto-advance — just make sure step 1 is still shown
        // so the user picks a service first
      }
    }
  }


  // ============================================================
  // 10. CONTACT FORM — CLIENT-SIDE SUBMIT SIMULATION
  // In a production app this would POST to an API endpoint.
  // Here we show a success message and reset the form.
  // ============================================================

  var contactForm    = document.getElementById('contact-form');
  var contactSuccess = document.getElementById('contact-success');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault(); // prevent actual submission — backend not wired to email

      var name    = contactForm.querySelector('#contact-name');
      var email   = contactForm.querySelector('#contact-email');
      var message = contactForm.querySelector('#contact-message');

      // Simple validation
      var hasError = false;
      [name, email, message].forEach(function (field) {
        if (!field || !field.value.trim()) {
          field.style.borderColor = '#dc2626';
          hasError = true;
        } else {
          field.style.borderColor = '';
        }
      });

      if (hasError) return;

      // Show the success message and reset
      if (contactSuccess) {
        contactSuccess.hidden = false;
        contactSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      contactForm.reset();

      // Hide the message after 6 seconds
      setTimeout(function () {
        if (contactSuccess) contactSuccess.hidden = true;
      }, 6000);
    });
  }

});

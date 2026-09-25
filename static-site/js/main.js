/**
 * Blade & Bone Barbershop — main.js
 * Handles: popup, mobile nav, booking stepper, live summary,
 *          Google Calendar URL, Apple .ics download, admin dashboard
 */

// ─── SHOP DATA ───────────────────────────────────────────────────────────────
const SHOP = {
  name:    "Blade & Bone Barbershop",
  address: "Waterloo, Durban",
  phone:   "082 356 2239",
  email:   "poomeigh503@gmail.com"
};

const SERVICES = [
  { id:"classic-cut",     name:"Classic Cut",       duration:45, price:180, desc:"A timeless scissor cut tailored to your head shape and lifestyle." },
  { id:"skin-fade",       name:"Skin Fade",          duration:45, price:220, desc:"Clean, sharp fade from skin to your preferred length on top." },
  { id:"beard-trim",      name:"Beard Trim",         duration:30, price:120, desc:"Shaped, lined up and conditioned so your beard looks its best." },
  { id:"cut-and-beard",   name:"Cut & Beard",        duration:60, price:280, desc:"The full package — haircut and beard trim in one sitting." },
  { id:"kids-cut",        name:"Kids Cut",           duration:30, price:140, desc:"Patient, friendly cuts for kids under 12. No fuss guaranteed." },
  { id:"hot-towel-shave", name:"Hot Towel Shave",    duration:45, price:200, desc:"Traditional straight-razor shave with hot towel prep and cold finish." },
  { id:"full-groom",      name:"Full Groom Package", duration:90, price:380, desc:"Cut, beard trim and hot towel finish — the full Blade & Bone experience." }
];

const BARBERS = [
  { id:"marcus", name:"Marcus Reid",  role:"Owner & Master Barber",   speciality:"Precision cuts, tapers and classic barbering",   image:"https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=500&fit=crop&q=80" },
  { id:"jordan", name:"Jordan Cole",  role:"Fade Specialist",          speciality:"Skin fades, high fades and fresh line-ups",       image:"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=500&fit=crop&q=80" },
  { id:"priya",  name:"Priya Nair",   role:"Texture & Styling Expert", speciality:"Textured hair, curls and creative styling",       image:"https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=500&fit=crop&q=80" }
];

const ADMIN_EMAIL = "poomeigh503@gmail.com";

// ─── UTILS ───────────────────────────────────────────────────────────────────
function pad(n){ return String(n).padStart(2,"0"); }

function formatICSDate(dt){
  return dt.getFullYear() +
    pad(dt.getMonth()+1) +
    pad(dt.getDate()) + "T" +
    pad(dt.getHours()) +
    pad(dt.getMinutes()) + "00";
}

function formatDisplayDate(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-ZA",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });
}

// ─── POPUP ───────────────────────────────────────────────────────────────────
function initPopup(){
  const overlay    = document.getElementById("welcome-overlay");
  const closeBtn   = document.getElementById("popup-close-btn");
  const dismissBtn = document.getElementById("popup-dismiss-btn");
  if (!overlay) return;

  if (!localStorage.getItem("bb_popup_seen")) {
    setTimeout(() => {
      overlay.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
    }, 2400);
  }

  function close(){
    overlay.setAttribute("hidden","");
    document.body.style.overflow = "";
    localStorage.setItem("bb_popup_seen","1");
  }

  closeBtn  && closeBtn.addEventListener("click", close);
  dismissBtn && dismissBtn.addEventListener("click", close);
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", e => { if (e.key==="Escape" && !overlay.hasAttribute("hidden")) close(); });
}

// ─── MOBILE MENU ─────────────────────────────────────────────────────────────
function initMobileMenu(){
  const btn     = document.getElementById("hamburger-btn");
  const menu    = document.getElementById("mobile-menu");
  const overlay = document.getElementById("mobile-overlay");
  if (!btn || !menu) return;

  function open(){
    btn.classList.add("open"); menu.classList.add("open");
    overlay && overlay.classList.add("open");
    btn.setAttribute("aria-expanded","true");
    document.body.style.overflow = "hidden";
  }
  function close(){
    btn.classList.remove("open"); menu.classList.remove("open");
    overlay && overlay.classList.remove("open");
    btn.setAttribute("aria-expanded","false");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => btn.classList.contains("open") ? close() : open());
  overlay && overlay.addEventListener("click", close);
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
  document.addEventListener("keydown", e => { if(e.key==="Escape") close(); });
}

// ─── HEADER SCROLL ───────────────────────────────────────────────────────────
function initHeaderScroll(){
  const h = document.getElementById("site-header");
  if (!h) return;
  window.addEventListener("scroll", () => h.classList.toggle("scrolled", window.scrollY > 20), { passive:true });
}

// ─── ACTIVE NAV LINK ─────────────────────────────────────────────────────────
function initActiveNav(){
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach(a => {
    const href = a.getAttribute("href").split("/").pop();
    if (href === page) a.classList.add("active");
  });
}

// ─── BOOKING FORM ────────────────────────────────────────────────────────────
function initBooking(){
  const form = document.getElementById("booking-form");
  if (!form) return;

  let currentStep = 1;

  // Pre-select from URL params e.g. booking.html?service=skin-fade
  const params = new URLSearchParams(location.search);
  const pSvc   = params.get("service");
  const pBrb   = params.get("barber");

  function showStep(n){
    document.querySelectorAll(".booking-step").forEach(s =>
      s.classList.toggle("hidden", parseInt(s.dataset.step) !== n)
    );
    currentStep = n;
    updateStepper(n);
    document.querySelector(".booking-layout")
      ?.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  function updateStepper(active){
    for (let i=1; i<=4; i++){
      const el  = document.getElementById("stepper-"+i);
      const dot = el?.querySelector(".stepper-dot");
      if (!el) continue;
      el.classList.remove("active","done");
      if (i===active){ el.classList.add("active"); dot && (dot.textContent=i); }
      else if (i<active){ el.classList.add("done"); dot && (dot.textContent="✓"); }
      else { dot && (dot.textContent=i); }
    }
  }

  function validate(step){
    if (step===1) return !!form.querySelector('input[name="service"]:checked');
    if (step===2) return !!form.querySelector('input[name="barber"]:checked');
    if (step===3){
      const d = form.querySelector('input[name="date"]');
      const t = form.querySelector('input[name="time"]:checked');
      return !!(d && d.value.trim() && t);
    }
    const fn = form.querySelector("#first_name")?.value.trim();
    const ln = form.querySelector("#last_name")?.value.trim();
    const em = form.querySelector("#email")?.value.trim();
    const ph = form.querySelector("#phone")?.value.trim();
    const ag = form.querySelector("#agree-terms")?.checked;
    return !!(fn && ln && em && em.includes("@") && ph && ag);
  }

  function showErr(msg){
    form.querySelectorAll(".step-error").forEach(e => e.remove());
    const div = document.createElement("div");
    div.className = "step-error"; div.textContent = msg;
    const active = form.querySelector(`#step-${currentStep}`);
    active?.prepend(div);
    setTimeout(() => div.remove(), 4000);
  }

  // Wire next buttons
  form.querySelectorAll(".step-next-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!validate(currentStep)){
        const msgs = {1:"Please select a service.",2:"Please choose a barber.",3:"Please select a date and time.",4:"Please fill in all required fields and agree to the terms."};
        showErr(msgs[currentStep]);
        return;
      }
      const next = parseInt(btn.dataset.next);
      if (next===4) updateSummaryPanel();
      showStep(next);
    });
  });

  // Wire back buttons
  form.querySelectorAll(".step-back-btn").forEach(btn => {
    btn.addEventListener("click", () => showStep(parseInt(btn.dataset.back)));
  });

  // Submit — save to localStorage and go to confirmation
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!validate(4)){ showErr("Please fill in all required fields and agree to the terms."); return; }

    const svc = form.querySelector('input[name="service"]:checked');
    const brb = form.querySelector('input[name="barber"]:checked');
    const svcData = SERVICES.find(s => s.id === svc?.value) || {};
    const brbData = BARBERS.find(b => b.id === brb?.value) || {};

    const booking = {
      id:          Date.now(),
      created_at:  new Date().toISOString(),
      service_id:   svcData.id,
      service_name: svcData.name,
      duration:     svcData.duration,
      price:        svcData.price,
      barber_id:    brbData.id,
      barber_name:  brbData.name,
      date:         form.querySelector('input[name="date"]')?.value,
      time:         form.querySelector('input[name="time"]:checked')?.value,
      first_name:   form.querySelector("#first_name")?.value.trim(),
      last_name:    form.querySelector("#last_name")?.value.trim(),
      email:        form.querySelector("#email")?.value.trim(),
      phone:        form.querySelector("#phone")?.value.trim(),
      notes:        form.querySelector("#notes")?.value.trim(),
      status:       "confirmed"
    };

    // Save to localStorage
    const bookings = JSON.parse(localStorage.getItem("bb_bookings") || "[]");
    bookings.push(booking);
    localStorage.setItem("bb_bookings", JSON.stringify(bookings));
    localStorage.setItem("bb_last_booking", JSON.stringify(booking));

    window.location.href = "confirmation.html";
  });

  // Card selection
  function wireCards(cardSel){
    document.querySelectorAll(cardSel).forEach(card => {
      const radio = card.querySelector("input[type=radio]");
      if (!radio) return;
      if (radio.checked) card.classList.add("selected");
      card.addEventListener("click", () => {
        document.querySelectorAll(cardSel).forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles:true }));
        updateSummaryPanel();
      });
    });
  }
  wireCards(".svc-choice");
  wireCards(".brb-choice");

  // Time slots
  document.querySelectorAll(".time-slot").forEach(label => {
    const radio = label.querySelector("input[type=radio]");
    if (!radio) return;
    if (radio.checked) label.classList.add("selected");
    label.addEventListener("click", () => {
      document.querySelectorAll(".time-slot").forEach(l => l.classList.remove("selected"));
      label.classList.add("selected");
      radio.checked = true;
      updateSummaryPanel();
    });
  });

  // Flatpickr
  const dateInput = document.querySelector(".date-flatpickr");
  if (dateInput && typeof flatpickr !== "undefined"){
    flatpickr(dateInput, {
      minDate:"today", maxDate: new Date().fp_incr(90),
      dateFormat:"Y-m-d", altInput:true, altFormat:"D, d M Y",
      onChange(){ updateSummaryPanel(); }
    });
  }

  // URL param pre-select
  if (pSvc){
    const r = form.querySelector(`input[name="service"][value="${pSvc}"]`);
    if (r){ r.checked=true; r.closest(".svc-choice")?.classList.add("selected"); updateSummaryPanel(); }
  }
  if (pBrb){
    const r = form.querySelector(`input[name="barber"][value="${pBrb}"]`);
    if (r){ r.checked=true; r.closest(".brb-choice")?.classList.add("selected"); }
  }
}

// ─── LIVE SUMMARY PANEL ───────────────────────────────────────────────────────
function updateSummaryPanel(){
  const svc  = document.querySelector('input[name="service"]:checked');
  const brb  = document.querySelector('input[name="barber"]:checked');
  const date = document.querySelector('input[name="date"]');
  const time = document.querySelector('input[name="time"]:checked');

  const empty = document.getElementById("summary-empty");
  const form  = document.getElementById("booking-form");
  if (!form) return;

  const set = (id, val) => { const el=document.getElementById(id); if(el){ el.textContent=val; el.closest(".summary-row")?.classList.remove("hidden"); } };
  const show = id => { const el=document.getElementById(id); if(el) el.classList.remove("hidden"); };

  if (!svc){ if(empty) empty.style.display=""; return; }
  if(empty) empty.style.display="none";

  const svcData = SERVICES.find(s => s.id===svc.value) || {};
  set("sum-service",  svcData.name || svc.value);
  set("sum-duration", (svcData.duration||"?")+" min");
  show("sum-total-row");
  const totalEl = document.getElementById("sum-total");
  if (totalEl) totalEl.textContent = "R"+(svcData.price||"—");

  if (brb){
    const brbData = BARBERS.find(b => b.id===brb.value) || {};
    set("sum-barber", brbData.name || brb.value);
  }
  if (date && date.value){ set("sum-date", date.value); }
  if (time){ set("sum-time", time.value); }
}

// ─── CONFIRMATION PAGE ────────────────────────────────────────────────────────
function initConfirmation(){
  const page = document.getElementById("confirm-page");
  if (!page) return;

  const booking = JSON.parse(localStorage.getItem("bb_last_booking") || "null");
  if (!booking){
    window.location.href = "booking.html";
    return;
  }

  // Fill in details
  const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  set("c-name",     booking.first_name + " " + booking.last_name);
  set("c-service",  booking.service_name);
  set("c-barber",   booking.barber_name);
  set("c-date",     formatDisplayDate(booking.date));
  set("c-time",     booking.time + " (" + booking.duration + " min)");
  set("c-price",    "R" + booking.price);
  set("c-location", SHOP.address);
  if (booking.notes){
    const notesEl = document.getElementById("c-notes-wrap");
    const notesVal = document.getElementById("c-notes");
    if(notesEl) notesEl.classList.remove("hidden");
    if(notesVal) notesVal.textContent = booking.notes;
  }

  // ── Google Calendar URL ──
  const start = new Date(booking.date + "T" + booking.time + ":00");
  const end   = new Date(start.getTime() + booking.duration * 60000);
  const startFmt = formatICSDate(start);
  const endFmt   = formatICSDate(end);

  const gcParams = new URLSearchParams({
    action:   "TEMPLATE",
    text:     `${booking.service_name} at Blade & Bone Barbershop`,
    dates:    `${startFmt}/${endFmt}`,
    details:  `Service: ${booking.service_name}\nBarber: ${booking.barber_name}\nDuration: ${booking.duration} minutes\nAddress: ${SHOP.address}\nPhone: ${SHOP.phone}\n\nPlease arrive 5 minutes early.`,
    location: SHOP.address
  });
  const gcLink = document.getElementById("google-cal-btn");
  if (gcLink) gcLink.href = "https://calendar.google.com/calendar/render?" + gcParams.toString();

  // ── Apple Calendar / .ics download ──
  const icsBtn = document.getElementById("apple-cal-btn");
  if (icsBtn){
    icsBtn.addEventListener("click", e => {
      e.preventDefault();
      const uid  = `${startFmt}-${booking.service_id}@bladeandbonebarber.co.za`;
      const now  = formatICSDate(new Date()) + "Z";
      const desc = `Service: ${booking.service_name}\\nBarber: ${booking.barber_name}\\nDuration: ${booking.duration} minutes\\nAddress: ${SHOP.address.replace(/,/g,"\\,")}\\nPhone: ${SHOP.phone}`;

      const ics = [
        "BEGIN:VCALENDAR","VERSION:2.0",
        "PRODID:-//Blade & Bone Barbershop//EN",
        "CALSCALE:GREGORIAN","METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${uid}`,`DTSTAMP:${now}`,
        `DTSTART:${startFmt}`,`DTEND:${endFmt}`,
        `SUMMARY:${booking.service_name} at Blade & Bone Barbershop`,
        `DESCRIPTION:${desc}`,
        `LOCATION:${SHOP.address.replace(/,/g,"\\,")}`,
        "BEGIN:VALARM","TRIGGER:-PT60M","ACTION:DISPLAY",
        `DESCRIPTION:Reminder: ${booking.service_name} at Blade & Bone in 1 hour`,
        "END:VALARM","END:VEVENT","END:VCALENDAR"
      ].join("\r\n");

      const blob = new Blob([ics], { type:"text/calendar;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `blade-and-bone-${booking.service_id}-${booking.date}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

// ─── CONTACT FORM ─────────────────────────────────────────────────────────────
function initContactForm(){
  const form    = document.getElementById("contact-form");
  const success = document.getElementById("contact-success");
  if (!form) return;

  form.addEventListener("submit", e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll("[required]").forEach(f => {
      if (!f.value.trim()){ f.style.borderColor="var(--error)"; ok=false; }
      else f.style.borderColor="";
    });
    if (!ok) return;
    if (success){ success.removeAttribute("hidden"); }
    form.reset();
    setTimeout(() => success && success.setAttribute("hidden",""), 6000);
  });
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function initAdmin(){
  const loginForm = document.getElementById("admin-login-form");
  const dashboard = document.getElementById("admin-dashboard");
  const loginWrap = document.getElementById("admin-login-wrap");
  if (!loginForm && !dashboard) return;

  // Check if already logged in
  if (localStorage.getItem("bb_admin_auth") === "1"){
    showDashboard();
  }

  if (loginForm){
    loginForm.addEventListener("submit", e => {
      e.preventDefault();
      const email = loginForm.querySelector("#admin-email")?.value.trim().toLowerCase();
      const errEl = document.getElementById("admin-login-error");
      if (email === ADMIN_EMAIL.toLowerCase()){
        localStorage.setItem("bb_admin_auth","1");
        showDashboard();
      } else {
        if (errEl){ errEl.textContent="Unauthorised email address."; errEl.removeAttribute("hidden"); }
      }
    });
  }

  document.getElementById("admin-logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("bb_admin_auth");
    location.reload();
  });

  function showDashboard(){
    if (loginWrap) loginWrap.classList.add("hidden");
    if (dashboard) dashboard.classList.remove("hidden");
    renderDashboard();
  }

  function renderDashboard(){
    const bookings = JSON.parse(localStorage.getItem("bb_bookings") || "[]");
    const today    = new Date().toISOString().slice(0,10);

    // Stats
    const stats = {
      total:     bookings.length,
      today:     bookings.filter(b => b.date===today).length,
      confirmed: bookings.filter(b => b.status==="confirmed").length,
      completed: bookings.filter(b => b.status==="completed").length,
      revenue:   bookings.filter(b => b.status!=="cancelled").reduce((s,b) => s+b.price, 0)
    };

    ["total","today","confirmed","completed"].forEach(k => {
      const el = document.getElementById("stat-"+k);
      if (el) el.textContent = stats[k];
    });
    const rev = document.getElementById("stat-revenue");
    if (rev) rev.textContent = "R"+stats.revenue;

    // Table
    const tbody = document.getElementById("bookings-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!bookings.length){
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><p>No bookings yet.</p><p>They'll appear here once customers book.</p></td></tr>`;
      return;
    }

    // Sort newest first
    [...bookings].sort((a,b) => b.id - a.id).forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="color:var(--muted);font-size:.78rem">#${b.id.toString().slice(-6)}</td>
        <td><strong>${b.first_name} ${b.last_name}</strong><br><span style="font-size:.78rem;color:var(--muted)">${b.email}</span></td>
        <td>${b.service_name}</td>
        <td>${b.barber_name}</td>
        <td>${b.date}</td>
        <td>${b.time}</td>
        <td style="color:var(--gold);font-weight:600">R${b.price}</td>
        <td><span class="badge badge-${b.status}">${b.status}</span></td>
        <td>
          <div style="display:flex;gap:5px">
            <button onclick="updateBookingStatus(${b.id},'${b.status==='confirmed'?'completed':'confirmed'}')" class="btn btn-ghost btn-sm">${b.status==="confirmed"?"Done":"Reopen"}</button>
            <button onclick="deleteBooking(${b.id})" class="btn btn-sm" style="background:transparent;color:var(--error);border:1.5px solid rgba(224,92,92,.3);border-radius:4px;cursor:pointer;padding:5px 10px;font-size:.75rem">✕</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  // Expose to onclick handlers
  window.updateBookingStatus = function(id, status){
    const bookings = JSON.parse(localStorage.getItem("bb_bookings") || "[]");
    const b = bookings.find(x => x.id===id);
    if (b){ b.status=status; localStorage.setItem("bb_bookings", JSON.stringify(bookings)); renderDashboard(); }
  };
  window.deleteBooking = function(id){
    if (!confirm("Delete this booking permanently?")) return;
    const bookings = JSON.parse(localStorage.getItem("bb_bookings") || "[]").filter(x => x.id!==id);
    localStorage.setItem("bb_bookings", JSON.stringify(bookings));
    renderDashboard();
  };
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initPopup();
  initMobileMenu();
  initHeaderScroll();
  initActiveNav();
  initBooking();
  initConfirmation();
  initContactForm();
  initAdmin();
});

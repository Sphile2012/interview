import os
import sqlite3
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, make_response, g, flash
)
from datetime import datetime, timedelta
from functools import wraps
import urllib.parse

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "blade-bone-2024-xk9q")

# Path to SQLite database — /tmp is writable on Netlify/Lambda, local dev uses repo root
DATABASE = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "barbershop.db"))

# Admin email — no password needed, just enter this email to get in
ADMIN_EMAIL = "poomeigh503@gmail.com"


# ─────────────────────────────────────────────────────────────────────────────
# SHOP DATA
# ─────────────────────────────────────────────────────────────────────────────

SERVICES = [
    {"id": "classic-cut",     "name": "Classic Cut",       "duration": 45, "price": 180,
     "desc": "A timeless scissor cut tailored to your head shape and lifestyle."},
    {"id": "skin-fade",       "name": "Skin Fade",          "duration": 45, "price": 220,
     "desc": "Clean, sharp fade from skin to your preferred length on top."},
    {"id": "beard-trim",      "name": "Beard Trim",         "duration": 30, "price": 120,
     "desc": "Shaped, lined up and conditioned so your beard looks its best."},
    {"id": "cut-and-beard",   "name": "Cut & Beard",        "duration": 60, "price": 280,
     "desc": "The full package — haircut and beard trim in one sitting."},
    {"id": "kids-cut",        "name": "Kids Cut",           "duration": 30, "price": 140,
     "desc": "Patient, friendly cuts for kids under 12. No fuss guaranteed."},
    {"id": "hot-towel-shave", "name": "Hot Towel Shave",    "duration": 45, "price": 200,
     "desc": "Traditional straight-razor shave with hot towel prep and cold finish."},
    {"id": "full-groom",      "name": "Full Groom Package", "duration": 90, "price": 380,
     "desc": "Cut, beard trim and hot towel finish — the full Blade & Bone experience."},
]

BARBERS = [
    {
        "id": "marcus",
        "name": "Luyanda Nene",
        "role": "Owner & Master Barber",
        "bio": (
            "Luyanda opened Blade & Bone in 2016 after a decade cutting hair in "
            "Johannesburg and Durban. His eye for precision and his ability to read "
            "a face are second to none."
        ),
        "speciality": "Precision cuts, tapers and classic barbering",
        "image": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=500&fit=crop&q=80",
    },
    {
        "id": "jordan",
        "name": "Rey Kodibone",
        "role": "Fade Specialist",
        "bio": (
            "Rey joined Blade & Bone in 2019 and quickly built a loyal following "
            "for razor-sharp fades. If you want a skin fade that turns heads, book Rey."
        ),
        "speciality": "Skin fades, high fades and fresh line-ups",
        "image": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=500&fit=crop&q=80",
    },
    {
        "id": "priya",
        "name": "Daniel",
        "role": "Texture & Styling Expert",
        "bio": (
            "Daniel has a gift for working with natural texture and curl patterns, "
            "giving every client a shape that actually works with their hair."
        ),
        "speciality": "Textured hair, curls and creative styling",
        "image": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=500&fit=crop&q=80",
    },
]

TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30",
]

SHOP = {
    "name":    "Blade & Bone Barbershop",
    "address": "Waterloo, Durban",
    "phone":   "082 356 2239",
    "email":   "poomeigh503@gmail.com",
    "hours": {
        "Monday – Friday": "9:00am – 7:00pm",
        "Saturday":        "8:00am – 6:00pm",
        "Sunday":          "10:00am – 4:00pm",
    },
    "social": {
        "instagram": "https://instagram.com",
        "facebook":  "https://facebook.com",
        "tiktok":    "https://tiktok.com",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db:
        db.close()


def init_db():
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at   TEXT    DEFAULT (datetime('now','localtime')),
            service_id   TEXT    NOT NULL,
            service_name TEXT    NOT NULL,
            duration     INTEGER NOT NULL,
            price        INTEGER NOT NULL,
            barber_id    TEXT    NOT NULL,
            barber_name  TEXT    NOT NULL,
            date         TEXT    NOT NULL,
            time         TEXT    NOT NULL,
            first_name   TEXT    NOT NULL,
            last_name    TEXT    NOT NULL,
            email        TEXT    NOT NULL,
            phone        TEXT    NOT NULL,
            notes        TEXT    DEFAULT '',
            status       TEXT    DEFAULT 'confirmed'
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT    DEFAULT (datetime('now','localtime')),
            name       TEXT    NOT NULL,
            email      TEXT    DEFAULT '',
            rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            review     TEXT    DEFAULT '',
            status     TEXT    DEFAULT 'pending'
        )
    """)
    db.commit()


def save_booking(b):
    db = get_db()
    cur = db.execute(
        """INSERT INTO bookings
           (service_id,service_name,duration,price,barber_id,barber_name,
            date,time,first_name,last_name,email,phone,notes)
           VALUES
           (:service_id,:service_name,:duration,:price,:barber_id,:barber_name,
            :date,:time,:first_name,:last_name,:email,:phone,:notes)""",
        b,
    )
    db.commit()
    return cur.lastrowid


def get_all_bookings():
    rows = get_db().execute(
        "SELECT * FROM bookings ORDER BY date DESC, time DESC"
    ).fetchall()
    return [dict(r) for r in rows]


def get_booking_by_id(bid):
    row = get_db().execute(
        "SELECT * FROM bookings WHERE id=?", (bid,)
    ).fetchone()
    return dict(row) if row else None


def update_booking_status(bid, status):
    db = get_db()
    db.execute("UPDATE bookings SET status=? WHERE id=?", (status, bid))
    db.commit()


def delete_booking(bid):
    db = get_db()
    db.execute("DELETE FROM bookings WHERE id=?", (bid,))
    db.commit()


def booking_slot_available(barber_id, date_str, time_str, duration):
    requested_start = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    requested_end = requested_start + timedelta(minutes=duration)
    rows = get_db().execute(
        """SELECT date, time, duration FROM bookings
           WHERE barber_id=? AND date=? AND status != 'cancelled'""",
        (barber_id, date_str),
    ).fetchall()
    for row in rows:
        existing_start = datetime.strptime(
            f"{row['date']} {row['time']}", "%Y-%m-%d %H:%M"
        )
        existing_end = existing_start + timedelta(minutes=int(row["duration"]))
        if requested_start < existing_end and requested_end > existing_start:
            return False
    return True


# Create tables on startup
with app.app_context():
    init_db()


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN AUTH DECORATOR
# ─────────────────────────────────────────────────────────────────────────────

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return f(*args, **kwargs)
    return decorated


# ─────────────────────────────────────────────────────────────────────────────
# CALENDAR HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def build_google_cal_url(booking):
    start_dt  = datetime.strptime(f"{booking['date']} {booking['time']}", "%Y-%m-%d %H:%M")
    end_dt    = start_dt + timedelta(minutes=int(booking["duration"]))
    params = {
        "action":   "TEMPLATE",
        "text":     f"{booking['service_name']} at Blade & Bone Barbershop",
        "dates":    f"{start_dt.strftime('%Y%m%dT%H%M%S')}/{end_dt.strftime('%Y%m%dT%H%M%S')}",
        "details":  (
            f"Service: {booking['service_name']}\n"
            f"Barber: {booking['barber_name']}\n"
            f"Duration: {booking['duration']} minutes\n"
            f"Address: Waterloo, Durban\n"
            f"Phone: 082 356 2239\n\n"
            f"Please arrive 5 minutes before your appointment."
        ),
        "location": "Waterloo, Durban",
    }
    return "https://calendar.google.com/calendar/render?" + urllib.parse.urlencode(params)


def build_ics_content(booking):
    start_dt  = datetime.strptime(f"{booking['date']} {booking['time']}", "%Y-%m-%d %H:%M")
    end_dt    = start_dt + timedelta(minutes=int(booking["duration"]))
    uid       = f"{start_dt.strftime('%Y%m%dT%H%M%S')}-{booking['service_id']}@bladeandbonebarber.co.za"
    return (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"
        "PRODID:-//Blade & Bone Barbershop//EN\r\n"
        "CALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}\r\n"
        f"DTSTART:{start_dt.strftime('%Y%m%dT%H%M%S')}\r\n"
        f"DTEND:{end_dt.strftime('%Y%m%dT%H%M%S')}\r\n"
        f"SUMMARY:{booking['service_name']} at Blade & Bone Barbershop\r\n"
        f"DESCRIPTION:Service: {booking['service_name']}\\nBarber: {booking['barber_name']}\\n"
        f"Duration: {booking['duration']} mins\\nAddress: Waterloo\\, Durban\\nPhone: 082 356 2239\r\n"
        "LOCATION:Waterloo\\, Durban\r\n"
        "BEGIN:VALARM\r\nTRIGGER:-PT60M\r\nACTION:DISPLAY\r\n"
        f"DESCRIPTION:Reminder: {booking['service_name']} at Blade & Bone in 1 hour\r\n"
        "END:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
    )


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMER ROUTES
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template("home.html", shop=SHOP, services=SERVICES[:4], barbers=BARBERS)


@app.route("/services")
def services():
    return render_template("services.html", shop=SHOP, services=SERVICES)


@app.route("/about")
def about():
    return render_template("about.html", shop=SHOP, barbers=BARBERS)


@app.route("/booking", methods=["GET", "POST"])
def booking():
    if request.method == "POST":
        service_id = request.form.get("service", "").strip()
        barber_id  = request.form.get("barber",  "").strip()
        date_str   = request.form.get("date",    "").strip()
        time_str   = request.form.get("time",    "").strip()
        first_name = request.form.get("first_name", "").strip()
        last_name  = request.form.get("last_name",  "").strip()
        email      = request.form.get("email",      "").strip()
        phone      = request.form.get("phone",      "").strip()
        notes      = request.form.get("notes",      "").strip()

        service = next((s for s in SERVICES if s["id"] == service_id), None)
        barber  = next((b for b in BARBERS  if b["id"] == barber_id),  None)

        errors = []
        if not service:               errors.append("Please select a service.")
        if not barber:                errors.append("Please select a barber.")
        if not date_str:              errors.append("Please choose a date.")
        if not time_str:              errors.append("Please choose a time slot.")
        if not first_name:            errors.append("Please enter your first name.")
        if not last_name:             errors.append("Please enter your last name.")
        if not email or "@" not in email: errors.append("Please enter a valid email.")
        if not phone:                 errors.append("Please enter your phone number.")

        appointment_date = None
        if date_str:
            try:
                appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                errors.append("Please choose a valid date.")
        if appointment_date and appointment_date < datetime.now().date():
            errors.append("Please choose a future date.")
        if time_str and time_str not in TIME_SLOTS:
            errors.append("Please choose an available time slot.")
        if service and barber and appointment_date and time_str in TIME_SLOTS:
            if not booking_slot_available(barber_id, date_str, time_str, service["duration"]):
                errors.append("That barber is already booked for the selected time.")

        if errors:
            return render_template(
                "booking.html", shop=SHOP, services=SERVICES, barbers=BARBERS,
                time_slots=TIME_SLOTS, errors=errors, form_data=request.form,
            )

        booking_data = {
            "service_id":   service["id"],
            "service_name": service["name"],
            "duration":     service["duration"],
            "price":        service["price"],
            "barber_id":    barber["id"],
            "barber_name":  barber["name"],
            "date":         date_str,
            "time":         time_str,
            "first_name":   first_name,
            "last_name":    last_name,
            "email":        email,
            "phone":        phone,
            "notes":        notes,
        }

        booking_data["id"] = save_booking(booking_data)
        session["booking"] = booking_data
        return redirect(url_for("confirmation"))

    return render_template(
        "booking.html", shop=SHOP, services=SERVICES, barbers=BARBERS,
        time_slots=TIME_SLOTS, errors=[], form_data={},
    )


@app.route("/confirmation")
def confirmation():
    booking = session.get("booking")
    if not booking:
        return redirect(url_for("booking"))
    try:
        display_date = datetime.strptime(booking["date"], "%Y-%m-%d").strftime("%A, %d %B %Y")
    except (ValueError, KeyError):
        display_date = booking.get("date", "")
    return render_template(
        "confirmation.html", shop=SHOP, booking=booking,
        display_date=display_date,
        google_cal_url=build_google_cal_url(booking),
    )


@app.route("/download-ics")
def download_ics():
    booking = session.get("booking")
    if not booking:
        return redirect(url_for("booking"))
    safe = booking["service_name"].lower().replace(" ", "-").replace("&", "and")
    resp = make_response(build_ics_content(booking))
    resp.headers["Content-Type"]        = "text/calendar; charset=utf-8"
    resp.headers["Content-Disposition"] = f"attachment; filename=blade-and-bone-{safe}-{booking['date']}.ics"
    return resp


@app.route("/contact")
def contact():
    return render_template("contact.html", shop=SHOP)


@app.route("/review", methods=["GET", "POST"])
def review():
    errors = []
    form_data = request.form if request.method == "POST" else {}

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        rating = request.form.get("rating", "").strip()
        review_text = request.form.get("review", "").strip()

        if not name:
            errors.append("Please enter your name.")
        if email and "@" not in email:
            errors.append("Please enter a valid email address.")
        if rating not in {"1", "2", "3", "4", "5"}:
            errors.append("Please choose a rating from 1 to 5 stars.")
        if len(review_text) > 1000:
            errors.append("Your review must be 1,000 characters or fewer.")

        if not errors:
            get_db().execute(
                """INSERT INTO reviews (name, email, rating, review)
                   VALUES (?, ?, ?, ?)""",
                (name, email, int(rating), review_text),
            )
            get_db().commit()
            flash("Thanks for your feedback. It has been sent for review.", "success")
            return redirect(url_for("review"))

    return render_template(
        "review.html", shop=SHOP, errors=errors, form_data=form_data,
    )


@app.route("/terms")
def terms():
    return render_template("terms.html", shop=SHOP)


@app.route("/privacy")
def privacy():
    return render_template("privacy.html", shop=SHOP)


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ROUTES  —  Login is email only, no password
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))

    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        if email == ADMIN_EMAIL.lower():
            session["admin_logged_in"] = True
            session["admin_email"]     = ADMIN_EMAIL
            return redirect(url_for("admin_dashboard"))
        else:
            error = "Unauthorised email address. Please use the admin email."

    return render_template("admin/login.html", error=error)


@app.route("/admin/logout")
def admin_logout():
    session.pop("admin_logged_in", None)
    session.pop("admin_email",     None)
    return redirect(url_for("admin_login"))


@app.route("/admin")
@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    bookings  = get_all_bookings()
    today_str = datetime.now().strftime("%Y-%m-%d")
    stats = {
        "total":     len(bookings),
        "today":     sum(1 for b in bookings if b["date"] == today_str),
        "confirmed": sum(1 for b in bookings if b["status"] == "confirmed"),
        "cancelled": sum(1 for b in bookings if b["status"] == "cancelled"),
        "completed": sum(1 for b in bookings if b["status"] == "completed"),
        "revenue":   sum(b["price"] for b in bookings if b["status"] != "cancelled"),
    }
    return render_template(
        "admin/dashboard.html",
        bookings=bookings, stats=stats,
        services=SERVICES, barbers=BARBERS, shop=SHOP,
        admin_email=session.get("admin_email"),
    )


@app.route("/admin/bookings")
@admin_required
def admin_bookings():
    filter_status = request.args.get("status", "")
    filter_barber = request.args.get("barber", "")
    filter_date   = request.args.get("date",   "")

    bookings = get_all_bookings()
    if filter_status: bookings = [b for b in bookings if b["status"]    == filter_status]
    if filter_barber: bookings = [b for b in bookings if b["barber_id"] == filter_barber]
    if filter_date:   bookings = [b for b in bookings if b["date"]      == filter_date]

    return render_template(
        "admin/bookings.html",
        bookings=bookings, barbers=BARBERS, shop=SHOP,
        filter_status=filter_status, filter_barber=filter_barber,
        filter_date=filter_date, admin_email=session.get("admin_email"),
    )


@app.route("/admin/booking/<int:booking_id>")
@admin_required
def admin_booking_detail(booking_id):
    b = get_booking_by_id(booking_id)
    if not b:
        flash("Booking not found.", "error")
        return redirect(url_for("admin_bookings"))
    return render_template(
        "admin/booking_detail.html", booking=b, shop=SHOP,
        admin_email=session.get("admin_email"),
    )


@app.route("/admin/booking/<int:booking_id>/status", methods=["POST"])
@admin_required
def admin_update_status(booking_id):
    status = request.form.get("status", "confirmed")
    if status in ("confirmed", "cancelled", "completed"):
        update_booking_status(booking_id, status)
        flash(f"Booking #{booking_id} updated to {status}.", "success")
    return redirect(request.referrer or url_for("admin_bookings"))


@app.route("/admin/booking/<int:booking_id>/delete", methods=["POST"])
@admin_required
def admin_delete_booking(booking_id):
    delete_booking(booking_id)
    flash(f"Booking #{booking_id} deleted.", "info")
    return redirect(url_for("admin_bookings"))


@app.route("/admin/services")
@admin_required
def admin_services():
    return render_template(
        "admin/services.html", services=SERVICES, shop=SHOP,
        admin_email=session.get("admin_email"),
    )


@app.route("/admin/barbers")
@admin_required
def admin_barbers():
    return render_template(
        "admin/barbers.html", barbers=BARBERS, shop=SHOP,
        admin_email=session.get("admin_email"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port  = int(os.environ.get("PORT", 5000))
    app.run(debug=debug, host="0.0.0.0", port=port)

import os
from flask import Flask, render_template, request, redirect, url_for, session, make_response
from datetime import datetime, timedelta
import urllib.parse

app = Flask(__name__)
# Secret key needed for session management - keep this private in production
app.secret_key = os.environ.get("SECRET_KEY", "blade-and-bone-secret-2024")


# ---------------------------------------------------------------------------
# Data - all the shop content lives here so templates stay clean
# ---------------------------------------------------------------------------

SERVICES = [
    {"id": "classic-cut",    "name": "Classic Cut",         "duration": 45, "price": 18, "desc": "A timeless scissor cut tailored to your head shape and lifestyle."},
    {"id": "skin-fade",      "name": "Skin Fade",           "duration": 45, "price": 22, "desc": "Clean, sharp fade from skin to your preferred length on top."},
    {"id": "beard-trim",     "name": "Beard Trim",          "duration": 30, "price": 12, "desc": "Shaped, lined up and conditioned so your beard looks its best."},
    {"id": "cut-and-beard",  "name": "Cut & Beard",         "duration": 60, "price": 28, "desc": "The full package — haircut and beard trim in one sitting."},
    {"id": "kids-cut",       "name": "Kids Cut",            "duration": 30, "price": 14, "desc": "Patient, friendly cuts for kids under 12. No fuss guaranteed."},
    {"id": "hot-towel-shave","name": "Hot Towel Shave",     "duration": 45, "price": 20, "desc": "Traditional straight-razor shave with hot towel prep and cold finish."},
    {"id": "full-groom",     "name": "Full Groom Package",  "duration": 90, "price": 38, "desc": "Cut, beard trim and hot towel finish — the full Blade & Bone experience."},
]

BARBERS = [
    {
        "id": "marcus",
        "name": "Marcus Reid",
        "role": "Owner & Master Barber",
        "bio": (
            "Marcus opened Blade & Bone in 2016 after a decade cutting hair in London and Manchester. "
            "He trained under some of the best in the business before bringing his craft back home. "
            "His eye for precision and his ability to read a face are second to none."
        ),
        "speciality": "Precision cuts, tapers and classic barbering",
        "image": "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=500&fit=crop&q=80",
    },
    {
        "id": "jordan",
        "name": "Jordan Cole",
        "role": "Fade Specialist",
        "bio": (
            "Jordan grew up watching his uncle cut hair in Salford and never looked back. "
            "He joined Blade & Bone in 2019 and quickly built a loyal following for his razor-sharp fades. "
            "If you want a skin fade that turns heads, book Jordan."
        ),
        "speciality": "Skin fades, high fades and fresh line-ups",
        "image": "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=500&fit=crop&q=80",
    },
    {
        "id": "priya",
        "name": "Priya Nair",
        "role": "Texture & Styling Expert",
        "bio": (
            "Priya came to barbering from a background in fashion styling and it shows in every cut she does. "
            "She has a gift for working with natural texture and curl patterns, giving every client a shape "
            "that actually works with their hair rather than against it."
        ),
        "speciality": "Textured hair, curls and creative styling",
        "image": "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=500&fit=crop&q=80",
    },
]

# Time slots available each day
TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30",
]

SHOP = {
    "name":    "Blade & Bone Barbershop",
    "address": "47 King Street, Manchester, M2 4LQ",
    "phone":   "0161 834 7720",
    "email":   "hello@bladeandbonebarber.co.uk",
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


# ---------------------------------------------------------------------------
# Helper - build Google Calendar URL from booking details
# ---------------------------------------------------------------------------

def build_google_cal_url(booking):
    """
    Takes a booking dictionary and returns a Google Calendar 'add event' URL.
    All the appointment details get packed into the URL so the user's calendar
    is pre-filled with exactly what they booked.
    """
    service_name = booking["service_name"]
    barber_name  = booking["barber_name"]
    date_str     = booking["date"]          # YYYY-MM-DD
    time_str     = booking["time"]          # HH:MM
    duration     = int(booking["duration"]) # minutes

    # Parse the start datetime and work out the end time
    start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    end_dt   = start_dt + timedelta(minutes=duration)

    # Google Calendar wants times in UTC format: YYYYMMDDTHHMMSSZ
    # The shop is in the UK so we keep it simple and use local time here;
    # for a production system you'd convert to UTC properly.
    start_fmt = start_dt.strftime("%Y%m%dT%H%M%S")
    end_fmt   = end_dt.strftime("%Y%m%dT%H%M%S")

    title   = f"{service_name} at Blade & Bone Barbershop"
    details = (
        f"Appointment: {service_name}\n"
        f"Barber: {barber_name}\n"
        f"Duration: {duration} minutes\n"
        f"Address: 47 King Street, Manchester, M2 4LQ\n"
        f"Phone: 0161 834 7720\n\n"
        f"Please arrive 5 minutes before your appointment."
    )

    params = {
        "action":   "TEMPLATE",
        "text":     title,
        "dates":    f"{start_fmt}/{end_fmt}",
        "details":  details,
        "location": "47 King Street, Manchester, M2 4LQ",
    }

    return "https://calendar.google.com/calendar/render?" + urllib.parse.urlencode(params)


def build_ics_content(booking):
    """
    Builds an .ics file string so the customer can add the appointment to
    Apple Calendar, Outlook, or any calendar that understands the iCal format.
    """
    service_name = booking["service_name"]
    barber_name  = booking["barber_name"]
    date_str     = booking["date"]
    time_str     = booking["time"]
    duration     = int(booking["duration"])

    start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    end_dt   = start_dt + timedelta(minutes=duration)

    # iCal datetime format
    start_fmt = start_dt.strftime("%Y%m%dT%H%M%S")
    end_fmt   = end_dt.strftime("%Y%m%dT%H%M%S")
    now_fmt   = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    # A unique identifier for this event - combining timestamp + service keeps it distinct
    uid = f"{start_fmt}-{service_name.lower().replace(' ', '-')}@bladeandbonebarber.co.uk"

    description = (
        f"Appointment: {service_name}\\n"
        f"Barber: {barber_name}\\n"
        f"Duration: {duration} minutes\\n"
        f"Address: 47 King Street\\, Manchester\\, M2 4LQ\\n"
        f"Phone: 0161 834 7720\\n\\n"
        f"Please arrive 5 minutes before your appointment."
    )

    # Build the .ics content following RFC 5545
    ics = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//Blade & Bone Barbershop//EN\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "METHOD:PUBLISH\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{now_fmt}\r\n"
        f"DTSTART:{start_fmt}\r\n"
        f"DTEND:{end_fmt}\r\n"
        f"SUMMARY:{service_name} at Blade & Bone Barbershop\r\n"
        f"DESCRIPTION:{description}\r\n"
        "LOCATION:47 King Street\\, Manchester\\, M2 4LQ\r\n"
        "BEGIN:VALARM\r\n"
        "TRIGGER:-PT60M\r\n"
        "ACTION:DISPLAY\r\n"
        f"DESCRIPTION:Reminder: {service_name} at Blade & Bone in 1 hour\r\n"
        "END:VALARM\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )

    return ics


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    return render_template("home.html", shop=SHOP, services=SERVICES[:4])


@app.route("/services")
def services():
    return render_template("services.html", shop=SHOP, services=SERVICES)


@app.route("/about")
def about():
    return render_template("about.html", shop=SHOP, barbers=BARBERS)


@app.route("/booking", methods=["GET", "POST"])
def booking():
    """
    Handles the booking form. On GET it shows the form; on POST it validates
    the submitted data and stores it in the session before redirecting to
    the confirmation page.
    """
    if request.method == "POST":
        service_id  = request.form.get("service")
        barber_id   = request.form.get("barber")
        date_str    = request.form.get("date")
        time_str    = request.form.get("time")
        first_name  = request.form.get("first_name", "").strip()
        last_name   = request.form.get("last_name", "").strip()
        email       = request.form.get("email", "").strip()
        phone       = request.form.get("phone", "").strip()
        notes       = request.form.get("notes", "").strip()

        # Find the matching service and barber from our data
        service = next((s for s in SERVICES if s["id"] == service_id), None)
        barber  = next((b for b in BARBERS  if b["id"] == barber_id),  None)

        # Basic server-side validation - the form also validates on the client
        errors = []
        if not service:
            errors.append("Please select a valid service.")
        if not barber:
            errors.append("Please select a barber.")
        if not date_str:
            errors.append("Please choose a date.")
        if not time_str:
            errors.append("Please choose a time.")
        if not first_name:
            errors.append("Please enter your first name.")
        if not last_name:
            errors.append("Please enter your last name.")
        if not email or "@" not in email:
            errors.append("Please enter a valid email address.")
        if not phone:
            errors.append("Please enter your phone number.")

        if errors:
            return render_template(
                "booking.html",
                shop=SHOP,
                services=SERVICES,
                barbers=BARBERS,
                time_slots=TIME_SLOTS,
                errors=errors,
                form_data=request.form,
            )

        # Store everything in the session so the confirmation page can read it
        session["booking"] = {
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

        return redirect(url_for("confirmation"))

    # GET - show the empty booking form
    return render_template(
        "booking.html",
        shop=SHOP,
        services=SERVICES,
        barbers=BARBERS,
        time_slots=TIME_SLOTS,
        errors=[],
        form_data={},
    )


@app.route("/confirmation")
def confirmation():
    """
    Shows the booking confirmation and provides both Google Calendar and
    Apple Calendar download links built from the customer's actual booking.
    """
    booking = session.get("booking")

    if not booking:
        # If someone lands here without a booking, send them to the booking page
        return redirect(url_for("booking"))

    # Format the date nicely for display
    try:
        display_date = datetime.strptime(booking["date"], "%Y-%m-%d").strftime("%A, %d %B %Y")
    except ValueError:
        display_date = booking["date"]

    google_cal_url = build_google_cal_url(booking)

    return render_template(
        "confirmation.html",
        shop=SHOP,
        booking=booking,
        display_date=display_date,
        google_cal_url=google_cal_url,
    )


@app.route("/download-ics")
def download_ics():
    """
    Generates and serves an .ics file for the customer's booking.
    This is what Apple Calendar, Outlook and other apps download.
    """
    booking = session.get("booking")

    if not booking:
        return redirect(url_for("booking"))

    ics_content = build_ics_content(booking)

    # Build a sensible filename from the booking details
    safe_service = booking["service_name"].lower().replace(" ", "-").replace("&", "and")
    filename = f"blade-and-bone-{safe_service}-{booking['date']}.ics"

    response = make_response(ics_content)
    response.headers["Content-Type"]        = "text/calendar; charset=utf-8"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"

    return response


@app.route("/contact")
def contact():
    return render_template("contact.html", shop=SHOP)


@app.route("/terms")
def terms():
    return render_template("terms.html", shop=SHOP)


@app.route("/privacy")
def privacy():
    return render_template("privacy.html", shop=SHOP)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Debug mode is off by default - only turn it on locally while developing
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=debug_mode, host="0.0.0.0", port=port)

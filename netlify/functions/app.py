"""
Netlify serverless function entry point for Blade & Bone Barbershop.
Bridges between Netlify Lambda events and the Flask WSGI app.
"""

import sys
import os

# Walk two levels up to reach the repo root where app.py lives
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Point Flask to the correct template and static folders
os.environ.setdefault("FLASK_TEMPLATE_FOLDER", os.path.join(ROOT, "templates"))
os.environ.setdefault("FLASK_STATIC_FOLDER",   os.path.join(ROOT, "static"))

# SQLite DB lives in /tmp on Lambda (writable), fall back to root for local dev
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    os.environ.setdefault("DB_PATH", "/tmp/barbershop.db")
else:
    os.environ.setdefault("DB_PATH", os.path.join(ROOT, "barbershop.db"))

# Import the Flask app and patch folder paths
from app import app as flask_app  # noqa: E402

flask_app.template_folder = os.path.join(ROOT, "templates")
flask_app.static_folder   = os.path.join(ROOT, "static")

import serverless_wsgi  # noqa: E402


def handler(event, context):
    """Called by Netlify on every incoming HTTP request."""
    return serverless_wsgi.handle_request(flask_app, event, context)

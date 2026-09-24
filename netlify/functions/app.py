"""
Netlify serverless function — bridges Lambda events to Flask WSGI.
"""

import sys
import os

# Repo root is two levels up from netlify/functions/
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# SQLite lives in /tmp on Lambda (only writable dir), repo root locally
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    os.environ.setdefault("DB_PATH", "/tmp/barbershop.db")
else:
    os.environ.setdefault("DB_PATH", os.path.join(ROOT, "barbershop.db"))

# Import Flask app and patch folder paths before any requests are handled
from app import app as flask_app  # noqa: E402

flask_app.template_folder = os.path.join(ROOT, "templates")
flask_app.static_folder   = os.path.join(ROOT, "static")
flask_app.static_url_path = "/static"

import serverless_wsgi  # noqa: E402


def handler(event, context):
    """Entry point called by Netlify on every HTTP request."""
    # serverless_wsgi translates the Lambda event into a WSGI environ
    # and converts the Flask response back to the Lambda response format
    return serverless_wsgi.handle_request(flask_app, event, context)

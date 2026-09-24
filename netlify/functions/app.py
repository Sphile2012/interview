"""
Netlify serverless function entry point for Blade & Bone Barbershop.

Netlify Functions run each request as a separate Lambda invocation, so
this file acts as the bridge between the Netlify event and our Flask app.

serverless_wsgi translates the Lambda event/context into a standard WSGI
request that Flask understands, so no changes to the main app are needed.
"""

import sys
import os

# ---------------------------------------------------------------------------
# Path fix — the function runs from netlify/functions/ but our templates,
# static files and app.py all live at the repo root. We add the root to
# sys.path so Python can import app.py and Flask can find templates/static.
# ---------------------------------------------------------------------------

# Walk two levels up from this file to reach the repo root
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# ---------------------------------------------------------------------------
# Tell Flask explicitly where templates and static files live.
# Without this, Flask would look relative to this function file and find
# nothing — all 404s and TemplateNotFound errors.
# ---------------------------------------------------------------------------
os.environ.setdefault("FLASK_TEMPLATE_FOLDER", os.path.join(ROOT, "templates"))
os.environ.setdefault("FLASK_STATIC_FOLDER",   os.path.join(ROOT, "static"))

# ---------------------------------------------------------------------------
# Import the Flask app from the repo root and patch the folder paths in
# case Flask resolved them at import time before our env vars were set.
# ---------------------------------------------------------------------------
from app import app as flask_app  # noqa: E402  (import after sys.path patch)

flask_app.template_folder = os.path.join(ROOT, "templates")
flask_app.static_folder   = os.path.join(ROOT, "static")

# ---------------------------------------------------------------------------
# serverless_wsgi is the adapter that converts the Netlify/Lambda event
# format into a WSGI environ dict that Flask can handle normally.
# ---------------------------------------------------------------------------
import serverless_wsgi  # noqa: E402


def handler(event, context):
    """
    This is the function Netlify calls on every incoming HTTP request.
    serverless_wsgi.handle_request does all the heavy lifting — it builds
    a WSGI environ from the event, calls Flask, and converts the response
    back into the format Netlify expects.
    """
    return serverless_wsgi.handle_request(flask_app, event, context)

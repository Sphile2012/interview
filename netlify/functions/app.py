"""
Netlify serverless function for Blade & Bone Barbershop Flask app.
Uses serverless-wsgi to translate Lambda events into WSGI requests.
"""

import sys
import os

# ── Path setup ──────────────────────────────────────────────────────────────
# The function runs from netlify/functions/ inside the Lambda container.
# We need to add the repo root AND the vendored packages dir to sys.path.

FUNC_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT      = os.path.abspath(os.path.join(FUNC_DIR, "..", ".."))
PKGS      = os.path.join(FUNC_DIR, "packages")

for p in [ROOT, PKGS]:
    if p not in sys.path:
        sys.path.insert(0, p)

# ── Database path ────────────────────────────────────────────────────────────
# /tmp is the only writable directory in a Lambda/Netlify function environment.
os.environ.setdefault("DB_PATH", "/tmp/barbershop.db")

# ── Import Flask app ─────────────────────────────────────────────────────────
from app import app as flask_app  # noqa: E402

flask_app.template_folder = os.path.join(ROOT, "templates")
flask_app.static_folder   = os.path.join(ROOT, "static")
flask_app.static_url_path = "/static"

# ── Serverless WSGI handler ──────────────────────────────────────────────────
import serverless_wsgi  # noqa: E402

# Tell serverless_wsgi to pass the full path including the function prefix
serverless_wsgi.TEXT_MIME_TYPES.append("application/javascript")
serverless_wsgi.TEXT_MIME_TYPES.append("text/css")


def handler(event, context):
    """
    Entry point called by Netlify on every HTTP request.
    serverless_wsgi converts the Lambda event dict into a WSGI environ,
    runs it through Flask, and converts the response back.
    """
    return serverless_wsgi.handle_request(flask_app, event, context)

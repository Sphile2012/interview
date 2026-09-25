import sys
import os

# Add bundled packages and repo root to path
FUNC_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(FUNC_DIR, "..", ".."))
PKGS = os.path.join(FUNC_DIR, "packages")

for p in [PKGS, ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault("DB_PATH", "/tmp/barbershop.db")

from app import app as flask_app
flask_app.template_folder = os.path.join(ROOT, "templates")
flask_app.static_folder = os.path.join(ROOT, "static")
flask_app.static_url_path = "/static"

import serverless_wsgi

def handler(event, context):
    # Strip the function path prefix so Flask sees clean routes
    if event.get("path", "").startswith("/.netlify/functions/app"):
        event["path"] = event["path"][len("/.netlify/functions/app"):] or "/"
    if not event.get("path"):
        event["path"] = "/"
    return serverless_wsgi.handle_request(flask_app, event, context)

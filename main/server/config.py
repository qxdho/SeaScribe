# SeaScribe server configuration
import os
import sys
from types import SimpleNamespace


# ── Server ──

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9060
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── Data paths (nested) ──

paths = SimpleNamespace()
paths.data = os.path.join(ROOT, "data")

paths.store = SimpleNamespace(
    avatars  = os.path.join(paths.data, "avatars"),
    roster   = os.path.join(paths.data, "roster"),
    users    = os.path.join(paths.data, "users.json"),
    sessions = os.path.join(paths.data, "sessions.json"),
    logs     = os.path.join(paths.data, "logs.json"),
    logs_debug = os.path.join(paths.data, "logs_debug.json"),
)

paths.content = SimpleNamespace(
    picker  = os.path.join(paths.data, "picker"),
    english = os.path.join(paths.data, "english"),
)


# ── Flat aliases (keep imports working) ──

DATA        = paths.data
AVATAR_DIR  = paths.store.avatars
ROSTER_DIR  = paths.store.roster
PICKER_DIR  = paths.content.picker
ENGLISH_DIR = paths.content.english
USERS_PATH    = paths.store.users
SESSIONS_PATH = paths.store.sessions
LOGS_PATH     = paths.store.logs
LOGS_DEBUG_PATH = paths.store.logs_debug


# ── Limits ──

MAX_BODY     = 60 * 1024 * 1024
MAX_BODY_API =  1 * 1024 * 1024


# ── MIME types ──

TEXT_EXTS = {
    ".html": "text/html",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".csv":  "text/csv",
    ".md":   "text/markdown",
    ".svg":  "image/svg+xml",
    ".json": "application/json",
}

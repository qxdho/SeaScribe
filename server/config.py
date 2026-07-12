# SeaScribe server configuration
import os
import sys

PORT   = int(sys.argv[1]) if len(sys.argv) > 1 else 9360
ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA   = os.path.join(ROOT, 'data')
STORE  = os.path.join(ROOT, 'admin', '_store')

PICKER_DIR  = os.path.join(DATA, 'picker')
ENGLISH_DIR = os.path.join(DATA, 'english')
AVATAR_DIR  = os.path.join(STORE, 'avatars')
ROSTER_DIR  = os.path.join(STORE, 'roster')

USERS_PATH    = os.path.join(STORE, 'users.json')
SESSIONS_PATH = os.path.join(STORE, 'sessions.json')

MAX_BODY     = 60 * 1024 * 1024
MAX_BODY_API =  1 * 1024 * 1024

TEXT_EXTS = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.csv': 'text/csv', '.md': 'text/markdown', '.svg': 'image/svg+xml',
    '.json': 'application/json',
}

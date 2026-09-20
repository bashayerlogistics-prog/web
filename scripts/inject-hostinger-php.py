#!/usr/bin/env python3
"""Inject Hostinger PHP secrets during GitHub Actions deploy. Never commit real keys."""
import base64
import json
import os
import pathlib

project_id = os.environ.get('VITE_FIREBASE_PROJECT_ID', '')
client_email = os.environ.get('FIREBASE_CLIENT_EMAIL', '')
private_key = os.environ.get('FIREBASE_PRIVATE_KEY', '')
sa_raw = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '').strip()
if sa_raw:
    sa = json.loads(sa_raw)
    project_id = sa.get('project_id') or project_id
    client_email = sa.get('client_email') or client_email
    private_key = sa.get('private_key') or private_key
private_key = private_key.replace('\\n', '\n')
pk_b64 = base64.b64encode(private_key.encode('utf-8')).decode('ascii') if private_key else ''
clerk_secret = os.environ.get('CLERK_SECRET_KEY', '')


def repl(src, needle, value):
    if needle in value:
        raise SystemExit(f'secret contains placeholder {needle}')
    return src.replace(needle, value)


def inject_file(path: pathlib.Path, *, moyasar=False, clerk=False):
    if not path.exists():
        return
    text = path.read_text(encoding='utf-8')
    if moyasar:
        text = repl(text, '__MOYASAR_SECRET_KEY__', os.environ.get('MOYASAR_SECRET_KEY', ''))
        text = repl(text, '__RESEND_API_KEY__', os.environ.get('RESEND_API_KEY', ''))
        text = repl(text, '__WEBHOOK_SECRET__', os.environ.get('WEBHOOK_SECRET', ''))
    if moyasar or clerk:
        text = repl(text, '__FIREBASE_PROJECT_ID__', project_id)
        text = repl(text, '__FIREBASE_CLIENT_EMAIL__', client_email)
        text = repl(text, '__FIREBASE_PRIVATE_KEY_B64__', pk_b64)
    if clerk:
        text = repl(text, '__CLERK_SECRET_KEY__', clerk_secret)
    path.write_text(text, encoding='utf-8')


root = pathlib.Path('dist')
inject_file(root / 'moyasar-verify.php', moyasar=True)
inject_file(root / 'clerk-exchange.php', clerk=True)

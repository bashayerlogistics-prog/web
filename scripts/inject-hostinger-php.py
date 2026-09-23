#!/usr/bin/env python3
"""Inject Hostinger PHP secrets during GitHub Actions deploy. Never commit real keys."""
import base64
import json
import os
import pathlib
import shutil

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
        if not clerk_secret or not clerk_secret.startswith('sk_'):
            raise SystemExit(
                'ERROR: GitHub secret CLERK_SECRET_KEY is missing or invalid.\n'
                'Add Settings → Secrets → Actions → CLERK_SECRET_KEY = sk_live_… or sk_test_…\n'
                'Or upload public_html/clerk-config.php on Hostinger (see clerk-config.sample.php).'
            )
        text = repl(text, '__CLERK_SECRET_KEY__', clerk_secret)
    path.write_text(text, encoding='utf-8')


def write_mysql_config(api_dir: pathlib.Path):
    sample = api_dir / 'config.sample.php'
    if not sample.exists():
        print('skip mysql config — no config.sample.php')
        return
    text = sample.read_text(encoding='utf-8')
    mapping = {
        '__MYSQL_HOST__': os.environ.get('MYSQL_HOST', 'localhost'),
        '__MYSQL_DATABASE__': os.environ.get('MYSQL_DATABASE', ''),
        '__MYSQL_USER__': os.environ.get('MYSQL_USER', ''),
        '__MYSQL_PASSWORD__': os.environ.get('MYSQL_PASSWORD', ''),
        '__MYSQL_ADMIN_KEY__': os.environ.get('MYSQL_ADMIN_KEY', ''),
    }
    if not mapping['__MYSQL_DATABASE__'] or not mapping['__MYSQL_USER__']:
        print('WARN: MYSQL_DATABASE / MYSQL_USER secrets missing — config.php not written')
        return
    for needle, value in mapping.items():
        text = repl(text, needle, value)
    (api_dir / 'config.php').write_text(text, encoding='utf-8')
    print('Wrote dist/api/config.php')


root = pathlib.Path('dist')
inject_file(root / 'moyasar-verify.php', moyasar=True)
inject_file(root / 'clerk-exchange.php', clerk=True)

# MySQL CMS API package
api_src = pathlib.Path('hostinger/api')
api_dest = root / 'api'
if api_src.exists():
    api_dest.mkdir(parents=True, exist_ok=True)
    for item in api_src.iterdir():
        if item.name in ('config.php', 'bashayer-mysql-import.sql'):
            continue
        target = api_dest / item.name
        if item.is_dir():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(item, target)
        else:
            shutil.copy2(item, target)
    sql = pathlib.Path('hostinger/sql/bashayer-mysql-import.sql')
    if sql.exists():
        shutil.copy2(sql, api_dest / 'bashayer-mysql-import.sql')
        print('Copied SQL import into dist/api/')
    write_mysql_config(api_dest)

# Migrated CMS images
uploads_src = pathlib.Path('hostinger/uploads')
uploads_dest = root / 'uploads'
if uploads_src.exists():
    if uploads_dest.exists():
        shutil.rmtree(uploads_dest)
    shutil.copytree(uploads_src, uploads_dest)
    print('Copied hostinger/uploads → dist/uploads')

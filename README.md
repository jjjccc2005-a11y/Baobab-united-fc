# Baobab United FC

## Run the site with its own database

Requires Node.js 22.5 or newer (Node 24 recommended).

```powershell
npm start
```

Open http://localhost:3001.

The SQLite database is created automatically at `data/baobab.sqlite`.

Production configuration:

```text
NODE_ENV=production
PORT=3001
DATABASE_PATH=/data/baobab.sqlite
TLS_KEY_PATH=/etc/ssl/private/server.key
TLS_CERT_PATH=/etc/ssl/certs/server.crt
```

Set `TLS_KEY_PATH` and `TLS_CERT_PATH` when Node should terminate HTTPS itself. On Render or a reverse-proxy host, HTTPS can terminate at the host and `NODE_ENV=production` still enables secure cookies. Keep `data/`, `backups/`, and `logs/` private; the server blocks public access to them.

Admin security features include password hashing, HTTP-only secure production cookies, login throttling, session-bound CSRF tokens, password changes, and protected admin mutations.

Media uploads are limited to 10 MB image files and are saved under `uploads/`; uploaded media is available through the Media page.

API endpoints:

- `GET /api/health`
- `GET /api/team`
- `GET /api/fixtures`
- `GET /api/standings`
- `POST /api/fixtures`

The static preview at `http://localhost:4173` also reads Team data from the backend on port `3001`.

# Brain 2.0 Console

A responsive web console for your Telegram-to-Google-Sheets capture workflow.

Features:

1. Mobile + desktop-friendly read experience.
2. Search, filter, and sort across rows.
3. Inline row editing with optional two-way sync to Google Sheets.
4. Automatic refresh every 30 seconds.

## Local Development

```bash
npm ci
npm run dev
```

Open `http://localhost:5000`.

## Google Sheets Sync Modes

The app supports multiple auth modes, auto-detected in this order:

1. `GOOGLE_SERVICE_ACCOUNT_JSON` (read/write; recommended).
2. `GOOGLE_SHEETS_ACCESS_TOKEN` (read/write; short-lived OAuth token).
3. `GOOGLE_SHEETS_API_KEY` (read-only).
4. No credentials (public GViz read-only).

Optional defaults:

1. `BRAIN_SHEET_URL` or `BRAIN_SHEET_ID`
2. `BRAIN_SHEET_TAB`

For service-account mode, share your target sheet with the service account email.

## Deploy

### Static deployment (GitHub Pages)

Current workflow deploys only the client (`npm run build:client`). This is useful for read-only use cases that can access public sheet data.

### Full-stack deployment (recommended for editing)

To enable two-way sync, deploy the full Node server (`npm run build` + `npm start`) on a platform like Render, Railway, Fly, or any Node host, then set the env vars above.

#### Render one-click Blueprint

1. Open: `https://dashboard.render.com/blueprint/new?repo=https://github.com/ameyaagrawal99/salary-dashboard`
2. Keep the default service from `render.yaml`.
3. Set `GOOGLE_SERVICE_ACCOUNT_JSON` if you want editing/two-way sync.
4. After deploy, Render gives a URL like `https://ameya-brain2-console.onrender.com`.

If you skip Google write credentials, the app still works in read-only mode (public sheet access path).

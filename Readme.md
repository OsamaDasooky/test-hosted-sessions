# NI Hosted Sessions – Checkout Demo

A self-contained checkout page (plain HTML) backed by an Express server that
proxies payment calls to the NI payment gateway.

## Project structure

```
├── index.html       ← Checkout UI + client-side JS
├── setup.html       ← Region / env / credentials setup
├── iframe.html      ← iframe demo wrapper
├── server.js        ← Express server (proxies payment API)
├── package.json
├── .env.example     ← Copy to .env for local defaults (optional)
├── Procfile         ← Heroku / Railway style start
└── render.yaml      ← Render Blueprint (optional)
```

## Quick start (local)

### 1 – Install dependencies

```bash
npm install
```

### 2 – Configure credentials (optional)

Credentials can be entered in the **setup** page in the browser. For optional server defaults:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `MERCHANT_API_KEY` | Base64-encoded `apiKey:apiSecret` (optional if sent from setup) |
| `IDENTITY_API_URL` | Token endpoint |
| `TRANSACTIONS_SERVICE_URL` | Transactions base URL (trailing slash) |
| `PORT` | Listen port (default `3001`; cloud hosts inject this) |
| `HOST` | Bind address (default `0.0.0.0`) |
| `NODE_ENV` | Use `production` on hosted deployments |

### 3 – Start the server

```bash
npm start          # production-style
npm run dev        # auto-restart (nodemon)
```

Open **http://localhost:3001** (or your `PORT`).

## Deploy (GitHub → cloud)

This app needs a **Node** host (not GitHub Pages). Recommended: [Render](https://render.com).

### Render (recommended)

1. Push this repo to GitHub (do **not** commit `.env`).
2. In Render: **New → Blueprint** and select the repo (uses `render.yaml`),  
   or **New → Web Service** with:
   - **Build:** `npm install`
   - **Start:** `npm start`
   - **Health check path:** `/health`
3. Set env vars in the Render dashboard (at least `NODE_ENV=production`).  
   Merchant credentials can still be entered via the setup page.
4. Deploy → open the Render URL.

### Railway / Heroku-style

- Start command: `npm start` (or `Procfile` `web` process)
- Set `NODE_ENV=production`
- Platform provides `PORT` automatically

### Important security note

If `.env` was ever committed to GitHub, **rotate** your merchant API keys and treat the old ones as exposed. This repo now ignores `.env` and ships `.env.example` instead.

## How it works

```
Browser (index.html)
  │  clicks "Make Payment"
  │  → POST /api/hosted-sessions/payment   { sessionId, outletRef, order }
  ▼
server.js
  │  → POST identity URL                   (exchange key for Bearer token)
  │  → POST transactions URL/...           (forward payment with Bearer token)
  │  ← payment response JSON
  ▼
Browser
  → window.NI.handlePaymentResponse(...)   (handles 3DS if needed)
```

## Troubleshooting

- **"Missing env vars"** – use the setup page, or copy `.env.example` → `.env`.
- **SDK not loading** – check the SDK URL for your region/environment.
- **Deploy crash / wrong port** – ensure the host’s `PORT` is used (`process.env.PORT`).
- **Health check failing** – probe `GET /health` (returns `{ "ok": true }`).

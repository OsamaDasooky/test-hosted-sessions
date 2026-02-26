# NI Hosted Sessions – Checkout Demo

A self-contained checkout page (plain HTML) backed by an Express server that
proxies payment calls to the NI payment gateway.

## Project structure

```
payment-project/
├── index.html      ← Checkout UI + all client-side JS (no bundler needed)
├── server.js       ← Express server (proxies /api/hosted-sessions/payment)
├── package.json
├── .env.example    ← Copy to .env and fill in your credentials
└── README.md
```

## Quick start

### 1 – Install dependencies

```bash
npm install
```

### 2 – Configure credentials

```bash
cp .env.example .env
```

Open `.env` and set:

| Variable                   | Description                                                         |
|----------------------------|---------------------------------------------------------------------|
| `MERCHANT_API_KEY`                  | Base64-encoded `apiKey:apiSecret` from your NI onboarding email     |
| `IDENTITY_API_URL`         | Token endpoint, e.g. `https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token` |
| `TRANSACTIONS_SERVICE_URL` | Transactions base URL (trailing slash), e.g. `https://api-gateway.sandbox.ngenius-payments.com/transactions/outlets/` |
| `PORT`                     | Local port (default `3000`)                                         |

### 3 – Set your outlet ref & public API key in index.html

Open `index.html` and update the two constants near the top of the `<script>` block:

```js
const OUTLET_REF = 'your-outlet-ref';   // from NI onboarding
const MERCHANT_API_KEY    = 'your-public-key';   // public / session API key
```

### 4 – Point the SDK script tag to your SDK URL

In `index.html`, update this line:

```html
<script src="http://localhost:4000/hosted-sessions/sdk.js"></script>
```

Replace `localhost:4000` with the real NI SDK CDN URL provided during onboarding.

### 5 – Start the server

```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

Open **http://localhost:3000** in your browser.

## How it works

```
Browser (index.html)
  │  clicks "Make Payment"
  │  → POST /api/hosted-sessions/payment   { sessionId, outletRef, order }
  ▼
server.js
  │  → POST IDENTITY_API_URL               (exchange MERCHANT_API_KEY for Bearer token)
  │  → POST TRANSACTIONS_SERVICE_URL/...   (forward payment with Bearer token)
  │  ← payment response JSON
  ▼
Browser
  → window.NI.handlePaymentResponse(...)   (handles 3DS if needed)
```

## Troubleshooting

- **"Missing env vars"** – make sure you renamed `.env.example` to `.env`.
- **SDK not loading** – check the `<script src="...sdk.js">` URL is correct.
- **CORS errors** – the SDK's `mountCardInput` call goes directly to NI servers; your Express server is only used for the final payment step.

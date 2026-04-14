/**
 * server.js – Express backend for the hosted-sessions checkout page.
 *
 * Mirrors app.js but without the webpack dev-middleware (not needed for
 * the plain-HTML setup). Run with:  node server.js
 */

const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express    = require('express');
const axios      = require('axios');
const bodyParser = require('body-parser');

const app = express();

const IDENTITY_API_URL = 'https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token'
const TRANSACTIONS_SERVICE_URL = 'https://api-gateway-uat.ngenius-payments.com/transactions/'
const PORT = 3000
// ── Middleware ────────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve index.html (and any other static files in this folder)
app.use(express.static(__dirname));




// ── Env → URL mapping (used when request includes env from setup page) ────────
const ENV_URLS = {
  sandbox: {
    identityUrl: 'https://api-gateway.sandbox.ngenius-payments.com/identity/auth/access-token',
    transactionsUrl: 'https://api-gateway.sandbox.ngenius-payments.com/transactions/',
    sdkUrl: 'https://paypage.sandbox.ngenius-payments.com'
  },
  dev: {
    identityUrl: 'https://api-gateway-dev.ngenius-payments.com/identity/auth/access-token',
    transactionsUrl: 'https://api-gateway-dev.ngenius-payments.com/transactions/',
    sdkUrl: 'https://paypage-dev.ngenius-payments.com'
  }
};

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAuthToken(realmName, identityUrl, merchantApiKey) {
  const url = identityUrl;
  const key = merchantApiKey;
  if (!url || !key) return null;
  try {
    const { data: { access_token } } = await axios({
      method : 'post',
      url,
      headers: {
        'Content-Type' : 'application/vnd.ni-identity.v1+json',
        Authorization  : `Basic ${key}`
      },
      data: { grant_type: 'client_credentials', "realmName": realmName }
    });
    
    return access_token;
  } catch (err) {
    console.error('Auth token error:', err.message);
    return null;
  }
}

// ── Env config endpoint (no secrets) ─────────────────────────────────────────
app.get('/api/env-config', (req, res) => {
  res.json(ENV_URLS);
});

// ── Payment endpoint ──────────────────────────────────────────────────────────
/**
 * POST /api/hosted-sessions/payment
 * Body: { sessionId, outletRef, order [, merchantApiKey, env ] }
 * `order` is forwarded as the JSON body to N-Genius hosted-session payment, including
 * `order.payment.vis` (Visa Installment Services) when the client sends it.
 * When merchantApiKey and env are present, use ENV_URLS[env] and skip .env.
 */
app.post('/api/hosted-sessions/payment', async (req, res) => {
  const { sessionId, order, outletRef, merchantApiKey, env } = req.body;
  const { realmName } = req.query;

  if (!sessionId || !outletRef || !order) {
    return res.status(400).json({ error: 'sessionId, outletRef and order are required.' });
  }

  let identityUrl = IDENTITY_API_URL;
  let transactionsUrl = TRANSACTIONS_SERVICE_URL;
  let authMerchantKey = merchantApiKey;

  if (merchantApiKey && env && ENV_URLS[env]) {
    identityUrl = ENV_URLS[env].identityUrl;
    transactionsUrl = ENV_URLS[env].transactionsUrl;

  } else if (!authMerchantKey || !identityUrl) {
    return res.status(400).json({ error: 'Provide merchantApiKey and env (from setup), or set .env.' });
  }

  const accessToken = await getAuthToken(realmName, identityUrl, authMerchantKey);
  if (!accessToken) {
    return res.status(500).json({ error: 'Authentication failed – could not obtain access token.' });
  }

  try {
    const { data } = await axios.post(
      `${transactionsUrl}outlets/${outletRef}/payment/hosted-session/${sessionId}`,
      order,
      {
        headers: {
          Authorization  : `Bearer ${accessToken}`,
          'Content-Type' : 'application/vnd.ni-payment.v2+json',
          Accept         : 'application/vnd.ni-payment.v2+json',
          'User-Agent'   : 'express-server'
        }
      }
    );
    return res.status(200).json(data);
  } catch (err) {
    const status  = err.response ? err.response.status  : 500;
    const payload = err.response ? err.response.data    : { error: err.message };
    console.error('Payment API error:', payload);
    return res.status(status).json(payload);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`✅  Server running → http://localhost:${PORT}`)
);
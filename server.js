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

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve index.html (and any other static files in this folder)
app.use(express.static(__dirname));

// ── Config from .env ──────────────────────────────────────────────────────────
const {
  MERCHANT_API_KEY,
  IDENTITY_API_URL,
  TRANSACTIONS_SERVICE_URL,
  PORT = 3000
} = process.env;

if (!MERCHANT_API_KEY || !IDENTITY_API_URL) {
  console.error('❌  Missing env vars. Copy .env.example → .env and fill in the values.');
  process.exit(1);
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getAuthToken(realmName) {
  try {
    const { data: { access_token } } = await axios({
      method : 'post',
      url: IDENTITY_API_URL,
      headers: {
        'Content-Type' : 'application/vnd.ni-identity.v1+json',
        Authorization  : `Basic ${MERCHANT_API_KEY}`
      },
      data: { grant_type: 'client_credentials', "realmName": realmName }
    });
    
    return access_token;
  } catch (err) {
    console.error('Auth token error:', err.message);
    return null;
  }
}

// ── Payment endpoint ──────────────────────────────────────────────────────────
/**
 * POST /api/hosted-sessions/payment
 * Body: { sessionId, outletRef, order }
 */
app.post('/api/hosted-sessions/payment', async (req, res) => {
  const { sessionId, order, outletRef } = req.body;
  const { realmName } = req.query;           // ← received from the HTML page

  if (!sessionId || !outletRef || !order) {
    return res.status(400).json({ error: 'sessionId, outletRef and order are required.' });
  }

  const accessToken = await getAuthToken(realmName);
  if (!accessToken) {
    return res.status(500).json({ error: 'Authentication failed – could not obtain access token.' });
  }

  try {
    const { data } = await axios.post(
      `${TRANSACTIONS_SERVICE_URL}outlets/${outletRef}/payment/hosted-session/${sessionId}`,
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
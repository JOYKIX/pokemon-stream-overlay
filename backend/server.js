import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';

dotenv.config();

const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI,
  SESSION_SECRET = 'change-me',
  FRONTEND_SUCCESS_REDIRECT = '/',
  FRONTEND_ERROR_REDIRECT = '/'
} = process.env;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET || !TWITCH_REDIRECT_URI) {
  throw new Error('Missing TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, or TWITCH_REDIRECT_URI');
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

function redirectWithStatus(res, target, params = {}) {
  const url = new URL(target, 'http://localhost');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const location = target.startsWith('http')
    ? new URL(url.pathname + url.search, target).toString()
    : `${url.pathname}${url.search}`;

  return res.redirect(location);
}

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/auth/twitch', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: TWITCH_CLIENT_ID,
    redirect_uri: TWITCH_REDIRECT_URI,
    response_type: 'code',
    scope: 'user:read:email',
    state,
    force_verify: 'false'
  });

  res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/twitch/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    req.session.oauthState = null;
    return redirectWithStatus(res, FRONTEND_ERROR_REDIRECT, {
      auth: 'error',
      reason: error,
      message: errorDescription
    });
  }

  if (!code || !state || state !== req.session.oauthState) {
    req.session.oauthState = null;
    return redirectWithStatus(res, FRONTEND_ERROR_REDIRECT, {
      auth: 'error',
      reason: 'state_mismatch'
    });
  }

  req.session.oauthState = null;

  try {
    const tokenParams = new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      code: String(code),
      grant_type: 'authorization_code',
      redirect_uri: TWITCH_REDIRECT_URI
    });

    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token exchange failed:', tokenError);
      return redirectWithStatus(res, FRONTEND_ERROR_REDIRECT, {
        auth: 'error',
        reason: 'token_exchange_failed'
      });
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': TWITCH_CLIENT_ID
      }
    });

    if (!userResponse.ok) {
      const userError = await userResponse.text();
      console.error('Failed to fetch Twitch user:', userError);
      return redirectWithStatus(res, FRONTEND_ERROR_REDIRECT, {
        auth: 'error',
        reason: 'user_fetch_failed'
      });
    }

    const userData = await userResponse.json();
    const twitchUser = userData.data?.[0];

    if (!twitchUser) {
      return redirectWithStatus(res, FRONTEND_ERROR_REDIRECT, {
        auth: 'error',
        reason: 'user_not_found'
      });
    }

    req.session.user = {
      id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      email: twitchUser.email,
      profile_image_url: twitchUser.profile_image_url,
      connected_at: new Date().toISOString(),
      scopes: Array.isArray(tokenData.scope) ? tokenData.scope : [],
      token_expires_in: tokenData.expires_in
    };

    return redirectWithStatus(res, FRONTEND_SUCCESS_REDIRECT, { auth: 'success' });
  } catch (oauthError) {
    console.error('OAuth callback error:', oauthError);
    return redirectWithStatus(res, FRONTEND_ERROR_REDIRECT, {
      auth: 'error',
      reason: 'callback_exception'
    });
  }
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false, user: null });
  }

  return res.json({ authenticated: true, user: req.session.user });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

app.use(express.static(path.resolve(__dirname, '../dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

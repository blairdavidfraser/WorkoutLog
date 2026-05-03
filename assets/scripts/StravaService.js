const AUTH_URL = 'https://www.strava.com/oauth/authorize';
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_BASE = 'https://www.strava.com/api/v3';
const TOKENS_KEY = 'strava_tokens';
const CLIENT_ID_KEY = 'strava_client_id';
const CLIENT_SECRET_KEY = 'strava_client_secret';

export class StravaService {
  _creds() {
    return {
      clientId: localStorage.getItem(CLIENT_ID_KEY) || '',
      clientSecret: localStorage.getItem(CLIENT_SECRET_KEY) || '',
    };
  }

  isConfigured() {
    const { clientId, clientSecret } = this._creds();
    return !!(clientId && clientSecret);
  }

  saveCredentials(clientId, clientSecret) {
    localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
    localStorage.setItem(CLIENT_SECRET_KEY, clientSecret.trim());
  }

  clearCredentials() {
    localStorage.removeItem(CLIENT_ID_KEY);
    localStorage.removeItem(CLIENT_SECRET_KEY);
    this.disconnect();
  }

  isConnected() {
    return !!this._loadTokens();
  }

  _loadTokens() {
    try {
      const s = localStorage.getItem(TOKENS_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  _saveTokens(t) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
  }

  disconnect() {
    localStorage.removeItem(TOKENS_KEY);
  }

  async _validToken() {
    const t = this._loadTokens();
    if (!t) throw new Error('Not connected to Strava');
    if (Date.now() / 1000 < t.expires_at - 300) return t.access_token;
    const { clientId, clientSecret } = this._creds();
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: t.refresh_token,
      }),
    });
    if (!res.ok) {
      this.disconnect();
      throw new Error('Strava token refresh failed — please reconnect');
    }
    const tokens = await res.json();
    this._saveTokens(tokens);
    return tokens.access_token;
  }

  authorize() {
    const { clientId } = this._creds();
    const redirect = window.location.origin + window.location.pathname;
    const url = new URL(AUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirect);
    url.searchParams.set('approval_prompt', 'auto');
    url.searchParams.set('scope', 'activity:read_all');
    window.location.href = url.toString();
  }

  async handleOAuthCallback(code) {
    const { clientId, clientSecret } = this._creds();
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error('Strava auth failed');
    const tokens = await res.json();
    this._saveTokens(tokens);
    const url = new URL(window.location.href);
    ['code', 'scope', 'state'].forEach(p => url.searchParams.delete(p));
    window.history.replaceState({}, '', url.toString());
  }

  async getRecentActivities(count = 5) {
    const token = await this._validToken();
    const res = await fetch(`${API_BASE}/athlete/activities?per_page=${count}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Strava activities');
    return res.json();
  }

  async getActivityDetail(id) {
    const token = await this._validToken();
    const [detail, laps] = await Promise.all([
      fetch(`${API_BASE}/activities/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${API_BASE}/activities/${id}/laps`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ]);
    return { detail, laps };
  }
}

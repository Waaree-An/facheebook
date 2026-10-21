async function (cfg) {
  var host = (cfg && cfg.host) || '';
  if (!host) return { ok: false, reason: 'no host provided' };
  var key = 'sb-' + host.split('.')[0] + '-auth-token';
  var now = Math.floor(Date.now() / 1000);
  var session = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'test-refresh-token',
    user: {
      id: '11111111-2222-3333-4444-555555555555',
      aud: 'authenticated',
      role: 'authenticated',
      email: (cfg && cfg.email) || 'smoke.tester@gmail.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { first_name: 'Smoke Tester' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
  localStorage.setItem(key, JSON.stringify(session));
  return { ok: true, mode: 'injected', key: key, text: '' };
}

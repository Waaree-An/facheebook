import test from 'node:test';
import assert from 'node:assert/strict';

import { createLocalDemoSession, isLocalDemoSession } from '../src/lib/localDemoAuth';

test('createLocalDemoSession returns a usable local dashboard session', () => {
  const session = createLocalDemoSession('Demo User');

  assert.ok(session);
  assert.equal(typeof session.user.id, 'string');
  assert.ok(session.user.id.length > 0);
  assert.equal(session.user.email, 'demo@facheebook.local');
  assert.equal(session.user.user_metadata?.first_name, 'Demo User');
  assert.equal(isLocalDemoSession(session), true);
});

test('isLocalDemoSession rejects a regular Supabase session', () => {
  const session = {
    access_token: 'abc',
    refresh_token: 'def',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'real-user',
      email: 'student@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z',
    },
  } as any;

  assert.equal(isLocalDemoSession(session), false);
});

'use strict';

// Extension-owned OAuth adapter. No inline script, credentials or tokens are logged.
function completeOAuthRedirect() {
  const showFailure = message => {
    const status = document.getElementById('oauth-status');
    if (status) status.textContent = message;
  };
  let pending;
  try {
    pending = window.opener?.swaggerUIRedirectOauth2;
  } catch (_) {
    // The opener may have closed or navigated to another origin.
  }
  if (!pending?.auth || typeof pending.callback !== 'function') {
    showFailure('No active authorization request. Close this page and authorize again in Swagger UI.');
    return;
  }
  const fail = message => {
    showFailure(message);
    try {
      pending.errCb?.({ authId: pending.auth.name, source: 'auth', level: 'error', message });
    } catch (_) { /* The opener may no longer be available. */ }
  };
  try {
    const hash = new URLSearchParams(window.location.hash.slice(1).replace('?', '&'));
    const params = ['code', 'access_token', 'error'].some(key => hash.has(key))
      ? hash : new URLSearchParams(window.location.search);
    if (['state', 'code', 'access_token', 'error'].some(key => params.getAll(key).length > 1)) {
      fail('Authorization failed: ambiguous response parameters. Please authorize again.');
      return;
    }
    if (typeof pending.state !== 'string' || !pending.state || params.get('state') !== pending.state) {
      fail('Authorization failed: state validation failed. Please authorize again.');
      return;
    }
    if (params.has('error')) {
      fail('Authorization was denied or failed. Please authorize again.');
      return;
    }
    const flow = pending.auth.schema.get('flow');
    const codeFlow = ['accessCode', 'authorizationCode', 'authorization_code'].includes(flow);
    if (codeFlow ? !params.get('code') || pending.auth.code : !params.get('access_token')) {
      fail('Authorization failed: missing or already-used authorization credentials.');
      return;
    }
    // Consume state only after validation, before any callback can be replayed.
    delete pending.state;
    if (codeFlow) {
      pending.auth.code = params.get('code');
      pending.callback({ auth: pending.auth, redirectUrl: pending.redirectUrl });
    } else {
      pending.callback({ auth: pending.auth, token: Object.fromEntries(params), isValid: true,
        redirectUrl: pending.redirectUrl });
    }
    window.close();
  } catch (_) {
    fail('Unable to complete authorization. Close this page and authorize again in Swagger UI.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', completeOAuthRedirect, { once: true });
} else {
  completeOAuthRedirect();
}

import { getRuntimeConfig, getStorageKey } from '@/runtime/config';
import { createPkceChallenge, generateRandomString } from '@/lib/pkce';

function getAuthentikConfig() {
  const runtimeConfig = getRuntimeConfig();

  return {
    enabled: Boolean(runtimeConfig.authentikEnabled),
    clientId: runtimeConfig.authentikClientId,
    authorizationUrl: runtimeConfig.authentikAuthorizationUrl,
    tokenUrl: runtimeConfig.authentikTokenUrl,
    redirectUri: runtimeConfig.authentikRedirectUri,
    scope: runtimeConfig.authentikScope || 'openid profile email',
  };
}

function assertAuthentikConfigured(config) {
  if (!config.enabled) {
    throw new Error('Authentik sign-in is not enabled.');
  }

  if (!config.clientId || !config.authorizationUrl || !config.tokenUrl || !config.redirectUri) {
    throw new Error('Authentik configuration is incomplete.');
  }
}

export function isAuthentikEnabled() {
  return getAuthentikConfig().enabled;
}

export async function beginAuthentikLogin(redirectPath = '/documents') {
  const config = getAuthentikConfig();
  assertAuthentikConfigured(config);

  const verifier = generateRandomString(96);
  const challenge = await createPkceChallenge(verifier);
  const state = generateRandomString(48);

  localStorage.setItem(getStorageKey('authentik:pkce_verifier'), verifier);
  localStorage.setItem(getStorageKey('authentik:oauth_state'), state);
  localStorage.setItem(getStorageKey('authentik:post_login_redirect'), redirectPath);

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scope,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  window.location.assign(`${config.authorizationUrl}?${params.toString()}`);
}

export async function exchangeAuthentikCode(code, returnedState) {
  const config = getAuthentikConfig();
  assertAuthentikConfigured(config);

  const storedState = localStorage.getItem(getStorageKey('authentik:oauth_state'));
  const verifier = localStorage.getItem(getStorageKey('authentik:pkce_verifier'));

  if (!storedState || storedState !== returnedState) {
    throw new Error('Invalid Authentik OAuth state.');
  }

  if (!verifier) {
    throw new Error('Missing PKCE verifier for Authentik login.');
  }

  const formData = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Failed to exchange Authentik authorization code.');
  }

  localStorage.removeItem(getStorageKey('authentik:oauth_state'));
  localStorage.removeItem(getStorageKey('authentik:pkce_verifier'));

  return payload;
}

export function consumePostLoginRedirect() {
  const key = getStorageKey('authentik:post_login_redirect');
  const redirect = localStorage.getItem(key) || '/documents';
  localStorage.removeItem(key);
  return redirect;
}

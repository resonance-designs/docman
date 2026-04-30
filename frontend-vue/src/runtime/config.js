const defaults = {
  embedded: false,
  apiBaseUrl: import.meta.env.VITE_API_URL || null,
  initialRoute: '/',
  routerBase: import.meta.env.BASE_URL || '/',
  hostApp: 'RDocMan',
  storageNamespace: 'docman',
  authentikEnabled: import.meta.env.VITE_AUTHENTIK_ENABLED === 'true',
  authentikClientId: import.meta.env.VITE_AUTHENTIK_CLIENT_ID || '',
  authentikAuthorizationUrl: import.meta.env.VITE_AUTHENTIK_AUTHORIZATION_URL || '',
  authentikRegistrationUrl: import.meta.env.VITE_AUTHENTIK_REGISTRATION_URL || '',
  authentikTokenUrl: import.meta.env.VITE_AUTHENTIK_TOKEN_URL || '',
  authentikRedirectUri: import.meta.env.VITE_AUTHENTIK_REDIRECT_URI || '',
  authentikScope: import.meta.env.VITE_AUTHENTIK_SCOPE || 'openid profile email',
};

function readWindowConfig() {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.__RDocManConfig__ || {};
}

let runtimeConfig = {
  ...defaults,
  ...readWindowConfig(),
};

export function getRuntimeConfig() {
  return runtimeConfig;
}

export function configureRuntime(overrides = {}) {
  runtimeConfig = {
    ...runtimeConfig,
    ...overrides,
  };

  return runtimeConfig;
}

export function resetRuntimeConfig() {
  runtimeConfig = {
    ...defaults,
    ...readWindowConfig(),
  };

  return runtimeConfig;
}

export function getStorageKey(name) {
  return `${runtimeConfig.storageNamespace}:${name}`;
}

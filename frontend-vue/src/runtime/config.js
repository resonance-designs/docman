const defaults = {
  embedded: false,
  apiBaseUrl: import.meta.env.VITE_API_URL || null,
  initialRoute: '/',
  routerBase: import.meta.env.BASE_URL || '/',
  hostApp: 'RDocMan',
  storageNamespace: 'docman',
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

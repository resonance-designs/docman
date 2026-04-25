import { mountDocMan } from './bootstrap';

const mountedInstances = new WeakMap();

function resolveTarget(target) {
  if (typeof target === 'string') {
    const element = document.querySelector(target);
    if (!element) {
      throw new Error(`Unable to find RDocMan remote target: ${target}`);
    }

    return element;
  }

  if (!target) {
    throw new Error('An RDocMan remote target is required.');
  }

  return target;
}

export async function mountRDocMan(target, options = {}) {
  const element = resolveTarget(target);
  const existingInstance = mountedInstances.get(element);

  if (existingInstance?.unmount) {
    existingInstance.unmount();
  }

  const instance = await mountDocMan(element, {
    embedded: true,
    initialRoute: '/documents',
    hostApp: 'RDSysCMD',
    storageNamespace: 'rdsyscmd-rdocman',
    ...options,
  });

  mountedInstances.set(element, instance);
  return instance;
}

export function unmountRDocMan(target) {
  const element = resolveTarget(target);
  const instance = mountedInstances.get(element);

  if (instance?.unmount) {
    instance.unmount();
    mountedInstances.delete(element);
  }
}

if (typeof window !== 'undefined') {
  window.__RDocManRemote__ = {
    mountRDocMan,
    unmountRDocMan,
  };
}

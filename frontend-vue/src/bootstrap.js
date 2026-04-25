import { createApp } from 'vue';
import App from './App.vue';
import { createDocManRouter } from './router';
import vuetify from './plugins/vuetify';
import './styles/main.css';
import { configureRuntime, resetRuntimeConfig } from './runtime/config';

function resolveMountTarget(target) {
  if (typeof target === 'string') {
    const element = document.querySelector(target);
    if (!element) {
      throw new Error(`Unable to find RDocMan mount target: ${target}`);
    }

    return element;
  }

  if (!target) {
    throw new Error('An RDocMan mount target is required.');
  }

  return target;
}

export async function mountDocMan(target, runtimeOverrides = {}) {
  const config = configureRuntime(runtimeOverrides);
  const element = resolveMountTarget(target);
  const router = createDocManRouter(config);
  const app = createApp(App);

  app.use(router);
  app.use(vuetify);

  if (config.embedded && config.initialRoute) {
    await router.push(config.initialRoute);
  }

  app.mount(element);
  await router.isReady();

  return {
    app,
    router,
    config,
    unmount() {
      app.unmount();
      element.replaceChildren();
      resetRuntimeConfig();
    },
  };
}

export function mountStandaloneRDocMan() {
  return mountDocMan('#app');
}

import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const resonanceTheme = {
  dark: false,
  colors: {
    background: '#f7f8fa',
    surface: '#ffffff',
    primary: '#df6d20',
    secondary: '#2092df',
    accent: '#20dfcd',
    error: '#df2033',
    info: '#2092df',
    success: '#1b9f58',
    warning: '#b78d0d',
  },
};

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'resonanceTheme',
    themes: {
      resonanceTheme,
    },
  },
  defaults: {
    VBtn: {
      rounded: 'sm',
    },
    VCard: {
      rounded: 'sm',
      elevation: 1,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
});

import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'DocMan',
  tagline: 'Document management, release, and deployment documentation',
  favicon: 'img/favicon.ico',
  url: 'https://resonance-designs.github.io',
  baseUrl: '/docman/',
  organizationName: 'resonance-designs',
  projectName: 'docman',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'DocMan',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/resonance-designs/docman',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Project',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/resonance-designs/docman',
            },
            {
              label: 'Release Workflow',
              to: '/docs/maintainers/release-workflow',
            },
          ],
        },
        {
          title: 'Deployments',
          items: [
            {
              label: 'Render',
              to: '/docs/deployment/render',
            },
            {
              label: 'Linode',
              to: '/docs/deployment/linode',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Resonance Designs.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

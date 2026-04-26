import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Maintainers',
      items: [
        'maintainers/release-workflow',
        'maintainers/versioning',
        'maintainers/github-actions',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/render',
        'deployment/linode',
        'deployment/cloudflare',
        'deployment/data-safety',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/frontend-selection',
      ],
    },
  ],
};

export default sidebars;

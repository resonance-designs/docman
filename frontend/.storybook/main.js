/*
 * @name Storybook Main Configuration
 * @file /docman/frontend/.storybook/main.js
 * @description Main configuration file for Storybook component documentation
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */

/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: [
    "../src/**/*.stories.@(js|jsx|ts|tsx|mdx)",
    "../src/**/*.story.@(js|jsx|ts|tsx)",
    "../stories/**/*.stories.@(js|jsx|ts|tsx|mdx)"
  ],
  
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-docs",
    "@storybook/addon-controls",
    "@storybook/addon-viewport",
    "@storybook/addon-backgrounds",
    "@storybook/addon-measure",
    "@storybook/addon-outline"
  ],
  
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  
  docs: {
    autodocs: "tag",
    defaultName: "Documentation"
  },
  
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  
  viteFinal: async (config) => {
    // Customize Vite config for Storybook
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '/src'
    };
    
    return config;
  },
  
  features: {
    buildStoriesJson: true
  },
  
  staticDirs: ['../public']
};

export default config;

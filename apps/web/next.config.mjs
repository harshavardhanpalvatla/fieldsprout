import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => {
    return 'fieldsprout-build';
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'styled-jsx': path.resolve(__dirname, 'node_modules/styled-jsx'),
      'styled-jsx/style': path.resolve(__dirname, 'node_modules/styled-jsx/style.js'),
    };
    return config;
  },
};

export default nextConfig;

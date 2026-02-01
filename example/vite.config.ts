import { defineConfig } from 'vite';
import textTypes from 'vite-plugin-text-types';

export default defineConfig({
  plugins: [
    textTypes({
      include: 'src/**/*.{md,txt}',
      keyTransform: {
        stripPrefix: '/src/content/',
      },
    }),
  ],
});

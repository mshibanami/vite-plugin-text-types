import { defineConfig } from 'vite';
import textTypesTsdownPlugin from 'vite-plugin-text-types';

export default defineConfig({
  plugins: [
    textTypesTsdownPlugin({
      include: 'src/**/*.{md,txt}',
      keyTransform: {
        stripPrefix: '/src/content/',
      },
    }),
  ],
});

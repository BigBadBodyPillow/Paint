import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  },
  kit: {
    adapter: adapter(),
    paths: {
      base: '/Paint'
    },
    prerender: {
      entries: ['*']
    }
  }
};

export default config;

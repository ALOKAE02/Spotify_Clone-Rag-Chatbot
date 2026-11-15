import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chatApiPlugin } from './server/chatPlugin.ts';

export default defineConfig(({ mode }) => {
  // '' prefix loads every variable from .env / .env.local, not just VITE_* ones.
  // These stay on the server: nothing here is exposed to the browser bundle.
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') } as Record<string, string>;

  return {
    plugins: [react(), tailwindcss(), chatApiPlugin(env)],
    server: {
      port: 5173,
    },
  };
});

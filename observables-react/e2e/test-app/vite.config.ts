import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: __dirname,
    resolve: {
        alias: {
            '@vscode/observables': path.resolve(__dirname, '../../node_modules/@vscode/observables'),
        },
    },
    server: {
        port: 3099,
    },
});

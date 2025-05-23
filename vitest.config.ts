import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node', // Use 'jsdom' if testing browser-based code
        coverage: {
            reporters: ['text', 'json', 'html'], // Generates coverage reports
        },
    },
});

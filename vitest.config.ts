import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        coverage: {
            reporters: ['text', 'json', 'html'], // Generates coverage reports
        },
    },
});

import { defineConfig } from 'vitest/config'

import base from './vitest.config.mts'

// HTTP e2e suites share local SQLite files; run them one at a time.
export default defineConfig({
    ...base,
    test: {
        ...base.test,
        include: ['test/**/*.e2e-spec.ts'],
        fileParallelism: false,
    },
})

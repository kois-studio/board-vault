import { defineConfig } from 'astro/config'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel/serverless'
import svelte from '@astrojs/svelte'
import db from '@astrojs/db'
import { supported_locales } from './src/i18n/translations'

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), db(), svelte()],
    output: 'server',
    adapter: vercel(),
    i18n: {
        defaultLocale: supported_locales[0],
        locales: supported_locales,
        routing: {
            prefixDefaultLocale: true,
        }
    },
})

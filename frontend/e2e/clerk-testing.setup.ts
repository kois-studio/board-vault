import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

setup('initialize the Clerk Development Testing Token', async () => {
    await clerkSetup({ debug: process.env['CLERK_TESTING_DEBUG'] === '1' })
})

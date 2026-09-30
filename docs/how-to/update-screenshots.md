# Update Playwright screenshots

`frontend/e2e/visual-regression.spec.ts` compares the landing page with
committed Linux screenshots. Fonts render differently on macOS and Windows, so
the test only runs on Linux (CI) and skips elsewhere.

When you change the landing page on purpose:

1. Push your branch.
2. On GitHub, open **Actions → Update visual baselines → Run workflow** and
   choose your branch.
3. Download the `visual-baselines` artifact when the run finishes.
4. Look at every image. They must show exactly the change you intended.
5. Copy the PNGs into `frontend/e2e/visual-regression.spec.ts-snapshots/`,
   commit, and push. The CI frontend job should pass.

Don't raise the pixel threshold to make a failure go away.

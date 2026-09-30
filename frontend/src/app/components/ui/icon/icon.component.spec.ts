import { IconComponent } from './icon.component'

describe('IconComponent', () => {
    // The first import of the Lucide barrel is slow on a cold, busy runner.
    beforeAll(() => import('@lucide/angular'), 30_000)

    it('resolves the mobile menu icon through the shared Lucide adapter', async () => {
        const component = new IconComponent()

        component.name = 'menu'
        component.ngOnChanges()

        await vi.waitFor(() => expect(component.iconComponent()?.name).toContain('LucideMenu'))
    })

    it('uses the help icon for an unknown name instead of rendering an empty icon', async () => {
        const component = new IconComponent()

        component.name = 'not-a-real-icon'
        component.ngOnChanges()

        await vi.waitFor(() => expect(component.iconComponent()?.name).toContain('LucideCircleQuestionMark'))
    })
})

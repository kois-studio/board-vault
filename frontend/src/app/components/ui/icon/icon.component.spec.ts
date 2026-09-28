import { IconComponent } from './icon.component'

describe('IconComponent', () => {
    it('resolves the mobile menu icon through the shared Lucide adapter', async () => {
        const component = new IconComponent()

        component.name = 'menu'
        component.ngOnChanges()
        await new Promise((resolve) => setTimeout(resolve, 100))

        expect(component.iconComponent()?.name).toContain('LucideMenu')
    })

    it('uses the help icon for an unknown name instead of rendering an empty icon', async () => {
        const component = new IconComponent()

        component.name = 'not-a-real-icon'
        component.ngOnChanges()
        await new Promise((resolve) => setTimeout(resolve, 100))

        expect(component.iconComponent()?.name).toContain('LucideCircleQuestionMark')
    })
})

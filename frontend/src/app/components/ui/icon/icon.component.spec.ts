import { TestBed } from '@angular/core/testing'
import { IconComponent } from './icon.component'

describe('IconComponent', () => {
    const render = (name: string) => {
        const fixture = TestBed.createComponent(IconComponent)
        fixture.componentRef.setInput('name', name)
        fixture.detectChanges()
        return fixture
    }

    it('resolves the mobile menu icon through the shared Lucide adapter', async () => {
        const fixture = render('menu')

        await vi.waitFor(() => expect(fixture.componentInstance.iconComponent()?.name).toContain('LucideMenu'))
    })

    it('uses the help icon for an unknown name instead of rendering an empty icon', async () => {
        const fixture = render('not-a-real-icon')

        await vi.waitFor(() => expect(fixture.componentInstance.iconComponent()?.name).toContain('LucideCircleQuestionMark'))
    })

    it('switches icon when the name changes', async () => {
        const fixture = render('menu')
        await vi.waitFor(() => expect(fixture.componentInstance.iconComponent()?.name).toContain('LucideMenu'))

        fixture.componentRef.setInput('name', 'x')
        fixture.detectChanges()

        await vi.waitFor(() => expect(fixture.componentInstance.iconComponent()?.name).toContain('LucideX'))
    })

    it('gives its size in rem, so it grows with the chosen text size', () => {
        const fixture = render('menu')
        const host: HTMLElement = fixture.nativeElement

        expect(host.style.getPropertyValue('--icon-size')).toBe('1.25rem')

        fixture.componentRef.setInput('size', 18)
        fixture.detectChanges()

        expect(host.style.getPropertyValue('--icon-size')).toBe('1.125rem')
    })
})

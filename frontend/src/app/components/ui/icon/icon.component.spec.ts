import { TestBed } from '@angular/core/testing'
import { IconComponent } from './icon.component'

describe('IconComponent', () => {
    const render = (name: string) => {
        const fixture = TestBed.createComponent(IconComponent)
        fixture.componentRef.setInput('name', name)
        fixture.detectChanges()
        return fixture
    }

    const svg = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.querySelector('svg') as SVGSVGElement

    it('draws an icon from its data, with the attributes Lucide gave it', () => {
        const icon = svg(render('menu'))

        expect(icon.getAttribute('class')).toBe('lucide lucide-menu fill-none')
        expect(icon.getAttribute('viewBox')).toBe('0 0 24 24')
        expect(icon.getAttribute('stroke')).toBe('currentColor')
        expect(icon.getAttribute('stroke-width')).toBe('2')
        expect(icon.getAttribute('stroke-linecap')).toBe('round')
        expect(icon.getAttribute('width')).toBe('20')
        expect([...icon.querySelectorAll('path')].map((path) => path.getAttribute('d'))).toEqual(['M4 5h16', 'M4 12h16', 'M4 19h16'])
    })

    it('draws circles, rects and lines too', () => {
        const icon = svg(render('calendar'))

        expect(icon.querySelector('rect')?.getAttribute('rx')).toBe('2')
        expect(icon.querySelectorAll('path').length).toBeGreaterThan(0)
        expect(svg(render('info')).querySelector('circle')?.getAttribute('r')).toBe('10')
    })

    it('uses the help icon for an unknown name instead of rendering an empty icon', () => {
        expect(svg(render('not-a-real-icon')).getAttribute('class')).toContain('lucide-circle-help')
    })

    it('follows legacy names and switches icon when the name changes', () => {
        const fixture = render('gear-fill')
        expect(svg(fixture).getAttribute('class')).toContain('lucide-settings')

        fixture.componentRef.setInput('name', 'x')
        fixture.detectChanges()

        expect(svg(fixture).getAttribute('class')).toContain('lucide-x')
    })

    it('hides from screen readers unless it has a label, and then names itself', () => {
        const fixture = render('bell')
        expect(svg(fixture).getAttribute('aria-hidden')).toBe('true')

        fixture.componentRef.setInput('label', 'Notifications')
        fixture.componentRef.setInput('fill', 'currentColor')
        fixture.componentRef.setInput('className', 'h-4 w-4')
        fixture.detectChanges()

        expect(svg(fixture).getAttribute('aria-hidden')).toBeNull()
        expect(svg(fixture).getAttribute('role')).toBe('img')
        expect(svg(fixture).querySelector('title')?.textContent).toBe('Notifications')
        expect(svg(fixture).getAttribute('class')).toBe('lucide lucide-bell h-4 w-4 fill-current')
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

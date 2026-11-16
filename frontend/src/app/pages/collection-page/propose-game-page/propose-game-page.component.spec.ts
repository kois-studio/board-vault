import { Component, input, output } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter, RouterLink } from '@angular/router'
import { of } from 'rxjs'
import type { ProposalAddTo } from '../../../components/forms/form-game-submission/form-game-submission.component'
import { BackLinkComponent } from '../../../components/ui/back-link/back-link.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { ProposeGamePageComponent } from './propose-game-page.component'

/** Stands in for the proposal form, which talks to the API. */
@Component({ selector: 'form-game-submission', template: '' })
class FormStubComponent {
    readonly initialTitle = input<string>()
    readonly confirmWithToast = input(true)
    readonly cancelLink = input<unknown>(null)
    readonly proposalSubmitted = output<ProposalAddTo>()
}

describe('ProposeGamePageComponent', () => {
    const setup = async (queryParams: Record<string, string> = {}) => {
        await TestBed.configureTestingModule({
            imports: [ProposeGamePageComponent],
            providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } }],
        })
            .overrideComponent(ProposeGamePageComponent, {
                set: {
                    imports: [
                        FormStubComponent,
                        ContainerWrapperComponent,
                        PageHeaderComponent,
                        BackLinkComponent,
                        ButtonComponent,
                        IconComponent,
                        RouterLink,
                    ],
                },
            })
            .compileComponents()
        const fixture = TestBed.createComponent(ProposeGamePageComponent)
        fixture.detectChanges()
        return fixture
    }
    const backLink = (root: HTMLElement) => root.querySelector('a[appBackLink]') as HTMLAnchorElement

    it('leads back to Browse with the search it came from, above the heading', async () => {
        const fixture = await setup({ title: 'Cascadia' })

        const back = backLink(fixture.nativeElement)
        expect(back.getAttribute('href')).toBe('/collection/browse?q=Cascadia')
        expect(back.textContent?.trim()).toBe('Back to Browse')
        const heading = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement
        expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('leads back to Browse as it was left when there was no search', async () => {
        const fixture = await setup()

        expect(backLink(fixture.nativeElement).getAttribute('href')).toBe('/collection/browse')
    })

    it('offers Collection as a link once the proposal is sent', async () => {
        const fixture = await setup()

        fixture.componentInstance.onProposalSubmitted('shelf')
        fixture.detectChanges()

        const done = fixture.nativeElement.querySelector('a[appButton]') as HTMLAnchorElement
        expect(done.getAttribute('href')).toBe('/collection')
        expect(done.textContent?.trim()).toBe('Back to Collection')
        expect(fixture.nativeElement.querySelector('button')).toBeNull()
    })

    // #325: the page says what happens next, for where the game goes, and the form sends no toast over it.
    it.each([
        ['shelf', 'It will be on your shelf.'],
        ['wishlist', 'It will be on your wishlist.'],
    ] as const)('says the approved game goes to your %s', async (addTo, sentence) => {
        const fixture = await setup()

        fixture.componentInstance.onProposalSubmitted(addTo)
        fixture.detectChanges()

        const text = fixture.nativeElement.textContent as string
        expect(text).toContain('let you know when it’s ready')
        expect(text).toContain(sentence)
    })

    it('mentions no shelf or wishlist when the game goes to neither', async () => {
        const fixture = await setup()

        fixture.componentInstance.onProposalSubmitted('none')
        fixture.detectChanges()

        const text = fixture.nativeElement.textContent as string
        expect(text).toContain('let you know when it’s ready')
        expect(text).not.toContain('shelf')
        expect(text).not.toContain('wishlist')
    })

    it('asks the form not to toast, since the page says thank you', async () => {
        const fixture = await setup()
        const form = fixture.debugElement.query((node) => node.componentInstance instanceof FormStubComponent)

        expect((form.componentInstance as FormStubComponent).confirmWithToast()).toBe(false)
    })

    // #345: My submissions opens this page too; its back link and Cancel return there.
    it('leads back to My submissions when opened from there, from the back link and Cancel', async () => {
        const fixture = await setup({ from: 'submissions' })

        const back = backLink(fixture.nativeElement)
        expect(back.getAttribute('href')).toBe('/submissions')
        expect(back.textContent?.trim()).toBe('Back to My submissions')
        const form = fixture.debugElement.query((node) => node.componentInstance instanceof FormStubComponent)
        expect((form.componentInstance as FormStubComponent).cancelLink()).toEqual({ path: '/submissions' })
    })

    it('gives Cancel the same way back to Browse, with its search', async () => {
        const fixture = await setup({ title: 'Cascadia' })
        const form = fixture.debugElement.query((node) => node.componentInstance instanceof FormStubComponent)

        expect((form.componentInstance as FormStubComponent).cancelLink()).toEqual({
            path: '/collection/browse',
            queryParams: { q: 'Cascadia' },
        })
    })
})

import { Component, input } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ImageBackgroundComponent } from './image-background.component'

@Component({
    imports: [ImageBackgroundComponent],
    template: '<image-background [src]="src()" [alt]="alt()" />',
})
class ImageHostComponent {
    readonly src = input('')
    readonly alt = input('Example game cover')
}

describe('ImageBackgroundComponent', () => {
    let fixture: ComponentFixture<ImageHostComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ImageHostComponent] }).compileComponents()
        fixture = TestBed.createComponent(ImageHostComponent)
        fixture.detectChanges()
    })

    it('provides a labelled unavailable state when no artwork URL exists', () => {
        const fallback = fixture.nativeElement.querySelector('[role="img"]') as HTMLElement

        expect(fallback.getAttribute('aria-label')).toBe('Example game cover unavailable')
        expect(fallback.textContent).toContain('Artwork unavailable')
    })

    it('replaces broken artwork with the same accessible fallback', () => {
        fixture.componentRef.setInput('src', 'https://images.example.test/game.webp')
        fixture.detectChanges()

        const image = fixture.nativeElement.querySelector('img') as HTMLImageElement
        image.dispatchEvent(new Event('error'))
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('img')).toBeNull()
        expect(fixture.nativeElement.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Example game cover unavailable')
    })
})

import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { DataService } from '../../../core/services/data.service'
import { GroupCreateComponent } from './group-create.component'

describe('GroupCreateComponent onboarding handoff', () => {
    it('opens the newly created group workspace', async () => {
        const router = { navigate: vi.fn().mockName('navigate').mockResolvedValue(true) }
        const dataService = {
            currentUser: signal({ id: 7 }),
            createGroup: vi
                .fn()
                .mockName('createGroup')
                .mockReturnValue(of({ success: true, groupId: 42 })),
        }

        await TestBed.configureTestingModule({
            imports: [GroupCreateComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: {} },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(GroupCreateComponent)
        const component = fixture.componentInstance
        component.groupNameForm.setValue('Friday Crew')

        await component.onCreateGroup()

        expect(dataService.createGroup).toHaveBeenCalledWith('Friday Crew')
        expect(router.navigate).toHaveBeenCalledWith(['/groups', 42])
    })

    it('keeps the name and exposes a retryable error when creation fails', async () => {
        const router = { navigate: vi.fn().mockName('navigate').mockResolvedValue(true) }
        const dataService = {
            currentUser: signal({ id: 7 }),
            createGroup: vi
                .fn()
                .mockName('createGroup')
                .mockReturnValue(throwError(() => new Error('temporary failure'))),
        }

        await TestBed.configureTestingModule({
            imports: [GroupCreateComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: {} },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(GroupCreateComponent)
        const component = fixture.componentInstance
        component.groupNameForm.setValue('Friday Crew')

        await component.onCreateGroup()

        expect(component.createError()).toContain('could not create the group')
        expect(component.groupNameForm.value).toBe('Friday Crew')
        expect(component.isLoading()).toBe(false)
        expect(router.navigate).not.toHaveBeenCalled()
    })
})

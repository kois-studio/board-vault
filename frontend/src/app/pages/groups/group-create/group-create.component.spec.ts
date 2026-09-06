import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router } from '@angular/router'
import { of } from 'rxjs'
import { DataService } from '../../../core/services/data.service'
import { GroupCreateComponent } from './group-create.component'

describe('GroupCreateComponent onboarding handoff', () => {
    it('opens the newly created group workspace', async () => {
        const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) }
        const dataService = {
            currentUser: signal({ id: 7 }),
            createGroup: jasmine.createSpy('createGroup').and.returnValue(of({ success: true, groupId: 42 })),
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
})

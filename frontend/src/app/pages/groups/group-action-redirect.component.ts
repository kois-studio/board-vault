import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

@Component({
    template: '<p class="p-6 text-center text-secondary" role="status">Returning to the group workspace…</p>',
})
export class GroupActionRedirectComponent implements OnInit {
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)

    public ngOnInit(): void {
        const groupId = Number(this.route.snapshot.paramMap.get('groupId'))
        const target = this.route.snapshot.data['target'] === 'delete' ? ['groups', groupId, 'edit'] : ['groups', groupId]

        if (!Number.isInteger(groupId) || groupId <= 0) {
            void this.router.navigate(['/groups'])
            return
        }

        void this.router.navigate(target)
    }
}

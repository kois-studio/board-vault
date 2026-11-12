import { Injectable } from '@angular/core'
import { type ActivatedRouteSnapshot, BaseRouteReuseStrategy, type Params } from '@angular/router'

/**
 * Route data for a page that shows one thing by its address, such as a game night's page: when the address points to
 * another one (a notification about a different night, opened from that page), the page is built afresh instead of
 * being kept with the first one's state. Everything it was still waiting for, saves included, then belongs to the
 * page that was left, and can never land on the new one.
 */
export const REMOUNT_ON_PARAM_CHANGE = 'remountOnParamChange'
export const remountOnParamChange = { [REMOUNT_ON_PARAM_CHANGE]: true } as const

const sameParams = (a: Params, b: Params): boolean => {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}

/** Angular's own reuse (the same route keeps its page), except for routes marked with `remountOnParamChange`. */
@Injectable()
export class RemountOnParamChangeStrategy extends BaseRouteReuseStrategy {
    override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
        if (!super.shouldReuseRoute(future, current)) return false
        if (future.routeConfig?.data?.[REMOUNT_ON_PARAM_CHANGE] !== true) return true
        return sameParams(future.params, current.params)
    }
}

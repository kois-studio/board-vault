const isDev = import.meta.env.DEV

export function Logger(...args: any[]) {
    if (isDev) {
        console.log(...['[ LOG ]: \t', ...args])
    }
}

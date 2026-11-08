/**
 * The `Idempotency-Key` for one submission of a form that creates something (#246).
 *
 * A write whose outcome is unknown may have been saved. Sending the same request again with the same key returns what
 * the first one created instead of creating it twice; the API refuses the key with a different request. So a retry
 * must resend the request exactly as it was, including anything made at the time, such as "now".
 *
 * `prepare()` gives the key and the request to send. While the person's choices (`fingerprint`) are those of a try
 * whose outcome was unknown, it gives that try's key and request again; otherwise a new key and `build()`. Call
 * `keep()` after a try whose outcome is unknown and `clear()` after any other outcome.
 */
export class SubmissionKey<T> {
    private kept: Submission<T> | null = null
    private last: Submission<T> | null = null

    prepare(fingerprint: unknown, build: () => T): { key: string; request: T } {
        const choices = JSON.stringify(fingerprint)
        this.last = this.kept?.choices === choices ? this.kept : { choices, key: crypto.randomUUID(), request: build() }
        return { key: this.last.key, request: this.last.request }
    }

    /** The last try may have been saved: the same choices sent again resend it, with its key. */
    keep(): void {
        this.kept = this.last
    }

    /** The last try was saved, or certainly was not: the next one gets a new key. */
    clear(): void {
        this.kept = null
        this.last = null
    }
}

type Submission<T> = { choices: string; key: string; request: T }

<script lang="ts">
    let loading = false
    let email = 'hi@hi.com'
    let password = '<redacted-password>'
    let confirmPassword = '<redacted-password>'

    function validateEmail(email: string): boolean {
        const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
        return regex.test(email)
    }

    // Handle the user registration
    async function handleRegister() {
        loading = true

        if (!email || !password || !confirmPassword) {
            alert('Please fill in all fields')
            return
        }

        if (!validateEmail(email) || email.length > 128) {
            alert('Please enter a valid email')
            return
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match')
            return
        }

        if (password.length < 4 || password.length > 48) {
            alert('Password must be at least 4 characters long')
            return
        }

        const endpoint = '/api/auth/register'
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, confirmPassword })
        }

        const response = await fetch(endpoint, options)
        const data = await response.json()
        console.log(data)
    
        loading = false
    }
</script>

<div class="flex flex-col gap-4 rounded bg-zinc-800 p-8 w-96 mx-auto">
    <input
        placeholder="Email ..."
        type="email"
        class="rounded border border-zinc-700 bg-zinc-800 px-4 py-2"
        bind:value={email}
    />
    <input
        placeholder="Password ..."
        type="password"
        class="rounded border border-zinc-700 bg-zinc-800 px-4 py-2"
        bind:value={password}
    />
    <input
        placeholder="Repeat password ..."
        type="password"
        class="rounded border border-zinc-700 bg-zinc-800 px-4 py-2"
        bind:value={confirmPassword}
    />
    <button
        on:click={handleRegister}
        disabled={loading}
        class="rounded bg-green-600 px-6 py-4 text-xl font-bold hover:bg-green-700 lg:col-span-3 disabled:cursor-not-allowed disabled:bg-green-400 disabled:hover:bg-green-400 disabled:opacity-50"
    >
        Register
    </button>
</div>

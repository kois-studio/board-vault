<script lang="ts">
    // export let lang: string = 'en'
    export let accounts: any[] = []
    export let games: any[] = []
    export let ownedGames: any[] = []

    function getGames(ownerId: number) {
        return games.filter(game => {
            return ownedGames.some(ownedGame => {
                return ownedGame.gameId === game.id && ownedGame.ownerId === ownerId
            })
        })
    }
</script>

<div
    class="md:grid-4 container mx-auto mb-24 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4 xl:grid-cols-8"
>
    {#each accounts as account}
        <button
            class="dx-ownerCard rounded border-2 bg-zinc-800 p-2 hover:bg-zinc-700 border-zinc-800"
        >
            <div class="flex items-center gap-2">
                <div class="h-20 w-20">
                    <div
                        class="bg-cover bg-no-repeat bg-center h-full w-full overflow-hidden"
                        style={`background-image: url(${account.imageUrl});`}
                    ></div>
                </div>
                <div class="flex flex-col items-start">
                    <span class="text-xl">{account.name}</span>
                    <span><i class="bi bi-joystick"></i> {getGames(account.id).length}</span>
                </div>
            </div>
        </button>
    {/each}
</div>

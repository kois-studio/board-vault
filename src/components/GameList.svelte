<script lang="ts">
    export let games: {
        isOwned: boolean;
        title: string;
        imageUrl: string;
        gameAvgDuration: number;
        minPlayers: number;
        maxPlayers: number;
        id: number;
    }[] = [];

    let filter_title = ''
    const games_filtered = (txt: string) => games.filter(game => game.title.includes(txt))
    
</script>

<div class="w-96 mx-auto py-8">
    <input placeholder="filter by game name..." type="text" class="h-12 w-full rounded border-0 p-2 shadow outline-0 ring-green-400 focus:ring-4 bg-zinc-800">
</div>

<div class='flex gap-2 flex-wrap'>
    {#each games_filtered(filter_title) as game}
        <div class={game.isOwned ? '' : 'opacity-20'}>
            <div class="grid grid-rows-2 rounded bg-zinc-700 p-2 w-40">
                <div class="bg-cover bg-no-repeat bg-center h-full w-full overflow-hidden" style={`background-image: url(${game.imageUrl});`}/>
            
                <div class="relative overflow-hidden">
                    <h3 class="py-2 text-lg overflow-hidden text-ellipsis whitespace-nowrap">{game.title}</h3>
                    <p><i class="bi bi-clock-fill" /> {game.gameAvgDuration} mins</p>
                    <p><i class="bi bi-people-fill" /> {game.minPlayers} - {game.maxPlayers}</p>
                </div>
            </div>
        </div>
    {/each}
</div>

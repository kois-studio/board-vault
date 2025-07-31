# Frontend structure definition

The frontend, after you log in, has 3 main views with some sub-views:

1. Dashboard - the page you see after you log in
   1.1 My Groups - a list of groups you are a member of. after click, you can manage it

2. Collection - a page to manage your collection
   2.1 My Games - a list of games you own
   2.2 Browse and Discover - a page to browse and discover new games to add to your collection
   2.3 Wishlist - a list of games you want to add to your collection
   2.4 Reviews - a list of reviews you have about games (owned or not)

3. Play - a page to plan and track your play sessions
   3.1 My Meets - a list of meets you have planned
   3.2 Game Recommendations - a page to get recommendations based on your collection and play history
   3.3 Play History - a list of games you have played
   3.4 Play Statistics - a page to view statistics about your play sessions

Those subsections are "blocks", so for example in the collection and play, you will see a 2x2 grid of blocks, each block being a subsection.

Under them we will have some extra data related to the general section.
For example in the dashboard, we will have a block about "recent activity" of other members of your groups.
And for collection, some notifications about your collection's activity: games added, reviews added, wishlisted games, etc.

# Gjallarhorn

Gjallarhorn is a tool for Brawlhalla community tournament producers to generate JSON files for stream overlays. Gjallarhorn can serve files for multiple use cases, including rotating tickers, caster information, queued games, pop-ins, and more. Gjallarhorn supports manual data entry as well as fetching data from Start.gg or Challengermode, supplemented by Brawlhalla's Stats API.

## Getting Started

You will need one of a Start.gg or Challengermode API key to use Gjallarhorn. If you don't have one already, get one at [Start.gg's Developer Portal](https://developer.start.gg/docs/authentication/) or [Challengermode's Developer Portal](https://www.challengermode.com/developers/applications).

Challengermode support is very new, and you may run into issues because Challengermode tournaments are structured differently than Start.gg tournaments. If you experience unintended behavior or other problems, please submit a Github Issue.

To start using Gjallarhorn, run these commands in the Gjallarhorn folder to install the dependencies and build the front-end:

```sh
npm install
npm run build
```

Then, launch the process with your API keys as flags.

```sh
# Start.gg only
node . -s [your-startgg-key-here]
# Challengermode only
node . -cm [your-challengermode-key-here]
# Both Start.gg and Challengermode
node . -s [] -cm []
```

> [!NOTE]
> You only need to run `npm install` and `npm run build` the first time you try to run Gjallarhorn.

Then, launch the dashboard at http://localhost:3000.

<details>
  <summary>Usage</summary>

To begin using Gjallarhorn, you can connect with and import a tournament from Start.gg or Challengermode. This tournament is listed in the header, and can be edited by clicking the pencil.

You will find 6 different cards on the dashboard: Casters, Game, Ticker, Players, Queue, and Lower Thirds. Each card has a title bar that contains a Push button and an arrow. Right clicking on the title bar will open a dropdown to change the color of the card. Dragging the title bar will allow you to move the card. Clicking on the arrow will close the card and move it to the bottom of the screen.

Clicking the Push button on a card will create a JSON file served over HTTP on http://localhost:3000/api/json and saved locally at `packages/cli/output`. These JSON files can be connected to broadcasting software (vMix or OBS with applicable plugins) to allow for seamless usage.

However, not all of this data will be useful or even applicable to all organizers. Gjallarhorn is designed to be modular - use whatever is necessary for your workflow and tournament.

</details>

<details>
  <summary>Header</summary>

In the top left corner, the current tournament is indicated next to the hamburger menu. The pencil icon opens a text box where you can change the active tournament. Enter the ID of a vaild tournament to fetch information from it. A valid ID is a slug for Start.gg tournaments (`brawlhalla-world-championship-expo-2023`), and an UUID for Challengermode tournaments (`eb84e618-2941-42b7-09c7-08dd66f60e0c`).

When a tournament is loaded, you will see host-specific dropdowns and filters. Start.gg tournaments will have three dropdowns corresponding to the event, phase group, and phase. Challengermode tournaments will also have three dropdowns, but the first will do nothing. The second and third correspond to the current bracket and round.

Push Brackets will output a JSON file to be used in bracket images. You can have these pushed every two minutes by clicking the timer next to the Push button.

Hovering over the checkmark icon next to the search bar shows you the application latency and the rate limits for both the database and Start.gg. If your Gjallarhorn instance is unexpectedly terminated, the icon will change and turn yellow.

Hovering over the user icon will show checkboxes that enable light mode and push notifications for possible errors respectively.

</details>

<details>
  <summary>Casters</summary>

You can enter up to four different casters, with text boxes for their name, social media accounts, and pronouns.

</details>

<details>
  <summary>Game</summary>

This card can be input manually, or you can use the Set dropdown to populate text with a Start.gg match. You can also import a set from the Queue card by clicking on the clipboard next to Push Round button. Rounds won can be incremented using the plus and minus buttons next to Left and Right.

</details>

<details>
  <summary>Players</summary>

This card can be input manually. You can also import players from the Game card or the Queue card with the clipboard button next to the Push button. When importing players, Gjallarhorn will attempt to populate the Lifetime Score textbox with information from the Stats API. It can also be manually incremented with the plus and minus buttons. The legend loaded for each player will be the most recently reported legend in the current tournament (if applicable). Otherwise, it will be the last legend the player ever reported.

</details>

<details>
  <summary>Ticker</summary>

Used to create rotating tickers. These tickers can be manually moved by dragging the vertical arrow icon next to the subject, and can be randomly shuffled by hitting the shuffle button. By clicking the timer next to shuffle, the tickers will automatically shuffle every five minutes.

</details>

<details>
  <summary>Queue</summary>

The Queue card pulls stream queues from a tournament. In order for this card to be useful, your tournament must have at least one active queue. You can continuously fetch the active queue every sixty seconds by clicking the timer next to Fetch Queue.

</details>

<details>
  <summary>Lower Thirds</summary>

The Lower Thirds card can be used to make mock X (formerly Twitter) posts, Twitch messages, Champion graphics, and more.

The Champion section can be autofilled by clicking the Autofill button next to event. It will use the tournament name and game mode in the event textbox, and the winner’s name will be in the message box.

You can create presets for each section. You can also delete the most recently created preset if it was added in error.

</details>

## Development Overview

Gjallarhorn consists of a React front end and a NodeJS backend. The NodeJS
backends act as data stores for the data input into the cards. Backend updates
from `setState`are published over the websocket to the front end for display
purposes (like results of calls for start.gg). The front end can also subscribe
to those updates by calling `backend.useState([StateKeyHere])` and publish new
updates itself. This mirrors React's `useState` hook.

Both are compiled separately, so be aware that you should NOT import any server
files into the client, and vice versa. You'll see a pattern like this:

```
import { useBackend } from "../../../client/support/backend";
import { GameBackend } from "../../../backends/cards/game";
import { TGameBackend } from "@bmg-esports/gjallarhorn-tokens";

function CoolComponent() {
  const b = useBackend<GameBackend>(TGameBackend);
  ...
}
```

Which works because GameBackend is being used as a type, which gets discarded
upon compilation.

But this will not work:

```
import { GameBackend } from "../../../backends/cards/game";

function CoolComponent() {
  const b = new GameBackend();
  ...
}
```

Nor this:

```
import { GameBackend } from "../../../backends/cards/game";

function CoolComponent() {
  const b = useBackend(GameBackend);
  ...
}
```

**Errors:** All errors are treated as fatal even though they won't crash the
app. We publish the errors to the operator and give the user the option to mark
them as non-fatal and pause the tournament, or default to a meaningful value
(like if start.gg does not return a value for a field)

**Project Structure:** Core contains the meat of Gjallarhorn. You will find card
UI built from React components in `src/client/pages/cards` and their respective
backends in `src/backends`. Reusable UI elements are grouped in `src/client/ui`.
The networking layer is found in `src/services`, like the one to the Brawlhalla
Stats API (`db.ts`)

## Contributors

<p>
  <a href="https://github.com/preyneyv"><img src="https://github.com/preyneyv.png" width="50" /></a>
  <a href="https://github.com/arnabp"><img src="https://github.com/arnabp.png" width="50" /></a>
  <a href="https://github.com/BuildGayFromSource"><img src="https://github.com/BuildGayFromSource.png" width="50" /></a>
  <a href="https://github.com/qiliao17"><img src="https://github.com/qiliao17.png" width="50" /></a>
<p>

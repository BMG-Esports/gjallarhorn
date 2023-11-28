# `Stream Toolkit`

Stream Toolkit is a tool for Brawlhalla community tournament runners to generate properly formatted JSON for Twitch overlays. This supports overlays for Game, Players, Queue, Ticker, Casters, and Lower Thirds. It pulls data from start.gg as well as Brawlhalla's Stats API.

## Usage

To start it up, you can run the following commands:

```
npm run build
npm link
stk -s [startgg-key-here]
```

Check out https://developer.start.gg/docs/authentication to get started with an API key if you don't have one already.
You can fill out the cards with the proper details you want on the overlay, and hit "Push". You will find the output in /api/json.

## Project Overview

Stream Toolkit consists of a React front end and a NodeJS backend. The NodeJS backends act as data stores for the data input into the cards. Backend updates from `setState`are published over the websocket to the front end for display purposes (like results of calls for start.gg). The front end can also subscribe to those updates by calling `backend.useState([StateKeyHere])` and publish new updates itself. This mirrors React's `useState` hook.

Both are compiled separately, so be aware that you should NOT import any server files into the client, and vice versa.
You'll see a pattern like this:

```
import { useBackend } from "../../../client/support/backend";
import { GameBackend } from "../../../backends/cards/game";
import { TGameBackend } from "@bmg-esports/gjallarhorn-tokens";

function CoolComponent() {
  const b = useBackend<GameBackend>(TGameBackend);
  ...
}
```

Which works because GameBackend is being used as a type, which gets discarded upon compilation.

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

**Errors:**
All errors are treated as fatal even though they won't crash the app. We publish the errors to the operator and give the user the option to mark them as non-fatal and pause the tournament, or default to a meaningful value (like if start.gg does not return a value for a field)

**Project Structure**
Core contains the meat of stream toolkit. You will find card UI built from React components in `src/client/pages/cards` and their respective backends in `src/backends`. Reusable UI elements are grouped in `src/client/ui`. The networking layer is found in `src/services`, like the one to the Brawlhalla Stats API (`db.ts`)

## Contributors

[![](https://github.com/preyneyv.png?size=50)](https://github.com/preyneyv)
[![](https://github.com/arnabp.png?size=50)](https://github.com/arnabp)

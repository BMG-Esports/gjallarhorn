import { TTournamentBackend } from "@bmg-esports/gjallarhorn-tokens";
import React, { useRef } from "react";
import { Nav, Spacer } from "../shell/nav";
import { useBackend } from "../support/backend";
import { TournamentBackend } from "../../backends/pages/tournament";
import { TournamentSelector } from "../ui/components/tournament-selector";
import { PushButton } from "../ui/components/push-button";
import { CardHost, CardHostHandle } from "../ui/components/cards";
import { JumpTo } from "../ui/components/cards/jump-to";
import { TournamentProvider } from "../ui/contexts/tournament";
import { SystemWidget } from "../ui/components/system-widget";
import { AutoToggle } from "../ui/fields/auto-toggle";

import casters from "./cards/casters";
import game from "./cards/game";
import lowerThirds from "./cards/lower-thirds";
import players from "./cards/players";
import queue from "./cards/queue";
import ticker from "./cards/ticker";

const cards = [casters, game, lowerThirds, players, queue, ticker];

export default function TournamentPage() {
  const filteredCards = cards;

  const t = useBackend<TournamentBackend>(TTournamentBackend);
  const [tournament, setTournament] = t.useState("tournament", {
    tournamentSlug: "",
  });
  const meta = t.useState("tournamentMeta")[0];
  const pushBracketState = t.useState("pushBracketState")[0];
  const [autoBrackets, setAutoBrackets] = t.useState("autoBrackets");

  const host = useRef<CardHostHandle>();

  return (
    <TournamentProvider value={tournament}>
      <Nav>
        <TournamentSelector {...{ tournament, setTournament, meta }} />
        <Spacer />
        <AutoToggle
          enabled={autoBrackets}
          setEnabled={setAutoBrackets}
          label="2m"
        >
          <PushButton
            big
            disabled={!tournament.eventId}
            state={pushBracketState}
            onClick={() => t.pushBrackets()}
          >
            Push Brackets
          </PushButton>
        </AutoToggle>
        <JumpTo
          cards={filteredCards}
          jumpTo={(id) => host.current.jumpTo(id)}
        />
        <SystemWidget />
      </Nav>
      <CardHost
        prefix="tournament"
        ref={host}
        cards={filteredCards}
        mode="column"
      />
    </TournamentProvider>
  );
}

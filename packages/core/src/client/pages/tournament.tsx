import { TTournamentBackend } from "@bmg-esports/gjallarhorn-tokens";
import React, { useRef } from "react";
import { Nav, Spacer } from "../shell/nav";
import { useBackend } from "../support/backend";
import { TournamentBackend } from "../../backends/pages/tournament";
import { TournamentSelector } from "../ui/components/tournament-selector";
import { PushButton } from "../ui/components/push-button";
import { CardHost, CardHostHandle } from "../ui/components/cards";
import { JumpTo } from "../ui/components/cards/jump-to";
import { SggTournamentProvider } from "../ui/contexts/tournament";
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
  const [sggTournament, setSggTournament] = t.useState("sggTournament", {
    tournamentSlug: "",
  });
  const [cmTournament, setCmTournament] = t.useState("cmTournament", {
    tournamentId: "",
  });
  const sggMeta = t.useState("sggTournamentMeta")[0];
  const cmMeta = t.useState("cmTournamentMeta")[0];
  const pushBracketState = t.useState("pushBracketState")[0];
  const [autoBrackets, setAutoBrackets] = t.useState("autoBrackets");
  const [isCm, setIsCm] = t.useState("isChallengerMode");

  const host = useRef<CardHostHandle>();

  return (
    <SggTournamentProvider value={sggTournament}>
      <Nav>
        <TournamentSelector
          tournament={isCm ? cmTournament : sggTournament}
          // @ts-ignore
          setTournament={isCm ? setCmTournament : setSggTournament}
          meta={isCm ? cmMeta : sggMeta}
          isCm={isCm}
          setIsCm={setIsCm}
        />{" "}
        <Spacer />
        <AutoToggle
          enabled={autoBrackets}
          setEnabled={setAutoBrackets}
          label="2m"
        >
          <PushButton
            big
            disabled={
              isCm ? !cmTournament.tournamentId : !sggTournament.eventId
            }
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
    </SggTournamentProvider>
  );
}

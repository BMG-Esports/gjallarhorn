import { useBackend } from "../../../client/support/backend";
import { Preloader } from "../../../client/ui/components/loading";
import {
  Card,
  CardDefinition,
  CardProps,
} from "../../../client/ui/components/cards";
import { EntrantColumns } from "../../../client/ui/components/entrants";
import { PushButton } from "../../../client/ui/components/push-button";
import { useDirtyContainer } from "../../../client/ui/fields/dirtyable";
import { PlayersBackend } from "../../../backends/cards/players";
import React, { forwardRef, useState } from "react";
import { ClipboardCopy, Users } from "lucide-react";
import { GameBackend } from "../../../backends/cards/game";
import { Button } from "../../../client/ui/fields/button";
import Popup from "reactjs-popup";
import { QueueSetSelector } from "../../../client/ui/components/queue-set-selector";
import { TGameBackend, TPlayersBackend } from "@bmg-esports/gjallarhorn-tokens";

export const Players = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const p = useBackend<PlayersBackend>(TPlayersBackend);
  const { dirty, markReset, wrapDirty } = useDirtyContainer(
    p.useState("dirtyState")
  );

  const [left, setLeft] = p.useState("left");
  const [leftScore, setLeftScore] = p.useState("leftScore");
  const [right, setRight] = p.useState("right");
  const [rightScore, setRightScore] = p.useState("rightScore");
  const pushPlayerState = p.useState("pushPlayersState")[0];

  const g = useBackend<GameBackend>(TGameBackend);
  const game = {
    left: g.useState("left")[0]?.id,
    right: g.useState("right")[0]?.id,
  };

  const [copyOpen, setCopyOpen] = useState(false);

  const loadEntrants = (leftId: number, rightId: number) => {
    if (leftId !== left?.id) setLeft({ id: leftId, isStartGG: true });
    if (rightId !== right?.id) setRight({ id: rightId, isStartGG: true });
    setCopyOpen(false);
  };

  return (
    <Card
      dirty={dirty}
      ref={ref}
      {...props}
      title="Players"
      icon={<Users />}
      header={
        <>
          <Popup
            trigger={
              <Button icon flat>
                <ClipboardCopy />
              </Button>
            }
            on={"click"}
            onClose={() => setCopyOpen(false)}
            onOpen={() => setCopyOpen(true)}
            open={copyOpen}
            position={["bottom left", "bottom right"]}
            keepTooltipInside
            arrow={false}
          >
            <div style={{ padding: 8 }}>
              <div
                style={{
                  textTransform: "uppercase",
                  marginBottom: 4,
                  fontSize: "0.9em",
                  fontWeight: 600,
                  opacity: 0.3,
                }}
              >
                Copy From
              </div>
              <Button
                style={{ width: "100%", marginBottom: 8 }}
                onClick={() => loadEntrants(game.left, game.right)}
              >
                Game
              </Button>
              <QueueSetSelector
                onSelect={(set) => loadEntrants(set.left?.id, set.right?.id)}
              />
            </div>
          </Popup>
          <PushButton
            state={pushPlayerState}
            onClick={() => (p.pushPlayers(), markReset())}
            dirty={dirty}
            flat
          >
            Push
          </PushButton>
        </>
      }
    >
      {wrapDirty(
        <Preloader fields={[left, right, leftScore, rightScore]}>
          <EntrantColumns
            modifyEntrants
            withScore
            withSwapSides
            scoreLabel="Lifetime Score"
            middle={
              <PushButton
                dirty={dirty}
                state={pushPlayerState}
                onClick={() => (p.pushPlayers(), markReset())}
              >
                Push Players
              </PushButton>
            }
            {...{
              left,
              right,
              setLeft,
              setRight,
              leftScore,
              setLeftScore,
              rightScore,
              setRightScore,
            }}
          />
        </Preloader>
      )}
    </Card>
  );
});
Players.displayName = "Players";

const definition: CardDefinition = {
  title: "Players",
  id: "players",
  component: Players,
};

export default definition;

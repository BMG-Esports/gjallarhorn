import { useBackend } from "../../../client/support/backend";
import {
  Card,
  CardDefinition,
  CardProps,
} from "../../../client/ui/components/cards";
import { PushButton } from "../../../client/ui/components/push-button";
import { GameBackend } from "../../../backends/cards/game";
import React, { forwardRef } from "react";
import { ClipboardCopy, Gamepad2, RefreshCw } from "lucide-react";
import { Preloader } from "../../../client/ui/components/loading";
import { fuzzySearch } from "react-select-search";
import { useDirtyContainer } from "../../../client/ui/fields/dirtyable";
import { Input } from "../../../client/ui/fields/input";
import { InputRow } from "../../../client/ui/fields/input-row";
import { EntrantColumns } from "../../../client/ui/components/entrants";
import { SearchDropdown, Select } from "../../../client/ui/fields/dropdown";
import Popup from "reactjs-popup";
import { QueueSetSelector } from "../../../client/ui/components/queue-set-selector";
import { Button } from "../../../client/ui/fields/button";
import { TGameBackend } from "@bmg-esports/gjallarhorn-tokens";
import { Label } from "../../ui/fields/label";

export const Game = forwardRef<HTMLDivElement, CardProps>((props, ref) => {
  const b = useBackend<GameBackend>(TGameBackend);

  const dirtyRound = useDirtyContainer(b.useState("dirtyRoundState"));
  const dirtyGame = useDirtyContainer(b.useState("dirtyGameState"));

  const [round, setRound] = b.useState("round");
  const [region, setRegion] = b.useState("region");
  const [bracket, setBracket] = b.useState("bracket");
  const pushRoundState = b.useState("pushRoundState")[0];

  const sets = b.useState("sets")[0];
  const pushFetchState = b.useState("pushFetchState")[0];

  const [setId, setSetId] = b.useState("setId");
  const [left, setLeft] = b.useState("left");
  const [right, setRight] = b.useState("right");
  const pushGameState = b.useState("pushGameState")[0];

  return (
    <Card
      ref={ref}
      {...props}
      title="Game"
      icon={<Gamepad2 />}
      dirty={dirtyRound.dirty || dirtyGame.dirty}
      header={
        <>
          <Popup
            on={"click"}
            trigger={
              <Button icon flat>
                <ClipboardCopy />
              </Button>
            }
            arrow={false}
            position={["bottom left", "bottom right"]}
            keepTooltipInside
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
              <QueueSetSelector onSelect={(set) => setSetId(set.id)} />
            </div>
          </Popup>
          <PushButton
            state={pushRoundState}
            onClick={() => (b.pushRound(), dirtyRound.markReset())}
            dirty={dirtyRound.dirty}
            flat
          >
            Push Round
          </PushButton>
          <PushButton
            state={pushGameState}
            onClick={() => (b.pushGame(), dirtyGame.markReset())}
            dirty={dirtyGame.dirty}
            flat
          >
            Push Scoreboard
          </PushButton>
        </>
      }
    >
      <Preloader fields={[sets, round, region, left, right]}>
        <InputRow>
          <InputRow noGap>
            <SearchDropdown
              label="Set"
              search
              filterOptions={fuzzySearch}
              options={sets?.map((set) => ({
                name: `${set.identifier}: ${
                  set.slots?.[0]?.entrant?.name ?? "TBD"
                } - ${set.slots?.[1]?.entrant?.name ?? "TBD"}`,
                value: String(set.id),
              }))}
              renderOption={(props: any, opt, _, className) => {
                // Had to cast `props` to any since it was "incompatible"
                // even though it isn't.
                const set = sets.find((s) => String(s.id) === opt.value);
                return (
                  <button
                    {...props}
                    className={className}
                    style={{
                      height: 42,
                      paddingRight: 10,
                      display: "grid",
                      gridTemplateColumns: "32px 1fr",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontWeight: 500, textAlign: "center" }}>
                      {set?.identifier}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        lineHeight: 1.25,
                      }}
                    >
                      <div>
                        {set?.slots?.[0]?.entrant?.name ?? (
                          <i style={{ opacity: 0.3 }}>TBD</i>
                        )}
                      </div>
                      <div>
                        {set?.slots?.[1]?.entrant?.name ?? (
                          <i style={{ opacity: 0.3 }}>TBD</i>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }}
              value={String(setId)}
              onChange={(v: any) => setSetId(parseInt(v))}
            />
            <PushButton
              icon
              state={pushFetchState}
              onClick={() => b.loadSets()}
            >
              <RefreshCw />
            </PushButton>
          </InputRow>
          {dirtyRound.wrapDirty(
            <>
              <Input
                label="Round"
                value={round ?? ""}
                onChange={(e) => setRound(e.target.value)}
              />
              <Input
                label="Region"
                value={region ?? ""}
                onChange={(e) => setRegion(e.target.value)}
              />
              <Label label="Bracket">
                <Select
                  value={bracket}
                  onChange={(e) => setBracket(e.target.value)}
                >
                  <option value="Winners Bracket">Winners</option>
                  <option value="Elimination Bracket">Elimination</option>
                  <option value="Round Robin">RoundRobin</option>
                </Select>
              </Label>
            </>
          )}
          <PushButton
            state={pushRoundState}
            dirty={dirtyRound.dirty}
            onClick={() => (b.pushRound(), dirtyRound.markReset())}
          >
            Push Round
          </PushButton>
        </InputRow>
        <div style={{ height: 10 }} />
        {dirtyGame.wrapDirty(
          <EntrantColumns
            withScore
            withSwapSides
            leftScore={left?.score}
            rightScore={right?.score}
            setLeftScore={(score) => setLeft({ ...left, score })}
            setRightScore={(score) => setRight({ ...right, score })}
            {...{ left, right, setLeft, setRight }}
            middle={
              <>
                <PushButton
                  state={pushGameState}
                  onClick={() => (b.pushGame(), dirtyGame.markReset())}
                  dirty={dirtyGame.dirty}
                >
                  Push Scoreboard
                </PushButton>
              </>
            }
          />
        )}
      </Preloader>
    </Card>
  );
});
Game.displayName = "Game";

const definition: CardDefinition = {
  title: "Game",
  id: "game",
  component: Game,
};

export default definition;

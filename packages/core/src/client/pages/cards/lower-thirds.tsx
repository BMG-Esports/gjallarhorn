import {
  Card,
  CardDefinition,
  CardProps,
} from "../../../client/ui/components/cards";
import { PushButton } from "../../../client/ui/components/push-button";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  LowerThirdsBackend,
  LowerThirdsData,
} from "../../../backends/cards/lower-thirds";
import { useBackend } from "../../../client/support/backend";
import { DirtyState, Tuple } from "../../../@types/types";
import { Preloader } from "../../../client/ui/components/loading";
import { TabGroup } from "../../../client/ui/components/cards/tab-group";
import { useDirtyContainer } from "../../../client/ui/fields/dirtyable";
import { Input } from "../../../client/ui/fields/input";
import { fuzzySearch } from "react-select-search";
import { InputRow } from "../../../client/ui/fields/input-row";
import { Button } from "../../../client/ui/fields/button";
import { SearchDropdown } from "../../../client/ui/fields/dropdown";
import { TLowerThirdsBackend } from "@bmg-esports/gjallarhorn-tokens";
import { GameBackend } from "../../../backends/cards/game";
import { TournamentBackend } from "../../../backends/pages/tournament";
import {
  TGameBackend,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";

const opts = new Map([
  ["twitter", "Twitter"],
  ["twitch", "Twitch"],
  ["message", "Message"],
  ["champion", "Champion"],
  ["preshow", "Preshow"],
]);

const LowerThirdsDataEditor = ({
  headerLabel,
  bodyLabel,
  data,
  setData,
  presets,
  allPresets,
  setPresets,
  setDirtyMeta,
  dirtyState,
  autoFill,
}: {
  headerLabel: string;
  bodyLabel: string;
  data: LowerThirdsData;
  setData: (d: LowerThirdsData) => void;
  presets: LowerThirdsData[];
  allPresets: LowerThirdsData[];
  setPresets: (p: LowerThirdsData[]) => void;
  setDirtyMeta: (d: boolean, mr: () => void) => void;
  dirtyState: [DirtyState, (d: DirtyState) => void];
  autoFill?: () => void;
}) => {
  const { dirty, markReset, wrapDirty } = useDirtyContainer(dirtyState);
  const bodyLength = (data?.body ?? "").trim().length;
  useEffect(() => setDirtyMeta(dirty, markReset), [dirty, markReset]);
  return wrapDirty(
    <>
      <InputRow>
        <Input
          label={headerLabel}
          value={data?.title ?? ""}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          spellCheck
        />
        {autoFill && <Button onClick={autoFill}>AutoFill</Button>}
      </InputRow>
      <Input
        type={"textarea"}
        label={`${bodyLabel} (${bodyLength})`}
        value={data?.body ?? ""}
        onChange={(e) => setData({ ...data, body: e.target.value })}
        style={{ minHeight: 100 }}
        spellCheck
      />
      <InputRow>
        <SearchDropdown
          label="Presets"
          dirtyable={false}
          search
          filterOptions={fuzzySearch}
          options={presets.map((p, i) => ({
            name:
              (p.id ? `${p.id}: ` : "") +
              (p.title || "") +
              " " +
              (p.body || ""),
            value: String(i),
          }))}
          renderOption={(props: any, opt, _, className) => {
            const p = presets[parseInt(opt.value)];
            return (
              <button
                {...props}
                className={className}
                style={{
                  whiteSpace: "normal",
                  lineHeight: 1.1,
                  height: "auto",
                  padding: 4,
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  <div>{p.body}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, padding: "0 4px" }}>
                    {p.id}
                  </div>
                </div>
              </button>
            );
          }}
          value={String(-1)}
          onChange={(v) => {
            if (typeof v === "object") return;
            setData(presets[v]);
          }}
        />
        <Button
          disabled={!data.body && !data.title}
          onClick={() => {
            if (!data.body && !data.title) return;
            data.id =
              prompt(
                "What ID should this preset use? (Leave blank or press Esc to skip)"
              ) || undefined;

            if (data.id) {
              data.id = data.id.toUpperCase();
              let originalGlobal = allPresets.find((x) => x.id === data.id);
              let originalLocal = presets.find((x) => x.id === data.id);
              if (originalLocal) {
                Object.assign(originalLocal, data);
                setPresets([...presets]);
              } else if (originalGlobal) {
                alert(
                  "That ID is already in use for a different lower-third type. Please pick something else."
                );
              } else {
                setPresets([data, ...presets]);
              }
            } else {
              setPresets([data, ...presets]);
            }
          }}
        >
          Save Preset
        </Button>
        <Button
          onClick={() => {
            setPresets(presets.slice(1));
          }}
        >
          Delete Last Preset
        </Button>
      </InputRow>
    </>
  );
};

export const LowerThirds = forwardRef<HTMLDivElement, CardProps>(
  (props, ref) => {
    const markReset = useRef(() => void null);
    const [dirty, setDirty] = useState(false);
    const b = useBackend<LowerThirdsBackend>(TLowerThirdsBackend);
    const g = useBackend<GameBackend>(TGameBackend);
    const t = useBackend<TournamentBackend>(TTournamentBackend);
    const [type, setType] = b.useState("type");

    const leftPlayer = g.useState("left")[0];
    const rightPlayer = g.useState("right")[0];
    const tourney = t.useState("tournamentMeta")[0];

    const autoFillChampion = () => {
      const tourneyName = tourney?.name?.toLocaleUpperCase() ?? "TOURNAMENT";
      if (leftPlayer && rightPlayer) {
        const isLeftWinner = (leftPlayer.score ?? 0) > (rightPlayer.score ?? 0);
        const winningPlayer = isLeftWinner ? leftPlayer : rightPlayer;
        const isDoubles = !!winningPlayer.player2?.name;
        let winningPlayerName = winningPlayer.player1?.name ?? "-";
        if (isDoubles)
          winningPlayerName += ` AND ${winningPlayer.player2?.name}`;
        const gameMode = isDoubles ? "DOUBLES" : "SINGLES";
        const champText = isDoubles ? "CHAMPIONS" : "CHAMPION";
        const eventString = `${tourneyName} ${gameMode} ${champText}`;
        states.champion[0][1]({
          ...states.champion[0][1],
          title: eventString,
          body: winningPlayerName,
        });
      }
    };

    const states = {
      twitter: Tuple(
        b.useState("twitter"),
        b.useState("twitterPresets"),
        b.useState("twitterPushState")[0],
        "Twitter Handle",
        "Twitter Message",
        b.useState("twitterDirtyState")
      ),
      twitch: Tuple(
        b.useState("twitch"),
        b.useState("twitchPresets"),
        b.useState("twitchPushState")[0],
        "Twitch Handle",
        "Message",
        b.useState("twitchDirtyState")
      ),
      message: Tuple(
        b.useState("message"),
        b.useState("messagePresets"),
        b.useState("messagePushState")[0],
        "Title",
        "Body",
        b.useState("messageDirtyState")
      ),
      champion: Tuple(
        b.useState("champion"),
        b.useState("championPresets"),
        b.useState("championPushState")[0],
        "Event",
        "Champion",
        b.useState("championDirtyState")
      ),
      preshow: Tuple(
        b.useState("preshow"),
        b.useState("preshowPresets"),
        b.useState("preshowPushState")[0],
        "Title",
        "Body",
        b.useState("preshowDirtyState")
      ),
    };

    const [
      [lowerThirdsData, setLowerThirdsData],
      [presets, setPresets],
      pushState,
      headerLabel,
      bodyLabel,
      dirtyState,
    ] = states[(type as keyof typeof states) || "twitter"];

    return (
      <Card
        dirty={dirty}
        ref={ref}
        {...props}
        title="Lower Thirds"
        icon={<MessageSquare />}
        header={
          <PushButton
            flat
            onClick={() => (b.push(), markReset.current())}
            dirty={dirty}
            state={pushState}
          >
            Push
          </PushButton>
        }
      >
        <Preloader fields={[lowerThirdsData, presets]}>
          <TabGroup tabs={opts} active={type} setActive={setType} />
          <LowerThirdsDataEditor
            key={type}
            data={lowerThirdsData}
            setData={setLowerThirdsData}
            presets={presets}
            allPresets={[].concat(
              states.champion[1][0],
              states.message[1][0],
              states.preshow[1][0],
              states.twitter[1][0],
              states.twitch[1][0]
            )}
            setPresets={setPresets}
            setDirtyMeta={(d, mr) => {
              setDirty(d);
              markReset.current = mr;
            }}
            headerLabel={headerLabel}
            bodyLabel={bodyLabel}
            dirtyState={dirtyState}
            autoFill={type === "champion" ? autoFillChampion : undefined}
          />
          <PushButton
            style={{ marginTop: 10 }}
            state={pushState}
            dirty={dirty}
            onClick={() => (b.push(), markReset.current())}
          >
            Push {opts.get(type)}
          </PushButton>
        </Preloader>
      </Card>
    );
  }
);
LowerThirds.displayName = "LowerThirds";

const definition: CardDefinition = {
  title: "Lower Thirds",
  id: "lower-thirds",
  component: LowerThirds,
};

export default definition;

import React, { ComponentProps, useEffect, useRef, useState } from "react";
import { Entrant, Player } from "../../../../@types/types";
import { Button } from "../../fields/button";
import styles from "./style.scss";
import StartGG from "../../icons/startgg";
import { Input } from "../../fields/input";
import { useSggTournament, useCmTournament } from "../../contexts/tournament";
import NoStartGG from "../../icons/no-startgg";
import { COUNTRIES, LEGENDS } from "../../../../constants";
import { fuzzySearch, SelectSearchOption } from "react-select-search";
import { useDebounce } from "../../../../client/support/hooks";
import { useBackend } from "../../../../client/support/backend";
import { TournamentBackend } from "../../../../backends/pages/tournament";
import { SearchDropdown } from "../../fields/dropdown";
import { InputRow } from "../../fields/input-row";
import { Minus, Plus } from "lucide-react";
import { TTournamentBackend } from "@bmg-esports/gjallarhorn-tokens";
import { GQLTournamentLineup } from "../../../../@types/challengermode";
import { Entrant as SEntrant } from "../../../../@types/startgg";

type SetEntrant = (e: Entrant) => void;
type SetPlayer = (p: Player) => void;
type SwapPodiums = (self: Player, otherPodium: number) => void;
type PlayerFieldOption = "select" | "sponsor" | "name" | "country" | "legend";
type EntrantOption = SelectSearchOption & { seed?: number };

/**
 * Code to fetch entrant options from the active event. Works around a few
 * quirks of react-search-select.
 */
export function useEntrantOptions(entrants: Entrant[], prefetch = true) {
  const loading = useRef(new Set<string>());
  const t = useBackend<TournamentBackend>(TTournamentBackend);
  const eventId = t.useState("sggTournament")[0]?.eventId;
  const entrantDebounce = useDebounce(300);
  const [entrantOptions, setEntrantOptions] = useState<EntrantOption[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const isCm = t.useState("isChallengerMode")[0];

  useEffect(() => {
    if (!prefetch) return;
    const candidates = entrants.filter(
      (e) =>
        e.id &&
        !entrantOptions.some((opt) => opt.value === String(e.id)) && // We don't already have info for them
        !loading.current.has(String(e.id)) // and we're not currently loading them either.
    );
    Promise.all(
      candidates.map((e) => {
        const name = e.player1?.name
          ? [e.player1.name, e.player2?.name, e.player3?.name]
              .filter((a) => a)
              .join(" / ")
          : "Loading...";
        entrantOptions.push({ name, value: String(e.id) });
        loading.current.add(String(e.id));
        return isCm
          ? t.getCmEntrantById(e.id as string)
          : t.getSggEntrantById(e.id as number);
      })
    ).then((entrants) => {
      entrants
        .filter((e) => e)
        .forEach((e) => {
          if (isCm) {
            const entrant = e as GQLTournamentLineup;
            const id = entrant.members
              .map((member) => member.user.userId)
              .join("_");
            const opt = entrantOptions.find((opt) => opt.value === id);
            opt.name = entrant.name;
            opt.seed = entrant.seed;
            loading.current.delete(id);
          } else {
            const entrant = e as SEntrant;
            const opt = entrantOptions.find(
              (opt) => opt.value === String(entrant.id)
            );
            opt.name = entrant.name;
            opt.seed = entrant.initialSeedNum;
            loading.current.delete(String(entrant.id));
          }
        });
      if (entrants.length) setEntrantOptions([...entrantOptions]);
    });

    if (candidates.length) setEntrantOptions([...entrantOptions]);
  }, [entrants, entrantOptions, prefetch, t]);

  useEffect(() => {
    setEntrantOptions([]);
  }, [eventId]);

  const getEntrantOptions = async (query: string) => {
    if (!query || query === lastQuery) return entrantOptions;
    const options = await new Promise<EntrantOption[]>((res) => {
      entrantDebounce(
        async () => {
          const entrants = await t.getEntrantsByName(query);
          res(
            entrants.map((e) => {
              if (isCm) {
                const entrant = e as GQLTournamentLineup;
                return {
                  name: entrant.name,
                  value: entrant.members
                    .map((member) => member.user.userId)
                    .join("_"),
                  seed: entrant.seed,
                };
              } else {
                const entrant = e as SEntrant;
                return {
                  name: entrant.name,
                  value: String(entrant.id),
                  seed: entrant.initialSeedNum,
                };
              }
            })
          );
        },
        () => res(entrantOptions)
      );
    });
    setLastQuery(query);
    // Preserve options for other selections.
    entrants
      .filter((a) => a.id)
      .map(({ id }) => {
        if (id && !options.some((op) => op.value === String(id))) {
          options.push(
            ...entrantOptions.filter((op) => op.value === String(id))
          );
        }
      });

    setEntrantOptions(options);
    return options;
  };

  return { entrantOptions, getEntrantOptions };
}

export function PlayerFields({
  disabled,
  playerNumber,
  player = {},
  setPlayer,
  fields = ["sponsor", "name", "country", "legend"],
  playerOptions = [],
}: {
  disabled?: boolean;
  playerNumber?: number;
  player: Player;
  fields?: PlayerFieldOption[];
  setPlayer: SetPlayer;
  playerOptions?: { id: number; name: string }[];
}) {
  const legendOptions = Array.from(LEGENDS.entries()).map(([k, v]) => ({
    name: v,
    value: k,
  }));

  return (
    <div className={styles.playerFields}>
      {!!playerNumber && <h3>Player {playerNumber}</h3>}
      {fields.includes("select") && (
        <SearchDropdown
          label="Player Select"
          dirtyable={false}
          search
          filterOptions={fuzzySearch}
          options={[{ value: "", name: "None" }].concat(
            playerOptions.map((p) => ({
              value: String(p.id),
              name: p.name,
            }))
          )}
          value={String(player?.id || "")}
          onChange={(v: any) => {
            if (!v) setPlayer({});
            const id = parseInt(v);
            if (id === player?.id) return;
            setPlayer({
              id,
            });
          }}
        />
      )}
      {fields.includes("sponsor") && (
        <Input
          label="Sponsor"
          disabled={disabled}
          value={player.sponsor ?? ""}
          onChange={(e) => setPlayer({ ...player, sponsor: e.target.value })}
        />
      )}
      {fields.includes("name") && (
        <Input
          label="Name"
          disabled={disabled}
          value={player.name ?? ""}
          onChange={(e) => setPlayer({ ...player, name: e.target.value })}
        />
      )}
      {fields.includes("country") && (
        <SearchDropdown
          label="Country"
          search
          disabled={disabled}
          filterOptions={fuzzySearch}
          options={COUNTRIES.map((c) => ({ name: c, value: c }))}
          value={player.country}
          onChange={(v) =>
            typeof v !== "object" && setPlayer({ ...player, country: v })
          }
        />
      )}
      {fields.includes("legend") && (
        <SearchDropdown
          label="Legend"
          search
          disabled={disabled}
          filterOptions={fuzzySearch}
          options={legendOptions}
          value={player.legend}
          onChange={(v) => {
            typeof v !== "object" && setPlayer({ ...player, legend: v });
          }}
        />
      )}
    </div>
  );
}

export function EntrantColumn({
  name,
  entrant,
  isTwos,
  isThrees,
  entrantOptions,
  modifyEntrants,
  withScore,
  scoreLabel,
  setEntrant,
  getEntrantOptions,
  playerFields,
  score,
  setScore,
}: {
  name: string;
  entrant: Entrant;
  isTwos?: boolean;
  isThrees?: boolean;
  extras?: (e: Entrant, sE: SetEntrant) => React.ReactNode;
  after?: (e: Entrant, sE: SetEntrant) => React.ReactNode;

  entrantOptions: EntrantOption[];
  setEntrant: SetEntrant;
  getEntrantOptions: (query: string) => Promise<EntrantOption[]>;
  modifyEntrants?: boolean;
  withScore?: boolean;
  scoreLabel?: string;
  playerFields?: PlayerFieldOption[];
  swapPodiums?: SwapPodiums;

  score?: number;
  setScore?: (s: number) => void;
}) {
  const { isLive } = entrant;
  const StartGGIcon = isLive ? StartGG : NoStartGG;

  const disabled = modifyEntrants && isLive && !entrant.id;

  return (
    <div className={styles.column}>
      <header>
        <span>{name}</span>
        {modifyEntrants && (
          <a
            onClick={() => {
              setEntrant({
                isLive: !isLive,
                player1: {},
                player2: {},
                player3: {},
              });
            }}
          >
            <StartGGIcon />
          </a>
        )}
      </header>
      {modifyEntrants && (
        <SearchDropdown
          label="Entrant Select"
          dirtyable={false}
          search
          disabled={!isLive}
          renderOption={(props: any, opt: any, snp, className) => {
            return (
              <button {...props} className={className}>
                <b
                  style={{
                    opacity: 0.5,
                    display: "inline-block",
                    width: 32,
                    letterSpacing: -1,
                    fontWeight: 500,
                  }}
                >
                  {opt.seed || "—"}
                </b>
                {opt.name}
              </button>
            );
          }}
          options={entrantOptions}
          getOptions={getEntrantOptions}
          value={String(entrant.id)}
          onChange={(v) => {
            if (typeof v !== "string") return;
            const id = (v as string).includes("-")
              ? (v as string)
              : parseInt(v, 10);
            if (id === entrant.id) return;
            setEntrant({
              id,
              isLive: true,
              player1: {},
              player2: {},
              player3: {},
            });
          }}
        />
      )}
      {withScore && (
        <InputRow>
          <Input
            label={scoreLabel}
            disabled={disabled}
            type="number"
            min={-1}
            value={score ?? 0}
            onChange={(e) => setScore(parseInt(e.target.value))}
          />

          <Button
            icon
            disabled={disabled || score === -1}
            onClick={() => setScore(Math.max((score ?? 0) - 1, -1))}
          >
            <Minus />
          </Button>
          <Button
            icon
            disabled={disabled}
            onClick={() => setScore((entrant.score ?? 0) + 1)}
          >
            <Plus />
          </Button>
        </InputRow>
      )}
      <PlayerFields
        disabled={disabled}
        playerNumber={(isTwos || isThrees) && 1}
        player={entrant.player1}
        setPlayer={(p) => setEntrant({ ...entrant, player1: p })}
        fields={playerFields}
      />
      {(isTwos || isThrees) && (
        <>
          <hr />
          <PlayerFields
            disabled={disabled}
            playerNumber={2}
            player={entrant.player2}
            setPlayer={(p) => setEntrant({ ...entrant, player2: p })}
            fields={playerFields}
          />
        </>
      )}
      {isThrees && (
        <>
          <hr />
          <PlayerFields
            disabled={disabled}
            playerNumber={3}
            player={entrant.player3}
            setPlayer={(p) => setEntrant({ ...entrant, player3: p })}
            fields={playerFields}
          />
        </>
      )}
    </div>
  );
}

export function EntrantColumns({
  left,
  right,
  middle,
  setLeft,
  setRight,
  beforeEntrant,
  afterEntrant,
  beforePlayer,
  afterPlayer,
  modifyEntrants,
  withScore,
  withSwapSides,
  scoreLabel,
  entrantSize,
  leftScore,
  rightScore,
  setLeftScore,
  setRightScore,
}: {
  left: Entrant;
  right: Entrant;
  middle?: React.ReactNode;
  setLeft: SetEntrant;
  setRight: SetEntrant;
  beforeEntrant?: (e: Entrant) => React.ReactNode;
  afterEntrant?: (e: Entrant) => React.ReactNode;
  beforePlayer?: (p: Player, e: Entrant) => React.ReactNode;
  afterPlayer?: (p: Player, e: Entrant) => React.ReactNode;
  modifyEntrants?: boolean;
  withScore?: boolean;
  withSwapSides?: boolean;
  scoreLabel?: string;
  entrantSize?: number;
  leftScore?: number;
  rightScore?: number;
  setLeftScore?: (s: number) => void;
  setRightScore?: (s: number) => void;
}) {
  const isTwos = entrantSize === 2;
  const isThrees = entrantSize === 3;
  const swapSides = () => (setLeft(right), setRight(left));
  const { entrantOptions, getEntrantOptions } = useEntrantOptions(
    [left, right],
    !!modifyEntrants
  );

  const entrantProps = {
    beforeEntrant,
    afterEntrant,
    beforePlayer,
    afterPlayer,
    getEntrantOptions,
    isTwos,
    isThrees,
    entrantOptions,
    modifyEntrants,
    withScore,
    scoreLabel,
  };

  return (
    <div className={styles.columns}>
      <EntrantColumn
        name="Left"
        entrant={left}
        setEntrant={setLeft}
        score={leftScore}
        setScore={setLeftScore}
        {...entrantProps}
      />
      <div className={styles.middle}>
        {withSwapSides && <Button onClick={swapSides}>Swap Sides</Button>}
        <div />
        {middle}
      </div>
      <EntrantColumn
        name="Right"
        entrant={right}
        setEntrant={setRight}
        score={rightScore}
        setScore={setRightScore}
        {...entrantProps}
      />
    </div>
  );
}

export function EntrantPredictions({
  first,
  second,
  third,
  setFirst,
  setSecond,
  setThird,
  modifyEntrants = true,
}: {
  first: Entrant;
  second: Entrant;
  third: Entrant;
  setFirst: SetEntrant;
  setSecond: SetEntrant;
  setThird: SetEntrant;
  modifyEntrants?: boolean;
}) {
  const sggEntrantSize = useSggTournament().entrantSize;
  const isTwos = sggEntrantSize === 2;
  const isThrees = sggEntrantSize === 3;
  const { entrantOptions, getEntrantOptions } = useEntrantOptions([
    first,
    second,
    third,
  ]);

  const entrantProps: Pick<
    ComponentProps<typeof EntrantColumn>,
    | "entrantOptions"
    | "getEntrantOptions"
    | "isTwos"
    | "isThrees"
    | "modifyEntrants"
    | "playerFields"
  > = {
    entrantOptions,
    getEntrantOptions,
    isTwos,
    isThrees,
    modifyEntrants,
    playerFields: ["sponsor", "name", "legend", "country"],
  };

  return (
    <div
      className={styles.columns}
      style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
    >
      <EntrantColumn
        name="First"
        entrant={first}
        setEntrant={setFirst}
        {...entrantProps}
      />
      <EntrantColumn
        name="Second"
        entrant={second}
        setEntrant={setSecond}
        {...entrantProps}
      />
      <EntrantColumn
        name="Third"
        entrant={third}
        setEntrant={setThird}
        {...entrantProps}
      />
    </div>
  );
}

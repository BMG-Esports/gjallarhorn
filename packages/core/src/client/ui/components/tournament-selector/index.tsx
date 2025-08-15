import React, { useState, useMemo } from "react";
import classNames from "classnames";

import styles from "./style.scss";
import { Check, Edit2 } from "lucide-react";
import { TournamentBackend } from "../../../../backends/pages/tournament";
import { Tournament } from "../../../../@types/startgg";
import Popup from "reactjs-popup";
import { Input } from "../../fields/input";
import {
  GQLTournament,
  GQLTournamentEliminationStage,
} from "../../../../@types/challengermode";
const sggSlugRegex =
  /(?:tournament\/([a-z0-9-]+)\/?|^([a-z0-9-]+)(?:\/event.*)?\/?$)/i;
const cmIdRegex =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

const getTournamentSlug = (i: string): [string, boolean] => {
  const cmMatch = i.match(cmIdRegex);
  if (cmMatch) return [cmMatch[0], true];
  const sggMatch = i.match(sggSlugRegex);
  return [sggMatch ? sggMatch[1] ?? sggMatch[2] : null, false];
};

type SggTournamentState = TournamentBackend["state"]["sggTournament"];
type CmTournamentState = TournamentBackend["state"]["cmTournament"];

function InlineDropdown<T>({
  options,
  value,
  setValue,
  toLabel,
  toKey,
  placeholder,
}: {
  options: T[];
  value: T | undefined;
  setValue: (opt?: T) => void;
  toLabel: (opt?: T) => string;
  toKey: (opt?: T) => string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const labelledValue = useMemo(
    () => (value ? toLabel(value) : undefined),
    [value, toLabel]
  );

  return (
    <Popup
      trigger={
        <div className={styles.inlineValue}>{labelledValue ?? placeholder}</div>
      }
      position="bottom left"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      arrow={false}
    >
      <div className="popup-menu">
        {options.map((opt) => (
          <div
            className={classNames({
              active: opt === value,
            })}
            key={toKey(opt)}
            onClick={() => {
              setOpen(false);
              setValue(opt);
            }}
          >
            {toLabel(opt)}
          </div>
        ))}
      </div>
    </Popup>
  );
}

/**
 * Navbar item to select the active tournament.
 */
export function TournamentSelector({
  tournament,
  setTournament,
  onlyEvent,
  meta,
  isCm,
  setIsCm,
}: {
  tournament: SggTournamentState | CmTournamentState;
  setTournament: (t: SggTournamentState | CmTournamentState) => void;
  onlyEvent?: boolean;
  meta?: Tournament | GQLTournament;
  isCm: boolean;
  setIsCm: (isCm: boolean) => void;
}) {
  const [editMode, setEditMode] = useState(false);

  const { tournamentSlug, eventId, phaseId, phaseGroupId } =
    tournament as SggTournamentState;
  const event = useMemo(
    () => (meta as Tournament)?.events?.find((e) => e.id === eventId),
    [meta, eventId]
  );
  const phase = useMemo(
    () => event?.phases?.find((p) => p.id === phaseId),
    [event, phaseId]
  );
  const phaseGroup = useMemo(
    () => phase?.phaseGroups!.nodes.find((p) => p.id === phaseGroupId),
    [phase, phaseGroupId]
  );

  const { tournamentId, stageNum, bracketType, roundNum } =
    tournament as CmTournamentState;
  const stage = useMemo(
    () =>
      (meta as GQLTournament)?.stages?.[
        stageNum
      ] as GQLTournamentEliminationStage,
    [meta, stageNum]
  );
  const bracket = useMemo(
    () => stage?.brackets?.find((b) => b.title === bracketType),
    [stage, bracketType]
  );
  const round = useMemo(() => bracket?.rounds[roundNum], [bracket, roundNum]);

  const [newSlug, setNewSlug] = useState(tournamentId || tournamentSlug);

  const exitEditMode = () => {
    setEditMode(false);
    const [slug, isChallengerMode] = getTournamentSlug(newSlug);
    if (isChallengerMode) {
      setTournament({
        ...tournament,
        tournamentId: slug,
      } as CmTournamentState);
    } else {
      setTournament({
        ...tournament,
        tournamentSlug: slug,
      } as SggTournamentState);
    }
    setIsCm(isChallengerMode);
  };

  return (
    <div className={styles.tournamentSelector}>
      {meta === undefined ? (
        "Loading..."
      ) : meta === null || editMode ? (
        <>
          <div>
            <Input
              autoFocus
              type="text"
              value={newSlug || ""}
              onChange={(e) => setNewSlug(e.target.value)}
              onPaste={(e) => {
                // Extract the tournament from the pasted url.
                e.preventDefault();
                const pasted = e.clipboardData.getData("text");
                const [slug, isCm] = getTournamentSlug(pasted);
                if (slug) {
                  setNewSlug(slug);
                }
              }}
              onKeyPress={(e) => {
                if (e.key == "Enter") {
                  e.preventDefault();
                  exitEditMode();
                }
              }}
              placeholder="Tournament Slug"
              big
              style={{
                width: 400,
              }}
            />
          </div>
          <Check className={styles.button} onClick={exitEditMode} />
        </>
      ) : (
        <>
          <div className={styles.container}>
            <div className={styles.name}>{meta.name}</div>
            {isCm ? (
              <div className={styles.segments}>
                <InlineDropdown
                  options={(meta as GQLTournament)?.stages ?? []}
                  toKey={(s) => s.index.toString()}
                  toLabel={(s) => s.format}
                  placeholder=""
                  value={stage}
                  setValue={(s) =>
                    setTournament({
                      ...tournament,
                      stageNum: s.index,
                    })
                  }
                />
                {!onlyEvent && (
                  <InlineDropdown
                    options={stage?.brackets ?? []}
                    toKey={(b) => b.title}
                    toLabel={(b) => b.title}
                    placeholder="empty"
                    value={bracket}
                    setValue={(b) =>
                      setTournament({
                        ...tournament,
                        bracketType: b.title,
                      })
                    }
                  />
                )}
                {!onlyEvent && bracket?.roundCount > 1 && (
                  <InlineDropdown
                    options={bracket?.rounds ?? []}
                    toKey={(r) => r.roundNumber.toString()}
                    toLabel={(r) => r.title}
                    placeholder=""
                    value={round}
                    setValue={(p) =>
                      setTournament({
                        ...tournament,
                        roundNum: p.roundNumber,
                      })
                    }
                  />
                )}
              </div>
            ) : (
              <div className={styles.segments}>
                <InlineDropdown
                  options={(meta as Tournament)?.events ?? []}
                  toKey={(e) => e.id.toString()}
                  toLabel={(e) => e.name}
                  placeholder=""
                  value={event}
                  setValue={(e) =>
                    setTournament({
                      ...tournament,
                      eventId: e.id,
                    })
                  }
                />
                {!onlyEvent && (
                  <InlineDropdown
                    options={event?.phases ?? []}
                    toKey={(p) => p.id.toString()}
                    toLabel={(p) => p.name}
                    placeholder=""
                    value={phase}
                    setValue={(p) =>
                      setTournament({
                        ...tournament,
                        phaseId: p.id,
                      })
                    }
                  />
                )}
                {!onlyEvent && phase?.phaseGroups.nodes.length > 1 && (
                  <InlineDropdown
                    options={phase?.phaseGroups.nodes ?? []}
                    toKey={(p) => p.id.toString()}
                    toLabel={(p) => p.displayIdentifier}
                    placeholder=""
                    value={phaseGroup}
                    setValue={(p) =>
                      setTournament({
                        ...tournament,
                        phaseGroupId: p.id,
                      })
                    }
                  />
                )}
              </div>
            )}
          </div>
          <Edit2
            onClick={() => {
              setNewSlug(tournamentSlug);
              setEditMode(true);
            }}
            className={styles.button}
          />
        </>
      )}
    </div>
  );
}

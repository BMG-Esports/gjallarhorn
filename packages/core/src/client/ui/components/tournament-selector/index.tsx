import React, { useState, useMemo } from "react";
import classNames from "classnames";

import styles from "./style.scss";
import { Check, Edit2 } from "lucide-react";
import { TournamentBackend } from "../../../../backends/pages/tournament";
import { Tournament } from "../../../../@types/startgg";
import Popup from "reactjs-popup";
import { Input } from "../../fields/input";

const slugRegex =
  /(?:tournament\/([a-z0-9-]+)\/?|^([a-z0-9-]+)(?:\/event.*)?\/?$)/i;

const getTournamentSlug = (i: string) => {
  const match = i.match(slugRegex);
  return match ? match[1] ?? match[2] : null;
};

type TournamentState = TournamentBackend["state"]["tournament"];

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
}: {
  tournament: TournamentState;
  setTournament: (t: TournamentState) => void;
  onlyEvent?: boolean;
  meta?: Tournament;
}) {
  const { tournamentSlug, eventId, phaseId, phaseGroupId } = tournament;
  const [editMode, setEditMode] = useState(false);

  const event = useMemo(
    () => meta?.events!.find((e) => e.id === eventId),
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

  const [newSlug, setNewSlug] = useState(tournamentSlug);

  const exitEditMode = () => {
    setEditMode(false);
    setTournament({
      ...tournament,
      tournamentSlug: getTournamentSlug(newSlug),
    });
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
                const slug = getTournamentSlug(pasted);
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
            <div className={styles.segments}>
              <InlineDropdown
                options={meta?.events ?? []}
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
